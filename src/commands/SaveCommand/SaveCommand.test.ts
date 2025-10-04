import { SaveCommand } from './SaveCommand'
import { LocalStorageService } from '@services/LocalStorageService'
import { MessageService } from '@services/MessageService'
import { GameState, Player, Level, TileType } from '@game/core/core'

describe('SaveCommand', () => {
  let command: SaveCommand
  let localStorageService: LocalStorageService
  let messageService: MessageService

  beforeEach(() => {
    localStorageService = new LocalStorageService()
    messageService = new MessageService()
    command = new SaveCommand(localStorageService, messageService)
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
      gameId: 'test-game-save',
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

  test('saves game to localStorage', () => {
    const state = createTestState({ gameId: 'save-test-1' })

    command.execute(state)

    expect(localStorageService.hasSave('save-test-1')).toBe(true)
  })

  test('adds success message when save succeeds', () => {
    const state = createTestState({ gameId: 'save-test-2' })

    const result = command.execute(state)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toBe('Game saved successfully.')
    expect(result.messages[0].type).toBe('success')
  })

  test('does not save if game is over', () => {
    const state = createTestState({
      gameId: 'game-over-test',
      isGameOver: true,
    })

    command.execute(state)

    expect(localStorageService.hasSave('game-over-test')).toBe(false)
  })

  test('returns unchanged state when game is over', () => {
    const state = createTestState({
      gameId: 'game-over-test-2',
      isGameOver: true,
    })

    const result = command.execute(state)

    expect(result).toBe(state)
  })

  test('adds warning message when save fails', () => {
    // Mock saveGame to throw error
    const originalSaveGame = localStorageService.saveGame
    localStorageService.saveGame = jest.fn(() => {
      throw new Error('Storage quota exceeded')
    })

    const state = createTestState()

    const result = command.execute(state)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toBe('Failed to save game. Storage may be full.')
    expect(result.messages[0].type).toBe('warning')

    // Restore
    localStorageService.saveGame = originalSaveGame
  })

  test('does not throw error when save fails', () => {
    // Mock saveGame to throw error
    localStorageService.saveGame = jest.fn(() => {
      throw new Error('Storage quota exceeded')
    })

    const state = createTestState()

    expect(() => command.execute(state)).not.toThrow()
  })

  test('saves complete game state', () => {
    const state = createTestState({
      gameId: 'complete-save',
      turnCount: 500,
      currentLevel: 3,
      hasAmulet: true,
    })

    command.execute(state)

    const loaded = localStorageService.loadGame('complete-save')
    expect(loaded).not.toBeNull()
    expect(loaded?.turnCount).toBe(500)
    expect(loaded?.currentLevel).toBe(3)
    expect(loaded?.hasAmulet).toBe(true)
  })

  test('preserves original state except messages', () => {
    const state = createTestState({
      turnCount: 42,
      currentLevel: 2,
    })

    const result = command.execute(state)

    expect(result.turnCount).toBe(42)
    expect(result.currentLevel).toBe(2)
    expect(result.player).toBe(state.player)
    expect(result.levels).toBe(state.levels)
  })

  test('does not increment turn count', () => {
    const state = createTestState({ turnCount: 100 })

    const result = command.execute(state)

    expect(result.turnCount).toBe(100)
  })
})