// Migration helper: localStorage → IndexedDB
// Runs once on first load, safe to re-run (idempotent)

import { LocalStorageAdapter } from './LocalStorageAdapter'
import type { StorageAdapter } from './StorageAdapter'
import { parseLoop, parseSong } from '../types'

const MIGRATION_FLAG = 'music-playground:migrated-to-indexeddb'

/**
 * Check if migration has already run
 */
export function hasMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true'
}

/**
 * Migrate all loops and songs from localStorage to IndexedDB
 * Safe to run multiple times (idempotent)
 *
 * @returns Migration summary
 */
export async function migrateToIndexedDB(
  target: StorageAdapter
): Promise<{
  loopsMigrated: number
  songsMigrated: number
  errors: string[]
}> {
  // Early return if already migrated
  if (hasMigrated()) {
    return { loopsMigrated: 0, songsMigrated: 0, errors: [] }
  }

  const source = new LocalStorageAdapter()
  const errors: string[] = []
  let loopsMigrated = 0
  let songsMigrated = 0

  try {
    // Migrate loops
    const loopIds = await source.listLoopIds()
    for (const id of loopIds) {
      try {
        const loop = await source.getLoop(id)
        if (!loop) continue

        // Validate with Zod before migrating
        const validated = parseLoop(loop)
        if (!validated.success) {
          errors.push(`Loop ${id}: ${validated.error.message}`)
          continue
        }

        await target.putLoop(validated.data)
        loopsMigrated++
      } catch (err) {
        errors.push(`Loop ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Migrate songs
    const songIds = await source.listSongIds()
    for (const id of songIds) {
      try {
        const song = await source.getSong(id)
        if (!song) continue

        // Validate with Zod
        const validated = parseSong(song)
        if (!validated.success) {
          errors.push(`Song ${id}: ${validated.error.message}`)
          continue
        }

        await target.putSong(validated.data)
        songsMigrated++
      } catch (err) {
        errors.push(`Song ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Mark as migrated
    localStorage.setItem(MIGRATION_FLAG, 'true')
  } catch (err) {
    errors.push(`Migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return { loopsMigrated, songsMigrated, errors }
}
