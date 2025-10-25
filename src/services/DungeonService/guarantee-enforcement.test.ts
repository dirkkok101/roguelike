import { DungeonService } from './DungeonService'
import { SeededRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { mockItemData } from '@/test-utils'
import { GuaranteeConfig } from '@services/GuaranteeTracker'
import { ItemType, PotionType } from '@game/core/core'

describe('DungeonService - Guarantee Enforcement', () => {
  let dungeonService: DungeonService
  let mockGuarantees: GuaranteeConfig

  beforeEach(() => {
    const seed = 'test-guarantee-seed'
    const random = new SeededRandom(seed)

    // Mock MonsterSpawnService
    const mockMonsterSpawnService = {
      loadMonsterData: jest.fn().mockResolvedValue(undefined),
      spawnMonsters: jest.fn().mockReturnValue([]),
      getSpawnCount: jest.fn().mockReturnValue(5),
    } as unknown as MonsterSpawnService

    mockGuarantees = {
      categoryWeights: {
        '1-5': {
          potion: 100,  // Force all potions for testing
          scroll: 0,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        },
        '6-10': {
          potion: 50,
          scroll: 50,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        },
        '11-15': {
          potion: 50,
          scroll: 50,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        },
        '16-20': {
          potion: 50,
          scroll: 50,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        },
        '21-26': {
          potion: 50,
          scroll: 50,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        }
      },
      rangeGuarantees: {
        '1-5': {
          healingPotions: 10  // Require 10 healing potions
        },
        '6-10': {},
        '11-15': {},
        '16-20': {},
        '21-26': {}
      }
    }

    dungeonService = new DungeonService(random, mockMonsterSpawnService, mockItemData, mockGuarantees)
  })

  test('enforces guarantees at range boundary (depth 5)', () => {
    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    // Use generateAllLevels which enforces guarantees
    const allLevels = dungeonService.generateAllLevels(config)

    // Get first 5 levels (range 1-5)
    const levels = allLevels.slice(0, 5)

    // Count healing potions across depths 1-5
    const healingPotions = levels.flatMap(l => l.items).filter(item =>
      item.type === ItemType.POTION &&
      [PotionType.MINOR_HEAL, PotionType.MEDIUM_HEAL].includes((item as any).potionType)
    )

    // Should have at least 10 (guarantee enforced by forceSpawnForGuarantees)
    expect(healingPotions.length).toBeGreaterThanOrEqual(10)
  })

  test('attempts to spawn 7 items per level', () => {
    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    // Generate all levels to test item counts
    const allLevels = dungeonService.generateAllLevels(config)

    // The service ATTEMPTS to spawn 7 items per level
    // Actual count may vary due to room space constraints, but should be close
    // Test that levels have reasonable item counts (not the old random 5-8 range)
    // Level 5 should have >= 7 due to guarantee enforcement
    const level5 = allLevels[4]  // Index 4 = depth 5

    // Should have at least 7 items (guarantee enforcement at boundary level)
    expect(level5.items.length).toBeGreaterThanOrEqual(7)
  })
})
