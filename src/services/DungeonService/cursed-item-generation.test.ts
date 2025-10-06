import { DungeonService, DungeonConfig } from './DungeonService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemType, RingType } from '@game/core/core'

// ============================================================================
// DUNGEON SERVICE - Cursed Item Generation Tests
// ============================================================================

describe('DungeonService - Cursed Item Generation', () => {
  let mockRandom: MockRandom
  let dungeonService: DungeonService

  // Mock MonsterSpawnService
  const mockMonsterSpawnService = {
    loadMonsterData: jest.fn().mockResolvedValue(undefined),
    spawnMonsters: jest.fn().mockReturnValue([]),
    getSpawnCount: jest.fn().mockReturnValue(0), // No monsters for item tests
  } as unknown as MonsterSpawnService

  const defaultConfig: DungeonConfig = {
    width: 80,
    height: 22,
    minRooms: 6,
    maxRooms: 6,
    minRoomSize: 5,
    maxRoomSize: 5,
    minSpacing: 2,
    loopChance: 0.0,
  }

  beforeEach(() => {
    mockRandom = new MockRandom()
    dungeonService = new DungeonService(mockRandom, mockMonsterSpawnService)
  })

  // ==========================================================================
  // Curse Generation Helper Methods Tests
  // ==========================================================================

  describe('rollCursedStatus', () => {
    test('common items have 5% curse chance - returns true when chance succeeds', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      // Set random to return 1 for chance (true)
      mockRandom.setValues([1])
      expect(method('common')).toBe(true)
    })

    test('common items have 5% curse chance - returns false when chance fails', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      // Set random to return 0 for chance (false)
      mockRandom.setValues([0])
      expect(method('common')).toBe(false)
    })

    test('uncommon items have 8% curse chance - returns true when chance succeeds', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      mockRandom.setValues([1])
      expect(method('uncommon')).toBe(true)
    })

    test('uncommon items have 8% curse chance - returns false when chance fails', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      mockRandom.setValues([0])
      expect(method('uncommon')).toBe(false)
    })

    test('rare items have 12% curse chance - returns true when chance succeeds', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      mockRandom.setValues([1])
      expect(method('rare')).toBe(true)
    })

    test('rare items have 12% curse chance - returns false when chance fails', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollCursedStatus.bind(dungeonService)

      mockRandom.setValues([0])
      expect(method('rare')).toBe(false)
    })
  })

  describe('rollEnchantment', () => {
    test('cursed items get negative enchantment -1', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      // nextInt(1, 3) returns the value from setValues
      mockRandom.setValues([1])
      expect(method('common', true)).toBe(-1)
    })

    test('cursed items get negative enchantment -2', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      mockRandom.setValues([2])
      expect(method('common', true)).toBe(-2)
    })

    test('cursed items get negative enchantment -3', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      mockRandom.setValues([3])
      expect(method('common', true)).toBe(-3)
    })

    test('rare non-cursed items get positive enchantment +1', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      mockRandom.setValues([1])
      expect(method('rare', false)).toBe(1)
    })

    test('rare non-cursed items get positive enchantment +2', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      mockRandom.setValues([2])
      expect(method('rare', false)).toBe(2)
    })

    test('common non-cursed items get no enchantment (0)', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      expect(method('common', false)).toBe(0)
    })

    test('uncommon non-cursed items get no enchantment (0)', () => {
      // @ts-expect-error - accessing private method for testing
      const method = dungeonService.rollEnchantment.bind(dungeonService)

      expect(method('uncommon', false)).toBe(0)
    })
  })

})
