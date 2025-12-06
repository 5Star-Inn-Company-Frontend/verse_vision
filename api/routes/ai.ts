import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { transcribeAudio, translateTextParallel, extractScriptureReferences, getScriptureText } from '../services/ai/openai.js'
import { translateTextMarian } from '../services/ai/marian.js'
import { findReferencesRule } from '../services/ai/scriptureDetection.js'
import { scriptureStore } from '../services/scriptureStore.js'

const router = Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.resolve(__dirname, '../tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const upload = multer({ dest: tmpDir })

let globalDefaultVersion = 'NIV'

router.post('/transcribe', upload.single('audio'), async (req: Request & { file?: { path: string } }, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'audio required' })
    return
  }
  
  // OpenAI requires a valid extension to determine file type.
  // Multer saves with no extension by default.
  const originalPath = req.file.path
  const targetPath = originalPath + '.webm'
  
  try {
    fs.renameSync(originalPath, targetPath)
    const text = await transcribeAudio(targetPath)
    res.json({ success: true, data: { text } })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ success: false, error: 'Transcription failed' })
  } finally {
    // Clean up
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    // originalPath should be gone after rename, but check just in case
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath)
  }
})

router.post('/scripture/detect', async (req: Request, res: Response) => {
  const { text } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  const ruleRefs = findReferencesRule(text)
  const llmResult = await extractScriptureReferences(text)

  console.log("ruleRefs",ruleRefs);
  console.log("llmResult",llmResult);
  
  if (llmResult.defaultVersionChange) {
    globalDefaultVersion = llmResult.defaultVersionChange
    console.log(`Default version switched to ${globalDefaultVersion}`)
  }

  const llmRefs = llmResult.references
  
  const uniqueRefsMap = new Map<string, string>() // reference -> version

  // Prioritize LLM refs as they might contain version info
  for (const item of llmRefs) {
    uniqueRefsMap.set(item.reference, item.version || globalDefaultVersion)
  }

  // Add rule refs if not already present
  for (const item of ruleRefs) {
    if (!uniqueRefsMap.has(item.reference)) {
      uniqueRefsMap.set(item.reference, globalDefaultVersion)
    }
  }

  const merged = Array.from(uniqueRefsMap.entries()).map(([reference, version]) => ({ reference, version }))

  for (const { reference, version } of merged.slice(0, 5)) {
    const scriptureText = await getScriptureText(reference, version)
    await scriptureStore.detect({ 
      reference, 
      translation: version, 
      text: scriptureText || text, // Fallback to transcript if fetch fails
      confidence: 0.9 
    })
  }
  const queue = await scriptureStore.getQueue()
  res.json({ success: true, data: { references: merged, queue, currentVersion: globalDefaultVersion } })
})

router.post('/translate', async (req: Request, res: Response) => {
  const { text, engine } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  
  try {
    let data;
    if (engine === 'marian') {
      data = await translateTextMarian(text)
    } else {
      data = await translateTextParallel(text)
    }
    console.log(`translate source`,text);
    console.log(`translate ${engine}`,data);
    res.json({ success: true, data })
  } catch (err) {
    console.error('Translation error:', err)
    // Fallback to OpenAI or return error?
    // If user explicitly asked for marian and it failed, we should probably report it.
    // But for robustness, maybe fallback?
    // Let's just report error for now as fallback might cost money.
    res.status(500).json({ success: false, error: 'Translation failed' })
  }
})

export default router
