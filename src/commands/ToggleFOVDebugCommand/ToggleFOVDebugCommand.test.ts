import { ToggleFOVDebugCommand } from './ToggleFOVDebugCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('ToggleFOVDebugCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: ToggleFOVDebugCommand

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
    const mockRandom = new MockRandom()
    const recorder = new CommandRecorderService()
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
    command = new ToggleFOVDebugCommand(debugService, recorder, mockRandom)
  })

  test('executes debugService.toggleFOVDebug', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(true)
  })

  test('toggles FOV overlay on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(true)
  })

  test('toggles FOV overlay off', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        fovOverlay: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(false)
  })
})
