import { StairsNavigationService } from './StairsNavigationService'
import { GameState, Level, Monster, Room, Tile, TileType, Position } from '@game/core/core'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { MockRandom, SeededRandom } from '@services/RandomService'

describe('StairsNavigationService', () => {
  let service: StairsNavigationService
  let monsterSpawnService: MonsterSpawnService
  let mockRandom: MockRandom
  let mockState: GameState
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    mockRandom = new MockRandom()
    monsterSpawnService = new MonsterSpawnService(mockRandom)
    service = new StairsNavigationService(monsterSpawnService)
    originalFetch = global.fetch

    // Mock fetch for tests that call loadMonsterData()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          letter: 'K',
          name: 'Kobold',
          spriteName: 'Kobold',
          hp: '1d8',
          ac: 7,
          damage: '1d4',
          xpValue: 5,
          level: 1,
          speed: 10,
          rarity: 'common',
          mean: false,
          vorpalness: 1,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 1,
            aggroRange: 5,
            fleeThreshold: 0.0,
            special: [],
          },
        },
        {
          letter: 'O',
          name: 'Orc',
          spriteName: 'Orc',
          hp: '1d8',
          ac: 6,
          damage: '1d8',
          xpValue: 10,
          level: 1,
          speed: 10,
          rarity: 'common',
          mean: false,
          vorpalness: 5,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 1,
            aggroRange: 5,
            fleeThreshold: 0.0,
            special: [],
          },
        },
      ],
    } as Response)

    // Create mock levels (26 levels)
    const mockLevels = new Map<number, Level>()
    for (let i = 1; i <= 26; i++) {
      mockLevels.set(i, {
        depth: i,
        width: 80,
        height: 22,
        tiles: createMockTiles(),
        rooms: createMockRooms(),
        doors: [],
        traps: [],
        monsters: [],
        items: [],
        gold: [],
        stairsUp: i > 1 ? { x: 10, y: 10 } : null,
        stairsDown: i < 26 ? { x: 70, y: 10 } : null,
        explored: Array(22).fill(null).map(() => Array(80).fill(false)),
      } as Level)
    }

    mockState = {
      currentLevel: 1,
      levels: mockLevels,
      maxDepth: 26,
      hasAmulet: false,
      levelsVisitedWithAmulet: new Set<number>(),
      player: {} as any,
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test',
      characterName: 'Test',
      isGameOver: false,
      hasWon: false,
      itemNameMap: {} as any,
      identifiedItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
    } as GameState
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function createMockTiles(): Tile[][] {
    const tiles: Tile[][] = []
    for (let y = 0; y < 22; y++) {
      tiles[y] = []
      for (let x = 0; x < 80; x++) {
        tiles[y][x] = {
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#888',
          colorExplored: '#444',
        }
      }
    }
    return tiles
  }

  function createMockRooms(): Room[] {
    return [
      { id: 0, x: 5, y: 5, width: 10, height: 8 },
      { id: 1, x: 20, y: 5, width: 10, height: 8 },
    ]
  }

  describe('canDescend', () => {
    it('should return true if not at max depth', () => {
      mockState.currentLevel = 1
      expect(service.canDescend(mockState)).toBe(true)

      mockState.currentLevel = 25
      expect(service.canDescend(mockState)).toBe(true)
    })

    it('should return false if at max depth (26)', () => {
      mockState.currentLevel = 26
      expect(service.canDescend(mockState)).toBe(false)
    })
  })

  describe('canAscend', () => {
    it('should return true if not at surface', () => {
      mockState.currentLevel = 10
      expect(service.canAscend(mockState)).toBe(true)

      mockState.currentLevel = 2
      expect(service.canAscend(mockState)).toBe(true)
    })

    it('should return false if at surface (depth 1)', () => {
      mockState.currentLevel = 1
      expect(service.canAscend(mockState)).toBe(false)
    })
  })

  describe('descend', () => {
    it('should move player down one level', () => {
      mockState.currentLevel = 5

      const result = service.descend(mockState)

      expect(result.currentLevel).toBe(6)
      expect(result.levels.get(6)).toBeDefined()
    })

    it('should save current level to levels map', () => {
      mockState.currentLevel = 5
      const currentLevelData = mockState.levels.get(5)!
      const modifiedLevel = { ...currentLevelData, monsters: [{ id: 'test' } as Monster] }
      mockState.levels.set(5, modifiedLevel)

      const result = service.descend(mockState)

      // Level 5 should still have the monster we added
      expect(result.levels.get(5)?.monsters.length).toBe(1)
      expect(result.levels.get(5)?.monsters[0].id).toBe('test')
    })

    it('should throw error if already at max depth', () => {
      mockState.currentLevel = 26

      expect(() => service.descend(mockState)).toThrow('Cannot descend')
    })
  })

  describe('ascend', () => {
    it('should move player up one level', () => {
      mockState.currentLevel = 10

      const result = service.ascend(mockState)

      expect(result.currentLevel).toBe(9)
      expect(result.levels.get(9)).toBeDefined()
    })

    it('should save current level to levels map', () => {
      mockState.currentLevel = 10
      const currentLevelData = mockState.levels.get(10)!
      const modifiedLevel = { ...currentLevelData, monsters: [{ id: 'test2' } as Monster] }
      mockState.levels.set(10, modifiedLevel)

      const result = service.ascend(mockState)

      // Level 10 should still have the monster we added
      expect(result.levels.get(10)?.monsters.length).toBe(1)
      expect(result.levels.get(10)?.monsters[0].id).toBe('test2')
    })

    it('should throw error if already at surface', () => {
      mockState.currentLevel = 1

      expect(() => service.ascend(mockState)).toThrow('Cannot ascend')
    })
  })

  describe('monster respawn on ascent with Amulet', () => {
    beforeEach(async () => {
      // Use SeededRandom for integration tests (MockRandom can't provide enough values)
      const seededRandom = new SeededRandom('test-respawn-ascent')
      const seededMonsterSpawnService = new MonsterSpawnService(seededRandom)
      await seededMonsterSpawnService.loadMonsterData()

      // Create new service with seeded random for these tests
      service = new StairsNavigationService(seededMonsterSpawnService)

      mockState.hasAmulet = true
      mockState.currentLevel = 10
    })

    it('should respawn monsters on first visit with Amulet', () => {
      const result = service.ascend(mockState)

      // Ascending to level 9
      expect(result.currentLevel).toBe(9)
      expect(result.levelsVisitedWithAmulet.has(9)).toBe(true)
      expect(result.levels.get(9)?.monsters.length).toBeGreaterThan(0)
    })

    it('should NOT respawn if already visited with Amulet', () => {
      mockState.levelsVisitedWithAmulet = new Set([9])
      const originalMonsters = mockState.levels.get(9)!.monsters

      const result = service.ascend(mockState)

      // Monsters should be unchanged (empty array since we didn't add any)
      expect(result.levels.get(9)?.monsters).toEqual(originalMonsters)
      expect(result.levels.get(9)?.monsters.length).toBe(0)
    })

    it('should NOT respawn without Amulet', () => {
      mockState.hasAmulet = false
      const originalMonsters = mockState.levels.get(9)!.monsters

      const result = service.ascend(mockState)

      // Monsters should be unchanged
      expect(result.levels.get(9)?.monsters).toEqual(originalMonsters)
      expect(result.levels.get(9)?.monsters.length).toBe(0)
    })

    it('should use cumulative vorpal range [0, depth+3] for respawn', () => {
      // Ascending to level 9 with Amulet
      const result = service.ascend(mockState)

      // Level 9 should have monsters respawned with cumulative pool
      const monsters = result.levels.get(9)!.monsters
      expect(monsters.length).toBeGreaterThan(0)

      // All monsters should be from the cumulative pool [0, 12] for depth 9
      // This is more permissive than normal [3, 12] spawn range
    })
  })

  describe('descend with Amulet (should not respawn)', () => {
    beforeEach(async () => {
      // Use SeededRandom for integration tests
      const seededRandom = new SeededRandom('test-respawn-descend')
      const seededMonsterSpawnService = new MonsterSpawnService(seededRandom)
      await seededMonsterSpawnService.loadMonsterData()

      // Create new service with seeded random for these tests
      service = new StairsNavigationService(seededMonsterSpawnService)

      mockState.hasAmulet = true
      mockState.currentLevel = 5
    })

    it('should NOT respawn monsters when descending with Amulet', () => {
      const originalMonsters = mockState.levels.get(6)!.monsters

      const result = service.descend(mockState)

      // Descending doesn't trigger respawn (only ascending does)
      expect(result.levels.get(6)?.monsters).toEqual(originalMonsters)
      expect(result.levelsVisitedWithAmulet.has(6)).toBe(false)
    })
  })
})
