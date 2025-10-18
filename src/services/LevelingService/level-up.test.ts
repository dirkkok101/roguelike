import { LevelingService } from './LevelingService'
import { MockRandom } from '@services/RandomService'
import { Player } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

// ============================================================================
// LEVELING SERVICE - Level Up Tests
// ============================================================================

describe('LevelingService - Level Up', () => {
  let service: LevelingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LevelingService(mockRandom)
  })

  function createTestPlayer(
    level: number = 1,
    xp: number = 0,
    hp: number = 20,
    maxHp: number = 20
  ): Player {
    return {
      position: { x: 5, y: 5 },
      hp,
      maxHp,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level,
      xp,
      gold: 0,
      hunger: 1300,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      hasAmulet: false,
    }
  }

  // ============================================================================
  // levelUp()
  // ============================================================================

  describe('levelUp()', () => {
    test('increases level by 1', () => {
      // Arrange
      const player = createTestPlayer(1, 10) // Has enough XP
      const mockRandom = new MockRandom([5]) // 1d8 = 5
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.level).toBe(2)
    })

    test('increases max HP by 1d8 (MockRandom: 5)', () => {
      // Arrange
      const player = createTestPlayer(1, 10, 20, 20)
      const mockRandom = new MockRandom([5]) // 1d8 = 5
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.maxHp).toBe(25) // 20 + 5
    })

    test('increases max HP by 1d8 (MockRandom: 8)', () => {
      // Arrange
      const player = createTestPlayer(1, 10, 20, 20)
      const mockRandom = new MockRandom([8]) // 1d8 = 8
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.maxHp).toBe(28) // 20 + 8
    })

    test('fully restores HP to new max', () => {
      // Arrange
      const player = createTestPlayer(1, 10, 10, 20) // Damaged (10/20 HP)
      const mockRandom = new MockRandom([5]) // 1d8 = 5
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.hp).toBe(25) // Fully healed to new max
      expect(updated.maxHp).toBe(25)
    })

    test('carries over excess XP to next level', () => {
      // Arrange
      const player = createTestPlayer(1, 15) // 15 XP, need 10 for level 2
      const mockRandom = new MockRandom([5])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.level).toBe(2)
      expect(updated.xp).toBe(5) // 15 - 10 = 5 carried over
    })

    test('carries over exact XP when at threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 10) // Exactly 10 XP
      const mockRandom = new MockRandom([5])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.level).toBe(2)
      expect(updated.xp).toBe(0) // 10 - 10 = 0 carried over
    })

    test('does not level up beyond level 10', () => {
      // Arrange
      const player = createTestPlayer(10, 500) // Max level
      const mockRandom = new MockRandom([5])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.level).toBe(10) // Still level 10
      expect(updated.maxHp).toBe(20) // No HP increase
      expect(updated.xp).toBe(500) // XP unchanged
      expect(updated).toBe(player) // Returns same object when at max
    })

    test('returns new Player object (immutability)', () => {
      // Arrange
      const player = createTestPlayer(1, 10)
      const mockRandom = new MockRandom([5])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated).not.toBe(player)
      expect(player.level).toBe(1) // Original unchanged
      expect(player.maxHp).toBe(20) // Original unchanged
      expect(updated.level).toBe(2) // New object updated
      expect(updated.maxHp).toBe(25) // New object updated
    })

    test('handles multiple level-ups correctly', () => {
      // Arrange
      let player = createTestPlayer(1, 10)
      const mockRandom1 = new MockRandom([5])
      const service1 = new LevelingService(mockRandom1)

      // Act - Level up from 1 to 2
      player = service1.levelUp(player)
      expect(player.level).toBe(2)
      expect(player.maxHp).toBe(25)

      // Arrange for next level up
      player = { ...player, xp: 30 } // Enough for level 3
      const mockRandom2 = new MockRandom([6])
      const service2 = new LevelingService(mockRandom2)

      // Act - Level up from 2 to 3
      player = service2.levelUp(player)

      // Assert
      expect(player.level).toBe(3)
      expect(player.maxHp).toBe(31) // 25 + 6
      expect(player.xp).toBe(0) // 30 - 30 = 0
    })

    test('XP carry-over never goes negative', () => {
      // Arrange
      const player = createTestPlayer(1, 8) // Less than threshold
      const mockRandom = new MockRandom([5])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.xp).toBe(0) // Max(0, 8 - 10) = 0
    })
  })

  // ============================================================================
  // checkLevelUp()
  // ============================================================================

  describe('checkLevelUp()', () => {
    test('returns true when XP >= threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 10) // Exactly 10 XP needed

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(true)
    })

    test('returns true when XP > threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 15) // More than 10 XP needed

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(true)
    })

    test('returns false when XP < threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 5) // Less than 10 XP needed

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(false)
    })

    test('returns false at max level', () => {
      // Arrange
      const player = createTestPlayer(10, 500) // Max level with lots of XP

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(false)
    })

    test('returns true at level 9 with enough XP for level 10', () => {
      // Arrange
      const player = createTestPlayer(9, 450) // Level 9 needs 450 XP for level 10

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(true)
    })
  })
})
