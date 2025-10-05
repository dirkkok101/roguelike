import { ScrollService } from './ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { MockRandom } from '@services/RandomService'
import {
  Player,
  Scroll,
  ScrollType,
  Weapon,
  Armor,
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  RingType,
  WandType,
} from '@game/core/core'

describe('ScrollService - Enchant Scrolls', () => {
  let scrollService: ScrollService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let inventoryService: InventoryService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    scrollService = new ScrollService(identificationService, inventoryService)

    testPlayer = {
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      maxStrength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      armorClass: 10,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      hunger: 1000,
    } as Player

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>([
        [ScrollType.IDENTIFY, 'scroll labeled XYZZY'],
        [ScrollType.ENCHANT_WEAPON, 'scroll labeled ELBERETH'],
        [ScrollType.ENCHANT_ARMOR, 'scroll labeled NR 9'],
      ]),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      identifiedItems: new Set(),
      itemNameMap,
    } as GameState
  })

  describe('ENCHANT_WEAPON scroll', () => {
    test('enchants weapon by +1', () => {
      const sword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 0,
        isIdentified: true,
      }

      testPlayer.inventory = [sword]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants a weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'weapon-1'
      )

      const enchantedWeapon = result.player.inventory.find(i => i.type === ItemType.WEAPON) as Weapon
      expect(enchantedWeapon).toBeDefined()
      expect(enchantedWeapon.bonus).toBe(1)
      expect(result.message).toBe('You read scroll labeled ELBERETH. Mace glows brightly! (+1)')
    })

    test('refuses to enchant beyond +3', () => {
      const maxEnchantedSword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 3, // Max enchantment
        isIdentified: true,
      }

      testPlayer.inventory = [maxEnchantedSword]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants a weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'weapon-1'
      )

      const weapon = result.player.inventory.find(i => i.type === ItemType.WEAPON) as Weapon
      expect(weapon.bonus).toBe(3) // Unchanged
      expect(result.message).toBe('You read scroll labeled ELBERETH. Mace is already at maximum enchantment!')
    })

    test('updates equipped weapon bonus', () => {
      const sword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 0,
        isIdentified: true,
      }

      testPlayer.inventory = [sword]
      testPlayer.equipment.weapon = sword

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants a weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'weapon-1'
      )

      expect(result.player.equipment.weapon?.bonus).toBe(1)
    })

    test('handles non-weapon target', () => {
      const armor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Leather Armor',
        ac: 8,
        bonus: 0,
        isIdentified: true,
      }

      testPlayer.inventory = [armor]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants a weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'armor-1'
      )

      expect(result.message).toBe('You read scroll labeled ELBERETH, but the item is not a weapon.')
    })
  })

  describe('ENCHANT_ARMOR scroll', () => {
    test('enchants armor by +1', () => {
      const armor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Leather Armor',
        ac: 8,
        bonus: 0,
        isIdentified: true,
      }

      testPlayer.inventory = [armor]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Armor',
        scrollType: ScrollType.ENCHANT_ARMOR,
        effect: 'Enchants armor',
        labelName: 'scroll labeled NR 9',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'armor-1'
      )

      const enchantedArmor = result.player.inventory.find(i => i.type === ItemType.ARMOR) as Armor
      expect(enchantedArmor).toBeDefined()
      expect(enchantedArmor.bonus).toBe(1)
      expect(result.message).toBe('You read scroll labeled NR 9. Leather Armor glows with protection! [AC 7]')
    })

    test('refuses to enchant beyond +3', () => {
      const maxEnchantedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Plate Mail',
        ac: 3,
        bonus: 3,
        isIdentified: true,
      }

      testPlayer.inventory = [maxEnchantedArmor]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Armor',
        scrollType: ScrollType.ENCHANT_ARMOR,
        effect: 'Enchants armor',
        labelName: 'scroll labeled NR 9',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'armor-1'
      )

      const armor = result.player.inventory.find(i => i.type === ItemType.ARMOR) as Armor
      expect(armor.bonus).toBe(3) // Unchanged
      expect(result.message).toBe('You read scroll labeled NR 9. Plate Mail is already at maximum enchantment!')
    })

    test('updates equipped armor bonus', () => {
      const armor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Leather Armor',
        ac: 8,
        bonus: 0,
        isIdentified: true,
      }

      testPlayer.inventory = [armor]
      testPlayer.equipment.armor = armor

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Armor',
        scrollType: ScrollType.ENCHANT_ARMOR,
        effect: 'Enchants armor',
        labelName: 'scroll labeled NR 9',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'armor-1'
      )

      expect(result.player.equipment.armor?.bonus).toBe(1)
    })
  })
})
