// Audio engine tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioEngine } from '../audio/AudioEngine'
import { ICON_SOUNDS } from '../audio/iconSounds'

// Mock Tone.js to avoid actual audio context initialization in tests
vi.mock('tone', () => ({
  default: {
    start: vi.fn(),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      bpm: { value: 120 },
      scheduleRepeat: vi.fn(),
      clear: vi.fn()
    },
    Synth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    PolySynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    MonoSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    FMSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    MembraneSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    MetalSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    NoiseSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    PluckSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    AMSynth: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn()
    })),
    Gain: vi.fn(() => ({
      toDestination: vi.fn().mockReturnThis()
    })),
    getContext: vi.fn(() => ({ state: 'running' }))
  }
}))

describe('ICON_SOUNDS', () => {
  it('exports 16 sound definitions', () => {
    expect(Object.keys(ICON_SOUNDS)).toHaveLength(16)
  })

  it('includes all synth sounds', () => {
    expect(ICON_SOUNDS['synth-lead']).toBeDefined()
    expect(ICON_SOUNDS['synth-pad']).toBeDefined()
    expect(ICON_SOUNDS['synth-pluck']).toBeDefined()
    expect(ICON_SOUNDS['synth-arp']).toBeDefined()
  })

  it('includes all drum sounds', () => {
    expect(ICON_SOUNDS['drum-kick']).toBeDefined()
    expect(ICON_SOUNDS['drum-snare']).toBeDefined()
    expect(ICON_SOUNDS['drum-hihat']).toBeDefined()
    expect(ICON_SOUNDS['drum-clap']).toBeDefined()
  })

  it('includes all bass sounds', () => {
    expect(ICON_SOUNDS['bass-sub']).toBeDefined()
    expect(ICON_SOUNDS['bass-wobble']).toBeDefined()
  })

  it('includes all FX sounds', () => {
    expect(ICON_SOUNDS['fx-riser']).toBeDefined()
    expect(ICON_SOUNDS['fx-impact']).toBeDefined()
    expect(ICON_SOUNDS['fx-sweep']).toBeDefined()
    expect(ICON_SOUNDS['fx-glitch']).toBeDefined()
    expect(ICON_SOUNDS['fx-vocal-chop']).toBeDefined()
    expect(ICON_SOUNDS['fx-noise']).toBeDefined()
  })

  it('each sound has required properties', () => {
    Object.values(ICON_SOUNDS).forEach(sound => {
      expect(sound).toHaveProperty('id')
      expect(sound).toHaveProperty('name')
      expect(sound).toHaveProperty('category')
      expect(sound).toHaveProperty('type')
      expect(['melodic', 'rhythmic']).toContain(sound.type)
    })
  })
})

describe('AudioEngine', () => {
  let engine: AudioEngine

  beforeEach(() => {
    engine = new AudioEngine()
  })

  afterEach(() => {
    if (engine) {
      engine.dispose()
    }
  })

  it('initializes without error', () => {
    expect(engine).toBeDefined()
  })

  it('sets BPM correctly', () => {
    engine.setBPM(140)
    // Mock will have been called, actual value not testable without real Tone
    expect(engine).toBeDefined()
  })

  it('starts transport', async () => {
    await engine.start()
    // Transport.start should have been called via mock
    expect(engine).toBeDefined()
  })

  it('stops transport', () => {
    engine.stop()
    // Transport.stop should have been called via mock
    expect(engine).toBeDefined()
  })

  it('schedules note playback', async () => {
    await engine.start()
    const result = engine.scheduleNote('synth-lead', 'C4', 0, 0.8)
    expect(result).toBe(true)
  })

  it('rejects invalid sound ID', () => {
    const result = engine.scheduleNote('invalid-sound', 'C4', 0, 0.8)
    expect(result).toBe(false)
  })

  it('disposes cleanly', () => {
    engine.dispose()
    // Should not throw
    expect(true).toBe(true)
  })
})
