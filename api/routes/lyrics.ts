import { Router, type Request, type Response } from 'express'
import { lyricsStore } from '../services/lyricsStore.js'
import { settingsStore } from '../services/settingsStore.js'

const router = Router()

router.get('/songs', async (req: Request, res: Response) => {
  const data = await lyricsStore.list()
  res.json({ success: true, data })
})

router.post('/songs', async (req: Request, res: Response) => {
  const { title, language, lines } = req.body || {}
  if (!title || !Array.isArray(lines)) {
    res.status(400).json({ success: false, error: 'title and lines required' })
    return
  }
  const data = await lyricsStore.create({ title, language, lines })
  res.status(201).json({ success: true, data })
})

router.put('/songs/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await lyricsStore.update(id, req.body || {})
  if (!data) {
    res.status(404).json({ success: false, error: 'not found' })
    return
  }
  res.json({ success: true, data })
})

router.delete('/songs/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  await lyricsStore.remove(id)
  res.json({ success: true })
})

router.get('/current', async (req: Request, res: Response) => {
  const s = await settingsStore.get()
  res.json({ success: true, data: { songId: s.currentSongId ?? null, lineIndex: s.currentLineIndex ?? 0, show: s.showLyricsOverlay ?? false } })
})

router.post('/current', async (req: Request, res: Response) => {
  const { songId, lineIndex, show } = req.body || {}
  const data = await settingsStore.set({ currentSongId: songId, currentLineIndex: typeof lineIndex === 'number' ? lineIndex : 0, showLyricsOverlay: typeof show === 'boolean' ? show : undefined })
  res.json({ success: true, data: { songId: data.currentSongId ?? null, lineIndex: data.currentLineIndex ?? 0, show: data.showLyricsOverlay ?? false } })
})

export default router

