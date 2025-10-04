import { LocalStorageService } from './LocalStorageService'
import { GameState, Player, Level, TileType } from '@game/core/core'

describe('LocalStorageService - Permadeath', () => {
  let service: LocalStorageService

  beforeEach(() => {
    service = new LocalStorageService()
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
      gameId: 'test-game-permadeath',
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

  test('save is deleted when player dies', () => {
    const state = createTestState({
      gameId: 'doomed',
      isGameOver: true,
      hasWon: false,
    })

    service.saveGame(state)
    expect(service.hasSave('doomed')).toBe(true)

    // Simulate permadeath deletion
    service.deleteSave('doomed')

    expect(service.hasSave('doomed')).toBe(false)
  })

  test('save is NOT deleted when player wins', () => {
    const state = createTestState({
      gameId: 'winner',
      isGameOver: true,
      hasWon: true,
    })

    service.saveGame(state)

    // Victory does not delete save (only death does)
    expect(service.hasSave('winner')).toBe(true)
  })

  test('continue key is cleared on permadeath', () => {
    const state = createTestState({ gameId: 'clear' })
    service.saveGame(state)

    expect(service.getContinueGameId()).toBe('clear')

    service.deleteSave('clear')

    expect(service.getContinueGameId()).toBeNull()
  })

  test('deleteSave is idempotent', () => {
    const state = createTestState({ gameId: 'test-delete' })
    service.saveGame(state)

    service.deleteSave('test-delete')
    expect(service.hasSave('test-delete')).toBe(false)

    // Deleting again should not throw
    expect(() => service.deleteSave('test-delete')).not.toThrow()
    expect(service.hasSave('test-delete')).toBe(false)
  })

  test('deleting one save does not affect others', () => {
    const state1 = createTestState({ gameId: 'save-1' })
    const state2 = createTestState({ gameId: 'save-2' })
    const state3 = createTestState({ gameId: 'save-3' })

    service.saveGame(state1)
    service.saveGame(state2)
    service.saveGame(state3)

    service.deleteSave('save-2')

    expect(service.hasSave('save-1')).toBe(true)
    expect(service.hasSave('save-2')).toBe(false)
    expect(service.hasSave('save-3')).toBe(true)
  })

  test('continue key is not cleared if deleting different save', () => {
    const state1 = createTestState({ gameId: 'current' })
    const state2 = createTestState({ gameId: 'other' })

    service.saveGame(state1)
    service.saveGame(state2)

    expect(service.getContinueGameId()).toBe('other') // Most recent

    service.deleteSave('current')

    // Continue key should still point to 'other' since we deleted 'current'
    expect(service.getContinueGameId()).toBe('other')
  })

  test('loading deleted save returns null', () => {
    const state = createTestState({ gameId: 'deleted' })
    service.saveGame(state)

    service.deleteSave('deleted')

    const loaded = service.loadGame('deleted')
    expect(loaded).toBeNull()
  })

  test('permadeath prevents save scumming', () => {
    const state = createTestState({
      gameId: 'no-scum',
      turnCount: 100,
      player: { ...createTestPlayer(), hp: 1 },
    })

    // Save game
    service.saveGame(state)
    expect(service.hasSave('no-scum')).toBe(true)

    // Player dies - save is deleted
    service.deleteSave('no-scum')

    // Cannot reload from before death
    expect(service.hasSave('no-scum')).toBe(false)
    expect(service.loadGame('no-scum')).toBeNull()
  })

  test('permadeath is final - no recovery', () => {
    const state = createTestState({ gameId: 'final-death' })
    service.saveGame(state)

    // Delete save
    service.deleteSave('final-death')

    // Attempting to load returns null
    expect(service.loadGame('final-death')).toBeNull()

    // Cannot save with same ID and expect old data
    const newState = createTestState({
      gameId: 'final-death',
      turnCount: 999,
    })
    service.saveGame(newState)

    // New save is separate from deleted one
    const loaded = service.loadGame('final-death')
    expect(loaded?.turnCount).toBe(999) // New game, not old
  })
})
