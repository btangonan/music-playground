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

  // Return -1 for notes beyond 4-bar grid (caller will filter)
  if (sixteenths < 0 || sixteenths > 63) {
    return -1
  }

  return sixteenths
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
  // MIDI note ranges (C-1 = 0, middle C = 60, G9 = 127)

  // Very low bass range (C0-B1: MIDI 0-35)
  if (midiNote < 36) {
    return 'sub' // Sub bass for very low notes
  }

  // Bass range (C2-B2: MIDI 36-47)
  if (midiNote >= 36 && midiNote <= 47) {
    return 'wobble' // Wobble bass for low melodic notes
  }

  // Lower melodic range (C3-B3: MIDI 48-59)
  // Changed from percussion to melodic instruments
  if (midiNote >= 48 && midiNote <= 59) {
    return 'pad' // Pad for lower melodic range (was kick/snare/hihat/clap)
  }

  // Mid melodic range (C4-B4: MIDI 60-71)
  if (midiNote >= 60 && midiNote <= 71) {
    return 'lead' // Lead synth for mid range
  }

  // Upper melodic range (C5-B5: MIDI 72-83)
  if (midiNote >= 72 && midiNote <= 83) {
    return 'pluck' // Pluck for upper melodic range
  }

  // High range (C6-B6: MIDI 84-95)
  if (midiNote >= 84 && midiNote <= 95) {
    return 'arp' // Arp for high melodic lines
  }

  // Very high range (C7+: MIDI 96+)
  if (midiNote >= 96) {
    return 'sweep' // Sweep/FX for very high notes
  }

  // Default fallback
  return 'lead'
}

/**
 * Convert MIDI clip to sequencer placements
 * Handles deduplication (keeps highest velocity per cell)
 * Truncates to 4-bar grid (0-63 sixteenth notes)
 */
export function midiClipToPlacements(clip: ParsedMidiClip): Placement[] {
  const { bpm, notes } = clip

  // Map to track deduplication: "bar_soundId_pitch" → note with highest velocity
  const cellMap = new Map<string, ParsedMidiNote & { bar: number }>()

  for (const note of notes) {
    const bar = toSixteenthIndex(note.timeSec, bpm)

    // Skip notes beyond 4-bar grid (toSixteenthIndex returns -1)
    if (bar < 0 || bar > 63) continue

    const soundId = mapMidiToSoundId(note.midi)
    const pitch = note.midi // Keep MIDI pitch for note playback

    // Create unique cell key
    const cellKey = `${bar}_${soundId}_${pitch}`

    // Keep highest velocity if duplicate
    const existing = cellMap.get(cellKey)
    if (!existing || note.velocity > existing.velocity) {
      cellMap.set(cellKey, { ...note, bar })
    }
  }

  // Convert to placements array
  const placements: Placement[] = []

  for (const [, note] of cellMap) {
    placements.push({
      soundId: mapMidiToSoundId(note.midi),
      bar: note.bar,
      pitch: note.midi,
      velocity: Math.round(note.velocity * 100) // Convert 0-1 → 0-100
    })
  }

  // Sort by bar position for deterministic order
  placements.sort((a, b) => a.bar - b.bar)

  return placements
}
