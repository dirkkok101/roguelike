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
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState, Player, ItemType, Potion, PotionType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('QuaffPotionCommand', () => {
  let inventoryService: InventoryService
  let potionService: PotionService
  let identificationService: IdentificationService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    inventoryService = new InventoryService()
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService()
    identificationService = new IdentificationService(mockRandom)
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
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
    )
    const result = command.execute(state)

    expect(result.player.hp).toBe(20) // Healed to max (10 + 15 capped at 20)
    expect(result.player.inventory).toHaveLength(0) // Potion consumed
    expect(result.messages).toHaveLength(1)
    expect(result.turnCount).toBe(0)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new QuaffPotionCommand(
      'nonexistent',
      inventoryService,
      potionService,
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
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
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
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
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
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
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    expect(state.player.inventory).toHaveLength(1) // Original unchanged
  })

  test('identifies potion type after drinking (first use)', () => {
    const player = createTestPlayer(10)
    const healingPotion = createPotion(PotionType.HEAL, 'potion-1')
    player.inventory = [healingPotion]
    const state = createTestState(player)

    // Verify potion is NOT identified before drinking
    expect(state.identifiedItems.has(PotionType.HEAL)).toBe(false)

    mockRandom.setValues([5]) // Healing amount

    const command = new QuaffPotionCommand(
      'potion-1',
      inventoryService,
      potionService,
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
    )
    const result = command.execute(state)

    // Verify potion IS identified after drinking
    expect(result.identifiedItems.has(PotionType.HEAL)).toBe(true)
    expect(result.player.inventory).toHaveLength(0) // Potion consumed
  })

  test('does not re-identify already identified potions', () => {
    const player = createTestPlayer(10)
    const healingPotion = createPotion(PotionType.HEAL, 'potion-1')
    player.inventory = [healingPotion]

    // Potion type already identified
    const state = createTestState(player)
    state.identifiedItems = new Set([PotionType.HEAL])

    mockRandom.setValues([5]) // Healing amount

    const command = new QuaffPotionCommand(
      'potion-1',
      inventoryService,
      potionService,
      identificationService,
      messageService,
      turnService,
      statusEffectService,
      recorder,
      mockRandom
    )
    const result = command.execute(state)

    // Still identified (no error from double-identification)
    expect(result.identifiedItems.has(PotionType.HEAL)).toBe(true)
    expect(result.identifiedItems.size).toBe(1) // Only one type identified
  })
})
