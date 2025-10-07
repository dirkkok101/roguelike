import { DungeonService } from './DungeonService'
import { SeededRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { TileType } from '@game/core/core'

describe('DungeonService - Gold Spawning', () => {
  const seed = 'gold-test-seed'
  const random = new SeededRandom(seed)

  // Mock MonsterSpawnService
  const mockMonsterSpawnService = {
    loadMonsterData: jest.fn().mockResolvedValue(undefined),
    spawnMonsters: jest.fn().mockReturnValue([]),
    getSpawnCount: jest.fn().mockReturnValue(5),
  } as unknown as MonsterSpawnService

  const service = new DungeonService(random, mockMonsterSpawnService)

  const defaultConfig = {
    width: 80,
    height: 25,
    minRooms: 6,
    maxRooms: 9,
    minRoomSize: 4,
    maxRoomSize: 10,
    minSpacing: 1,
    loopChance: 0.3,
  }

  describe('Gold pile generation', () => {
    test('spawns 3-9 gold piles per level', () => {
      const level = service.generateLevel(1, defaultConfig)

      expect(level.gold.length).toBeGreaterThanOrEqual(3)
      expect(level.gold.length).toBeLessThanOrEqual(9)
    })

    test('gold piles have valid positions in rooms', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        const tile = level.tiles[pile.position.y]?.[pile.position.x]

        expect(tile).toBeDefined()
        expect(tile.walkable).toBe(true)
        expect(tile.type).toBe(TileType.FLOOR)
      })
    })

    test('gold amounts scale with dungeon depth', () => {
      const level1 = service.generateLevel(1, defaultConfig)
      const level5 = service.generateLevel(5, defaultConfig)
      const level10 = service.generateLevel(10, defaultConfig)

      // Calculate average gold amounts
      const avg1 = level1.gold.reduce((sum, g) => sum + g.amount, 0) / level1.gold.length
      const avg5 = level5.gold.reduce((sum, g) => sum + g.amount, 0) / level5.gold.length
      const avg10 = level10.gold.reduce((sum, g) => sum + g.amount, 0) / level10.gold.length

      // Level 10 should have higher average than Level 1
      expect(avg10).toBeGreaterThan(avg1)
      expect(avg5).toBeGreaterThan(avg1)
    })

    test('gold piles not placed on walls', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        const tile = level.tiles[pile.position.y][pile.position.x]
        expect(tile.type).not.toBe(TileType.WALL)
      })
    })

    test('gold piles not placed on doors', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        const tile = level.tiles[pile.position.y][pile.position.x]
        expect(tile.type).not.toBe(TileType.DOOR)
      })
    })

    test('no duplicate gold piles at same position', () => {
      const level = service.generateLevel(1, defaultConfig)

      const positions = new Set<string>()
      level.gold.forEach(pile => {
        const key = `${pile.position.x},${pile.position.y}`
        expect(positions.has(key)).toBe(false) // No duplicates
        positions.add(key)
      })
    })
  })

  describe('Gold amount calculation', () => {
    test('Level 1: all gold amounts in valid range (2-61)', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile.amount).toBeGreaterThanOrEqual(2)
        expect(pile.amount).toBeLessThanOrEqual(61)
      })
    })

    test('Level 5: all gold amounts in valid range (2-101)', () => {
      const level = service.generateLevel(5, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile.amount).toBeGreaterThanOrEqual(2)
        expect(pile.amount).toBeLessThanOrEqual(101)
      })
    })

    test('Level 10: all gold amounts in valid range (2-151)', () => {
      const level = service.generateLevel(10, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile.amount).toBeGreaterThanOrEqual(2)
        expect(pile.amount).toBeLessThanOrEqual(151)
      })
    })

    test('gold amounts are always at least 2', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile.amount).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Gold pile structure', () => {
    test('each gold pile has position and amount', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile).toHaveProperty('position')
        expect(pile).toHaveProperty('amount')
        expect(typeof pile.position.x).toBe('number')
        expect(typeof pile.position.y).toBe('number')
        expect(typeof pile.amount).toBe('number')
        expect(pile.amount).toBeGreaterThan(0)
      })
    })

    test('position coordinates are within level bounds', () => {
      const level = service.generateLevel(1, defaultConfig)

      level.gold.forEach(pile => {
        expect(pile.position.x).toBeGreaterThanOrEqual(0)
        expect(pile.position.x).toBeLessThan(level.width)
        expect(pile.position.y).toBeGreaterThanOrEqual(0)
        expect(pile.position.y).toBeLessThan(level.height)
      })
    })
  })

  describe('Integration with level generation', () => {
    test('level includes gold array', () => {
      const level = service.generateLevel(1, defaultConfig)

      expect(level).toHaveProperty('gold')
      expect(Array.isArray(level.gold)).toBe(true)
    })

    test('gold spawns alongside monsters and items', () => {
      const level = service.generateLevel(5, defaultConfig)

      expect(level.gold.length).toBeGreaterThan(0)
      expect(level.items.length).toBeGreaterThan(0)
      // Note: monsters mock returns []
    })

    test('multiple levels each have independent gold', () => {
      const level1 = service.generateLevel(1, defaultConfig)
      const level2 = service.generateLevel(1, defaultConfig)

      expect(level1.gold).not.toBe(level2.gold) // Different arrays
    })

    test('gold spawns on Level 10 (amulet level)', () => {
      const level = service.generateLevel(10, defaultConfig)

      expect(level.gold.length).toBeGreaterThan(0)
    })
  })

  describe('GOLDCALC formula verification', () => {
    test('formula matches Rogue 1980: rnd(50 + 10 * depth) + 2', () => {
      // Generate multiple levels and verify formula bounds
      for (let depth = 1; depth <= 10; depth++) {
        const level = service.generateLevel(depth, defaultConfig)

        const min = 2
        const max = 50 + 10 * depth + 2

        level.gold.forEach(pile => {
          expect(pile.amount).toBeGreaterThanOrEqual(min)
          expect(pile.amount).toBeLessThanOrEqual(max)
        })
      }
    })
  })
})
