/**
 * Integration tests for idempotency in loop routes
 *
 * Tests that POST /api/loops routes correctly handle idempotency keys:
 * - First request creates resource
 * - Retry with same key returns cached response (no duplicate)
 * - Different key creates new resource
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'crypto'

// Skip these tests for now - they require the API server to be running
describe.skip('Loop Routes - Idempotency', () => {
  const API_BASE_URL = 'http://localhost:3001'
  let authToken: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user and get auth token
    const email = `test-${randomUUID()}@example.com`
    const signupRes = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username: 'testuser',
        password: 'testpassword123',
      }),
    })

    if (!signupRes.ok) {
      throw new Error(`Signup failed: ${await signupRes.text()}`)
    }

    const signupData = await signupRes.json()
    authToken = signupData.token
    testUserId = signupData.user.id
  })

  describe('POST /api/loops with idempotency', () => {
    it('creates loop on first request', async () => {
      const idempotencyKey = randomUUID()
      const loopData = {
        name: 'Test Loop 1',
        bars: 4,
        color: '#FFD11A',
        bpm: 120,
        schemaVersion: 1,
        chordProgression: [],
        iconSequence: [],
        updatedAt: new Date().toISOString(),
      }

      const res = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(loopData),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.loop).toBeDefined()
      expect(data.loop.name).toBe('Test Loop 1')
      expect(data.loop.id).toBeDefined()
    })

    it('returns cached response on duplicate request', async () => {
      const idempotencyKey = randomUUID()
      const loopData = {
        name: 'Test Loop Duplicate',
        bars: 4,
        color: '#FFD11A',
        bpm: 120,
        schemaVersion: 1,
        chordProgression: [],
        iconSequence: [],
        updatedAt: new Date().toISOString(),
      }

      // First request
      const res1 = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(loopData),
      })

      expect(res1.status).toBe(201)
      const data1 = await res1.json()
      const loopId1 = data1.loop.id

      // Second request with SAME idempotency key
      const res2 = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(loopData),
      })

      expect(res2.status).toBe(201)
      const data2 = await res2.json()
      const loopId2 = data2.loop.id

      // Should return SAME loop (not create duplicate)
      expect(loopId2).toBe(loopId1)
      expect(data2).toEqual(data1)
    })

    it('creates new loop with different idempotency key', async () => {
      const idempotencyKey1 = randomUUID()
      const idempotencyKey2 = randomUUID()
      const loopData = {
        name: 'Test Loop Different Key',
        bars: 4,
        color: '#FFD11A',
        bpm: 120,
        schemaVersion: 1,
        chordProgression: [],
        iconSequence: [],
        updatedAt: new Date().toISOString(),
      }

      // First request
      const res1 = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': idempotencyKey1,
        },
        body: JSON.stringify(loopData),
      })

      expect(res1.status).toBe(201)
      const data1 = await res1.json()

      // Second request with DIFFERENT idempotency key
      const res2 = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': idempotencyKey2,
        },
        body: JSON.stringify(loopData),
      })

      expect(res2.status).toBe(201)
      const data2 = await res2.json()

      // Should create NEW loop (different ID)
      expect(data2.loop.id).not.toBe(data1.loop.id)
    })

    it('rejects invalid idempotency key format', async () => {
      const loopData = {
        name: 'Test Loop Invalid Key',
        bars: 4,
        color: '#FFD11A',
        bpm: 120,
        schemaVersion: 1,
        chordProgression: [],
        iconSequence: [],
        updatedAt: new Date().toISOString(),
      }

      const res = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Idempotency-Key': 'not-a-valid-uuid',
        },
        body: JSON.stringify(loopData),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Invalid Idempotency-Key')
    })

    it('allows request without idempotency key', async () => {
      const loopData = {
        name: 'Test Loop No Key',
        bars: 4,
        color: '#FFD11A',
        bpm: 120,
        schemaVersion: 1,
        chordProgression: [],
        iconSequence: [],
        updatedAt: new Date().toISOString(),
      }

      const res = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          // No Idempotency-Key header
        },
        body: JSON.stringify(loopData),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.loop).toBeDefined()
    })
  })

  describe('POST /api/loops/:id/duplicate with idempotency', () => {
    let originalLoopId: string

    beforeAll(async () => {
      // Create original loop to duplicate
      const res = await fetch(`${API_BASE_URL}/api/loops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Original Loop',
          bars: 4,
          color: '#FFD11A',
          bpm: 120,
          schemaVersion: 1,
          chordProgression: [],
          iconSequence: [],
          updatedAt: new Date().toISOString(),
        }),
      })

      const data = await res.json()
      originalLoopId = data.loop.id
    })

    it('returns cached response when duplicating with same key', async () => {
      const idempotencyKey = randomUUID()

      // First duplicate request
      const res1 = await fetch(
        `${API_BASE_URL}/api/loops/${originalLoopId}/duplicate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'Idempotency-Key': idempotencyKey,
          },
        }
      )

      expect(res1.status).toBe(201)
      const data1 = await res1.json()
      const duplicateId1 = data1.loop.id

      // Second duplicate request with SAME key
      const res2 = await fetch(
        `${API_BASE_URL}/api/loops/${originalLoopId}/duplicate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'Idempotency-Key': idempotencyKey,
          },
        }
      )

      expect(res2.status).toBe(201)
      const data2 = await res2.json()

      // Should return SAME duplicate (not create another)
      expect(data2.loop.id).toBe(duplicateId1)
      expect(data2).toEqual(data1)
    })
  })
})
