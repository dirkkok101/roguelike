import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'

describe('InputHandler - Actions Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager
  let onReturnToMenu: jest.Mock

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    // Create minimal mocks for UI dependencies
    modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      hide: jest.fn(),
    } as any

    const messageHistoryModal = { show: jest.fn() }
    const helpModal = { show: jest.fn() }
    onReturnToMenu = jest.fn()
    stateManager = new GameStateManager()
    const gameRenderer = {} as any // Not needed for these tests

    handler = new InputHandler(
      dependencies,
      modalController,
      messageHistoryModal,
      helpModal,
      onReturnToMenu,
      stateManager,
      gameRenderer
    )
  })

  describe('SearchCommand (s)', () => {
    it('should handle s (search) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('s')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert: Command should be created
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for search', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('s')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          commandType: expect.any(String),
          rngState: expect.any(String),
          actorType: 'player',
        })
      )
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('s')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('SaveCommand (S)', () => {
    it('should handle S (save) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('S', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert: Command should be created
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for save', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('S', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rngState: expect.any(String),
          actorType: 'player',
          payload: expect.any(Object),
        })
      )
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('S', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })

    it('should not save when game is over', () => {
      // Arrange
      state.isGameOver = true
      const saveSpy = jest.spyOn(dependencies.localStorage, 'saveGame')
      const event = createKeyboardEvent('S', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert: Save should not be called
      expect(saveSpy).not.toHaveBeenCalled()
      expect(newState).toBe(state) // Should return same state unchanged
    })
  })

  describe('QuitCommand (Q)', () => {
    beforeEach(() => {
      // Mock saveGame to prevent actual save attempts
      jest.spyOn(dependencies.localStorage, 'saveGame').mockResolvedValue(undefined)
    })

    it('should handle Q (quit) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('Q', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert: Command should be created
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for quit', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('Q', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rngState: expect.any(String),
          actorType: 'player',
          payload: expect.any(Object),
        })
      )
    })

    it('should trigger onReturnToMenu callback when game is over', () => {
      // Arrange
      state.isGameOver = true
      const event = createKeyboardEvent('Q', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert: Should immediately call return to menu (no save)
      expect(onReturnToMenu).toHaveBeenCalled()
    })

    it('should save game before quitting when game is not over', () => {
      // Arrange
      state.isGameOver = false
      const saveSpy = jest.spyOn(dependencies.localStorage, 'saveGame')
      const event = createKeyboardEvent('Q', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert: Should attempt to save
      // Note: QuitCommand uses the old signature (promise-based) not callback-based
      expect(saveSpy).toHaveBeenCalledWith(state)
    })

    it('should return same state object for quit', async () => {
      // Arrange
      const event = createKeyboardEvent('Q', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = await command!.execute(state)

      // Assert: QuitCommand returns state unchanged (no turn increment)
      expect(newState).toBe(state)
    })
  })

  describe('Command Recording', () => {
    it('should record all action commands with proper metadata', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      // Act: Execute all three action commands
      const searchEvent = createKeyboardEvent('s')
      const searchCommand = handler.handleKeyPress(searchEvent, state)
      searchCommand!.execute(state)

      const saveEvent = createKeyboardEvent('S', false, true)
      const saveCommand = handler.handleKeyPress(saveEvent, state)
      saveCommand!.execute(state)

      const quitEvent = createKeyboardEvent('Q', false, true)
      const quitCommand = handler.handleKeyPress(quitEvent, state)
      quitCommand!.execute(state)

      // Assert: All three commands should be recorded
      expect(recordSpy).toHaveBeenCalledTimes(3)

      // Verify each call has required metadata
      for (let i = 0; i < 3; i++) {
        expect(recordSpy).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({
            turnNumber: expect.any(Number),
            timestamp: expect.any(Number),
            actorType: 'player',
            payload: expect.any(Object),
            rngState: expect.any(String),
          })
        )
      }
    })
  })
})
