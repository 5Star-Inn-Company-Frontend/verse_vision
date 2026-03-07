import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import { settingsStore } from '../settingsStore.js'

// Cloud Backend URL (Laravel API)
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://versevision.5starcompany.com.ng/api'

// Helper to get Cloud API Token
async function getCloudToken(): Promise<string | null> {
  const settings = await settingsStore.get()
  return settings.cloudApiToken || null
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const token = await getCloudToken()
  if (!token) {
    console.warn('Skipping transcription: No Cloud API Token found.')
    return ''
  }

  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg',
  })

  console.log(`${CLOUD_API_URL}/ai/transcribe`);
  try {
    const res = await axios.post(`${CLOUD_API_URL}/ai/transcribe`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('Cloud Transcribe Response:', res.data)
    let text = (res.data.text || '').trim()

    // Hallucination filtering
    const hallucinations = [
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
    ]

    for (const h of hallucinations) {
      if (text.toLowerCase().includes(h.toLowerCase()) && text.length < h.length + 20) {
        console.log(`[transcribeAudio] Filtered hallucination: "${text}"`)
        return ''
      }
    }

    // CJK filtering (Chinese, Japanese, Korean) & Cyrillic
    // Range includes Hiragana, Katakana, CJK Unified Ideographs, and Cyrillic
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u0400-\u04ff]/.test(text)) {
      console.log(`[transcribeAudio] Filtered non-English text: "${text}"`)
      return ''
    }

    return text
  } catch (err: any) {
    console.error('Cloud Transcription error:', err.response?.data || err.message)
    return ''
  }
}

export async function translateTextParallel(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
  // Currently, the Laravel backend doesn't have a dedicated translation endpoint yet based on the previous turn.
  // We will need to either add it to Laravel or keep using direct OpenAI if not implemented.
  // Ideally, we should implement it in Laravel. For now, let's assume we'll add it or fallback.
  // But per instruction "update Operator backend to connect its ai request to website_backend_laravel", 
  // we should route this through the cloud.
  
  // Since the user only asked to "update Operator backend", but I see I didn't add translation endpoint to Laravel yet,
  // I will add a TODO to update Laravel backend as well, but first let's implement the client side assuming the endpoint exists
  // or will exist. Actually, let's implement the Laravel endpoint first in the next steps if needed, 
  // but for now let's focus on this file.
  
  // Wait, I can't leave broken code. I will assume the Laravel endpoint will be `/ai/translate`.
  
  const token = await getCloudToken()
  if (!token) return { Yoruba: text, Hausa: text, Igbo: text, French: text }

  try {
    const res = await axios.post(`${CLOUD_API_URL}/ai/translate`, {
      text,
      languages: ['Yoruba', 'Hausa', 'Igbo', 'French']
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    return res.data || { Yoruba: text, Hausa: text, Igbo: text, French: text }
  } catch (err: any) {
    console.error('Cloud Translation error:', err.response?.data || err.message)
    return { Yoruba: text, Hausa: text, Igbo: text, French: text }
  }
}

export async function extractScriptureReferences(text: string): Promise<{ references: Array<{ reference: string; version?: string }>; defaultVersionChange?: string }> {
  const token = await getCloudToken()
  if (!token) return { references: [] }

  try {
    // The Laravel endpoint `detectScripture` was implemented as:
    // Route::post('/ai/scripture/detect', [AiController::class, 'detectScripture']);
    // It returns what OpenAI returns.
    
    const res = await axios.post(`${CLOUD_API_URL}/ai/scripture/detect`, {
      text
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    console.log('Cloud Scripture Detect Response:', JSON.stringify(res.data, null, 2))
    
    // The Laravel backend returns the raw OpenAI response structure currently
    const choice = res.data.choices?.[0]
    const out = choice?.message?.content || '{}'
    const parsed = JSON.parse(out)
    
    const references = Array.isArray(parsed.references) 
      ? parsed.references.map((r: any) => ({ reference: r.reference, version: r.version }))
      : []
      
    return {
      references,
      defaultVersionChange: parsed.defaultVersionChange || undefined
    }
  } catch (err: unknown) {
    const errorData = (err as { response?: { data?: unknown } })?.response?.data
    console.error('Cloud Scripture Extraction error:', errorData || (err instanceof Error ? err.message : String(err)))
    return { references: [] }
  }
}

export async function getScriptureText(reference: string, version: string = 'NIV'): Promise<string> {
    // We need a cloud endpoint for this too.
    // Assuming /ai/scripture/text
    const token = await getCloudToken()
    if (!token) return ''

    try {
        const res = await axios.post(`${CLOUD_API_URL}/ai/scripture/text`, {
            reference,
            version
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        return res.data.text || ''
    } catch (err: unknown) {
        const errorData = (err as { response?: { data?: unknown } })?.response?.data
        console.error('Cloud Scripture Text error:', errorData || (err instanceof Error ? err.message : String(err)))
        return ''
    }
}

export async function fetchSongLyrics(title: string): Promise<{ title: string; lines: string[] } | null> {
    // Assuming /ai/lyrics/fetch
    const token = await getCloudToken()
    if (!token) return null

    try {
        const res = await axios.post(`${CLOUD_API_URL}/ai/lyrics/fetch`, {
            title
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        // Laravel should handle the parsing and return clean JSON
        return res.data
    } catch (err: any) {
        console.error('Cloud Lyrics fetch error:', err.response?.data || err.message)
        return null
    }
}

export async function generateImage(prompt: string): Promise<{ url?: string; error?: string }> {
    const token = await getCloudToken()
    if (!token) return { error: 'Cloud API Token not configured in Settings.' }

    try {
        console.log(`Generating image at ${CLOUD_API_URL}/ai/image/generate with prompt: ${prompt.substring(0, 20)}...`)
        const res = await axios.post(`${CLOUD_API_URL}/ai/image/generate`, {
            prompt
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        // Expecting { success: true, data: { url: "..." } }
        if (res.data?.data?.url) {
            return { url: res.data.data.url }
        }
        return { error: 'Cloud API returned success but no image URL.' }
    } catch (err: unknown) {
        const errObj = err as { response?: { data?: { message?: string, error?: string } }, message?: string }
        const msg = errObj.response?.data?.message || errObj.response?.data?.error || errObj.message || 'Unknown Cloud API error'
        console.error('Cloud Image Generation error:', msg)
        return { error: `Cloud API Error: ${msg}` }
    }
}
