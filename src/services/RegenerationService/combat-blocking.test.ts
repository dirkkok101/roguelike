import { RegenerationService } from './RegenerationService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Equipment, Ring, RingType, ItemType } from '@game/core/core'

describe('RegenerationService - Combat Blocking', () => {
  let service: RegenerationService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom([])
    ringService = new RingService(mockRandom)
    service = new RegenerationService(ringService)
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
      hp: 10,
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

  describe('Combat Detection', () => {
    test('does not regenerate when inCombat is true', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })
      const inCombat = true

      // Tick 10 times in combat - should not heal
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, inCombat)
        updatedPlayer = result.player
        expect(result.healed).toBe(false)
      }

      expect(updatedPlayer.hp).toBe(10)
    })

    test('regenerates normally when inCombat is false', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })
      const inCombat = false

      // Tick 10 times out of combat - should heal
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, inCombat)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(11)
    })
  })

  describe('Counter Reset in Combat', () => {
    test('resets counter when entering combat', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Build up counter out of combat (5 turns)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        service.tickRegeneration(updatedPlayer, false)
      }

      // Enter combat for 1 turn (resets counter)
      service.tickRegeneration(updatedPlayer, true)

      // Exit combat and tick 5 more times
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      // Should NOT have healed (counter was reset)
      expect(updatedPlayer.hp).toBe(10)
    })

    test('requires full 10 turns after combat ends', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Combat for 5 turns
      for (let i = 0; i < 5; i++) {
        service.tickRegeneration(player, true)
      }

      // Exit combat and tick exactly 10 times
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(11)
    })

    test('resets counter on each combat turn', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Alternating combat and non-combat (prevents regen)
      let updatedPlayer = player
      for (let i = 0; i < 20; i++) {
        const inCombat = i % 2 === 0 // Even turns in combat
        const result = service.tickRegeneration(updatedPlayer, inCombat)
        updatedPlayer = result.player
      }

      // Should NOT have healed (counter keeps resetting)
      expect(updatedPlayer.hp).toBe(10)
    })
  })

  describe('Combat with Ring of Regeneration', () => {
    test('ring does not bypass combat blocking', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      // Tick 5 times in combat (ring rate) - should not heal
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, true)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(10)
    })

    test('ring works normally after combat ends', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      // Combat for 3 turns
      for (let i = 0; i < 3; i++) {
        service.tickRegeneration(player, true)
      }

      // Exit combat and tick 5 times (ring rate)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(11)
    })
  })

  describe('Combat Interruption Patterns', () => {
    test('handles hit-and-run tactics (combat every few turns)', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Pattern: 3 turns non-combat, 1 turn combat (repeat)
      let updatedPlayer = player
      for (let cycle = 0; cycle < 5; cycle++) {
        // 3 turns out of combat
        for (let i = 0; i < 3; i++) {
          const result = service.tickRegeneration(updatedPlayer, false)
          updatedPlayer = result.player
        }
        // 1 turn in combat (resets counter)
        service.tickRegeneration(updatedPlayer, true)
      }

      // Should NOT have healed (counter keeps resetting every 4 turns)
      expect(updatedPlayer.hp).toBe(10)
    })

    test('heals after extended non-combat period', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Combat for 5 turns
      for (let i = 0; i < 5; i++) {
        service.tickRegeneration(player, true)
      }

      // Extended retreat (20 turns out of combat)
      let updatedPlayer = player
      for (let i = 0; i < 20; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      // Should heal twice (20 / 10 = 2)
      expect(updatedPlayer.hp).toBe(12)
    })

    test('counter survives brief combat check', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Build counter to 9 turns
      let updatedPlayer = player
      for (let i = 0; i < 9; i++) {
        service.tickRegeneration(updatedPlayer, false)
      }

      // Brief combat check (resets counter)
      service.tickRegeneration(updatedPlayer, true)

      // Resume - need full 10 turns again
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(11)
    })
  })

  describe('Edge Cases', () => {
    test('healed flag is false during combat', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      const result = service.tickRegeneration(player, true)

      expect(result.healed).toBe(false)
    })

    test('returns same player reference when combat blocks regen', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      const result = service.tickRegeneration(player, true)

      // Player unchanged
      expect(result.player).toEqual(player)
    })

    test('combat blocking works even at low HP', () => {
      const player = createTestPlayer({ hp: 1, maxHp: 20 })

      // Even at critical HP, combat blocks regen
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, true)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(1)
    })

    test('combat blocking works with ring equipped', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        hp: 1,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      // Even with ring, combat blocks
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, true)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(1)
    })
  })
})
