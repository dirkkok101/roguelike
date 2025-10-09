import { ToggleGodModeCommand } from './ToggleGodModeCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('ToggleGodModeCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: ToggleGodModeCommand
  const mockMonsterData = [
    {
      letter: 'T',
      name: 'Troll',
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
  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)
    command = new ToggleGodModeCommand(debugService)
  test('executes debugService.toggleGodMode', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState
    const result = command.execute(mockState)
    expect(result.debug?.godMode).toBe(true)
  test('toggles god mode on', () => {
    expect(result.messages).toHaveLength(1)
  test('toggles god mode off when already enabled', () => {
      debug: {
        ...debugService.initializeDebugState(),
        godMode: true,
      },
    expect(result.debug?.godMode).toBe(false)
})
