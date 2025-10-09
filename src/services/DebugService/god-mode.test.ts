import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { GameState } from '@game/core/core'

describe('DebugService - God Mode', () => {
  let originalFetch: typeof global.fetch

  // Mock monster data
  const mockMonsterData = [
    {
      letter: 'D',
      name: 'Dragon',
      hp: '10d8',
      ac: -1,
      damage: '1d8+3d10',
      xpValue: 5000,
      level: 10,
      speed: 18,
      rarity: 'rare',
      mean: true,
      aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 15, fleeThreshold: 0.15, special: [] },
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
    return new DebugService(new MessageService(), monsterSpawnService, mockRandom, isDevMode)
  }

  let debugService: DebugService
  let mockState: GameState

  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    debugService = new DebugService(messageService, monsterSpawnService, mockRandom, true)

    mockState = {
      messages: [],
      turnCount: 0,
      debug: debugService.initializeDebugState(),
      player: {
        hp: 8,
        maxHp: 12,
      },
    } as GameState
  })

  test('toggleGodMode enables god mode when disabled', async () => {
    const result = debugService.toggleGodMode(mockState)

    expect(result.debug?.godMode).toBe(true)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('God mode ENABLED')
  })

  test('toggleGodMode disables god mode when enabled', async () => {
    const enabledState = debugService.toggleGodMode(mockState)
    const result = debugService.toggleGodMode(enabledState)

    expect(result.debug?.godMode).toBe(false)
    expect(result.messages[result.messages.length - 1].text).toContain('DISABLED')
  })

  test('isGodModeActive returns correct status', async () => {
    expect(debugService.isGodModeActive(mockState)).toBe(false)

    const enabled = debugService.toggleGodMode(mockState)
    expect(debugService.isGodModeActive(enabled)).toBe(true)
  })

  test('toggleGodMode does nothing in production mode', async () => {
    const prodService = await createDebugService(false)
    const result = prodService.toggleGodMode(mockState)

    expect(result).toBe(mockState) // Returns unchanged
  })

  test('toggleGodMode preserves immutability', async () => {
    const result = debugService.toggleGodMode(mockState)

    expect(result).not.toBe(mockState)
    expect(result.debug).not.toBe(mockState.debug)
    expect(mockState.debug?.godMode).toBe(false) // Original unchanged
  })
})
