/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'

const router = Router()

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password required' })
    return
  }
  res.status(201).json({ success: true })
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password required' })
    return
  }
  const token = 'mock-' + Buffer.from(`${email}:${Date.now()}`).toString('base64')
  res.json({ success: true, token })
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true })
})

export default router
