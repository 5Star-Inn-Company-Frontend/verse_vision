import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
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
  let jobId: string | undefined
  if (isVideo) {
    // enqueue video processing job
    void videoStore.enqueue(rel, req.file.originalname || null).then((job) => { jobId = job.id })
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

export default router
