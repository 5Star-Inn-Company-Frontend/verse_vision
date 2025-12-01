import { Router, type Request, type Response } from 'express'
import { playlistStore } from '../services/playlistStore.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const data = await playlistStore.listPlaylists()
  res.json({ success: true, data })
})

router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body || {}
  if (!name) {
    res.status(400).json({ success: false, error: 'name required' })
    return
  }
  const data = await playlistStore.createPlaylist(name)
  res.status(201).json({ success: true, data })
})

router.get('/:id/items', async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await playlistStore.listItems(id)
  res.json({ success: true, data })
})

router.post('/:id/items', async (req: Request, res: Response) => {
  const { id } = req.params
  const { type, title, path } = req.body || {}
  if (!type || !title) {
    res.status(400).json({ success: false, error: 'type and title required' })
    return
  }
  const data = await playlistStore.addItem(id, { type, title, path })
  res.status(201).json({ success: true, data })
})

router.delete('/items/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params
  await playlistStore.removeItem(itemId)
  res.json({ success: true })
})

export default router

