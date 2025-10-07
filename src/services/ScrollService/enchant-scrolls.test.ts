import { ScrollService } from './ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { LevelService } from '@services/LevelService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { DungeonService } from '@services/DungeonService'
import { CurseService } from '@services/CurseService'
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
  let levelService: LevelService
  let fovService: FOVService
  let statusEffectService: StatusEffectService
  let dungeonService: DungeonService
  let curseService: CurseService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    levelService = new LevelService()
    statusEffectService = new StatusEffectService()
      fovService = new FOVService(statusEffectService)
    dungeonService = new DungeonService(mockRandom)
    curseService = new CurseService()
    scrollService = new ScrollService(
      identificationService,
      inventoryService,
      levelService,
      fovService,
      mockRandom,
      dungeonService,
      curseService
    )

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
      expect(enchantedWeapon.name).toBe('Mace +1') // Name updated with new bonus
      expect(result.message).toBe('You read scroll labeled ELBERETH. Mace +1 glows brightly! (+1)')
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
      expect(enchantedArmor.name).toBe('Leather Armor +1') // Name updated with new bonus
      expect(result.message).toBe('You read scroll labeled NR 9. Leather Armor +1 glows with protection! [AC 7]')
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

  describe('Curse Removal', () => {
    test('enchanting cursed weapon removes curse and adds +1 bonus', () => {
      const cursedSword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Short Sword -2',
        damage: '1d8',
        bonus: -2,
        cursed: true,
        isIdentified: true,
      }

      testPlayer.inventory = [cursedSword]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants weapon',
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
      expect(enchantedWeapon.bonus).toBe(-1) // -2 + 1 = -1
      expect(enchantedWeapon.cursed).toBe(false) // Curse removed
      expect(result.message).toContain('The curse is lifted!')
    })

    test('enchanting cursed armor removes curse and adds +1 bonus', () => {
      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Chain Mail -1',
        ac: 5,
        bonus: -1,
        cursed: true,
        isIdentified: true,
      }

      testPlayer.inventory = [cursedArmor]

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
      expect(enchantedArmor.bonus).toBe(0) // -1 + 1 = 0
      expect(enchantedArmor.cursed).toBe(false) // Curse removed
      expect(result.message).toContain('The curse is lifted!')
    })

    test('enchanting non-cursed weapon shows normal message', () => {
      const normalSword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Short Sword',
        damage: '1d8',
        bonus: 0,
        cursed: false,
        isIdentified: true,
      }

      testPlayer.inventory = [normalSword]

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'weapon-1'
      )

      expect(result.message).not.toContain('curse')
      expect(result.message).toContain('(+1)') // Shows bonus instead
    })

    test('enchanting equipped cursed weapon removes curse', () => {
      const cursedSword: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Long Sword -1',
        damage: '1d12',
        bonus: -1,
        cursed: true,
        isIdentified: true,
      }

      testPlayer.inventory = [cursedSword]
      testPlayer.equipment.weapon = cursedSword

      const enchantScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Enchant Weapon',
        scrollType: ScrollType.ENCHANT_WEAPON,
        effect: 'Enchants weapon',
        labelName: 'scroll labeled ELBERETH',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        enchantScroll,
        testState,
        'weapon-1'
      )

      // Check both inventory and equipment updated
      const enchantedWeapon = result.player.inventory.find(i => i.type === ItemType.WEAPON) as Weapon
      expect(enchantedWeapon.cursed).toBe(false)
      expect(result.player.equipment.weapon?.cursed).toBe(false)
      expect(result.message).toContain('The curse is lifted!')
    })

    test('enchanting equipped cursed armor removes curse', () => {
      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail -2',
        ac: 3,
        bonus: -2,
        cursed: true,
        isIdentified: true,
      }

      testPlayer.inventory = [cursedArmor]
      testPlayer.equipment.armor = cursedArmor

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

      // Check both inventory and equipment updated
      const enchantedArmor = result.player.inventory.find(i => i.type === ItemType.ARMOR) as Armor
      expect(enchantedArmor.cursed).toBe(false)
      expect(result.player.equipment.armor?.cursed).toBe(false)
      expect(result.message).toContain('The curse is lifted!')
    })
  })
})
