import { LeaderboardService } from './LeaderboardService'
import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD SERVICE TESTS - Personal Bests
// ============================================================================

describe('LeaderboardService - Personal Bests', () => {
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

  describe('empty entries', () => {
    test('returns null for all bests when no entries', () => {
      const bests = service.getPersonalBests([])

      expect(bests.highestScore).toBeNull()
      expect(bests.fastestVictory).toBeNull()
      expect(bests.deepestLevel).toBeNull()
      expect(bests.mostKills).toBeNull()
    })
  })

  describe('highest score', () => {
    test('finds entry with highest score', () => {
      const entries = [
        createMockEntry({ id: 'low', score: 1000 }),
        createMockEntry({ id: 'high', score: 5000 }),
        createMockEntry({ id: 'med', score: 3000 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.highestScore?.id).toBe('high')
      expect(bests.highestScore?.score).toBe(5000)
    })

    test('handles equal highest scores (returns first found)', () => {
      const entries = [
        createMockEntry({ id: 'first', score: 5000 }),
        createMockEntry({ id: 'second', score: 5000 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.highestScore?.score).toBe(5000)
      expect(['first', 'second']).toContain(bests.highestScore?.id)
    })
  })

  describe('fastest victory', () => {
    test('finds victory with lowest turn count', () => {
      const entries = [
        createMockEntry({ id: 'v1', isVictory: true, totalTurns: 1000 }),
        createMockEntry({ id: 'v2', isVictory: true, totalTurns: 500 }),
        createMockEntry({ id: 'v3', isVictory: true, totalTurns: 1500 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.fastestVictory?.id).toBe('v2')
      expect(bests.fastestVictory?.totalTurns).toBe(500)
    })

    test('ignores deaths when finding fastest victory', () => {
      const entries = [
        createMockEntry({ id: 'v1', isVictory: true, totalTurns: 1000 }),
        createMockEntry({ id: 'd1', isVictory: false, totalTurns: 200 }), // Death - should be ignored
        createMockEntry({ id: 'v2', isVictory: true, totalTurns: 800 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.fastestVictory?.id).toBe('v2')
      expect(bests.fastestVictory?.totalTurns).toBe(800)
    })

    test('returns null when no victories exist', () => {
      const entries = [
        createMockEntry({ isVictory: false, totalTurns: 500 }),
        createMockEntry({ isVictory: false, totalTurns: 1000 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.fastestVictory).toBeNull()
    })

    test('handles single victory', () => {
      const entries = [
        createMockEntry({ id: 'only', isVictory: true, totalTurns: 1000 }),
        createMockEntry({ isVictory: false, totalTurns: 500 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.fastestVictory?.id).toBe('only')
    })
  })

  describe('deepest level', () => {
    test('finds entry with deepest level reached', () => {
      const entries = [
        createMockEntry({ id: 'shallow', deepestLevel: 3 }),
        createMockEntry({ id: 'deep', deepestLevel: 10 }),
        createMockEntry({ id: 'med', deepestLevel: 7 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.deepestLevel?.id).toBe('deep')
      expect(bests.deepestLevel?.deepestLevel).toBe(10)
    })

    test('includes both victories and deaths', () => {
      const entries = [
        createMockEntry({ id: 'v1', isVictory: true, deepestLevel: 8 }),
        createMockEntry({ id: 'd1', isVictory: false, deepestLevel: 10 }), // Death went deeper
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.deepestLevel?.id).toBe('d1')
      expect(bests.deepestLevel?.deepestLevel).toBe(10)
    })
  })

  describe('most kills', () => {
    test('finds entry with most monsters killed', () => {
      const entries = [
        createMockEntry({ id: 'low', monstersKilled: 10 }),
        createMockEntry({ id: 'high', monstersKilled: 75 }),
        createMockEntry({ id: 'med', monstersKilled: 40 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.mostKills?.id).toBe('high')
      expect(bests.mostKills?.monstersKilled).toBe(75)
    })

    test('includes both victories and deaths', () => {
      const entries = [
        createMockEntry({ id: 'v1', isVictory: true, monstersKilled: 30 }),
        createMockEntry({ id: 'd1', isVictory: false, monstersKilled: 50 }), // Death killed more
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.mostKills?.id).toBe('d1')
      expect(bests.mostKills?.monstersKilled).toBe(50)
    })

    test('handles zero kills', () => {
      const entries = [
        createMockEntry({ id: 'e1', monstersKilled: 0 }),
        createMockEntry({ id: 'e2', monstersKilled: 0 }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.mostKills?.monstersKilled).toBe(0)
    })
  })

  describe('combined personal bests', () => {
    test('returns all bests from different runs', () => {
      const entries = [
        createMockEntry({
          id: 'e1',
          score: 10000,
          isVictory: true,
          totalTurns: 2000,
          deepestLevel: 10,
          monstersKilled: 30,
        }),
        createMockEntry({
          id: 'e2',
          score: 5000,
          isVictory: true,
          totalTurns: 500, // Fastest
          deepestLevel: 8,
          monstersKilled: 20,
        }),
        createMockEntry({
          id: 'e3',
          score: 7000,
          isVictory: false,
          totalTurns: 1500,
          deepestLevel: 12, // Deepest
          monstersKilled: 60, // Most kills
        }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.highestScore?.id).toBe('e1')
      expect(bests.fastestVictory?.id).toBe('e2')
      expect(bests.deepestLevel?.id).toBe('e3')
      expect(bests.mostKills?.id).toBe('e3')
    })

    test('returns same entry for multiple bests when applicable', () => {
      const entries = [
        createMockEntry({
          id: 'perfect',
          score: 10000,
          isVictory: true,
          totalTurns: 500,
          deepestLevel: 10,
          monstersKilled: 100,
        }),
        createMockEntry({
          id: 'mediocre',
          score: 1000,
          isVictory: true,
          totalTurns: 2000,
          deepestLevel: 5,
          monstersKilled: 10,
        }),
      ]

      const bests = service.getPersonalBests(entries)

      expect(bests.highestScore?.id).toBe('perfect')
      expect(bests.fastestVictory?.id).toBe('perfect')
      expect(bests.deepestLevel?.id).toBe('perfect')
      expect(bests.mostKills?.id).toBe('perfect')
    })
  })
})
