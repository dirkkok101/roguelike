import { LocalStorageService } from './LocalStorageService'
import { GameState, Player, Level, TileType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('LocalStorageService - Permadeath', () => {
  let service: LocalStorageService

  beforeEach(() => {
    service = new LocalStorageService()
    service.enableTestMode() // Use synchronous compression for tests
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

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

  test('save is deleted when player dies', async () => {
    const state = createTestState({
      gameId: 'doomed',
      isGameOver: true,
      hasWon: false,
    })

    await service.saveGame(state)
    expect(service.hasSave('doomed')).toBe(true)

    // Simulate permadeath deletion
    service.deleteSave('doomed')

    expect(service.hasSave('doomed')).toBe(false)
  })

  test('save is NOT deleted when player wins', async () => {
    const state = createTestState({
      gameId: 'winner',
      isGameOver: true,
      hasWon: true,
    })

    await service.saveGame(state)

    // Victory does not delete save (only death does)
    expect(service.hasSave('winner')).toBe(true)
  })

  test('continue key is cleared on permadeath', async () => {
    const state = createTestState({ gameId: 'clear' })
    await service.saveGame(state)

    expect(service.getContinueGameId()).toBe('clear')

    service.deleteSave('clear')

    expect(service.getContinueGameId()).toBeNull()
  })

  test('deleteSave is idempotent', async () => {
    const state = createTestState({ gameId: 'test-delete' })
    await service.saveGame(state)

    service.deleteSave('test-delete')
    expect(service.hasSave('test-delete')).toBe(false)

    // Deleting again should not throw
    expect(() => service.deleteSave('test-delete')).not.toThrow()
    expect(service.hasSave('test-delete')).toBe(false)
  })

  test('deleting one save does not affect others', async () => {
    const state1 = createTestState({ gameId: 'save-1' })
    const state2 = createTestState({ gameId: 'save-2' })
    const state3 = createTestState({ gameId: 'save-3' })

    await service.saveGame(state1)
    await service.saveGame(state2)
    await service.saveGame(state3)

    service.deleteSave('save-2')

    expect(service.hasSave('save-1')).toBe(true)
    expect(service.hasSave('save-2')).toBe(false)
    expect(service.hasSave('save-3')).toBe(true)
  })

  test('continue key is not cleared if deleting different save', async () => {
    const state1 = createTestState({ gameId: 'current' })
    const state2 = createTestState({ gameId: 'other' })

    await service.saveGame(state1)
    await service.saveGame(state2)

    expect(service.getContinueGameId()).toBe('other') // Most recent

    service.deleteSave('current')

    // Continue key should still point to 'other' since we deleted 'current'
    expect(service.getContinueGameId()).toBe('other')
  })

  test('loading deleted save returns null', async () => {
    const state = createTestState({ gameId: 'deleted' })
    await service.saveGame(state)

    service.deleteSave('deleted')

    const loaded = await service.loadGame('deleted')
    expect(loaded).toBeNull()
  })

  test('permadeath prevents save scumming', async () => {
    const state = createTestState({
      gameId: 'no-scum',
      turnCount: 100,
      player: { ...createTestPlayer(), hp: 1 },
    })

    // Save game
    await service.saveGame(state)
    expect(service.hasSave('no-scum')).toBe(true)

    // Player dies - save is deleted
    service.deleteSave('no-scum')

    // Cannot reload from before death
    expect(service.hasSave('no-scum')).toBe(false)
    expect(await service.loadGame('no-scum')).toBeNull()
  })

  test('permadeath is final - no recovery', async () => {
    const state = createTestState({ gameId: 'final-death' })
    await service.saveGame(state)

    // Delete save
    service.deleteSave('final-death')

    // Attempting to load returns null
    expect(await service.loadGame('final-death')).toBeNull()

    // Cannot save with same ID and expect old data
    const newState = createTestState({
      gameId: 'final-death',
      turnCount: 999,
    })
    await service.saveGame(newState)

    // New save is separate from deleted one
    const loaded = await service.loadGame('final-death')
    expect(loaded?.turnCount).toBe(999) // New game, not old
  })
})
