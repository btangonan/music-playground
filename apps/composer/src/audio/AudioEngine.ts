// Audio engine - Tone.js wrapper for Music Playground
// Provides simplified API for scheduling icon sound playback

import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { ICON_SOUNDS, type IconSound } from './iconSounds'

type Instrument = Tone.Synth | Tone.PolySynth | Tone.MonoSynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.FMSynth | Tone.AMSynth | Tone.Sampler

// MIDI parsing types
export interface ParsedMidiNote {
  timeSec: number
  durationSec: number
  midi: number
  velocity: number
  channel?: number  // NEW: MIDI channel (0-15, channel 9 = GM drums)
  program?: number  // NEW: GM program number (0-127) if known
}

export interface ParsedMidiClip {
  name: string
  bpm: number
  timeSignature?: string  // NEW: Time signature like "4/4", "3/4", "6/8"
  notes: ParsedMidiNote[]
}

export class AudioEngine {
  private instruments: Map<string, Instrument>
  private initialized: boolean

  // Master bus components for normalization and dynamics control
  private masterChannel!: Tone.Channel
  private compressor!: Tone.Compressor
  private limiter!: Tone.Limiter
  private hpf!: Tone.Filter | null // optional safety HPF

  constructor() {
    this.instruments = new Map()
    this.initialized = false
  }

  /**
   * Initialize audio context and create instruments
   * Must be called from user gesture (click/tap)
   * Preloads all Sampler instruments to avoid first-use delay
   */
  async start(): Promise<void> {
    if (this.initialized) return

    await Tone.start()
    await this.ensureContextRunning()  // Ensure context is running after Tone.start()

    // Create master bus chain with corrected signal flow
    // Signal flow: Instrument → HPF → Compressor → Limiter → Master Channel → Destination
    this.masterChannel = new Tone.Channel(-6).toDestination()

    // Optional: gentle HPF at 32 Hz to stabilize compressor against sub-bass energy
    this.hpf = new Tone.Filter({ type: 'highpass', frequency: 32, Q: 0.5 })

    // Compressor: glue the mix and control dynamics
    // Settings adjusted per audio engineering audit
    this.compressor = new Tone.Compressor({
      threshold: -20,    // Engage when signals moderately loud
      ratio: 3,          // 3:1 compression (moderate, musical)
      attack: 0.008,     // 8 ms - fast enough for drums, preserves transients
      release: 0.16,     // 160 ms - smooth musical recovery
      knee: 20           // Soft knee for gradual compression curve
    })

    // Limiter: brick-wall protection at -1.5 dB to prevent intersample peaks
    this.limiter = new Tone.Limiter(-1.5)

    // Wire master bus chain in correct order
    if (this.hpf) this.hpf.connect(this.compressor)
    this.compressor.connect(this.limiter)
    this.limiter.connect(this.masterChannel)

    // Create all instruments and route through master bus
    for (const sound of Object.values(ICON_SOUNDS)) {
      const instrument = this.createInstrument(sound)
      // Connect to HPF if present, otherwise directly to compressor
      instrument.connect(this.hpf ?? this.compressor)
      this.instruments.set(sound.id, instrument)
    }

    // Wait for all audio buffers to load (includes Sampler samples)
    // This ensures piano samples are ready before first playback
    await Tone.loaded()

    Tone.Transport.start()
    this.initialized = true
  }

  stop(): void {
    Tone.Transport.stop()
  }

  setBPM(bpm: number): void {
    Tone.Transport.bpm.value = bpm
  }

  /**
   * Ensure audio context is running (not suspended)
   * Mobile browsers require explicit user gesture to resume audio context
   * Call this before any playback operation
   */
  async ensureContextRunning(): Promise<void> {
    if (Tone.context.state !== 'running') {
      console.log('[AudioEngine] Resuming audio context, current state:', Tone.context.state)
      try {
        await Tone.context.resume()
        console.log('[AudioEngine] Context resumed, new state:', Tone.context.state)
      } catch (err) {
        console.error('[AudioEngine] Failed to resume context:', err)
        throw new Error('Audio playback blocked. Please try again.')
      }
    }
  }

  /**
   * Stop all currently playing notes immediately
   * Calls releaseAll() on PolySynth instruments to silence active notes
   */
  stopAllNotes(): void {
    for (const instrument of this.instruments.values()) {
      // PolySynth instances have releaseAll() method
      if ('releaseAll' in instrument && typeof instrument.releaseAll === 'function') {
        instrument.releaseAll()
      }
    }
  }

  /**
   * Schedule a note to play at specific time
   * @param soundId - Icon sound ID (e.g., 'synth-lead')
   * @param note - Note to play (e.g., 'C4', 'A3')
   * @param time - Time in seconds (or '+0.5' for relative)
   * @param velocity - Volume 0-1
   * @param durationSeconds - Optional duration in seconds (defaults to short blip)
   */
  scheduleNote(soundId: string, note: string, time: number | string, velocity: number, durationSeconds?: number): boolean {
    const instrument = this.instruments.get(soundId)
    if (!instrument) {
      console.warn(`Invalid sound ID: ${soundId}`)
      return false
    }

    // Check if this is a one-shot sound (has its own envelope with sustain=0)
    const soundConfig = ICON_SOUNDS[soundId]
    const isOneShot = soundConfig?.oneShot === true

    // For one-shot sounds, use very short duration to let envelope control the sound
    // For sustained sounds, use the provided duration or default
    const dur = isOneShot
      ? 0.01
      : (typeof durationSeconds === 'number' && isFinite(durationSeconds) ? Math.max(0.01, durationSeconds) : 0.15)

    // DEBUG: Log note scheduling for pitch accuracy verification
    if (globalThis.LL_DEBUG_PITCH) {
      console.log(`[PITCH DEBUG] ${soundId}: ${note}, dur=${dur.toFixed(3)}s, vel=${velocity.toFixed(2)}`)
    }

    try {
      if (instrument instanceof Tone.NoiseSynth) {
        instrument.triggerAttackRelease(dur, time, velocity)
      } else {
        instrument.triggerAttackRelease(note, dur, time, velocity)
      }
      return true
    } catch (err) {
      console.error(`Failed to schedule note for ${soundId}:`, err)
      return false
    }
  }

