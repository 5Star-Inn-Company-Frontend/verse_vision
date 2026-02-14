import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { spawnSync } from 'child_process'
import { videoStore } from '../services/videoStore.js'

const router = Router()
const uploadDir = process.env.VV_DATA_DIR
  ? path.join(process.env.VV_DATA_DIR, 'uploads')
  : path.resolve(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]+/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})

const upload = multer({ storage })

router.post('/upload', upload.single('file'), (req: Request & { file?: { filename: string; mimetype?: string; originalname?: string } }, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'file required' })
    return
  }
  const publicBase = process.env.PUBLIC_SERVER_URL || 'http://localhost:3001'
  const rel = `/uploads/${req.file.filename}`
  const isVideo = (req.file.mimetype || '').startsWith('video/')
  const ext = (req.file.originalname || '').toLowerCase().split('.').pop()
  let jobId: string | undefined
  if (isVideo) {
    // enqueue video processing job
    void videoStore.enqueue(rel, req.file.originalname || null).then((job) => { jobId = job.id })
  }
  // Attempt PPT/PPTX -> PDF conversion (synchronous) if LibreOffice is available
  if (ext === 'ppt' || ext === 'pptx') {
    try {
      const uploadDir = process.env.VV_DATA_DIR
        ? path.join(process.env.VV_DATA_DIR, 'uploads')
        : path.resolve(__dirname, '../uploads')
      const fullPath = path.join(uploadDir, req.file.filename)
      const soffice = spawnSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', uploadDir, fullPath], { stdio: 'pipe' })
      if (soffice.status === 0) {
        const base = req.file.filename.replace(/\.[^.]+$/, '')
        const pdfName = `${base}.pdf`
        const pdfPath = path.join(uploadDir, pdfName)
        if (fs.existsSync(pdfPath)) {
          const pdfRel = `/uploads/${pdfName}`
          res.status(201).json({ success: true, data: { path: pdfRel, url: `${publicBase}${pdfRel}`, jobId } })
          return
        }
      }
      // fallthrough to original rel if conversion failed
    } catch (e) {
      // ignore conversion errors, return original file
    }
  }
  res.status(201).json({ success: true, data: { path: rel, url: `${publicBase}${rel}`, jobId } })
})

router.post('/process', async (req: Request, res: Response) => {
  const { path: rel, title } = req.body || {}
  if (!rel || typeof rel !== 'string') {
    res.status(400).json({ success: false, error: 'path required' })
    return
  }
  const job = await videoStore.enqueue(rel, typeof title === 'string' ? title : null)
  res.status(201).json({ success: true, data: job })
})

router.get('/jobs', async (_req: Request, res: Response) => {
  const jobs = await videoStore.list()
  res.json({ success: true, data: jobs })
})

router.get('/jobs/:id', async (req: Request, res: Response) => {
  const job = await videoStore.get(req.params.id)
  if (!job) {
    res.status(404).json({ success: false, error: 'not found' })
    return
  }
  res.json({ success: true, data: job })
})

router.get('/backgrounds', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      res.json({ success: true, data: [] })
      return
    }
    const files = fs.readdirSync(uploadDir)
    const images = files.filter(f => {
        const ext = path.extname(f).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
    }).map(f => `/uploads/${f}`)
    
    res.json({ success: true, data: images })
  } catch (err) {
    console.error('Error listing backgrounds:', err)
    res.status(500).json({ success: false, error: 'Failed to list backgrounds' })
  }
})

export default router
