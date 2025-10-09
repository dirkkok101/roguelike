import { ScrollService } from './ScrollService'
import { mockItemData } from '@/test-utils'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
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
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  RingType,
  WandType,
  Level,
  TileType,
  Monster,
  MonsterBehavior,
  MonsterState,
  StatusEffectType,
  Torch,
} from '@game/core/core'

describe('ScrollService - HOLD_MONSTER Scroll', () => {
  let scrollService: ScrollService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let inventoryService: InventoryService
  let levelService: LevelService
  let fovService: FOVService
  let statusEffectService: StatusEffectService
  let dungeonService: DungeonService
  let testPlayer: Player
  let testState: GameState
  let testLevel: Level
  let adjacentMonster: Monster
  let distantMonster: Monster

  beforeEach(() => {
    // Create a test level with simple floor
    const tiles = []
    for (let y = 0; y < 10; y++) {
      const row = []
      for (let x = 0; x < 10; x++) {
        row.push({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#ddd',
          colorExplored: '#888',
        })
      }
      tiles.push(row)
    }

    // Create monsters: one adjacent, one distant
    adjacentMonster = {
      id: 'monster-adjacent',
      letter: 'O',
      name: 'Orc',
      position: { x: 6, y: 5 }, // Adjacent to player at (5,5)
      hp: 10,
      maxHp: 10,
      ac: 7,
      damage: '1d6',
      xpValue: 10,
      level: 1,
      aiProfile: {
        behavior: MonsterBehavior.SMART,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0.0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    } as Monster

    distantMonster = {
      id: 'monster-distant',
      letter: 'K',
      name: 'Kobold',
      position: { x: 8, y: 8 }, // Distant from player at (5,5)
      hp: 5,
      maxHp: 5,
      ac: 8,
      damage: '1d4',
      xpValue: 5,
      level: 1,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 3,
        fleeThreshold: 0.0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    } as Monster

    testLevel = {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [adjacentMonster, distantMonster],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
      explored: Array(10).fill(Array(10).fill(false)),
    } as Level

    const torch: Torch = {
      id: 'torch-1',
      type: ItemType.TORCH,
      name: 'Torch',
      char: '~',
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
        [ScrollType.HOLD_MONSTER, 'scroll labeled LOREM IPSUM'],
      ]),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      currentLevel: 1,
      levels: new Map([[1, testLevel]]),
      identifiedItems: new Set(),
      itemNameMap,
      messages: [],
      turnCount: 0,
      player: testPlayer,
      visibleCells: new Set(),
    } as GameState

    // MockRandom will return 4 for duration (3-6 range)
    mockRandom = new MockRandom([4])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    levelService = new LevelService()
    statusEffectService = new StatusEffectService()
      fovService = new FOVService(statusEffectService)
    dungeonService = new DungeonService(mockRandom, {} as MonsterSpawnService, mockItemData)
    const curseService = new CurseService()
    scrollService = new ScrollService(
      identificationService,
      inventoryService,
      levelService,
      fovService,
      mockRandom,
      dungeonService,
      curseService
    )
  })

  describe('successful monster holding', () => {
    test('freezes adjacent monster', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      expect(result.state).toBeDefined()
      expect(result.fizzled).toBeUndefined()
    })

    test('adds HELD status effect to monster', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      const updatedLevel = result.state!.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-adjacent')!

      expect(updatedMonster.statusEffects.length).toBe(1)
      expect(updatedMonster.statusEffects[0].type).toBe(StatusEffectType.HELD)
      expect(updatedMonster.statusEffects[0].duration).toBe(4) // MockRandom returns 4
    })

    test('duration is between 3-6 turns', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      const updatedLevel = result.state!.levels.get(1)!
      const updatedMonster = updatedLevel.monsters.find(m => m.id === 'monster-adjacent')!
      const duration = updatedMonster.statusEffects[0].duration

      expect(duration).toBeGreaterThanOrEqual(3)
      expect(duration).toBeLessThanOrEqual(6)
    })

    test('preserves other monsters in level', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Should still have 2 monsters
      expect(updatedLevel.monsters.length).toBe(2)

      // Distant monster should be unchanged
      const distantStillThere = updatedLevel.monsters.find(m => m.id === 'monster-distant')!
      expect(distantStillThere).toBeDefined()
      expect(distantStillThere.statusEffects.length).toBe(0)
    })

    test('displays freeze message with monster name', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      expect(result.message).toContain('Orc')
      expect(result.message).toContain('freezes in place')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      expect(result.consumed).toBe(true)
    })

    test('auto-identifies scroll on use', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      expect(result.identified).toBe(true)
    })

    test('does not modify player', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-adjacent'
      )

      // Player should not be in result (not modified)
      expect(result.player).toBeUndefined()
    })
  })

  describe('fizzle cases', () => {
    test('fizzles when no target provided', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
        // No targetId provided
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('nothing happens')
    })

    test('fizzles when monster not found', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'nonexistent-monster'
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('monster is gone')
    })

    test('fizzles when monster is too far away', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState,
        'monster-distant' // Monster at (8,8), player at (5,5)
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('too far away')
    })

    test('does not update state when fizzled', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // State should not be in result when fizzled
      expect(result.state).toBeUndefined()
    })
  })

  describe('adjacency detection', () => {
    test('detects diagonal adjacency', () => {
      // Create monster diagonally adjacent
      const diagonalMonster = {
        ...adjacentMonster,
        id: 'monster-diagonal',
        position: { x: 6, y: 6 }, // Diagonal from player at (5,5)
      }

      const levelWithDiagonal = {
        ...testLevel,
        monsters: [diagonalMonster],
      }

      const stateWithDiagonal = {
        ...testState,
        levels: new Map([[1, levelWithDiagonal]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        stateWithDiagonal,
        'monster-diagonal'
      )

      expect(result.fizzled).toBeUndefined()
      expect(result.consumed).toBe(true)
    })

    test('rejects monster at same position as player', () => {
      // This shouldn't happen in real game, but test the logic
      const samePositionMonster = {
        ...adjacentMonster,
        id: 'monster-same',
        position: { x: 5, y: 5 }, // Same as player
      }

      const levelWithSame = {
        ...testLevel,
        monsters: [samePositionMonster],
      }

      const stateWithSame = {
        ...testState,
        levels: new Map([[1, levelWithSame]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Hold Monster',
        scrollType: ScrollType.HOLD_MONSTER,
        effect: 'Freezes a monster',
        labelName: 'scroll labeled LOREM IPSUM',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        stateWithSame,
        'monster-same'
      )

      // Should fizzle (dx + dy = 0)
      expect(result.fizzled).toBe(true)
      expect(result.message).toContain('too far away')
    })
  })
})
