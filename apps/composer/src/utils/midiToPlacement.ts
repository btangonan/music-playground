// MIDI to Sequencer Placement Converter
// Converts parsed MIDI clips to icon placements on 4-bar grid

import type { ParsedMidiClip, ParsedMidiNote } from '../audio/AudioEngine'
import type { Placement } from '../types/placement'

/**
 * Convert MIDI time (seconds) to sixteenth note index (0-63)
 * Formula: beats = timeSec * (bpm / 60); sixteenths = beats * 4
 * Returns -1 if note is beyond 4-bar grid
 */
function toSixteenthIndex(timeSec: number, bpm: number): number {
  const beats = timeSec * (bpm / 60)
  const sixteenths = Math.round(beats * 4)
  if (sixteenths < 0 || sixteenths > 63) {
    return -1
  }
  return sixteenths
}

/**
 * Convert MIDI duration (seconds) to length in sixteenths (>=1)
 */
function toSixteenthLength(durationSec: number, bpm: number): number {
  const beats = durationSec * (bpm / 60)
  const sixteenths = Math.round(beats * 4)
  return Math.max(1, sixteenths)
}

/**
 * Map GM drum notes (MIDI channel 9) to drum soundIds
 * Follows General MIDI percussion map
 */
function mapGmDrumToSoundId(midiNote: number): string {
  // Core GM drum map
  if (midiNote === 35 || midiNote === 36) return 'kick'        // Acoustic/Bass Kick
  if (midiNote === 38 || midiNote === 40) return 'snare'       // Acoustic/Electric Snare
  if (midiNote === 39) return 'clap'                           // Hand Clap
  if (midiNote === 42 || midiNote === 44 || midiNote === 46) return 'hihat'  // Closed/Pedal/Open HH

  // Fallback routing for less common drums
  if (midiNote >= 41 && midiNote <= 45) return 'snare' // Low/Mid/High Tom → snare bucket
  if (midiNote >= 47 && midiNote <= 50) return 'snare' // Mid/High Tom → snare bucket
  return 'hihat' // Ride/Crash/Other percussion → hihat bucket
}

/**
 * Map GM program number (0-127) to soundId based on user sound classifications
 * Uses actual listening notes to intelligently route instruments to our 16 sounds
 *
 * Key mappings based on user feedback:
 * - Piano (0-2) → pad (our grand piano Sampler)
 * - Bells/Chromatic (8-15) → pluck (clean sine) or vocal (bell-like)
 * - Bass (32-39) → sub or wobble (synth bass)
 * - Lead Sawtooth (81) → impact (harsh sawtooth)
 * - Square Lead (80, 82) → arp (video game synth)
 * - Synth Pads (88-95) → lead (soft round) or sweep (warm)
 * - Synth FX (96-103) → sweep (atmospheric pads, often melodic)
 * - Sound FX (120-127) → riser (white noise FX)
 */
function mapGmProgramToSoundId(program: number, pitch: number): string {
  // PIANO (0-7) → Our only real piano sound
  if (program >= 0 && program <= 7) {
    return 'pad' // Grand piano Sampler
  }

  // CHROMATIC PERCUSSION (8-15) → Bell-like or clean sine sounds
  if (program >= 8 && program <= 15) {
    // High pitches (>72) → pluck (clean sine tone at higher registers)
    // Low/mid pitches → vocal (bell-like, ethereal)
    return pitch >= 72 ? 'pluck' : 'vocal'
  }

  // BASS (32-39) → Synth bass sounds
  if (program >= 32 && program <= 39) {
    // Very low bass (<36) → sub (deep sub bass with slight pluck)
    // Higher bass → wobble (FM synth bass)
    return pitch < 36 ? 'sub' : 'wobble'
  }

  // STRINGS/ENSEMBLE (40-55) → Warm sustained sounds
  if (program >= 40 && program <= 55) {
    return 'sweep' // Round and warm like plastic tube with bite
  }

  // BRASS (56-63) → Bright melodic sounds
  if (program >= 56 && program <= 63) {
    return 'lead' // Soft round synth (not as harsh as impact)
  }

  // REED/PIPE (64-79) → Melodic sounds
  if (program >= 64 && program <= 79) {
    return 'lead' // Soft round character
  }

  // SYNTH LEAD (80-87)
  if (program >= 80 && program <= 87) {
    if (program === 80 || program === 82) {
      return 'arp' // Square wave = video game synth
    }
    if (program === 81) {
      return 'impact' // Sawtooth = harsh serrated knife sound
    }
    return 'lead' // Other leads → soft round synth
  }

  // SYNTH PAD (88-95)
  if (program >= 88 && program <= 95) {
    if (program === 95) {
      return 'sweep' // Pad 8 (sweep) = warm sweep character
    }
    return 'lead' // Warm/soft pads → soft round synth
  }

  // SYNTH EFFECTS (96-103) → Atmospheric pads (often melodic)
  if (program >= 96 && program <= 103) {
    return 'sweep' // Warm atmospheric character (was 'riser' - noise)
  }

  // ETHNIC (104-111) → Plucked/melodic
  if (program >= 104 && program <= 111) {
    return 'pluck' // Clean sine character
  }

  // PERCUSSIVE (112-119) → Rhythmic sounds
  if (program >= 112 && program <= 119) {
    return 'noise' // Can act as snare for electro
  }

  // SOUND EFFECTS (120-127)
  if (program >= 120 && program <= 127) {
    return 'riser' // White noise riser and FX
  }

  // Fallback: shouldn't reach here
  return 'lead'
}

