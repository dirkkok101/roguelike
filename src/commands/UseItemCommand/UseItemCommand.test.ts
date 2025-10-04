import { UseItemCommand } from './UseItemCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import {
  GameState,
  Player,
  Potion,
  Scroll,
  Wand,
  Food,
  ItemType,
  PotionType,
  ScrollType,
  WandType,
  Position,
} from '@game/core/core'

describe('UseItemCommand', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let mockRandom: MockRandom
  let identificationService: IdentificationService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
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

  function createTestPotion(
    id: string,
    potionType: PotionType,
    power: string = '1d8'
  ): Potion {
    return {
      id,
      name: `Potion of ${potionType}`,
      type: ItemType.POTION,
      identified: false,
      potionType,
      effect: 'test',
      power,
      descriptorName: 'blue potion',
    }
  }

  function createTestScroll(id: string, scrollType: ScrollType): Scroll {
    return {
      id,
      name: `Scroll of ${scrollType}`,
      type: ItemType.SCROLL,
      identified: false,
      scrollType,
      effect: 'test',
      labelName: 'scroll labeled XYZZY',
    }
  }

  function createTestWand(id: string, wandType: WandType, charges: number = 5): Wand {
    return {
      id,
      name: `Wand of ${wandType}`,
      type: ItemType.WAND,
      identified: false,
      wandType,
      damage: '6d6',
      charges: 5,
      currentCharges: charges,
      woodName: 'oak wand',
    }
  }

  function createTestFood(id: string, nutrition: number = 1300): Food {
    return {
      id,
      name: 'Food Ration',
      type: ItemType.FOOD,
      identified: false,
      nutrition,
    }
  }

  function createTestState(player: Player): GameState {
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
            items: [],
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

  describe('quaffing potions', () => {
    test('heals player with HEAL potion', () => {
      const player = createTestPlayer()
      player.hp = 10 // Damaged
      const potion = createTestPotion('potion-1', PotionType.HEAL, '1d8')
      player.inventory = [potion]

      mockRandom.setValues([5]) // Heal 5 HP

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hp).toBe(15)
      expect(result.player.inventory).toHaveLength(0)
      expect(result.messages[0].text).toContain('+5 HP')
      expect(result.turnCount).toBe(1)
    })

    test('does not heal beyond max HP', () => {
      const player = createTestPlayer()
      player.hp = 18 // Near max
      const potion = createTestPotion('potion-1', PotionType.HEAL, '1d8')
      player.inventory = [potion]

      mockRandom.setValues([5]) // Would heal 5, but only 2 needed

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hp).toBe(20)
      expect(result.messages[0].text).toContain('+2 HP')
    })

    test('heals more with EXTRA_HEAL potion', () => {
      const player = createTestPlayer()
      player.hp = 5
      const potion = createTestPotion('potion-1', PotionType.EXTRA_HEAL, '2d8+2')
      player.inventory = [potion]

      mockRandom.setValues([12]) // Total healing (MockRandom.roll returns single value)

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hp).toBe(17)
      expect(result.messages[0].text).toContain('+12 HP')
    })

    test('increases strength with GAIN_STRENGTH potion', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.GAIN_STRENGTH, '1')
      player.inventory = [potion]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.strength).toBe(17)
      expect(result.player.maxStrength).toBe(17)
      expect(result.messages[0].text).toContain('Strength: 17')
    })

    test('restores strength with RESTORE_STRENGTH potion', () => {
      const player = createTestPlayer()
      player.strength = 12 // Reduced from max 16
      const potion = createTestPotion('potion-1', PotionType.RESTORE_STRENGTH, '0')
      player.inventory = [potion]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.strength).toBe(16)
      expect(result.messages[0].text).toContain('Strength: 16')
    })

    test('damages player with POISON potion', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.POISON, '1d6')
      player.inventory = [potion]

      mockRandom.setValues([4]) // 4 damage

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hp).toBe(16)
      expect(result.messages[0].text).toContain('-4 HP')
    })

    test('kills player if POISON reduces HP to 0', () => {
      const player = createTestPlayer()
      player.hp = 3
      const potion = createTestPotion('potion-1', PotionType.POISON, '1d6')
      player.inventory = [potion]

      mockRandom.setValues([5]) // 5 damage

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hp).toBe(0)
      expect(result.isGameOver).toBe(true)
    })

    test('identifies potion after use', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.HEAL, '1d8')
      player.inventory = [potion]

      mockRandom.setValues([5])

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.identifiedItems.has(PotionType.HEAL)).toBe(true)
    })

    test('shows not implemented message for unimplemented potions', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.HASTE_SELF, '0')
      player.inventory = [potion]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toContain('not yet implemented')
    })
  })

  describe('reading scrolls', () => {
    test('removes scroll from inventory', () => {
      const player = createTestPlayer()
      const scroll = createTestScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'scroll-1',
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
      expect(result.turnCount).toBe(1)
    })

    test('identifies scroll after use', () => {
      const player = createTestPlayer()
      const scroll = createTestScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'scroll-1',
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.identifiedItems.has(ScrollType.IDENTIFY)).toBe(true)
    })

    test('shows not implemented message', () => {
      const player = createTestPlayer()
      const scroll = createTestScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'scroll-1',
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toContain('not yet implemented')
    })
  })

  describe('zapping wands', () => {
    test('decrements wand charges', () => {
      const player = createTestPlayer()
      const wand = createTestWand('wand-1', WandType.LIGHTNING, 3)
      player.inventory = [wand]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'wand-1',
        'zap',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      const updatedWand = result.player.inventory[0] as Wand
      expect(updatedWand.currentCharges).toBe(2)
      expect(result.turnCount).toBe(1)
    })

    test('cannot use wand with no charges', () => {
      const player = createTestPlayer()
      const wand = createTestWand('wand-1', WandType.LIGHTNING, 0)
      player.inventory = [wand]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'wand-1',
        'zap',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('The wand has no charges.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })

    test('identifies wand after use', () => {
      const player = createTestPlayer()
      const wand = createTestWand('wand-1', WandType.LIGHTNING, 3)
      player.inventory = [wand]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'wand-1',
        'zap',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.identifiedItems.has(WandType.LIGHTNING)).toBe(true)
    })

    test('shows not implemented message', () => {
      const player = createTestPlayer()
      const wand = createTestWand('wand-1', WandType.LIGHTNING, 3)
      player.inventory = [wand]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'wand-1',
        'zap',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toContain('not yet implemented')
    })
  })

  describe('eating food', () => {
    test('restores hunger', () => {
      const player = createTestPlayer()
      player.hunger = 500 // Hungry
      const food = createTestFood('food-1', 1300)
      player.inventory = [food]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'food-1',
        'eat',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.hunger).toBe(1800)
      expect(result.player.inventory).toHaveLength(0)
      expect(result.messages[0].text).toContain('satiated')
      expect(result.turnCount).toBe(1)
    })

    test('removes food from inventory', () => {
      const player = createTestPlayer()
      const food = createTestFood('food-1', 1300)
      player.inventory = [food]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'food-1',
        'eat',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
    })
  })

  describe('validation', () => {
    test('cannot quaff non-potion', () => {
      const player = createTestPlayer()
      const food = createTestFood('food-1', 1300)
      player.inventory = [food]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'food-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot drink that.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })

    test('cannot read non-scroll', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.HEAL)
      player.inventory = [potion]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'potion-1',
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot read that.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })

    test('cannot zap non-wand', () => {
      const player = createTestPlayer()
      const scroll = createTestScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'scroll-1',
        'zap',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot zap that.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })

    test('cannot eat non-food', () => {
      const player = createTestPlayer()
      const wand = createTestWand('wand-1', WandType.LIGHTNING)
      player.inventory = [wand]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'wand-1',
        'eat',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot eat that.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })

    test('shows error when item not found', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new UseItemCommand(
        'nonexistent-item',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You do not have that item.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('immutability', () => {
    test('does not modify original state', () => {
      const player = createTestPlayer()
      const potion = createTestPotion('potion-1', PotionType.HEAL, '1d8')
      player.inventory = [potion]

      mockRandom.setValues([5])

      const state = createTestState(player)
      const originalHp = state.player.hp
      const originalInventoryLength = state.player.inventory.length

      const command = new UseItemCommand(
        'potion-1',
        'quaff',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      command.execute(state)

      expect(state.player.hp).toBe(originalHp)
      expect(state.player.inventory).toHaveLength(originalInventoryLength)
      expect(state.turnCount).toBe(0)
    })
  })
})
