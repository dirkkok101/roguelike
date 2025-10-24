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

    test('can level up to very high levels (infinite scaling)', () => {
      // Arrange
      const player = createTestPlayer(99, 49005) // Level 99 with enough XP for level 100
      const mockRandom = new MockRandom([8])
      const service = new LevelingService(mockRandom)

      // Act
      const updated = service.levelUp(player)

      // Assert
      expect(updated.level).toBe(100) // Leveled up to 100!
      expect(updated.maxHp).toBe(28) // 20 + 8
      expect(updated.xp).toBe(0) // XP carried over (49005 - 49005 = 0)
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

    test('returns false when XP insufficient for next level', () => {
      // Arrange
      const player = createTestPlayer(10, 500) // Level 10 needs 550 XP for level 11

      // Act
      const canLevelUp = service.checkLevelUp(player)

      // Assert
      expect(canLevelUp).toBe(false) // 500 < 550
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

  // ============================================================================
  // applyLevelUps() - Multiple Level-Ups
  // ============================================================================

  describe('applyLevelUps()', () => {
    test('levels up multiple times when player has enough XP', () => {
      // Arrange
      const player = createTestPlayer(1, 100) // Level 1 with 100 XP
      // Level 1→2 needs 10, Level 2→3 needs 30, Level 3→4 needs 60
      // 100 - 10 = 90, 90 - 30 = 60, 60 - 60 = 0
      const mockRandom = new MockRandom([5, 6, 7]) // HP increases for each level
      const service = new LevelingService(mockRandom)

      // Act
      const result = service.applyLevelUps(player)

      // Assert
      expect(result.levelsGained).toBe(3) // Gained 3 levels (1→2→3→4)
      expect(result.player.level).toBe(4)
      expect(result.player.xp).toBe(0) // 100 - 10 - 30 - 60 = 0
      expect(result.player.maxHp).toBe(38) // 20 (start) + 5 + 6 + 7
      expect(result.player.hp).toBe(38) // Fully healed
    })

    test('returns 0 levels gained when player cannot level up', () => {
      // Arrange
      const player = createTestPlayer(1, 5) // Not enough XP to level up
      const mockRandom = new MockRandom()
      const service = new LevelingService(mockRandom)

      // Act
      const result = service.applyLevelUps(player)

      // Assert
      expect(result.levelsGained).toBe(0)
      expect(result.player.level).toBe(1)
      expect(result.player.xp).toBe(5)
      expect(result.player).toBe(player) // Returns same object when no level-up
    })

    test('levels up once when player has XP for exactly one level', () => {
      // Arrange
      const player = createTestPlayer(1, 10) // Exactly enough for level 2
      const mockRandom = new MockRandom([8])
      const service = new LevelingService(mockRandom)

      // Act
      const result = service.applyLevelUps(player)

      // Assert
      expect(result.levelsGained).toBe(1)
      expect(result.player.level).toBe(2)
      expect(result.player.xp).toBe(0) // 10 - 10 = 0
    })

    test('handles massive XP gains (level 1 → level 6)', () => {
      // Arrange
      const player = createTestPlayer(1, 500) // 500 XP
      // 1→2: 10, 2→3: 30, 3→4: 60, 4→5: 100, 5→6: 150
      // Total consumed: 10+30+60+100+150 = 350
      // Remaining: 500 - 350 = 150
      // Next level (6→7) needs 210, so stop at level 6
      const mockRandom = new MockRandom([8, 7, 6, 5, 4]) // 5 level-ups
      const service = new LevelingService(mockRandom)

      // Act
      const result = service.applyLevelUps(player)

      // Assert
      expect(result.levelsGained).toBe(5) // Level 1 → 6
      expect(result.player.level).toBe(6)
      expect(result.player.xp).toBe(150) // 500 - 350 = 150 remaining
      expect(result.player.maxHp).toBe(50) // 20 (start) + (8+7+6+5+4)
    })

    test('immutability - does not mutate original player', () => {
      // Arrange
      const player = createTestPlayer(1, 100)
      const mockRandom = new MockRandom([5, 6, 7])
      const service = new LevelingService(mockRandom)

      // Act
      const result = service.applyLevelUps(player)

      // Assert
      expect(result.player).not.toBe(player)
      expect(player.level).toBe(1) // Original unchanged
      expect(player.xp).toBe(100) // Original unchanged
      expect(result.player.level).toBe(4) // New player leveled up
    })
  })
})
