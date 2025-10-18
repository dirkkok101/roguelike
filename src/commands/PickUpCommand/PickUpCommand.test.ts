import { PickUpCommand } from './PickUpCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState, Player, Item, ItemType, Position } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('PickUpCommand', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let levelService: LevelService
  let mockIdentificationService: jest.Mocked<IdentificationService>
  let mockRandom: MockRandom
  let recorder: CommandRecorderService
  let command: PickUpCommand

  beforeEach(() => {
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService()
    inventoryService = new InventoryService()
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)

    // Create mock IdentificationService
    mockIdentificationService = {
      getDisplayName: jest.fn((item: Item) => item.name),
    } as any

    command = new PickUpCommand(inventoryService, messageService, turnService, mockIdentificationService, levelService, recorder, mockRandom)
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

  function createTestItem(id: string, name: string, position: Position): Item {
    return {
      id,
      name,
      type: ItemType.WEAPON,
      identified: false,
      position,
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
    test('picks up item at player position', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('sword-1')
      expect(result.player.inventory[0].name).toBe('Short Sword')
    })

    test('removes item from level after pickup', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      const level = result.levels.get(1)
      expect(level?.items).toHaveLength(0)
    })

    test('removes position property from item when added to inventory', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.player.inventory[0]).not.toHaveProperty('position')
    })

    test('increments turn count after successful pickup', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.turnCount).toBe(1)
    })

    test('adds success message after pickup', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You pick up Short Sword.')
      expect(result.messages[0].type).toBe('success')
    })

    test('does not modify original state', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])
      const originalTurnCount = state.turnCount

      command.execute(state)

      expect(state.player.inventory).toHaveLength(0)
      expect(state.turnCount).toBe(originalTurnCount)
    })
  })

  describe('no item at position', () => {
    test('returns state unchanged when no item at position', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item = createTestItem('sword-1', 'Short Sword', { x: 10, y: 10 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
      expect(result.turnCount).toBe(0)
    })

    test('adds info message when no item at position', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, [])

      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('There is nothing here to pick up.')
      expect(result.messages[0].type).toBe('info')
    })

    test('does not increment turn count when no item', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, [])

      const result = command.execute(state)

      expect(result.turnCount).toBe(0)
    })
  })

  describe('inventory full', () => {
    test('does not pick up item when inventory is full', () => {
      const player = createTestPlayer({ x: 5, y: 5 })

      // Fill inventory to max (26 items)
      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      player.inventory = fullInventory as any

      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(26)
      expect(result.player.inventory.find((i) => i.id === 'sword-1')).toBeUndefined()
    })

    test('adds warning message when inventory is full', () => {
      const player = createTestPlayer({ x: 5, y: 5 })

      // Fill inventory
      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      player.inventory = fullInventory as any

      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Your pack is full. You cannot carry any more items.')
      expect(result.messages[0].type).toBe('warning')
    })

    test('does not increment turn count when inventory is full', () => {
      const player = createTestPlayer({ x: 5, y: 5 })

      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      player.inventory = fullInventory as any

      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      expect(result.turnCount).toBe(0)
    })

    test('item remains on floor when inventory is full', () => {
      const player = createTestPlayer({ x: 5, y: 5 })

      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      player.inventory = fullInventory as any

      const item = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const state = createTestState(player, [item])

      const result = command.execute(state)

      const level = result.levels.get(1)
      expect(level?.items).toHaveLength(1)
      expect(level?.items[0].id).toBe('sword-1')
    })
  })

  describe('multiple items on level', () => {
    test('picks up only the item at player position', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const item1 = createTestItem('sword-1', 'Short Sword', { x: 5, y: 5 })
      const item2 = createTestItem('mace-1', 'Mace', { x: 10, y: 10 })
      const item3 = createTestItem('armor-1', 'Leather Armor', { x: 15, y: 15 })
      const state = createTestState(player, [item1, item2, item3])

      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('sword-1')

      const level = result.levels.get(1)
      expect(level?.items).toHaveLength(2)
      expect(level?.items.find((i) => i.id === 'mace-1')).toBeDefined()
      expect(level?.items.find((i) => i.id === 'armor-1')).toBeDefined()
    })
  })
})
