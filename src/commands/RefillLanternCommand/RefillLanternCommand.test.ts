import { RefillLanternCommand } from './RefillLanternCommand'
import { InventoryService } from '@services/InventoryService'
import { LightingService } from '@services/LightingService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { GameState, Player, ItemType, OilFlask } from '@game/core/core'
import { createTestLantern } from '../../test-utils'

describe('RefillLanternCommand', () => {
  let inventoryService: InventoryService
  let lightingService: LightingService
  let messageService: MessageService
  let turnService: TurnService

  beforeEach(() => {
    inventoryService = new InventoryService()
    lightingService = new LightingService()
    messageService = new MessageService()
    turnService = new TurnService()
  })

  function createTestPlayer(lanternFuel: number = 100): Player {
    return {
      position: { x: 5, y: 5 },
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
        lightSource: createTestLantern({ fuel: lanternFuel, maxFuel: 1000 }),
      },
      inventory: [],
    }
  }

  function createOilFlask(fuelAmount: number = 500, id: string = 'oil-1'): OilFlask {
    return {
      id,
      type: ItemType.OIL_FLASK,
      name: 'Oil Flask',
      fuelAmount,
    }
  }

  function createTestState(player: Player): GameState {
    return {
      player,
      levels: new Map(),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
      visibleCells: new Set(),
      seed: 'test-seed',
      gameId: 'test-game',
      hasWon: false,
      hasAmulet: false,
      itemNameMap: { potions: new Map(), scrolls: new Map(), wands: new Map(), rings: new Map() },
      identifiedItems: new Set(),
    }
  }

  test('refills lantern successfully', () => {
    const player = createTestPlayer(100)
    const oilFlask = createOilFlask(500)
    player.inventory = [oilFlask]
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'oil-1',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.player.equipment.lightSource?.fuel).toBe(600) // 100 + 500
    expect(result.player.inventory).toHaveLength(0) // Oil consumed
    expect(result.messages[0].type).toBe('success')
    expect(result.turnCount).toBe(1)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'nonexistent',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You do not have that item.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('returns error when item is not oil flask', () => {
    const player = createTestPlayer()
    const notOil = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion',
      identified: false,
    }
    player.inventory = [notOil]
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'potion-1',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You cannot use that to refill a lantern.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('does not consume oil when player has no lantern', () => {
    const player = createTestPlayer()
    player.equipment.lightSource = null // No lantern
    const oilFlask = createOilFlask(500)
    player.inventory = [oilFlask]
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'oil-1',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.player.inventory).toHaveLength(1) // Oil NOT consumed
    expect(result.messages[0].type).toBe('warning')
    expect(result.messages[0].text).toBe('You do not have a lantern equipped.')
  })

  test('does not consume oil when lantern is already full', () => {
    const player = createTestPlayer(1000) // Already full (maxFuel = 1000)
    const oilFlask = createOilFlask(500)
    player.inventory = [oilFlask]
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'oil-1',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.player.inventory).toHaveLength(1) // Oil NOT consumed
    expect(result.messages[0].type).toBe('warning')
    expect(result.messages[0].text).toBe('Your lantern is already full.')
  })

  test('immutability - does not mutate original state', () => {
    const player = createTestPlayer(100)
    const oilFlask = createOilFlask(500)
    player.inventory = [oilFlask]
    const state = createTestState(player)

    const command = new RefillLanternCommand(
      'oil-1',
      inventoryService,
      lightingService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    expect(state.player.equipment.lightSource?.fuel).toBe(100) // Original unchanged
  })
})
