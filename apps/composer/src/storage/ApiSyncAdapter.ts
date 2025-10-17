// API Sync Adapter - coordinates between IndexedDB (local-first) and backend API
import { IndexedDBAdapter } from './IndexedDBAdapter'
import { api } from '../services/api'
import type { StorageAdapter } from './StorageAdapter'
import type { Loop, Song } from '../types'

export class ApiSyncAdapter implements StorageAdapter {
  private local: IndexedDBAdapter
  private syncQueue: Set<string> = new Set()
  private isSyncing = false

  constructor() {
    this.local = new IndexedDBAdapter()
  }

  async init(): Promise<void> {
    await this.local.init()
    // Start periodic sync
    this.startPeriodicSync()
  }

  // Loop operations with API sync
  async getLoop(id: string): Promise<Loop | null> {
    // Try local first (local-first approach)
    let loop = await this.local.getLoop(id)

    if (!loop) {
      // If not found locally, try fetching from API
      try {
        const response = await api.getLoop(id)
        loop = response.loop
        // Cache in IndexedDB
        await this.local.putLoop(loop)
      } catch (error) {
        console.warn('Failed to fetch loop from API:', error)
      }
    }

    return loop
  }

  async putLoop(loop: Loop): Promise<void> {
    // Save locally first (local-first)
    await this.local.putLoop(loop)

    // Try to sync to API
    try {
      // Check if loop exists by trying to get it
      try {
        await api.getLoop(loop.id)
        // Loop exists, update it
        await api.updateLoop(loop.id, loop)
      } catch {
        // Loop doesn't exist, create it
        await api.createLoop(loop)
      }
    } catch (error) {
      console.warn('Failed to sync loop to API, will retry later:', error)
      // Add to sync queue for later
      this.syncQueue.add(`loop:${loop.id}`)
    }
  }

  async listLoopIds(): Promise<string[]> {
    // Get local IDs first
    const localIds = await this.local.listLoopIds()

    // Try to get remote IDs and merge
    try {
      const response = await api.listLoops()
      const remoteIds = response.loops.map(l => l.id)

      // Cache remote loops locally
      for (const loop of response.loops) {
        const exists = await this.local.getLoop(loop.id)
        if (!exists) {
          await this.local.putLoop(loop)
        }
      }

      // Return merged list (unique IDs)
      return Array.from(new Set([...localIds, ...remoteIds]))
    } catch (error) {
      console.warn('Failed to fetch loops from API:', error)
      return localIds
    }
  }

  async deleteLoop(id: string): Promise<void> {
    // Delete locally first
    await this.local.deleteLoop(id)

    // Try to delete from API
    try {
      await api.deleteLoop(id)
    } catch (error) {
      console.warn('Failed to delete loop from API:', error)
      // Add to sync queue for later
      this.syncQueue.add(`delete-loop:${id}`)
    }
  }

  // Song operations (not yet implemented in API)
  async getSong(id: string): Promise<Song | null> {
    return this.local.getSong(id)
  }

  async putSong(song: Song): Promise<void> {
    return this.local.putSong(song)
  }

  async listSongIds(): Promise<string[]> {
    return this.local.listSongIds()
  }

  async deleteSong(id: string): Promise<void> {
    return this.local.deleteSong(id)
  }

  // Sample operations (local only)
  async putSample(key: string, blob: Blob): Promise<void> {
    return this.local.putSample(key, blob)
  }

  async getSample(key: string): Promise<Blob | null> {
    return this.local.getSample(key)
  }

  async deleteSample(key: string): Promise<void> {
    return this.local.deleteSample(key)
  }

  // Sync management
  private startPeriodicSync() {
    // Sync every 30 seconds if there are pending items
    setInterval(() => {
      if (this.syncQueue.size > 0 && !this.isSyncing) {
        this.syncPendingChanges()
      }
    }, 30000)
  }

  private async syncPendingChanges() {
    if (this.isSyncing) return

    this.isSyncing = true
    const itemsToSync = Array.from(this.syncQueue)

    for (const item of itemsToSync) {
      try {
        const [type, id] = item.split(':')

        if (type === 'loop') {
          const loop = await this.local.getLoop(id)
          if (loop) {
            try {
              await api.getLoop(id)
              await api.updateLoop(id, loop)
            } catch {
              await api.createLoop(loop)
            }
          }
        } else if (type === 'delete-loop') {
          await api.deleteLoop(id)
        }

        // Remove from queue on success
        this.syncQueue.delete(item)
      } catch (error) {
        console.warn('Failed to sync item:', item, error)
        // Keep in queue for next attempt
      }
    }

    this.isSyncing = false
  }

  // Manual sync trigger
  async syncNow(): Promise<void> {
    await this.syncPendingChanges()
  }

  // Get sync status
  getSyncStatus(): { pending: number; syncing: boolean } {
    return {
      pending: this.syncQueue.size,
      syncing: this.isSyncing
    }
  }
}
