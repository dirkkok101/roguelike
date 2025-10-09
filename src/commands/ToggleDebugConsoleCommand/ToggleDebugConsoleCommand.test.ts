import { ToggleDebugConsoleCommand } from './ToggleDebugConsoleCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { GameState } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('ToggleDebugConsoleCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: ToggleDebugConsoleCommand

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
    command = new ToggleDebugConsoleCommand(debugService)
  })

  test('executes debugService.toggleDebugConsole', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(true)
  })

  test('toggles debug console visibility on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(true)
  })

  test('toggles debug console visibility off when already visible', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        debugConsoleVisible: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(false)
  })
})
