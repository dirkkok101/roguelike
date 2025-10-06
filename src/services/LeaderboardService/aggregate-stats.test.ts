import { LeaderboardService } from './LeaderboardService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD SERVICE TESTS - Aggregate Statistics
// ============================================================================

describe('LeaderboardService - Aggregate Statistics', () => {
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
      isVictory: false,
      score: 1000,
      deathCause: 'Killed by Orc',
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

  describe('empty entries', () => {
    test('returns zero stats for empty array', () => {
      const stats = service.calculateAggregateStats([])

      expect(stats.totalGamesPlayed).toBe(0)
      expect(stats.totalVictories).toBe(0)
      expect(stats.totalDeaths).toBe(0)
      expect(stats.winRate).toBe(0)
      expect(stats.highestScore).toBe(0)
      expect(stats.highestScoringRun).toBeNull()
      expect(stats.fastestVictory).toBeNull()
      expect(stats.highestScorePerTurn).toBeNull()
    })
  })

  describe('overview statistics', () => {
    test('calculates total games played', () => {
      const entries = [
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: false }),
        createMockEntry({ isVictory: true }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.totalGamesPlayed).toBe(3)
    })

    test('calculates victories and deaths correctly', () => {
      const entries = [
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: false }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.totalVictories).toBe(2)
      expect(stats.totalDeaths).toBe(1)
    })

    test('calculates win rate percentage', () => {
      const entries = [
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: false }),
        createMockEntry({ isVictory: false }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.winRate).toBe(50) // 2/4 = 50%
    })

    test('handles 100% win rate', () => {
      const entries = [
        createMockEntry({ isVictory: true }),
        createMockEntry({ isVictory: true }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.winRate).toBe(100)
    })

    test('handles 0% win rate', () => {
      const entries = [
        createMockEntry({ isVictory: false }),
        createMockEntry({ isVictory: false }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.winRate).toBe(0)
    })
  })

  describe('high score statistics', () => {
    test('finds highest score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 5000 }),
        createMockEntry({ score: 3000 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.highestScore).toBe(5000)
    })

    test('returns highest scoring run entry', () => {
      const entries = [
        createMockEntry({ id: 'low', score: 1000 }),
        createMockEntry({ id: 'high', score: 5000 }),
        createMockEntry({ id: 'med', score: 3000 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.highestScoringRun?.id).toBe('high')
    })
  })

  describe('exploration statistics', () => {
    test('finds deepest level ever reached', () => {
      const entries = [
        createMockEntry({ deepestLevel: 5 }),
        createMockEntry({ deepestLevel: 10 }),
        createMockEntry({ deepestLevel: 7 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.deepestLevelEverReached).toBe(10)
    })

    test('calculates total turns across all runs', () => {
      const entries = [
        createMockEntry({ totalTurns: 500 }),
        createMockEntry({ totalTurns: 1000 }),
        createMockEntry({ totalTurns: 300 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.totalTurnsAcrossAllRuns).toBe(1800)
    })

    test('calculates average turns per run', () => {
      const entries = [
        createMockEntry({ totalTurns: 400 }),
        createMockEntry({ totalTurns: 600 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.averageTurnsPerRun).toBe(500)
    })
  })

  describe('combat statistics', () => {
    test('calculates total monsters killed', () => {
      const entries = [
        createMockEntry({ monstersKilled: 20 }),
        createMockEntry({ monstersKilled: 50 }),
        createMockEntry({ monstersKilled: 30 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.totalMonstersKilled).toBe(100)
    })

    test('finds most kills in single run', () => {
      const entries = [
        createMockEntry({ monstersKilled: 20 }),
        createMockEntry({ monstersKilled: 75 }),
        createMockEntry({ monstersKilled: 30 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.mostKillsInSingleRun).toBe(75)
    })
  })

  describe('efficiency statistics', () => {
    test('finds fastest victory by turn count', () => {
      const entries = [
        createMockEntry({ id: 'v1', isVictory: true, totalTurns: 1000 }),
        createMockEntry({ id: 'v2', isVictory: true, totalTurns: 500 }),
        createMockEntry({ id: 'd1', isVictory: false, totalTurns: 200 }), // Death, not counted
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.fastestVictory?.id).toBe('v2')
      expect(stats.fastestVictory?.totalTurns).toBe(500)
    })

    test('returns null for fastest victory when no victories', () => {
      const entries = [
        createMockEntry({ isVictory: false, totalTurns: 500 }),
        createMockEntry({ isVictory: false, totalTurns: 1000 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.fastestVictory).toBeNull()
    })

    test('finds highest score per turn efficiency', () => {
      const entries = [
        createMockEntry({ id: 'low', scorePerTurn: 2 }),
        createMockEntry({ id: 'high', scorePerTurn: 10 }),
        createMockEntry({ id: 'med', scorePerTurn: 5 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.highestScorePerTurn?.id).toBe('high')
    })
  })

  describe('progression statistics', () => {
    test('calculates average score', () => {
      const entries = [
        createMockEntry({ score: 1000 }),
        createMockEntry({ score: 2000 }),
        createMockEntry({ score: 3000 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.averageScore).toBe(2000)
    })

    test('calculates average final level', () => {
      const entries = [
        createMockEntry({ finalLevel: 5 }),
        createMockEntry({ finalLevel: 7 }),
        createMockEntry({ finalLevel: 9 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.averageFinalLevel).toBeCloseTo(7, 1)
    })

    test('calculates total gold collected', () => {
      const entries = [
        createMockEntry({ totalGold: 500 }),
        createMockEntry({ totalGold: 1000 }),
        createMockEntry({ totalGold: 750 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.totalGoldCollected).toBe(2250)
    })
  })

  describe('recent performance statistics', () => {
    test('calculates recent win rate from last 10 runs', () => {
      // Create 15 entries, last 10 should have 5 victories
      const entries = [
        ...Array.from({ length: 5 }, (_, i) =>
          createMockEntry({ id: `old-${i}`, isVictory: false, timestamp: i })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockEntry({
            id: `recent-${i}`,
            isVictory: i % 2 === 0, // Every other one is victory (5 total)
            timestamp: 1000 + i,
          })
        ),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.recentWinRate).toBe(50) // 5/10 = 50%
    })

    test('calculates recent average score from last 10 runs', () => {
      const entries = [
        ...Array.from({ length: 5 }, (_, i) =>
          createMockEntry({ id: `old-${i}`, score: 1000, timestamp: i })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockEntry({ id: `recent-${i}`, score: 2000, timestamp: 1000 + i })
        ),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.recentAverageScore).toBe(2000)
    })

    test('uses all entries when less than 10 total', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: true, score: 1000 }),
        createMockEntry({ id: 'e2', isVictory: false, score: 500 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.recentWinRate).toBe(50)
      expect(stats.recentAverageScore).toBe(750)
    })
  })

  describe('streak statistics', () => {
    test('calculates current win streak', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: false, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: true, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: true, timestamp: 3 }),
        createMockEntry({ id: 'e4', isVictory: true, timestamp: 4 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.currentWinStreak).toBe(3)
    })

    test('calculates longest win streak', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: true, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: true, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: true, timestamp: 3 }),
        createMockEntry({ id: 'e4', isVictory: false, timestamp: 4 }),
        createMockEntry({ id: 'e5', isVictory: true, timestamp: 5 }),
        createMockEntry({ id: 'e6', isVictory: true, timestamp: 6 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.longestWinStreak).toBe(3)
      expect(stats.currentWinStreak).toBe(2)
    })

    test('calculates current death streak', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: true, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: false, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: false, timestamp: 3 }),
        createMockEntry({ id: 'e4', isVictory: false, timestamp: 4 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.currentDeathStreak).toBe(3)
    })

    test('handles all victories streak', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: true, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: true, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: true, timestamp: 3 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.currentWinStreak).toBe(3)
      expect(stats.longestWinStreak).toBe(3)
      expect(stats.currentDeathStreak).toBe(0)
    })

    test('handles all deaths streak', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: false, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: false, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: false, timestamp: 3 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.currentWinStreak).toBe(0)
      expect(stats.longestWinStreak).toBe(0)
      expect(stats.currentDeathStreak).toBe(3)
    })

    test('resets streaks correctly', () => {
      const entries = [
        createMockEntry({ id: 'e1', isVictory: true, timestamp: 1 }),
        createMockEntry({ id: 'e2', isVictory: false, timestamp: 2 }),
        createMockEntry({ id: 'e3', isVictory: true, timestamp: 3 }),
      ]

      const stats = service.calculateAggregateStats(entries)
      expect(stats.currentWinStreak).toBe(1)
      expect(stats.currentDeathStreak).toBe(0)
    })
  })
})
