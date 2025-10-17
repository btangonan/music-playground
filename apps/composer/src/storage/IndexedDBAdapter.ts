// IndexedDB implementation of StorageAdapter using idb library
// Database: music-playground-v1
// Stores: loops, songs, samples

import { openDB, type IDBPDatabase } from 'idb'
import type { StorageAdapter } from './StorageAdapter'
import type { Loop, Song } from '../types'

const DB_NAME = 'music-playground-v1'
const DB_VERSION = 1

interface MusicPlaygroundDB {
  loops: {
    key: string
    value: Loop
  }
  songs: {
    key: string
    value: Song
  }
  samples: {
    key: string
    value: Blob
  }
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase<MusicPlaygroundDB> | null = null

  /**
   * Initialize database connection
   * Must be called before any operations
   */
  async init(): Promise<void> {
    if (this.db) return // Already initialized

    this.db = await openDB<MusicPlaygroundDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('loops')) {
          db.createObjectStore('loops')
        }
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs')
        }
        if (!db.objectStoreNames.contains('samples')) {
          db.createObjectStore('samples')
        }
      }
    })
  }

  private ensureInit(): IDBPDatabase<MusicPlaygroundDB> {
    if (!this.db) {
      throw new Error('IndexedDBAdapter not initialized. Call init() first.')
    }
    return this.db
  }

  // Loop operations
  async getLoop(id: string): Promise<Loop | null> {
    const db = this.ensureInit()
    const loop = await db.get('loops', id)
    return loop ?? null
  }

  async putLoop(loop: Loop): Promise<void> {
    const db = this.ensureInit()
    await db.put('loops', loop, loop.id)
  }

  async listLoopIds(): Promise<string[]> {
    const db = this.ensureInit()
    return db.getAllKeys('loops')
  }

  async deleteLoop(id: string): Promise<void> {
    const db = this.ensureInit()
    await db.delete('loops', id)
  }

  // Song operations
  async getSong(id: string): Promise<Song | null> {
    const db = this.ensureInit()
    const song = await db.get('songs', id)
    return song ?? null
  }

  async putSong(song: Song): Promise<void> {
    const db = this.ensureInit()
    await db.put('songs', song, song.id)
  }

  async listSongIds(): Promise<string[]> {
    const db = this.ensureInit()
    return db.getAllKeys('songs')
  }

  async deleteSong(id: string): Promise<void> {
    const db = this.ensureInit()
    await db.delete('songs', id)
  }

  // Sample operations
  async putSample(key: string, blob: Blob): Promise<void> {
    const db = this.ensureInit()
    await db.put('samples', blob, key)
  }

  async getSample(key: string): Promise<Blob | null> {
    const db = this.ensureInit()
    const blob = await db.get('samples', key)
    return blob ?? null
  }

  async deleteSample(key: string): Promise<void> {
    const db = this.ensureInit()
    await db.delete('samples', key)
  }
}
