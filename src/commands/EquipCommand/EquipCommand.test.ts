import { EquipCommand } from './EquipCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
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

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    turnService = new TurnService(statusEffectService)

    // Create mock IdentificationService
    mockIdentificationService = {
      getDisplayName: jest.fn((item: Item) => item.name),
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
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.equipment.weapon?.id).toBe('sword-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('adds success message when equipping weapon', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('sword-2', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.equipment.armor?.id).toBe('armor-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('updates player AC when equipping armor', () => {
      const player = createTestPlayer()
      const armor = createTestArmor('armor-1', 'Chain Mail', 5)
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.ac).toBe(5)
    })

    test('adds success message when equipping armor', () => {
      const player = createTestPlayer()
      const armor = createTestArmor('armor-1', 'Chain Mail', 5)
      player.inventory = [armor]

      const state = createTestState(player)
      const command = new EquipCommand('armor-1', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.equipment.leftRing?.id).toBe('ring-1')
      expect(result.player.inventory).toHaveLength(0)
    })

    test('equips ring to right hand', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)
      const command = new EquipCommand('ring-1', 'right', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.equipment.rightRing?.id).toBe('ring-1')
    })

    test('requires ring slot specification', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')
      player.inventory = [ring]

      const state = createTestState(player)
      const command = new EquipCommand('ring-1', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('ring-1', 'left', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You put on Ring of Protection on your left hand.')
    })
  })

  describe('edge cases', () => {
    test('does not equip item not in inventory', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new EquipCommand('nonexistent', null, inventoryService, messageService, turnService, mockIdentificationService)
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

      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService)
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
      const command = new EquipCommand('potion-1', null, inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot equip that item.')
      expect(result.turnCount).toBe(0)
    })

    test('does not modify original state', () => {
      const player = createTestPlayer()
      const weapon = createTestWeapon('sword-1', 'Short Sword')
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new EquipCommand('sword-1', null, inventoryService, messageService, turnService, mockIdentificationService)

      command.execute(state)

      expect(state.player.equipment.weapon).toBeNull()
      expect(state.turnCount).toBe(0)
    })
  })
})
