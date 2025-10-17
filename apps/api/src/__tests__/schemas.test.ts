// Schema validation tests for updated bar range (0-63)
import { describe, it, expect } from 'vitest'
import { IconStepSchema, LoopSchema, ChordCellSchema } from '@music/types/schemas'

describe('IconStepSchema - Bar Range Validation', () => {
  const baseIconStep = {
    bar: 0,
    row: 0,
    soundId: 'synth-lead',
    velocity: 0.8,
    pitch: 60,
  }

  describe('Valid bar values (0-63)', () => {
    it('should accept bar value at minimum boundary (0)', () => {
      const result = IconStepSchema.parse({ ...baseIconStep, bar: 0 })
      expect(result.bar).toBe(0)
    })

    it('should accept bar value at maximum boundary (63)', () => {
      const result = IconStepSchema.parse({ ...baseIconStep, bar: 63 })
      expect(result.bar).toBe(63)
    })

    it('should accept bar values in quarter note positions (0, 4, 8, 12...)', () => {
      const quarterNotePositions = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]

      quarterNotePositions.forEach(bar => {
        const result = IconStepSchema.parse({ ...baseIconStep, bar })
        expect(result.bar).toBe(bar)
      })
    })

    it('should accept bar values in eighth note positions (even numbers)', () => {
      const eighthNotePositions = [0, 2, 4, 6, 8, 10, 12, 14, 16]

      eighthNotePositions.forEach(bar => {
        const result = IconStepSchema.parse({ ...baseIconStep, bar })
        expect(result.bar).toBe(bar)
      })
    })

    it('should accept bar values in sixteenth note positions (all 0-63)', () => {
      // Test every sixteenth note position
      for (let bar = 0; bar <= 63; bar++) {
        const result = IconStepSchema.parse({ ...baseIconStep, bar })
        expect(result.bar).toBe(bar)
      }
    })
  })

  describe('Invalid bar values', () => {
    it('should reject bar value below minimum (negative)', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, bar: -1 }))
        .toThrow()
    })

    it('should reject bar value above maximum (64)', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, bar: 64 }))
        .toThrow()
    })

    it('should reject bar value above maximum (100)', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, bar: 100 }))
        .toThrow()
    })

    it('should reject non-integer bar values', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, bar: 32.5 }))
        .toThrow()
    })

    it('should reject missing bar field', () => {
      const { bar, ...withoutBar } = baseIconStep
      expect(() => IconStepSchema.parse(withoutBar))
        .toThrow()
    })
  })

  describe('Row validation (unchanged)', () => {
    it('should accept row values 0-3', () => {
      [0, 1, 2, 3].forEach(row => {
        const result = IconStepSchema.parse({ ...baseIconStep, row })
        expect(result.row).toBe(row)
      })
    })

    it('should reject row value above maximum (4)', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, row: 4 }))
        .toThrow()
    })
  })

  describe('Pitch validation', () => {
    it('should accept MIDI pitch values 0-127', () => {
      const testPitches = [0, 48, 60, 83, 127]

      testPitches.forEach(pitch => {
        const result = IconStepSchema.parse({ ...baseIconStep, pitch })
        expect(result.pitch).toBe(pitch)
      })
    })

    it('should reject pitch above MIDI range (128)', () => {
      expect(() => IconStepSchema.parse({ ...baseIconStep, pitch: 128 }))
        .toThrow()
    })
  })
})

describe('LoopSchema - Complete Loop Validation', () => {
  const baseLoop = {
    id: 'test-loop-id',
    name: 'Test Loop',
    bars: 4,
    color: '#FFD11A',
    bpm: 120,
    chordProgression: [
      { bar: 0, chord: 'I' },
      { bar: 1, chord: 'V' },
    ],
    iconSequence: [
      { bar: 0, row: 0, soundId: 'synth-lead', velocity: 0.8, pitch: 60 },
      { bar: 32, row: 1, soundId: 'bass', velocity: 0.7, pitch: 48 },
    ],
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
  }

  it('should validate complete loop with 0-63 bar range', () => {
    const result = LoopSchema.parse(baseLoop)
    expect(result.iconSequence[0].bar).toBe(0)
    expect(result.iconSequence[1].bar).toBe(32)
  })

  it('should validate loop with iconSequence at boundary positions', () => {
    const loopWithBoundaries = {
      ...baseLoop,
      iconSequence: [
        { bar: 0, row: 0, soundId: 'synth-lead', velocity: 0.8, pitch: 60 },
        { bar: 63, row: 1, soundId: 'bass', velocity: 0.7, pitch: 48 },
      ],
    }

    const result = LoopSchema.parse(loopWithBoundaries)
    expect(result.iconSequence[0].bar).toBe(0)
    expect(result.iconSequence[1].bar).toBe(63)
  })

  it('should reject loop with iconSequence bar > 63', () => {
    const invalidLoop = {
      ...baseLoop,
      iconSequence: [
        { bar: 64, row: 0, soundId: 'synth-lead', velocity: 0.8, pitch: 60 },
      ],
    }

    expect(() => LoopSchema.parse(invalidLoop))
      .toThrow()
  })

  it('should reject loop with iconSequence bar < 0', () => {
    const invalidLoop = {
      ...baseLoop,
      iconSequence: [
        { bar: -1, row: 0, soundId: 'synth-lead', velocity: 0.8, pitch: 60 },
      ],
    }

    expect(() => LoopSchema.parse(invalidLoop))
      .toThrow()
  })
})

describe('ChordCellSchema - Bar Range Validation', () => {
  it('should accept bar values 0-15 for chord progression', () => {
    for (let bar = 0; bar <= 15; bar++) {
      const result = ChordCellSchema.parse({ bar, chord: 'I' })
      expect(result.bar).toBe(bar)
    }
  })

  it('should reject bar value > 15 for chord progression', () => {
    expect(() => ChordCellSchema.parse({ bar: 16, chord: 'I' }))
      .toThrow()
  })
})