  /**
   * Parse MIDI file into normalized clip format
   * @param arrayBuffer - MIDI file data
   * @param name - Optional name for the clip (defaults to 'Imported MIDI')
   * @returns Parsed MIDI clip with notes and BPM
   */
  async parseMIDI(arrayBuffer: ArrayBuffer, name: string = 'Imported MIDI'): Promise<ParsedMidiClip> {
    const midi = new Midi(arrayBuffer)

    // Get BPM from first tempo change, or default to 120
    const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120

    // Get time signature from first time signature event, or default to 4/4
    let timeSignature = '4/4'
    if (midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
      const ts = midi.header.timeSignatures[0]
      if (ts.timeSignature && Array.isArray(ts.timeSignature) && ts.timeSignature.length === 2) {
        const [numerator, denominator] = ts.timeSignature
        timeSignature = `${numerator}/${denominator}`
      }
    }

    // Flatten all tracks into single note array
    const notes: ParsedMidiNote[] = []

    // DEBUG: Track duration distribution
    const durations: number[] = []

    for (const track of midi.tracks) {
      // Extract channel and program from track (for GM instrument mapping)
      const channel = typeof track.channel === 'number' ? track.channel : undefined
      const program = typeof track.instrument?.number === 'number' ? track.instrument.number : undefined

      for (const note of track.notes) {
        durations.push(note.duration)
        notes.push({
          timeSec: note.time,
          durationSec: note.duration,
          midi: note.midi,
          velocity: note.velocity,
          channel,
          program
        })
      }
    }

    // DEBUG: Log duration stats
    console.log('[MIDI PARSE] Total notes:', notes.length)
    console.log('[MIDI PARSE] BPM:', bpm)
    console.log('[MIDI PARSE] Time signature:', timeSignature)
    console.log('[MIDI PARSE] Duration range:', Math.min(...durations).toFixed(3), '-', Math.max(...durations).toFixed(3), 'seconds')
    const longNotes = durations.filter(d => d > 0.5).length
    console.log('[MIDI PARSE] Notes >0.5s (truly sustained):', longNotes)

    return {
      name,
      bpm,
      timeSignature,
      notes
    }
  }

  dispose(): void {
    Tone.Transport.clear(0)

    // Disconnect and dispose instruments first
    for (const instrument of this.instruments.values()) {
      try { instrument.disconnect() } catch {}
      instrument.dispose()
    }
    this.instruments.clear()

    // Dispose master bus nodes in reverse order of signal flow
    try { this.limiter?.disconnect() } catch {}
    try { this.compressor?.disconnect() } catch {}
    try { this.hpf?.disconnect() } catch {}
    try { this.masterChannel?.disconnect() } catch {}

    this.limiter?.dispose()
    this.compressor?.dispose()
    this.hpf?.dispose()
    this.masterChannel?.dispose()

    this.initialized = false
  }

  private createInstrument(sound: IconSound): Instrument {
    const { synthType, options } = sound.toneConfig

    let instrument: Instrument

    switch (synthType) {
      case 'PolySynth':
        // Already polyphonic - options are for the voice synths (default: Synth)
        instrument = new Tone.PolySynth(Tone.Synth, options)
        break
      case 'NoiseSynth':
        // NoiseSynth doesn't take notes, can't be wrapped in PolySynth
        instrument = new Tone.NoiseSynth(options)
        break
      case 'MembraneSynth':
        // MembraneSynth doesn't extend Monophonic, can't be wrapped
        instrument = new Tone.MembraneSynth(options)
        break
      case 'MetalSynth':
        // MetalSynth doesn't extend Monophonic, can't be wrapped
        instrument = new Tone.MetalSynth(options)
        break
      case 'Synth':
        // Wrap in PolySynth for polyphony (enables chords)
        instrument = new Tone.PolySynth(Tone.Synth, options)
        break
      case 'MonoSynth':
        // Wrap in PolySynth for polyphony
        instrument = new Tone.PolySynth(Tone.MonoSynth, options)
        break
      case 'FMSynth':
        // Wrap in PolySynth for polyphony
        instrument = new Tone.PolySynth(Tone.FMSynth, options)
        break
      case 'AMSynth':
        // Wrap in PolySynth for polyphony
        instrument = new Tone.PolySynth(Tone.AMSynth, options)
        break
      case 'PluckSynth':
        // PluckSynth - keep monophonic (cannot be wrapped - doesn't extend Monophonic)
        // @ts-expect-error PluckSynth exists but may not be in types
        instrument = new Tone.PluckSynth(options)
        break
      case 'Sampler':
        // Sampler - for sample-based instruments (e.g., grand piano)
        // Already polyphonic by default, loads audio samples from URLs
        instrument = new Tone.Sampler(options)
        break
      default:
        instrument = new Tone.PolySynth(Tone.Synth)
    }

    // Apply volume if specified (in decibels)
    if (typeof sound.volume === 'number') {
      instrument.volume.value = sound.volume
    }

    // Instruments now connect to master bus in start() method, not directly to destination
    return instrument
  }
}
