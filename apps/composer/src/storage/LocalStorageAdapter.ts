// localStorage fallback implementation of StorageAdapter
// Used when IndexedDB is unavailable (private browsing, old browsers)
// Simpler but limited to ~5-10 MB total storage

import type { StorageAdapter } from './StorageAdapter'
import type { Loop, Song } from '../types'

const LOOPS_KEY = 'music-playground:loops'
const SONGS_KEY = 'music-playground:songs'
const SAMPLES_KEY_PREFIX = 'music-playground:sample:'

export class LocalStorageAdapter implements StorageAdapter {
  // Loop operations
  async getLoop(id: string): Promise<Loop | null> {
    const loopsJson = localStorage.getItem(LOOPS_KEY)
    if (!loopsJson) return null

    const loops: Record<string, Loop> = JSON.parse(loopsJson)
    return loops[id] ?? null
  }

  async putLoop(loop: Loop): Promise<void> {
    const loopsJson = localStorage.getItem(LOOPS_KEY) ?? '{}'
    const loops: Record<string, Loop> = JSON.parse(loopsJson)

    loops[loop.id] = loop
    localStorage.setItem(LOOPS_KEY, JSON.stringify(loops))
  }

  async listLoopIds(): Promise<string[]> {
    const loopsJson = localStorage.getItem(LOOPS_KEY)
    if (!loopsJson) return []

    const loops: Record<string, Loop> = JSON.parse(loopsJson)
    return Object.keys(loops)
  }

  async deleteLoop(id: string): Promise<void> {
    const loopsJson = localStorage.getItem(LOOPS_KEY)
    if (!loopsJson) return

    const loops: Record<string, Loop> = JSON.parse(loopsJson)
    delete loops[id]
    localStorage.setItem(LOOPS_KEY, JSON.stringify(loops))
  }

  // Song operations
  async getSong(id: string): Promise<Song | null> {
    const songsJson = localStorage.getItem(SONGS_KEY)
    if (!songsJson) return null

    const songs: Record<string, Song> = JSON.parse(songsJson)
    return songs[id] ?? null
  }

  async putSong(song: Song): Promise<void> {
    const songsJson = localStorage.getItem(SONGS_KEY) ?? '{}'
    const songs: Record<string, Song> = JSON.parse(songsJson)

    songs[song.id] = song
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
  }

  async listSongIds(): Promise<string[]> {
    const songsJson = localStorage.getItem(SONGS_KEY)
    if (!songsJson) return []

    const songs: Record<string, Song> = JSON.parse(songsJson)
    return Object.keys(songs)
  }

  async deleteSong(id: string): Promise<void> {
    const songsJson = localStorage.getItem(SONGS_KEY)
    if (!songsJson) return

    const songs: Record<string, Song> = JSON.parse(songsJson)
    delete songs[id]
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
  }

  // Sample operations (not efficient for localStorage, but provides interface)
  async putSample(key: string, blob: Blob): Promise<void> {
    // Convert blob to base64 for localStorage
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const base64 = btoa(String.fromCharCode(...bytes))

    localStorage.setItem(SAMPLES_KEY_PREFIX + key, JSON.stringify({
      type: blob.type,
      data: base64
    }))
  }

  async getSample(key: string): Promise<Blob | null> {
    const sampleJson = localStorage.getItem(SAMPLES_KEY_PREFIX + key)
    if (!sampleJson) return null

    const { type, data } = JSON.parse(sampleJson)
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
    return new Blob([bytes], { type })
  }

  async deleteSample(key: string): Promise<void> {
    localStorage.removeItem(SAMPLES_KEY_PREFIX + key)
  }
}
