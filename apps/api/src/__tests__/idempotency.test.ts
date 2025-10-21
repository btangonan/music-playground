/**
 * Integration tests for idempotency middleware
 *
 * Tests the complete idempotency flow:
 * - First request creates resource
 * - Duplicate request with same key returns cached response
 * - Different key creates new resource
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { pool } from '../db/client.js'
import {
  isValidUUID,
  checkIdempotencyKey,
  storeIdempotencyKey,
} from '../utils/idempotency.js'

describe('Idempotency Utils', () => {
  describe('isValidUUID', () => {
    it('validates correct UUID v4', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      expect(isValidUUID(validUUID)).toBe(true)
    })

    it('rejects invalid UUID formats', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('123')).toBe(false)
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false) // incomplete
    })

    it('rejects non-v4 UUIDs', () => {
      // UUID v1 (note the '1' in the version position)
      const uuidV1 = '550e8400-e29b-11d4-a716-446655440000'
      expect(isValidUUID(uuidV1)).toBe(false)
    })
  })

  describe('checkIdempotencyKey and storeIdempotencyKey', () => {
    const testKey = randomUUID()
    const testEndpoint = '/api/test'
    const testMethod = 'POST'
    let testUserId: string
    const testResponse = { id: '123', name: 'Test Loop' }

    beforeAll(async () => {
      // Create test user first to satisfy foreign key constraint
      const userResult = await pool.query(
        `INSERT INTO users (id, email, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [randomUUID(), `test-${randomUUID()}@idempotency.com`, `test_${randomUUID().slice(0, 20)}`, '$2b$10$dummyhash']
      )
      testUserId = userResult.rows[0].id

      // Ensure idempotency_keys table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key UUID PRIMARY KEY,
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          user_id UUID,
          status_code INTEGER NOT NULL,
          response_body JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          CONSTRAINT check_expires CHECK (expires_at > created_at)
        )
      `)
    })

    afterAll(async () => {
      // Clean up test keys
      await pool.query('DELETE FROM idempotency_keys WHERE endpoint = $1', [
        testEndpoint,
      ])
    })

    it('returns null for non-existent key', async () => {
      const nonExistentKey = randomUUID()
      const result = await checkIdempotencyKey(
        nonExistentKey,
        testEndpoint,
        testMethod,
        testUserId
      )
      expect(result).toBeNull()
    })

    it('stores and retrieves idempotency key', async () => {
      // Store key
      await storeIdempotencyKey(
        testKey,
        testEndpoint,
        testMethod,
        testUserId,
        201,
        testResponse
      )

      // Retrieve key
      const result = await checkIdempotencyKey(
        testKey,
        testEndpoint,
        testMethod,
        testUserId
      )

      expect(result).not.toBeNull()
      expect(result?.statusCode).toBe(201)
      expect(result?.body).toEqual(testResponse)
    })

    it('scopes keys by user ID', async () => {
      const userAKey = randomUUID()

      // Create test users
      const userAResult = await pool.query(
        `INSERT INTO users (id, email, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [randomUUID(), `testA-${randomUUID()}@idempotency.com`, `testA_${randomUUID().slice(0, 20)}`, '$2b$10$dummyhash']
      )
      const userAId = userAResult.rows[0].id

      const userBResult = await pool.query(
        `INSERT INTO users (id, email, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [randomUUID(), `testB-${randomUUID()}@idempotency.com`, `testB_${randomUUID().slice(0, 20)}`, '$2b$10$dummyhash']
      )
      const userBId = userBResult.rows[0].id

      // User A stores key
      await storeIdempotencyKey(
        userAKey,
        testEndpoint,
        testMethod,
        userAId,
        201,
        { user: 'A' }
      )

      // User A can retrieve
      const resultA = await checkIdempotencyKey(
        userAKey,
        testEndpoint,
        testMethod,
        userAId
      )
      expect(resultA?.body).toEqual({ user: 'A' })

      // User B cannot retrieve (different user)
      const resultB = await checkIdempotencyKey(
        userAKey,
        testEndpoint,
        testMethod,
        userBId
      )
      expect(resultB).toBeNull()
    })

    it('handles race conditions with ON CONFLICT', async () => {
      const raceKey = randomUUID()

      // Simulate two concurrent requests storing the same key
      await Promise.all([
        storeIdempotencyKey(
          raceKey,
          testEndpoint,
          testMethod,
          testUserId,
          201,
          { attempt: 1 }
        ),
        storeIdempotencyKey(
          raceKey,
          testEndpoint,
          testMethod,
          testUserId,
          201,
          { attempt: 2 }
        ),
      ])

      // Check that only one was stored (first wins)
      const result = await checkIdempotencyKey(
        raceKey,
        testEndpoint,
        testMethod,
        testUserId
      )
      expect(result).not.toBeNull()
      // Either attempt 1 or 2 should be stored, but not both
      expect([{ attempt: 1 }, { attempt: 2 }]).toContainEqual(result?.body)
    })

    it('cleans up expired keys', async () => {
      const expiredKey = randomUUID()

      // First insert a valid key
      await pool.query(
        `INSERT INTO idempotency_keys
         (key, endpoint, method, user_id, status_code, response_body, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')`,
        [expiredKey, testEndpoint, testMethod, testUserId, 201, testResponse]
      )

      // Check should trigger cleanup and return null
      const result = await checkIdempotencyKey(
        expiredKey,
        testEndpoint,
        testMethod,
        testUserId
      )
      expect(result).toBeNull()

      // Verify key was deleted
      const count = await pool.query(
        'SELECT COUNT(*) FROM idempotency_keys WHERE key = $1',
        [expiredKey]
      )
      expect(parseInt(count.rows[0].count)).toBe(0)
    })
  })
})
