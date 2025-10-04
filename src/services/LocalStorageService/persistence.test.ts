import { LocalStorageService } from './LocalStorageService'
import { GameState, Player, Level, TileType } from '@game/core/core'

describe('LocalStorageService - Persistence', () => {
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
      gameId: 'test-game',
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

  test('sets continue key when saving', () => {
    const state = createTestState({ gameId: 'game-789' })

    service.saveGame(state)

    expect(localStorage.getItem('roguelike_continue')).toBe('game-789')
  })

  test('updates continue key when saving different game', () => {
    service.saveGame(createTestState({ gameId: 'game-1' }))
    service.saveGame(createTestState({ gameId: 'game-2' }))

    expect(localStorage.getItem('roguelike_continue')).toBe('game-2')
  })

  test('hasSave returns true when save exists', () => {
    const state = createTestState({ gameId: 'exists' })
    service.saveGame(state)

    expect(service.hasSave('exists')).toBe(true)
  })

  test('hasSave returns false when save does not exist', () => {
    expect(service.hasSave('missing')).toBe(false)
  })

  test('hasSave uses continue key when no gameId provided', () => {
    const state = createTestState({ gameId: 'continue-me' })
    service.saveGame(state)

    expect(service.hasSave()).toBe(true)
  })

  test('hasSave returns false when no continue key and no gameId provided', () => {
    expect(service.hasSave()).toBe(false)
  })

  test('deleteSave removes save file', () => {
    const state = createTestState({ gameId: 'doomed' })
    service.saveGame(state)

    expect(service.hasSave('doomed')).toBe(true)

    service.deleteSave('doomed')

    expect(service.hasSave('doomed')).toBe(false)
  })

  test('deleteSave clears continue key if matching', () => {
    const state = createTestState({ gameId: 'clear-me' })
    service.saveGame(state)

    expect(localStorage.getItem('roguelike_continue')).toBe('clear-me')

    service.deleteSave('clear-me')

    expect(localStorage.getItem('roguelike_continue')).toBeNull()
  })

  test('deleteSave does not clear continue key if not matching', () => {
    service.saveGame(createTestState({ gameId: 'keep-1' }))
    service.saveGame(createTestState({ gameId: 'keep-2' }))

    // Continue key now points to keep-2
    service.deleteSave('keep-1')

    expect(localStorage.getItem('roguelike_continue')).toBe('keep-2')
  })

  test('getContinueGameId returns most recent save', () => {
    service.saveGame(createTestState({ gameId: 'first' }))
    service.saveGame(createTestState({ gameId: 'second' }))

    expect(service.getContinueGameId()).toBe('second')
  })

  test('getContinueGameId returns null when no continue key', () => {
    expect(service.getContinueGameId()).toBeNull()
  })

  test('listSaves returns all save IDs', () => {
    service.saveGame(createTestState({ gameId: 'save1' }))
    service.saveGame(createTestState({ gameId: 'save2' }))
    service.saveGame(createTestState({ gameId: 'save3' }))

    const saves = service.listSaves()

    expect(saves).toHaveLength(3)
    expect(saves).toContain('save1')
    expect(saves).toContain('save2')
    expect(saves).toContain('save3')
  })

  test('listSaves returns empty array when no saves', () => {
    const saves = service.listSaves()

    expect(saves).toEqual([])
  })

  test('listSaves ignores non-save localStorage items', () => {
    localStorage.setItem('other_key_1', 'value')
    localStorage.setItem('other_key_2', 'value')
    service.saveGame(createTestState({ gameId: 'only-save' }))

    const saves = service.listSaves()

    expect(saves).toHaveLength(1)
    expect(saves).toContain('only-save')
  })

  test('loadGame without gameId uses continue key', () => {
    const state = createTestState({ gameId: 'auto-load', turnCount: 42 })
    service.saveGame(state)

    const loaded = service.loadGame()

    expect(loaded).not.toBeNull()
    expect(loaded?.gameId).toBe('auto-load')
    expect(loaded?.turnCount).toBe(42)
  })

  test('loadGame returns null when no continue key and no gameId', () => {
    const loaded = service.loadGame()

    expect(loaded).toBeNull()
  })
})
