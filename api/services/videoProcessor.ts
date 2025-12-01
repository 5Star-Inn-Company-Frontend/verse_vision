import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { videoStore } from './videoStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

async function processJob(id: string) {
  const job = await videoStore.get(id)
  if (!job || job.status !== 'queued') return
  await videoStore.update(id, { status: 'processing' })
  try {
    const ff = process.env.FFMPEG_PATH || 'ffmpeg'
    const uploadsRoot = path.resolve(__dirname, '../uploads')
    const outDir = path.resolve(uploadsRoot, 'hls', id)
    ensureDir(outDir)
    const inputAbs = path.resolve(uploadsRoot, job.inputPath.replace('/uploads/', ''))
    const indexPath = path.join(outDir, 'index.m3u8')
    const segPattern = path.join(outDir, 'seg_%03d.ts')

    const args = ['-i', inputAbs, '-vf', 'scale=-2:720', '-preset', 'veryfast', '-c:v', 'h264', '-c:a', 'aac', '-b:a', '128k', '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_segment_filename', segPattern, indexPath]
    const proc = spawn(ff, args, { stdio: 'ignore' })
    await new Promise<void>((resolve, reject) => {
      proc.on('error', reject)
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code))))
    })
    const rel = `/uploads/hls/${id}/index.m3u8`
    await videoStore.update(id, { status: 'completed', outputPath: rel })
  } catch (e) {
    const msg = (e as Error)?.message || String(e)
    await videoStore.update(id, { status: 'completed', outputPath: job.inputPath, error: msg })
  }
}

let timer: NodeJS.Timeout | null = null

export function startVideoProcessor() {
  if (timer) return
  timer = setInterval(async () => {
    try {
      const jobs = await videoStore.list()
      const next = jobs.find((j) => j.status === 'queued')
      if (next) await processJob(next.id)
    } catch (_e) { void _e }
  }, 3000)
}
