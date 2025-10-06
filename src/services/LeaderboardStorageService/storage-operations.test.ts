import { LeaderboardStorageService } from './LeaderboardStorageService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD STORAGE SERVICE TESTS - Storage Operations
// ============================================================================

describe('LeaderboardStorageService - Storage Operations', () => {
  let service: LeaderboardStorageService

  beforeEach(() => {
    service = new LeaderboardStorageService()
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // Helper to create mock leaderboard entry
  const createMockEntry = (
    overrides?: Partial<LeaderboardEntry>
  ): LeaderboardEntry => {
    return {
      id: `entry-${Date.now()}-${Math.random()}`,
      gameId: 'game-1',
      timestamp: Date.now(),
      seed: 'seed-1',
      isVictory: true,
      score: 1000,
      deathCause: null,
      epitaph: null,
      finalLevel: 5,
      totalXP: 500,
      totalGold: 100,
      deepestLevel: 5,
      levelsExplored: 5,
      totalTurns: 500,
      monstersKilled: 20,
      itemsFound: 10,
      itemsUsed: 5,
      achievements: [],
      scorePerTurn: 2,
      killsPerLevel: 4,
      ...overrides,
    }
  }

  describe('addEntry', () => {
    test('adds entry to empty leaderboard', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('entry-1')
    })

    test('adds multiple entries', () => {
      const entry1 = createMockEntry({ id: 'entry-1', score: 1000 })
      const entry2 = createMockEntry({ id: 'entry-2', score: 2000 })
      const entry3 = createMockEntry({ id: 'entry-3', score: 1500 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(3)
    })

    test('sorts entries by score descending when adding', () => {
      const entry1 = createMockEntry({ id: 'entry-1', score: 1000 })
      const entry2 = createMockEntry({ id: 'entry-2', score: 3000 })
      const entry3 = createMockEntry({ id: 'entry-3', score: 2000 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const entries = service.getAllEntries()
      expect(entries[0].id).toBe('entry-2') // 3000
      expect(entries[1].id).toBe('entry-3') // 2000
      expect(entries[2].id).toBe('entry-1') // 1000
    })

    test('persists entries to localStorage', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      // Create new service instance to test persistence
      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('entry-1')
    })
  })

  describe('getAllEntries', () => {
    test('returns empty array when no entries exist', () => {
      const entries = service.getAllEntries()
      expect(entries).toEqual([])
    })

    test('returns all stored entries', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(2)
    })

    test('returns entries sorted by score descending', () => {
      const entry1 = createMockEntry({ id: 'entry-1', score: 500 })
      const entry2 = createMockEntry({ id: 'entry-2', score: 2000 })
      const entry3 = createMockEntry({ id: 'entry-3', score: 1500 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const entries = service.getAllEntries()
      expect(entries[0].score).toBe(2000)
      expect(entries[1].score).toBe(1500)
      expect(entries[2].score).toBe(500)
    })

    test('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('roguelike_leaderboard', 'invalid json{')

      const entries = service.getAllEntries()
      expect(entries).toEqual([])
    })
  })

  describe('getEntry', () => {
    test('returns entry by ID', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)

      const found = service.getEntry('entry-1')
      expect(found?.id).toBe('entry-1')
    })

    test('returns null for non-existent ID', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      const found = service.getEntry('non-existent')
      expect(found).toBeNull()
    })

    test('returns null when leaderboard is empty', () => {
      const found = service.getEntry('entry-1')
      expect(found).toBeNull()
    })
  })

  describe('deleteEntry', () => {
    test('deletes entry by ID', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)

      service.deleteEntry('entry-1')

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('entry-2')
    })

    test('does nothing when ID does not exist', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      service.deleteEntry('non-existent')

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(1)
    })

    test('can delete all entries one by one', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)

      service.deleteEntry('entry-1')
      service.deleteEntry('entry-2')

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(0)
    })

    test('persists deletion to localStorage', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.deleteEntry('entry-1')

      // Create new service instance to test persistence
      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('entry-2')
    })
  })

  describe('clearAll', () => {
    test('clears all entries', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)

      service.clearAll()

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(0)
    })

    test('can clear already empty leaderboard', () => {
      service.clearAll()

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(0)
    })

    test('removes data from localStorage', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      service.clearAll()

      const data = localStorage.getItem('roguelike_leaderboard')
      expect(data).toBeNull()
    })
  })

  describe('getCount', () => {
    test('returns 0 for empty leaderboard', () => {
      expect(service.getCount()).toBe(0)
    })

    test('returns correct count after adding entries', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })
      const entry3 = createMockEntry({ id: 'entry-3' })

      service.addEntry(entry1)
      expect(service.getCount()).toBe(1)

      service.addEntry(entry2)
      expect(service.getCount()).toBe(2)

      service.addEntry(entry3)
      expect(service.getCount()).toBe(3)
    })

    test('returns correct count after deleting entries', () => {
      const entry1 = createMockEntry({ id: 'entry-1' })
      const entry2 = createMockEntry({ id: 'entry-2' })

      service.addEntry(entry1)
      service.addEntry(entry2)
      expect(service.getCount()).toBe(2)

      service.deleteEntry('entry-1')
      expect(service.getCount()).toBe(1)

      service.deleteEntry('entry-2')
      expect(service.getCount()).toBe(0)
    })
  })
})
