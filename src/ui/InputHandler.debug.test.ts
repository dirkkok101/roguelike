import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'

describe('InputHandler - Debug Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager
  let gameRenderer: GameRenderer

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    // Enable debug mode and open console
    state.debug = {
      debugConsoleVisible: true,
      godMode: false,
      revealMap: false,
      fovDebugOverlay: false,
      pathDebugOverlay: false,
      aiDebugOverlay: false,
      fovMode: 'radius',
    }

    // Create minimal mocks for UI dependencies
    modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      showSpawnItemCategory: jest.fn(),
      showSpawnItemSubtype: jest.fn(),
      hide: jest.fn(),
    } as any

    const messageHistoryModal = { show: jest.fn() }
    const helpModal = { show: jest.fn() }
    const onReturnToMenu = jest.fn()
    stateManager = new GameStateManager()
    gameRenderer = {} as any // Not needed for these tests

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

  describe('ToggleDebugConsoleCommand (~)', () => {
    it('should handle ~ (toggle console) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('~')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert: Command should be created
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for toggle console', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('~')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rngState: expect.any(String),
          actorType: 'player',
          turnNumber: expect.any(Number),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('~')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('ToggleGodModeCommand (g)', () => {
    it('should handle g (god mode) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('g')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for god mode', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('g')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rngState: expect.any(String),
          actorType: 'player',
          turnNumber: expect.any(Number),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('g')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('RevealMapCommand (v)', () => {
    it('should handle v (reveal map) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('v')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for reveal map', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('v')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('v')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('SpawnMonsterCommand (m)', () => {
    it('should handle m (spawn monster) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('m')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for spawn monster', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('m')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('m')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('WakeAllMonstersCommand (M)', () => {
    it('should handle M (wake all) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('M', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for wake all', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('M', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('M', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('KillAllMonstersCommand (K)', () => {
    it('should handle K (kill all) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('K', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for kill all', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('K', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('K', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('IdentifyAllItemsCommand (a)', () => {
    it('should handle a (identify all) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('a')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for identify all', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('a')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('a')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('ToggleFOVDebugCommand (f)', () => {
    it('should handle f (FOV debug) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('f')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for FOV debug', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('f')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('f')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('TogglePathDebugCommand (p)', () => {
    it('should handle p (path debug) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('p')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for path debug', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('p')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('p')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('ToggleAIDebugCommand (n)', () => {
    it('should handle n (AI debug) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('n')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for AI debug', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('n')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('n')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('ToggleFOVModeCommand (x)', () => {
    it('should handle x (FOV mode) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('x')

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for FOV mode', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('x')

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalledTimes(1)
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const event = createKeyboardEvent('x')

      // Act
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('SpawnItemCommand (I)', () => {
    it('should handle I (spawn item) key press without errors', () => {
      // Arrange
      const event = createKeyboardEvent('I', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert: Opens modal, no immediate command
      expect(command).toBeNull()
    })
  })

  describe('Replay Debug Commands', () => {
    beforeEach(() => {
      // Mock IndexedDB operations to avoid "indexedDB is not defined" errors in test environment
      jest.spyOn(dependencies.replayDebugger, 'loadReplay').mockResolvedValue(null)

      // Suppress console output from replay commands (expected in test environment)
      jest.spyOn(console, 'error').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()
    })

    it('should handle L (launch replay debugger) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('L', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle C (choose replay) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('C', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle E (export replay) without errors', () => {
      // Arrange
      const event = createKeyboardEvent('E', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for launch replay debugger', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')
      const event = createKeyboardEvent('L', false, true)

      // Act
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert: LaunchReplayDebuggerCommand does not record (it's a meta command)
      // No recording expected - this is a UI command that doesn't affect game state
      expect(recordSpy).not.toHaveBeenCalled()
    })
  })

  describe('Command Recording', () => {
    it('should record all debug toggle commands with proper metadata', () => {
      // Arrange
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      // Act: Execute several debug toggle commands
      const commands = [
        { key: '~', desc: 'toggle console' },
        { key: 'g', desc: 'god mode' },
        { key: 'v', desc: 'reveal map' },
        { key: 'f', desc: 'FOV debug' },
        { key: 'p', desc: 'path debug' },
        { key: 'n', desc: 'AI debug' },
      ]

      commands.forEach(({ key }) => {
        const event = createKeyboardEvent(key)
        const command = handler.handleKeyPress(event, state)
        command!.execute(state)
      })

      // Assert: All commands should be recorded
      expect(recordSpy).toHaveBeenCalledTimes(6)

      // Verify each call has required metadata
      for (let i = 0; i < 6; i++) {
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
