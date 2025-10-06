import { WandService } from './WandService'
import { IdentificationService } from '@services/IdentificationService'
import { CombatService } from '@services/CombatService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import {
  Player,
  Wand,
  WandType,
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  ScrollType,
  RingType,
  Monster,
  MonsterBehavior,
  MonsterState,
  Level,
  TileType,
} from '@game/core/core'

describe('WandService - Charge System', () => {
  let wandService: WandService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let combatService: CombatService
  let levelService: LevelService
  let testPlayer: Player
  let testState: GameState
  let testMonster: Monster
  let testLevel: Level

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    combatService = new CombatService(mockRandom)
    levelService = new LevelService()
    wandService = new WandService(identificationService, mockRandom, combatService, levelService)

    testMonster = {
      id: 'monster-1',
      letter: 'B',
      name: 'Bat',
      position: { x: 6, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 7,
      damage: '1d2',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    }

    testLevel = {
      depth: 1,
      width: 80,
      height: 22,
      tiles: Array(22).fill(null).map(() =>
        Array(80).fill(null).map(() => ({
          type: TileType.FLOOR,
          walkable: true,
          transparent: true,
          explored: false,
        }))
      ),
      monsters: [testMonster],
      items: [],
      rooms: [],
      corridors: [],
      doors: [],
      traps: [],
      upStairs: { x: 40, y: 11 },
      downStairs: { x: 41, y: 11 },
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
        lightSource: null,
      },
      hunger: 1000,
    } as Player

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>([
        [WandType.LIGHTNING, 'oak wand'],
        [WandType.FIRE, 'pine wand'],
      ]),
    }

    const levels = new Map<number, Level>()
    levels.set(1, testLevel)

    testState = {
      identifiedItems: new Set(),
      itemNameMap,
      currentLevel: 1,
      levels,
    } as GameState
  })

  describe('charge depletion', () => {
    test('decrements charges by 1 when used', () => {
      mockRandom.setValues([10]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      expect(result.wand.currentCharges).toBe(4) // 5 - 1
      expect(result.wand.charges).toBe(10) // Max unchanged
    })

    test('works when wand has 1 charge left', () => {
      mockRandom.setValues([10]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 1, // Last charge
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      expect(result.wand.currentCharges).toBe(0)
      expect(result.message).toContain('lightning')
    })

    test('refuses to use wand with 0 charges', () => {
      const depletedWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 0, // Empty
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        depletedWand,
        testState,
        'monster-1'
      )

      expect(result.wand.currentCharges).toBe(0) // Unchanged
      expect(result.message).toBe('The wand has no charges.')
      expect(result.identified).toBe(false) // Not identified by failed use
    })

    test('player remains unchanged when using wand', () => {
      mockRandom.setValues([10]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      expect(result.player).toBe(testPlayer) // No modifications
    })
  })

  describe('identification', () => {
    test('marks wand as identified when used', () => {
      mockRandom.setValues([10]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      expect(result.identified).toBe(true)
    })

    test('shows descriptive name for unidentified wand', () => {
      mockRandom.setValues([10]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      expect(result.message).toContain('oak wand')
    })
  })

  describe('wand effects', () => {
    test('damage wands apply damage to monsters', () => {
      mockRandom.setValues([15]) // Damage roll

      const fireWand: Wand = {
        id: 'wand-2',
        type: ItemType.WAND,
        name: 'Wand of Fire',
        wandType: WandType.FIRE,
        damage: '6d6',
        charges: 8,
        currentCharges: 8,
        woodName: 'pine wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        fireWand,
        testState,
        'monster-1'
      )

      expect(result.message).toContain('fire')
      expect(result.state).toBeDefined()
    })
  })
})
