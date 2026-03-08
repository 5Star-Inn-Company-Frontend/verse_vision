<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Plan;

class AiController extends Controller
{
    public function transcribe(Request $request)
    {
        // Validation and file handling
        $request->validate([
            'file' => 'required|file|mimes:mp3,wav,m4a,mp4,webm',
            'engine' => 'nullable|string|in:openai,elevenlabs',
        ]);

        $user = $request->user();
        $plan = $user?->activeSubscription?->plan;

        // Check Usage Limits
        if ($plan && isset($plan->transcription_minutes_limit) && $plan->transcription_minutes_limit !== -1) {
             // Calculate current usage for the month (minutes)
             $usedSeconds = AiLog::where('user_id', $user->id)
                ->where('request_type', 'transcription')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('audio_duration_sec');
            
             $usedMinutes = $usedSeconds / 60;

             if ($usedMinutes >= $plan->transcription_minutes_limit) {
                 $nextPlan = Plan::where('price', '>', $plan->price)
                     ->orderBy('price', 'asc')
                     ->first();

                 return response()->json([
                    'error' => "Monthly transcription limit reached ({$plan->transcription_minutes_limit} mins). Please upgrade your plan.",
                    'code' => 'TRANSCRIPTION_NOT_ALLOWED',
                    'next_plan_slug' => $nextPlan?->slug,
                    'current_plan_slug' => $plan?->slug,
                 ], 403);
             }
        }

        $startTime = microtime(true);
        $engine = $request->input('engine', 'openai');
        $response = null;
        $model = '';

        if ($engine === 'elevenlabs') {
            $keys=explode(";",env('ELEVENLABS_API_KEY'));
            $rand=rand(0,count($keys)-1);
            $key= $keys[$rand];
            $model = 'scribe_v1';
            $response = Http::withHeaders([
                'xi-api-key' => $key,
            ])->attach(
                'file', file_get_contents($request->file('file')->path()), $request->file('file')->getClientOriginalName()
            )->post('https://api.elevenlabs.io/v1/speech-to-text', [
                'model_id' => $model,
                'tag_audio_events' => 'false',
            ]);
        } else {
            $model = 'whisper-1';
            // Proxy to OpenAI
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            ])->attach(
                'file', file_get_contents($request->file('file')->path()), $request->file('file')->getClientOriginalName()
            )->withoutVerifying()->post('https://api.openai.com/v1/audio/transcriptions', [
                'model' => $model,
                'response_format' => 'verbose_json',
                'prompt' => 'Sermon, preaching, Bible verses, worship service. Do not hallucinate. Silence.',
                'temperature' => 0,
                'language' => 'en',
            ]);
        }

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();

        // Hallucination Filtering
        if (isset($data['text'])) {
            $text = trim($data['text']);
            $hallucinations = [
                'Thank you for watching',
                '시청해 주셔서 감사합니다',
                'Silence',
                'MBC',
                'News',
                'Subscribe',
                'Amara.org',
                'Sous-titres',
                'Subtitle',
                'Sermon, preaching, Bible verses, worship service',
                'Do not hallucinate',
                'Silence'
            ];
            foreach ($hallucinations as $h) {
                if (stripos($text, $h) !== false && strlen($text) < strlen($h) + 20) {
                    $data['text'] = '';
                    break;
                }
            }

            // CJK & Cyrillic Filtering
            if (preg_match('/[\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}\x{f900}-\x{faff}\x{ff66}-\x{ff9f}\x{0400}-\x{04ff}]/u', $text)) {
                $data['text'] = '';
            }
        }

        Log::info($request->title ."===Transcribe ($engine)===".json_encode($data));

        // Hallucination Filtering
        if (isset($data['text'])) {
            $text = trim($data['text']);
            $hallucinations = [
                'Thank you for watching',
                'MBC',
                'Amara.org',
                'Subtitles by',
                'Translated by',
                'Captioning by',
                'Copyright',
                'All rights reserved',
                '視聴していただきありがとうございます', // Korean/Japanese thanks
                '시청해 주셔서 감사합니다',
                'Unidentified',
                'Silence',
                'music',
                'Music',
                'Souss-Titres',
                'Sous-titres',
                'Thanks for watching',
                'Please subscribe',
            ];

            foreach ($hallucinations as $h) {
                if (stripos($text, $h) !== false) {
                    // If the text is *mostly* the hallucination (short), clear it.
                    // If it's part of a longer sentence, maybe keep it? 
                    // Usually hallucinations are the whole segment.
                    if (strlen($text) < strlen($h) + 10) {
                        $data['text'] = '';
                        break;
                    }
                }
            }
            
            // Filter short repeated chars or non-sense
            if (preg_match('/^[^\w\s]+$/', $text)) { // only symbols
                 $data['text'] = '';
            }
        }

        // Calculate Audio Duration for Usage Tracking
        $audioDurationSec = 0;
        if ($engine === 'openai') {
             $audioDurationSec = $data['duration'] ?? 0;
        } elseif ($engine === 'elevenlabs') {
             // Estimate duration from file size (assuming ~128kbps = 16KB/s)
             try {
                $size = filesize($request->file('file')->path());
                $audioDurationSec = $size / 16000; 
             } catch (\Exception $e) {
                $audioDurationSec = 10; // Fallback
             }
        }

        // Log request
        AiLog::create([
            'user_id' => $request->user()->id,
            'request_type' => 'transcription',
            'model' => $model,
            'duration_ms' => $duration,
            'audio_duration_sec' => $audioDurationSec,
            'meta' => ['status' => $response->status(), 'engine' => $engine, 'model' => $model, 'text' => $data['text'] ?? ''],
        ]);

        return $response->json();
    }

    public function detectScripture(Request $request)
    {
        $request->validate(['text' => 'required|string']);

        $startTime = microtime(true);

        // Proxy to OpenAI (Chat Completion)
        // Original Prompt from Operator:
        $prompt = 'Extract all explicit or implicit Bible references from the text.
        Also identify the Bible version/translation if explicitly mentioned for a specific reference (e.g., "John 3:16 KJV").
        Also identify if there is a general request to change the default version (e.g., "Give me KJV version", "Switch to NLT", "Use NKJV").
        Return a JSON object with keys:
        - "references": array of objects { "reference": "Book chapter:verse", "version": "KJV" | null }
        - "defaultVersionChange": string | null (e.g. "KJV") if a general switch is requested.

        Example: {"references": [{ "reference": "John 3:16", "version": "KJV" }, { "reference": "Psalm 23:1", "version": null }], "defaultVersionChange": "KJV"}';

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => [
                ['role' => 'user', 'content' => $prompt . "\nText: " . $request->text],
            ],
            'response_format' => ['type' => 'json_object'],
            'temperature' => 0,
        ]);

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();
        Log::info($request->title ."===Scripture===".json_encode($data));

        $inputTokens = $data['usage']['prompt_tokens'] ?? 0;
        $outputTokens = $data['usage']['completion_tokens'] ?? 0;

        AiLog::create([
            'user_id' => $request->user()->id,
            'request_type' => 'scripture_detection',
            'model' => 'gpt-4o',
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'duration_ms' => $duration,
            'prompt_snippet' => mb_substr($request->text, 0, 100, 'UTF-8'),
            'meta' => $data,
        ]);

        return $response->json();
    }

    public function translate(Request $request)
    {
        $request->validate(['text' => 'required|string', 'languages' => 'array']);

        if (!$this->checkPlanLimits($request->user(), 'translation')) {
            return response()->json(['error' => 'Upgrade to Professional plan to use AI Translation.'], 403);
        }

        $startTime = microtime(true);

        $prompt = "Translate the following worship sermon text into Yoruba, Hausa, Igbo, and French.
        Return JSON with keys: Yoruba, Hausa, Igbo, French.
        Text: " . $request->text;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 2000,
        ]);

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();
        Log::info($request->title ."===Translate===".json_encode($data));

        $inputTokens = $data['usage']['prompt_tokens'] ?? 0;
        $outputTokens = $data['usage']['completion_tokens'] ?? 0;

        AiLog::create([
            'user_id' => $request->user()->id,
            'request_type' => 'translation',
            'model' => 'gpt-4o-mini',
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'duration_ms' => $duration,
            'prompt_snippet' => mb_substr($request->text, 0, 100, 'UTF-8'),
            'meta' => $data,
        ]);

        // Return only the content JSON part as expected by frontend
        $content = $data['choices'][0]['message']['content'] ?? '{"text": ""}';
        
        // Strip markdown code blocks if present
        $content = preg_replace('/^```json\s*|\s*```$/', '', $content);
        
        $json = json_decode($content);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error("JSON Decode Error in getScriptureText: " . json_last_error_msg() . " Content: " . $content);
            return response()->json(['text' => '']);
        }
        
        return response()->json($json);
    }

    public function getScriptureText(Request $request)
    {
        $request->validate(['reference' => 'required|string', 'version' => 'nullable|string']);
        $version = $request->version ?? 'NIV';

        $startTime = microtime(true);

        $prompt = "Provide the full text for the Bible reference: {$request->reference}.
        Use the {$version} version. If {$version} is unavailable, fallback to NIV.
        Return JSON with a single key 'text'.
        Example: {'text': 'For God so loved the world...'}";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 2000,
        ]);

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();
        Log::info($request->title ."===Scripture===".json_encode($data));

        $inputTokens = $data['usage']['prompt_tokens'] ?? 0;
        $outputTokens = $data['usage']['completion_tokens'] ?? 0;

        AiLog::create([
            'user_id' => $request->user()->id,
            'request_type' => 'scripture_text',
            'model' => 'gpt-4o-mini',
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'duration_ms' => $duration,
            'prompt_snippet' => mb_substr($request->reference, 0, 100, 'UTF-8'),
            'meta' => $data,
        ]);

        $content = $data['choices'][0]['message']['content'] ?? '{"text": ""}';
        
        // Strip markdown code blocks if present
        $content = preg_replace('/^```json\s*|\s*```$/', '', $content);
        
        $json = json_decode($content);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error("JSON Decode Error in getScriptureText: " . json_last_error_msg() . " Content: " . $content);
            return response()->json(['text' => '']);
        }
        
        return response()->json($json);
    }

    public function fetchLyrics(Request $request)
    {
        $request->validate(['title' => 'required|string']);

        $user = $request->user();
        $plan = $user?->activeSubscription?->plan;

        // Check Usage Limits
        if ($plan && isset($plan->song_search_limit) && $plan->song_search_limit !== -1) {
             // Calculate current usage for the month (count)
             $usedCount = AiLog::where('user_id', $user->id)
                ->where('request_type', 'lyric_search')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            
             if ($usedCount >= $plan->song_search_limit) {
                 $nextPlan = Plan::where('price', '>', $plan->price)
                     ->orderBy('price', 'asc')
                     ->first();

                 return response()->json([
                    'error' => "Monthly AI song search limit reached ({$plan->song_search_limit}). Please upgrade your plan.",
                    'code' => 'SONG_SEARCH_LIMIT_REACHED',
                    'next_plan_slug' => $nextPlan?->slug,
                    'current_plan_slug' => $plan?->slug,
                 ], 403);
             }
        } else if (!$plan) {
            // No plan means starter which has 0 limit
            // But we should rely on database if possible.
            // If user has no plan, they are on starter.
            // Let's assume limits are handled by plan object.
            // If plan is null, it might be safer to block or allow depending on policy.
            // Based on migration, starter has 0 limit.
            // If user has no active subscription, we might treat as starter.
            // But here $plan is null if no active subscription.
            
            // Let's try to fetch 'starter' plan to check its limit if user has no sub
            $starterPlan = Plan::where('slug', 'starter')->first();
            if ($starterPlan && $starterPlan->song_search_limit === 0) {
                 return response()->json([
                    'error' => "AI song search is not available on the Free plan. Please upgrade.",
                    'code' => 'SONG_SEARCH_NOT_ALLOWED',
                    'next_plan_slug' => 'lite',
                    'current_plan_slug' => 'starter',
                 ], 403);
            }
        }

        $startTime = microtime(true);

        $prompt = "Find the lyrics for the Christian hymn or song titled \"{$request->title}\".
        Return a JSON object with keys:
        - \"title\": The correct full title of the song.
        - \"lines\": An array of strings, where each string is a full stanza (verse or chorus).
          - Format each stanza with a header (e.g., \"Verse 1\", \"Verse 2\", \"Chorus\") followed by the lyrics.
          - Use newline characters (\\n) to separate lines.
          - Indent the 2nd and 4th lines of each verse with 2 spaces (\\u0020\\u0020) to match traditional hymn formatting.

        Example: {\"title\": \"Amazing Grace\", \"lines\": [\"Verse 1\\nAmazing grace! how sweet the sound...\", ...]}
        If the song is not found or known, return null (empty JSON or null).";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4o-mini',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 2000,
        ]);

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();
        Log::info($request->title ."===Lyrics===".json_encode($data));

        $inputTokens = $data['usage']['prompt_tokens'] ?? 0;
        $outputTokens = $data['usage']['completion_tokens'] ?? 0;

        AiLog::create([
            'user_id' => $request->user()->id,
            'request_type' => 'lyric_search',
            'model' => 'gpt-4o-mini',
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'duration_ms' => $duration,
            'prompt_snippet' => mb_substr($request->title, 0, 100, 'UTF-8'),
            'meta' => $data,
        ]);

        $content = $data['choices'][0]['message']['content'] ?? '{}';
        return response()->json(json_decode($content));
    }

    public function generateImage(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
            'size' => 'nullable|string|in:512x512,768x768,1024x1024'
        ]);

        $user = $request->user();
        $plan = $user?->activeSubscription?->plan;

        // Check Usage Limits
        if ($plan && isset($plan->image_generation_limit) && $plan->image_generation_limit !== -1) {
             // Calculate current usage for the month (count)
             $usedCount = AiLog::where('user_id', $user->id)
                ->where('request_type', 'image_generation')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            
             if ($usedCount >= $plan->image_generation_limit) {
                 $nextPlan = Plan::where('price', '>', $plan->price)
                     ->orderBy('price', 'asc')
                     ->first();

                 return response()->json([
                    'error' => "Monthly image generation limit reached ({$plan->image_generation_limit}). Please upgrade your plan.",
                    'code' => 'IMAGE_GENERATION_LIMIT_REACHED',
                    'next_plan_slug' => $nextPlan?->slug,
                    'current_plan_slug' => $plan?->slug,
                 ], 403);
             }
        }

        $startTime = microtime(true);
        $size = $request->input('size', '1024x1024');

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
                'Content-Type' => 'application/json',
            ])->withoutVerifying()->post('https://api.openai.com/v1/images/generations', [
                'model' => 'gpt-image-1',
                'prompt' => $request->prompt,
                'size' => $size,
            ]);

            $duration = (microtime(true) - $startTime) * 1000;

            $data = $response->json();
            Log::info('ImageGen === '.json_encode($data));

            $url = $data['data'][0]['url'] ?? null;
            $b64 = $data['data'][0]['b64_json'] ?? null;

            if (!$url && $b64) {
                $binary = base64_decode($b64);
                if ($binary === false) {
                    return response()->json([
                        'error' => 'Failed to decode image data',
                    ], 500);
                }
                $filename = 'generated/' . time() . '_' . Str::random(8) . '.png';
                Storage::disk('public')->put($filename, $binary);
                $url = asset('storage/' . $filename);
            }

            if (!$url) {
                return response()->json([
                    'error' => 'No image returned from OpenAI',
                    'details' => $data,
                ], 500);
            }

            AiLog::create([
                'user_id' => $request->user()->id,
                'request_type' => 'image_generation',
                'model' => 'gpt-image-1',
                'duration_ms' => $duration,
                'prompt_snippet' => mb_substr($request->prompt, 0, 100, 'UTF-8'),
                'meta' => $data,
            ]);

            return response()->json([
                'success' => true,
                'data' => [ 'url' => $url ]
            ]);
        } catch (\Exception $e) {
            Log::error('Image Generation Error: '.$e->getMessage());
            return response()->json([
                'error' => 'Failed to generate image',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function checkPlanLimits($user, $feature)
    {
        $plan = $user?->activeSubscription?->plan;

        if (!$plan) {
            return false;
        }

        if ($feature === 'translation') {
            return $plan->translation_limit === -1 || $plan->translation_limit > 0;
        }

        return true;
    }
}
