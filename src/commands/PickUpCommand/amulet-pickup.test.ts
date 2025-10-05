import { PickUpCommand } from './PickUpCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { GameState, Level, Player, TileType, ItemType, Item } from '@game/core/core'

describe('PickUpCommand - Amulet Pickup', () => {
  let command: PickUpCommand
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    turnService = new TurnService()
    command = new PickUpCommand(inventoryService, messageService, turnService)
  })

  function createTestLevel(items: Item[]): Level {
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
      items,
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20).fill(null).map(() => Array(20).fill(false)),
    }
  }

  function createTestPlayer(): Player {
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
      inventory: [],
    }
  }

  function createAmulet(): Item {
    return {
      id: 'amulet_test',
      name: 'Amulet of Yendor',
      type: ItemType.AMULET,
      identified: true,
      position: { x: 5, y: 5 },
    }
  }

  function createTestState(level: Level, player: Player, hasAmulet = false): GameState {
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
      hasAmulet,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  }

  test('sets hasAmulet flag when picking up amulet', () => {
    const amulet = createAmulet()
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    expect(result.hasAmulet).toBe(true)
  })

  test('shows victory message on amulet pickup', () => {
    const amulet = createAmulet()
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    const victoryMessage = result.messages.find((m) =>
      m.text.includes('Return to Level 1 to win')
    )
    expect(victoryMessage).toBeDefined()
    expect(victoryMessage?.type).toBe('success')
  })

  test('adds amulet to inventory', () => {
    const amulet = createAmulet()
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    expect(result.player.inventory).toHaveLength(1)
    expect(result.player.inventory[0].type).toBe(ItemType.AMULET)
    expect(result.player.inventory[0].name).toBe('Amulet of Yendor')
  })

  test('removes amulet from level', () => {
    const amulet = createAmulet()
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    const resultLevel = result.levels.get(10)
    expect(resultLevel?.items).toHaveLength(0)
  })

  test('preserves hasAmulet if already true', () => {
    const amulet = createAmulet()
    amulet.id = 'amulet_2' // Different amulet
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, true) // Already has amulet

    const result = command.execute(state)

    expect(result.hasAmulet).toBe(true)
  })

  test('shows both pickup and victory messages', () => {
    const amulet = createAmulet()
    const level = createTestLevel([amulet])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    // Should have both messages
    const pickupMessage = result.messages.find((m) =>
      m.text.includes('You pick up Amulet of Yendor')
    )
    const victoryMessage = result.messages.find((m) =>
      m.text.includes('Return to Level 1 to win')
    )

    expect(pickupMessage).toBeDefined()
    expect(victoryMessage).toBeDefined()
  })

  test('does not set hasAmulet for non-amulet items', () => {
    const potion: Item = {
      id: 'potion_test',
      name: 'Healing Potion',
      type: ItemType.POTION,
      identified: false,
      position: { x: 5, y: 5 },
    }
    const level = createTestLevel([potion])
    const player = createTestPlayer()
    const state = createTestState(level, player, false)

    const result = command.execute(state)

    expect(result.hasAmulet).toBe(false)
  })
})
