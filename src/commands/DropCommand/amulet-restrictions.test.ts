import { DropCommand } from './DropCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { GameState, Level, Player, TileType, ItemType, Item, Potion, PotionType } from '@game/core/core'

describe('DropCommand - Amulet Restrictions', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    turnService = new TurnService()
  })

  function createTestLevel(): Level {
    return {
      depth: 10,
      width: 20,
      height: 20,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#FFFFFF',
          colorExplored: '#888888',
        })
      ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20).fill(null).map(() => Array(20).fill(false)),
    }
  }

  function createAmulet(): Item {
    return {
      id: 'amulet_test',
      name: 'Amulet of Yendor',
      type: ItemType.AMULET,
      identified: true,
      position: { x: 0, y: 0 }, // Position is removed when added to inventory
    }
  }

  function createPotion(): Potion {
    return {
      id: 'potion_test',
      name: 'Healing Potion',
      type: ItemType.POTION,
      identified: false,
      position: { x: 0, y: 0 },
      potionType: PotionType.HEAL,
      effect: 'restore_hp',
      power: '1d8',
      descriptorName: 'blue potion',
    }
  }

  function createTestPlayer(inventory: Item[]): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      strength: 16,
      maxStrength: 16,
      ac: 4,
      level: 3,
      xp: 100,
      gold: 50,
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory,
    }
  }

  function createTestState(player: Player): GameState {
    const level = createTestLevel()
    return {
      player,
      currentLevel: 10,
      levels: new Map([[10, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: true,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  }

  test('prevents dropping amulet', () => {
    const amulet = createAmulet()
    const player = createTestPlayer([amulet])
    const state = createTestState(player)
    const command = new DropCommand(amulet.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    // Amulet should still be in inventory
    expect(result.player.inventory).toContain(amulet)
    expect(result.player.inventory).toHaveLength(1)
  })

  test('shows warning message when attempting to drop amulet', () => {
    const amulet = createAmulet()
    const player = createTestPlayer([amulet])
    const state = createTestState(player)
    const command = new DropCommand(amulet.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    const lastMessage = result.messages[result.messages.length - 1]
    expect(lastMessage.text).toContain('cannot be dropped')
    expect(lastMessage.type).toBe('warning')
  })

  test('does not add amulet to level when attempting to drop', () => {
    const amulet = createAmulet()
    const player = createTestPlayer([amulet])
    const state = createTestState(player)
    const command = new DropCommand(amulet.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    const resultLevel = result.levels.get(10)
    expect(resultLevel?.items).toHaveLength(0)
  })

  test('does not increment turn count when drop fails', () => {
    const amulet = createAmulet()
    const player = createTestPlayer([amulet])
    const state = createTestState(player)
    const command = new DropCommand(amulet.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    expect(result.turnCount).toBe(0) // No turn taken
  })

  test('allows dropping other items normally', () => {
    const potion = createPotion()
    const player = createTestPlayer([potion])
    const state = createTestState(player)
    const command = new DropCommand(potion.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    // Potion should not be in inventory
    expect(result.player.inventory).not.toContain(potion)
    expect(result.player.inventory).toHaveLength(0)

    // Potion should be on level
    const resultLevel = result.levels.get(10)
    expect(resultLevel?.items).toHaveLength(1)
    expect(resultLevel?.items[0].type).toBe(ItemType.POTION)
  })

  test('can drop items even when amulet is in inventory', () => {
    const amulet = createAmulet()
    const potion = createPotion()
    const player = createTestPlayer([amulet, potion])
    const state = createTestState(player)
    const command = new DropCommand(potion.id, inventoryService, messageService, turnService)

    const result = command.execute(state)

    // Should still have amulet
    expect(result.player.inventory).toHaveLength(1)
    expect(result.player.inventory[0].type).toBe(ItemType.AMULET)

    // Potion should be dropped
    const resultLevel = result.levels.get(10)
    expect(resultLevel?.items).toHaveLength(1)
    expect(resultLevel?.items[0].type).toBe(ItemType.POTION)
  })

  test('immutability - original state not modified', () => {
    const amulet = createAmulet()
    const player = createTestPlayer([amulet])
    const state = createTestState(player)
    const originalInventoryLength = state.player.inventory.length
    const command = new DropCommand(amulet.id, inventoryService, messageService, turnService)

    command.execute(state)

    // Original state should be unchanged
    expect(state.player.inventory).toHaveLength(originalInventoryLength)
    expect(state.player.inventory).toContain(amulet)
  })
})
