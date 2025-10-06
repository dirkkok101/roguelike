import { DeathService, ComprehensiveDeathStats } from './DeathService'
import { GameState } from '@game/core/core'

// ============================================================================
// DEATH SERVICE TESTS - Comprehensive death statistics
// ============================================================================

describe('DeathService', () => {
  let service: DeathService

  beforeEach(() => {
    service = new DeathService()
  })

  // Helper to create minimal game state
  const createTestState = (overrides?: Partial<GameState>): GameState => {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 0,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: true,
      hasWon: false,
      hasAmulet: false,
      deathCause: 'Killed by Orc',
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      ...overrides,
    } as GameState
  }

  describe('calculateDeathStats', () => {
    test('calculates basic death statistics correctly', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          level: 3,
          xp: 150,
          gold: 500,
        },
        currentLevel: 5,
        turnCount: 100,
        levelsExplored: 5,
        monstersKilled: 10,
        itemsFound: 15,
        itemsUsed: 5,
        deathCause: 'Killed by Dragon',
      })

      const stats = service.calculateDeathStats(state)

      expect(stats.finalLevel).toBe(3)
      expect(stats.totalXP).toBe(150)
      expect(stats.totalGold).toBe(500)
      expect(stats.deepestLevel).toBe(5)
      expect(stats.totalTurns).toBe(100)
      expect(stats.levelsExplored).toBe(5)
      expect(stats.monstersKilled).toBe(10)
      expect(stats.itemsFound).toBe(15)
      expect(stats.itemsUsed).toBe(5)
      expect(stats.cause).toBe('Killed by Dragon')
      expect(stats.seed).toBe('test-seed')
      expect(stats.gameId).toBe('test-game')
    })

    test('includes final blow details when available', () => {
      const state = createTestState({
        deathDetails: {
          finalBlow: {
            damage: 15,
            attacker: 'Dragon',
            playerHPRemaining: 0,
          },
        },
      })

      const stats = service.calculateDeathStats(state)

      expect(stats.finalBlow).toEqual({
        damage: 15,
        attacker: 'Dragon',
        playerHPRemaining: 0,
      })
    })

    test('handles missing death cause', () => {
      const state = createTestState({
        deathCause: undefined,
      })

      const stats = service.calculateDeathStats(state)

      expect(stats.cause).toBe('Unknown cause')
      expect(stats.epitaph).toBeUndefined()
    })

    test('includes achievements', () => {
      const state = createTestState({
        currentLevel: 10,
        monstersKilled: 50,
      })

      const stats = service.calculateDeathStats(state)

      expect(stats.achievements.length).toBeGreaterThan(0)
      expect(stats.achievements).toContain('Deep Delver - Reached level 10!')
      expect(stats.achievements).toContain('Monster Slayer - Killed 50 monsters!')
    })

    test('includes epitaph when death cause exists', () => {
      const state = createTestState({
        deathCause: 'Killed by Orc',
      })

      const stats = service.calculateDeathStats(state)

      expect(stats.epitaph).toBeDefined()
      expect(typeof stats.epitaph).toBe('string')
    })

    test('includes timestamp', () => {
      const state = createTestState()
      const before = Date.now()
      const stats = service.calculateDeathStats(state)
      const after = Date.now()

      expect(stats.timestamp).toBeGreaterThanOrEqual(before)
      expect(stats.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('determineAchievements', () => {
    test('awards level-based achievements', () => {
      const state10 = createTestState({ currentLevel: 10 })
      const achievements10 = service.determineAchievements(state10)
      expect(achievements10).toContain('Deep Delver - Reached level 10!')

      const state5 = createTestState({ currentLevel: 5 })
      const achievements5 = service.determineAchievements(state5)
      expect(achievements5).toContain('Deeper Delver - Reached level 5')
    })

    test('awards combat achievements', () => {
      const state50 = createTestState({ monstersKilled: 50 })
      const achievements50 = service.determineAchievements(state50)
      expect(achievements50).toContain('Monster Slayer - Killed 50 monsters!')

      const state25 = createTestState({ monstersKilled: 25 })
      const achievements25 = service.determineAchievements(state25)
      expect(achievements25).toContain('Monster Hunter - Killed 25 monsters')

      const state10 = createTestState({ monstersKilled: 10 })
      const achievements10 = service.determineAchievements(state10)
      expect(achievements10).toContain('First Blood - Killed 10 monsters')
    })

    test('awards survival achievements', () => {
      const state1000 = createTestState({ turnCount: 1000 })
      const achievements1000 = service.determineAchievements(state1000)
      expect(achievements1000).toContain('Survivor - Survived 1000 turns!')

      const state500 = createTestState({ turnCount: 500 })
      const achievements500 = service.determineAchievements(state500)
      expect(achievements500).toContain('Endurance - Survived 500 turns')
    })

    test('awards loot achievements', () => {
      const state2000 = createTestState({
        player: { ...createTestState().player, gold: 2000 },
      })
      const achievements2000 = service.determineAchievements(state2000)
      expect(achievements2000).toContain('Treasure Hoarder - Collected 2000 gold!')

      const state1000 = createTestState({
        player: { ...createTestState().player, gold: 1000 },
      })
      const achievements1000 = service.determineAchievements(state1000)
      expect(achievements1000).toContain('Treasure Seeker - Collected 1000 gold')
    })

    test('awards item achievements', () => {
      const state50 = createTestState({ itemsFound: 50 })
      const achievements50 = service.determineAchievements(state50)
      expect(achievements50).toContain('Pack Rat - Found 50 items!')

      const state20 = createTestState({ itemsFound: 20 })
      const achievements20 = service.determineAchievements(state20)
      expect(achievements20).toContain('Well Equipped - Found 20 items')
    })

    test('awards efficiency achievements', () => {
      const state = createTestState({ itemsUsed: 20 })
      const achievements = service.determineAchievements(state)
      expect(achievements).toContain('Resourceful - Used 20 consumables')
    })

    test('awards amulet achievement', () => {
      const state = createTestState({ hasAmulet: true })
      const achievements = service.determineAchievements(state)
      expect(achievements).toContain(
        'Amulet Bearer - Retrieved the Amulet of Yendor!'
      )
    })

    test('limits achievements to top 3', () => {
      const state = createTestState({
        currentLevel: 10,
        monstersKilled: 50,
        turnCount: 1000,
        player: { ...createTestState().player, gold: 2000 },
        itemsFound: 50,
        itemsUsed: 20,
      })

      const achievements = service.determineAchievements(state)
      expect(achievements.length).toBeLessThanOrEqual(3)
    })

    test('returns empty array for minimal achievements', () => {
      const state = createTestState({
        currentLevel: 1,
        monstersKilled: 0,
        turnCount: 10,
        player: { ...createTestState().player, gold: 0 },
      })

      const achievements = service.determineAchievements(state)
      expect(achievements).toEqual([])
    })
  })

  describe('generateEpitaph', () => {
    test('generates combat epitaph for "Killed by" deaths', () => {
      const epitaph = service.generateEpitaph('Killed by Orc')
      expect(epitaph).toBeDefined()
      expect(typeof epitaph).toBe('string')
      expect(epitaph.length).toBeGreaterThan(0)
    })

    test('generates starvation epitaph', () => {
      const epitaph = service.generateEpitaph('Died of starvation')
      expect(epitaph).toBeDefined()
      expect(typeof epitaph).toBe('string')
      expect(epitaph.length).toBeGreaterThan(0)
    })

    test('generates trap epitaph', () => {
      const epitaph = service.generateEpitaph('Killed by trap')
      expect(epitaph).toBeDefined()
      expect(typeof epitaph).toBe('string')
      expect(epitaph.length).toBeGreaterThan(0)
    })

    test('generates poison epitaph', () => {
      const epitaph = service.generateEpitaph('Died from poison')
      expect(epitaph).toBeDefined()
      expect(typeof epitaph).toBe('string')
      expect(epitaph.length).toBeGreaterThan(0)
    })

    test('generates generic epitaph for unknown causes', () => {
      const epitaph = service.generateEpitaph('Unknown cause')
      expect(epitaph).toBeDefined()
      expect(typeof epitaph).toBe('string')
      expect(epitaph.length).toBeGreaterThan(0)
    })

    test('epitaphs are randomized (same cause can give different epitaphs)', () => {
      // This test may occasionally fail due to randomness, but should pass most times
      const epitaphs = new Set<string>()
      for (let i = 0; i < 10; i++) {
        epitaphs.add(service.generateEpitaph('Killed by Orc'))
      }
      // With 5 combat epitaphs, we should get at least 2 different ones in 10 tries
      expect(epitaphs.size).toBeGreaterThan(1)
    })
  })
})
