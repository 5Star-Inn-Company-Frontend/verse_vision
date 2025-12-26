import OpenAI from 'openai'
import fs from 'fs'


export async function transcribeAudio(filePath: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
  if (!client) return ''
  const file = fs.createReadStream(filePath)
  const res = await client.audio.transcriptions.create({ model: 'whisper-1', file })
  console.log('res:transcribeAudio', res);
  return (res.text || '').trim()
}

export async function translateTextParallel(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
  if (!client) return { Yoruba: text, Hausa: text, Igbo: text, French: text }
  const prompt = `Translate the following worship sermon text into Yoruba, Hausa, Igbo, and French.
Return JSON with keys: Yoruba, Hausa, Igbo, French.
Text: ${text}`
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })
    const out = res.choices[0]?.message?.content || ''
    const parsed = JSON.parse(out)
    return parsed
  } catch (err) {
    console.error('Translation error:', err)
    return { Yoruba: text, Hausa: text, Igbo: text, French: text }
  }
}

export async function extractScriptureReferences(text: string): Promise<{ references: Array<{ reference: string; version?: string }>; defaultVersionChange?: string }> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
  if (!client) return { references: [] }
  const prompt = `Extract all explicit or implicit Bible references from the text.
Also identify the Bible version/translation if explicitly mentioned for a specific reference (e.g., "John 3:16 KJV").
Also identify if there is a general request to change the default version (e.g., "Give me KJV version", "Switch to NLT", "Use NKJV").
Return a JSON object with keys:
- "references": array of objects { "reference": "Book chapter:verse", "version": "KJV" | null }
- "defaultVersionChange": string | null (e.g. "KJV") if a general switch is requested.

Example: {"references": [{ "reference": "John 3:16", "version": "KJV" }, { "reference": "Psalm 23:1", "version": null }], "defaultVersionChange": "KJV"}
Text: ${text}`
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })
    console.log('OpenAI Debug:', JSON.stringify(res.choices[0], null, 2))
    const out = res.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(out)
    
    const references = Array.isArray(parsed.references) 
      ? parsed.references.map((r: any) => ({ reference: r.reference, version: r.version }))
      : []
      
    return {
      references,
      defaultVersionChange: parsed.defaultVersionChange || undefined
    }
  } catch (err) {
    console.error('Extraction error:', err)
    return { references: [] }
  }
}

export async function getScriptureText(reference: string, version: string = 'NIV'): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
  if (!client) return ''
  
  const prompt = `Provide the full text for the Bible reference: ${reference}.
Use the ${version} version. If ${version} is unavailable, fallback to NIV.
Return JSON with a single key "text".
Example: {"text": "For God so loved the world..."}`

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })
    console.log('OpenAI Debug:', JSON.stringify(res.choices[0], null, 2))
    const out = res.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(out)
    return parsed.text || ''
  } catch (err) {
    console.error('Scripture fetch error:', err)
    return ''
  }
}

export async function fetchSongLyrics(title: string): Promise<{ title: string; lines: string[] } | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
  const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
  if (!client) return null

  const prompt = `Find the lyrics for the Christian hymn or song titled "${title}".
  Return a JSON object with keys:
  - "title": The correct full title of the song.
  - "lines": An array of strings, where each string is a full stanza (verse or chorus).
    - Format each stanza with a header (e.g., "Verse 1", "Verse 2", "Chorus") followed by the lyrics.
    - Use newline characters (\\n) to separate lines.
    - Indent the 2nd and 4th lines of each verse with 2 spaces (\\u0020\\u0020) to match traditional hymn formatting.

  Example: {"title": "Amazing Grace", "lines": ["Verse 1\\nAmazing grace! how sweet the sound,\\n  That saved a wretch like me!\\nI once was lost, but now am found;\\n  Was blind, but now I see.", "Verse 2\\n..."]}
  If the song is not found or known, return null (empty JSON or null).`

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })
    
    console.log("AI hymn search: ",res);
    const choice = res.choices[0]
    const out = choice?.message?.content || '{}'
    const finishReason = choice?.finish_reason

    if (finishReason === 'content_filter') {
      console.warn(`Lyrics for "${title}" were restricted by AI content filter (copyright).`)
      return null
    }

    // Attempt to sanitize potential JSON issues before parsing
    // Sometimes GPT returns incomplete JSON or markdown blocks despite response_format
    let cleanOut = out.trim()
    if (cleanOut.startsWith('```json')) {
      cleanOut = cleanOut.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanOut.startsWith('```')) {
      cleanOut = cleanOut.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    try {
      const parsed = JSON.parse(cleanOut)
      if (!parsed.title || !Array.isArray(parsed.lines)) return null
      return { title: parsed.title, lines: parsed.lines }
    } catch (parseErr) {
      // Only log full error if it wasn't a length issue
      if (finishReason !== 'length') {
        console.warn('JSON Parse Warning:', parseErr instanceof Error ? parseErr.message : parseErr)
      } else {
        console.warn('Lyrics generation truncated (max tokens reached).')
      }
      return null
    }

  } catch (err) {
    console.error('Lyrics fetch error:', err)
    return null
  }
}
