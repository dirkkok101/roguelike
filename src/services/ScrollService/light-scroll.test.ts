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
  Room,
  Torch,
} from '@game/core/core'

describe('ScrollService - LIGHT Scroll', () => {
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
    // Create a test level with a 5x5 room and corridors
    // Layout:
    // ###########
    // #.........#  <- Corridor
    // #.#####...#
    // #.#...#...#  <- Room (3,3) to (5,5)
    // #.#...#...#
    // #.#...#...#
    // #.#####...#
    // #.........#  <- Corridor
    // ###########

    const tiles = []
    const explored = []
    for (let y = 0; y < 9; y++) {
      const row = []
      const exploredRow = []
      for (let x = 0; x < 11; x++) {
        // Define room bounds (3,3) to (5,5)
        const inRoom = x >= 3 && x <= 5 && y >= 3 && y <= 5

        if (x === 0 || x === 10 || y === 0 || y === 8) {
          // Outer walls
          row.push({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#666',
            colorExplored: '#333',
          })
        } else if (inRoom) {
          // Room floor
          row.push({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ddd',
            colorExplored: '#888',
          })
        } else if ((x === 2 || x === 6) && (y >= 2 && y <= 6)) {
          // Room walls
          row.push({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#666',
            colorExplored: '#333',
          })
        } else if ((y === 2 || y === 6) && (x >= 2 && x <= 6)) {
          // Room walls
          row.push({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#666',
            colorExplored: '#333',
          })
        } else {
          // Corridor floor
          row.push({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ddd',
            colorExplored: '#888',
          })
        }

        // Nothing is initially explored
        exploredRow.push(false)
      }
      tiles.push(row)
      explored.push(exploredRow)
    }

    const room: Room = {
      x: 3,
      y: 3,
      width: 3,
      height: 3,
    }

    testLevel = {
      depth: 1,
      width: 11,
      height: 9,
      tiles,
      rooms: [room],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 4, y: 4 },
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
      position: { x: 4, y: 4 }, // Center of room
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
        [ScrollType.LIGHT, 'scroll labeled READ ME'],
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

  describe('successful room lighting', () => {
    test('lights entire room when player is in room', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.state).toBeDefined()
      expect(result.fizzled).toBeUndefined()
    })

    test('marks all room tiles as explored', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // All room tiles should be explored
      for (let y = 3; y <= 5; y++) {
        for (let x = 3; x <= 5; x++) {
          expect(updatedLevel.explored[y][x]).toBe(true)
        }
      }
    })

    test('marks all room tiles as visible', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // All room tiles should be in visible cells
      for (let y = 3; y <= 5; y++) {
        for (let x = 3; x <= 5; x++) {
          const key = `${x},${y}`
          expect(result.state!.visibleCells.has(key)).toBe(true)
        }
      }
    })

    test('does not mark corridor tiles as visible', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Corridor tiles should NOT be visible (e.g., position 1,1)
      expect(result.state!.visibleCells.has('1,1')).toBe(false)
      expect(result.state!.visibleCells.has('7,7')).toBe(false)
    })

    test('displays light message', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('floods with light')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
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
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
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
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
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

    test('preserves tiles outside room', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Tiles outside room should NOT be explored
      expect(updatedLevel.explored[1][1]).toBe(false)
      expect(updatedLevel.explored[7][7]).toBe(false)
    })
  })

  describe('fizzle cases', () => {
    test('fizzles when player is in corridor', () => {
      // Move player to corridor position
      const corridorPlayer = {
        ...testPlayer,
        position: { x: 1, y: 1 }, // Corridor position
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        corridorPlayer,
        scroll,
        testState
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('corridor')
    })

    test('does not update state when fizzled', () => {
      // Move player to corridor position
      const corridorPlayer = {
        ...testPlayer,
        position: { x: 1, y: 1 },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        corridorPlayer,
        scroll,
        testState
      )

      // State should not be in result
      expect(result.state).toBeUndefined()
    })

    test('does not update visible cells when fizzled', () => {
      // Move player to corridor position
      const corridorPlayer = {
        ...testPlayer,
        position: { x: 1, y: 1 },
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Light',
        scrollType: ScrollType.LIGHT,
        effect: 'Lights current room',
        labelName: 'scroll labeled READ ME',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        corridorPlayer,
        scroll,
        testState
      )

      // Should not update visible cells
      expect(result.state).toBeUndefined()
    })
  })
})
