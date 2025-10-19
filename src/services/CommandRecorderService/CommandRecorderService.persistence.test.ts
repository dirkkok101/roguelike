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

  describe('persistToIndexedDB (deprecated - now no-op)', () => {
    it('should be a no-op (replay data embedded in saves now)', async () => {
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

      // Should NOT call IndexedDB (method is now a no-op)
      expect(mockIndexedDB.put).not.toHaveBeenCalled()
    })

    it('should not throw on empty command list', async () => {
      const gameId = 'game-empty'
      service.startRecording(gameState, gameId)

      // Should resolve without error
      await expect(service.persistToIndexedDB(gameId)).resolves.not.toThrow()

      expect(mockIndexedDB.put).not.toHaveBeenCalled()
    })

    it('should not throw even if not initialized', async () => {
      // Should resolve without error (no-op)
      await expect(service.persistToIndexedDB('game-uninit')).resolves.not.toThrow()

      expect(mockIndexedDB.put).not.toHaveBeenCalled()
    })
  })
})
