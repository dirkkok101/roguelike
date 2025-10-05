import { HungerService } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { Player, Equipment, Ring, RingType, ItemType } from '@game/core/core'

describe('HungerService - Ring of Regeneration Hunger Penalty', () => {
  let service: HungerService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new HungerService(mockRandom)
  })

  function createTestPlayer(overrides?: Partial<Player>): Player {
    const defaultEquipment: Equipment = {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: null,
    }

    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: defaultEquipment,
      inventory: [],
      ...overrides,
    }
  }

  function createRegenerationRing(): Ring {
    return {
      id: 'ring-regen-1',
      type: ItemType.RING,
      name: 'Ring of Regeneration',
      char: '=',
      color: '#9370DB',
      ringType: RingType.REGENERATION,
      effect: 'Regenerates health faster',
      bonus: 0,
      materialName: 'ruby',
      hungerModifier: 1.3,
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  function createProtectionRing(): Ring {
    return {
      id: 'ring-prot-1',
      type: ItemType.RING,
      name: 'Ring of Protection',
      char: '=',
      color: '#9370DB',
      ringType: RingType.PROTECTION,
      effect: 'Protects from damage',
      bonus: 1,
      materialName: 'sapphire',
      hungerModifier: 1.5,
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  function createSlowDigestionRing(): Ring {
    return {
      id: 'ring-slow-1',
      type: ItemType.RING,
      name: 'Ring of Slow Digestion',
      char: '=',
      color: '#9370DB',
      ringType: RingType.SLOW_DIGESTION,
      effect: 'Slows food consumption',
      bonus: 0,
      materialName: 'wooden',
      hungerModifier: 0.5,
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  describe('Hunger Rate Calculation', () => {
    test('base rate is 1.0 with no rings', () => {
      const rings: Ring[] = []

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.0)
    })

    test('Ring of Regeneration adds +0.3 (30% increase)', () => {
      const regenRing = createRegenerationRing()
      const rings = [regenRing]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.3) // 1.0 + 0.3
    })

    test('other rings add +0.5', () => {
      const protectionRing = createProtectionRing()
      const rings = [protectionRing]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.5) // 1.0 + 0.5
    })

    test('Ring of Slow Digestion subtracts -0.5', () => {
      const slowRing = createSlowDigestionRing()
      const rings = [slowRing]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(0.5) // 1.0 - 0.5
    })

    test('Ring of Regeneration + Ring of Slow Digestion = 0.8 rate', () => {
      const regenRing = createRegenerationRing()
      const slowRing = createSlowDigestionRing()
      const rings = [regenRing, slowRing]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(0.8) // 1.0 + 0.3 - 0.5
    })

    test('Ring of Regeneration + Protection Ring = 1.8 rate', () => {
      const regenRing = createRegenerationRing()
      const protectionRing = createProtectionRing()
      const rings = [regenRing, protectionRing]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.8) // 1.0 + 0.3 + 0.5
    })

    test('two Rings of Regeneration = 1.6 rate (stacks additively)', () => {
      const regenRing1 = createRegenerationRing()
      const regenRing2 = { ...createRegenerationRing(), id: 'ring-regen-2' }
      const rings = [regenRing1, regenRing2]

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.6) // 1.0 + 0.3 + 0.3
    })
  })

  describe('Hunger Tick with Regeneration Ring', () => {
    test('depletes 1.3 hunger per turn with Ring of Regeneration', () => {
      const regenRing = createRegenerationRing()
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: null,
          lightSource: null,
        },
      })

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(1298.7) // 1300 - 1.3
    })

    test('depletes 1.0 hunger per turn without ring', () => {
      const player = createTestPlayer({ hunger: 1300 })

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(1299) // 1300 - 1.0
    })

    test('hunger depletes 30% faster with Ring of Regeneration over 100 turns', () => {
      const regenRing = createRegenerationRing()
      const playerWithRing = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: null,
          lightSource: null,
        },
      })
      const playerWithoutRing = createTestPlayer({ hunger: 1300 })

      // Tick 100 times
      let withRing = playerWithRing
      let withoutRing = playerWithoutRing

      for (let i = 0; i < 100; i++) {
        const resultWith = service.tickHunger(withRing)
        const resultWithout = service.tickHunger(withoutRing)
        withRing = resultWith.player
        withoutRing = resultWithout.player
      }

      // With ring: 1300 - (1.3 × 100) = 1170
      // Without ring: 1300 - (1.0 × 100) = 1200
      expect(withRing.hunger).toBeCloseTo(1170, 1)
      expect(withoutRing.hunger).toBeCloseTo(1200, 1)

      // Difference should be 30 (30% of 100)
      expect(withoutRing.hunger - withRing.hunger).toBeCloseTo(30, 1)
    })

    test('Ring of Regeneration + Slow Digestion balances out to 0.8 rate', () => {
      const regenRing = createRegenerationRing()
      const slowRing = createSlowDigestionRing()
      const player = createTestPlayer({
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: slowRing,
          lightSource: null,
        },
      })

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(1299.2) // 1300 - 0.8
    })
  })

  describe('Strategic Balance', () => {
    test('regeneration ring hunger cost prevents infinite healing', () => {
      const regenRing = createRegenerationRing()
      const player = createTestPlayer({
        hunger: 200, // Near threshold
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: null,
          lightSource: null,
        },
      })

      // Tick many times - hunger should eventually hit threshold
      let updatedPlayer = player
      for (let i = 0; i < 500; i++) {
        const result = service.tickHunger(updatedPlayer)
        updatedPlayer = result.player
        if (updatedPlayer.hunger <= 100) {
          break
        }
      }

      // Hunger should be depleted faster with ring
      expect(updatedPlayer.hunger).toBeLessThanOrEqual(100)
    })

    test('Slow Digestion ring counters Regeneration ring hunger cost', () => {
      const regenRing = createRegenerationRing()
      const slowRing = createSlowDigestionRing()
      const playerWithCombo = createTestPlayer({
        hunger: 1000,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: slowRing,
          lightSource: null,
        },
      })
      const playerRegenOnly = createTestPlayer({
        hunger: 1000,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: null,
          lightSource: null,
        },
      })

      // Tick 100 times
      let combo = playerWithCombo
      let regenOnly = playerRegenOnly

      for (let i = 0; i < 100; i++) {
        combo = service.tickHunger(combo).player
        regenOnly = service.tickHunger(regenOnly).player
      }

      // Combo: 1000 - (0.8 × 100) = 920
      // Regen only: 1000 - (1.3 × 100) = 870
      expect(combo.hunger).toBeCloseTo(920, 1)
      expect(regenOnly.hunger).toBeCloseTo(870, 1)

      // Combo should have 50 more hunger
      expect(combo.hunger - regenOnly.hunger).toBeCloseTo(50, 1)
    })
  })

  describe('Edge Cases', () => {
    test('rate never goes below 0 with multiple Slow Digestion rings', () => {
      const slowRing1 = createSlowDigestionRing()
      const slowRing2 = { ...createSlowDigestionRing(), id: 'ring-slow-2' }
      const rings = [slowRing1, slowRing2]

      const rate = service.calculateHungerRate(rings)

      // 1.0 - 0.5 - 0.5 = 0.0 (clamped)
      expect(rate).toBe(0)
    })

    test('handles empty rings array', () => {
      const rings: Ring[] = []

      const rate = service.calculateHungerRate(rings)

      expect(rate).toBe(1.0)
    })

    test('hunger does not go below 0 even with regeneration ring', () => {
      const regenRing = createRegenerationRing()
      const player = createTestPlayer({
        hunger: 1,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: null,
          lightSource: null,
        },
      })

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(0) // Clamped to 0, not negative
    })
  })
})
