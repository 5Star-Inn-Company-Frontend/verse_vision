import OpenAI from 'openai'
import fs from 'fs'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!client) return ''
  const file = fs.createReadStream(filePath)
  const res = await client.audio.transcriptions.create({ model: 'whisper-1', file })
  return (res.text || '').trim()
}

export async function translateTextParallel(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
  if (!client) return { Yoruba: text, Hausa: text, Igbo: text, French: text }
  const prompt = `Translate the following worship sermon text into Yoruba, Hausa, Igbo, and French.
Return JSON with keys: Yoruba, Hausa, Igbo, French.
Text: ${text}`
  const res = await client.responses.create({ model: 'gpt-4o-mini', input: prompt })
  const out = res.output_text || ''
  try {
    const parsed = JSON.parse(out)
    return parsed
  } catch {
    return { Yoruba: text, Hausa: text, Igbo: text, French: text }
  }
}

export async function extractScriptureReferences(text: string): Promise<Array<{ reference: string }>> {
  if (!client) return []
  const prompt = `Extract all explicit or implicit Bible references from the text.
Return a JSON array of objects {"reference":"Book chapter:verse[-verse]"}.
Text: ${text}`
  const res = await client.responses.create({ model: 'gpt-4o-mini', input: prompt })
  const out = res.output_text || '[]'
  try {
    const arr = JSON.parse(out)
    if (Array.isArray(arr)) return arr
    return []
  } catch {
    return []
  }
}
