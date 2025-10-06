import { LeaderboardService } from './LeaderboardService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD SERVICE TESTS - Ranking and Top Scores
// ============================================================================

describe('LeaderboardService - Ranking', () => {
  let service: LeaderboardService

  beforeEach(() => {
    service = new LeaderboardService()
  })

  // Helper to create mock leaderboard entry
  const createMockEntry = (
    overrides?: Partial<LeaderboardEntry>
  ): LeaderboardEntry => {
    return {
      id: 'entry-1',
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

  describe('calculateRank', () => {
    test('calculates rank 1 for highest score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 1500 }),
      ]

      const rankInfo = service.calculateRank(2500, entries)
      expect(rankInfo.rank).toBe(1)
    })

    test('calculates correct rank for middle score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 3000 }),
      ]

      const rankInfo = service.calculateRank(1500, entries)
      expect(rankInfo.rank).toBe(3) // Better than 1000, worse than 2000 and 3000
    })

    test('calculates rank for lowest score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 3000 }),
      ]

      const rankInfo = service.calculateRank(500, entries)
      expect(rankInfo.rank).toBe(4) // Worse than all entries
    })

    test('calculates rank 1 for empty leaderboard', () => {
      const rankInfo = service.calculateRank(1000, [])
      expect(rankInfo.rank).toBe(1)
      expect(rankInfo.percentile).toBe(100)
    })

    test('calculates percentile for top score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 3000 }),
        createMockEntry({ score: 4000 }),
      ]

      const rankInfo = service.calculateRank(5000, entries)
      expect(rankInfo.rank).toBe(1)
      expect(rankInfo.percentile).toBe(100) // Top 100%
    })

    test('calculates percentile for middle score', () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createMockEntry({ score: (i + 1) * 100 })
      )

      const rankInfo = service.calculateRank(550, entries)
      // Score 550 ranks 6th: better than (100,200,300,400,500), worse than (600,700,800,900,1000)
      expect(rankInfo.rank).toBe(6)
      expect(rankInfo.percentile).toBe(50) // (10 - 6 + 1) / 10 * 100 = 50%
    })

    test('handles equal scores', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 3000 }),
      ]

      const rankInfo = service.calculateRank(2000, entries)
      expect(rankInfo.rank).toBe(2) // First position where score <= 2000
    })

    test('percentile is 100 for single entry leaderboard', () => {
      const entries = [createMockEntry({ score: 1000 })]

      const rankInfo = service.calculateRank(2000, entries)
      expect(rankInfo.percentile).toBe(100)
    })
  })

  describe('getTopScores', () => {
    test('returns top N scores sorted by score descending', () => {
      const entries = [
        createMockEntry({ id: 'e1', score: 1000 }),
        createMockEntry({ id: 'e2', score: 5000 }),
        createMockEntry({ id: 'e3', score: 3000 }),
        createMockEntry({ id: 'e4', score: 2000 }),
        createMockEntry({ id: 'e5', score: 4000 }),
      ]

      const top3 = service.getTopScores(entries, 3)

      expect(top3).toHaveLength(3)
      expect(top3[0].id).toBe('e2') // 5000
      expect(top3[1].id).toBe('e5') // 4000
      expect(top3[2].id).toBe('e3') // 3000
    })

    test('returns all entries when limit exceeds array length', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
      ]

      const top10 = service.getTopScores(entries, 10)
      expect(top10).toHaveLength(2)
    })

    test('returns empty array for empty entries', () => {
      const top10 = service.getTopScores([], 10)
      expect(top10).toHaveLength(0)
    })

    test('handles limit of 0', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
      ]

      const top0 = service.getTopScores(entries, 0)
      expect(top0).toHaveLength(0)
    })

    test('does not mutate original array', () => {
      const entries = [
        createMockEntry({ id: 'e1', score: 1000 }),
        createMockEntry({ id: 'e2', score: 2000 }),
      ]
      const originalOrder = entries.map((e) => e.id)

      service.getTopScores(entries, 2)

      expect(entries.map((e) => e.id)).toEqual(originalOrder)
    })
  })

  describe('getEntriesBySeed', () => {
    test('returns all entries for specific seed', () => {
      const entries = [
        createMockEntry({ id: 'e1', seed: 'seed-123' }),
        createMockEntry({ id: 'e2', seed: 'seed-456' }),
        createMockEntry({ id: 'e3', seed: 'seed-123' }),
        createMockEntry({ id: 'e4', seed: 'seed-789' }),
      ]

      const seedEntries = service.getEntriesBySeed(entries, 'seed-123')

      expect(seedEntries).toHaveLength(2)
      expect(seedEntries.every((e) => e.seed === 'seed-123')).toBe(true)
    })

    test('returns empty array when no entries match seed', () => {
      const entries = [
        createMockEntry({ seed: 'seed-123' }),
        createMockEntry({ seed: 'seed-456' }),
      ]

      const seedEntries = service.getEntriesBySeed(entries, 'seed-999')
      expect(seedEntries).toHaveLength(0)
    })

    test('returns empty array for empty entries', () => {
      const seedEntries = service.getEntriesBySeed([], 'seed-123')
      expect(seedEntries).toHaveLength(0)
    })

    test('preserves original order of matching entries', () => {
      const entries = [
        createMockEntry({ id: 'e1', seed: 'seed-123' }),
        createMockEntry({ id: 'e2', seed: 'seed-456' }),
        createMockEntry({ id: 'e3', seed: 'seed-123' }),
      ]

      const seedEntries = service.getEntriesBySeed(entries, 'seed-123')

      expect(seedEntries[0].id).toBe('e1')
      expect(seedEntries[1].id).toBe('e3')
    })

    test('handles seed with special characters', () => {
      const entries = [
        createMockEntry({ seed: 'seed-@#$%^&*' }),
        createMockEntry({ seed: 'seed-normal' }),
      ]

      const seedEntries = service.getEntriesBySeed(entries, 'seed-@#$%^&*')
      expect(seedEntries).toHaveLength(1)
      expect(seedEntries[0].seed).toBe('seed-@#$%^&*')
    })
  })
})
