import { LeaderboardService } from './LeaderboardService'
import { GameState, LeaderboardEntry } from '@game/core/core'
import { ComprehensiveDeathStats } from '@services/DeathService'

// ============================================================================
// LEADERBOARD SERVICE TESTS - Entry Creation
// ============================================================================

describe('LeaderboardService - Entry Creation', () => {
  let service: LeaderboardService

  beforeEach(() => {
    service = new LeaderboardService()
  })

  // Helper to create minimal game state
  const createTestState = (overrides?: Partial<GameState>): GameState => {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 12,
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
      turnCount: 100,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      monstersKilled: 10,
      itemsFound: 5,
      itemsUsed: 2,
      levelsExplored: 1,
      ...overrides,
    } as GameState
  }

  const createDeathStats = (
    overrides?: Partial<ComprehensiveDeathStats>
  ): ComprehensiveDeathStats => {
    return {
      cause: 'Killed by Orc',
      finalLevel: 1,
      totalXP: 0,
      deepestLevel: 1,
      totalTurns: 100,
      levelsExplored: 1,
      monstersKilled: 10,
      totalGold: 0,
      itemsFound: 5,
      itemsUsed: 2,
      achievements: [],
      seed: 'test-seed',
      gameId: 'test-game',
      timestamp: Date.now(),
      ...overrides,
    }
  }

  describe('victory entries', () => {
    test('creates victory entry with correct data', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          level: 10,
          xp: 8540,
          gold: 1250,
        },
        currentLevel: 10,
        turnCount: 1234,
        monstersKilled: 45,
        itemsFound: 38,
        itemsUsed: 22,
        levelsExplored: 10,
        hasWon: true,
        hasAmulet: true,
      })

      const entry = service.createEntry(state, true, 15430)

      expect(entry.isVictory).toBe(true)
      expect(entry.score).toBe(15430)
      expect(entry.deathCause).toBeNull()
      expect(entry.epitaph).toBeNull()
      expect(entry.finalLevel).toBe(10)
      expect(entry.totalXP).toBe(8540)
      expect(entry.totalGold).toBe(1250)
      expect(entry.deepestLevel).toBe(10)
      expect(entry.levelsExplored).toBe(10)
      expect(entry.totalTurns).toBe(1234)
      expect(entry.monstersKilled).toBe(45)
      expect(entry.itemsFound).toBe(38)
      expect(entry.itemsUsed).toBe(22)
    })

    test('includes unique ID with gameId and timestamp', () => {
      const state = createTestState({ gameId: 'game-123' })
      const entry = service.createEntry(state, true, 1000)

      expect(entry.id).toContain('game-123')
      expect(entry.id).toContain('-')
      expect(entry.gameId).toBe('game-123')
    })

    test('includes seed for verification', () => {
      const state = createTestState({ seed: 'seed-abc123' })
      const entry = service.createEntry(state, true, 1000)

      expect(entry.seed).toBe('seed-abc123')
    })

    test('includes timestamp', () => {
      const state = createTestState()
      const before = Date.now()
      const entry = service.createEntry(state, true, 1000)
      const after = Date.now()

      expect(entry.timestamp).toBeGreaterThanOrEqual(before)
      expect(entry.timestamp).toBeLessThanOrEqual(after)
    })

    test('calculates efficiency metrics', () => {
      const state = createTestState({
        turnCount: 1000,
        monstersKilled: 50,
        currentLevel: 10,
      })

      const entry = service.createEntry(state, true, 5000)

      expect(entry.scorePerTurn).toBe(5) // 5000 / 1000
      expect(entry.killsPerLevel).toBe(5) // 50 / 10
    })

    test('handles zero turns for efficiency calculation', () => {
      const state = createTestState({ turnCount: 0 })
      const entry = service.createEntry(state, true, 1000)

      expect(entry.scorePerTurn).toBe(0)
    })

    test('handles zero depth for kills per level calculation', () => {
      const state = createTestState({ currentLevel: 0 })
      const entry = service.createEntry(state, true, 1000)

      expect(entry.killsPerLevel).toBe(0)
    })
  })

  describe('death entries', () => {
    test('creates death entry with correct data', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          level: 7,
          xp: 2500,
          gold: 800,
        },
        currentLevel: 8,
        turnCount: 900,
        monstersKilled: 25,
        itemsFound: 20,
        itemsUsed: 10,
        levelsExplored: 8,
        deathCause: 'Killed by Dragon',
      })

      const deathStats = createDeathStats({
        cause: 'Killed by Dragon',
        epitaph: 'Here lies a brave adventurer...',
        achievements: ['Monster Hunter', 'Deep Delver'],
      })

      const entry = service.createEntry(state, false, 8500, deathStats)

      expect(entry.isVictory).toBe(false)
      expect(entry.score).toBe(8500)
      expect(entry.deathCause).toBe('Killed by Dragon')
      expect(entry.epitaph).toBe('Here lies a brave adventurer...')
      expect(entry.achievements).toEqual(['Monster Hunter', 'Deep Delver'])
    })

    test('uses Unknown cause when deathCause is missing', () => {
      const state = createTestState({ deathCause: undefined })
      const entry = service.createEntry(state, false, 1000)

      expect(entry.deathCause).toBe('Unknown cause')
    })

    test('includes death stats achievements', () => {
      const state = createTestState()
      const deathStats = createDeathStats({
        achievements: [
          'First Blood - Killed 10 monsters',
          'Deeper Delver - Reached level 5',
          'Treasure Seeker - Collected 1000 gold',
        ],
      })

      const entry = service.createEntry(state, false, 1000, deathStats)

      expect(entry.achievements).toHaveLength(3)
      expect(entry.achievements).toContain('First Blood - Killed 10 monsters')
    })

    test('handles missing death stats with empty achievements', () => {
      const state = createTestState()
      const entry = service.createEntry(state, false, 1000)

      expect(entry.achievements).toEqual([])
      expect(entry.epitaph).toBeNull()
    })

    test('handles missing epitaph in death stats', () => {
      const state = createTestState()
      const deathStats = createDeathStats({ epitaph: undefined })

      const entry = service.createEntry(state, false, 1000, deathStats)

      expect(entry.epitaph).toBeNull()
    })
  })

  describe('equipment snapshot', () => {
    test('extracts weapon name', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            ...createTestState().player.equipment,
            weapon: {
              id: 'weapon-1',
              name: 'Long Sword +2',
              type: 'WEAPON',
              identified: true,
              position: { x: 0, y: 0 },
              damage: '2d4',
              bonus: 2,
            },
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.weapon).toBe('Long Sword +2')
    })

    test('extracts armor name', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            ...createTestState().player.equipment,
            armor: {
              id: 'armor-1',
              name: 'Plate Mail +1',
              type: 'ARMOR',
              identified: true,
              position: { x: 0, y: 0 },
              ac: 3,
              bonus: 1,
            },
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.armor).toBe('Plate Mail +1')
    })

    test('extracts light source name', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            ...createTestState().player.equipment,
            lightSource: {
              id: 'light-1',
              name: 'Phial of Galadriel',
              type: 'TORCH',
              identified: true,
              position: { x: 0, y: 0 },
              radius: 3,
              isPermanent: true,
            },
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.lightSource).toBe('Phial of Galadriel')
    })

    test('extracts ring names', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            ...createTestState().player.equipment,
            leftRing: {
              id: 'ring-1',
              name: 'Ring of Regeneration',
              type: 'RING',
              identified: true,
              position: { x: 0, y: 0 },
              ringType: 'REGENERATION',
              effect: 'Regenerates HP',
              bonus: 0,
              materialName: 'gold',
              hungerModifier: 1.5,
            },
            rightRing: {
              id: 'ring-2',
              name: 'Ring of Slow Digestion',
              type: 'RING',
              identified: true,
              position: { x: 0, y: 0 },
              ringType: 'SLOW_DIGESTION',
              effect: 'Slows hunger',
              bonus: 0,
              materialName: 'silver',
              hungerModifier: 0.5,
            },
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.rings).toHaveLength(2)
      expect(entry.finalEquipment?.rings).toContain('Ring of Regeneration')
      expect(entry.finalEquipment?.rings).toContain('Ring of Slow Digestion')
    })

    test('handles no equipment with None values', () => {
      const state = createTestState() // All equipment null

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.weapon).toBe('None')
      expect(entry.finalEquipment?.armor).toBe('None')
      expect(entry.finalEquipment?.lightSource).toBe('None')
      expect(entry.finalEquipment?.rings).toEqual([])
    })

    test('handles partial equipment', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            weapon: {
              id: 'weapon-1',
              name: 'Dagger',
              type: 'WEAPON',
              identified: true,
              position: { x: 0, y: 0 },
              damage: '1d4',
              bonus: 0,
            },
            armor: null,
            leftRing: null,
            rightRing: null,
            lightSource: null,
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.weapon).toBe('Dagger')
      expect(entry.finalEquipment?.armor).toBe('None')
      expect(entry.finalEquipment?.lightSource).toBe('None')
      expect(entry.finalEquipment?.rings).toEqual([])
    })

    test('handles single ring equipped', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          equipment: {
            ...createTestState().player.equipment,
            leftRing: {
              id: 'ring-1',
              name: 'Ring of Protection',
              type: 'RING',
              identified: true,
              position: { x: 0, y: 0 },
              ringType: 'PROTECTION',
              effect: 'Reduces damage',
              bonus: 1,
              materialName: 'iron',
              hungerModifier: 1.0,
            },
            rightRing: null,
          },
        },
      })

      const entry = service.createEntry(state, true, 1000)

      expect(entry.finalEquipment?.rings).toHaveLength(1)
      expect(entry.finalEquipment?.rings).toContain('Ring of Protection')
    })
  })
})
