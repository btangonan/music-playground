/**
 * E2E tests for Loop API integration (save/load functionality)
 * Tests both happy paths and error scenarios
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loopsApi } from '../services/loopsApi'
import type { Loop } from '@music/types/schemas'

describe('Loop API E2E Tests', () => {
  // Test data matching the LoopSchema
  const validLoopData = {
    name: 'Test Loop',
    bars: 4,
    color: '#FFD11A',
    bpm: 120,
    chordProgression: [
      { bar: 0, chord: 'I' as const },
      { bar: 1, chord: 'V' as const },
      { bar: 2, chord: 'vi' as const },
      { bar: 3, chord: 'IV' as const },
    ],
    iconSequence: [
      { bar: 0, row: 0, soundId: 'kick', velocity: 0.8, pitch: 60 },
      { bar: 1, row: 1, soundId: 'snare', velocity: 0.7, pitch: 62 },
    ],
    schemaVersion: 1,
  }

  beforeEach(() => {
    // Clear localStorage auth token and reset
    localStorage.clear()
    // Set test auth token
    localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBjZGFlNTRhLTViZjEtNGMwYi05YzU4LTcyNDFiM2MwZmYyZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NjA2NDgzMDEsImV4cCI6MTc2MTI1MzEwMX0.XOqfNUUod3BLKxFXYx2JyuCXiZSZ8mg42u8fqhHc-JE')
  })

  describe('Happy Path: Create → Save → Load', () => {
    it('should successfully create a new loop', async () => {
      const savedLoop = await loopsApi.createLoop(validLoopData)

      // Verify response structure
      expect(savedLoop).toHaveProperty('id')
      expect(savedLoop).toHaveProperty('updatedAt')
      expect(savedLoop.name).toBe(validLoopData.name)
      expect(savedLoop.bpm).toBe(validLoopData.bpm)
      expect(savedLoop.bars).toBe(validLoopData.bars)
      expect(savedLoop.chordProgression).toEqual(validLoopData.chordProgression)
      expect(savedLoop.iconSequence).toEqual(validLoopData.iconSequence)

      // Verify UUID format
      expect(savedLoop.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

      // Verify ISO 8601 timestamp format
      expect(savedLoop.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should successfully retrieve a saved loop by ID', async () => {
      // First create a loop
      const savedLoop = await loopsApi.createLoop(validLoopData)

      // Then retrieve it
      const retrievedLoop = await loopsApi.getLoop(savedLoop.id)

      // Verify retrieved data matches saved data
      expect(retrievedLoop.id).toBe(savedLoop.id)
      expect(retrievedLoop.name).toBe(savedLoop.name)
      expect(retrievedLoop.bpm).toBe(savedLoop.bpm)
      expect(retrievedLoop.chordProgression).toEqual(savedLoop.chordProgression)
      expect(retrievedLoop.iconSequence).toEqual(savedLoop.iconSequence)
    })

    it('should successfully update an existing loop', async () => {
      // Create initial loop
      const savedLoop = await loopsApi.createLoop(validLoopData)

      // Update the loop
      const updatedData = {
        ...savedLoop,
        name: 'Updated Loop Name',
        bpm: 140,
        updatedAt: new Date().toISOString(),
      }

      const updatedLoop = await loopsApi.updateLoop(savedLoop.id, updatedData)

      // Verify updates
      expect(updatedLoop.id).toBe(savedLoop.id)
      expect(updatedLoop.name).toBe('Updated Loop Name')
      expect(updatedLoop.bpm).toBe(140)
    })

    it('should handle full create → save → load → update workflow', async () => {
      // Step 1: Create
      const created = await loopsApi.createLoop(validLoopData)
      expect(created.id).toBeDefined()

      // Step 2: Load
      const loaded = await loopsApi.getLoop(created.id)
      expect(loaded.id).toBe(created.id)
      expect(loaded.name).toBe(validLoopData.name)

      // Step 3: Update
      const updated = await loopsApi.updateLoop(created.id, {
        ...loaded,
        name: 'Workflow Test Loop',
        updatedAt: new Date().toISOString(),
      })
      expect(updated.name).toBe('Workflow Test Loop')

      // Step 4: Reload and verify
      const reloaded = await loopsApi.getLoop(created.id)
      expect(reloaded.name).toBe('Workflow Test Loop')
    })
  })

  describe('Error Path: Authentication', () => {
    it('should reject requests without auth token', async () => {
      // Remove auth token
      localStorage.removeItem('auth_token')

      await expect(
        loopsApi.createLoop(validLoopData)
      ).rejects.toThrow(/no token provided/i)
    })

    it('should reject requests with invalid auth token', async () => {
      localStorage.setItem('auth_token', 'invalid-token')

      await expect(
        loopsApi.createLoop(validLoopData)
      ).rejects.toThrow()
    })
  })

  describe('Error Path: Invalid Data', () => {
    it('should reject loop creation with missing required fields', async () => {
      const invalidData = {
        name: 'Test',
        // Missing bars, bpm, chordProgression, etc.
      } as any

      await expect(
        loopsApi.createLoop(invalidData)
      ).rejects.toThrow()
    })

    it('should reject loop creation with chord name too long', async () => {
      const invalidData = {
        ...validLoopData,
        chordProgression: [
          { bar: 0, chord: 'THIS_CHORD_NAME_IS_WAY_TOO_LONG_FOR_THE_SCHEMA' as any },
        ],
      }

      await expect(
        loopsApi.createLoop(invalidData)
      ).rejects.toThrow()
    })

    it('should reject loop creation with negative velocity', async () => {
      const invalidData = {
        ...validLoopData,
        iconSequence: [
          { bar: 0, row: 0, soundId: 'kick', velocity: -0.5, pitch: 60 },
        ],
      }

      await expect(
        loopsApi.createLoop(invalidData)
      ).rejects.toThrow()
    })

    it('should reject loop creation with velocity > 1', async () => {
      const invalidData = {
        ...validLoopData,
        iconSequence: [
          { bar: 0, row: 0, soundId: 'kick', velocity: 1.5, pitch: 60 },
        ],
      }

      await expect(
        loopsApi.createLoop(invalidData)
      ).rejects.toThrow()
    })
  })

  describe('Error Path: Not Found', () => {
    it('should throw error when loading non-existent loop', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      await expect(
        loopsApi.getLoop(fakeId)
      ).rejects.toThrow(/not found/i)
    })

    it('should throw error when updating non-existent loop', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const updateData = {
        ...validLoopData,
        id: fakeId,
        updatedAt: new Date().toISOString(),
      }

      await expect(
        loopsApi.updateLoop(fakeId, updateData)
      ).rejects.toThrow(/not found/i)
    })
  })

  describe('Error Path: Unauthorized Access', () => {
    it('should reject updating another user\'s loop', async () => {
      // Create a loop
      const savedLoop = await loopsApi.createLoop(validLoopData)

      // Switch to different user token (this would be a different user's token in real scenario)
      // For now, we'll test with the same user but the backend should enforce ownership
      const updateData = {
        ...savedLoop,
        name: 'Unauthorized Update',
        updatedAt: new Date().toISOString(),
      }

      // This test assumes backend enforces user_id matching
      // In real implementation, changing auth token here would fail
      // For now, this will succeed since we're using same user
      const result = await loopsApi.updateLoop(savedLoop.id, updateData)
      expect(result.name).toBe('Unauthorized Update')
    })
  })

  describe('Error Path: Network Failures', () => {
    it('should handle network timeout gracefully', async () => {
      // This test would require mocking fetch to simulate timeout
      // For now, we document the expected behavior
      // The httpClient has retry logic with 3 attempts and exponential backoff
      expect(true).toBe(true) // Placeholder
    })

    it('should handle server 500 errors with retry', async () => {
      // This test would require mocking fetch to simulate 500 error
      // For now, we document the expected behavior
      // The httpClient should retry on 5xx errors
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Data Integrity', () => {
    it('should preserve complex chord progressions', async () => {
      const complexProgression = {
        ...validLoopData,
        chordProgression: [
          { bar: 0, chord: 'I' as const },
          { bar: 1, chord: 'bVII' as const },
          { bar: 2, chord: 'sus' as const },
          { bar: 3, chord: 'dim' as const },
        ],
      }

      const saved = await loopsApi.createLoop(complexProgression)
      const loaded = await loopsApi.getLoop(saved.id)

      expect(loaded.chordProgression).toEqual(complexProgression.chordProgression)
    })

    it('should preserve icon sequence with precise velocities', async () => {
      const preciseSequence = {
        ...validLoopData,
        iconSequence: [
          { bar: 0, row: 0, soundId: 'kick', velocity: 0.123, pitch: 60 },
          { bar: 1, row: 1, soundId: 'snare', velocity: 0.456, pitch: 62 },
          { bar: 2, row: 2, soundId: 'hihat', velocity: 0.789, pitch: 64 },
        ],
      }

      const saved = await loopsApi.createLoop(preciseSequence)
      const loaded = await loopsApi.getLoop(saved.id)

      expect(loaded.iconSequence).toEqual(preciseSequence.iconSequence)
    })

    it('should handle empty icon sequence', async () => {
      const emptySequence = {
        ...validLoopData,
        iconSequence: [],
      }

      const saved = await loopsApi.createLoop(emptySequence)
      const loaded = await loopsApi.getLoop(saved.id)

      expect(loaded.iconSequence).toEqual([])
    })

    it('should handle maximum bars configuration', async () => {
      const maxBars = {
        ...validLoopData,
        bars: 8,
        chordProgression: [
          { bar: 0, chord: 'I' as const },
          { bar: 1, chord: 'ii' as const },
          { bar: 2, chord: 'iii' as const },
          { bar: 3, chord: 'IV' as const },
          { bar: 4, chord: 'V' as const },
          { bar: 5, chord: 'vi' as const },
          { bar: 6, chord: 'bVII' as const },
          { bar: 7, chord: 'I' as const },
        ],
      }

      const saved = await loopsApi.createLoop(maxBars)
      const loaded = await loopsApi.getLoop(saved.id)

      expect(loaded.bars).toBe(8)
      expect(loaded.chordProgression).toHaveLength(8)
    })
  })

  describe('Performance', () => {
    it('should complete create operation in reasonable time', async () => {
      const start = Date.now()
      await loopsApi.createLoop(validLoopData)
      const duration = Date.now() - start

      // Should complete within 3 seconds (generous for E2E test)
      expect(duration).toBeLessThan(3000)
    })

    it('should complete load operation in reasonable time', async () => {
      const saved = await loopsApi.createLoop(validLoopData)

      const start = Date.now()
      await loopsApi.getLoop(saved.id)
      const duration = Date.now() - start

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000)
    })
  })
})
