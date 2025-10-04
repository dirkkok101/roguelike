import { UseItemCommand } from './UseItemCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import {
  GameState,
  Player,
  Scroll,
  Potion,
  Weapon,
  Armor,
  ItemType,
  ScrollType,
  PotionType,
  Position,
} from '@game/core/core'

describe('UseItemCommand - Scroll Effects', () => {
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

  function createTestState(player: Player): GameState {
    return {
      player,
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      itemNameMap: identificationService.generateItemNames(),
      identifiedItems: new Set(),
    }
  }

  function createScroll(id: string, scrollType: ScrollType): Scroll {
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

  function createPotion(id: string, potionType: PotionType): Potion {
    return {
      id,
      name: `Potion of ${potionType}`,
      type: ItemType.POTION,
      identified: false,
      potionType,
      effect: 'test',
      power: '1d8',
      descriptorName: 'blue potion',
    }
  }

  function createWeapon(id: string, name: string, damage: string, bonus: number = 0): Weapon {
    return {
      id,
      name,
      type: ItemType.WEAPON,
      identified: true,
      damage,
      bonus,
    }
  }

  function createArmor(id: string, name: string, ac: number, bonus: number = 0): Armor {
    return {
      id,
      name,
      type: ItemType.ARMOR,
      identified: true,
      ac,
      bonus,
    }
  }

  // ============================================================================
  // IDENTIFY SCROLL TESTS
  // ============================================================================

  describe('Identify Scroll', () => {
    test('identifies unidentified potion', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.IDENTIFY)
      const potion = createPotion('potion-1', PotionType.HEAL)

      player.inventory = [scroll, potion]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        potion.id // Target potion
      )

      const newState = command.execute(state)

      // Potion should be identified
      expect(identificationService.isIdentified(potion, newState)).toBe(true)

      // Scroll should be consumed
      expect(newState.player.inventory.length).toBe(1)
      expect(newState.player.inventory.find((i) => i.id === scroll.id)).toBeUndefined()

      // Message should confirm identification
      expect(newState.messages[0].text).toContain('This is')
    })

    test('fails gracefully if target item not found', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        'nonexistent-item'
      )

      const newState = command.execute(state)

      // Scroll should still be consumed
      expect(newState.player.inventory.length).toBe(0)

      // Should have appropriate message
      expect(newState.messages[0].text).toContain('is gone')
    })

    test('does nothing if no target item specified', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.IDENTIFY)
      player.inventory = [scroll]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
        // No targetItemId
      )

      const newState = command.execute(state)

      expect(newState.messages[0].text).toContain('nothing happens')
    })
  })

  // ============================================================================
  // ENCHANT WEAPON TESTS
  // ============================================================================

  describe('Enchant Weapon Scroll', () => {
    test('increases weapon bonus by 1', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_WEAPON)
      const weapon = createWeapon('weapon-1', 'Sword', '1d8', 0)

      player.inventory = [scroll, weapon]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        weapon.id
      )

      const newState = command.execute(state)

      // Find enchanted weapon
      const enchanted = newState.player.inventory.find(
        (i) => i.type === ItemType.WEAPON
      ) as Weapon

      expect(enchanted).toBeDefined()
      expect(enchanted.bonus).toBe(1)

      // Scroll consumed
      expect(newState.player.inventory.length).toBe(1)

      // Message confirms
      expect(newState.messages[0].text).toContain('glows brightly')
      expect(newState.messages[0].text).toContain('+1')
    })

    test('works on equipped weapon', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_WEAPON)
      const weapon = createWeapon('weapon-1', 'Sword', '1d8', 1)

      player.inventory = [scroll, weapon]
      player.equipment.weapon = weapon
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        weapon.id
      )

      const newState = command.execute(state)

      // Equipped weapon should be updated
      expect(newState.player.equipment.weapon).toBeDefined()
      expect(newState.player.equipment.weapon!.bonus).toBe(2)
    })

    test('fails at max enchantment (+3)', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_WEAPON)
      const weapon = createWeapon('weapon-1', 'Sword', '1d8', 3)

      player.inventory = [scroll, weapon]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        weapon.id
      )

      const newState = command.execute(state)

      // Weapon unchanged
      const unchangedWeapon = newState.player.inventory.find(
        (i) => i.id === weapon.id
      ) as Weapon
      expect(unchangedWeapon.bonus).toBe(3)

      // Scroll still consumed
      expect(newState.player.inventory.length).toBe(1)

      // Message indicates max
      expect(newState.messages[0].text).toContain('maximum enchantment')
    })

    test('fails if target is not a weapon', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_WEAPON)
      const armor = createArmor('armor-1', 'Leather', 8, 0)

      player.inventory = [scroll, armor]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        armor.id
      )

      const newState = command.execute(state)

      expect(newState.messages[0].text).toContain('not a weapon')
    })
  })

  // ============================================================================
  // ENCHANT ARMOR TESTS
  // ============================================================================

  describe('Enchant Armor Scroll', () => {
    test('increases armor bonus by 1', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_ARMOR)
      const armor = createArmor('armor-1', 'Chain Mail', 5, 0)

      player.inventory = [scroll, armor]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        armor.id
      )

      const newState = command.execute(state)

      const enchanted = newState.player.inventory.find(
        (i) => i.type === ItemType.ARMOR
      ) as Armor

      expect(enchanted).toBeDefined()
      expect(enchanted.bonus).toBe(1)

      // Effective AC should be 4 (5 - 1)
      expect(newState.messages[0].text).toContain('AC 4')
    })

    test('works on equipped armor', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_ARMOR)
      const armor = createArmor('armor-1', 'Plate Mail', 3, 0)

      player.inventory = [scroll, armor]
      player.equipment.armor = armor
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        armor.id
      )

      const newState = command.execute(state)

      expect(newState.player.equipment.armor).toBeDefined()
      expect(newState.player.equipment.armor!.bonus).toBe(1)
    })

    test('fails at max enchantment (+3)', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_ARMOR)
      const armor = createArmor('armor-1', 'Plate Mail', 3, 3)

      player.inventory = [scroll, armor]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        armor.id
      )

      const newState = command.execute(state)

      const unchangedArmor = newState.player.inventory.find(
        (i) => i.id === armor.id
      ) as Armor
      expect(unchangedArmor.bonus).toBe(3)

      expect(newState.messages[0].text).toContain('maximum enchantment')
    })

    test('fails if target is not armor', () => {
      const player = createTestPlayer()
      const scroll = createScroll('scroll-1', ScrollType.ENCHANT_ARMOR)
      const weapon = createWeapon('weapon-1', 'Sword', '1d8', 0)

      player.inventory = [scroll, weapon]
      const state = createTestState(player)

      const command = new UseItemCommand(
        scroll.id,
        'read',
        inventoryService,
        messageService,
        mockRandom,
        identificationService,
        weapon.id
      )

      const newState = command.execute(state)

      expect(newState.messages[0].text).toContain('not armor')
    })
  })
})
