// Storage adapter interface - stable contract for data persistence
// Implementations: IndexedDB (primary), localStorage (fallback)

import type { Loop, Song } from '../types'

/**
 * StorageAdapter interface
 *
 * All methods are async to support both IndexedDB and future cloud sync.
 * Errors should be thrown (not returned) for exceptional cases.
 */
export interface StorageAdapter {
  // Loop operations
  getLoop(id: string): Promise<Loop | null>
  putLoop(loop: Loop): Promise<void>
  listLoopIds(): Promise<string[]>
  deleteLoop(id: string): Promise<void>

  // Song operations
  getSong(id: string): Promise<Song | null>
  putSong(song: Song): Promise<void>
  listSongIds(): Promise<string[]>
  deleteSong(id: string): Promise<void>

  // Sample operations (for future audio file uploads)
  putSample(key: string, blob: Blob): Promise<void>
  getSample(key: string): Promise<Blob | null>
  deleteSample(key: string): Promise<void>
}
