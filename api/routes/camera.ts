import { Router, type Request, type Response } from 'express'
import QRCode from 'qrcode'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { cameraStore } from '../services/cameraStore.js'
import { broadcast } from '../services/wsBus.js'
import { getLocalIpAddress } from '../utils/network.js'

const router = Router()
const cameraDir = process.env.VV_DATA_DIR
  ? path.join(process.env.VV_DATA_DIR, 'uploads', 'cameras')
  : path.resolve(__dirname, '../uploads/cameras')
if (!fs.existsSync(cameraDir)) fs.mkdirSync(cameraDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cameraDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9_.-]+/g, '_')}`),
})
const upload = multer({ storage })

router.get('/ip', (_req: Request, res: Response) => {
  res.json({ success: true, data: getLocalIpAddress() })
})

router.post('/pair', async (req: Request, res: Response) => {
  const { customIp } = req.body
  const token = 'cam-' + Math.random().toString(36).slice(2, 10)
  const port = process.env.PORT || 3001
  
  const ip = customIp || getLocalIpAddress()
  const host = `http://${ip}:${port}`
  
  const payload = {
    token,
    server: host,
    createdAt: Date.now(),
  }
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload))
  res.status(201).json({ success: true, data: { token, qr: dataUrl, payload } })
})

router.post('/register', async (req: Request, res: Response) => {
  const { token, deviceId, name } = req.body || {}
  if (!token) { res.status(400).json({ success: false, error: 'token required' }); return }
  const cam = await cameraStore.register(token, deviceId, name)
  broadcast({ type: 'cameraRegistered', camera: cam })
  res.status(201).json({ success: true, data: cam })
})

router.post('/heartbeat', async (req: Request, res: Response) => {
  const { token, battery, signal } = req.body || {}
  if (!token) { res.status(400).json({ success: false, error: 'token required' }); return }
  const cam = await cameraStore.byToken(token)
  if (!cam) { res.status(404).json({ success: false, error: 'not found' }); return }
  await cameraStore.heartbeat(cam.id)

  const statusCam = {
    ...cam,
    ...(battery !== undefined ? { battery } : {}),
    ...(signal !== undefined ? { signal } : {}),
  }

  broadcast({ type: 'cameraHeartbeat', camera: statusCam, ts: Date.now() })
  res.json({ success: true })
})

router.post('/frame', upload.single('frame'), async (req: Request & { file?: { filename: string } }, res: Response) => {
  const { token } = req.body || {}
  if (!token) { res.status(400).json({ success: false, error: 'token required' }); return }
  const cam = await cameraStore.byToken(token)
  if (!cam) { res.status(404).json({ success: false, error: 'not found' }); return }
  if (!req.file) { res.status(400).json({ success: false, error: 'frame required' }); return }
  const rel = `/uploads/cameras/${req.file.filename}`
  await cameraStore.setPreviewPath(cam.id, rel)
  await cameraStore.heartbeat(cam.id)
  broadcast({ type: 'cameraFrame', cameraId: cam.id, previewPath: rel, ts: Date.now() })
  res.status(201).json({ success: true, data: { path: rel } })
})

router.get('/list', async (_req: Request, res: Response) => {
  const cams = await cameraStore.list()
  res.json({ success: true, data: cams })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  if (!id) { res.status(400).json({ success: false, error: 'id required' }); return }
  await cameraStore.remove(id)
  broadcast({ type: 'cameraRemoved', cameraId: id, ts: Date.now() })
  res.json({ success: true })
})

export default router
