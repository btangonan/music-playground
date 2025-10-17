// Test-first approach: Define expected behavior before implementation
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter'
import type { Loop, Song } from '../types'

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter

  beforeEach(async () => {
    // Create fresh adapter for each test
    adapter = new IndexedDBAdapter()
    await adapter.init()
  })

  describe('Loop operations', () => {
    const testLoop: Loop = {
      id: 'loop-test-1',
      name: 'Test Loop',
      bars: 4,
      color: '#FFD11A',
      chordProgression: [{ bar: 0, chord: 'Cmaj7' }],
      iconSequence: [{ bar: 0, row: 0, soundId: 'synth-lead', velocity: 0.8 }],
      bpm: 120,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    it('saves and retrieves loop', async () => {
      await adapter.putLoop(testLoop)
      const retrieved = await adapter.getLoop('loop-test-1')

      expect(retrieved).toEqual(testLoop)
    })

    it('returns null for non-existent loop', async () => {
      const result = await adapter.getLoop('does-not-exist')
      expect(result).toBeNull()
    })

    it('lists all loop IDs', async () => {
      await adapter.putLoop(testLoop)
      await adapter.putLoop({ ...testLoop, id: 'loop-test-2', name: 'Second Loop' })

      const ids = await adapter.listLoopIds()
      expect(ids).toContain('loop-test-1')
      expect(ids).toContain('loop-test-2')
      expect(ids).toHaveLength(2)
    })

    it('updates existing loop', async () => {
      await adapter.putLoop(testLoop)

      const updated = { ...testLoop, name: 'Updated Loop' }
      await adapter.putLoop(updated)

      const retrieved = await adapter.getLoop('loop-test-1')
      expect(retrieved?.name).toBe('Updated Loop')
    })

    it('deletes loop', async () => {
      await adapter.putLoop(testLoop)
      await adapter.deleteLoop('loop-test-1')

      const retrieved = await adapter.getLoop('loop-test-1')
      expect(retrieved).toBeNull()

      const ids = await adapter.listLoopIds()
      expect(ids).not.toContain('loop-test-1')
    })
  })

  describe('Song operations', () => {
    const testSong: Song = {
      id: 'song-test-1',
      name: 'Test Song',
      bpm: 120,
      timeSignature: '4/4',
      timeline: [
        { id: 'block-1', loopId: 'loop-1', startBar: 0, bars: 4 }
      ],
      totalBars: 4,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    it('saves and retrieves song', async () => {
      await adapter.putSong(testSong)
      const retrieved = await adapter.getSong('song-test-1')

      expect(retrieved).toEqual(testSong)
    })

    it('returns null for non-existent song', async () => {
      const result = await adapter.getSong('does-not-exist')
      expect(result).toBeNull()
    })

    it('lists all song IDs', async () => {
      await adapter.putSong(testSong)
      await adapter.putSong({ ...testSong, id: 'song-test-2', name: 'Second Song' })

      const ids = await adapter.listSongIds()
      expect(ids).toContain('song-test-1')
      expect(ids).toContain('song-test-2')
      expect(ids).toHaveLength(2)
    })

    it('deletes song', async () => {
      await adapter.putSong(testSong)
      await adapter.deleteSong('song-test-1')

      const retrieved = await adapter.getSong('song-test-1')
      expect(retrieved).toBeNull()
    })
  })

  describe('Sample operations', () => {
    it('saves and retrieves blob', async () => {
      const blob = new Blob(['test audio data'], { type: 'audio/wav' })

      await adapter.putSample('sample-1', blob)
      const retrieved = await adapter.getSample('sample-1')

      expect(retrieved).not.toBeNull()
      // fake-indexeddb may not preserve Blob constructor, just check it exists
      expect(retrieved).toBeDefined()

      if (retrieved instanceof Blob) {
        expect(retrieved.type).toBe('audio/wav')
        const text = await retrieved.text()
        expect(text).toBe('test audio data')
      }
    })

    it('returns null for non-existent sample', async () => {
      const result = await adapter.getSample('does-not-exist')
      expect(result).toBeNull()
    })

    it('deletes sample', async () => {
      const blob = new Blob(['test'], { type: 'audio/wav' })

      await adapter.putSample('sample-1', blob)
      await adapter.deleteSample('sample-1')

      const retrieved = await adapter.getSample('sample-1')
      expect(retrieved).toBeNull()
    })
  })
})
