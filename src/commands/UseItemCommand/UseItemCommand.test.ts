import { UseItemCommand } from './UseItemCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { HungerService } from '@services/HungerService'
import { LightingService } from '@services/LightingService'
import { TurnService } from '@services/TurnService'
import {
  GameState,
  Player,
  Potion,
  ItemType,
  PotionType,
  ItemNameMap,
  ScrollType,
  RingType,
  WandType,
  Position,
} from '@game/core/core'

describe('UseItemCommand - Integration with domain services', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let potionService: PotionService
  let scrollService: ScrollService
  let wandService: WandService
  let hungerService: HungerService
  let lightingService: LightingService
  let turnService: TurnService
  let mockRandom: MockRandom
  let identificationService: IdentificationService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    mockRandom = new MockRandom([5]) // Provide dice roll value for potion healing
    identificationService = new IdentificationService(mockRandom)
    potionService = new PotionService(mockRandom, identificationService)
    scrollService = new ScrollService(identificationService, inventoryService)
    wandService = new WandService(identificationService)
    hungerService = new HungerService(mockRandom)
    lightingService = new LightingService(mockRandom)
    turnService = new TurnService()
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

  function createTestState(player: Player): GameState {
    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>([
        [PotionType.HEAL, 'blue potion'],
      ]),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    return {
      player,
      currentLevel: 1,
      levels: new Map(),
      messages: [],
      turnCount: 1,
      seed: 'test',
      visibleCells: new Set(),
      isGameOver: false,
      identifiedItems: new Set(),
      itemNameMap,
    } as GameState
  }

  test('quaff potion - delegates to PotionService and removes item', () => {
    const player = createTestPlayer()
    player.hp = 15 // Lower HP so healing is visible

    const healPotion: Potion = {
      id: 'potion-1',
      name: 'Potion of Healing',
      type: ItemType.POTION,
      isIdentified: false,
      potionType: PotionType.HEAL,
      effect: 'Heals 1d8 HP',
      power: '1d8',
      descriptorName: 'blue potion',
    }

    player.inventory = [healPotion]
    const state = createTestState(player)

    const command = new UseItemCommand(
      'potion-1',
      'quaff',
      inventoryService,
      messageService,
      potionService,
      scrollService,
      wandService,
      hungerService,
      lightingService,
      turnService
    )

    const result = command.execute(state)

    // Potion healed player (HP should have increased)
    expect(result.player.hp).toBeGreaterThan(15)

    // Potion removed from inventory
    expect(result.player.inventory).toHaveLength(0)

    // Message added
    expect(result.messages.length).toBeGreaterThan(0)

    // Turn incremented
    expect(result.turnCount).toBe(2)
  })

  test('returns error if item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new UseItemCommand(
      'nonexistent',
      'quaff',
      inventoryService,
      messageService,
      potionService,
      scrollService,
      wandService,
      hungerService,
      lightingService,
      turnService
    )

    const result = command.execute(state)

    expect(result.messages.some(m => m.text.includes('You do not have that item'))).toBe(true)
  })

  test('validates item type matches action', () => {
    const player = createTestPlayer()
    const healPotion: Potion = {
      id: 'potion-1',
      name: 'Potion of Healing',
      type: ItemType.POTION,
      isIdentified: false,
      potionType: PotionType.HEAL,
      effect: 'Heals 1d8 HP',
      power: '1d8',
      descriptorName: 'blue potion',
    }

    player.inventory = [healPotion]
    const state = createTestState(player)

    // Try to 'read' a potion (should fail)
    const command = new UseItemCommand(
      'potion-1',
      'read',
      inventoryService,
      messageService,
      potionService,
      scrollService,
      wandService,
      hungerService,
      lightingService,
      turnService
    )

    const result = command.execute(state)

    expect(result.messages.some(m => m.text.includes('You cannot read that'))).toBe(true)
  })
})
