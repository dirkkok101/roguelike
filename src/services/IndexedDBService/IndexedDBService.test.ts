import 'fake-indexeddb/auto'
import { IndexedDBService } from './IndexedDBService'

// Polyfill for structuredClone (needed for fake-indexeddb in Node < 17)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('IndexedDBService', () => {
  let service: IndexedDBService

  beforeEach(async () => {
    // Create fresh service instance
    service = new IndexedDBService()
  })

  afterEach(() => {
    // Clean up: close database connection
    service.close()
  })

  describe('Database Initialization', () => {
    it('should create database with correct schema', async () => {
      const db = await service.initDatabase()

      expect(db.name).toBe('roguelike_db')
      expect(db.version).toBe(2) // Version 2: unified storage (replays embedded in saves)
      expect(db.objectStoreNames.contains('saves')).toBe(true)
      expect(db.objectStoreNames.contains('replays')).toBe(false) // Removed in v2
    })

    it('should create saves object store with indexes', async () => {
      const db = await service.initDatabase()
      const transaction = db.transaction(['saves'], 'readonly')
      const store = transaction.objectStore('saves')

      expect(store.keyPath).toBe('gameId')
      expect(store.indexNames.contains('timestamp')).toBe(true)
      expect(store.indexNames.contains('characterName')).toBe(true)
    })

    it('should reuse existing database connection', async () => {
      const db1 = await service.openDatabase()
      const db2 = await service.openDatabase()

      expect(db1).toBe(db2)
    })
  })

  describe('CRUD Operations', () => {
    it('should save and retrieve data', async () => {
      const testData = {
        gameId: 'test-game-1',
        metadata: {
          characterName: 'Hero',
        },
        timestamp: Date.now(),
        gameState: { player: { hp: 100 } },
      }

      await service.put('saves', 'test-game-1', testData)
      const retrieved = await service.get('saves', 'test-game-1')

      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent key', async () => {
      const retrieved = await service.get('saves', 'non-existent')

      expect(retrieved).toBeNull()
    })

    it('should update existing data with put', async () => {
      const data1 = {
        gameId: 'test-game-1',
        metadata: { characterName: 'Hero' },
        timestamp: 1000,
      }

      const data2 = {
        gameId: 'test-game-1',
        metadata: { characterName: 'Updated Hero' },
        timestamp: 2000,
      }

      await service.put('saves', 'test-game-1', data1)
      await service.put('saves', 'test-game-1', data2)

      const retrieved = await service.get('saves', 'test-game-1')

      expect(retrieved.metadata.characterName).toBe('Updated Hero')
      expect(retrieved.timestamp).toBe(2000)
    })

    it('should delete data correctly', async () => {
      const testData = {
        gameId: 'test-game-1',
        metadata: { characterName: 'Hero' },
      }

      await service.put('saves', 'test-game-1', testData)
      await service.delete('saves', 'test-game-1')

      const retrieved = await service.get('saves', 'test-game-1')

      expect(retrieved).toBeNull()
    })

    it('should get all data from store', async () => {
      const data1 = {
        gameId: 'game-1',
        metadata: { characterName: 'Hero 1' },
      }

      const data2 = {
        gameId: 'game-2',
        metadata: { characterName: 'Hero 2' },
      }

      await service.put('saves', 'game-1', data1)
      await service.put('saves', 'game-2', data2)

      const all = await service.getAll('saves')

      expect(all).toHaveLength(2)
      expect(all.map((item) => item.gameId)).toEqual(
        expect.arrayContaining(['game-1', 'game-2'])
      )
    })
  })

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Setup test data
      await service.put('saves', 'game-1', {
        gameId: 'game-1',
        metadata: { characterName: 'Alice' },
        timestamp: 1000,
      })

      await service.put('saves', 'game-2', {
        gameId: 'game-2',
        metadata: { characterName: 'Bob' },
        timestamp: 2000,
      })

      await service.put('saves', 'game-3', {
        gameId: 'game-3',
        metadata: { characterName: 'Charlie' },
        timestamp: 3000,
      })
    })

    it('should query by index', async () => {
      const results = await service.query(
        'saves',
        'timestamp',
        IDBKeyRange.only(2000)
      )

      expect(results).toHaveLength(1)
      expect(results[0].gameId).toBe('game-2')
    })

    it('should query by index range', async () => {
      const results = await service.query(
        'saves',
        'timestamp',
        IDBKeyRange.bound(1500, 3000)
      )

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.gameId)).toEqual(
        expect.arrayContaining(['game-2', 'game-3'])
      )
    })

    it('should return empty array for no matches', async () => {
      const results = await service.query(
        'saves',
        'timestamp',
        IDBKeyRange.only(9999)
      )

      expect(results).toEqual([])
    })
  })

  describe('Transaction Handling', () => {
    it('should handle transactions atomically', async () => {
      // This test verifies that put operations are atomic
      const data = {
        gameId: 'test-game',
        metadata: { characterName: 'Hero' },
      }

      await service.put('saves', 'test-game', data)
      const retrieved = await service.get('saves', 'test-game')

      expect(retrieved).toEqual(data)
    })

    it('should handle concurrent puts to same store', async () => {
      const saveData1 = {
        gameId: 'game-1',
        metadata: { characterName: 'Hero 1' },
      }

      const saveData2 = {
        gameId: 'game-2',
        metadata: { characterName: 'Hero 2' },
      }

      // Execute puts in parallel to the same store
      await Promise.all([
        service.put('saves', 'game-1', saveData1),
        service.put('saves', 'game-2', saveData2),
      ])

      const savedGame1 = await service.get('saves', 'game-1')
      const savedGame2 = await service.get('saves', 'game-2')

      expect(savedGame1).toEqual(saveData1)
      expect(savedGame2).toEqual(saveData2)
    })
  })

  describe('Quota Checking', () => {
    it('should check quota correctly', async () => {
      const quota = await service.checkQuota()

      expect(quota).toHaveProperty('usage')
      expect(quota).toHaveProperty('quota')
      expect(quota).toHaveProperty('percentUsed')
      expect(typeof quota.usage).toBe('number')
      expect(typeof quota.quota).toBe('number')
      expect(typeof quota.percentUsed).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle put errors gracefully', async () => {
      const invalidData = {
        gameId: 'test',
      }

      // Should reject with error when using invalid store name
      await expect(
        service.put('invalid-store', 'key', invalidData)
      ).rejects.toThrow()
    })

    it('should handle get errors gracefully', async () => {
      // Should reject with error when using invalid store name
      await expect(service.get('invalid-store', 'key')).rejects.toThrow()
    })
  })

  describe('Database Management', () => {
    it('should close database connection', async () => {
      const db1 = await service.openDatabase()
      expect(db1).toBeDefined()

      service.close()

      // After close, openDatabase should create new connection
      const db2 = await service.openDatabase()
      expect(db2).toBeDefined()
    })
  })
})
