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
}

export interface ParsedMidiClip {
  name: string
  bpm: number
  notes: ParsedMidiNote[]
}

export class AudioEngine {
  private instruments: Map<string, Instrument>
  private initialized: boolean

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

    // Create all instruments
    for (const sound of Object.values(ICON_SOUNDS)) {
      const instrument = this.createInstrument(sound)
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

    // Flatten all tracks into single note array
    const notes: ParsedMidiNote[] = []

    for (const track of midi.tracks) {
      for (const note of track.notes) {
        notes.push({
          timeSec: note.time,
          durationSec: note.duration,
          midi: note.midi,
          velocity: note.velocity
        })
      }
    }

    return {
      name,
      bpm,
      notes
    }
  }

  dispose(): void {
    Tone.Transport.clear(0)
    for (const instrument of this.instruments.values()) {
      instrument.dispose()
    }
    this.instruments.clear()
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

    instrument.toDestination()
    return instrument
  }
}
