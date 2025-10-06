import { LeaderboardStorageService } from './LeaderboardStorageService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD STORAGE SERVICE TESTS - Serialization
// ============================================================================

describe('LeaderboardStorageService - Serialization', () => {
  let service: LeaderboardStorageService

  beforeEach(() => {
    service = new LeaderboardStorageService()
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

  describe('JSON serialization', () => {
    test('serializes entry with all fields', () => {
      const entry = createMockEntry({
        id: 'entry-1',
        isVictory: true,
        deathCause: null,
        epitaph: null,
        achievements: ['Achievement 1', 'Achievement 2'],
        finalEquipment: {
          weapon: 'Long Sword +2',
          armor: 'Plate Mail +1',
          lightSource: 'Torch',
          rings: ['Ring of Regeneration'],
        },
      })

      service.addEntry(entry)

      const json = localStorage.getItem('roguelike_leaderboard')
      expect(json).toBeTruthy()

      const parsed = JSON.parse(json!)
      expect(parsed).toBeInstanceOf(Array)
      expect(parsed[0].id).toBe('entry-1')
      expect(parsed[0].achievements).toEqual(['Achievement 1', 'Achievement 2'])
      expect(parsed[0].finalEquipment.weapon).toBe('Long Sword +2')
    })

    test('serializes death entry with death details', () => {
      const entry = createMockEntry({
        id: 'death-1',
        isVictory: false,
        deathCause: 'Killed by Dragon',
        epitaph: 'Here lies a brave adventurer',
      })

      service.addEntry(entry)

      const json = localStorage.getItem('roguelike_leaderboard')
      const parsed = JSON.parse(json!)

      expect(parsed[0].isVictory).toBe(false)
      expect(parsed[0].deathCause).toBe('Killed by Dragon')
      expect(parsed[0].epitaph).toBe('Here lies a brave adventurer')
    })

    test('deserializes entry correctly', () => {
      const originalEntry = createMockEntry({
        id: 'entry-1',
        score: 5000,
        finalLevel: 10,
        achievements: ['Test Achievement'],
      })

      service.addEntry(originalEntry)

      // Create new service to test deserialization
      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('entry-1')
      expect(entries[0].score).toBe(5000)
      expect(entries[0].finalLevel).toBe(10)
      expect(entries[0].achievements).toEqual(['Test Achievement'])
    })

    test('handles empty arrays in serialization', () => {
      const entry = createMockEntry({
        achievements: [],
        finalEquipment: {
          weapon: 'None',
          armor: 'None',
          lightSource: 'None',
          rings: [],
        },
      })

      service.addEntry(entry)

      const json = localStorage.getItem('roguelike_leaderboard')
      const parsed = JSON.parse(json!)

      expect(parsed[0].achievements).toEqual([])
      expect(parsed[0].finalEquipment.rings).toEqual([])
    })

    test('handles optional fields correctly', () => {
      const entry = createMockEntry({
        scorePerTurn: undefined,
        killsPerLevel: undefined,
        finalEquipment: undefined,
      })

      service.addEntry(entry)

      const json = localStorage.getItem('roguelike_leaderboard')
      const parsed = JSON.parse(json!)

      // Optional fields should be preserved as undefined or missing
      expect(parsed[0]).toBeDefined()
    })

    test('handles special characters in strings', () => {
      const entry = createMockEntry({
        deathCause: 'Killed by "Dragon" with <fire>',
        epitaph: 'Test & special chars: @#$%',
        seed: 'seed-!@#$%^&*()',
      })

      service.addEntry(entry)

      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries[0].deathCause).toBe('Killed by "Dragon" with <fire>')
      expect(entries[0].epitaph).toBe('Test & special chars: @#$%')
      expect(entries[0].seed).toBe('seed-!@#$%^&*()')
    })

    test('handles large numbers correctly', () => {
      const entry = createMockEntry({
        timestamp: 1234567890123,
        score: 999999,
        totalTurns: 100000,
        totalGold: 50000,
      })

      service.addEntry(entry)

      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries[0].timestamp).toBe(1234567890123)
      expect(entries[0].score).toBe(999999)
      expect(entries[0].totalTurns).toBe(100000)
      expect(entries[0].totalGold).toBe(50000)
    })

    test('handles decimal numbers correctly', () => {
      const entry = createMockEntry({
        scorePerTurn: 12.5678,
        killsPerLevel: 4.333,
      })

      service.addEntry(entry)

      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries[0].scorePerTurn).toBeCloseTo(12.5678, 4)
      expect(entries[0].killsPerLevel).toBeCloseTo(4.333, 3)
    })
  })

  describe('data integrity', () => {
    test('preserves all entry fields through save/load cycle', () => {
      const originalEntry = createMockEntry({
        id: 'integrity-test',
        gameId: 'game-123',
        timestamp: 1234567890,
        seed: 'seed-abc',
        isVictory: true,
        score: 15430,
        deathCause: null,
        epitaph: null,
        finalLevel: 10,
        totalXP: 8540,
        totalGold: 1250,
        deepestLevel: 10,
        levelsExplored: 10,
        totalTurns: 1234,
        monstersKilled: 45,
        itemsFound: 38,
        itemsUsed: 22,
        achievements: ['Achievement 1', 'Achievement 2', 'Achievement 3'],
        finalEquipment: {
          weapon: 'Long Sword +2',
          armor: 'Plate Mail +1',
          lightSource: 'Phial of Galadriel',
          rings: ['Ring of Regeneration', 'Ring of Slow Digestion'],
        },
        scorePerTurn: 12.5,
        killsPerLevel: 4.5,
      })

      service.addEntry(originalEntry)

      const newService = new LeaderboardStorageService()
      const retrieved = newService.getEntry('integrity-test')

      expect(retrieved).toEqual(originalEntry)
    })

    test('maintains entry order after multiple save/load cycles', () => {
      const entry1 = createMockEntry({ id: 'e1', score: 3000 })
      const entry2 = createMockEntry({ id: 'e2', score: 1000 })
      const entry3 = createMockEntry({ id: 'e3', score: 2000 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      // Cycle 1
      let newService = new LeaderboardStorageService()
      let entries = newService.getAllEntries()
      expect(entries.map((e) => e.id)).toEqual(['e1', 'e3', 'e2'])

      // Cycle 2
      newService = new LeaderboardStorageService()
      entries = newService.getAllEntries()
      expect(entries.map((e) => e.id)).toEqual(['e1', 'e3', 'e2'])
    })

    test('handles multiple entries with same timestamp', () => {
      const timestamp = Date.now()
      const entry1 = createMockEntry({ id: 'e1', timestamp, score: 2000 })
      const entry2 = createMockEntry({ id: 'e2', timestamp, score: 3000 })
      const entry3 = createMockEntry({ id: 'e3', timestamp, score: 1000 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const newService = new LeaderboardStorageService()
      const entries = newService.getAllEntries()

      expect(entries).toHaveLength(3)
      // Should be sorted by score, not timestamp
      expect(entries[0].score).toBe(3000)
      expect(entries[1].score).toBe(2000)
      expect(entries[2].score).toBe(1000)
    })
  })
})
