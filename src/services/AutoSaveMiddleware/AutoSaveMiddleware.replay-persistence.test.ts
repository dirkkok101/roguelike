import { AutoSaveMiddleware } from './AutoSaveMiddleware'
import { GameStorageService } from '@services/GameStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'
import { GameState } from '@game/core/core'

describe('AutoSaveMiddleware - Replay Persistence Integration', () => {
  let middleware: AutoSaveMiddleware
  let mockStorageService: jest.Mocked<GameStorageService>
  let commandRecorder: CommandRecorderService
  let mockIndexedDB: jest.Mocked<IndexedDBService>
  let gameState: GameState

  beforeEach(() => {
    // Mock storage service
    mockStorageService = {
      saveGame: jest.fn().mockResolvedValue(undefined),
      loadGame: jest.fn(),
      deleteGame: jest.fn(),
      hasActiveSave: jest.fn(),
    } as any

    // Mock IndexedDB service
    mockIndexedDB = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      query: jest.fn(),
      checkQuota: jest.fn(),
      deleteDatabase: jest.fn(),
      initDatabase: jest.fn(),
      openDatabase: jest.fn(),
    } as any

    // Create real CommandRecorderService with mocked IndexedDB
    commandRecorder = new CommandRecorderService(mockIndexedDB)

    // Create test game state
    gameState = {
      gameId: 'test-game-123',
      seed: 'test-seed',
      turnCount: 0,
      currentLevel: 1,
      isGameOver: false,
      player: {
        position: { x: 10, y: 10 },
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 8,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        energy: 0,
        statusEffects: [],
        isRunning: false,
        runState: null,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
      },
      levels: [],
      messages: [],
      version: 1,
    } as GameState

    // Initialize recording
    commandRecorder.startRecording(gameState, gameState.gameId)
  })

  it('should persist replay data when autosave triggers', async () => {
    middleware = new AutoSaveMiddleware(mockStorageService, 10, commandRecorder)

    // Set turn count to trigger autosave
    gameState.turnCount = 10

    // Record some commands
    commandRecorder.recordCommand({
      type: 'move',
      data: { direction: { x: 1, y: 0 } },
      rngState: 'seed-123-0',
      actorType: 'player',
      turnNumber: 1,
      timestamp: Date.now(),
    })

    // Trigger autosave
    middleware.afterTurn(gameState)

    // Wait for async save to complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    // saveGame is called, which internally embeds replay data automatically
    expect(mockStorageService.saveGame).toHaveBeenCalledWith(gameState)
  })

  it('should not persist replay when autosave does not trigger', async () => {
    middleware = new AutoSaveMiddleware(mockStorageService, 10, commandRecorder)

    gameState.turnCount = 9 // Not a multiple of 10

    middleware.afterTurn(gameState)

    // Wait to ensure no async calls happen
    await new Promise((resolve) => setTimeout(resolve, 100))

    // No save should occur (and thus no replay data persisted)
    expect(mockStorageService.saveGame).not.toHaveBeenCalled()
  })

  it('should handle save errors gracefully', async () => {
    middleware = new AutoSaveMiddleware(mockStorageService, 10, commandRecorder)

    gameState.turnCount = 10

    // Record a command
    commandRecorder.recordCommand({
      type: 'move',
      data: { direction: { x: 1, y: 0 } },
      rngState: 'seed-123-0',
      actorType: 'player',
      turnNumber: 1,
      timestamp: Date.now(),
    })

    // Make saveGame fail
    mockStorageService.saveGame.mockRejectedValue(new Error('Save error'))
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Should not throw even if save fails
    middleware.afterTurn(gameState)

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(mockStorageService.saveGame).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Save failed'),
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should not auto-save if game is over', async () => {
    middleware = new AutoSaveMiddleware(mockStorageService, 10, commandRecorder)

    gameState.turnCount = 10
    gameState.isGameOver = true

    middleware.afterTurn(gameState)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // No save should occur when game is over
    expect(mockStorageService.saveGame).not.toHaveBeenCalled()
  })

  it('should work when CommandRecorderService is not provided (backward compatibility)', async () => {
    // Create middleware without CommandRecorderService
    middleware = new AutoSaveMiddleware(mockStorageService, 10)

    gameState.turnCount = 10

    // Should still auto-save game state
    middleware.afterTurn(gameState)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(mockStorageService.saveGame).toHaveBeenCalledWith(gameState)
  })
})
