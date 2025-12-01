import { Router, type Request, type Response } from 'express'
import { sceneStore } from '../services/sceneStore.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const data = await sceneStore.list()
  res.json({ success: true, data })
})

router.post('/', async (req: Request, res: Response) => {
  const { name, primaryCameraId, translationStyle, showScriptureOverlay } = req.body || {}
  if (!name) {
    res.status(400).json({ success: false, error: 'name required' })
    return
  }
  const data = await sceneStore.create({
    name,
    primaryCameraId: primaryCameraId ?? null,
    translationStyle: translationStyle ?? 'subtitle',
    showScriptureOverlay: !!showScriptureOverlay,
  })
  res.status(201).json({ success: true, data })
})

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const data = await sceneStore.update(id, req.body || {})
  if (!data) {
    res.status(404).json({ success: false, error: 'not found' })
    return
  }
  res.json({ success: true, data })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  await sceneStore.remove(id)
  res.json({ success: true })
})

export default router

