import { RingService } from './RingService'
import { Player, Ring, RingType, ItemType } from '@game/core/core'
import { MockRandom } from '@services/RandomService'

describe('RingService - Hunger Modifier Calculation', () => {
  let service: RingService
  let basePlayer: Player
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom([])
    service = new RingService(mockRandom)

    basePlayer = {
      position: { x: 5, y: 5 },
      hp: 12,
      maxHp: 12,
      strength: 16,
      maxStrength: 16,
      ac: 10,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      energy: 0,
    }
  })

  // ============================================================================
  // calculateHungerModifier() - Hunger consumption rate from rings
  // ============================================================================

  describe('calculateHungerModifier', () => {
    test('returns 1.0 (base rate) when no rings equipped', () => {
      expect(service.calculateHungerModifier(basePlayer)).toBe(1.0)
    })

    // ------------------------------------------------------------------------
    // SLOW_DIGESTION ring tests (reduces hunger -0.5)
    // ------------------------------------------------------------------------

    test('returns 0.5 with one SLOW_DIGESTION ring', () => {
      const slowDigestionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 0.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: slowDigestionRing,
        },
      }

      // Base 1.0 - 0.5 = 0.5 (50% slower hunger)
      expect(service.calculateHungerModifier(player)).toBe(0.5)
    })

    test('returns 0.0 with two SLOW_DIGESTION rings (no hunger consumption!)', () => {
      const slowDigestion1: Ring = {
        id: 'ring-1',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 0.5,
      }

      const slowDigestion2: Ring = {
        id: 'ring-2',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 0.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: slowDigestion1,
          rightRing: slowDigestion2,
        },
      }

      // Base 1.0 - 0.5 - 0.5 = 0.0 (no hunger consumption!)
      // This is a powerful combination
      expect(service.calculateHungerModifier(player)).toBe(0.0)
    })

    // ------------------------------------------------------------------------
    // REGENERATION ring tests (increases hunger +0.3)
    // ------------------------------------------------------------------------

    test('returns 1.3 with one REGENERATION ring', () => {
      const regenRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.3,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: regenRing,
        },
      }

      // Base 1.0 + 0.3 = 1.3 (30% faster hunger)
      expect(service.calculateHungerModifier(player)).toBe(1.3)
    })

    test('returns 1.6 with two REGENERATION rings', () => {
      const regen1: Ring = {
        id: 'ring-1',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.3,
      }

      const regen2: Ring = {
        id: 'ring-2',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.3,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: regen1,
          rightRing: regen2,
        },
      }

      // Base 1.0 + 0.3 + 0.3 = 1.6 (60% faster hunger)
      expect(service.calculateHungerModifier(player)).toBe(1.6)
    })

    // ------------------------------------------------------------------------
    // Other rings (increases hunger +0.5)
    // ------------------------------------------------------------------------

    test('returns 1.5 with one PROTECTION ring', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protectionRing,
        },
      }

      // Base 1.0 + 0.5 = 1.5 (50% faster hunger)
      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one ADD_STRENGTH ring', () => {
      const strengthRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Add Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 2,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: strengthRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one DEXTERITY ring', () => {
      const dexRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 1,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: dexRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one SEARCHING ring', () => {
      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: searchingRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one SEE_INVISIBLE ring', () => {
      const seeInvisRing: Ring = {
        id: 'ring-1',
        name: 'Ring of See Invisible',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEE_INVISIBLE,
        effect: 'Reveal invisible monsters',
        bonus: 0,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: seeInvisRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one SUSTAIN_STRENGTH ring', () => {
      const sustainRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Sustain Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SUSTAIN_STRENGTH,
        effect: 'Prevent strength drain',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: sustainRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one TELEPORTATION ring', () => {
      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 1.5 with one STEALTH ring', () => {
      const stealthRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Stealth',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.STEALTH,
        effect: 'Silent movement',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: stealthRing,
        },
      }

      expect(service.calculateHungerModifier(player)).toBe(1.5)
    })

    test('returns 2.0 with two standard rings', () => {
      const protection: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const strength: Ring = {
        id: 'ring-2',
        name: 'Ring of Add Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 2,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protection,
          rightRing: strength,
        },
      }

      // Base 1.0 + 0.5 + 0.5 = 2.0 (100% faster hunger - doubles rate!)
      expect(service.calculateHungerModifier(player)).toBe(2.0)
    })

    // ------------------------------------------------------------------------
    // Mixed ring combinations
    // ------------------------------------------------------------------------

    test('SLOW_DIGESTION + REGENERATION balances out (0.8)', () => {
      const slowDigestion: Ring = {
        id: 'ring-1',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 0.5,
      }

      const regen: Ring = {
        id: 'ring-2',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.3,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: slowDigestion,
          rightRing: regen,
        },
      }

      // Base 1.0 - 0.5 + 0.3 = 0.8 (20% reduction in hunger rate)
      expect(service.calculateHungerModifier(player)).toBe(0.8)
    })

    test('SLOW_DIGESTION + PROTECTION partially offsets (1.0)', () => {
      const slowDigestion: Ring = {
        id: 'ring-1',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 0.5,
      }

      const protection: Ring = {
        id: 'ring-2',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: slowDigestion,
          rightRing: protection,
        },
      }

      // Base 1.0 - 0.5 + 0.5 = 1.0 (exactly cancels out!)
      expect(service.calculateHungerModifier(player)).toBe(1.0)
    })

    test('REGENERATION + PROTECTION increases hunger significantly (1.8)', () => {
      const regen: Ring = {
        id: 'ring-1',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.3,
      }

      const protection: Ring = {
        id: 'ring-2',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: regen,
          rightRing: protection,
        },
      }

      // Base 1.0 + 0.3 + 0.5 = 1.8 (80% faster hunger - significant penalty!)
      expect(service.calculateHungerModifier(player)).toBe(1.8)
    })

    // ------------------------------------------------------------------------
    // Edge case: Never negative
    // ------------------------------------------------------------------------

    test('never goes below 0 (Math.max enforced)', () => {
      const slowDigestion1: Ring = {
        id: 'ring-1',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 0.5,
      }

      const slowDigestion2: Ring = {
        id: 'ring-2',
        name: 'Ring of Slow Digestion',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SLOW_DIGESTION,
        effect: 'Reduces hunger rate',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 0.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: slowDigestion1,
          rightRing: slowDigestion2,
        },
      }

      // Base 1.0 - 0.5 - 0.5 = 0.0
      // Math.max(0, 0.0) = 0.0 (never negative)
      expect(service.calculateHungerModifier(player)).toBe(0.0)
      expect(service.calculateHungerModifier(player)).toBeGreaterThanOrEqual(0)
    })
  })
})
