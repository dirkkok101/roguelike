import 'fake-indexeddb/auto'
import { AutoSaveMiddleware } from './AutoSaveMiddleware'
import { GameStorageService } from '@services/GameStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { IndexedDBService } from '@services/IndexedDBService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, Level, TileType } from '@game/core/core'
import { ValidationResult } from '@game/replay/replay'
import { createTestPlayer } from '@test-helpers'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('AutoSaveMiddleware', () => {
  let middleware: AutoSaveMiddleware
  let storageService: GameStorageService
  let recorder: CommandRecorderService
  let indexedDB: IndexedDBService

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    recorder = new CommandRecorderService()
    storageService = new GameStorageService(recorder, indexedDB)
    storageService.enableTestMode() // Use synchronous compression for tests

    middleware = new AutoSaveMiddleware(storageService)
  })

  afterEach(async () => {
    // Clean up IndexedDB
    const allGames = await storageService.listGames()
    for (const game of allGames) {
      await storageService.deleteSave(game.gameId)
      try {
        await indexedDB.delete('replays', game.gameId)
      } catch {}
    }
    indexedDB.close()
  })

  function createTestLevel(depth: number): Level {
    return {
      depth,
      tiles: [],
      rooms: [],
      corridors: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      upStairs: { x: 5, y: 5 },
      downStairs: { x: 15, y: 15 },
    }
  }

  function createTestState(overrides: Partial<GameState> = {}): GameState {
    return {
      gameId: 'test-game-autosave',
      characterName: 'Test Hero',
      seed: 'test-seed',
      currentLevel: 1,
      turnCount: 0,
      player: createTestPlayer(),
      levels: new Map([[1, createTestLevel(1)]]),
      visibleCells: new Set(),
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      levelsVisitedWithAmulet: new Set(),
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      messages: [],
      maxDepth: 26,
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: { fovMode: 'radius' as const },
      ...overrides,
    }
  }

  // Helper to wait for async save to complete
  const waitForSave = () => new Promise((resolve) => setTimeout(resolve, 50))

  describe('Basic Auto-Save Functionality', () => {
    test('saves every 10 turns by default', async () => {
      const state = createTestState({ turnCount: 10, gameId: 'auto-10' })

      middleware.afterTurn(state)
      await waitForSave()

      const games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'auto-10')).toBe(true)
    })

    test('does not save on non-interval turns', async () => {
      const state = createTestState({ turnCount: 7, gameId: 'auto-7' })

      middleware.afterTurn(state)
      await waitForSave()

      const games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'auto-7')).toBe(false)
    })

    test('saves on all interval turns (10, 20, 30)', async () => {
      const state10 = createTestState({ turnCount: 10, gameId: 'auto-multi' })
      middleware.afterTurn(state10)
      await waitForSave()

      let games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'auto-multi')).toBe(true)

      const state20 = createTestState({ turnCount: 20, gameId: 'auto-multi' })
      middleware.afterTurn(state20)
      await waitForSave()

      const loaded20 = await storageService.loadGame('auto-multi')
      expect(loaded20?.turnCount).toBe(20)

      const state30 = createTestState({ turnCount: 30, gameId: 'auto-multi' })
      middleware.afterTurn(state30)
      await waitForSave()

      const loaded30 = await storageService.loadGame('auto-multi')
      expect(loaded30?.turnCount).toBe(30)
    })

    test('respects custom save interval', async () => {
      const customMiddleware = new AutoSaveMiddleware(storageService, 5)

      const state1 = createTestState({ turnCount: 5, gameId: 'custom-5' })
      customMiddleware.afterTurn(state1)
      await waitForSave()

      let games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'custom-5')).toBe(true)

      const state2 = createTestState({ turnCount: 10, gameId: 'custom-10' })
      customMiddleware.afterTurn(state2)
      await waitForSave()

      games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'custom-10')).toBe(true)

      const state3 = createTestState({ turnCount: 7, gameId: 'custom-7' })
      customMiddleware.afterTurn(state3)
      await waitForSave()

      games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'custom-7')).toBe(false)
    })

    test('does not save on turn 0', async () => {
      const state = createTestState({ turnCount: 0, gameId: 'turn-0' })

      middleware.afterTurn(state)
      await waitForSave()

      const games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'turn-0')).toBe(false)
    })

    test('does not save if game is over', async () => {
      const state = createTestState({
        turnCount: 10,
        isGameOver: true,
        gameId: 'game-over-auto',
      })

      middleware.afterTurn(state)
      await waitForSave()

      const games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'game-over-auto')).toBe(false)
    })

    test('does not save if player has won', async () => {
      const state = createTestState({
        turnCount: 20,
        isGameOver: true,
        hasWon: true,
        gameId: 'won-auto',
      })

      middleware.afterTurn(state)
      await waitForSave()

      const games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'won-auto')).toBe(false)
    })

    test('handles save failure gracefully', async () => {
      // Mock saveGame to return rejected promise
      const originalSaveGame = storageService.saveGame.bind(storageService)
      storageService.saveGame = jest.fn(() => {
        return Promise.reject(new Error('Storage quota exceeded'))
      })

      const state = createTestState({ turnCount: 10 })

      // Should not throw
      expect(() => middleware.afterTurn(state)).not.toThrow()

      // Wait for async error handling
      await waitForSave()

      // Restore
      storageService.saveGame = originalSaveGame
    })

    test('saves complete game state', async () => {
      const state = createTestState({
        turnCount: 20,
        currentLevel: 3,
        hasAmulet: true,
        gameId: 'complete-auto',
      })

      middleware.afterTurn(state)
      await waitForSave()

      const loaded = await storageService.loadGame('complete-auto')
      expect(loaded).not.toBeNull()
      expect(loaded?.turnCount).toBe(20)
      expect(loaded?.currentLevel).toBe(3)
      expect(loaded?.hasAmulet).toBe(true)
    })

    test('interval of 1 saves every turn', async () => {
      const everyTurnMiddleware = new AutoSaveMiddleware(storageService, 1)

      for (let turn = 1; turn <= 5; turn++) {
        const state = createTestState({ turnCount: turn, gameId: `every-${turn}` })
        everyTurnMiddleware.afterTurn(state)
        await waitForSave()

        const games = await storageService.listGames()
        expect(games.some((g) => g.gameId === `every-${turn}`)).toBe(true)
      }
    })

    test('interval of 100 saves on turn 100, 200, etc', async () => {
      const longInterval = new AutoSaveMiddleware(storageService, 100)

      const state99 = createTestState({ turnCount: 99, gameId: 'long-99' })
      longInterval.afterTurn(state99)
      await waitForSave()

      let games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'long-99')).toBe(false)

      const state100 = createTestState({ turnCount: 100, gameId: 'long-100' })
      longInterval.afterTurn(state100)
      await waitForSave()

      games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'long-100')).toBe(true)

      const state200 = createTestState({ turnCount: 200, gameId: 'long-200' })
      longInterval.afterTurn(state200)
      await waitForSave()

      games = await storageService.listGames()
      expect(games.some((g) => g.gameId === 'long-200')).toBe(true)
    })
  })

  describe('Replay Validation (Debug Mode)', () => {
    let mockReplayDebugger: jest.Mocked<ReplayDebuggerService>

    beforeEach(() => {
      // Create mock ReplayDebuggerService
      mockReplayDebugger = {
        loadReplay: jest.fn(),
        validateDeterminism: jest.fn(),
        reconstructToTurn: jest.fn(),
      } as any
    })

    test('should validate determinism after save in debug mode', async () => {
      // Mock environment to enable debug mode
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const middlewareWithDebugger = new AutoSaveMiddleware(
        storageService,
        10,
        undefined, // commandRecorder
        mockReplayDebugger
      )

      // Setup mock to return valid replay data
      mockReplayDebugger.loadReplay.mockResolvedValue({
        gameId: 'test-validation',
        version: 1,
        initialState: createTestState(),
        seed: 'test-seed',
        commands: [],
        metadata: {
          createdAt: Date.now(),
          turnCount: 10,
          characterName: 'Test Hero',
          currentLevel: 1,
          outcome: 'ongoing',
        },
      })

      // Setup mock to return successful validation
      mockReplayDebugger.validateDeterminism.mockResolvedValue({
        valid: true,
        desyncs: [],
      })

      const state = createTestState({ turnCount: 10, gameId: 'test-validation' })

      middlewareWithDebugger.afterTurn(state)
      await waitForSave()
      await new Promise((resolve) => setTimeout(resolve, 100)) // Extra wait for validation

      // Restore environment
      process.env.NODE_ENV = originalEnv

      expect(mockReplayDebugger.loadReplay).toHaveBeenCalledWith('test-validation')
      expect(mockReplayDebugger.validateDeterminism).toHaveBeenCalled()
    })

    test('should log errors on desync detection', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const middlewareWithDebugger = new AutoSaveMiddleware(
        storageService,
        10,
        undefined, // commandRecorder
        mockReplayDebugger
      )

      // Setup mock to return replay data
      mockReplayDebugger.loadReplay.mockResolvedValue({
        gameId: 'test-desync',
        version: 1,
        initialState: createTestState(),
        seed: 'test-seed',
        commands: [],
        metadata: {
          createdAt: Date.now(),
          turnCount: 10,
          characterName: 'Test Hero',
          currentLevel: 1,
          outcome: 'ongoing',
        },
      })

      // Setup mock to return failed validation with desyncs
      const validationResult: ValidationResult = {
        valid: false,
        desyncs: [
          {
            turn: 10,
            field: 'player.hp',
            expected: 100,
            actual: 90,
          },
          {
            turn: 10,
            field: 'player.gold',
            expected: 50,
            actual: 60,
          },
        ],
      }
      mockReplayDebugger.validateDeterminism.mockResolvedValue(validationResult)

      const state = createTestState({ turnCount: 10, gameId: 'test-desync' })

      middlewareWithDebugger.afterTurn(state)
      await waitForSave()
      await new Promise((resolve) => setTimeout(resolve, 100)) // Extra wait for validation

      // Verify error logs
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('NON-DETERMINISM DETECTED')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('2 desync(s)'))

      // Cleanup
      consoleErrorSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })

    test('should pass validation on deterministic game', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

      const middlewareWithDebugger = new AutoSaveMiddleware(
        storageService,
        10,
        undefined, // commandRecorder
        mockReplayDebugger
      )

      // Setup mock to return replay data
      mockReplayDebugger.loadReplay.mockResolvedValue({
        gameId: 'test-deterministic',
        version: 1,
        initialState: createTestState(),
        seed: 'test-seed',
        commands: [],
        metadata: {
          createdAt: Date.now(),
          turnCount: 10,
          characterName: 'Test Hero',
          currentLevel: 1,
          outcome: 'ongoing',
        },
      })

      // Setup mock to return successful validation
      mockReplayDebugger.validateDeterminism.mockResolvedValue({
        valid: true,
        desyncs: [],
      })

      const state = createTestState({ turnCount: 10, gameId: 'test-deterministic' })

      middlewareWithDebugger.afterTurn(state)
      await waitForSave()
      await new Promise((resolve) => setTimeout(resolve, 100)) // Extra wait for validation

      // Verify success log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Determinism validated at turn 10')
      )

      // Cleanup
      consoleLogSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })
})
