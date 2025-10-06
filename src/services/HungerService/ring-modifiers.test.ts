import { HungerService, HungerState } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { Player, Ring, RingType, ItemType } from '@game/core/core'

describe('HungerService - Ring Modifiers', () => {
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

  function createTestRing(ringType: RingType, id: string = `ring-${ringType}`): Ring {
    return {
      id,
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

  test('Protection ring increases hunger rate to 1.5x', () => {
    // Arrange
    const protectionRing = createTestRing(RingType.PROTECTION)
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: protectionRing,
        rightRing: null,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(998.5) // 1000 - 1.5
  })

  test('Regeneration ring increases hunger rate to 1.3x', () => {
    // Arrange
    const regenerationRing = createTestRing(RingType.REGENERATION)
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: regenerationRing,
        rightRing: null,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(998.7) // 1000 - 1.3
  })

  test('Add Strength ring increases hunger rate to 1.5x', () => {
    // Arrange
    const strengthRing = createTestRing(RingType.ADD_STRENGTH)
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: strengthRing,
        rightRing: null,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(998.5) // 1000 - 1.5
  })

  test('Slow Digestion ring decreases hunger rate to 0.5x', () => {
    // Arrange
    const slowDigestionRing = createTestRing(RingType.SLOW_DIGESTION)
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: slowDigestionRing,
        rightRing: null,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(999.5) // 1000 - 0.5
  })

  test('Two regular rings result in 1.8x rate (Protection + Regeneration)', () => {
    // Arrange
    const protectionRing = createTestRing(RingType.PROTECTION, 'ring-protection-1')
    const regenerationRing = createTestRing(RingType.REGENERATION, 'ring-regeneration-1')
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: protectionRing,
        rightRing: regenerationRing,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(998.2) // 1000 - 1.8 (Protection +0.5, Regeneration +0.3)
  })

  test('Slow Digestion + Protection result in 1.0x rate', () => {
    // Arrange
    const protectionRing = createTestRing(RingType.PROTECTION)
    const slowDigestionRing = createTestRing(RingType.SLOW_DIGESTION, 'ring-slow')
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: protectionRing,
        rightRing: slowDigestionRing,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(999) // 1000 - 1.0 (they cancel out)
  })

  test('Two Slow Digestion rings result in 0.0x rate (no depletion)', () => {
    // Arrange
    const slowDigestionRing1 = createTestRing(RingType.SLOW_DIGESTION, 'ring-slow-1')
    const slowDigestionRing2 = createTestRing(RingType.SLOW_DIGESTION, 'ring-slow-2')
    const player = createTestPlayer({
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: slowDigestionRing1,
        rightRing: slowDigestionRing2,
        lightSource: null,
      },
    })

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hunger).toBe(1000) // 1000 - 0.0 (no depletion)
  })
})
