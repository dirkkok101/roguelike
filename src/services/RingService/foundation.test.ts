import { RingService } from './RingService'
import { Player, Ring, RingType, ItemType } from '@game/core/core'

describe('RingService - Foundation Methods', () => {
  let service: RingService
  let basePlayer: Player

  beforeEach(() => {
    service = new RingService()

    // Base player with no rings equipped
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
  // hasRing() - Check for specific ring type
  // ============================================================================

  describe('hasRing', () => {
    test('returns false when no rings equipped', () => {
      expect(service.hasRing(basePlayer, RingType.PROTECTION)).toBe(false)
      expect(service.hasRing(basePlayer, RingType.REGENERATION)).toBe(false)
      expect(service.hasRing(basePlayer, RingType.ADD_STRENGTH)).toBe(false)
    })

    test('returns true when ring on left hand', () => {
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

      expect(service.hasRing(player, RingType.PROTECTION)).toBe(true)
      expect(service.hasRing(player, RingType.REGENERATION)).toBe(false)
    })

    test('returns true when ring on right hand', () => {
      const regenRing: Ring = {
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
          rightRing: regenRing,
        },
      }

      expect(service.hasRing(player, RingType.REGENERATION)).toBe(true)
      expect(service.hasRing(player, RingType.PROTECTION)).toBe(false)
    })

    test('returns true when same ring type on both hands', () => {
      const protectionRing1: Ring = {
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

      const protectionRing2: Ring = {
        id: 'ring-2',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 2,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protectionRing1,
          rightRing: protectionRing2,
        },
      }

      expect(service.hasRing(player, RingType.PROTECTION)).toBe(true)
    })
  })

  // ============================================================================
  // getRingBonus() - Get total bonus from specific ring type
  // ============================================================================

  describe('getRingBonus', () => {
    test('returns 0 when no rings equipped', () => {
      expect(service.getRingBonus(basePlayer, RingType.PROTECTION)).toBe(0)
      expect(service.getRingBonus(basePlayer, RingType.ADD_STRENGTH)).toBe(0)
    })

    test('returns bonus from left ring', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection +1',
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

      expect(service.getRingBonus(player, RingType.PROTECTION)).toBe(1)
    })

    test('returns bonus from right ring', () => {
      const strengthRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Add Strength +2',
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

      expect(service.getRingBonus(player, RingType.ADD_STRENGTH)).toBe(2)
    })

    test('stacks bonuses from two rings of same type', () => {
      const protectionRing1: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const protectionRing2: Ring = {
        id: 'ring-2',
        name: 'Ring of Protection +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 2,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protectionRing1,
          rightRing: protectionRing2,
        },
      }

      expect(service.getRingBonus(player, RingType.PROTECTION)).toBe(3)
    })

    test('returns 0 when checking different ring type', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection +1',
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

      // Asking for ADD_STRENGTH, but only PROTECTION equipped
      expect(service.getRingBonus(player, RingType.ADD_STRENGTH)).toBe(0)
    })

    test('handles cursed rings with negative bonuses', () => {
      const cursedRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection -2 (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -2,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: cursedRing,
        },
      }

      expect(service.getRingBonus(player, RingType.PROTECTION)).toBe(-2)
    })

    test('handles mixed cursed and blessed rings', () => {
      const cursedRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection -1 (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: -1,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const blessedRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Protection +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 2,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: cursedRing,
          rightRing: blessedRing,
        },
      }

      // -1 + 2 = 1
      expect(service.getRingBonus(player, RingType.PROTECTION)).toBe(1)
    })
  })

  // ============================================================================
  // getEquippedRings() - Get array of equipped rings
  // ============================================================================

  describe('getEquippedRings', () => {
    test('returns empty array when no rings equipped', () => {
      const rings = service.getEquippedRings(basePlayer)
      expect(rings).toEqual([])
      expect(rings).toHaveLength(0)
    })

    test('returns array with left ring only', () => {
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

      const rings = service.getEquippedRings(player)
      expect(rings).toHaveLength(1)
      expect(rings[0]).toBe(protectionRing)
    })

    test('returns array with right ring only', () => {
      const regenRing: Ring = {
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
          rightRing: regenRing,
        },
      }

      const rings = service.getEquippedRings(player)
      expect(rings).toHaveLength(1)
      expect(rings[0]).toBe(regenRing)
    })

    test('returns array with both rings', () => {
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

      const regenRing: Ring = {
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
          leftRing: protectionRing,
          rightRing: regenRing,
        },
      }

      const rings = service.getEquippedRings(player)
      expect(rings).toHaveLength(2)
      expect(rings[0]).toBe(protectionRing)
      expect(rings[1]).toBe(regenRing)
    })

    test('preserves order (left first, right second)', () => {
      const leftRing: Ring = {
        id: 'ring-left',
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

      const rightRing: Ring = {
        id: 'ring-right',
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
          leftRing: leftRing,
          rightRing: rightRing,
        },
      }

      const rings = service.getEquippedRings(player)
      expect(rings[0].id).toBe('ring-left')
      expect(rings[1].id).toBe('ring-right')
    })
  })

  // ============================================================================
  // getRingEffects() - Get comprehensive ring effects
  // ============================================================================

  describe('getRingEffects', () => {
    test('returns zero values when no rings equipped', () => {
      const effects = service.getRingEffects(basePlayer)

      expect(effects.acBonus).toBe(0)
      expect(effects.strengthBonus).toBe(0)
      expect(effects.dexterityBonus).toBe(0)
      expect(effects.hungerModifier).toBe(1.0) // Base rate
      expect(effects.hasRegeneration).toBe(false)
      expect(effects.hasStealth).toBe(false)
      expect(effects.hasSearching).toBe(false)
      expect(effects.hasSeeInvisible).toBe(false)
      expect(effects.hasSustainStrength).toBe(false)
      expect(effects.hasTeleportation).toBe(false)
    })

    test('returns correct values for single ring', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection +1',
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

      const effects = service.getRingEffects(player)

      expect(effects.acBonus).toBe(1)
      expect(effects.strengthBonus).toBe(0)
      expect(effects.hungerModifier).toBe(1.5) // Base 1.0 + 0.5
    })

    test('returns correct values for multiple rings', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const strengthRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Add Strength +2',
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
          leftRing: protectionRing,
          rightRing: strengthRing,
        },
      }

      const effects = service.getRingEffects(player)

      expect(effects.acBonus).toBe(1)
      expect(effects.strengthBonus).toBe(2)
      expect(effects.hungerModifier).toBe(2.0) // Base 1.0 + 0.5 + 0.5
    })

    test('detects passive abilities correctly', () => {
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

      const stealthRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Stealth',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.STEALTH,
        effect: 'Silent movement',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: regenRing,
          rightRing: stealthRing,
        },
      }

      const effects = service.getRingEffects(player)

      expect(effects.hasRegeneration).toBe(true)
      expect(effects.hasStealth).toBe(true)
      expect(effects.hasSearching).toBe(false)
      expect(effects.hasSeeInvisible).toBe(false)
    })
  })
})
