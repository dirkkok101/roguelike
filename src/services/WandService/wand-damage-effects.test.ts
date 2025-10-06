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

describe('WandService - Damage Effects', () => {
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
      hp: 30,
      maxHp: 30,
      ac: 7,
      damage: '1d2',
      xpValue: 5,
      level: 1,
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
        [WandType.COLD, 'birch wand'],
        [WandType.MAGIC_MISSILE, 'ash wand'],
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

  describe('LIGHTNING wand', () => {
    test('deals 6d6 damage to monster', () => {
      mockRandom.setValues([15]) // Damage roll

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '6d6',
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

      expect(result.message).toContain('lightning')
      expect(result.message).toContain('15 damage')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')!
      expect(updatedMonster.hp).toBe(15) // 30 - 15
    })

    test('kills monster when damage exceeds HP', () => {
      mockRandom.setValues([35]) // Lethal damage

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '6d6',
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

      expect(result.message).toContain('killed')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')
      expect(updatedMonster).toBeUndefined() // Monster removed from array
    })

    test('identifies wand on use', () => {
      mockRandom.setValues([10])

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '6d6',
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
  })

  describe('FIRE wand', () => {
    test('deals 6d6 damage to monster', () => {
      mockRandom.setValues([20]) // Damage roll

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
      expect(result.message).toContain('20 damage')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')!
      expect(updatedMonster.hp).toBe(10) // 30 - 20
    })
  })

  describe('COLD wand', () => {
    test('deals 6d6 damage to monster', () => {
      mockRandom.setValues([18]) // Damage roll

      const coldWand: Wand = {
        id: 'wand-3',
        type: ItemType.WAND,
        name: 'Wand of Cold',
        wandType: WandType.COLD,
        damage: '6d6',
        charges: 7,
        currentCharges: 7,
        woodName: 'birch wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        coldWand,
        testState,
        'monster-1'
      )

      expect(result.message).toContain('cold')
      expect(result.message).toContain('18 damage')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')!
      expect(updatedMonster.hp).toBe(12) // 30 - 18
    })
  })

  describe('MAGIC_MISSILE wand', () => {
    test('deals 2d6 damage to monster', () => {
      mockRandom.setValues([8]) // Damage roll

      const magicMissileWand: Wand = {
        id: 'wand-4',
        type: ItemType.WAND,
        name: 'Wand of Magic Missile',
        wandType: WandType.MAGIC_MISSILE,
        damage: '2d6',
        charges: 10,
        currentCharges: 10,
        woodName: 'ash wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        magicMissileWand,
        testState,
        'monster-1'
      )

      expect(result.message).toContain('Magic missiles')
      expect(result.message).toContain('8 damage')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')!
      expect(updatedMonster.hp).toBe(22) // 30 - 8
    })

    test('kills monster when damage exceeds HP', () => {
      mockRandom.setValues([35]) // Lethal damage

      const magicMissileWand: Wand = {
        id: 'wand-4',
        type: ItemType.WAND,
        name: 'Wand of Magic Missile',
        wandType: WandType.MAGIC_MISSILE,
        damage: '2d6',
        charges: 10,
        currentCharges: 10,
        woodName: 'ash wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        magicMissileWand,
        testState,
        'monster-1'
      )

      expect(result.message).toContain('kill')

      const updatedLevel = result.state.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-1')
      expect(updatedMonster).toBeUndefined() // Monster removed from array
    })
  })

  describe('Dead monster cleanup', () => {
    test('removes monster from level when killed', () => {
      mockRandom.setValues([50]) // Massive overkill

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '6d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const initialMonsterCount = testLevel.monsters.length
      expect(initialMonsterCount).toBe(1)

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState,
        'monster-1'
      )

      const updatedLevel = result.state.levels.get(1)!
      expect(updatedLevel.monsters).toHaveLength(0) // Monster removed
    })

    test('does not remove monster when damaged but alive', () => {
      mockRandom.setValues([5]) // Small damage

      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '6d6',
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

      const updatedLevel = result.state.levels.get(1)!
      expect(updatedLevel.monsters).toHaveLength(1) // Monster still there
      expect(updatedLevel.monsters[0].hp).toBe(25) // 30 - 5
    })
  })
})
