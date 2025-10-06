import { DropCommand } from './DropCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { GameState, Player, Item, ItemType, Weapon, Position } from '@game/core/core'

describe('DropCommand', () => {
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
      ac: 5,
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

  function createTestItem(id: string, name: string): Item {
    return {
      id,
      name,
      type: ItemType.WEAPON,
      identified: false,
      damage: '1d8',
      bonus: 0,
    }
  }

  function createTestState(player: Player, items: Item[] = []): GameState {
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
            items,
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

  describe('execute()', () => {
    test('drops item from inventory to floor', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item as any]

      const state = createTestState(player)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)

      const level = result.levels.get(1)
      expect(level?.items).toHaveLength(1)
      expect(level?.items[0].id).toBe('sword-1')
    })

    test('adds position to dropped item', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item as any]

      const state = createTestState(player)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      const level = result.levels.get(1)
      expect(level?.items[0].position).toEqual({ x: 5, y: 5 })
    })

    test('increments turn count after successful drop', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item as any]

      const state = createTestState(player)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(1)
    })

    test('adds info message after drop', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item as any]

      const state = createTestState(player)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You drop Short Sword.')
      expect(result.messages[0].type).toBe('info')
    })

    test('does not modify original state', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item as any]

      const state = createTestState(player)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const originalInventoryLength = state.player.inventory.length

      command.execute(state)

      expect(state.player.inventory).toHaveLength(originalInventoryLength)
    })
  })

  describe('item not in inventory', () => {
    test('returns state unchanged when item not in inventory', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player)

      const command = new DropCommand('nonexistent', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
      expect(result.turnCount).toBe(0)
    })

    test('adds warning message when item not found', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player)

      const command = new DropCommand('nonexistent', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You do not have that item.')
      expect(result.messages[0].type).toBe('warning')
    })

    test('does not increment turn count when item not found', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player)

      const command = new DropCommand('nonexistent', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(0)
    })
  })

  describe('equipped items', () => {
    test('cannot drop equipped weapon', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Short Sword',
        type: ItemType.WEAPON,
        identified: false,
        damage: '1d8',
        bonus: 0,
      }

      // Add to inventory first, then equip
      player.inventory = [weapon]
      const playerWithEquippedWeapon = inventoryService.equipWeapon(player, weapon)

      const state = createTestState(playerWithEquippedWeapon)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      // Item should still be equipped
      expect(result.player.equipment.weapon?.id).toBe('sword-1')
      expect(result.turnCount).toBe(0)
    })

    test('adds warning message when trying to drop equipped item', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Short Sword',
        type: ItemType.WEAPON,
        identified: false,
        damage: '1d8',
        bonus: 0,
      }

      player.inventory = [weapon]
      const playerWithEquippedWeapon = inventoryService.equipWeapon(player, weapon)

      const state = createTestState(playerWithEquippedWeapon)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You must unequip Short Sword before dropping it.')
      expect(result.messages[0].type).toBe('warning')
    })

    test('does not increment turn count when trying to drop equipped item', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Short Sword',
        type: ItemType.WEAPON,
        identified: false,
        damage: '1d8',
        bonus: 0,
      }

      player.inventory = [weapon]
      const playerWithEquippedWeapon = inventoryService.equipWeapon(player, weapon)

      const state = createTestState(playerWithEquippedWeapon)
      const command = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(0)
    })
  })

  describe('multiple items', () => {
    test('drops only specified item', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item1 = createTestItem('sword-1', 'Short Sword')
      const item2 = createTestItem('mace-1', 'Mace')
      const item3 = createTestItem('armor-1', 'Leather Armor')
      player.inventory = [item1 as any, item2 as any, item3 as any]

      const state = createTestState(player)
      const command = new DropCommand('mace-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(2)
      expect(result.player.inventory.find((i) => i.id === 'sword-1')).toBeDefined()
      expect(result.player.inventory.find((i) => i.id === 'armor-1')).toBeDefined()
      expect(result.player.inventory.find((i) => i.id === 'mace-1')).toBeUndefined()

      const level = result.levels.get(1)
      expect(level?.items).toHaveLength(1)
      expect(level?.items[0].id).toBe('mace-1')
    })

    test('can drop items at different positions', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item1 = createTestItem('sword-1', 'Short Sword')
      player.inventory = [item1 as any]

      const state = createTestState(player)
      const command1 = new DropCommand('sword-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result1 = command1.execute(state)

      // Move player
      const movedPlayer = { ...result1.player, position: { x: 10, y: 10 } }
      const item2 = createTestItem('mace-1', 'Mace')
      movedPlayer.inventory = [item2 as any]

      const state2 = { ...result1, player: movedPlayer }
      const command2 = new DropCommand('mace-1', inventoryService, messageService, turnService, mockIdentificationService)
      const result2 = command2.execute(state2)

      const level = result2.levels.get(1)
      expect(level?.items).toHaveLength(2)
      expect(level?.items[0].position).toEqual({ x: 5, y: 5 })
      expect(level?.items[1].position).toEqual({ x: 10, y: 10 })
    })
  })
})
