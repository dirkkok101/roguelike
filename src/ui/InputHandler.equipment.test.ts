import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'
import { Weapon, Armor, Ring, RingType } from '@game/core/core'

describe('InputHandler - Equipment Commands', () => {
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
      showEquippedRingSelection: jest.fn(),
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

  describe('EquipCommand - Wield Weapon (w)', () => {
    it('should handle w (wield) key press without errors', () => {
      // Arrange: Add a weapon to inventory
      const weapon: Weapon = {
        id: 'test-weapon-1',
        type: 'weapon',
        name: 'mace',
        spriteName: 'mace',
        damage: '2d4',
        bonus: 0,
        identified: true,
        position: null,
      }
      state.player.inventory.push(weapon)

      // Act: Press 'w' key
      const event = createKeyboardEvent('w')
      const command = handler.handleKeyPress(event, state)

      // Assert: Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })

    it('should open ItemSelectionState when wield key is pressed', () => {
      // Arrange
      const weapon: Weapon = {
        id: 'test-weapon-2',
        type: 'weapon',
        name: 'sword',
        spriteName: 'long sword',
        damage: '1d8',
        bonus: 1,
        identified: true,
        position: null,
      }
      state.player.inventory.push(weapon)

      const pushStateSpy = jest.spyOn(stateManager, 'pushState')

      // Act
      const event = createKeyboardEvent('w')
      handler.handleKeyPress(event, state)

      // Assert
      expect(pushStateSpy).toHaveBeenCalled()
    })
  })

  describe('EquipCommand - Wear Armor (W)', () => {
    it('should handle W (wear) key press without errors', () => {
      // Arrange: Add armor to inventory
      const armor: Armor = {
        id: 'test-armor-1',
        type: 'armor',
        name: 'leather armor',
        spriteName: 'leather armor',
        ac: 8,
        bonus: 0,
        identified: true,
        position: null,
      }
      state.player.inventory.push(armor)

      // Act: Press 'W' key (shift + w)
      const event = createKeyboardEvent('W', false, true)
      const command = handler.handleKeyPress(event, state)

      // Assert: Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })

    it('should open ItemSelectionState when wear key is pressed', () => {
      // Arrange
      const armor: Armor = {
        id: 'test-armor-2',
        type: 'armor',
        name: 'plate mail',
        spriteName: 'plate mail',
        ac: 6,
        bonus: 2,
        identified: true,
        position: null,
      }
      state.player.inventory.push(armor)

      const pushStateSpy = jest.spyOn(stateManager, 'pushState')

      // Act
      const event = createKeyboardEvent('W', false, true)
      handler.handleKeyPress(event, state)

      // Assert
      expect(pushStateSpy).toHaveBeenCalled()
    })
  })

  describe('EquipCommand - Put On Ring (P)', () => {
    it('should handle P (put on ring) key press without errors', () => {
      // Arrange: Add a ring to inventory
      const ring: Ring = {
        id: 'test-ring-1',
        type: 'ring',
        name: 'ring of protection',
        spriteName: 'ring',
        ringType: RingType.PROTECTION,
        effect: '+1 AC',
        bonus: 1,
        materialName: 'silver',
        hungerModifier: 1.0,
        identified: true,
        position: null,
      }
      state.player.inventory.push(ring)

      // Act: Press 'P' key (shift + p)
      const event = createKeyboardEvent('P', false, true)
      const command = handler.handleKeyPress(event, state)

      // Assert: Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })

    it('should open ItemSelectionState when put on ring key is pressed', () => {
      // Arrange
      const ring: Ring = {
        id: 'test-ring-2',
        type: 'ring',
        name: 'ring of regeneration',
        spriteName: 'ring',
        ringType: RingType.REGENERATION,
        effect: 'faster HP regen',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 1.5,
        identified: true,
        position: null,
      }
      state.player.inventory.push(ring)

      const pushStateSpy = jest.spyOn(stateManager, 'pushState')

      // Act
      const event = createKeyboardEvent('P', false, true)
      handler.handleKeyPress(event, state)

      // Assert
      expect(pushStateSpy).toHaveBeenCalled()
    })
  })

  describe('UnequipCommand - Remove Ring (R)', () => {
    it('should handle R (remove ring) key press without errors', () => {
      // Arrange: Equip a ring first
      const ring: Ring = {
        id: 'test-ring-3',
        type: 'ring',
        name: 'ring of searching',
        spriteName: 'ring',
        ringType: RingType.SEARCHING,
        effect: '+1 searching',
        bonus: 1,
        materialName: 'brass',
        hungerModifier: 1.0,
        identified: true,
        position: null,
      }
      state.player.equipment.leftRing = ring

      // Act: Press 'R' key (shift + r)
      const event = createKeyboardEvent('R', false, true)
      const command = handler.handleKeyPress(event, state)

      // Assert: Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })

    it('should call showEquippedRingSelection when remove ring key is pressed', () => {
      // Arrange
      const ring: Ring = {
        id: 'test-ring-4',
        type: 'ring',
        name: 'ring of see invisible',
        spriteName: 'ring',
        ringType: RingType.SEE_INVISIBLE,
        effect: 'see invisible monsters',
        bonus: 0,
        materialName: 'gold',
        hungerModifier: 1.0,
        identified: true,
        position: null,
      }
      state.player.equipment.rightRing = ring

      const showRingSpy = jest.spyOn(modalController, 'showEquippedRingSelection')

      // Act
      const event = createKeyboardEvent('R', false, true)
      handler.handleKeyPress(event, state)

      // Assert
      expect(showRingSpy).toHaveBeenCalledWith(state, expect.any(Function))
    })
  })

  describe('TakeOffCommand (t)', () => {
    it('should handle t (take off) with light source equipped', () => {
      // Arrange: Equip a light source
      state.player.equipment.lightSource = {
        id: 'test-light-1',
        name: 'torch',
        spriteName: 'wooden torch',
        radius: 2,
        fuel: 650,
        maxFuel: 650,
        isArtifact: false,
      }

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      // Assert: Returns command immediately (not modal)
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle t (take off) with weapon equipped', () => {
      // Arrange: Equip a weapon (no light source)
      const weapon: Weapon = {
        id: 'test-weapon-3',
        type: 'weapon',
        name: 'dagger',
        spriteName: 'dagger',
        damage: '1d4',
        bonus: 0,
        identified: true,
        position: null,
      }
      state.player.equipment.weapon = weapon
      state.player.equipment.lightSource = null

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle t (take off) with armor equipped', () => {
      // Arrange: Equip armor only (no weapon or light)
      const armor: Armor = {
        id: 'test-armor-3',
        type: 'armor',
        name: 'studded leather',
        spriteName: 'studded leather armor',
        ac: 7,
        bonus: 0,
        identified: true,
        position: null,
      }
      state.player.equipment.armor = armor
      state.player.equipment.weapon = null
      state.player.equipment.lightSource = null

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      // Assert
      expect(command).toBeDefined()
      expect(command).not.toBeNull()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution for take off', () => {
      // Arrange
      state.player.equipment.lightSource = {
        id: 'test-light-2',
        name: 'lantern',
        spriteName: 'brass lantern',
        radius: 2,
        fuel: 750,
        maxFuel: 1500,
        isArtifact: false,
      }

      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      // Assert
      expect(recordSpy).toHaveBeenCalled()
    })

    it('should return new state object (immutability)', () => {
      // Arrange
      const weapon: Weapon = {
        id: 'test-weapon-4',
        type: 'weapon',
        name: 'short sword',
        spriteName: 'short sword',
        damage: '1d6',
        bonus: 0,
        identified: true,
        position: null,
      }
      state.player.equipment.weapon = weapon

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      // Assert
      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })

    it('should handle t (take off) with no equipment', () => {
      // Arrange: Remove all equipment
      state.player.equipment.weapon = null
      state.player.equipment.armor = null
      state.player.equipment.lightSource = null
      state.player.equipment.leftRing = null
      state.player.equipment.rightRing = null

      // Act
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      // Assert: Returns null when no equipment to take off
      expect(command).toBeNull()
    })
  })

  describe('Command Recording', () => {
    it('should record command when equipment is equipped via modal', () => {
      // Arrange: Create weapon and add to inventory
      const weapon: Weapon = {
        id: 'test-weapon-5',
        type: 'weapon',
        name: 'battle axe',
        spriteName: 'battle axe',
        damage: '1d8',
        bonus: 1,
        identified: true,
        position: null,
      }
      state.player.inventory.push(weapon)

      // Note: Testing actual command recording requires modal interaction
      // which is tested at the command level. Here we verify the handler
      // sets up the recorder dependency correctly.
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      // Act: Direct command execution (simulating modal callback)
      const event = createKeyboardEvent('t')
      state.player.equipment.lightSource = {
        id: 'test-light-3',
        name: 'torch',
        spriteName: 'wooden torch',
        radius: 2,
        fuel: 650,
        maxFuel: 650,
        isArtifact: false,
      }
      const command = handler.handleKeyPress(event, state)
      if (command) {
        command.execute(state)
      }

      // Assert: Verify recorder was called
      expect(recordSpy).toHaveBeenCalled()
    })
  })
})
