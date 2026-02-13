import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { transcribeAudio, translateTextParallel, extractScriptureReferences, getScriptureText, fetchSongLyrics } from '../services/ai/openai.js'
import { translateTextMarian, activateMarian, getMarianStatus } from '../services/ai/marian.js'
import { offlineService } from '../services/ai/offline.js'
import { findReferencesRule } from '../services/ai/scriptureDetection.js'
import { scriptureStore } from '../services/scriptureStore.js'

const router = Router()
const tmpDir = process.env.VV_DATA_DIR
  ? path.join(process.env.VV_DATA_DIR, 'tmp')
  : path.resolve(__dirname, '../tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const upload = multer({ dest: tmpDir })

let globalDefaultVersion = 'NIV'

router.get('/offline/status', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    data: { 
      status: offlineService.status, 
      details: offlineService.details 
    } 
  })
})

router.post('/transcribe', upload.single('audio'), async (req: Request & { file?: { path: string } }, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'audio required' })
    return
  }
  
  // OpenAI requires a valid extension to determine file type.
  // Multer saves with no extension by default.
  const originalPath = req.file.path
  const targetPath = originalPath + '.webm'
  const engine = req.body.engine || 'openai' // 'openai' | 'offline'
  
  try {
    fs.renameSync(originalPath, targetPath)
    let text = ''
    
    if (engine === 'offline') {
      console.log('Using offline transcription')
      text = await offlineService.transcribe(targetPath)
    } else {
      text = await transcribeAudio(targetPath)
    }
    console.log(`${engine} Transcription:`, text);
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
  const { text, engine } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }

  if (engine === 'offline') {
    console.log('Using offline detection')
    try {
      const results = await offlineService.detectScripture(text)
      for (const item of results) {
        await scriptureStore.detect({ 
          reference: item.reference, 
          translation: item.translation, 
          text: item.text, 
          confidence: 0.95 
        })
      }
      const queue = await scriptureStore.getQueue()
      res.json({ success: true, data: { references: results.map(r => ({ reference: r.reference, version: r.translation })), queue, currentVersion: 'KJV' } })
    } catch (err) {
      console.error('Offline detection error:', err)
      res.status(500).json({ success: false, error: 'Offline detection failed' })
    }
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
  } catch (err: any) {
    console.error('Translation error:', err)
    if (err.message === 'Translation not activated') {
      res.status(400).json({ success: false, error: 'Offline translation not activated. Please go to Settings -> Offline AI and download the models.' })
      return
    }
    res.status(500).json({ success: false, error: err.message || 'Translation failed' })
  }
})

router.post('/translation/activate', async (req: Request, res: Response) => {
  try {
    const result = await activateMarian()
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Activate translation error:', err)
    res.status(500).json({ success: false, error: 'Activation failed' })
  }
})

router.get('/translation/status', async (req: Request, res: Response) => {
  try {
    const result = await getMarianStatus()
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Status translation error:', err)
    res.status(500).json({ success: false, error: 'Status failed' })
  }
})

router.post('/lyrics/fetch', async (req: Request, res: Response) => {
  const { title } = req.body || {}
  if (!title) {
    res.status(400).json({ success: false, error: 'title required' })
    return
  }
  try {
    const data = await fetchSongLyrics(title)
    console.log("Hymn fetch ai:",data);
    if (!data) {
      res.status(404).json({ success: false, error: 'Lyrics not found' })
      return
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('Lyrics fetch route error:', err)
    res.status(500).json({ success: false, error: 'Fetch failed' })
  }
})

export default router
