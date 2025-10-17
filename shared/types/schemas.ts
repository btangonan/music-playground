// Zod schemas for runtime validation at boundaries
// Shared between frontend (composer) and backend (api)
import { z } from 'zod'

/**
 * ChordCell schema
 */
export const ChordCellSchema = z.object({
  bar: z.number().int().min(0).max(15),
  chord: z.string().min(1).max(20) // "Cmaj7", "Am", etc
})

/**
 * IconStep schema
 * Note: pitch is the MIDI note number (0-127) used for audio playback
 * Note: row is for UI grid positioning only (not used by audio engine)
 */
export const IconStepSchema = z.object({
  bar: z.number().int().min(0),
  row: z.number().int().min(0).max(3), // 4 rows max
  soundId: z.string().min(1),
  velocity: z.number().min(0).max(1).optional().default(0.8),
  pitch: z.number().int().min(0).max(127) // MIDI note number for audio scheduling
})

/**
 * Loop schema with defaults
 */
export const LoopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  bars: z.enum(['1', '2', '4', '8']).transform(Number).or(z.literal(1).or(z.literal(2)).or(z.literal(4)).or(z.literal(8))),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().default('#FFD11A'),
  chordProgression: z.array(ChordCellSchema),
  iconSequence: z.array(IconStepSchema),
  bpm: z.number().int().min(40).max(300).optional().default(120),
  schemaVersion: z.number().int().default(1),
  updatedAt: z.string().datetime() // ISO 8601
})

/**
 * TimelineBlock schema
 */
export const TimelineBlockSchema = z.object({
  id: z.string().min(1),
  loopId: z.string().min(1),
  startBar: z.number().int().min(0),
  bars: z.number().int().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
})

/**
 * Song schema
 */
export const SongSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  bpm: z.number().int().min(40).max(300),
  timeSignature: z.enum(['4/4', '3/4']),
  timeline: z.array(TimelineBlockSchema),
  totalBars: z.number().int().min(0),
  schemaVersion: z.number().int().default(1),
  updatedAt: z.string().datetime()
})

// Infer TypeScript types from Zod schemas (single source of truth)
export type Loop = z.infer<typeof LoopSchema>
export type Song = z.infer<typeof SongSchema>
export type ChordCell = z.infer<typeof ChordCellSchema>
export type IconStep = z.infer<typeof IconStepSchema>
export type TimelineBlock = z.infer<typeof TimelineBlockSchema>
