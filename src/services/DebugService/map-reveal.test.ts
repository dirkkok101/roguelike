import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('DebugService - Map Reveal', () => {
  let originalFetch: typeof global.fetch

  const mockMonsterData = [
    {
      letter: 'T',
      name: 'Troll',
      spriteName: 'Troll',
      hp: '6d8',
      ac: 4,
      damage: '1d8+1d8+2d6',
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

  async function createDebugService(isDevMode: boolean = true) {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    return new DebugService(new MessageService(), monsterSpawnService, itemSpawnService, mockRandom, isDevMode)
  }

  let debugService: DebugService
  let mockState: GameState

  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)

    // Create state with unexplored level
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)), // All unexplored
      rooms: [],
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
      messages: [],
      turnCount: 0,
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('revealMap marks all tiles as explored', async () => {
    const result = debugService.revealMap(mockState)

    const level = result.levels.get(1)!
    expect(level.explored.every(row => row.every(cell => cell === true))).toBe(true)
  })

  test('revealMap sets mapRevealed flag', async () => {
    const result = debugService.revealMap(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })

  test('revealMap adds message', async () => {
    const result = debugService.revealMap(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Map REVEALED')
  })

  test('revealMap toggles off when called twice', async () => {
    const revealed = debugService.revealMap(mockState)
    const hidden = debugService.revealMap(revealed)

    expect(hidden.debug?.mapRevealed).toBe(false)
    expect(hidden.messages[hidden.messages.length - 1].text).toContain('DISABLED')
  })

  test('revealMap does nothing in production', async () => {
    const prodService = await createDebugService(false)
    const result = prodService.revealMap(mockState)

    expect(result).toBe(mockState)
  })

  test('preserves original state immutability', async () => {
    const result = debugService.revealMap(mockState)

    expect(result).not.toBe(mockState)
    expect(result.levels).not.toBe(mockState.levels)
    expect(mockState.levels.get(1)!.explored[0][0]).toBe(false) // Original unchanged
  })

  test('revealMap returns unchanged state if level not found', async () => {
    const invalidState = {
      ...mockState,
      currentLevel: 99,
    }

    const result = debugService.revealMap(invalidState)

    expect(result).toBe(invalidState)
  })

  test('revealMap creates new level object', async () => {
    const result = debugService.revealMap(mockState)

    const originalLevel = mockState.levels.get(1)!
    const resultLevel = result.levels.get(1)!

    expect(resultLevel).not.toBe(originalLevel)
    expect(resultLevel.explored).not.toBe(originalLevel.explored)
  })

  test('revealMap preserves other level properties', async () => {
    const result = debugService.revealMap(mockState)

    const originalLevel = mockState.levels.get(1)!
    const resultLevel = result.levels.get(1)!

    expect(resultLevel.depth).toBe(originalLevel.depth)
    expect(resultLevel.width).toBe(originalLevel.width)
    expect(resultLevel.height).toBe(originalLevel.height)
    expect(resultLevel.monsters).toBe(originalLevel.monsters)
  })
})
