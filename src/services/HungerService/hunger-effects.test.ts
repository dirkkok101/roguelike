import { HungerService, HungerState } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { Player, ItemType } from '@game/core/core'

describe('HungerService - Hunger Effects', () => {
  let service: HungerService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new HungerService(mockRandom)
  })

  function createTestPlayer(overrides?: Partial<Player>): Player {
    return {
      position: { x: 0, y: 0 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      ...overrides,
    }
  }

  describe('applyHungerEffects()', () => {
    test('returns no penalty in NORMAL state', () => {
      // Arrange: Player with 301+ hunger (NORMAL)
      const player = createTestPlayer({ hunger: 500 })

      // Act
      const effects = service.applyHungerEffects(player)

      // Assert
      expect(effects.toHitPenalty).toBe(0)
      expect(effects.damagePenalty).toBe(0)
    })

    test('returns no penalty in HUNGRY state', () => {
      // Arrange: Player with 150-300 hunger (HUNGRY)
      const player = createTestPlayer({ hunger: 200 })

      // Act
      const effects = service.applyHungerEffects(player)

      // Assert
      expect(effects.toHitPenalty).toBe(0)
      expect(effects.damagePenalty).toBe(0)
    })

    test('returns -1 to hit penalty in WEAK state', () => {
      // Arrange: Player with 1-149 hunger (WEAK)
      const player = createTestPlayer({ hunger: 100 })

      // Act
      const effects = service.applyHungerEffects(player)

      // Assert
      expect(effects.toHitPenalty).toBe(-1)
    })

    test('returns -1 damage penalty in WEAK state', () => {
      // Arrange: Player with 1-149 hunger (WEAK)
      const player = createTestPlayer({ hunger: 50 })

      // Act
      const effects = service.applyHungerEffects(player)

      // Assert
      expect(effects.damagePenalty).toBe(-1)
    })

    test('returns penalties in STARVING state', () => {
      // Arrange: Player with 0 hunger (STARVING)
      const player = createTestPlayer({ hunger: 0 })

      // Act
      const effects = service.applyHungerEffects(player)

      // Assert
      expect(effects.toHitPenalty).toBe(-1)
      expect(effects.damagePenalty).toBe(-1)
    })
  })

  describe('applyStarvationDamage()', () => {
    test('reduces HP by 1 when hunger is 0', () => {
      // Arrange: Starving player
      const player = createTestPlayer({ hunger: 0, hp: 10 })

      // Act
      const damaged = service.applyStarvationDamage(player)

      // Assert
      expect(damaged.hp).toBe(9)
    })

    test('does not reduce HP when hunger is above 0', () => {
      // Arrange: Player with some hunger
      const player = createTestPlayer({ hunger: 50, hp: 10 })

      // Act
      const result = service.applyStarvationDamage(player)

      // Assert: No damage applied
      expect(result.hp).toBe(10)
    })

    test('does not reduce HP below 0', () => {
      // Arrange: Starving player with 0 HP
      const player = createTestPlayer({ hunger: 0, hp: 0 })

      // Act
      const damaged = service.applyStarvationDamage(player)

      // Assert: HP stays at 0 (doesn't go negative)
      expect(damaged.hp).toBe(0)
    })

    test('returns new Player object (immutability)', () => {
      // Arrange
      const player = createTestPlayer({ hunger: 0, hp: 10 })

      // Act
      const damaged = service.applyStarvationDamage(player)

      // Assert immutability
      expect(damaged).not.toBe(player)
      expect(player.hp).toBe(10) // Original unchanged
      expect(damaged.hp).toBe(9)
    })

    test('handles low HP correctly', () => {
      // Arrange: Player with 1 HP, starving
      const player = createTestPlayer({ hunger: 0, hp: 1 })

      // Act
      const damaged = service.applyStarvationDamage(player)

      // Assert: HP reduced to 0
      expect(damaged.hp).toBe(0)
    })

    test('does not damage player when hunger is exactly 1', () => {
      // Arrange: Player with 1 hunger (WEAK state, not STARVING)
      const player = createTestPlayer({ hunger: 1, hp: 10 })

      // Act
      const result = service.applyStarvationDamage(player)

      // Assert: No damage (only damages at 0 hunger)
      expect(result.hp).toBe(10)
    })
  })
})
