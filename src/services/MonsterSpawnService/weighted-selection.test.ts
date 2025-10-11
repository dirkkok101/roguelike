import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom, SeededRandom } from '@services/RandomService'
import { Room, Tile, TileType } from '@game/core/core'

describe('MonsterSpawnService - Weighted Selection', () => {
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
          hp: '2d8',
          ac: 6,
          damage: '1d6',
          xpValue: 10,
          level: 3,
          speed: 10,
          rarity: 'common',
          mean: true,
          vorpalness: 7,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 2,
            aggroRange: 6,
            fleeThreshold: 0.0,
            special: [],
          },
        },
        {
          letter: 'T',
          name: 'Troll',
      spriteName: 'Troll',
          hp: '5d8',
          ac: 4,
          damage: '2d6',
          xpValue: 100,
          level: 5,
          speed: 7,
          rarity: 'uncommon',
          mean: true,
          vorpalness: 18,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 3,
            aggroRange: 7,
            fleeThreshold: 0.0,
            special: [],
          },
        },
        {
          letter: 'D',
          name: 'Dragon',
      spriteName: 'Dragon',
          hp: '10d10',
          ac: 3,
          damage: '3d10',
          xpValue: 5000,
          level: 10,
          speed: 18,
          rarity: 'rare',
          mean: true,
          vorpalness: 24,
          aiProfile: {
            behavior: 'SMART',
            intelligence: 10,
            aggroRange: 8,
            fleeThreshold: 0.1,
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

  describe('Vorpal Range Filtering', () => {
    it('should filter monsters within vorpal range [0, 4] for depth 1', async () => {
      // Load monster data
      await service.loadMonsterData()

      // Depth 1: vorpal range [max(0, 1-6), min(25, 1+3)] = [0, 4]
      const filtered = service.filterByVorpalRange(0, 4)

      // Should include Kobold (vorpalness 1) but not Orc (7), Troll (18), Dragon (24)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.some(t => t.name === 'Kobold')).toBe(true)
      expect(filtered.some(t => t.name === 'Orc')).toBe(false)
      expect(filtered.some(t => t.name === 'Troll')).toBe(false)
      expect(filtered.some(t => t.name === 'Dragon')).toBe(false)
    })

    it('should filter monsters within vorpal range [0, 8] for depth 5', async () => {
      await service.loadMonsterData()

      // Depth 5: vorpal range [max(0, 5-6), min(25, 5+3)] = [0, 8]
      const filtered = service.filterByVorpalRange(0, 8)

      // Should include Kobold (1) and Orc (7), but not Troll (18) or Dragon (24)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.some(t => t.name === 'Kobold')).toBe(true)
      expect(filtered.some(t => t.name === 'Orc')).toBe(true)
      expect(filtered.some(t => t.name === 'Troll')).toBe(false)
      expect(filtered.some(t => t.name === 'Dragon')).toBe(false)
    })

    it('should filter all monsters for deep levels with vorpal range [4, 13]', async () => {
      await service.loadMonsterData()

      // Depth 10: vorpal range [max(0, 10-6), min(25, 10+3)] = [4, 13]
      const filtered = service.filterByVorpalRange(4, 13)

      // Should include Orc (7), but not Kobold (1), Troll (18), or Dragon (24)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.some(t => t.name === 'Kobold')).toBe(false) // vorpalness 1 < 4
      expect(filtered.some(t => t.name === 'Orc')).toBe(true)     // vorpalness 7
      expect(filtered.some(t => t.name === 'Troll')).toBe(false)  // vorpalness 18 > 13
      expect(filtered.some(t => t.name === 'Dragon')).toBe(false) // vorpalness 24 > 13
    })
  })

  describe('Rarity Weighting', () => {
    it('should select common monsters with weight 5', () => {
      // Create test templates with different rarities
      const templates = [
        { rarity: 'common', name: 'Common1' },
        { rarity: 'uncommon', name: 'Uncommon1' },
        { rarity: 'rare', name: 'Rare1' },
      ] as any[]

      // Mock nextInt to return 5 (which should select common: weight 5, range 1-5)
      mockRandom.setValues([5])

      const selected = (service as any).selectWeightedMonster(templates)

      // Should select first template (common) because cumulative weight 5 >= random 5
      expect(selected.rarity).toBe('common')
    })

    it('should select uncommon monsters with weight 3', () => {
      const templates = [
        { rarity: 'common', name: 'Common1' },
        { rarity: 'uncommon', name: 'Uncommon1' },
        { rarity: 'rare', name: 'Rare1' },
      ] as any[]

      // Mock nextInt to return 7 (common=1-5, uncommon=6-8, rare=9-10)
      mockRandom.setValues([7])

      const selected = (service as any).selectWeightedMonster(templates)

      // Should select uncommon (cumulative weight after common=5, uncommon=8)
      expect(selected.rarity).toBe('uncommon')
    })

    it('should select rare monsters with weight 2', () => {
      const templates = [
        { rarity: 'common', name: 'Common1' },
        { rarity: 'uncommon', name: 'Uncommon1' },
        { rarity: 'rare', name: 'Rare1' },
      ] as any[]

      // Mock nextInt to return 10 (rare range: 9-10)
      mockRandom.setValues([10])

      const selected = (service as any).selectWeightedMonster(templates)

      // Should select rare (cumulative weight: common=5, uncommon=8, rare=10)
      expect(selected.rarity).toBe('rare')
    })
  })

  describe('Vorpal Boss Monster Filtering', () => {
    it('should not spawn Dragon (vorpalness 24) on early depths', async () => {
      await service.loadMonsterData()

      // Test depths where Dragon (vorpalness 24) should NOT appear
      // Dragon only appears when depth+3 >= 24, so depth >= 21
      for (let depth = 1; depth <= 20; depth++) {
        const minVorpal = Math.max(0, depth - 6)
        const maxVorpal = Math.min(25, depth + 3)
        const filtered = service.filterByVorpalRange(minVorpal, maxVorpal)

        // Should not include Dragon (vorpalness 24)
        const hasDragon = filtered.some((t: any) => t.name === 'Dragon')
        expect(hasDragon).toBe(false)
      }
    })

    it('should spawn Dragon on deep levels (depth >= 21)', async () => {
      await service.loadMonsterData()

      // Test depths where Dragon (vorpalness 24) should appear
      // Dragon appears when maxVorpal >= 24, which means depth+3 >= 24, so depth >= 21
      for (let depth = 21; depth <= 26; depth++) {
        const minVorpal = Math.max(0, depth - 6)
        const maxVorpal = Math.min(25, depth + 3)
        const filtered = service.filterByVorpalRange(minVorpal, maxVorpal)

        // Should include Dragon (vorpalness 24) as long as minVorpal <= 24
        if (minVorpal <= 24) {
          const hasDragon = filtered.some((t: any) => t.name === 'Dragon')
          expect(hasDragon).toBe(true)
        }
      }
    })
  })

  describe('Integration: Spawn Distribution', () => {
    it('should spawn monsters with vorpal range [0, 4] on depth 1', async () => {
      // Use SeededRandom for integration tests (provides many random values)
      const seededRandom = new SeededRandom('test-seed-1')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [createTestRoom(0, 5, 5, 10, 10)]
      const tiles = createTestTiles(20, 20)

      // Spawn monsters multiple times to check distribution
      const monsters = integrationService.spawnMonsters(rooms, tiles, 1)

      // Depth 1 vorpal range is [0, 4], so only Kobold (vorpalness 1) should spawn
      // from our mock data
      expect(monsters.length).toBeGreaterThan(0)
      for (const monster of monsters) {
        expect(monster.name).toBe('Kobold')
      }

      // Should spawn expected count for depth 1
      const expectedCount = integrationService.getSpawnCount(1)
      expect(monsters.length).toBeLessThanOrEqual(expectedCount)
    })

    it('should spawn mix of monsters with vorpal range [0, 8] on depth 5', async () => {
      const seededRandom = new SeededRandom('test-seed-5')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [
        createTestRoom(0, 5, 5, 10, 10),
        createTestRoom(1, 20, 5, 10, 10),
      ]
      const tiles = createTestTiles(40, 20)

      const monsters = integrationService.spawnMonsters(rooms, tiles, 5)

      // Depth 5 vorpal range is [0, 8], so Kobold (1) and Orc (7) should be possible
      expect(monsters.length).toBeGreaterThan(0)
      for (const monster of monsters) {
        expect(['Kobold', 'Orc']).toContain(monster.name)
      }

      // Should have variety if enough spawns
      const expectedCount = integrationService.getSpawnCount(5)
      expect(monsters.length).toBeLessThanOrEqual(expectedCount)
    })

    it('should spawn mid-tier monsters with vorpal range [4, 13] on depth 10', async () => {
      const seededRandom = new SeededRandom('test-seed-10')
      const integrationService = new MonsterSpawnService(seededRandom)
      await integrationService.loadMonsterData()

      const rooms = [
        createTestRoom(0, 5, 5, 10, 10),
        createTestRoom(1, 20, 5, 10, 10),
        createTestRoom(2, 35, 5, 10, 10),
      ]
      const tiles = createTestTiles(50, 20)

      const monsters = integrationService.spawnMonsters(rooms, tiles, 10)

      // Depth 10 vorpal range is [4, 13], so only Orc (vorpalness 7) from our mock data
      expect(monsters.length).toBeGreaterThan(0)
      for (const monster of monsters) {
        expect(monster.name).toBe('Orc') // Only Orc has vorpalness in [4, 13]
      }

      // Should spawn full count for depth 10
      const expectedCount = integrationService.getSpawnCount(10)
      expect(monsters.length).toBeLessThanOrEqual(expectedCount)
    })
  })
})
