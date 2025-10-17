// Pure TypeScript types - no runtime behavior
// These will be derived from Zod schemas using z.infer

/**
 * IconSound: Minimal reference to a Tone.js sound preset
 * Stored in a registry, not in user data
 */
export interface IconSound {
  id: string // stable ID like "drum-kick", "synth-lead"
  name: string // display name
  category: 'synth' | 'drum' | 'bass' | 'fx'
  icon: string // emoji or Streamline icon name
  tonePreset: Record<string, unknown> // Tone.js config
}

/**
 * ChordCell: Single bar in a chord progression
 */
export interface ChordCell {
  bar: number // 0-15 for 16-bar grid
  chord: string // "Cmaj7", "Am", "G7"
}

/**
 * IconStep: Sound placement in sequencer grid
 */
export interface IconStep {
  bar: number // bar position (0-based)
  row: number // sequencer row (0-3 for 4 rows)
  soundId: string // references IconSound.id
  velocity?: number // 0-1, default 0.8
}

/**
 * Loop: User-created musical loop
 * Contains chord progression + icon sound sequence
 */
export interface Loop {
  id: string
  name: string
  bars: 1 | 2 | 4 | 8 // loop length in bars
  color?: string // hex color for UI (#FFD11A default)
  chordProgression: ChordCell[]
  iconSequence: IconStep[]
  bpm?: number // optional per-loop BPM, defaults to song BPM
  schemaVersion: number // for future migrations
  updatedAt: string // ISO timestamp
}

/**
 * TimelineBlock: Loop instance in song timeline
 */
export interface TimelineBlock {
  id: string
  loopId: string // references Loop.id
  startBar: number // position in timeline
  bars: number // duration (copied from Loop.bars)
  color?: string // hex color (copied from Loop.color)
}

/**
 * Song: Sequential arrangement of loops
 */
export interface Song {
  id: string
  name: string
  bpm: number
  timeSignature: '4/4' | '3/4'
  timeline: TimelineBlock[]
  totalBars: number // computed from timeline
  schemaVersion: number
  updatedAt: string // ISO timestamp
}
