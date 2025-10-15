/**
 * MIDI Playback Engine for Loop Lab
 *
 * Converts MIDI data from basic-pitch output into Tone.js Parts
 * that can be played through Loop Lab's instrument chains.
 *
 * Architecture:
 * - MIDI JSON (from backend) → Tone.Part events → Instrument triggers
 * - Integrates with existing adaptive shimmer (prevents high-freq dissonance)
 * - Uses Transport for multi-track synchronization
 */

import * as Tone from 'tone';
import { adaptiveShimmerForFreq } from './pitch-shift-rules';
import { applyEffectParams } from './effect-param-mapper';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Single MIDI note from basic-pitch conversion
 */
export interface MIDINote {
  /** MIDI pitch number (0-127, where 60 = C4) */
  pitch: number;

  /** Note start time in seconds */
  start_time: number;

  /** Note end time in seconds */
  end_time: number;

  /** MIDI velocity (0-127) */
  velocity: number;

  /** basic-pitch confidence score (0-1) */
  confidence: number;
}

/**
 * MIDI track representing one instrument/stem
 */
export interface MIDITrack {
  /** Unique track identifier */
  track_id: number;

  /** Instrument classification from basic-pitch */
  instrument: 'vocals' | 'drums' | 'bass' | 'other';

  /** Array of MIDI notes in this track */
  notes: MIDINote[];
}

/**
 * Complete MIDI data structure from backend
 */
export interface MIDIData {
  /** All MIDI tracks */
  tracks: MIDITrack[];

  /** Total song duration in seconds */
  duration: number;

  /** Estimated tempo in BPM */
  tempo: number;

  /** Time signature (e.g., "4/4") */
  time_signature: string;
}

/**
 * Instrument interface for playback
 * Matches the structure in audio-engine.ts
 */
export interface PlayableInstrument {
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate';
  play: (note: string, duration?: string, time?: number) => void;
  effects: Array<{
    type: string;
    config: any;
  }>;
}

/**
 * Playback controller returned by createMIDIPlayback
 */
export interface MIDIPlayback {
  /** All Tone.Part instances for each track */
  parts: Tone.Part[];

  /** Total duration in seconds */
  duration: number;

  /** Start playback from current Transport position */
  start: () => void;

  /** Stop playback and reset Transport */
  stop: () => void;

  /** Pause playback without resetting position */
  pause: () => void;

  /** Seek to specific time in seconds */
  seek: (seconds: number) => void;

  /** Clean up all Parts and resources */
  dispose: () => void;
}

// ============================================================================
// Core Conversion Functions
// ============================================================================

/**
 * Convert MIDI pitch number to Tone.js note string
 *
 * @example
 * midiToNote(60) // Returns "C4"
 * midiToNote(69) // Returns "A4"
 * midiToNote(21) // Returns "A0"
 */
export function midiToNote(midiNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = noteNames[midiNumber % 12];
  return `${noteName}${octave}`;
}

/**
 * Convert MIDI notes array to Tone.Part with adaptive shimmer integration
 *
 * This function:
 * 1. Filters notes by confidence threshold
 * 2. Converts MIDI pitches to note strings
 * 3. Applies adaptive shimmer to prevent high-frequency dissonance
 * 4. Creates Tone.Part that triggers the instrument
 *
 * @param notes - Array of MIDI notes from basic-pitch
 * @param instrument - Loop Lab instrument to play through
 * @param confidenceThreshold - Minimum confidence to include note (0-1)
 * @returns Tone.Part ready to be started with Transport
 */
export function midiNotesToTonePart(
  notes: MIDINote[],
  instrument: PlayableInstrument,
  confidenceThreshold: number = 0.5
): Tone.Part {
  // Filter low-confidence notes
  const filteredNotes = notes.filter(note => note.confidence >= confidenceThreshold);

  // Convert MIDI notes to Tone.Part events
  const events = filteredNotes.map(note => ({
    time: note.start_time,
    pitch: midiToNote(note.pitch),
    duration: note.end_time - note.start_time,
    velocity: note.velocity / 127, // Normalize to 0-1
    midiPitch: note.pitch // Keep for adaptive shimmer
  }));

  // Create Tone.Part with callback
  const part = new Tone.Part((time, event: any) => {
    // Apply adaptive shimmer BEFORE triggering note (same pattern as Index.tsx:276-295)
    if (instrument.kind !== 'drums') {
      const freqHz = Tone.Frequency(event.pitch).toFrequency();
      const { semitones, wetScale } = adaptiveShimmerForFreq(freqHz);

      // Apply to all shimmer effects in instrument's chain
      for (const fx of instrument.effects) {
        if (fx.type === 'shimmer') {
          // Use immediate Signal.value assignment for pitch (not ramp)
          applyEffectParams(fx.config, { pitchShift: semitones });

          if (wetScale !== undefined) {
            applyEffectParams(fx.config, { wet: wetScale });
          }
        }
      }
    }

    // Trigger note with velocity-scaled duration
    const duration = Tone.Time(event.duration).toNotation();

    if (instrument.kind === 'drums') {
      // For drums, use drum sample based on pitch range
      const drumSound = event.midiPitch < 50 ? 'kick' :
                        event.midiPitch < 70 ? 'snare' : 'hihat';
      instrument.play(drumSound, undefined, time);
    } else {
      // For melodic instruments, use pitch and duration
      instrument.play(event.pitch, duration, time);
    }
  }, events);

  // Do NOT loop - this is one-shot song playback
  part.loop = false;

  return part;
}

