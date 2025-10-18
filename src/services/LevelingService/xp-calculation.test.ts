import { LevelingService } from './LevelingService'
import { MockRandom } from '@services/RandomService'
import { Player, Monster } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

// ============================================================================
// LEVELING SERVICE - XP Calculation Tests
// ============================================================================

describe('LevelingService - XP Calculation', () => {
  let service: LevelingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LevelingService(mockRandom)
  })

  function createTestPlayer(level: number = 1, xp: number = 0): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
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

  function createTestMonster(xpValue: number): Monster {
    return {
      id: 'monster-1',
      letter: 'B',
      name: 'Bat',
      spriteName: 'Bat',
      position: { x: 10, y: 10 },
      hp: 5,
      maxHp: 5,
      ac: 3,
      minDamage: 1,
      maxDamage: 2,
      xpValue,
      flags: [],
      aiProfile: {
        behavior: 'ERRATIC',
        fleeThreshold: 0,
        preferredDistance: 1,
      },
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      awarenessRadius: 5,
      speed: 10,
    }
  }

  // ============================================================================
  // addExperience()
  // ============================================================================

  describe('addExperience()', () => {
    test('adds XP to player total', () => {
      // Arrange
      const player = createTestPlayer(1, 0)

      // Act
      const result = service.addExperience(player, 5)

      // Assert
      expect(result.player.xp).toBe(5)
      expect(result.player).not.toBe(player) // Immutability
    })

    test('returns leveledUp: false when below threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 5)

      // Act
      const result = service.addExperience(player, 3) // 5 + 3 = 8, need 10

      // Assert
      expect(result.leveledUp).toBe(false)
      expect(result.player.xp).toBe(8)
    })

    test('returns leveledUp: true when reaching threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 8)

      // Act
      const result = service.addExperience(player, 2) // 8 + 2 = 10, exactly threshold

      // Assert
      expect(result.leveledUp).toBe(true)
      expect(result.player.xp).toBe(10)
    })

    test('returns leveledUp: true when exceeding threshold', () => {
      // Arrange
      const player = createTestPlayer(1, 5)

      // Act
      const result = service.addExperience(player, 10) // 5 + 10 = 15, over threshold

      // Assert
      expect(result.leveledUp).toBe(true)
      expect(result.player.xp).toBe(15)
    })

    test('returns leveledUp: false at max level', () => {
      // Arrange
      const player = createTestPlayer(10, 450) // Max level

      // Act
      const result = service.addExperience(player, 100)

      // Assert
      expect(result.leveledUp).toBe(false)
      expect(result.player.xp).toBe(550) // XP still accumulates but no level up
    })

    test('returns new Player object (immutability)', () => {
      // Arrange
      const player = createTestPlayer(1, 5)

      // Act
      const result = service.addExperience(player, 3)

      // Assert
      expect(result.player).not.toBe(player)
      expect(player.xp).toBe(5) // Original unchanged
      expect(result.player.xp).toBe(8) // New object updated
    })
  })

  // ============================================================================
  // calculateXPReward()
  // ============================================================================

  describe('calculateXPReward()', () => {
    test('returns monster xpValue', () => {
      // Arrange
      const monster = createTestMonster(10)

      // Act
      const xp = service.calculateXPReward(monster)

      // Assert
      expect(xp).toBe(10)
    })

    test('handles low-XP monsters (Bat: 5 XP)', () => {
      // Arrange
      const bat = createTestMonster(5)

      // Act
      const xp = service.calculateXPReward(bat)

      // Assert
      expect(xp).toBe(5)
    })

    test('handles high-XP monsters (Dragon: 150 XP)', () => {
      // Arrange
      const dragon = createTestMonster(150)

      // Act
      const xp = service.calculateXPReward(dragon)

      // Assert
      expect(xp).toBe(150)
    })

    test('handles zero XP monsters', () => {
      // Arrange
      const monster = createTestMonster(0)

      // Act
      const xp = service.calculateXPReward(monster)

      // Assert
      expect(xp).toBe(0)
    })
  })

  // ============================================================================
  // getXPForNextLevel()
  // ============================================================================

  describe('getXPForNextLevel()', () => {
    test('returns 10 XP for level 1', () => {
      expect(service.getXPForNextLevel(1)).toBe(10)
    })

    test('returns 30 XP for level 2', () => {
      expect(service.getXPForNextLevel(2)).toBe(30)
    })

    test('returns 60 XP for level 3', () => {
      expect(service.getXPForNextLevel(3)).toBe(60)
    })

    test('returns 100 XP for level 4', () => {
      expect(service.getXPForNextLevel(4)).toBe(100)
    })

    test('returns 150 XP for level 5', () => {
      expect(service.getXPForNextLevel(5)).toBe(150)
    })

    test('returns Infinity for level 10 (max level)', () => {
      expect(service.getXPForNextLevel(10)).toBe(Infinity)
    })

    test('returns Infinity for levels beyond max', () => {
      expect(service.getXPForNextLevel(11)).toBe(Infinity)
      expect(service.getXPForNextLevel(999)).toBe(Infinity)
    })
  })
})
