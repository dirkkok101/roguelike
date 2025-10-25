import { ScrollService } from './ScrollService'
import { mockItemData, mockGuaranteeConfig } from '@/test-utils'
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

describe('ScrollService - MAGIC_MAPPING Scroll', () => {
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
    // Create a test level with mixed explored/unexplored tiles
    const tiles = []
    const explored = []
    for (let y = 0; y < 10; y++) {
      const row = []
      const exploredRow = []
      for (let x = 0; x < 10; x++) {
        if (x === 0 || y === 0 || x === 9 || y === 9) {
          // Walls on edges
          row.push({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#666',
            colorExplored: '#333',
          })
        } else {
          // Floor
          row.push({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ddd',
            colorExplored: '#888',
          })
        }
        // Initially, only tiles near player are explored
        // Player at (5,5), so tiles within 2 tiles are explored
        const dx = Math.abs(x - 5)
        const dy = Math.abs(y - 5)
        exploredRow.push(dx <= 2 && dy <= 2)
      }
      tiles.push(row)
      explored.push(exploredRow)
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
      stairsDown: { x: 8, y: 8 }, // Stairs in unexplored area
      explored,
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
        [ScrollType.MAGIC_MAPPING, 'scroll labeled VAS CORP'],
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

    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    levelService = new LevelService()
    statusEffectService = new StatusEffectService()
      fovService = new FOVService(statusEffectService)
    dungeonService = new DungeonService(mockRandom, {} as MonsterSpawnService, mockItemData, mockGuaranteeConfig)
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

  describe('successful mapping', () => {
    test('reveals all tiles as explored', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.state).toBeDefined()

      const updatedLevel = result.state!.levels.get(1)!

      // All tiles should now be explored
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(updatedLevel.explored[y][x]).toBe(true)
        }
      }
    })

    test('reveals previously unexplored areas', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      // Verify stairs are initially unexplored (at 8,8, outside 5x5 area)
      expect(testLevel.explored[8][8]).toBe(false)

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Stairs should now be explored
      expect(updatedLevel.explored[8][8]).toBe(true)
    })

    test('preserves already explored tiles', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      // Verify some tiles were already explored
      expect(testLevel.explored[5][5]).toBe(true)
      expect(testLevel.explored[4][4]).toBe(true)

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Previously explored tiles should still be explored
      expect(updatedLevel.explored[5][5]).toBe(true)
      expect(updatedLevel.explored[4][4]).toBe(true)
    })

    test('does not modify FOV or visible cells', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const initialVisibleCells = testState.visibleCells

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Visible cells should not be modified (MAGIC_MAPPING only marks as explored, not visible)
      expect(result.state!.visibleCells).toBe(initialVisibleCells)
    })

    test('does not modify player', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Player should not be in result (not modified)
      expect(result.player).toBeUndefined()
    })

    test('displays revelation message', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('dungeon layout is revealed')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
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
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.identified).toBe(true)
    })

    test('reveals all tile types (walls, floors, doors)', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Walls should be explored
      expect(updatedLevel.explored[0][0]).toBe(true) // Corner wall
      expect(updatedLevel.explored[0][5]).toBe(true) // Top wall

      // Floors should be explored
      expect(updatedLevel.explored[1][1]).toBe(true)
      expect(updatedLevel.explored[5][5]).toBe(true)
    })
  })

  describe('edge cases', () => {
    test('works on fully unexplored level', () => {
      // Create level with no explored tiles
      const unexploredLevel = {
        ...testLevel,
        explored: Array(10)
          .fill(null)
          .map(() => Array(10).fill(false)),
      }

      const unexploredState = {
        ...testState,
        levels: new Map([[1, unexploredLevel]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        unexploredState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // All tiles should now be explored
      let exploredCount = 0
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (updatedLevel.explored[y][x]) {
            exploredCount++
          }
        }
      }

      expect(exploredCount).toBe(100) // All 10x10 tiles
    })

    test('works on already fully explored level', () => {
      // Create level with all explored tiles
      const fullyExploredLevel = {
        ...testLevel,
        explored: Array(10)
          .fill(null)
          .map(() => Array(10).fill(true)),
      }

      const fullyExploredState = {
        ...testState,
        levels: new Map([[1, fullyExploredLevel]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Magic Mapping',
        scrollType: ScrollType.MAGIC_MAPPING,
        effect: 'Reveals dungeon layout',
        labelName: 'scroll labeled VAS CORP',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        fullyExploredState
      )

      // Should still work (not fizzle)
      expect(result.consumed).toBe(true)
      expect(result.fizzled).toBeUndefined()

      const updatedLevel = result.state!.levels.get(1)!

      // All tiles should still be explored
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(updatedLevel.explored[y][x]).toBe(true)
        }
      }
    })
  })
})
