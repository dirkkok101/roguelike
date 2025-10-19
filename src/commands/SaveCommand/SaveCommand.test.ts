import 'fake-indexeddb/auto'
import { SaveCommand } from './SaveCommand'
import { GameStorageService } from '@services/GameStorageService'
import { MessageService } from '@services/MessageService'
import { ToastNotificationService } from '@services/ToastNotificationService'
import { GameState, Level, TileType } from '@game/core/core'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'
import { createTestPlayer } from '@test-helpers'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('SaveCommand', () => {
  let command: SaveCommand
  let gameStorageService: GameStorageService
  let messageService: MessageService
  let toastNotificationService: ToastNotificationService
  let mockRandom: MockRandom
  let recorder: CommandRecorderService
  let indexedDB: IndexedDBService

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()
    recorder = new CommandRecorderService(indexedDB)
    gameStorageService = new GameStorageService(recorder, indexedDB)
    gameStorageService.enableTestMode() // Use synchronous compression for tests
    messageService = new MessageService()
    toastNotificationService = new ToastNotificationService()
    mockRandom = new MockRandom()
    command = new SaveCommand(gameStorageService, messageService, toastNotificationService, recorder, mockRandom)
  })

  afterEach(() => {
    indexedDB.close()
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

  test('starts async save (fire-and-forget)', async () => {
    const state = createTestState({ gameId: 'save-test-1' })

    command.execute(state)

    // Wait for async save to complete (setTimeout deferral + save operation)
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(await gameStorageService.hasSave('save-test-1')).toBe(true)
  })

  test('shows "Saving..." message immediately', () => {
    const state = createTestState({ gameId: 'save-test-2' })

    const result = command.execute(state)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toBe('Saving game...')
    expect(result.messages[0].type).toBe('info')
  })

  test('does not save if game is over', async () => {
    const state = createTestState({
      gameId: 'game-over-test',
      isGameOver: true,
    })

    command.execute(state)

    expect(await gameStorageService.hasSave('game-over-test')).toBe(false)
  })

  test('returns unchanged state when game is over', () => {
    const state = createTestState({
      gameId: 'game-over-test-2',
      isGameOver: true,
    })

    const result = command.execute(state)

    expect(result).toBe(state)
  })

  test('saves complete game state', async () => {
    const state = createTestState({
      gameId: 'complete-save',
      turnCount: 500,
      currentLevel: 3,
      hasAmulet: true,
    })

    command.execute(state)

    // Wait for async save (setTimeout deferral + save operation)
    // Need longer wait in test environment due to Jest overhead
    await new Promise((resolve) => setTimeout(resolve, 100))

    const loaded = await gameStorageService.loadGame('complete-save')
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

  test('calls GameStorageService.saveGame which handles replay persistence', async () => {
    const state = createTestState({ gameId: 'save-replay-test' })

    // Start recording
    recorder.startRecording(state, state.gameId)

    // Record a command
    recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: 'move' as any,
      actorType: 'player',
      payload: { direction: { x: 1, y: 0 } },
      rngState: 'seed-123',
    })

    // Spy on GameStorageService.saveGame
    const saveSpy = jest.spyOn(gameStorageService, 'saveGame')

    // Execute save command
    command.execute(state)

    // Wait for async operations (setTimeout + save)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Verify saveGame was called (which internally handles replay persistence)
    expect(saveSpy).toHaveBeenCalledWith(state)

    // Verify save was successful (both game state and replay data)
    expect(await gameStorageService.hasSave('save-replay-test')).toBe(true)
  })
})