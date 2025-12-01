import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { transcribeAudio, translateTextParallel, extractScriptureReferences } from '../services/ai/openai.js'
import { findReferencesRule } from '../services/ai/scriptureDetection.js'
import { scriptureStore } from '../services/scriptureStore.js'

const router = Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.resolve(__dirname, '../tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const upload = multer({ dest: tmpDir })

router.post('/transcribe', upload.single('audio'), async (req: Request & { file?: { path: string } }, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'audio required' })
    return
  }
  const text = await transcribeAudio(req.file.path)
  fs.unlinkSync(req.file.path)
  res.json({ success: true, data: { text } })
})

router.post('/scripture/detect', async (req: Request, res: Response) => {
  const { text } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  const ruleRefs = findReferencesRule(text)
  const llmRefs = await extractScriptureReferences(text)
  const merged = [...ruleRefs, ...llmRefs]
  for (const r of merged.slice(0, 5)) {
    await scriptureStore.detect({ reference: r.reference, translation: 'NIV', text, confidence: 0.9 })
  }
  const queue = await scriptureStore.getQueue()
  res.json({ success: true, data: { references: merged, queue } })
})

router.post('/translate', async (req: Request, res: Response) => {
  const { text } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  const data = await translateTextParallel(text)
  res.json({ success: true, data })
})

export default router
