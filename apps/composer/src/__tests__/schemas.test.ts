// Test-first approach: Define expected behavior before implementation
import { describe, it, expect } from 'vitest'
import { LoopSchema, SongSchema, parseLoop, parseSong } from '../types'

describe('LoopSchema', () => {
  it('parses valid minimal loop', () => {
    const input = {
      id: 'loop-1',
      name: 'Test Loop',
      bars: 4,
      chordProgression: [],
      iconSequence: [],
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = LoopSchema.parse(input)
    expect(result).toEqual({
      ...input,
      color: '#FFD11A', // default
      bpm: 120 // default
    })
  })

  it('parses valid loop with all fields', () => {
    const input = {
      id: 'loop-2',
      name: 'Complex Loop',
      bars: 8,
      color: '#FF62C6',
      chordProgression: [
        { bar: 0, chord: 'Cmaj7' },
        { bar: 4, chord: 'G7' }
      ],
      iconSequence: [
        { bar: 0, row: 0, soundId: 'synth-lead', velocity: 0.8 },
        { bar: 4, row: 1, soundId: 'drum-kick' }
      ],
      bpm: 140,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = LoopSchema.parse(input)

    // Schema adds default velocity (0.8) to icon steps without it
    expect(result).toEqual({
      ...input,
      iconSequence: [
        { bar: 0, row: 0, soundId: 'synth-lead', velocity: 0.8 },
        { bar: 4, row: 1, soundId: 'drum-kick', velocity: 0.8 }
      ]
    })
  })

  it('rejects loop with missing required fields', () => {
    const input = {
      id: 'loop-3',
      name: 'Incomplete',
      // missing bars, chordProgression, etc
    }

    expect(() => LoopSchema.parse(input)).toThrow()
  })

  it('rejects loop with invalid bar count', () => {
    const input = {
      id: 'loop-4',
      name: 'Bad Bars',
      bars: 3, // not 1, 2, 4, or 8
      chordProgression: [],
      iconSequence: [],
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    expect(() => LoopSchema.parse(input)).toThrow()
  })

  it('rejects loop with invalid timestamp', () => {
    const input = {
      id: 'loop-5',
      name: 'Bad Time',
      bars: 4,
      chordProgression: [],
      iconSequence: [],
      schemaVersion: 1,
      updatedAt: 'not-a-date'
    }

    expect(() => LoopSchema.parse(input)).toThrow()
  })
})

describe('SongSchema', () => {
  it('parses valid minimal song', () => {
    const input = {
      id: 'song-1',
      name: 'Test Song',
      bpm: 120,
      timeSignature: '4/4',
      timeline: [],
      totalBars: 0,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = SongSchema.parse(input)
    expect(result).toEqual(input)
  })

  it('parses valid song with timeline', () => {
    const input = {
      id: 'song-2',
      name: 'Full Song',
      bpm: 140,
      timeSignature: '3/4',
      timeline: [
        { id: 'block-1', loopId: 'loop-1', startBar: 0, bars: 4, color: '#FFD11A' },
        { id: 'block-2', loopId: 'loop-2', startBar: 4, bars: 8 }
      ],
      totalBars: 12,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = SongSchema.parse(input)
    expect(result).toEqual(input)
  })
})

describe('parseLoop helper', () => {
  it('returns parsed loop on success', () => {
    const input = {
      id: 'loop-6',
      name: 'Helper Test',
      bars: 4,
      chordProgression: [],
      iconSequence: [],
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = parseLoop(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('loop-6')
    }
  })

  it('returns error on invalid input', () => {
    const input = { invalid: 'data' }

    const result = parseLoop(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})

describe('parseSong helper', () => {
  it('returns parsed song on success', () => {
    const input = {
      id: 'song-3',
      name: 'Helper Test',
      bpm: 120,
      timeSignature: '4/4',
      timeline: [],
      totalBars: 0,
      schemaVersion: 1,
      updatedAt: '2025-10-16T00:00:00.000Z'
    }

    const result = parseSong(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('song-3')
    }
  })

  it('returns error on invalid input', () => {
    const input = { invalid: 'data' }

    const result = parseSong(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})
