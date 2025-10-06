import { LeaderboardService } from './LeaderboardService'
import {
  LeaderboardEntry,
  LeaderboardFilters,
  DEFAULT_LEADERBOARD_FILTERS,
} from '@game/core/core'

// ============================================================================
// LEADERBOARD SERVICE TESTS - Filtering and Sorting
// ============================================================================

describe('LeaderboardService - Filtering', () => {
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

  describe('outcome filtering', () => {
    test('returns all entries when outcome is "all"', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'v1', isVictory: true }),
        createMockEntry({ id: 'd1', isVictory: false }),
        createMockEntry({ id: 'v2', isVictory: true }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        outcome: 'all',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(3)
    })

    test('returns only victories when outcome is "victories"', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'v1', isVictory: true }),
        createMockEntry({ id: 'd1', isVictory: false }),
        createMockEntry({ id: 'v2', isVictory: true }),
        createMockEntry({ id: 'd2', isVictory: false }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        outcome: 'victories',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.every((e) => e.isVictory)).toBe(true)
    })

    test('returns only deaths when outcome is "deaths"', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'v1', isVictory: true }),
        createMockEntry({ id: 'd1', isVictory: false }),
        createMockEntry({ id: 'v2', isVictory: true }),
        createMockEntry({ id: 'd2', isVictory: false }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        outcome: 'deaths',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.every((e) => !e.isVictory)).toBe(true)
    })
  })

  describe('date range filtering', () => {
    test('returns all entries for "all-time"', () => {
      const now = Date.now()
      const entries: LeaderboardEntry[] = [
        createMockEntry({ timestamp: now - 1000 * 60 * 60 * 24 * 30 }), // 30 days ago
        createMockEntry({ timestamp: now - 1000 * 60 * 60 * 24 * 7 }), // 7 days ago
        createMockEntry({ timestamp: now }), // now
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        dateRange: 'all-time',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(3)
    })

    test('returns only last 7 days for "last-7-days"', () => {
      const now = Date.now()
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'old', timestamp: now - 1000 * 60 * 60 * 24 * 8 }), // 8 days ago
        createMockEntry({ id: 'recent1', timestamp: now - 1000 * 60 * 60 * 24 * 6 }), // 6 days ago
        createMockEntry({ id: 'recent2', timestamp: now - 1000 * 60 * 60 * 24 * 1 }), // 1 day ago
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        dateRange: 'last-7-days',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'old')).toBeUndefined()
    })

    test('returns only last 30 days for "last-30-days"', () => {
      const now = Date.now()
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'old', timestamp: now - 1000 * 60 * 60 * 24 * 31 }), // 31 days ago
        createMockEntry({ id: 'recent1', timestamp: now - 1000 * 60 * 60 * 24 * 29 }), // 29 days ago
        createMockEntry({ id: 'recent2', timestamp: now - 1000 * 60 * 60 * 24 * 1 }), // 1 day ago
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        dateRange: 'last-30-days',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'old')).toBeUndefined()
    })

    test('filters by custom date range', () => {
      const now = Date.now()
      const startDate = now - 1000 * 60 * 60 * 24 * 10 // 10 days ago
      const endDate = now - 1000 * 60 * 60 * 24 * 5 // 5 days ago

      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'before', timestamp: now - 1000 * 60 * 60 * 24 * 11 }),
        createMockEntry({ id: 'in-range1', timestamp: now - 1000 * 60 * 60 * 24 * 9 }),
        createMockEntry({ id: 'in-range2', timestamp: now - 1000 * 60 * 60 * 24 * 6 }),
        createMockEntry({ id: 'after', timestamp: now - 1000 * 60 * 60 * 24 * 4 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        dateRange: 'custom',
        customDateStart: startDate,
        customDateEnd: endDate,
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'in-range1')).toBeDefined()
      expect(result.find((e) => e.id === 'in-range2')).toBeDefined()
    })
  })

  describe('score and level filtering', () => {
    test('filters by minimum score', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'low', score: 500 }),
        createMockEntry({ id: 'med', score: 1500 }),
        createMockEntry({ id: 'high', score: 2500 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        minScore: 1000,
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'low')).toBeUndefined()
    })

    test('filters by minimum level', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'low', finalLevel: 3 }),
        createMockEntry({ id: 'med', finalLevel: 6 }),
        createMockEntry({ id: 'high', finalLevel: 10 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        minLevel: 5,
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'low')).toBeUndefined()
    })
  })

  describe('seed filtering', () => {
    test('filters by specific seed', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'seed1-1', seed: 'seed-123' }),
        createMockEntry({ id: 'seed2-1', seed: 'seed-456' }),
        createMockEntry({ id: 'seed1-2', seed: 'seed-123' }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        seed: 'seed-123',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result.every((e) => e.seed === 'seed-123')).toBe(true)
    })
  })

  describe('sorting', () => {
    test('sorts by score descending (default)', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', score: 1500 }),
        createMockEntry({ id: 'low', score: 500 }),
        createMockEntry({ id: 'high', score: 2500 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'score',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('high')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('low')
    })

    test('sorts by score ascending', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', score: 1500 }),
        createMockEntry({ id: 'low', score: 500 }),
        createMockEntry({ id: 'high', score: 2500 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'score',
        sortOrder: 'asc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('low')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('high')
    })

    test('sorts by date descending (most recent first)', () => {
      const now = Date.now()
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'old', timestamp: now - 1000 }),
        createMockEntry({ id: 'newest', timestamp: now }),
        createMockEntry({ id: 'older', timestamp: now - 2000 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'date',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('newest')
      expect(result[1].id).toBe('old')
      expect(result[2].id).toBe('older')
    })

    test('sorts by turns', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', totalTurns: 500 }),
        createMockEntry({ id: 'fast', totalTurns: 200 }),
        createMockEntry({ id: 'slow', totalTurns: 1000 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'turns',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('slow')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('fast')
    })

    test('sorts by level', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', finalLevel: 5 }),
        createMockEntry({ id: 'low', finalLevel: 2 }),
        createMockEntry({ id: 'high', finalLevel: 10 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'level',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('high')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('low')
    })

    test('sorts by gold', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', totalGold: 500 }),
        createMockEntry({ id: 'poor', totalGold: 100 }),
        createMockEntry({ id: 'rich', totalGold: 2000 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'gold',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('rich')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('poor')
    })

    test('sorts by kills', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'med', monstersKilled: 20 }),
        createMockEntry({ id: 'low', monstersKilled: 5 }),
        createMockEntry({ id: 'high', monstersKilled: 50 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'kills',
        sortOrder: 'desc',
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result[0].id).toBe('high')
      expect(result[1].id).toBe('med')
      expect(result[2].id).toBe('low')
    })
  })

  describe('pagination', () => {
    test('returns limited number of entries', () => {
      const entries: LeaderboardEntry[] = Array.from({ length: 50 }, (_, i) =>
        createMockEntry({ id: `entry-${i}`, score: i })
      )

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        limit: 10,
        offset: 0,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(10)
    })

    test('returns entries from offset', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'entry-0', score: 100 }),
        createMockEntry({ id: 'entry-1', score: 90 }),
        createMockEntry({ id: 'entry-2', score: 80 }),
        createMockEntry({ id: 'entry-3', score: 70 }),
        createMockEntry({ id: 'entry-4', score: 60 }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'score',
        sortOrder: 'desc',
        limit: 2,
        offset: 2,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('entry-2')
      expect(result[1].id).toBe('entry-3')
    })

    test('handles offset beyond array length', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'entry-0' }),
        createMockEntry({ id: 'entry-1' }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        limit: 10,
        offset: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(0)
    })
  })

  describe('combined filtering', () => {
    test('applies multiple filters together', () => {
      const now = Date.now()
      const entries: LeaderboardEntry[] = [
        createMockEntry({
          id: 'match',
          isVictory: true,
          score: 2000,
          timestamp: now - 1000 * 60 * 60 * 24 * 5, // 5 days ago
        }),
        createMockEntry({
          id: 'no-match-death',
          isVictory: false,
          score: 2000,
          timestamp: now - 1000 * 60 * 60 * 24 * 5,
        }),
        createMockEntry({
          id: 'no-match-score',
          isVictory: true,
          score: 500,
          timestamp: now - 1000 * 60 * 60 * 24 * 5,
        }),
        createMockEntry({
          id: 'no-match-date',
          isVictory: true,
          score: 2000,
          timestamp: now - 1000 * 60 * 60 * 24 * 10,
        }),
      ]

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        outcome: 'victories',
        dateRange: 'last-7-days',
        minScore: 1000,
        limit: 10,
      }

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('match')
    })
  })

  describe('edge cases', () => {
    test('handles empty entries array', () => {
      const entries: LeaderboardEntry[] = []
      const filters: LeaderboardFilters = DEFAULT_LEADERBOARD_FILTERS

      const result = service.filterEntries(entries, filters)
      expect(result).toHaveLength(0)
    })

    test('does not mutate original entries array', () => {
      const entries: LeaderboardEntry[] = [
        createMockEntry({ id: 'entry-1', score: 100 }),
        createMockEntry({ id: 'entry-2', score: 200 }),
      ]
      const originalLength = entries.length
      const originalOrder = entries.map((e) => e.id)

      const filters: LeaderboardFilters = {
        ...DEFAULT_LEADERBOARD_FILTERS,
        sortBy: 'score',
        sortOrder: 'desc',
      }

      service.filterEntries(entries, filters)

      expect(entries).toHaveLength(originalLength)
      expect(entries.map((e) => e.id)).toEqual(originalOrder)
    })
  })
})
