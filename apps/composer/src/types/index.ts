// Public API for types module
// Barrel export with safe parsing helpers

export * from './models'
export * from './schemas'
export {
  LoopSchema,
  SongSchema,
  ChordCellSchema,
  IconStepSchema,
  TimelineBlockSchema,
  type Loop,
  type Song,
  type ChordCell,
  type IconStep,
  type TimelineBlock
} from './schemas'

import { LoopSchema, SongSchema } from './schemas'
import type { Loop, Song } from './schemas'

/**
 * Safe Loop parser with Result type
 * Returns success: true + data OR success: false + error
 */
export function parseLoop(input: unknown):
  | { success: true; data: Loop }
  | { success: false; error: { message: string; issues: unknown } }
{
  const result = LoopSchema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: {
      message: 'Invalid loop data',
      issues: result.error.issues
    }
  }
}

/**
 * Safe Song parser with Result type
 */
export function parseSong(input: unknown):
  | { success: true; data: Song }
  | { success: false; error: { message: string; issues: unknown } }
{
  const result = SongSchema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: {
      message: 'Invalid song data',
      issues: result.error.issues
    }
  }
}
