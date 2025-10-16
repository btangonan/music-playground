// Audio engine - Tone.js wrapper for Music Playground
// Provides simplified API for scheduling icon sound playback

import * as Tone from 'tone'
import { ICON_SOUNDS, type IconSound } from './iconSounds'

type Instrument = Tone.Synth | Tone.PolySynth | Tone.MonoSynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth

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
   */
  async start(): Promise<void> {
    if (this.initialized) return

    // Start Tone.js audio context
    await Tone.start()

    // Create instruments for each icon sound
    for (const sound of Object.values(ICON_SOUNDS)) {
      const instrument = this.createInstrument(sound)
      this.instruments.set(sound.id, instrument)
    }

    // Start transport
    Tone.Transport.start()
    this.initialized = true
  }

  /**
   * Stop transport
   */
  stop(): void {
    Tone.Transport.stop()
  }

  /**
   * Set BPM (tempo)
   */
  setBPM(bpm: number): void {
    Tone.Transport.bpm.value = bpm
  }

  /**
   * Schedule a note to play at specific time
   * @param soundId - Icon sound ID (e.g., 'synth-lead')
   * @param note - Note to play (e.g., 'C4', 'A3')
   * @param time - Time in seconds (or '+0.5' for relative)
   * @param velocity - Volume 0-1
   * @returns true if scheduled, false if soundId invalid
   */
  scheduleNote(soundId: string, note: string, time: number | string, velocity: number): boolean {
    const instrument = this.instruments.get(soundId)
    if (!instrument) {
      console.warn(`Invalid sound ID: ${soundId}`)
      return false
    }

    try {
      // Trigger note with velocity
      instrument.triggerAttackRelease(note, '8n', time, velocity)
      return true
    } catch (err) {
      console.error(`Failed to schedule note for ${soundId}:`, err)
      return false
    }
  }

  /**
   * Dispose all instruments and clean up
   */
  dispose(): void {
    // Clear scheduled events
    Tone.Transport.clear(0)

    // Dispose all instruments
    for (const instrument of this.instruments.values()) {
      instrument.dispose()
    }

    this.instruments.clear()
    this.initialized = false
  }

  /**
   * Create Tone.js instrument from icon sound config
   */
  private createInstrument(sound: IconSound): Instrument {
    const { synthType, options } = sound.toneConfig

    let instrument: Instrument

    switch (synthType) {
      case 'Synth':
        instrument = new Tone.Synth(options)
        break
      case 'PolySynth':
        instrument = new Tone.PolySynth(options)
        break
      case 'MonoSynth':
        instrument = new Tone.MonoSynth(options)
        break
      case 'MembraneSynth':
        instrument = new Tone.MembraneSynth(options)
        break
      case 'NoiseSynth':
        instrument = new Tone.NoiseSynth(options)
        break
      case 'MetalSynth':
        instrument = new Tone.MetalSynth(options)
        break
      case 'FMSynth':
        instrument = new Tone.FMSynth(options)
        break
      case 'AMSynth':
        instrument = new Tone.AMSynth(options)
        break
      case 'PluckSynth':
        // @ts-expect-error PluckSynth exists but may not be in types
        instrument = new Tone.PluckSynth(options)
        break
      default:
        // Fallback to basic synth
        instrument = new Tone.Synth()
    }

    // Route to destination
    instrument.toDestination()

    return instrument
  }
}
