import { IdentifyAllItemsCommand } from './IdentifyAllItemsCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('IdentifyAllItemsCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: IdentifyAllItemsCommand

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
    command = new IdentifyAllItemsCommand(debugService, recorder, mockRandom)
  })

  test('executes debugService.identifyAll', () => {
    const mockState = {
      messages: [],
      turnCount: 0,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.identifiedItems.size).toBeGreaterThan(0)
  })

  test('marks all item types as identified', () => {
    const mockState = {
      messages: [],
      turnCount: 0,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    // Should identify many item types (potions, scrolls, rings, wands)
    expect(result.identifiedItems.size).toBeGreaterThan(10)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Identified all')
    expect(result.messages[0].text).toContain('item types')
  })

  test('preserves existing messages', () => {
    const mockState = {
      messages: [{ text: 'Previous message', type: 'info' as const, turnCount: 0 }],
      turnCount: 1,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.messages.length).toBe(2)
    expect(result.messages[0].text).toBe('Previous message')
  })
})
