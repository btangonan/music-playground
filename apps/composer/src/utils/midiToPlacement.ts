// MIDI to Sequencer Placement Converter
// Converts parsed MIDI clips to icon placements on 4-bar grid

import type { ParsedMidiClip, ParsedMidiNote } from '../audio/AudioEngine'
import type { Placement } from '../stores/useSequencerStore'

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
 * Map MIDI note number (0-127) to soundId string
 * Uses pitch ranges to intelligently assign icon sounds
 * NOTE: UI uses short soundIds: 'lead', 'kick', 'sub' (not 'synth-lead', 'drum-kick', 'bass-sub')
 *
 * UPDATED: Simplified mapping to favor melodic instruments over percussion
 * Most MIDI files use melodic instruments, so we default to synth/piano sounds
 */
function mapMidiToSoundId(midiNote: number): string {
  if (midiNote < 36) {
    return 'sub'
  }
  if (midiNote >= 36 && midiNote <= 47) {
    return 'wobble'
  }
  if (midiNote >= 48 && midiNote <= 59) {
    return 'pad'
  }
  if (midiNote >= 60 && midiNote <= 71) {
    return 'lead'
  }
  if (midiNote >= 72 && midiNote <= 83) {
    return 'pluck'
  }
  if (midiNote >= 84 && midiNote <= 95) {
    return 'arp'
  }
  if (midiNote >= 96) {
    return 'sweep'
  }
  return 'lead'
}

/**
 * Convert MIDI clip to sequencer placements
 * Handles deduplication (keeps highest velocity or longer duration per cell)
 * Truncates to 4-bar grid (0-63 sixteenth notes)
 */
export function midiClipToPlacements(clip: ParsedMidiClip): Placement[] {
  const { bpm, notes } = clip

  // Map to track deduplication: "bar_soundId_pitch" → note with preferred props
  const cellMap = new Map<string, ParsedMidiNote & { bar: number; duration16: number }>()

  for (const note of notes) {
    const bar = toSixteenthIndex(note.timeSec, bpm)
    if (bar < 0 || bar > 63) continue

    const soundId = mapMidiToSoundId(note.midi)
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
    placements.push({
      soundId: mapMidiToSoundId(note.midi),
      bar: note.bar,
      pitch: note.midi,
      velocity: Math.round(note.velocity * 100),
      // NEW: duration captured from MIDI (UI/schema default is 1 if absent)
      // @ts-ignore allow extra field for now; downstream treats as any[] in LoopLabView
      duration16: note.duration16
    } as any)
  }

  placements.sort((a, b) => a.bar - b.bar)
  return placements
}
