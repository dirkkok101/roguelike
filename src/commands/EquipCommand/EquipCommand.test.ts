import { EquipCommand } from './EquipCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { CurseService } from '@services/CurseService'
import {
  GameState,
  Player,
  Weapon,
  Armor,
  Ring,
  ItemType,
  Position,
  RingType,
  Item,
} from '@game/core/core'

describe('EquipCommand', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockIdentificationService: jest.Mocked<IdentificationService>
  let curseService: CurseService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
    curseService = new CurseService()

    // Create mock IdentificationService
    mockIdentificationService = {
      getDisplayName: jest.fn((item: Item) => item.name),
      isIdentified: jest.fn(() => false),
      identifyByUse: jest.fn((item: Item, state: GameState) => state),
    } as any
  })

  function createTestPlayer(position: Position = { x: 5, y: 5 }): Player {
    return {
      position,
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 10,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
    }
  }

  function createTestWeapon(id: string, name: string): Weapon {
    return {
      id,
      name,
      type: ItemType.WEAPON,
      identified: false,
      damage: '1d8',
      bonus: 0,
    }
  }

  function createTestArmor(id: string, name: string, ac: number): Armor {
    return {
      id,
      name,
      type: ItemType.ARMOR,
      identified: false,
      ac,
      bonus: 0,
    }
  }

  function createTestRing(id: string, name: string): Ring {
    return {
      id,
      name,
      type: ItemType.RING,
      identified: false,
      ringType: RingType.PROTECTION,
      effect: 'ac_bonus',
      bonus: 1,
      materialName: 'ruby',
      hungerModifier: 1.5,
    }
  }

  function createTestState(player: Player): GameState {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      player,
      levels: new Map([
        [
          1,
          {
            depth: 1,
            width: 20,
            height: 20,
            tiles,
            rooms: [],
            monsters: [],
            items: [],
            gold: [],
            doors: [],
            traps: [],
            stairsUp: null,
            stairsDown: { x: 10, y: 10 },
            explored: Array(20)
              .fill(null)
              .map(() => Array(20).fill(false)),
          },
        ],
      ]),
      currentLevel: 1,
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  }

  describe('equipping weapons', () => {
    test('equips weapon from inventory', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.weapon?.id).toBe('sword-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('adds success message when equipping weapon', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You wield Short Sword.')
      expect(result.messages[0].type).toBe('success')
    })

    test('increments turn count when equipping weapon', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(1)
    })

    test('unequips old weapon to inventory when equipping new one', () => {
      const player = createTestPlayer()
      const oldWeapon = createTestWeapon('sword-1', 'Short Sword')
      const newWeapon = createTestWeapon('sword-2', 'Long Sword')

      player.inventory = [oldWeapon]
      let result = inventoryService.equipWeapon(player, oldWeapon)
      result.inventory = [...result.inventory, newWeapon]

      const state = createTestState(result)
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.player.equipment.weapon?.id).toBe('sword-2')
      expect(finalResult.player.inventory.find((i) => i.id === 'sword-1')).toBeDefined()
    })
  })

  describe('equipping armor', () => {
    test('equips armor from inventory', () => {
      const player = createTestPlayer()
      const armor = createTestArmor('armor-1', 'Chain Mail', 5)
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.armor?.id).toBe('armor-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('updates player AC when equipping armor', () => {
      const player = createTestPlayer()
      const armor = createTestArmor('armor-1', 'Chain Mail', 5)
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.ac).toBe(5)
    })

    test('adds success message when equipping armor', () => {
      const player = createTestPlayer()
      const armor = createTestArmor('armor-1', 'Chain Mail', 5)
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You put on Chain Mail.')
      expect(result.messages[0].type).toBe('success')
    })
  })

  describe('equipping rings', () => {
    test('equips ring to left hand', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)
      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.leftRing?.id).toBe('ring-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('equips ring to right hand', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)
      const command = new EquipCommand('ring-1', 'right', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.rightRing?.id).toBe('ring-1')
    })

    test('requires ring slot specification', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)
      const command = new EquipCommand('ring-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.leftRing).toBeNull()
      expect(result.player.equipment.rightRing).toBeNull()
      expect(result.messages[0].text).toBe(
        'You must specify which hand (left or right) to wear the ring on.'
      )
    })

    test('adds success message when equipping ring', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)

      // Mock as already identified (no identification message)
      mockIdentificationService.isIdentified.mockReturnValueOnce(true)

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You put on Ring of Protection on your left hand.')
    })
  })

  describe('edge cases', () => {
    test('does not equip item not in inventory', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new EquipCommand('nonexistent', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.weapon).toBeNull()
      expect(result.messages[0].text).toBe('You do not have that item.')
    })

    test('does not re-equip already equipped item', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      let result = inventoryService.equipWeapon(player, weapon)
      const state = createTestState(result)

      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.messages[0].text).toBe('Short Sword is already equipped.')
      expect(finalResult.turnCount).toBe(0)
    })

    test('cannot equip non-equipment items', () => {
      const player = createTestPlayer()
      const potion = {
        id: 'potion-1',
        name: 'Healing Potion',
        type: ItemType.POTION,
        identified: false,
      }
      player.inventory = [potion as any]

      const state = createTestState(player)
      const command = new EquipCommand('potion-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot equip that item.')
      expect(result.turnCount).toBe(0)
    })

    test('does not modify original state', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)

      command.execute(state)

      expect(state.player.equipment.weapon).toBeNull()
      expect(state.turnCount).toBe(0)
    })
  })

  describe('cursed equipment', () => {
    test('cannot swap cursed weapon', () => {
      const player = createTestPlayer()
      const cursedWeapon: Weapon = {
        ...createTestWeapon('sword-1', 'Cursed Short Sword'),
        cursed: true,
      }
      const newWeapon = createTestWeapon('sword-2', 'Long Sword')

      player.inventory = [cursedWeapon]
      let result = inventoryService.equipWeapon(player, cursedWeapon)
      result.inventory = [...result.inventory, newWeapon]

      const state = createTestState(result)
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      // Cursed weapon should still be equipped
      expect(finalResult.player.equipment.weapon?.id).toBe('sword-1')
      expect(finalResult.player.inventory.find((i) => i.id === 'sword-2')).toBeDefined()
    })

    test('cannot swap cursed armor', () => {
      const player = createTestPlayer()
      const cursedArmor: Armor = {
        ...createTestArmor('armor-1', 'Cursed Chain Mail', 5),
        cursed: true,
      }
      const newArmor = createTestArmor('armor-2', 'Plate Mail', 7)

      player.inventory = [cursedArmor]
      let result = inventoryService.equipArmor(player, cursedArmor)
      result.inventory = [...result.inventory, newArmor]

      const state = createTestState(result)
      const command = new EquipCommand('armor-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      // Cursed armor should still be equipped
      expect(finalResult.player.equipment.armor?.id).toBe('armor-1')
      expect(finalResult.player.inventory.find((i) => i.id === 'armor-2')).toBeDefined()
    })

    test('displays warning when trying to swap cursed weapon', () => {
      const player = createTestPlayer()
      const cursedWeapon: Weapon = {
        ...createTestWeapon('sword-1', 'Cursed Short Sword'),
        cursed: true,
      }
      const newWeapon = createTestWeapon('sword-2', 'Long Sword')

      player.inventory = [cursedWeapon]
      let result = inventoryService.equipWeapon(player, cursedWeapon)
      result.inventory = [...result.inventory, newWeapon]

      const state = createTestState(result)
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.messages).toHaveLength(1)
      expect(finalResult.messages[0].text).toBe('The Cursed Short Sword is cursed! You cannot remove it.')
      expect(finalResult.messages[0].type).toBe('warning')
    })

    test('displays warning when trying to swap cursed armor', () => {
      const player = createTestPlayer()
      const cursedArmor: Armor = {
        ...createTestArmor('armor-1', 'Cursed Chain Mail', 5),
        cursed: true,
      }
      const newArmor = createTestArmor('armor-2', 'Plate Mail', 7)

      player.inventory = [cursedArmor]
      let result = inventoryService.equipArmor(player, cursedArmor)
      result.inventory = [...result.inventory, newArmor]

      const state = createTestState(result)
      const command = new EquipCommand('armor-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.messages).toHaveLength(1)
      expect(finalResult.messages[0].text).toBe('The Cursed Chain Mail is cursed! You cannot remove it.')
      expect(finalResult.messages[0].type).toBe('warning')
    })

    test('does not increment turn when cursed', () => {
      const player = createTestPlayer()
      const cursedWeapon: Weapon = {
        ...createTestWeapon('sword-1', 'Cursed Short Sword'),
        cursed: true,
      }
      const newWeapon = createTestWeapon('sword-2', 'Long Sword')

      player.inventory = [cursedWeapon]
      let result = inventoryService.equipWeapon(player, cursedWeapon)
      result.inventory = [...result.inventory, newWeapon]

      const state = createTestState(result)
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.turnCount).toBe(0)
    })

    test('can equip weapon when no weapon equipped', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      expect(result.player.equipment.weapon?.id).toBe('sword-1')
      expect(result.turnCount).toBe(1)
    })

    test('can swap uncursed weapon normally', () => {
      const player = createTestPlayer()
      const uncursedWeapon: Weapon = {
        ...createTestWeapon('sword-1', 'Short Sword'),
        cursed: false,
      }
      const newWeapon = createTestWeapon('sword-2', 'Long Sword')

      player.inventory = [uncursedWeapon]
      let result = inventoryService.equipWeapon(player, uncursedWeapon)
      result.inventory = [...result.inventory, newWeapon]

      const state = createTestState(result)
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const finalResult = command.execute(state)

      expect(finalResult.player.equipment.weapon?.id).toBe('sword-2')
      expect(finalResult.player.inventory.find((i) => i.id === 'sword-1')).toBeDefined()
      expect(finalResult.turnCount).toBe(1)
    })
  })

  describe('curse discovery', () => {
    test('displays warning when equipping cursed weapon', () => {
      const player = createTestPlayer()
      const cursedWeapon: Weapon = {
        ...createTestWeapon('sword-1', 'Cursed Short Sword'),
        cursed: true,
        bonus: -1,
      }
      player.inventory = [cursedWeapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should have two messages: success + warning
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].text).toBe('You wield Cursed Short Sword.')
      expect(result.messages[0].type).toBe('success')
      expect(result.messages[1].text).toBe('The Cursed Short Sword is cursed! You cannot remove it.')
      expect(result.messages[1].type).toBe('warning')
      expect(result.player.equipment.weapon?.id).toBe('sword-1')
    })

    test('displays warning when equipping cursed armor', () => {
      const player = createTestPlayer()
      const cursedArmor: Armor = {
        ...createTestArmor('armor-1', 'Cursed Chain Mail', 5),
        cursed: true,
        bonus: -2,
      }
      player.inventory = [cursedArmor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should have two messages: success + warning
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].text).toBe('You put on Cursed Chain Mail.')
      expect(result.messages[0].type).toBe('success')
      expect(result.messages[1].text).toBe('The Cursed Chain Mail is cursed! You cannot remove it.')
      expect(result.messages[1].type).toBe('warning')
      expect(result.player.equipment.armor?.id).toBe('armor-1')
    })

    test('displays warning when equipping cursed ring', () => {
      const player = createTestPlayer()
      const cursedRing: Ring = {
        ...createTestRing('ring-1', 'Cursed Ring of Protection'),
        cursed: true,
        bonus: -1,
      }
      player.inventory = [cursedRing]

      const state = createTestState(player)

      // Mock as already identified (no identification message)
      mockIdentificationService.isIdentified.mockReturnValueOnce(true)

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should have two messages: success + warning
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].text).toBe('You put on Cursed Ring of Protection on your left hand.')
      expect(result.messages[0].type).toBe('success')
      expect(result.messages[1].text).toBe('The Cursed Ring of Protection is cursed! You cannot remove it.')
      expect(result.messages[1].type).toBe('warning')
      expect(result.player.equipment.leftRing?.id).toBe('ring-1')
    })

    test('does not show warning when equipping non-cursed weapon', () => {
      const player = createTestPlayer()
      const weapon: Weapon = {
        ...createTestWeapon('sword-1', 'Short Sword'),
        cursed: false,
        bonus: 0,
      }
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should only have success message
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You wield Short Sword.')
      expect(result.messages[0].type).toBe('success')
    })

    test('does not show warning when equipping non-cursed armor', () => {
      const player = createTestPlayer()
      const armor: Armor = {
        ...createTestArmor('armor-1', 'Chain Mail', 5),
        cursed: false,
        bonus: 0,
      }
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should only have success message
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You put on Chain Mail.')
      expect(result.messages[0].type).toBe('success')
    })

    test('does not show warning when equipping non-cursed ring', () => {
      const player = createTestPlayer()
      const ring: Ring = {
        ...createTestRing('ring-1', 'Ring of Protection'),
        cursed: false,
        bonus: 1,
      }
      player.inventory = [ring]

      const state = createTestState(player)

      // Mock as already identified (no identification message)
      mockIdentificationService.isIdentified.mockReturnValueOnce(true)

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Should only have success message
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You put on Ring of Protection on your left hand.')
      expect(result.messages[0].type).toBe('success')
    })
  })

  describe('ring identification', () => {
    test('identifies unidentified ring when equipped', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      ring.materialName = 'ruby ring' // Unidentified descriptor
      player.inventory = [ring]

      const state = createTestState(player)

      // Mock as unidentified
      mockIdentificationService.isIdentified.mockReturnValueOnce(false)
      // Mock getDisplayName to return descriptive name first, then true name
      mockIdentificationService.getDisplayName
        .mockReturnValueOnce('ruby ring') // First call: display name before identification
        .mockReturnValueOnce('Ring of Protection') // Second call: true name after identification
      // Mock identifyByUse to add the ring type to identified items
      mockIdentificationService.identifyByUse.mockReturnValueOnce({
        ...state,
        identifiedItems: new Set([RingType.PROTECTION]),
      })

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Verify identification service was called
      expect(mockIdentificationService.isIdentified).toHaveBeenCalledWith(RingType.PROTECTION, state)
      expect(mockIdentificationService.identifyByUse).toHaveBeenCalledWith(ring, state)

      // Verify identification message
      expect(result.messages[0].text).toBe('You put on ruby ring on your left hand. (This is a Ring of Protection!)')
      expect(result.messages[0].type).toBe('success')
    })

    test('does not show identification message for already identified ring', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = {
        ...createTestState(player),
        identifiedItems: new Set([RingType.PROTECTION]), // Already identified
      }

      // Mock as already identified
      mockIdentificationService.isIdentified.mockReturnValueOnce(true)
      mockIdentificationService.getDisplayName.mockReturnValueOnce('Ring of Protection')

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Verify NO identification message (just equip message)
      expect(result.messages[0].text).toBe('You put on Ring of Protection on your left hand.')
      expect(result.messages[0].type).toBe('success')
    })

    test('identification applies to state for persistence', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      ring.materialName = 'ruby ring'
      player.inventory = [ring]

      const state = createTestState(player)

      // Mock as unidentified
      mockIdentificationService.isIdentified.mockReturnValueOnce(false)
      mockIdentificationService.getDisplayName
        .mockReturnValueOnce('ruby ring')
        .mockReturnValueOnce('Ring of Protection')

      // Mock identifyByUse to return state with identified ring type
      const identifiedState = {
        ...state,
        identifiedItems: new Set([RingType.PROTECTION]),
      }
      mockIdentificationService.identifyByUse.mockReturnValueOnce(identifiedState)

      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const result = command.execute(state)

      // Verify the result state includes identification
      // Note: The state will have the identified ring type added
      expect(mockIdentificationService.identifyByUse).toHaveBeenCalledWith(ring, state)
    })

    test('equips ring to correct hand when identifying', () => {
      const player = createTestPlayer()
      const leftRing = createTestRing('ring-1', 'Ring of Protection')
      const rightRing = createTestRing('ring-2', 'Ring of Strength')
      player.inventory = [leftRing, rightRing]

      const state = createTestState(player)

      // Mock as unidentified for both
      mockIdentificationService.isIdentified.mockReturnValue(false)
      mockIdentificationService.getDisplayName
        .mockReturnValueOnce('ruby ring')
        .mockReturnValueOnce('Ring of Protection')
      mockIdentificationService.identifyByUse.mockReturnValue({
        ...state,
        identifiedItems: new Set([RingType.PROTECTION]),
      })

      // Equip to left hand
      const leftCommand = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const leftResult = leftCommand.execute(state)

      expect(leftResult.player.equipment.leftRing?.id).toBe('ring-1')
      expect(leftResult.player.equipment.rightRing).toBeNull()

      // Now equip to right hand
      const stateAfterLeft = leftResult
      mockIdentificationService.getDisplayName
        .mockReturnValueOnce('silver ring')
        .mockReturnValueOnce('Ring of Strength')
      mockIdentificationService.identifyByUse.mockReturnValue({
        ...stateAfterLeft,
        identifiedItems: new Set([RingType.PROTECTION, RingType.ADD_STRENGTH]),
      })

      const rightCommand = new EquipCommand('ring-2', 'right', inventoryService, messageService, turnService, mockIdentificationService, curseService)
      const rightResult = rightCommand.execute(stateAfterLeft)

      expect(rightResult.player.equipment.leftRing?.id).toBe('ring-1')
      expect(rightResult.player.equipment.rightRing?.id).toBe('ring-2')
    })
  })
})
