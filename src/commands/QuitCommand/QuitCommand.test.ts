import { QuitCommand } from './QuitCommand'
import { LocalStorageService } from '@services/LocalStorageService'
import { GameState, Player, Level, TileType } from '@game/core/core'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'

describe('QuitCommand', () => {
  let command: QuitCommand
  let localStorageService: LocalStorageService
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    localStorageService = new LocalStorageService()
    localStorageService.enableTestMode() // Use synchronous compression for tests
    recorder = new CommandRecorderService()
    mockRandom = new MockRandom()
    command = new QuitCommand(localStorageService, jest.fn(), recorder, mockRandom)
    localStorage.clear()

    // Suppress JSDOM navigation errors (window.location.reload is not implemented in test environment)
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (
        typeof message === 'string' &&
        message.includes('Not implemented: navigation')
      ) {
        return
      }
      // Re-throw other errors
      console.warn(message)
    })
  })

  afterEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
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
      gameId: 'test-game-quit',
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

  test('saves game before quitting', async () => {
    const state = createTestState({ gameId: 'quit-test' })

    await command.execute(state)

    expect(localStorageService.hasSave('quit-test')).toBe(true)
  })

  test('does not save if game is over', async () => {
    const state = createTestState({
      gameId: 'dead-game',
      isGameOver: true,
    })

    await command.execute(state)

    expect(localStorageService.hasSave('dead-game')).toBe(false)
  })

  test('does not save if player has won', async () => {
    const state = createTestState({
      gameId: 'won-game',
      isGameOver: true,
      hasWon: true,
    })

    await command.execute(state)

    expect(localStorageService.hasSave('won-game')).toBe(false)
  })

  test('handles save failure gracefully', async () => {
    // Mock saveGame to return rejected promise
    const originalSaveGame = localStorageService.saveGame
    localStorageService.saveGame = jest.fn(() => {
      return Promise.reject(new Error('Storage quota exceeded'))
    })

    const state = createTestState()

    // Should not throw
    await expect(command.execute(state)).resolves.not.toThrow()

    // Restore
    localStorageService.saveGame = originalSaveGame
  })

  test('returns unchanged state', async () => {
    const state = createTestState()

    const result = await command.execute(state)

    expect(result).toBe(state)
  })

  test('saves complete game state before quit', async () => {
    const state = createTestState({
      gameId: 'complete-quit',
      turnCount: 500,
      currentLevel: 3,
      hasAmulet: true,
    })

    await command.execute(state)

    const loaded = await localStorageService.loadGame('complete-quit')
    expect(loaded).not.toBeNull()
    expect(loaded?.turnCount).toBe(500)
    expect(loaded?.currentLevel).toBe(3)
    expect(loaded?.hasAmulet).toBe(true)
  })

  test('should persist replay data before quitting', async () => {
    // Create a mock IndexedDBService
    const mockIndexedDB = {
      put: jest.fn().mockResolvedValue(undefined),
    } as any

    const mockCommandRecorder = new CommandRecorderService(mockIndexedDB)
    const mockReturnToMenu = jest.fn()

    const command = new QuitCommand(
      localStorageService,
      mockReturnToMenu,
      mockCommandRecorder,
      mockRandom
    )

    const state = createTestState({ gameId: 'game-quit-replay' })

    // Initialize recording
    mockCommandRecorder.startRecording(state, 'game-quit-replay')

    // Record a command so there's data to persist
    mockCommandRecorder.recordCommand({
      turnNumber: 1,
      timestamp: Date.now(),
      commandType: 'move',
      actorType: 'player',
      payload: { direction: { x: 1, y: 0 } },
      rngState: 'seed-123',
    })

    await command.execute(state)

    expect(mockIndexedDB.put).toHaveBeenCalledWith(
      'replays',
      'game-quit-replay',
      expect.objectContaining({
        gameId: 'game-quit-replay',
        commands: expect.arrayContaining([
          expect.objectContaining({
            commandType: 'move',
            actorType: 'player',
          }),
        ]),
      })
    )
    expect(mockReturnToMenu).toHaveBeenCalled()
  })
})
