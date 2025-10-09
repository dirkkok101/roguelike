import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'

describe('DebugService - State Management', () => {
  let originalFetch: typeof global.fetch

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
  })

  async function createDebugService(isDevMode: boolean = true) {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom)
    return new DebugService(new MessageService(), monsterSpawnService, itemSpawnService, mockRandom, isDevMode)
  }

  let debugService: DebugService
  let messageService: MessageService

  beforeEach(async () => {
    messageService = new MessageService()
    debugService = await createDebugService(true) // Force dev mode
  })

  test('initializes debug state with all flags false', async () => {
    const debugState = debugService.initializeDebugState()

    expect(debugState.godMode).toBe(false)
    expect(debugState.mapRevealed).toBe(false)
    expect(debugState.debugConsoleVisible).toBe(false)
    expect(debugState.fovOverlay).toBe(false)
    expect(debugState.pathOverlay).toBe(false)
    expect(debugState.aiOverlay).toBe(false)
  })

  test('isEnabled returns true in dev mode', async () => {
    expect(debugService.isEnabled()).toBe(true)
  })

  test('isEnabled returns false in production', async () => {
    const prodService = await createDebugService(false)
    expect(prodService.isEnabled()).toBe(false)
  })

  test('getDebugState returns initialized state when debug field missing', async () => {
    const mockState = {
      messages: [],
    } as any

    const debugState = debugService.getDebugState(mockState)

    expect(debugState.godMode).toBe(false)
    expect(debugState.debugConsoleVisible).toBe(false)
  })

  test('getDebugState returns existing debug state', async () => {
    const mockState = {
      debug: {
        godMode: true,
        mapRevealed: false,
        debugConsoleVisible: true,
        fovOverlay: false,
        pathOverlay: false,
        aiOverlay: false,
      },
    } as any

    const debugState = debugService.getDebugState(mockState)

    expect(debugState.godMode).toBe(true)
    expect(debugState.debugConsoleVisible).toBe(true)
  })

  test('showSeed returns game seed', async () => {
    const mockState = {
      seed: 'test-seed-12345',
    } as any

    expect(debugService.showSeed(mockState)).toBe('test-seed-12345')
  })

  test('isGodModeActive returns false when debug state missing', async () => {
    const mockState = {} as any
    expect(debugService.isGodModeActive(mockState)).toBe(false)
  })

  test('isGodModeActive returns correct status', async () => {
    const mockState = {
      debug: {
        godMode: true,
        mapRevealed: false,
        debugConsoleVisible: false,
        fovOverlay: false,
        pathOverlay: false,
        aiOverlay: false,
      },
    } as any

    expect(debugService.isGodModeActive(mockState)).toBe(true)
  })
})
