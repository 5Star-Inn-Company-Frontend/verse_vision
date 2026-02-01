import { Router, type Request, type Response } from 'express'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body || {}
  if (!text) {
    res.status(400).json({ success: false, error: 'text required' })
    return
  }
  const data = {
    Yoruba: text,
    Hausa: text,
    Igbo: text,
    French: text,
  }
  res.json({ success: true, data })
})

export default router

