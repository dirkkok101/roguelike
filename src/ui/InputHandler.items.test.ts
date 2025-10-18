import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'
import { Food } from '@game/core/core'

describe('InputHandler - Items Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      showItemSelection: jest.fn(),
      hide: jest.fn(),
    } as any

    const messageHistoryModal = { show: jest.fn() }
    const helpModal = { show: jest.fn() }
    const onReturnToMenu = jest.fn()
    stateManager = new GameStateManager()

    handler = new InputHandler(
      dependencies,
      modalController,
      messageHistoryModal,
      helpModal,
      onReturnToMenu,
      stateManager,
      {} as any
    )
  })

  describe('PickUpCommand', () => {
    it('should handle , (pickup) without errors', () => {
      const event = createKeyboardEvent(',')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent(',')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      expect(recordSpy).toHaveBeenCalled()
    })
  })

  describe('DropCommand', () => {
    it('should handle d (drop) key press without errors', () => {
      // Add item to inventory first
      const food: Food = {
        id: 'test-food-1',
        type: 'food',
        name: 'ration',
        spriteName: 'food ration',
        nutrition: 800,
        identified: true,
        position: null,
      }
      state.player.inventory.push(food)

      const event = createKeyboardEvent('d')
      // This opens modal, doesn't return command immediately
      const command = handler.handleKeyPress(event, state)

      // Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })
  })

  describe('QuaffPotionCommand', () => {
    it('should handle q (quaff) key press without errors', () => {
      const event = createKeyboardEvent('q')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('ReadScrollCommand', () => {
    it('should handle r (read) key press without errors', () => {
      const event = createKeyboardEvent('r')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('ZapWandCommand', () => {
    it('should handle z (zap) key press without errors', () => {
      const event = createKeyboardEvent('z')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('EatCommand', () => {
    it('should handle e (eat) without errors', () => {
      const event = createKeyboardEvent('e')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('RefillLanternCommand', () => {
    it('should handle F (refill) key press without errors', () => {
      const event = createKeyboardEvent('F', false, true)
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('RestCommand', () => {
    it('should handle . (rest) without errors', () => {
      const event = createKeyboardEvent('.')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle 5 (rest) without errors', () => {
      const event = createKeyboardEvent('5')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
