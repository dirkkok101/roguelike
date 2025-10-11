import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { SeededRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { mockItemData } from '@/test-utils'

describe('DungeonService - Generate All Levels', () => {
  let service: DungeonService
  let random: SeededRandom
  let monsterSpawnService: MonsterSpawnService
  let config: DungeonConfig

  beforeEach(() => {
    random = new SeededRandom('test-seed')

    // Mock MonsterSpawnService
    const mockMonsterSpawnService = {
      loadMonsterData: jest.fn().mockResolvedValue(undefined),
      spawnMonsters: jest.fn().mockReturnValue([]),
      getSpawnCount: jest.fn().mockReturnValue(5),
    } as unknown as MonsterSpawnService

    monsterSpawnService = mockMonsterSpawnService
    service = new DungeonService(random, monsterSpawnService, mockItemData)

    // Standard dungeon configuration
    config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 4,
      maxRoomSize: 10,
      minSpacing: 1,
      loopChance: 0.3
    }
  })

  test('should generate exactly 26 levels', () => {
    // Act
    const levels = service.generateAllLevels(config)

    // Assert
    expect(levels).toHaveLength(26)
    expect(levels.every(level => level !== null)).toBe(true)
  })

  test('should generate levels with increasing depth numbers (1-26)', () => {
    // Act
    const levels = service.generateAllLevels(config)

    // Assert
    levels.forEach((level, index) => {
      expect(level.depth).toBe(index + 1)
    })
  })

  test('should generate connected levels with stairs (up stairs on 2-26, down stairs on 1-25)', () => {
    // Act
    const levels = service.generateAllLevels(config)

    // Assert
    levels.forEach((level, index) => {
      const depth = index + 1

      if (depth === 1) {
        // Level 1: only down stairs
        expect(level.stairsUp).toBeNull()
        expect(level.stairsDown).not.toBeNull()
      } else if (depth === 26) {
        // Level 26: only up stairs
        expect(level.stairsUp).not.toBeNull()
        expect(level.stairsDown).toBeNull()
      } else {
        // Levels 2-25: both stairs
        expect(level.stairsUp).not.toBeNull()
        expect(level.stairsDown).not.toBeNull()
      }
    })
  })
})
