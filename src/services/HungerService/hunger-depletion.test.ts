import { HungerService, HungerState } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Ring, RingType, ItemType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('HungerService - Hunger Depletion', () => {
  let service: HungerService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom()
    ringService = new RingService(mockRandom)
    service = new HungerService(mockRandom, ringService)
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
      inventory: [],
      statusEffects: [],
      energy: 100,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
      ...overrides,
    }
  }

  function createTestRing(ringType: RingType): Ring {
    return {
      id: `ring-${ringType}`,
      name: `${ringType} Ring`,
      type: ItemType.RING,
      identified: true,
      position: { x: 0, y: 0 },
      ringType,
      effect: 'test effect',
      bonus: 0,
      materialName: 'test',
      hungerModifier: 1.5,
    }
  }

  describe('tickHunger()', () => {
    test('reduces hunger by 1 each tick for base rate', () => {
      // Arrange: Create player with no rings
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Verify depletion
      expect(result.player.hunger).toBe(1299)
      expect(result.player).not.toBe(player) // Immutability
      expect(player.hunger).toBe(1300) // Original unchanged
    })

    test('does not go below zero', () => {
      // Arrange: Player with very low hunger
      const player = createTestPlayer({
        hunger: 0.5,
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Hunger clamped at 0
      expect(result.player.hunger).toBe(0)
    })

    test('returns new Player object (immutability)', () => {
      // Arrange
      const player = createTestPlayer()
      const originalHunger = player.hunger

      // Act
      const result = service.tickHunger(player)

      // Assert immutability
      expect(result.player).not.toBe(player)
      expect(player.hunger).toBe(originalHunger) // Original unchanged
      expect(result.player.hunger).toBe(originalHunger - 1)
    })

    test('applies 1.5x rate with one Protection ring', () => {
      // Arrange: Player with Protection ring
      const protectionRing = createTestRing(RingType.PROTECTION)
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: protectionRing,
          rightRing: null,
          lightSource: null,
        },
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Verify 1.5x depletion
      expect(result.player.hunger).toBe(1298.5) // 1300 - 1.5
    })

    test('applies 2.0x rate with two Protection rings', () => {
      // Arrange: Player with two Protection rings
      const protectionRing1 = createTestRing(RingType.PROTECTION)
      const protectionRing2 = { ...createTestRing(RingType.PROTECTION), id: 'ring-protection-2' }
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: protectionRing1,
          rightRing: protectionRing2,
          lightSource: null,
        },
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Verify 2.0x depletion
      expect(result.player.hunger).toBe(1298) // 1300 - 2.0
    })

    test('applies 0.5x rate with Slow Digestion ring', () => {
      // Arrange: Player with Slow Digestion ring
      const slowDigestionRing = createTestRing(RingType.SLOW_DIGESTION)
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: slowDigestionRing,
          rightRing: null,
          lightSource: null,
        },
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Verify 0.5x depletion
      expect(result.player.hunger).toBe(1299.5) // 1300 - 0.5
    })

    test('applies 1.0x rate with Protection + Slow Digestion (cancel out)', () => {
      // Arrange: Player with Protection and Slow Digestion rings
      const protectionRing = createTestRing(RingType.PROTECTION)
      const slowDigestionRing = createTestRing(RingType.SLOW_DIGESTION)
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: protectionRing,
          rightRing: slowDigestionRing,
          lightSource: null,
        },
      })

      // Act: Tick hunger
      const result = service.tickHunger(player)

      // Assert: Verify 1.0x depletion (they cancel out)
      expect(result.player.hunger).toBe(1299) // 1300 - 1.0
    })
  })
})
