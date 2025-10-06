import { LeaderboardStorageService } from './LeaderboardStorageService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD STORAGE SERVICE TESTS - Export/Import
// ============================================================================

describe('LeaderboardStorageService - Export/Import', () => {
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

  describe('exportToJSON', () => {
    test('exports empty leaderboard', () => {
      const json = service.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed).toEqual([])
    })

    test('exports single entry as valid JSON', () => {
      const entry = createMockEntry({ id: 'entry-1', score: 5000 })
      service.addEntry(entry)

      const json = service.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe('entry-1')
      expect(parsed[0].score).toBe(5000)
    })

    test('exports multiple entries as JSON array', () => {
      const entry1 = createMockEntry({ id: 'entry-1', score: 3000 })
      const entry2 = createMockEntry({ id: 'entry-2', score: 2000 })
      const entry3 = createMockEntry({ id: 'entry-3', score: 1000 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const json = service.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed).toHaveLength(3)
      expect(Array.isArray(parsed)).toBe(true)
    })

    test('exports formatted JSON with indentation', () => {
      const entry = createMockEntry({ id: 'entry-1' })
      service.addEntry(entry)

      const json = service.exportToJSON()

      // Check for formatting (should have newlines and spaces)
      expect(json).toContain('\n')
      expect(json).toContain('  ')
    })

    test('preserves all entry data in export', () => {
      const entry = createMockEntry({
        id: 'full-entry',
        gameId: 'game-123',
        seed: 'seed-abc',
        isVictory: true,
        score: 15430,
        achievements: ['Achievement 1', 'Achievement 2'],
        finalEquipment: {
          weapon: 'Long Sword +2',
          armor: 'Plate Mail +1',
          lightSource: 'Phial of Galadriel',
          rings: ['Ring of Regeneration'],
        },
      })

      service.addEntry(entry)

      const json = service.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed[0]).toEqual(entry)
    })

    test('exports entries sorted by score descending', () => {
      const entry1 = createMockEntry({ id: 'low', score: 1000 })
      const entry2 = createMockEntry({ id: 'high', score: 5000 })
      const entry3 = createMockEntry({ id: 'med', score: 3000 })

      service.addEntry(entry1)
      service.addEntry(entry2)
      service.addEntry(entry3)

      const json = service.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed[0].id).toBe('high')
      expect(parsed[1].id).toBe('med')
      expect(parsed[2].id).toBe('low')
    })
  })

  describe('importFromJSON', () => {
    test('imports valid JSON with single entry', () => {
      const entry = createMockEntry({ id: 'imported-1', score: 5000 })
      const json = JSON.stringify([entry])

      const result = service.importFromJSON(json)

      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(0)

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('imported-1')
    })

    test('imports multiple entries', () => {
      const entries = [
        createMockEntry({ id: 'import-1', score: 3000 }),
        createMockEntry({ id: 'import-2', score: 2000 }),
        createMockEntry({ id: 'import-3', score: 1000 }),
      ]
      const json = JSON.stringify(entries)

      const result = service.importFromJSON(json)

      expect(result.imported).toBe(3)
      expect(result.skipped).toBe(0)

      const retrieved = service.getAllEntries()
      expect(retrieved).toHaveLength(3)
    })

    test('merges imported entries with existing entries', () => {
      // Add existing entry
      const existing = createMockEntry({ id: 'existing-1', score: 5000 })
      service.addEntry(existing)

      // Import new entries
      const toImport = [
        createMockEntry({ id: 'import-1', score: 4000 }),
        createMockEntry({ id: 'import-2', score: 3000 }),
      ]
      const json = JSON.stringify(toImport)

      const result = service.importFromJSON(json)

      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(3) // 1 existing + 2 imported
    })

    test('skips duplicate entries by ID', () => {
      // Add existing entry
      const existing = createMockEntry({ id: 'duplicate-1', score: 5000 })
      service.addEntry(existing)

      // Try to import same entry (by ID)
      const toImport = [
        createMockEntry({ id: 'duplicate-1', score: 9999 }), // Same ID, different score
        createMockEntry({ id: 'new-1', score: 3000 }),
      ]
      const json = JSON.stringify(toImport)

      const result = service.importFromJSON(json)

      expect(result.imported).toBe(1) // Only new-1
      expect(result.skipped).toBe(1) // duplicate-1 skipped

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(2)

      // Original entry should be unchanged
      const original = entries.find((e) => e.id === 'duplicate-1')
      expect(original?.score).toBe(5000) // Not 9999
    })

    test('throws error for invalid JSON', () => {
      const invalidJson = 'not valid json{'

      expect(() => service.importFromJSON(invalidJson)).toThrow('Import failed')
    })

    test('throws error for non-array JSON', () => {
      const json = JSON.stringify({ notAnArray: 'value' })

      expect(() => service.importFromJSON(json)).toThrow('Import failed')
    })

    test('sorts entries after import', () => {
      const toImport = [
        createMockEntry({ id: 'import-1', score: 1000 }),
        createMockEntry({ id: 'import-2', score: 5000 }),
        createMockEntry({ id: 'import-3', score: 3000 }),
      ]
      const json = JSON.stringify(toImport)

      service.importFromJSON(json)

      const entries = service.getAllEntries()
      expect(entries[0].score).toBe(5000)
      expect(entries[1].score).toBe(3000)
      expect(entries[2].score).toBe(1000)
    })

    test('preserves all fields during import', () => {
      const fullEntry = createMockEntry({
        id: 'full-import',
        gameId: 'game-456',
        timestamp: 1234567890,
        seed: 'seed-xyz',
        isVictory: true,
        score: 20000,
        achievements: ['Achievement A', 'Achievement B'],
        finalEquipment: {
          weapon: 'Excalibur +5',
          armor: 'Dragon Scale +3',
          lightSource: 'Star of Eärendil',
          rings: ['Ring of Power', 'Ring of Wisdom'],
        },
        scorePerTurn: 20.5,
        killsPerLevel: 10.2,
      })

      const json = JSON.stringify([fullEntry])
      service.importFromJSON(json)

      const retrieved = service.getEntry('full-import')
      expect(retrieved).toEqual(fullEntry)
    })
  })

  describe('export/import round-trip', () => {
    test('can export and re-import without data loss', () => {
      // Add original entries
      const entries = [
        createMockEntry({ id: 'e1', score: 5000, isVictory: true }),
        createMockEntry({
          id: 'e2',
          score: 3000,
          isVictory: false,
          deathCause: 'Killed by Dragon',
        }),
        createMockEntry({ id: 'e3', score: 4000, achievements: ['Test'] }),
      ]

      entries.forEach((e) => service.addEntry(e))

      // Export
      const json = service.exportToJSON()

      // Clear and import
      service.clearAll()
      const result = service.importFromJSON(json)

      expect(result.imported).toBe(3)
      expect(result.skipped).toBe(0)

      // Verify all data preserved
      const retrieved = service.getAllEntries()
      expect(retrieved).toHaveLength(3)
      expect(retrieved.map((e) => e.id).sort()).toEqual(['e1', 'e2', 'e3'])
    })

    test('can import exported data from another service instance', () => {
      // Service 1: Create and export
      const service1 = new LeaderboardStorageService()
      const entry = createMockEntry({ id: 'cross-service', score: 7500 })
      service1.addEntry(entry)
      const exported = service1.exportToJSON()

      // Service 2: Import
      const service2 = new LeaderboardStorageService()
      service2.importFromJSON(exported)

      const retrieved = service2.getEntry('cross-service')
      expect(retrieved?.score).toBe(7500)
    })

    test('handles multiple export/import cycles', () => {
      const original = createMockEntry({ id: 'cycle-test', score: 12000 })
      service.addEntry(original)

      // Cycle 1
      let json = service.exportToJSON()
      service.clearAll()
      service.importFromJSON(json)

      // Cycle 2
      json = service.exportToJSON()
      service.clearAll()
      service.importFromJSON(json)

      // Cycle 3
      json = service.exportToJSON()
      service.clearAll()
      service.importFromJSON(json)

      const retrieved = service.getEntry('cycle-test')
      expect(retrieved).toEqual(original)
    })
  })
})
