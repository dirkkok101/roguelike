import { CommandRecorderService } from './CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'
import { createTestGameState } from '@/ui/test-helpers/InputHandlerTestHelpers'

describe('CommandRecorderService - Persistence', () => {
  let service: CommandRecorderService
  let mockIndexedDB: jest.Mocked<IndexedDBService>
  let gameState: ReturnType<typeof createTestGameState>

  beforeEach(() => {
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

    service = new CommandRecorderService(mockIndexedDB)
    gameState = createTestGameState()
  })

  describe('persistToIndexedDB', () => {
    it('should persist replay data to IndexedDB', async () => {
      const gameId = 'game-123'
      service.startRecording(gameState, gameId)

      // Record some commands
      service.recordCommand({
        commandType: 'move',
        payload: { direction: { x: 1, y: 0 } },
        rngState: 'seed-123-0',
        actorType: 'player',
        turnNumber: 1,
        timestamp: Date.now(),
      })

      await service.persistToIndexedDB(gameId)

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        'replays',
        gameId,
        expect.objectContaining({
          gameId,
          version: 1,
          commands: expect.arrayContaining([
            expect.objectContaining({
              commandType: 'move',
              actorType: 'player',
            }),
          ]),
          initialState: expect.objectContaining({
            seed: gameState.seed,
            currentLevel: gameState.currentLevel,
          }),
          seed: gameState.seed,
          metadata: expect.objectContaining({
            turnCount: 1,
            createdAt: expect.any(Number),
          }),
        })
      )
    })

    it('should handle empty command list gracefully', async () => {
      const gameId = 'game-empty'
      service.startRecording(gameState, gameId)

      await service.persistToIndexedDB(gameId)

      // Should warn but not throw
      expect(mockIndexedDB.put).not.toHaveBeenCalled()
    })

    it('should handle IndexedDB errors gracefully', async () => {
      const gameId = 'game-error'
      service.startRecording(gameState, gameId)
      service.recordCommand({
        commandType: 'move',
        payload: { direction: { x: 1, y: 0 } },
        rngState: 'seed-123',
        actorType: 'player',
        turnNumber: 1,
        timestamp: Date.now(),
      })

      mockIndexedDB.put.mockRejectedValue(new Error('IndexedDB not available'))

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Should not throw
      await expect(service.persistToIndexedDB(gameId)).resolves.not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not persist replay data'),
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })

    it('should not persist if not initialized (no commands)', async () => {
      // Don't call startRecording - service starts uninitialized
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.persistToIndexedDB('game-uninit')

      expect(mockIndexedDB.put).not.toHaveBeenCalled()
      // When not initialized, there are no commands, so it warns about empty commands
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No commands to persist')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should not persist if initialized but no initial state captured', async () => {
      // Manually add a command without calling startRecording
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      service.recordCommand({
        commandType: 'move',
        payload: { direction: { x: 1, y: 0 } },
        rngState: 'seed-123',
        actorType: 'player',
        turnNumber: 1,
        timestamp: Date.now(),
      })

      await service.persistToIndexedDB('game-broken')

      expect(mockIndexedDB.put).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not properly initialized')
      )

      consoleErrorSpy.mockRestore()
    })

    it('should include metadata with timestamps', async () => {
      const gameId = 'game-meta'
      const startTime = Date.now()

      service.startRecording(gameState, gameId)
      service.recordCommand({
        commandType: 'move',
        payload: { direction: { x: 1, y: 0 } },
        rngState: 'seed-123',
        actorType: 'player',
        turnNumber: 1,
        timestamp: startTime,
      })

      await service.persistToIndexedDB(gameId)

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        'replays',
        gameId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            createdAt: expect.any(Number),
            turnCount: 1,
          }),
        })
      )
    })
  })
})
