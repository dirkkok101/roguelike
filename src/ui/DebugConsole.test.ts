import { DebugConsole } from './DebugConsole'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { GameState } from '@game/core/core'

describe('DebugConsole', () => {
  let debugConsole: DebugConsole
  let debugService: DebugService

  beforeEach(() => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    debugService = new DebugService(messageService, monsterSpawnService, mockRandom, true)
    debugConsole = new DebugConsole(debugService)
  })

  test('container hidden by default', () => {
    const container = debugConsole.getContainer()
    expect(container.style.display).toBe('none')
  })

  test('shows container when debugConsoleVisible is true', () => {
    const mockState = {
      seed: 'test-seed',
      turnCount: 42,
      currentLevel: 3,
      player: {
        position: { x: 10, y: 5 },
        hp: 12,
        maxHp: 12,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.style.display).toBe('block')
  })

  test('displays seed, turn, level, position', () => {
    const mockState = {
      seed: 'test-123',
      turnCount: 100,
      currentLevel: 5,
      player: {
        position: { x: 15, y: 20 },
        hp: 8,
        maxHp: 12,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('test-123')
    expect(container.innerHTML).toContain('100')
    expect(container.innerHTML).toContain('5')
    expect(container.innerHTML).toContain('(15, 20)')
    expect(container.innerHTML).toContain('8/12')
  })

  test('shows god mode status', () => {
    const mockState = {
      seed: 'test',
      turnCount: 1,
      currentLevel: 1,
      player: {
        position: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true, godMode: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('✓ God Mode')
  })

  test('displays inventory count', () => {
    const mockState = {
      seed: 'test',
      turnCount: 1,
      currentLevel: 1,
      player: {
        position: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        inventory: [{}, {}, {}] as any,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('3/26')
  })

  test('displays equipment names', () => {
    const mockState = {
      seed: 'test',
      turnCount: 1,
      currentLevel: 1,
      player: {
        position: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        inventory: [],
        equipment: {
          weapon: { name: 'Sword' } as any,
          armor: { name: 'Chain Mail' } as any,
          leftRing: { name: 'Ring of Protection' } as any,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('Sword')
    expect(container.innerHTML).toContain('Chain Mail')
    expect(container.innerHTML).toContain('Ring of Protection')
  })

  test('hides console when debugConsoleVisible is false', () => {
    const mockState = {
      seed: 'test',
      turnCount: 1,
      currentLevel: 1,
      player: {
        position: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems: new Set(),
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: false },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.style.display).toBe('none')
  })

  test('displays identification progress', () => {
    const identifiedItems = new Set(['potion-HEAL', 'scroll-IDENTIFY', 'ring-PROTECTION'])
    const mockState = {
      seed: 'test',
      turnCount: 1,
      currentLevel: 1,
      player: {
        position: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      },
      levels: new Map(),
      identifiedItems,
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('3/')
  })
})
