/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import scriptureRoutes from './routes/scripture.js'
import settingsRoutes from './routes/settings.js'
import cameraRoutes from './routes/camera.js'
import scenesRoutes from './routes/scenes.js'
import translateRoutes from './routes/translate.js'
import lyricsRoutes from './routes/lyrics.js'
import playlistsRoutes from './routes/playlists.js'
import mediaRoutes from './routes/media.js'
import aiRoutes from './routes/ai.js'
import webrtcRoutes from './routes/webrtc.js'
import { startVideoProcessor } from './services/videoProcessor.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

function ensureSeedUploads(): void {
  try {
    if (!process.env.VV_DATA_DIR) return
    const destDir = path.join(process.env.VV_DATA_DIR, 'uploads')
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    const existing = fs.readdirSync(destDir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
    if (existing.length > 0) return
    const srcDir = path.resolve(__dirname, '../uploads')
    if (!fs.existsSync(srcDir)) return
    const srcFiles = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
    for (const f of srcFiles) {
      const from = path.join(srcDir, f)
      const to = path.join(destDir, f)
      try { fs.copyFileSync(from, to) } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}
ensureSeedUploads()

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/scripture', scriptureRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/camera', cameraRoutes)
app.use('/api/scenes', scenesRoutes)
app.use('/api/translate', translateRoutes)
app.use('/api/lyrics', lyricsRoutes)
app.use('/api/playlists', playlistsRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/webrtc', webrtcRoutes)
// Serve uploaded media BEFORE the catch-all route to avoid intercepting /uploads/*
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  },
  express.static(
    process.env.VV_DATA_DIR
      ? path.join(process.env.VV_DATA_DIR, 'uploads')
      : path.resolve(__dirname, './uploads'),
  ),
)

// Frontend static (production builds)
app.use(express.static(path.resolve(__dirname, '../../dist')))
app.get('*', (req: Request, res: Response) => {
  const p = path.resolve(__dirname, '../../dist/index.html')
  res.sendFile(p)
})

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  void next
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
startVideoProcessor()
