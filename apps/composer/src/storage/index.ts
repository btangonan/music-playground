// Storage module public API

export { IndexedDBAdapter } from './IndexedDBAdapter'
export { LocalStorageAdapter } from './LocalStorageAdapter'
export { ApiSyncAdapter } from './ApiSyncAdapter'
export { migrateToIndexedDB, hasMigrated } from './migrate'
export type { StorageAdapter } from './StorageAdapter'

/**
 * Create storage adapter based on environment and feature detection
 * Uses ApiSyncAdapter by default for cloud-synced local-first storage
 */
export async function createStorage(): Promise<{
  adapter: StorageAdapter
  type: 'api-sync' | 'indexeddb' | 'localstorage'
}> {
  // Check if IndexedDB is available
  if (typeof indexedDB === 'undefined') {
    const { LocalStorageAdapter } = await import('./LocalStorageAdapter')
    return { adapter: new LocalStorageAdapter(), type: 'localstorage' }
  }

  try {
    // Use ApiSyncAdapter for cloud-synced storage (local-first with backend sync)
    const { ApiSyncAdapter } = await import('./ApiSyncAdapter')
    const adapter = new ApiSyncAdapter()
    await adapter.init()
    return { adapter, type: 'api-sync' }
  } catch (err) {
    console.warn('ApiSyncAdapter initialization failed, falling back to localStorage:', err)
    const { LocalStorageAdapter } = await import('./LocalStorageAdapter')
    return { adapter: new LocalStorageAdapter(), type: 'localstorage' }
  }
}
