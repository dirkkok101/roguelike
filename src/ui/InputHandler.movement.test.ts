import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'

describe('InputHandler - Movement Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager
  let gameRenderer: GameRenderer

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

  describe('MoveCommand - Arrow Keys', () => {
    it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
      'should handle %s without errors',
      (key) => {
        const event = createKeyboardEvent(key)
        const command = handler.handleKeyPress(event, state)

        expect(command).toBeDefined()
        expect(command).not.toBeNull()
        expect(() => command!.execute(state)).not.toThrow()
      }
    )

    it('should record command execution for ArrowRight', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent('ArrowRight')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

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
      const event = createKeyboardEvent('ArrowRight')
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('MoveStairsCommand', () => {
    it('should handle > (down stairs) without errors', () => {
      const event = createKeyboardEvent('>')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle < (up stairs) without errors', () => {
      const event = createKeyboardEvent('<')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('Door Commands', () => {
    it('should handle o (open door) mode without errors', () => {
      // First press 'o' to enter open door mode
      const oEvent = createKeyboardEvent('o')
      let command = handler.handleKeyPress(oEvent, state)
      expect(command).toBeNull() // Mode switch, no command yet

      // Then press direction
      const dirEvent = createKeyboardEvent('ArrowRight')
      command = handler.handleKeyPress(dirEvent, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle c (close door) mode without errors', () => {
      // First press 'c' to enter close door mode
      const cEvent = createKeyboardEvent('c')
      let command = handler.handleKeyPress(cEvent, state)
      expect(command).toBeNull() // Mode switch, no command yet

      // Then press direction
      const dirEvent = createKeyboardEvent('ArrowDown')
      command = handler.handleKeyPress(dirEvent, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
