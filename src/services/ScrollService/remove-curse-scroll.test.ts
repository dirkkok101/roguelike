import { ScrollService } from './ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { LevelService } from '@services/LevelService'
import { FOVService } from '@services/FOVService'
import { DungeonService } from '@services/DungeonService'
import { CurseService } from '@services/CurseService'
import { MockRandom } from '@services/RandomService'
import {
  Player,
  Scroll,
  ScrollType,
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  RingType,
  WandType,
  Weapon,
  Armor,
  Ring,
  Torch,
} from '@game/core/core'

describe('ScrollService - REMOVE_CURSE Scroll', () => {
  let scrollService: ScrollService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let inventoryService: InventoryService
  let levelService: LevelService
  let fovService: FOVService
  let dungeonService: DungeonService
  let curseService: CurseService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([5])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    levelService = new LevelService()
    fovService = new FOVService()
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

    const torch: Torch = {
      id: 'torch-1',
      type: ItemType.TORCH,
      name: 'Torch',
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false,
      isIdentified: true,
    }

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
        lightSource: torch,
      },
      hunger: 1000,
      statusEffects: [],
    } as Player

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>([
        [ScrollType.REMOVE_CURSE, 'scroll labeled HACKEM MUCHE'],
      ]),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      currentLevel: 1,
      levels: new Map(),
      identifiedItems: new Set(),
      itemNameMap,
      messages: [],
      turnCount: 0,
      player: testPlayer,
      visibleCells: new Set(),
    } as GameState
  })

  describe('removes curses', () => {
    test('removes curse from single cursed weapon', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.player).toBeDefined()
      expect(result.player!.equipment.weapon!.cursed).toBe(false)
    })

    test('removes curse from single cursed armor', () => {
      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -2,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          armor: cursedArmor,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.player).toBeDefined()
      expect(result.player!.equipment.armor!.cursed).toBe(false)
    })

    test('removes curse from single cursed ring', () => {
      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring of Protection',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          leftRing: cursedRing,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.player).toBeDefined()
      expect(result.player!.equipment.leftRing!.cursed).toBe(false)
    })

    test('removes curses from multiple cursed items', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Plate Mail',
        ac: 3,
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedRing: Ring = {
        id: 'ring-1',
        type: ItemType.RING,
        name: 'Cursed Ring',
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'ruby',
        hungerModifier: 1.0,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
          armor: cursedArmor,
          rightRing: cursedRing,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.player).toBeDefined()
      expect(result.player!.equipment.weapon!.cursed).toBe(false)
      expect(result.player!.equipment.armor!.cursed).toBe(false)
      expect(result.player!.equipment.rightRing!.cursed).toBe(false)
    })
  })

  describe('no effect cases', () => {
    test('no effect when no cursed items', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('nothing happens')
    })

    test('no effect when equipment is uncursed', () => {
      const uncursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Mace',
        damage: '2d4',
        bonus: 1,
        isIdentified: true,
        cursed: false,
        position: { x: 0, y: 0 },
      }

      const playerWithUncursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: uncursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithUncursed,
        scroll,
        testState
      )

      expect(result.message).toContain('nothing happens')
    })
  })

  describe('messages', () => {
    test('displays single item message for one cursed item', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.message).toContain('somebody is watching over you')
      expect(result.message).toContain('Cursed Mace')
      expect(result.message).toContain('glows briefly')
    })

    test('displays multiple items message for several cursed items', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const cursedArmor: Armor = {
        id: 'armor-1',
        type: ItemType.ARMOR,
        name: 'Cursed Armor',
        ac: 3,
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
          armor: cursedArmor,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.message).toContain('somebody is watching over you')
      expect(result.message).toContain('equipment glows briefly')
    })
  })

  describe('scroll mechanics', () => {
    test('auto-identifies scroll on use', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.identified).toBe(true)
    })

    test('marks scroll as consumed', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.consumed).toBe(true)
    })

    test('does not fizzle', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      expect(result.fizzled).toBeUndefined()
    })
  })

  describe('immutability', () => {
    test('does not mutate original player', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      // Original player's weapon should still be cursed
      expect(playerWithCursed.equipment.weapon!.cursed).toBe(true)
      // New player's weapon should be uncursed
      expect(result.player!.equipment.weapon!.cursed).toBe(false)
    })

    test('preserves other player properties', () => {
      const cursedWeapon: Weapon = {
        id: 'weapon-1',
        type: ItemType.WEAPON,
        name: 'Cursed Mace',
        damage: '2d4',
        bonus: -1,
        isIdentified: true,
        cursed: true,
        position: { x: 0, y: 0 },
      }

      const playerWithCursed = {
        ...testPlayer,
        equipment: {
          ...testPlayer.equipment,
          weapon: cursedWeapon,
        },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Remove Curse',
        scrollType: ScrollType.REMOVE_CURSE,
        effect: 'Removes curses from equipment',
        labelName: 'scroll labeled HACKEM MUCHE',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithCursed,
        scroll,
        testState
      )

      // Other properties unchanged
      expect(result.player!.position).toEqual(playerWithCursed.position)
      expect(result.player!.hp).toBe(playerWithCursed.hp)
      expect(result.player!.strength).toBe(playerWithCursed.strength)
      expect(result.player!.equipment.weapon!.name).toBe('Cursed Mace')
      expect(result.player!.equipment.weapon!.bonus).toBe(-1)
    })
  })
})
