import { ScrollService } from './ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { LevelService } from '@services/LevelService'
import { FOVService } from '@services/FOVService'
import { DungeonService } from '@services/DungeonService'
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

describe('ScrollService - TELEPORTATION Scroll', () => {
  let scrollService: ScrollService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let inventoryService: InventoryService
  let levelService: LevelService
  let fovService: FOVService
  let dungeonService: DungeonService
  let testPlayer: Player
  let testState: GameState
  let testLevel: Level

  beforeEach(() => {
    // Create a test level with walkable tiles
    const tiles = []
    for (let y = 0; y < 10; y++) {
      const row = []
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
      monsters: [], // No monsters for teleport testing
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
      position: { x: 1, y: 1 },
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
        [ScrollType.TELEPORTATION, 'scroll labeled FOOBAR'],
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
  })

  describe('successful teleportation', () => {
    beforeEach(() => {
      // MockRandom will select index 5 from walkable tiles array
      mockRandom = new MockRandom([5])
      identificationService = new IdentificationService(mockRandom)
      inventoryService = new InventoryService()
      levelService = new LevelService()
      fovService = new FOVService()
      scrollService = new ScrollService(
        identificationService,
        inventoryService,
        levelService,
        fovService,
        mockRandom
      )
    })

    test('teleports player to random walkable location', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Should have updated player position
      expect(result.player).toBeDefined()

      // MockRandom.pickRandom() returns first walkable tile
      // First walkable tile is (1,1) since player starts there, but it's still valid
      expect(result.player!.position.x).toBeGreaterThanOrEqual(1)
      expect(result.player!.position.y).toBeGreaterThanOrEqual(1)
      expect(result.player!.position.x).toBeLessThan(9)
      expect(result.player!.position.y).toBeLessThan(9)
    })

    test('updates game state with new FOV', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Should have updated state
      expect(result.state).toBeDefined()

      // Should have updated visible cells
      expect(result.state!.visibleCells).toBeDefined()
      expect(result.state!.visibleCells.size).toBeGreaterThan(0)
    })

    test('displays wrenching sensation message', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('wrenching sensation')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.consumed).toBe(true)
    })

    test('does not teleport to monster positions', () => {
      // Add monsters to level
      const levelWithMonsters = {
        ...testLevel,
        monsters: [
          { id: 'm1', position: { x: 2, y: 2 } } as any,
          { id: 'm2', position: { x: 3, y: 3 } } as any,
        ],
      }

      const stateWithMonsters = {
        ...testState,
        levels: new Map([[1, levelWithMonsters]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        stateWithMonsters
      )

      // Should not teleport to monster positions
      expect(result.player!.position).not.toEqual({ x: 2, y: 2 })
      expect(result.player!.position).not.toEqual({ x: 3, y: 3 })
    })

    test('auto-identifies scroll on use', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.identified).toBe(true)
    })
  })

  describe('fizzle cases', () => {
    beforeEach(() => {
      mockRandom = new MockRandom([])
      identificationService = new IdentificationService(mockRandom)
      inventoryService = new InventoryService()
      levelService = new LevelService()
      fovService = new FOVService()
      dungeonService = new DungeonService(mockRandom)
      scrollService = new ScrollService(
        identificationService,
        inventoryService,
        levelService,
        fovService,
        mockRandom,
        dungeonService
      )
    })

    test('fizzles when no walkable tiles available', () => {
      // Create level with all walls
      const blockedLevel = {
        ...testLevel,
        tiles: Array(10)
          .fill(null)
          .map(() =>
            Array(10)
              .fill(null)
              .map(() => ({
                type: TileType.WALL,
                char: '#',
                walkable: false,
                transparent: false,
                colorVisible: '#666',
                colorExplored: '#333',
              }))
          ),
      }

      const blockedState = {
        ...testState,
        levels: new Map([[1, blockedLevel]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Teleportation',
        scrollType: ScrollType.TELEPORTATION,
        effect: 'Teleports player',
        labelName: 'scroll labeled FOOBAR',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        blockedState
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('nothing happens')
    })
  })
})
