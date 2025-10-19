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
 * Map MIDI note number (0-127) to soundId string
 * Uses pitch ranges to intelligently assign icon sounds
 * NOTE: UI uses short soundIds: 'lead', 'kick', 'sub' (not 'synth-lead', 'drum-kick', 'bass-sub')
 *
 * UPDATED: Channel-aware mapping
 * - Channel 9 (GM drums) → routes to drum soundIds
 * - Other channels → pitch-based melodic mapping
 */
function mapMidiToSoundId(midiNote: number, channel?: number, program?: number): string {
  // Phase 1: Detect GM drums channel (0-indexed channel 9)
  if (channel === 9) {
    return mapGmDrumToSoundId(midiNote)
  }

  // Existing pitch-only mapping as fallback for melodic
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
  const { bpm, notes } = clip

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

    // DEBUG: Log sustained notes (duration > 1 sixteenth)
    if (duration16 > 1) {
      console.log(`[MIDI] Sustained note: bar=${bar}, dur=${note.durationSec.toFixed(3)}s -> ${duration16} sixteenths, midi=${note.midi}, sound=${soundId}`);
    }

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
    placements.push({
      soundId: mapMidiToSoundId(note.midi, note.channel, note.program),
      bar: note.bar,
      pitch: note.midi,
      velocity: Math.round(note.velocity * 100),
      duration16: note.duration16 // Duration in sixteenths, preserved from MIDI
    })
  }

  placements.sort((a, b) => a.bar - b.bar)
  return placements
}
