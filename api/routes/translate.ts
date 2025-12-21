import { Router, type Request, type Response } from 'express'
import { translateTextMarian } from '../services/ai/marian.js'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  
  try {
    const data = await translateTextMarian(text)
    res.json({ success: true, data })
  } catch (error) {
    console.error('Translation failed:', error)
    res.status(500).json({ success: false, error: 'Translation failed' })
  }
})

export default router

