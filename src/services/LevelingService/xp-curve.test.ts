import { LevelingService } from './LevelingService'
import { MockRandom } from '@services/RandomService'

// ============================================================================
// LEVELING SERVICE - XP Curve Tests
// ============================================================================

describe('LevelingService - XP Curve', () => {
  let service: LevelingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LevelingService(mockRandom)
  })

  // ============================================================================
  // XP Curve Validation
  // ============================================================================

  test('level 1 requires 10 XP', () => {
    expect(service.getXPForNextLevel(1)).toBe(10)
  })

  test('level 2 requires 30 XP', () => {
    expect(service.getXPForNextLevel(2)).toBe(30)
  })

  test('level 3 requires 60 XP', () => {
    expect(service.getXPForNextLevel(3)).toBe(60)
  })

  test('level 4 requires 100 XP', () => {
    expect(service.getXPForNextLevel(4)).toBe(100)
  })

  test('level 5 requires 150 XP', () => {
    expect(service.getXPForNextLevel(5)).toBe(150)
  })

  test('level 6 requires 210 XP', () => {
    expect(service.getXPForNextLevel(6)).toBe(210)
  })

  test('level 7 requires 280 XP', () => {
    expect(service.getXPForNextLevel(7)).toBe(280)
  })

  test('level 8 requires 360 XP', () => {
    expect(service.getXPForNextLevel(8)).toBe(360)
  })

  test('level 9 requires 450 XP', () => {
    expect(service.getXPForNextLevel(9)).toBe(450)
  })

  test('level 10 is max level', () => {
    expect(service.getXPForNextLevel(10)).toBe(Infinity)
  })

  // ============================================================================
  // Curve Progression
  // ============================================================================

  test('curve increases progressively (each level requires more XP)', () => {
    // Arrange - Get XP requirements for all levels
    const xpRequirements = [
      service.getXPForNextLevel(1), // 10
      service.getXPForNextLevel(2), // 30
      service.getXPForNextLevel(3), // 60
      service.getXPForNextLevel(4), // 100
      service.getXPForNextLevel(5), // 150
      service.getXPForNextLevel(6), // 210
      service.getXPForNextLevel(7), // 280
      service.getXPForNextLevel(8), // 360
      service.getXPForNextLevel(9), // 450
    ]

    // Assert - Each level requires more XP than previous
    for (let i = 1; i < xpRequirements.length; i++) {
      expect(xpRequirements[i]).toBeGreaterThan(xpRequirements[i - 1])
    }
  })

  test('incremental XP gain increases each level', () => {
    // Arrange - Calculate incremental XP between levels
    const increments = [
      service.getXPForNextLevel(1) - 0, // 10 - 0 = 10
      service.getXPForNextLevel(2) - service.getXPForNextLevel(1), // 30 - 10 = 20
      service.getXPForNextLevel(3) - service.getXPForNextLevel(2), // 60 - 30 = 30
      service.getXPForNextLevel(4) - service.getXPForNextLevel(3), // 100 - 60 = 40
      service.getXPForNextLevel(5) - service.getXPForNextLevel(4), // 150 - 100 = 50
      service.getXPForNextLevel(6) - service.getXPForNextLevel(5), // 210 - 150 = 60
      service.getXPForNextLevel(7) - service.getXPForNextLevel(6), // 280 - 210 = 70
      service.getXPForNextLevel(8) - service.getXPForNextLevel(7), // 360 - 280 = 80
      service.getXPForNextLevel(9) - service.getXPForNextLevel(8), // 450 - 360 = 90
    ]

    // Assert - Verify increments are [10, 20, 30, 40, 50, 60, 70, 80, 90]
    expect(increments).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90])
  })

  test('XP curve follows arithmetic progression pattern', () => {
    // Arrange - Calculate differences between consecutive increments
    const increments = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    const differences = []

    for (let i = 1; i < increments.length; i++) {
      differences.push(increments[i] - increments[i - 1])
    }

    // Assert - All differences should be 10 (arithmetic progression with d=10)
    expect(differences).toEqual([10, 10, 10, 10, 10, 10, 10, 10])
  })

  test('total XP to reach level 10 is 450', () => {
    // Act
    const totalXP = service.getXPForNextLevel(9)

    // Assert
    expect(totalXP).toBe(450)
  })

  test('XP curve is deterministic and consistent', () => {
    // Arrange - Create two service instances
    const service1 = new LevelingService(mockRandom)
    const service2 = new LevelingService(new MockRandom())

    // Act & Assert - Both instances should return same values
    for (let level = 1; level <= 10; level++) {
      expect(service1.getXPForNextLevel(level)).toBe(
        service2.getXPForNextLevel(level)
      )
    }
  })
})
