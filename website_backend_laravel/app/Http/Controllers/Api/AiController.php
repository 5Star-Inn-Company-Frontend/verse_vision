<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
                 return response()->json([
                    'error' => "Monthly transcription limit reached ({$plan->transcription_minutes_limit} mins). Please upgrade your plan.",
                    'code' => 'TRANSCRIPTION_NOT_ALLOWED',
                 ], 403);
             }
        }

        $startTime = microtime(true);
        $engine = $request->input('engine', 'openai');
        $response = null;
        $model = '';

        if ($engine === 'elevenlabs') {
            $model = 'scribe_v1';
            $response = Http::withHeaders([
                'xi-api-key' => env('ELEVENLABS_API_KEY'),
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
            ]);
        }

        $duration = (microtime(true) - $startTime) * 1000;

        $data = $response->json();
        Log::info($request->title ."===Transcribe ($engine)===".json_encode($data));

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
            'model' => 'gpt-4o',
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
        $content = $data['choices'][0]['message']['content'] ?? '{}';
        return response()->json(json_decode($content));
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

        $content = $data['choices'][0]['message']['content'] ?? '{}';
        return response()->json(json_decode($content));
    }

    public function fetchLyrics(Request $request)
    {
        $request->validate(['title' => 'required|string']);

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
}
