import { DungeonService } from '@services/DungeonService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { SeededRandom } from '@services/RandomService'
import { mockItemData, mockGuaranteeConfig } from '@/test-utils'

// Mock fetch globally for these tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(require('../../public/data/monsters.json')),
  })
) as jest.Mock

/**
 * Integration Tests: DungeonService + MonsterSpawnService
 *
 * Tests the full integration of monster spawning during dungeon generation.
 * Verifies:
 * - Correct spawn counts per depth
 * - Valid monster placement (rooms, walkable tiles)
 * - Speed variety from template data
 * - Level-appropriate monster selection
 * - No position overlaps
 */
describe('Integration: Monster Spawning', () => {
  let dungeonService: DungeonService
  let monsterSpawnService: MonsterSpawnService
  let random: SeededRandom

  const config = {
    width: 80,
    height: 22,
    minRooms: 4,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    minSpacing: 2,
    loopChance: 0.25,
  }

  beforeEach(async () => {
    random = new SeededRandom('integration-test-seed')
    monsterSpawnService = new MonsterSpawnService(random)
    await monsterSpawnService.loadMonsterData()
    dungeonService = new DungeonService(random, monsterSpawnService, mockItemData, mockGuaranteeConfig)
  })

  describe('Monster Count Scaling', () => {
    it('should spawn 5 monsters at depth 1', () => {
      const level = dungeonService.generateLevel(1, config)
      const expectedCount = monsterSpawnService.getSpawnCount(1)

      expect(expectedCount).toBe(5) // Verify formula: (1 * 2) + 3 = 5
      expect(level.monsters.length).toBeLessThanOrEqual(expectedCount)
      expect(level.monsters.length).toBeGreaterThan(0)
    })

    it('should spawn 13 monsters at depth 5', () => {
      const level = dungeonService.generateLevel(5, config)
      const expectedCount = monsterSpawnService.getSpawnCount(5)

      expect(expectedCount).toBe(13) // Verify formula: (5 * 2) + 3 = 13
      expect(level.monsters.length).toBeLessThanOrEqual(expectedCount)
      expect(level.monsters.length).toBeGreaterThan(0)
    })

    it('should spawn 20 monsters at depth 10 (capped)', () => {
      const level = dungeonService.generateLevel(10, config)
      const expectedCount = monsterSpawnService.getSpawnCount(10)

      expect(expectedCount).toBe(20) // Verify cap: min((10 * 2) + 3, 20) = 20
      expect(level.monsters.length).toBeLessThanOrEqual(expectedCount)
      expect(level.monsters.length).toBeGreaterThan(0)
    })
  })

  describe('Valid Monster Placement', () => {
    it('should place all monsters inside rooms', () => {
      const level = dungeonService.generateLevel(5, config)

      for (const monster of level.monsters) {
        // Check if monster is in at least one room
        const inRoom = level.rooms.some((room) => {
          const inX =
            monster.position.x > room.x && monster.position.x < room.x + room.width - 1
          const inY =
            monster.position.y > room.y && monster.position.y < room.y + room.height - 1
          return inX && inY
        })

        expect(inRoom).toBe(true)
      }
    })

    it('should place all monsters on walkable tiles', () => {
      const level = dungeonService.generateLevel(5, config)

      for (const monster of level.monsters) {
        const tile = level.tiles[monster.position.y][monster.position.x]
        expect(tile.walkable).toBe(true)
      }
    })

    it('should not place monsters in same position (no overlaps)', () => {
      const level = dungeonService.generateLevel(5, config)

      const positions = new Set<string>()

      for (const monster of level.monsters) {
        const key = `${monster.position.x},${monster.position.y}`
        expect(positions.has(key)).toBe(false) // No duplicate positions
        positions.add(key)
      }

      expect(positions.size).toBe(level.monsters.length)
    })
  })

  describe('Monster Speed Variety', () => {
    it('should spawn monsters with varied speeds (not all 10)', () => {
      const level = dungeonService.generateLevel(5, config)

      // Collect all unique speeds
      const speeds = new Set(level.monsters.map((m) => m.speed))

      // Should have variety (multiple different speeds)
      // Note: This may fail with very small sample sizes or unlucky RNG
      expect(speeds.size).toBeGreaterThan(1)
    })

    it('should have speed values from template data (5-18 range)', () => {
      const level = dungeonService.generateLevel(10, config)

      // All speeds should be within valid range from templates
      for (const monster of level.monsters) {
        expect(monster.speed).toBeGreaterThanOrEqual(5) // Slowest: Zombie
        expect(monster.speed).toBeLessThanOrEqual(18) // Fastest: Dragon
      }
    })
  })

  describe('Level-Appropriate Monster Selection', () => {
    it('should spawn only low-level monsters at depth 1', () => {
      const level = dungeonService.generateLevel(1, config)

      // Depth 1 allows monsters up to level 3 (depth + 2)
      for (const monster of level.monsters) {
        expect(monster.level).toBeLessThanOrEqual(3)
      }
    })

    it('should spawn mix of monsters at depth 5', () => {
      const level = dungeonService.generateLevel(5, config)

      // Depth 5 allows monsters up to level 7 (depth + 2)
      for (const monster of level.monsters) {
        expect(monster.level).toBeGreaterThanOrEqual(1)
        expect(monster.level).toBeLessThanOrEqual(7)
      }

      // Should have some variety in levels
      const levels = new Set(level.monsters.map((m) => m.level))
      expect(levels.size).toBeGreaterThan(1)
    })

    it('should spawn high-level monsters (Dragons) only at depth 9-10', () => {
      // Depth 8 should NOT have level 10 monsters
      const level8 = dungeonService.generateLevel(8, config)
      const hasLevel10_depth8 = level8.monsters.some((m) => m.level === 10)
      expect(hasLevel10_depth8).toBe(false)

      // Depth 10 MAY have level 10 monsters (if RNG selects them)
      const level10 = dungeonService.generateLevel(10, config)

      // At least verify level 10 monsters are allowed at depth 10
      // (they won't always spawn due to weighted randomness)
      for (const monster of level10.monsters) {
        expect(monster.level).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('Monster Initialization', () => {
    it('should initialize monsters with HP from template dice rolls', () => {
      const level = dungeonService.generateLevel(5, config)

      for (const monster of level.monsters) {
        expect(monster.hp).toBeGreaterThan(0)
        expect(monster.maxHp).toBeGreaterThan(0)
        expect(monster.hp).toBe(monster.maxHp) // Newly spawned at full HP
      }
    })

    it('should set mean monsters to awake/hunting state', () => {
      const level = dungeonService.generateLevel(5, config)

      // Find at least one mean monster
      const meanMonsters = level.monsters.filter((m) => m.isAwake)

      if (meanMonsters.length > 0) {
        for (const monster of meanMonsters) {
          expect(monster.isAwake).toBe(true)
          expect(monster.isAsleep).toBe(false)
          expect(monster.state).toBe('HUNTING')
        }
      }
    })

    it('should set non-mean monsters to asleep state', () => {
      const level = dungeonService.generateLevel(5, config)

      // Find at least one non-mean monster
      const sleepingMonsters = level.monsters.filter((m) => m.isAsleep)

      if (sleepingMonsters.length > 0) {
        for (const monster of sleepingMonsters) {
          expect(monster.isAwake).toBe(false)
          expect(monster.isAsleep).toBe(true)
          expect(monster.state).toBe('SLEEPING')
        }
      }
    })

    it('should initialize energy between 0-99', () => {
      const level = dungeonService.generateLevel(5, config)

      for (const monster of level.monsters) {
        expect(monster.energy).toBeGreaterThanOrEqual(0)
        expect(monster.energy).toBeLessThan(100)
      }
    })
  })
})
