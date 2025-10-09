import { RevealMapCommand } from './RevealMapCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('RevealMapCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: RevealMapCommand

  const mockMonsterData = [
    {
      letter: 'T',
      name: 'Troll',
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
    const mockRandom = new MockRandom()
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
    command = new RevealMapCommand(debugService)
  })

  test('executes debugService.revealMap', () => {
    const level: Level = {
      depth: 1,
      width: 5,
      height: 5,
      tiles: Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(5).fill(null).map(() => Array(5).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 2, y: 2 },
    }

    const mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })

  test('marks all tiles as explored', () => {
    const level: Level = {
      depth: 1,
      width: 3,
      height: 3,
      tiles: Array(3).fill(null).map(() =>
        Array(3).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(3).fill(null).map(() => Array(3).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 1, y: 1 },
    }

    const mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    const resultLevel = result.levels.get(1)!
    expect(resultLevel.explored.every(row => row.every(cell => cell === true))).toBe(true)
  })
})
