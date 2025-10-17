// Authentication routes
import express from 'express'
import { z } from 'zod'
import { AuthService } from '../services/AuthService.js'
import { authenticateJWT, type AuthRequest } from '../middleware/auth.js'

const router = express.Router()
const authService = new AuthService()

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, username, password } = signupSchema.parse(req.body)

    const result = await authService.signup(email, username, password)

    res.status(201).json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }

    res.status(400).json({ error: error.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const result = await authService.login(email, password)

    res.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }

    res.status(401).json({ error: error.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const profile = await authService.getProfile(req.user!.id)

    res.json({ user: profile })
  } catch (error: any) {
    res.status(404).json({ error: error.message })
  }
})

export default router