/**
 * Map MIDI note number (0-127) to soundId string
 * Uses pitch ranges to intelligently assign icon sounds
 * NOTE: UI uses short soundIds: 'lead', 'kick', 'sub' (not 'synth-lead', 'drum-kick', 'bass-sub')
 *
 * UPDATED: GM program-aware mapping
 * - Channel 9 (GM drums) → routes to drum soundIds
 * - GM program available → uses program semantics (NEW!)
 * - No program → pitch-based melodic mapping (fallback)
 */
function mapMidiToSoundId(midiNote: number, channel?: number, program?: number): string {
  // Phase 1: Detect GM drums channel (0-indexed channel 9)
  if (channel === 9) {
    return mapGmDrumToSoundId(midiNote)
  }

  // Phase 2: Use GM program semantics if available (NEW!)
  if (program !== undefined && program >= 0 && program <= 127) {
    return mapGmProgramToSoundId(program, midiNote)
  }

  // Handle invalid program numbers (> 127 or < 0)
  if (program !== undefined && (program < 0 || program > 127)) {
    console.warn(`[MIDI] Invalid GM program ${program} (valid range: 0-127). Mapping to 'lead' synth.`)
    return 'lead' // Use neutral melodic sound instead of pitch-based bass mapping
  }

  // Phase 3: Pitch-only mapping as fallback for melodic (when no program info)
  if (midiNote < 36) return 'sub'
  if (midiNote <= 47) return 'wobble'
  if (midiNote <= 59) return 'pad'
  if (midiNote <= 71) return 'lead'
  if (midiNote <= 83) return 'pluck'
  if (midiNote <= 95) return 'arp'
  return 'sweep'
}

/**
 * Convert MIDI clip to sequencer placements
 * Handles deduplication (keeps highest velocity or longer duration per cell)
 * Truncates to 4-bar grid (0-63 sixteenth notes)
 */
export function midiClipToPlacements(clip: ParsedMidiClip): Placement[] {
  const { bpm, notes, timeSignature } = clip

  // Warn if non-4/4 time signature (our sequencer assumes 4/4)
  if (timeSignature && timeSignature !== '4/4') {
    console.warn(`[MIDI] Time signature ${timeSignature} detected, but sequencer assumes 4/4. Bar boundaries may be incorrect.`)
  }

  // Find minimum note time to normalize all notes to start at t=0
  // This handles MIDI files that have silence/offset before the first note
  const minTime = notes.length > 0 ? Math.min(...notes.map(n => n.timeSec)) : 0

  // Map to track deduplication: "bar_soundId_pitch" → note with preferred props
  const cellMap = new Map<string, ParsedMidiNote & { bar: number; duration16: number }>()

  for (const note of notes) {
    // Normalize note time by subtracting the offset so first note maps to bar 0
    const normalizedTime = note.timeSec - minTime
    const bar = toSixteenthIndex(normalizedTime, bpm)
    if (bar < 0 || bar > 63) continue

    const soundId = mapMidiToSoundId(note.midi, note.channel, note.program)
    const pitch = note.midi

    // Convert duration to sixteenths and clamp to loop end
    const rawLen16 = toSixteenthLength(note.durationSec, bpm)
    const end = Math.min(64, bar + rawLen16)
    const duration16 = Math.max(1, end - bar)

    const cellKey = `${bar}_${soundId}_${pitch}`
    const existing = cellMap.get(cellKey)

    if (!existing) {
      cellMap.set(cellKey, { ...note, bar, duration16 })
    } else {
      // Prefer higher velocity; if tie, prefer longer duration
      if (note.velocity > existing.velocity || (note.velocity === existing.velocity && duration16 > existing.duration16)) {
        cellMap.set(cellKey, { ...note, bar, duration16 })
      }
    }
  }

  const placements: Placement[] = []

  for (const [, note] of cellMap) {
    let finalPitch = note.midi

    // Auto-transpose tracks with invalid programs if they're too low (< C3 / MIDI 48)
    if (note.program !== undefined && (note.program < 0 || note.program > 127)) {
      if (note.midi < 48) {
        finalPitch = note.midi + 12 // Transpose up one octave
        console.log(`[MIDI] Invalid program ${note.program}: transposing MIDI ${note.midi} → ${finalPitch} (up 1 octave)`)
      }
    }

    placements.push({
      soundId: mapMidiToSoundId(note.midi, note.channel, note.program),
      bar: note.bar,
      pitch: finalPitch, // Use transposed pitch
      velocity: Math.round(note.velocity * 100),
      duration16: note.duration16 // Duration in sixteenths, preserved from MIDI
    })
  }

  placements.sort((a, b) => a.bar - b.bar)
  return placements
}
