import { Router, type Request, type Response } from 'express'
import { scriptureStore } from '../services/scriptureStore.js'
import { bibleService } from '../services/bibleService.js'

const router = Router()

router.get('/translations', async (req: Request, res: Response) => {
  const translations = await bibleService.getAvailableTranslations()
  res.json({ success: true, data: translations })
})

router.get('/queue', async (req: Request, res: Response) => {
  const data = await scriptureStore.getQueue()
  res.json({ success: true, data })
})

router.get('/current', async (req: Request, res: Response) => {
  const data = await scriptureStore.getCurrent()
  res.json({ success: true, data })
})

router.post('/detect', async (req: Request, res: Response) => {
  const { reference, translation, text, confidence } = req.body || {}
  
  if (!reference || !translation || !text) {
    res.status(400).json({ success: false, error: 'Missing fields' })
    return
  }

  const item = await scriptureStore.detect({ reference, translation, text, confidence: confidence ?? 0.9 })
  res.status(201).json({ success: true, data: item })
})

router.post('/approve', async (req: Request, res: Response) => {
  const { id } = req.body || {}
  if (!id) {
    res.status(400).json({ success: false, error: 'id required' })
    return
  }
  const approved = await scriptureStore.approve(id)
  if (!approved) {
    res.status(404).json({ success: false, error: 'Item not found' })
    return
  }
  res.json({ success: true, data: approved })
})

router.post('/reject', async (req: Request, res: Response) => {
  const { id } = req.body || {}
  if (!id) {
    res.status(400).json({ success: false, error: 'id required' })
    return
  }
  await scriptureStore.reject(id)
  res.json({ success: true })
})

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updated = await scriptureStore.update(id, req.body || {})
  if (!updated) {
    res.status(404).json({ success: false, error: 'Item not found' })
    return
  }
  res.json({ success: true, data: updated })
})

export default router
