import { Router, type Request, type Response } from 'express'
import { settingsStore } from '../services/settingsStore.js'
import { listPeers, listSessions } from '../services/signaling.js'

const router = Router()

router.get('/config', async (_req: Request, res: Response) => {
  const s = await settingsStore.get()
  let iceServers: Array<{ urls: string; username?: string; credential?: string }> = [{ urls: 'stun:stun.l.google.com:19302' }]
  try {
    if (s.iceServersJson) iceServers = JSON.parse(s.iceServersJson)
  } catch (e) { void e }
  res.json({ success: true, data: { iceServers } })
})

router.post('/config', async (req: Request, res: Response) => {
  const { iceServers } = req.body || {}
  const json = JSON.stringify(Array.isArray(iceServers) ? iceServers : [])
  const s = await settingsStore.set({ iceServersJson: json })
  res.json({ success: true, data: { iceServers: JSON.parse(s.iceServersJson || '[]') } })
})

router.get('/peers', async (_req: Request, res: Response) => {
  const ids = listPeers()
  res.json({ success: true, data: ids })
})

router.get('/sessions', async (_req: Request, res: Response) => {
  const ss = listSessions()
  res.json({ success: true, data: ss })
})

export default router
