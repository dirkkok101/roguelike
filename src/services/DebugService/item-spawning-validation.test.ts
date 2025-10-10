import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('DebugService - Item Spawning Validation', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let mockState: GameState

  const mockMonsterData = [
    {
      letter: 'T',
      name: 'Troll',
      spriteName: 'Troll',
      hp: '6d8',
      ac: 4,
      damage: '1d8',
      xpValue: 120,
      level: 6,
      speed: 12,
      rarity: 'uncommon',
      mean: true,
      aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] },
    },
  ]

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMonsterData,
    } as Response)
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  beforeEach(async () => {
    const messageService = new MessageService()
    // Provide enough random values for all findSpawnPosition() calls in the test suite
    // Each successful spawn uses 2 values: [radius (1-3), pickRandom index]
    // Generate 100 pairs to ensure we have enough for all tests
    const randomValues: number[] = []
    for (let i = 0; i < 100; i++) {
      randomValues.push(2, 0) // radius=2, index=0
    }
    const mockRandom = new MockRandom(randomValues)
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(
      messageService,
      monsterSpawnService,
      itemSpawnService,
      mockRandom,
      true
    )

    // Create basic level with rooms
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#888',
            }))
        ),
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
      rooms: [{ id: 0, x: 2, y: 2, width: 6, height: 6 }],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      player: {
        position: { x: 5, y: 5 },
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 100,
      },
      messages: [],
      visibleCells: new Set(),
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  describe('Input Validation - Null/Undefined/Empty', () => {
    test('rejects null itemType', () => {
      const result = debugService.spawnItem(mockState, null as any)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects undefined itemType', () => {
      const result = debugService.spawnItem(mockState, undefined as any)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects empty string itemType', () => {
      const result = debugService.spawnItem(mockState, '')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects whitespace-only itemType', () => {
      const result = debugService.spawnItem(mockState, '   ')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects non-string itemType (number)', () => {
      const result = debugService.spawnItem(mockState, 123 as any)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects non-string itemType (object)', () => {
      const result = debugService.spawnItem(mockState, {} as any)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects non-string itemType (array)', () => {
      const result = debugService.spawnItem(mockState, ['potion'] as any)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Invalid item type: must be a non-empty string')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })
  })

  describe('Input Validation - Invalid Categories', () => {
    test('rejects unknown item type', () => {
      const result = debugService.spawnItem(mockState, 'weapon')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Unknown item type: "weapon"')
      expect(result.messages[0].text).toContain('Valid types:')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects misspelled item type', () => {
      const result = debugService.spawnItem(mockState, 'potoin')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Unknown item type: "potoin"')
      expect(result.messages[0].text).toContain('Valid types:')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('lists all valid item types in error message', () => {
      const result = debugService.spawnItem(mockState, 'invalid')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('potion')
      expect(result.messages[0].text).toContain('scroll')
      expect(result.messages[0].text).toContain('ring')
      expect(result.messages[0].text).toContain('wand')
      expect(result.messages[0].text).toContain('food')
      expect(result.messages[0].text).toContain('torch')
      expect(result.messages[0].text).toContain('lantern')
      expect(result.messages[0].text).toContain('oil')
    })

    test('rejects plural item types', () => {
      const result = debugService.spawnItem(mockState, 'potions')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Unknown item type: "potions"')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })

    test('rejects random strings', () => {
      const result = debugService.spawnItem(mockState, 'asdfghjkl')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Unknown item type: "asdfghjkl"')
      expect(result.messages[0].type).toBe('warning')
      expect(result.levels.get(1)!.items).toHaveLength(0)
    })
  })

  describe('Input Validation - Case Sensitivity', () => {
    test('accepts lowercase item types', () => {
      const result = debugService.spawnItem(mockState, 'potion', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
    })

    test('accepts uppercase item types', () => {
      const result = debugService.spawnItem(mockState, 'POTION', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
    })

    test('accepts mixed case item types', () => {
      const result = debugService.spawnItem(mockState, 'PoTiOn', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
    })

    test('trims whitespace from item type', () => {
      const result = debugService.spawnItem(mockState, '  potion  ', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
    })

    test('accepts all valid types in uppercase', () => {
      const validTypes = ['POTION', 'SCROLL', 'RING', 'WAND', 'FOOD', 'TORCH', 'LANTERN', 'OIL']

      for (const type of validTypes) {
        const result = debugService.spawnItem(mockState, type, undefined, { x: 3, y: 3 })
        expect(result.levels.get(1)!.items.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Successful Item Spawning', () => {
    test('spawns potion successfully with valid input', () => {
      const result = debugService.spawnItem(mockState, 'potion', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
      expect(result.messages[0].text).toContain('Potion')
      expect(result.messages[0].type).toBe('info')
    })

    test('spawns scroll successfully', () => {
      const result = debugService.spawnItem(mockState, 'scroll', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Scroll')
    })

    test('spawns ring successfully', () => {
      const result = debugService.spawnItem(mockState, 'ring', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Ring')
    })

    test('spawns wand successfully', () => {
      const result = debugService.spawnItem(mockState, 'wand', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Wand')
    })

    test('spawns food successfully', () => {
      const result = debugService.spawnItem(mockState, 'food', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Food Ration')
    })

    test('spawns torch successfully', () => {
      const result = debugService.spawnItem(mockState, 'torch', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Torch')
    })

    test('spawns lantern successfully', () => {
      const result = debugService.spawnItem(mockState, 'lantern', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Lantern')
    })

    test('spawns oil flask successfully', () => {
      const result = debugService.spawnItem(mockState, 'oil', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Oil Flask')
    })
  })

  describe('Edge Cases', () => {
    test('handles item type with leading/trailing whitespace', () => {
      const result = debugService.spawnItem(mockState, '\t  potion \n ', undefined, { x: 3, y: 3 })

      expect(result.levels.get(1)!.items).toHaveLength(1)
      expect(result.messages[0].text).toContain('Spawned')
    })

    test('validation happens before position check', () => {
      const result = debugService.spawnItem(mockState, 'invalid', undefined, { x: 100, y: 100 })

      // Should fail on validation, not position
      expect(result.messages[0].text).toContain('Unknown item type')
      expect(result.messages[0].text).not.toContain('position')
    })

    test('preserves original error message format for invalid types', () => {
      const result = debugService.spawnItem(mockState, 'InvalidType')

      expect(result.messages[0].text).toBe(
        'Unknown item type: "InvalidType". Valid types: potion, scroll, ring, wand, food, torch, lantern, oil'
      )
    })
  })

  describe('State Immutability', () => {
    test('does not mutate state on validation failure', () => {
      const originalItemsLength = mockState.levels.get(1)!.items.length
      const originalMessagesLength = mockState.messages.length

      debugService.spawnItem(mockState, 'invalid')

      expect(mockState.levels.get(1)!.items.length).toBe(originalItemsLength)
      expect(mockState.messages.length).toBe(originalMessagesLength)
    })

    test('returns new state object on validation failure', () => {
      const result = debugService.spawnItem(mockState, null as any)

      expect(result).not.toBe(mockState)
      expect(result.messages).not.toBe(mockState.messages)
    })
  })
})
