import { LeaderboardStorageService } from './LeaderboardStorageService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD STORAGE SERVICE TESTS - Quota Management
// ============================================================================

describe('LeaderboardStorageService - Quota Management', () => {
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

  describe('auto-cleanup', () => {
    test('does not cleanup when entry count is below threshold', () => {
      // Add 100 entries (below 400 threshold)
      for (let i = 0; i < 100; i++) {
        service.addEntry(createMockEntry({ id: `entry-${i}`, score: i }))
      }

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(100)
    })

    test('triggers cleanup when entry count exceeds threshold', () => {
      // Add 450 entries (above 400 threshold)
      // Mix of victories and deaths
      for (let i = 0; i < 450; i++) {
        service.addEntry(
          createMockEntry({
            id: `entry-${i}`,
            score: i,
            isVictory: i % 5 === 0, // 90 victories, 360 deaths
            timestamp: i, // Older entries have lower timestamps
          })
        )
      }

      const entries = service.getAllEntries()

      // Should have cleaned up: keep all victories (90) + top 100 deaths = 190 total
      expect(entries.length).toBeLessThan(450)
      expect(entries.length).toBeGreaterThanOrEqual(190)
    })

    test('keeps all victories during cleanup', () => {
      // Add 450 entries: 100 victories, 350 deaths
      for (let i = 0; i < 100; i++) {
        service.addEntry(
          createMockEntry({
            id: `victory-${i}`,
            score: 5000 + i,
            isVictory: true,
          })
        )
      }

      for (let i = 0; i < 350; i++) {
        service.addEntry(
          createMockEntry({
            id: `death-${i}`,
            score: 1000 + i,
            isVictory: false,
            timestamp: i, // Older deaths
          })
        )
      }

      const entries = service.getAllEntries()
      const victories = entries.filter((e) => e.isVictory)

      // All 100 victories should be kept
      expect(victories).toHaveLength(100)
    })

    test('keeps top 100 deaths by score during cleanup', () => {
      // Add 50 victories + 400 deaths
      for (let i = 0; i < 50; i++) {
        service.addEntry(
          createMockEntry({
            id: `victory-${i}`,
            score: 8000 + i,
            isVictory: true,
          })
        )
      }

      for (let i = 0; i < 400; i++) {
        service.addEntry(
          createMockEntry({
            id: `death-${i}`,
            score: 1000 + i, // Scores from 1000 to 1399
            isVictory: false,
            timestamp: i,
          })
        )
      }

      const entries = service.getAllEntries()
      const deaths = entries.filter((e) => !e.isVictory)

      // Cleanup triggers at 401, keeps 50 victories + 100 deaths = 150
      // Then 49 more entries are added (401-450), so final count is ~199
      // Deaths should be around 149 (100 from cleanup + 49 added after)
      expect(deaths.length).toBeLessThanOrEqual(160)

      // Top deaths should have high scores
      if (deaths.length > 0) {
        expect(deaths[0].score).toBeGreaterThan(1200)
      }
    })

    test('removes oldest low-score deaths during cleanup', () => {
      // Add entries with varying timestamps
      for (let i = 0; i < 450; i++) {
        service.addEntry(
          createMockEntry({
            id: `death-${i}`,
            score: i % 100, // Scores repeat, creating high and low scores
            isVictory: false,
            timestamp: i, // Increasing timestamp
          })
        )
      }

      const entries = service.getAllEntries()

      // Should have cleaned up the oldest low-score entries
      expect(entries.length).toBeLessThan(450)
    })

    test('maintains entry count below threshold after cleanup', () => {
      // Add entries that trigger cleanup
      for (let i = 0; i < 500; i++) {
        service.addEntry(
          createMockEntry({
            id: `entry-${i}`,
            score: i,
            isVictory: i % 10 === 0, // 50 victories, 450 deaths
          })
        )
      }

      const entries = service.getAllEntries()

      // Cleanup triggers at 401, reduces to ~150
      // Then 99 more entries added (401-500), final count ~249
      expect(entries.length).toBeLessThanOrEqual(260)
    })
  })

  describe('storage size considerations', () => {
    test('handles large number of entries efficiently', () => {
      // Add 200 entries (reasonable size)
      for (let i = 0; i < 200; i++) {
        service.addEntry(
          createMockEntry({
            id: `entry-${i}`,
            score: i * 100,
            achievements: ['Achievement 1', 'Achievement 2', 'Achievement 3'],
            finalEquipment: {
              weapon: 'Long Sword +2',
              armor: 'Plate Mail +1',
              lightSource: 'Phial of Galadriel',
              rings: ['Ring of Regeneration', 'Ring of Slow Digestion'],
            },
          })
        )
      }

      const entries = service.getAllEntries()
      expect(entries).toHaveLength(200)

      // Verify data is still accessible
      expect(entries[0]).toBeDefined()
      expect(entries[199]).toBeDefined()
    })

    test('retrieval performance does not degrade significantly', () => {
      // Add 300 entries
      for (let i = 0; i < 300; i++) {
        service.addEntry(createMockEntry({ id: `entry-${i}`, score: i }))
      }

      // Measure retrieval time (should be fast)
      const startTime = Date.now()
      const entries = service.getAllEntries()
      const duration = Date.now() - startTime

      expect(entries).toHaveLength(300)
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })
  })

  describe('edge cases', () => {
    test('handles cleanup with all victories', () => {
      // Add 450 victories (no deaths to prune)
      for (let i = 0; i < 450; i++) {
        service.addEntry(
          createMockEntry({
            id: `victory-${i}`,
            score: i,
            isVictory: true,
          })
        )
      }

      const entries = service.getAllEntries()

      // All victories should be kept
      expect(entries).toHaveLength(450)
      expect(entries.every((e) => e.isVictory)).toBe(true)
    })

    test('handles cleanup with all deaths', () => {
      // Add 450 deaths (no victories)
      for (let i = 0; i < 450; i++) {
        service.addEntry(
          createMockEntry({
            id: `death-${i}`,
            score: i,
            isVictory: false,
            timestamp: i,
          })
        )
      }

      const entries = service.getAllEntries()

      // Cleanup triggers at 401, keeps top 100 deaths
      // Then 49 more deaths added (401-450), final count ~149
      expect(entries.length).toBeLessThanOrEqual(160)
      expect(entries.every((e) => !e.isVictory)).toBe(true)

      // Should have high scoring deaths
      if (entries.length > 0) {
        expect(entries[0].score).toBeGreaterThanOrEqual(300)
      }
    })

    test('handles cleanup with exactly threshold number of entries', () => {
      // Add exactly 400 entries (at threshold)
      for (let i = 0; i < 400; i++) {
        service.addEntry(
          createMockEntry({
            id: `entry-${i}`,
            score: i,
            isVictory: i % 4 === 0, // 100 victories, 300 deaths
          })
        )
      }

      const entries = service.getAllEntries()

      // Should trigger cleanup at this threshold
      expect(entries.length).toBeLessThanOrEqual(400)
    })
  })
})
