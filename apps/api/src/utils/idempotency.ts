/**
 * Idempotency utilities for preventing duplicate mutations
 *
 * Implements idempotency key pattern to ensure POST requests
 * can be safely retried without creating duplicate resources.
 */

import { pool } from '../db/client.js'

/**
 * Validates if a string is a valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Cached response from a previous idempotent request
 */
export interface CachedResponse {
  statusCode: number
  body: any
  createdAt: Date
}

/**
 * Checks if an idempotency key has been used before
 *
 * @param key - Idempotency-Key header value (UUID)
 * @param endpoint - API endpoint path (e.g., '/api/loops')
 * @param method - HTTP method (e.g., 'POST')
 * @param userId - User ID making the request (null for unauthenticated)
 * @returns Cached response if key exists and not expired, null otherwise
 */
export async function checkIdempotencyKey(
  key: string,
  endpoint: string,
  method: string,
  userId: string | null
): Promise<CachedResponse | null> {
  try {
    // Clean up expired keys first (optimization)
    await pool.query('DELETE FROM idempotency_keys WHERE expires_at < NOW()')

    // Check if key exists for this user + endpoint + method
    const result = await pool.query(
      `SELECT status_code, response_body, created_at
       FROM idempotency_keys
       WHERE key = $1
         AND endpoint = $2
         AND method = $3
         AND (user_id = $4 OR (user_id IS NULL AND $4 IS NULL))
         AND expires_at > NOW()`,
      [key, endpoint, method, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      statusCode: row.status_code,
      body: row.response_body,
      createdAt: row.created_at,
    }
  } catch (error) {
    // Log error but don't throw - fail open to allow request to proceed
    console.error('Failed to check idempotency key:', error)
    return null
  }
}

/**
 * Stores an idempotency key with its response for future checks
 *
 * @param key - Idempotency-Key header value (UUID)
 * @param endpoint - API endpoint path
 * @param method - HTTP method
 * @param userId - User ID making the request (null for unauthenticated)
 * @param statusCode - HTTP status code of the response
 * @param responseBody - Response body to cache
 * @param ttlHours - Time-to-live in hours (default 24)
 */
export async function storeIdempotencyKey(
  key: string,
  endpoint: string,
  method: string,
  userId: string | null,
  statusCode: number,
  responseBody: any,
  ttlHours: number = 24
): Promise<void> {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + ttlHours)

    // Use INSERT ON CONFLICT DO NOTHING to handle race conditions
    // First request to insert wins
    await pool.query(
      `INSERT INTO idempotency_keys
        (key, endpoint, method, user_id, status_code, response_body, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (key) DO NOTHING`,
      [key, endpoint, method, userId, statusCode, responseBody, expiresAt]
    )
  } catch (error) {
    // Log error but don't throw - response already sent to client
    console.error('Failed to store idempotency key:', error)
  }
}
