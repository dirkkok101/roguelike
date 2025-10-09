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

describe('ScrollService - CREATE_MONSTER Scroll', () => {
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
    // Create a test level with player at center and empty adjacent tiles
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
      monsters: [], // Start with no monsters
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
      position: { x: 5, y: 5 }, // Center position with empty adjacents
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
        [ScrollType.CREATE_MONSTER, 'scroll labeled ABRACADABRA'],
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

    // MockRandom needs values for:
    // 1. pickRandom(adjacentTiles) - selects spawn position
    // 2. pickRandom(monsterTemplates) - selects monster type
    // 3. roll(hpDice) - rolls monster HP (for Bat: 1d8)
    // 4. nextInt(1000, 9999) - generates monster ID
    // 5. nextInt(0, 99) - generates energy value
    mockRandom = new MockRandom([0, 0, 5, 1234, 50])
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

  describe('successful monster creation', () => {
    test('spawns monster adjacent to player', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      // Should have updated state
      expect(result.state).toBeDefined()

      // Level should have one monster now
      const updatedLevel = result.state!.levels.get(1)!
      expect(updatedLevel.monsters.length).toBe(1)

      // Monster should be adjacent to player (within 1 tile)
      const monster = updatedLevel.monsters[0]
      const dx = Math.abs(monster.position.x - testPlayer.position.x)
      const dy = Math.abs(monster.position.y - testPlayer.position.y)
      expect(dx).toBeLessThanOrEqual(1)
      expect(dy).toBeLessThanOrEqual(1)
      expect(dx + dy).toBeGreaterThan(0) // Not on player position
    })

    test('monster is appropriate for level depth', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const monster = result.state!.levels.get(1)!.monsters[0]

      // At depth 1, should spawn low-level monster (Bat, Kobold, Snake)
      expect(monster.level).toBeLessThanOrEqual(1)
      expect(['B', 'K', 'S']).toContain(monster.letter) // Bat, Kobold, or Snake
    })

    test('monster is awake and ready to attack', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      const monster = result.state!.levels.get(1)!.monsters[0]

      // Spawned monsters are awake and aggressive
      expect(monster.isAwake).toBe(true)
      expect(monster.isAsleep).toBe(false)
    })

    test('displays anguish message', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        testState
      )

      expect(result.message).toContain('faint cry of anguish')
    })

    test('marks scroll as consumed', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
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
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
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
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
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

    test('preserves existing monsters in level', () => {
      // Add existing monster to level
      const existingMonster = {
        id: 'existing-1',
        letter: 'K',
        name: 'Kobold',
        position: { x: 2, y: 2 },
        hp: 5,
        maxHp: 5,
      } as any

      const levelWithMonster = {
        ...testLevel,
        monsters: [existingMonster],
      }

      const stateWithMonster = {
        ...testState,
        levels: new Map([[1, levelWithMonster]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        stateWithMonster
      )

      const updatedLevel = result.state!.levels.get(1)!

      // Should have both monsters
      expect(updatedLevel.monsters.length).toBe(2)

      // Existing monster should still be there
      const stillThere = updatedLevel.monsters.find(m => m.id === 'existing-1')
      expect(stillThere).toBeDefined()
    })
  })

  describe('fizzle cases', () => {
    test('fizzles when player is completely surrounded', () => {
      // Create level with player surrounded by walls
      const blockedLevel = {
        ...testLevel,
        tiles: testLevel.tiles.map((row, y) =>
          row.map((tile, x) => {
            // Player at 5,5 - surround with walls
            const dx = Math.abs(x - 5)
            const dy = Math.abs(y - 5)
            if (dx <= 1 && dy <= 1 && !(x === 5 && y === 5)) {
              return {
                type: TileType.WALL,
                char: '#',
                walkable: false,
                transparent: false,
                colorVisible: '#666',
                colorExplored: '#333',
              }
            }
            return tile
          })
        ),
      }

      const blockedState = {
        ...testState,
        levels: new Map([[1, blockedLevel]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
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

    test('fizzles when all adjacent tiles occupied by monsters', () => {
      // Create monsters in all 8 adjacent positions
      const adjacentMonsters = [
        { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 },
        { x: 4, y: 5 },                { x: 6, y: 5 },
        { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      ].map((pos, i) => ({
        id: `monster-${i}`,
        letter: 'K',
        name: 'Kobold',
        position: pos,
        hp: 5,
        maxHp: 5,
      })) as any[]

      const crowdedLevel = {
        ...testLevel,
        monsters: adjacentMonsters,
      }

      const crowdedState = {
        ...testState,
        levels: new Map([[1, crowdedLevel]]),
      }

      const scroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Create Monster',
        scrollType: ScrollType.CREATE_MONSTER,
        effect: 'Creates a monster',
        labelName: 'scroll labeled ABRACADABRA',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        scroll,
        crowdedState
      )

      expect(result.fizzled).toBe(true)
      expect(result.consumed).toBe(false)
      expect(result.message).toContain('nothing happens')
    })
  })
})
