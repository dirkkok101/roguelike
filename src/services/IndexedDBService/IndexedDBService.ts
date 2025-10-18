// ============================================================================
// INDEXEDDB SERVICE - Browser database for game saves and replays
// ============================================================================

/**
 * IndexedDBService
 *
 * Responsibilities:
 * - Database initialization and version management
 * - Create two object stores: 'saves' and 'replays'
 * - Add indexes for efficient querying
 * - CRUD operations with Promise-based async API
 * - Transaction handling
 * - Quota checking via navigator.storage.estimate()
 *
 * Architecture:
 * - Wraps IndexedDB API with Promises
 * - Provides clean interface for storage operations
 * - Handles errors and retries
 */

export class IndexedDBService {
  private static readonly DB_NAME = 'roguelike_db'
  private static readonly DB_VERSION = 1
  private static readonly STORES = {
    SAVES: 'saves',
    REPLAYS: 'replays',
  } as const

  private db: IDBDatabase | null = null

  /**
   * Initialize database
   * Creates database with schema if it doesn't exist
   * Upgrades schema if version changes
   */
  async initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        IndexedDBService.DB_NAME,
        IndexedDBService.DB_VERSION
      )

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create 'saves' object store
        if (!db.objectStoreNames.contains(IndexedDBService.STORES.SAVES)) {
          const savesStore = db.createObjectStore(IndexedDBService.STORES.SAVES, {
            keyPath: 'gameId',
          })

          // Add indexes for querying
          savesStore.createIndex('timestamp', 'timestamp', { unique: false })
          savesStore.createIndex('characterName', 'metadata.characterName', {
            unique: false,
          })
        }

        // Create 'replays' object store
        if (!db.objectStoreNames.contains(IndexedDBService.STORES.REPLAYS)) {
          const replaysStore = db.createObjectStore(
            IndexedDBService.STORES.REPLAYS,
            { keyPath: 'gameId' }
          )

          // Add indexes for querying
          replaysStore.createIndex('timestamp', 'metadata.createdAt', {
            unique: false,
          })
          replaysStore.createIndex('turnCount', 'metadata.turnCount', {
            unique: false,
          })
        }
      }
    })
  }

  /**
   * Open database connection
   * Initializes if not already open
   */
  async openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return this.initDatabase()
  }

  /**
   * Put (insert or update) data in object store
   * @param storeName - Name of object store ('saves' or 'replays')
   * @param key - Primary key (gameId)
   * @param value - Data to store
   */
  async put(storeName: string, key: string, value: any): Promise<void> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      // Ensure value has the key
      const dataWithKey = { ...value, gameId: key }

      const request = store.put(dataWithKey)

      request.onerror = () => {
        reject(
          new Error(`Failed to put data in ${storeName}: ${request.error?.message}`)
        )
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`))
      }
    })
  }

  /**
   * Get data from object store by key
   * @param storeName - Name of object store
   * @param key - Primary key (gameId)
   * @returns Data or null if not found
   */
  async get(storeName: string, key: string): Promise<any> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => {
        reject(
          new Error(`Failed to get data from ${storeName}: ${request.error?.message}`)
        )
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }
    })
  }

  /**
   * Delete data from object store
   * @param storeName - Name of object store
   * @param key - Primary key (gameId)
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete data from ${storeName}: ${request.error?.message}`
          )
        )
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Get all data from object store
   * @param storeName - Name of object store
   * @returns Array of all records
   */
  async getAll(storeName: string): Promise<any[]> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get all data from ${storeName}: ${request.error?.message}`
          )
        )
      }

      request.onsuccess = () => {
        resolve(request.result || [])
      }
    })
  }

  /**
   * Query data using an index
   * @param storeName - Name of object store
   * @param indexName - Name of index
   * @param query - IDBKeyRange or specific value
   * @returns Array of matching records
   */
  async query(
    storeName: string,
    indexName: string,
    query: IDBKeyRange | IDBValidKey
  ): Promise<any[]> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(query)

      request.onerror = () => {
        reject(
          new Error(
            `Failed to query ${storeName} by ${indexName}: ${request.error?.message}`
          )
        )
      }

      request.onsuccess = () => {
        resolve(request.result || [])
      }
    })
  }

  /**
   * Check storage quota
   * Uses Storage API to estimate usage and quota
   * @returns Object with usage, quota, and percentUsed
   */
  async checkQuota(): Promise<{
    usage: number
    quota: number
    percentUsed: number
  }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      // Storage API not available (older browsers)
      return {
        usage: 0,
        quota: 0,
        percentUsed: 0,
      }
    }

    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0

    return {
      usage,
      quota,
      percentUsed,
    }
  }

  /**
   * Close database connection
   * Should be called on app shutdown
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * Delete entire database
   * WARNING: Destroys all data
   * Useful for testing or factory reset
   */
  async deleteDatabase(): Promise<void> {
    this.close()

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(IndexedDBService.DB_NAME)

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }
}
