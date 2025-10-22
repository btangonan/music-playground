// Loop management routes
import express from 'express'
import { LoopService } from '../services/LoopService.js'
import { authenticateJWT, optionalAuth, type AuthRequest } from '../middleware/auth.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'

const router = express.Router()
const loopService = new LoopService()

// GET /api/loops - List loops
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { public: isPublic, limit, offset } = req.query

    const filters = {
      public: isPublic === 'true',
      userId: req.user?.id,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    }

    const loops = await loopService.listLoops(filters)

    res.json({ loops })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/loops/:id - Get specific loop
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const loop = await loopService.getLoop(req.params.id, req.user?.id)

    res.json({ loop })
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message })
    }

    res.status(500).json({ error: error.message })
  }
})

// POST /api/loops - Create new loop
router.post('/', authenticateJWT, idempotencyMiddleware, async (req: AuthRequest, res) => {
  try {
    const loop = await loopService.createLoop(req.user!.id, req.body)

    res.status(201).json({ loop })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// PUT /api/loops/:id - Update loop
router.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const loop = await loopService.updateLoop(req.params.id, req.user!.id, req.body)

    res.json({ loop })
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message })
    }

    res.status(400).json({ error: error.message })
  }
})

// DELETE /api/loops/:id - Delete loop
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    await loopService.deleteLoop(req.params.id, req.user!.id)

    res.status(204).send()
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: 'Loop not found' })
    }

    res.status(500).json({ error: error.message })
  }
})

// POST /api/loops/:id/duplicate - Duplicate/remix loop
router.post('/:id/duplicate', authenticateJWT, idempotencyMiddleware, async (req: AuthRequest, res) => {
  try {
    const loop = await loopService.duplicateLoop(req.params.id, req.user!.id)

    res.status(201).json({ loop })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
