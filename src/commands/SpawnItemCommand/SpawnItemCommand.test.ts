import { SpawnItemCommand } from './SpawnItemCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('SpawnItemCommand', () => {
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
    // Set up MockRandom with values for item spawning (radius, pickRandom index)
    // Each spawn needs: radius (1-3), pickRandom index (0-N)
    const mockRandom = new MockRandom([
      2, 0,    // radius, pick index for first spawn
      2, 1,    // radius, pick index for second spawn
      2, 0,    // radius, pick index for third spawn
    ])
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
      messages: [],
      player: {
        position: { x: 3, y: 3 },
      },
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('spawns potion with specified type', () => {
    const command = new SpawnItemCommand('potion', undefined, debugService)
    const result = command.execute(mockState)

    const level = result.levels.get(1)!
    expect(level.items).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned')
  })

  test('spawns different item types', () => {
    const commandPotion = new SpawnItemCommand('potion', undefined, debugService)
    const commandScroll = new SpawnItemCommand('scroll', undefined, debugService)

    const result1 = commandPotion.execute(mockState)
    const result2 = commandScroll.execute(result1)

    const level = result2.levels.get(1)!
    expect(level.items).toHaveLength(2)
  })

  test('adds message indicating spawn', () => {
    const command = new SpawnItemCommand('food', undefined, debugService)
    const result = command.execute(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned')
  })
})
