import { QuaffPotionCommand } from './QuaffPotionCommand'
import { InventoryService } from '@services/InventoryService'
import { PotionService } from '@services/PotionService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, ItemType, Potion, PotionType } from '@game/core/core'

describe('QuaffPotionCommand', () => {
  let inventoryService: InventoryService
  let potionService: PotionService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom

  beforeEach(() => {
    inventoryService = new InventoryService()
    mockRandom = new MockRandom()
    const identificationService = new IdentificationService()
    const levelingService = new LevelingService(mockRandom)
    statusEffectService = new StatusEffectService()
    potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)
    messageService = new MessageService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
  })

  function createTestPlayer(hp: number = 20): Player {
    return {
      position: { x: 5, y: 5 },
      hp,
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

  function createPotion(type: PotionType = PotionType.HEAL, id: string = 'potion-1'): Potion {
    return {
      id,
      type: ItemType.POTION,
      name: 'Potion',
      potionType: type,
      identified: false,
      effect: 'Heals the player',
      power: '1d20',
      descriptorName: 'red potion',
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

  test('drinks healing potion successfully', () => {
    const player = createTestPlayer(10)
    const potion = createPotion(PotionType.HEALING)
    player.inventory = [potion]
    const state = createTestState(player)

    mockRandom.setValues([15]) // Healing amount (d20)

    const command = new QuaffPotionCommand(
      'potion-1',
      inventoryService,
      potionService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.player.hp).toBe(20) // Healed to max (10 + 15 capped at 20)
    expect(result.player.inventory).toHaveLength(0) // Potion consumed
    expect(result.messages).toHaveLength(1)
    expect(result.turnCount).toBe(1)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new QuaffPotionCommand(
      'nonexistent',
      inventoryService,
      potionService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You do not have that item.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0) // No turn consumed
  })

  test('returns error when item is not a potion', () => {
    const player = createTestPlayer()
    const notPotion = {
      id: 'scroll-1',
      type: ItemType.SCROLL,
      name: 'Scroll',
      identified: false,
    }
    player.inventory = [notPotion]
    const state = createTestState(player)

    const command = new QuaffPotionCommand(
      'scroll-1',
      inventoryService,
      potionService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You cannot drink that.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
    expect(result.player.inventory).toHaveLength(1) // Item not consumed
  })

  test('sets game over when poison potion kills player', () => {
    const player = createTestPlayer(5) // Low HP
    const potion = createPotion(PotionType.POISON)
    player.inventory = [potion]
    const state = createTestState(player)

    mockRandom.setValues([10]) // Poison damage > player HP

    const command = new QuaffPotionCommand(
      'potion-1',
      inventoryService,
      potionService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.player.hp).toBe(0)
    expect(result.isGameOver).toBe(true)
  })

  test('immutability - does not mutate original state', () => {
    const player = createTestPlayer(10)
    const potion = createPotion(PotionType.HEALING)
    player.inventory = [potion]
    const state = createTestState(player)

    mockRandom.setValues([8])

    const command = new QuaffPotionCommand(
      'potion-1',
      inventoryService,
      potionService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    expect(state.player.inventory).toHaveLength(1) // Original unchanged
  })
})
