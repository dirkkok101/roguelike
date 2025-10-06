import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom, SeededRandom } from '@services/RandomService'
import { Room, Tile, TileType } from '@game/core/core'

describe('MonsterSpawnService - Spawn Logic', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)
    originalFetch = global.fetch

    // Mock fetch for tests that call loadMonsterData()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          letter: 'K',
          name: 'Kobold',
          hp: '1d8',
          ac: 7,
          damage: '1d4',
          xpValue: 5,
          level: 1,
          speed: 10,
          rarity: 'common',
          mean: false,
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
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  // ============================================================================
  // TEST HELPERS
  // ============================================================================

  function createTestRoom(id: number, x: number, y: number, width: number, height: number): Room {
    return { id, x, y, width, height }
  }

  function createTestTiles(width: number, height: number): Tile[][] {
    const tiles: Tile[][] = []
    for (let y = 0; y < height; y++) {
      tiles[y] = []
      for (let x = 0; x < width; x++) {
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

  // ============================================================================
  // TESTS
  // ============================================================================

  describe('getSpawnCount()', () => {
    it('should return 5 monsters for depth 1', () => {
      const count = service.getSpawnCount(1)
      expect(count).toBe(5) // (1 * 2) + 3 = 5
    })

    it('should return 13 monsters for depth 5', () => {
      const count = service.getSpawnCount(5)
      expect(count).toBe(13) // (5 * 2) + 3 = 13
    })

    it('should return 20 monsters for depth 10', () => {
      const count = service.getSpawnCount(10)
      expect(count).toBe(20) // (10 * 2) + 3 = 23, capped at 20
    })

    it('should cap at 20 monsters maximum', () => {
      const count15 = service.getSpawnCount(15)
      const count20 = service.getSpawnCount(20)
      const count100 = service.getSpawnCount(100)

      expect(count15).toBe(20) // (15 * 2) + 3 = 33, capped
      expect(count20).toBe(20) // (20 * 2) + 3 = 43, capped
      expect(count100).toBe(20) // (100 * 2) + 3 = 203, capped
    })

    it('should handle depth 0 gracefully', () => {
      const count = service.getSpawnCount(0)
      expect(count).toBe(3) // (0 * 2) + 3 = 3
    })
  })

  describe('spawnMonsters()', () => {
    it('should spawn correct number of monsters', async () => {
      // Use SeededRandom for integration tests
      const seededRandom = new SeededRandom('test-spawn-count')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [createTestRoom(0, 5, 5, 10, 10)]
      const tiles = createTestTiles(20, 20)

      const monsters = integrationService.spawnMonsters(rooms, tiles, 1)

      // Should spawn 5 monsters for depth 1 (or fewer if placement fails)
      const expectedCount = integrationService.getSpawnCount(1)
      expect(monsters.length).toBeLessThanOrEqual(expectedCount)
      expect(monsters.length).toBeGreaterThan(0)
    })

    it('should place monsters in valid room positions', async () => {
      const seededRandom = new SeededRandom('test-spawn-position')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const room = createTestRoom(0, 5, 5, 10, 10)
      const rooms = [room]
      const tiles = createTestTiles(20, 20)

      const monsters = integrationService.spawnMonsters(rooms, tiles, 1)

      // All monsters should be within room bounds (not on walls)
      for (const monster of monsters) {
        expect(monster.position.x).toBeGreaterThan(room.x)
        expect(monster.position.x).toBeLessThan(room.x + room.width - 1)
        expect(monster.position.y).toBeGreaterThan(room.y)
        expect(monster.position.y).toBeLessThan(room.y + room.height - 1)
      }
    })

    it('should not place monsters in same position (no overlaps)', async () => {
      const seededRandom = new SeededRandom('test-spawn-overlap')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [
        createTestRoom(0, 5, 5, 10, 10),
        createTestRoom(1, 20, 5, 10, 10),
      ]
      const tiles = createTestTiles(40, 20)

      const monsters = integrationService.spawnMonsters(rooms, tiles, 5)

      // Create set of positions to check for duplicates
      const positions = new Set<string>()

      for (const monster of monsters) {
        const key = `${monster.position.x},${monster.position.y}`
        expect(positions.has(key)).toBe(false) // No duplicate positions
        positions.add(key)
      }
    })

    it('should only place monsters on walkable tiles', async () => {
      const seededRandom = new SeededRandom('test-spawn-walkable')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [createTestRoom(0, 5, 5, 10, 10)]
      const tiles = createTestTiles(20, 20)

      // Mark some tiles as non-walkable
      tiles[7][7].walkable = false
      tiles[8][8].walkable = false

      const monsters = integrationService.spawnMonsters(rooms, tiles, 1)

      // All monsters should be on walkable tiles
      for (const monster of monsters) {
        const tile = tiles[monster.position.y][monster.position.x]
        expect(tile.walkable).toBe(true)
      }
    })
  })
})
