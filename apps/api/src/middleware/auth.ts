// JWT authentication middleware
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string
      email: string
      username: string
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Optional auth - adds user to request if token exists, but doesn't require it
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string
      email: string
      username: string
    }

    req.user = decoded
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }

  next()
}