/**
 * Create multi-track MIDI playback system
 *
 * Orchestrates multiple Tone.Parts for simultaneous multi-track playback.
 * All tracks are synchronized via Tone.Transport.
 *
 * @param midiData - Complete MIDI data from backend
 * @param trackInstrumentMap - Map of track_id → instrument
 * @param confidenceThreshold - Minimum confidence for notes (default: 0.5)
 * @returns Playback controller with start/stop/seek methods
 */
export function createMIDIPlayback(
  midiData: MIDIData,
  trackInstrumentMap: Map<number, PlayableInstrument>,
  confidenceThreshold: number = 0.5
): MIDIPlayback {
  const parts: Tone.Part[] = [];

  // Create a Part for each MIDI track assigned to an instrument
  for (const track of midiData.tracks) {
    const instrument = trackInstrumentMap.get(track.track_id);
    if (!instrument) {
      console.warn(`Track ${track.track_id} (${track.instrument}) not mapped to instrument, skipping`);
      continue;
    }

    const part = midiNotesToTonePart(track.notes, instrument, confidenceThreshold);
    parts.push(part);
  }

  console.log(`Created ${parts.length} Tone.Parts for ${midiData.tracks.length} tracks`);

  return {
    parts,
    duration: midiData.duration,

    start: () => {
      // Start all parts at Transport time 0
      parts.forEach(part => part.start(0));
      Tone.Transport.start();
      console.log('[MIDI Playback] Started');
    },

    stop: () => {
      Tone.Transport.stop();
      Tone.Transport.position = 0; // Reset to beginning
      console.log('[MIDI Playback] Stopped and reset');
    },

    pause: () => {
      Tone.Transport.pause();
      console.log('[MIDI Playback] Paused at', Tone.Transport.seconds);
    },

    seek: (seconds: number) => {
      const wasPlaying = Tone.Transport.state === 'started';
      Tone.Transport.pause();
      Tone.Transport.seconds = seconds;
      if (wasPlaying) {
        Tone.Transport.start();
      }
      console.log('[MIDI Playback] Seeked to', seconds, 'seconds');
    },

    dispose: () => {
      // Stop playback first
      Tone.Transport.stop();

      // Dispose all Parts
      parts.forEach(part => part.dispose());
      parts.length = 0; // Clear array

      console.log('[MIDI Playback] Disposed all Parts');
    }
  };
}

/**
 * Analyze MIDI data for playback information
 * Useful for UI display and validation
 */
export function analyzeMIDI(midiData: MIDIData) {
  const totalNotes = midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0);

  // Find max concurrent notes (polyphony check)
  const maxPolyphony = calculateMaxPolyphony(midiData);

  return {
    trackCount: midiData.tracks.length,
    totalNotes,
    duration: midiData.duration,
    tempo: midiData.tempo,
    maxPolyphony,
    hasHighPolyphony: maxPolyphony > 32 // Loop Lab's polyphony limit
  };
}

/**
 * Calculate maximum concurrent notes across all tracks
 * Used to warn about polyphony limits
 */
function calculateMaxPolyphony(midiData: MIDIData): number {
  // Create time-sliced map of active notes
  const timeSlices = new Map<number, number>();

  for (const track of midiData.tracks) {
    for (const note of track.notes) {
      const startTime = Math.floor(note.start_time * 10); // 100ms resolution
      const endTime = Math.floor(note.end_time * 10);

      for (let t = startTime; t <= endTime; t++) {
        timeSlices.set(t, (timeSlices.get(t) || 0) + 1);
      }
    }
  }

  return Math.max(...timeSlices.values());
}
