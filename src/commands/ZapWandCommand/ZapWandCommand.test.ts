import { ZapWandCommand } from './ZapWandCommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, ItemType, Wand, WandType } from '@game/core/core'

describe('ZapWandCommand', () => {
  let inventoryService: InventoryService
  let wandService: WandService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom

  beforeEach(() => {
    inventoryService = new InventoryService()
    const identificationService = new IdentificationService()
    mockRandom = new MockRandom()
    wandService = new WandService(identificationService)
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    turnService = new TurnService(statusEffectService)
  })

  function createTestPlayer(): Player {
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
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
    }
  }

  function createWand(
    type: WandType = WandType.LIGHTNING,
    currentCharges: number = 5,
    id: string = 'wand-1'
  ): Wand {
    return {
      id,
      type: ItemType.WAND,
      name: 'Wand',
      wandType: type,
      charges: 10,
      currentCharges,
      identified: false,
      damage: '2d6',
      woodName: 'oak wand',
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

  test('zaps wand successfully', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 5)
    player.inventory = [wand]
    const state = createTestState(player)

    mockRandom.setValues([10]) // Lightning damage

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    const updatedWand = result.player.inventory.find(i => i.id === 'wand-1') as Wand
    expect(updatedWand.currentCharges).toBe(4) // Charge decremented
    expect(result.messages).toHaveLength(1)
    expect(result.turnCount).toBe(1)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'nonexistent',
      inventoryService,
      wandService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You do not have that item.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('returns error when item is not a wand', () => {
    const player = createTestPlayer()
    const notWand = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion',
      identified: false,
    }
    player.inventory = [notWand]
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'potion-1',
      inventoryService,
      wandService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You cannot zap that.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('handles wand with no charges', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 0) // No charges
    player.inventory = [wand]
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    const updatedWand = result.player.inventory.find(i => i.id === 'wand-1') as Wand
    expect(updatedWand.currentCharges).toBe(0) // Still 0
    expect(result.messages[0].text).toBe('The wand has no charges.')
  })

  test('immutability - does not mutate original state', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 5)
    player.inventory = [wand]
    const state = createTestState(player)

    mockRandom.setValues([10])

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    const originalWand = state.player.inventory[0] as Wand
    expect(originalWand.currentCharges).toBe(5) // Original unchanged
  })
})
