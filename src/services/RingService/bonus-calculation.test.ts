import { RingService } from './RingService'
import { Player, Ring, RingType, ItemType } from '@game/core/core'

describe('RingService - Bonus Calculations', () => {
  let service: RingService
  let basePlayer: Player

  beforeEach(() => {
    service = new RingService()

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
  // getACBonus() - AC bonus from PROTECTION + DEXTERITY rings
  // ============================================================================

  describe('getACBonus', () => {
    test('returns 0 when no rings equipped', () => {
      expect(service.getACBonus(basePlayer)).toBe(0)
    })

    test('returns bonus from PROTECTION ring', () => {
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

      expect(service.getACBonus(player)).toBe(1)
    })

    test('returns bonus from DEXTERITY ring', () => {
      const dexRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: dexRing,
        },
      }

      expect(service.getACBonus(player)).toBe(2)
    })

    test('stacks PROTECTION and DEXTERITY bonuses', () => {
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

      const dexRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protectionRing,
          rightRing: dexRing,
        },
      }

      // 1 (PROTECTION) + 2 (DEXTERITY) = 3
      expect(service.getACBonus(player)).toBe(3)
    })

    test('stacks two PROTECTION rings', () => {
      const protection1: Ring = {
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

      const protection2: Ring = {
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
          leftRing: protection1,
          rightRing: protection2,
        },
      }

      expect(service.getACBonus(player)).toBe(3)
    })

    test('stacks two DEXTERITY rings', () => {
      const dex1: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 1,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const dex2: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: dex1,
          rightRing: dex2,
        },
      }

      expect(service.getACBonus(player)).toBe(3)
    })

    test('handles cursed PROTECTION ring (negative bonus worsens AC)', () => {
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

      // Negative bonus worsens AC (AC 10 - (-2) = AC 12, worse)
      expect(service.getACBonus(player)).toBe(-2)
    })

    test('handles cursed DEXTERITY ring (negative bonus worsens AC)', () => {
      const cursedDex: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity -1 (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: -1,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: cursedDex,
        },
      }

      expect(service.getACBonus(player)).toBe(-1)
    })

    test('handles mixed cursed and blessed rings', () => {
      const cursedProtection: Ring = {
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

      const blessedDex: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: cursedProtection,
          rightRing: blessedDex,
        },
      }

      // -1 + 2 = 1
      expect(service.getACBonus(player)).toBe(1)
    })

    test('ignores non-AC rings (ADD_STRENGTH, REGENERATION, etc.)', () => {
      const strengthRing: Ring = {
        id: 'ring-1',
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
          leftRing: strengthRing,
          rightRing: regenRing,
        },
      }

      // Neither ring affects AC
      expect(service.getACBonus(player)).toBe(0)
    })
  })

  // ============================================================================
  // getStrengthBonus() - Strength bonus from ADD_STRENGTH rings
  // ============================================================================

  describe('getStrengthBonus', () => {
    test('returns 0 when no rings equipped', () => {
      expect(service.getStrengthBonus(basePlayer)).toBe(0)
    })

    test('returns bonus from single ADD_STRENGTH ring', () => {
      const strengthRing: Ring = {
        id: 'ring-1',
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
          leftRing: strengthRing,
        },
      }

      expect(service.getStrengthBonus(player)).toBe(2)
    })

    test('stacks two ADD_STRENGTH rings', () => {
      const strength1: Ring = {
        id: 'ring-1',
        name: 'Ring of Add Strength +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 1,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const strength2: Ring = {
        id: 'ring-2',
        name: 'Ring of Add Strength +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 2,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: strength1,
          rightRing: strength2,
        },
      }

      expect(service.getStrengthBonus(player)).toBe(3)
    })

    test('handles cursed ADD_STRENGTH ring (negative bonus)', () => {
      const cursedStrength: Ring = {
        id: 'ring-1',
        name: 'Ring of Add Strength -2 (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: -2,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: cursedStrength,
        },
      }

      expect(service.getStrengthBonus(player)).toBe(-2)
    })

    test('ignores non-strength rings', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
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

      const dexRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +1',
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
          leftRing: protectionRing,
          rightRing: dexRing,
        },
      }

      expect(service.getStrengthBonus(player)).toBe(0)
    })
  })

  // ============================================================================
  // getDexterityBonus() - Dexterity bonus from DEXTERITY rings
  // ============================================================================

  describe('getDexterityBonus', () => {
    test('returns 0 when no rings equipped', () => {
      expect(service.getDexterityBonus(basePlayer)).toBe(0)
    })

    test('returns bonus from single DEXTERITY ring', () => {
      const dexRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: dexRing,
        },
      }

      expect(service.getDexterityBonus(player)).toBe(2)
    })

    test('stacks two DEXTERITY rings', () => {
      const dex1: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 1,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const dex2: Ring = {
        id: 'ring-2',
        name: 'Ring of Dexterity +2',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: 2,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: dex1,
          rightRing: dex2,
        },
      }

      expect(service.getDexterityBonus(player)).toBe(3)
    })

    test('handles cursed DEXTERITY ring (negative bonus)', () => {
      const cursedDex: Ring = {
        id: 'ring-1',
        name: 'Ring of Dexterity -1 (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.DEXTERITY,
        effect: 'Improves AC and to-hit',
        bonus: -1,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: cursedDex,
        },
      }

      expect(service.getDexterityBonus(player)).toBe(-1)
    })

    test('ignores non-dexterity rings', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
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

      const strengthRing: Ring = {
        id: 'ring-2',
        name: 'Ring of Add Strength +1',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 1,
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

      expect(service.getDexterityBonus(player)).toBe(0)
    })
  })
})
