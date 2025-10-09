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
  Torch,
} from '@game/core/core'

describe('ScrollService - SCARE_MONSTER Scroll', () => {
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
      statusEffects: [],
    } as Player

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>([
        [ScrollType.SCARE_MONSTER, 'scroll labeled ABRACADABRA'],
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
      turnCount: 100,
      player: testPlayer,
      visibleCells: new Set(),
    } as GameState

    mockRandom = new MockRandom([])
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

  describe('basic functionality', () => {
    test('reading scroll does not consume it', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.consumed).toBe(false)
    })

    test('displays instruction to drop the scroll', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('roar')
      expect(result.message).toContain('drop')
    })

    test('auto-identifies scroll on use', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.identified).toBe(true)
    })

    test('does not modify player', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.player).toBeUndefined()
    })

    test('does not modify game state', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.state).toBeUndefined()
    })

    test('does not fizzle', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.fizzled).toBeUndefined()
    })

    test('works with unidentified scroll', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.consumed).toBe(false)
      expect(result.identified).toBe(true)
      expect(result.message).toBeDefined()
    })

    test('works with already identified scroll', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: true,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.consumed).toBe(false)
      expect(result.identified).toBe(true)
      expect(result.message).toBeDefined()
    })
  })

  describe('uniqueness', () => {
    test('is the only scroll that is not consumed when read', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Scare Monster',
        scrollType: ScrollType.SCARE_MONSTER,
        effect: 'Scares nearby monsters when dropped',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // All other scrolls have consumed: true
      // SCARE_MONSTER is unique with consumed: false
      expect(result.consumed).toBe(false)
    })
  })
})
