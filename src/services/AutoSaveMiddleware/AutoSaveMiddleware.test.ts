import { AutoSaveMiddleware } from './AutoSaveMiddleware'
import { LocalStorageService } from '@services/LocalStorageService'
import { GameState, Player, Level, TileType } from '@game/core/core'

describe('AutoSaveMiddleware', () => {
  let middleware: AutoSaveMiddleware
  let localStorageService: LocalStorageService

  beforeEach(() => {
    localStorageService = new LocalStorageService()
    middleware = new AutoSaveMiddleware(localStorageService)
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestLevel(depth: number): Level {
    return {
      depth,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#FFFFFF',
            colorExplored: '#888888',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createTestState(overrides: Partial<GameState> = {}): GameState {
    return {
      player: createTestPlayer(),
      currentLevel: 1,
      levels: new Map([[1, createTestLevel(1)]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game-autosave',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      ...overrides,
    }
  }

  test('saves every 10 turns by default', () => {
    const state = createTestState({ turnCount: 10, gameId: 'auto-10' })

    middleware.afterTurn(state)

    expect(localStorageService.hasSave('auto-10')).toBe(true)
  })

  test('does not save on non-interval turns', () => {
    const state = createTestState({ turnCount: 7, gameId: 'auto-7' })

    middleware.afterTurn(state)

    expect(localStorageService.hasSave('auto-7')).toBe(false)
  })

  test('saves on all interval turns (10, 20, 30)', () => {
    const state10 = createTestState({ turnCount: 10, gameId: 'auto-multi' })
    middleware.afterTurn(state10)
    expect(localStorageService.hasSave('auto-multi')).toBe(true)

    const state20 = createTestState({ turnCount: 20, gameId: 'auto-multi' })
    middleware.afterTurn(state20)
    expect(localStorageService.loadGame('auto-multi')?.turnCount).toBe(20)

    const state30 = createTestState({ turnCount: 30, gameId: 'auto-multi' })
    middleware.afterTurn(state30)
    expect(localStorageService.loadGame('auto-multi')?.turnCount).toBe(30)
  })

  test('respects custom save interval', () => {
    const customMiddleware = new AutoSaveMiddleware(localStorageService, 5)

    const state1 = createTestState({ turnCount: 5, gameId: 'custom-5' })
    customMiddleware.afterTurn(state1)
    expect(localStorageService.hasSave('custom-5')).toBe(true)

    const state2 = createTestState({ turnCount: 10, gameId: 'custom-10' })
    customMiddleware.afterTurn(state2)
    expect(localStorageService.hasSave('custom-10')).toBe(true)

    const state3 = createTestState({ turnCount: 7, gameId: 'custom-7' })
    customMiddleware.afterTurn(state3)
    expect(localStorageService.hasSave('custom-7')).toBe(false)
  })

  test('does not save on turn 0', () => {
    const state = createTestState({ turnCount: 0, gameId: 'turn-0' })

    middleware.afterTurn(state)

    expect(localStorageService.hasSave('turn-0')).toBe(false)
  })

  test('does not save if game is over', () => {
    const state = createTestState({
      turnCount: 10,
      isGameOver: true,
      gameId: 'game-over-auto',
    })

    middleware.afterTurn(state)

    expect(localStorageService.hasSave('game-over-auto')).toBe(false)
  })

  test('does not save if player has won', () => {
    const state = createTestState({
      turnCount: 20,
      isGameOver: true,
      hasWon: true,
      gameId: 'won-auto',
    })

    middleware.afterTurn(state)

    expect(localStorageService.hasSave('won-auto')).toBe(false)
  })

  test('handles save failure gracefully', () => {
    // Mock saveGame to throw error
    const originalSaveGame = localStorageService.saveGame
    localStorageService.saveGame = jest.fn(() => {
      throw new Error('Storage quota exceeded')
    })

    const state = createTestState({ turnCount: 10 })

    // Should not throw
    expect(() => middleware.afterTurn(state)).not.toThrow()

    // Restore
    localStorageService.saveGame = originalSaveGame
  })

  test('saves complete game state', () => {
    const state = createTestState({
      turnCount: 20,
      currentLevel: 3,
      hasAmulet: true,
      gameId: 'complete-auto',
    })

    middleware.afterTurn(state)

    const loaded = localStorageService.loadGame('complete-auto')
    expect(loaded).not.toBeNull()
    expect(loaded?.turnCount).toBe(20)
    expect(loaded?.currentLevel).toBe(3)
    expect(loaded?.hasAmulet).toBe(true)
  })

  test('interval of 1 saves every turn', () => {
    const everyTurnMiddleware = new AutoSaveMiddleware(localStorageService, 1)

    for (let turn = 1; turn <= 5; turn++) {
      const state = createTestState({ turnCount: turn, gameId: `every-${turn}` })
      everyTurnMiddleware.afterTurn(state)
      expect(localStorageService.hasSave(`every-${turn}`)).toBe(true)
    }
  })

  test('interval of 100 saves on turn 100, 200, etc', () => {
    const longInterval = new AutoSaveMiddleware(localStorageService, 100)

    const state99 = createTestState({ turnCount: 99, gameId: 'long-99' })
    longInterval.afterTurn(state99)
    expect(localStorageService.hasSave('long-99')).toBe(false)

    const state100 = createTestState({ turnCount: 100, gameId: 'long-100' })
    longInterval.afterTurn(state100)
    expect(localStorageService.hasSave('long-100')).toBe(true)

    const state200 = createTestState({ turnCount: 200, gameId: 'long-200' })
    longInterval.afterTurn(state200)
    expect(localStorageService.hasSave('long-200')).toBe(true)
  })
})
