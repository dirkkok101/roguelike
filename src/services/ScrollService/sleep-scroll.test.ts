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
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  RingType,
  WandType,
  Level,
  TileType,
  StatusEffectType,
  Torch,
} from '@game/core/core'

describe('ScrollService - SLEEP Scroll (Cursed)', () => {
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

  beforeEach(() => {
    // Create a simple test level
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

    testLevel = {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
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
      statusEffects: [], // No status effects initially
    } as Player

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>([
        [ScrollType.SLEEP, 'scroll labeled XYZZY'],
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

    // MockRandom will return 5 for duration (4-8 range)
    mockRandom = new MockRandom([5])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    levelService = new LevelService()
    statusEffectService = new StatusEffectService()
      fovService = new FOVService(statusEffectService)
    dungeonService = new DungeonService(mockRandom)
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

  describe('cursed sleep effect', () => {
    test('puts player to sleep', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.player).toBeDefined()
    })

    test('adds SLEEPING status effect to player', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.player!.statusEffects.length).toBe(1)
      expect(result.player!.statusEffects[0].type).toBe(StatusEffectType.SLEEPING)
      expect(result.player!.statusEffects[0].duration).toBe(5) // MockRandom returns 5
    })

    test('duration is between 4-8 turns', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const duration = result.player!.statusEffects[0].duration

      expect(duration).toBeGreaterThanOrEqual(4)
      expect(duration).toBeLessThanOrEqual(8)
    })

    test('preserves existing status effects', () => {
      // Player already has a status effect
      const playerWithEffect = {
        ...testPlayer,
        statusEffects: [
          {
            type: StatusEffectType.HASTED,
            duration: 5,
          },
        ],
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        playerWithEffect,
        scroll,
        testState
      )

      // Should have both effects
      expect(result.player!.statusEffects.length).toBe(2)

      // HASTED still present
      const hastedEffect = result.player!.statusEffects.find(e => e.type === StatusEffectType.HASTED)
      expect(hastedEffect).toBeDefined()
      expect(hastedEffect!.duration).toBe(5)

      // SLEEPING also present
      const sleepEffect = result.player!.statusEffects.find(e => e.type === StatusEffectType.SLEEPING)
      expect(sleepEffect).toBeDefined()
    })

    test('displays sleep message', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('deep sleep')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.consumed).toBe(true)
    })

    test('auto-identifies scroll on use', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.identified).toBe(true)
    })

    test('does not modify game state', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // State should not be modified (only player)
      expect(result.state).toBeUndefined()
    })

    test('does not fizzle (cursed scrolls always work)', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Should never fizzle
      expect(result.fizzled).toBeUndefined()
    })

    test('preserves other player properties', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Sleep',
        scrollType: ScrollType.SLEEP,
        effect: 'Puts reader to sleep',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Other player properties should be unchanged
      expect(result.player!.position).toEqual(testPlayer.position)
      expect(result.player!.hp).toBe(testPlayer.hp)
      expect(result.player!.strength).toBe(testPlayer.strength)
    })
  })
})
