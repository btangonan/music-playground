/**
 * Idempotency middleware for Express routes
 *
 * Prevents duplicate mutations by caching responses for idempotency keys.
 * Apply to POST endpoints that create resources.
 *
 * Usage:
 *   router.post('/api/loops', idempotencyMiddleware, handler)
 *
 * Client must send UUID v4 in Idempotency-Key header:
 *   Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 */

import type { Request, Response, NextFunction } from 'express'
import type { AuthRequest } from './auth.js'
import {
  isValidUUID,
  checkIdempotencyKey,
  storeIdempotencyKey,
} from '../utils/idempotency.js'

/**
 * Middleware to handle idempotency for POST requests
 *
 * - If Idempotency-Key header is present:
 *   - Validates key is UUID v4 format
 *   - Checks if key has been used before
 *   - If found: returns cached response
 *   - If not found: allows request to proceed and caches response
 * - If no Idempotency-Key header: allows request to proceed (idempotency optional)
 *
 * @param req - Express request (may be AuthRequest with user)
 * @param res - Express response
 * @param next - Express next function
 */
export async function idempotencyMiddleware(
  req: Request | AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined

  // No idempotency key provided - allow request to proceed
  if (!idempotencyKey) {
    return next()
  }

  // Validate idempotency key format (must be UUID v4)
  if (!isValidUUID(idempotencyKey)) {
    res.status(400).json({
      error: 'Invalid Idempotency-Key format',
      details: 'Idempotency-Key must be a valid UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)',
    })
    return
  }

  const endpoint = req.path
  const method = req.method
  const userId = (req as AuthRequest).user?.id || null

  // Check if this idempotency key has been used before
  const cached = await checkIdempotencyKey(
    idempotencyKey,
    endpoint,
    method,
    userId
  )

  // Cached response found - return it immediately
  if (cached) {
    console.log(`Idempotency hit: ${idempotencyKey} for ${method} ${endpoint}`)
    res.status(cached.statusCode).json(cached.body)
    return
  }

  // No cached response - intercept res.json to cache the response
  const originalJson = res.json.bind(res)

  res.json = function (body: any) {
    // Store the idempotency key + response for future requests
    // Don't await - let it happen async to avoid delaying response
    storeIdempotencyKey(
      idempotencyKey,
      endpoint,
      method,
      userId,
      res.statusCode,
      body
    ).catch((error) => {
      console.error('Failed to store idempotency key:', error)
    })

    // Return the original response
    return originalJson(body)
  } as typeof res.json

  // Continue to route handler
  next()
}
