import { ReadScrollCommand } from './ReadScrollCommand'
import { InventoryService } from '@services/InventoryService'
import { ScrollService } from '@services/ScrollService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, ItemType, Scroll, ScrollType, Armor, Potion, PotionType } from '@game/core/core'

describe('ReadScrollCommand', () => {
  let inventoryService: InventoryService
  let scrollService: ScrollService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom

  beforeEach(() => {
    inventoryService = new InventoryService()
    const identificationService = new IdentificationService()
    mockRandom = new MockRandom()
    scrollService = new ScrollService(identificationService, inventoryService)
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

  function createScroll(type: ScrollType = ScrollType.IDENTIFY, id: string = 'scroll-1'): Scroll {
    return {
      id,
      type: ItemType.SCROLL,
      name: 'Scroll',
      scrollType: type,
      identified: false,
      effect: 'Identifies an item',
      labelName: 'scroll labeled ABCD',
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

  test('reads identify scroll successfully', () => {
    const player = createTestPlayer()
    const scroll = createScroll(ScrollType.IDENTIFY)
    const potion: Potion = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion of Healing',
      potionType: PotionType.HEAL,
      identified: false,
      effect: 'Heals the player',
      power: '1d20',
      descriptorName: 'red potion',
    }
    player.inventory = [scroll, potion]
    const state = createTestState(player)

    const command = new ReadScrollCommand(
      'scroll-1',
      inventoryService,
      scrollService,
      messageService,
      turnService,
      'potion-1'
    )
    const result = command.execute(state)

    expect(result.player.inventory).toHaveLength(1) // Scroll consumed
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Potion of Healing')
    expect(result.turnCount).toBe(1)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new ReadScrollCommand(
      'nonexistent',
      inventoryService,
      scrollService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You do not have that item.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('returns error when item is not a scroll', () => {
    const player = createTestPlayer()
    const notScroll = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion',
      identified: false,
    }
    player.inventory = [notScroll]
    const state = createTestState(player)

    const command = new ReadScrollCommand(
      'potion-1',
      inventoryService,
      scrollService,
      messageService,
      turnService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You cannot read that.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
    expect(result.player.inventory).toHaveLength(1) // Item not consumed
  })

  test('reads enchant armor scroll successfully', () => {
    const player = createTestPlayer()
    const scroll = createScroll(ScrollType.ENCHANT_ARMOR)
    const armor: Armor = {
      id: 'armor-1',
      type: ItemType.ARMOR,
      name: 'Leather Armor',
      identified: true,
      ac: 2,
      bonus: 0,
      equipped: false,
    }
    player.inventory = [scroll, armor]
    const state = createTestState(player)

    const command = new ReadScrollCommand(
      'scroll-1',
      inventoryService,
      scrollService,
      messageService,
      turnService,
      'armor-1'
    )
    const result = command.execute(state)

    const enchantedArmor = result.player.inventory.find(i => i.id === 'armor-1') as Armor
    expect(enchantedArmor.bonus).toBe(1) // Bonus increased (better AC)
    expect(result.player.inventory).toHaveLength(1) // Scroll consumed
  })

  test('immutability - does not mutate original state', () => {
    const player = createTestPlayer()
    const scroll = createScroll(ScrollType.IDENTIFY)
    const potion: Potion = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion of Healing',
      potionType: PotionType.HEAL,
      identified: false,
      effect: 'Heals the player',
      power: '1d20',
      descriptorName: 'red potion',
    }
    player.inventory = [scroll, potion]
    const state = createTestState(player)

    const command = new ReadScrollCommand(
      'scroll-1',
      inventoryService,
      scrollService,
      messageService,
      turnService,
      'potion-1'
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    expect(state.player.inventory).toHaveLength(2) // Original unchanged
  })
})
