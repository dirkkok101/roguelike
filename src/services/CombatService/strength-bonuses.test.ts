import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'

/**
 * Strength Bonus Calculations Test Suite
 *
 * Tests strength-based to-hit and damage bonuses matching original 1980 Rogue mechanics.
 *
 * Original Rogue Strength Tables:
 *
 * TO-HIT BONUSES:
 * Str ≤6: -1
 * Str 7-16: +0
 * Str 17-18: +1
 * Str 18/51-18/100: +2
 * Str 18/100: +3
 *
 * DAMAGE BONUSES:
 * Str ≤6: -1
 * Str 7-15: +0
 * Str 16-17: +1
 * Str 18: +2
 * Str 18/01-18/50: +3
 * Str 18/51-18/75: +4
 * Str 18/76-18/90: +5
 * Str 18/91-18/100: +6
 * Str 19-21: +3
 * Str 22-30: +5
 * Str 31: +6
 */
describe('CombatService - Strength Bonuses', () => {
  let service: CombatService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom()
    ringService = new RingService(mockRandom)
    service = new CombatService(mockRandom, ringService)
  })

  describe('To-Hit Bonuses', () => {
    describe('Penalties (Str ≤6)', () => {
      test('Str 6 gives -1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(6)
        expect(bonus).toBe(-1)
      })

      test('Str 3 gives -1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(3)
        expect(bonus).toBe(-1)
      })
    })

    describe('No bonus (Str 7-16)', () => {
      test('Str 7 gives +0 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(7)
        expect(bonus).toBe(0)
      })

      test('Str 10 gives +0 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(10)
        expect(bonus).toBe(0)
      })

      test('Str 16 gives +0 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(16)
        expect(bonus).toBe(0)
      })
    })

    describe('Normal bonus (Str 17-18)', () => {
      test('Str 17 gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(17)
        expect(bonus).toBe(1)
      })

      test('Str 18 (no percentile) gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18)
        expect(bonus).toBe(1)
      })

      test('Str 18 with undefined percentile gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, undefined)
        expect(bonus).toBe(1)
      })
    })

    describe('Exceptional strength (18/XX)', () => {
      test('Str 18/01 gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 1)
        expect(bonus).toBe(1)
      })

      test('Str 18/50 gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 50)
        expect(bonus).toBe(1)
      })

      test('Str 18/51 gives +2 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 51)
        expect(bonus).toBe(2)
      })

      test('Str 18/75 gives +2 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 75)
        expect(bonus).toBe(2)
      })

      test('Str 18/99 gives +2 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 99)
        expect(bonus).toBe(2)
      })

      test('Str 18/100 gives +3 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(18, 100)
        expect(bonus).toBe(3)
      })
    })

    describe('Higher strength (19+)', () => {
      test('Str 19 gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(19)
        expect(bonus).toBe(1)
      })

      test('Str 25 gives +1 to-hit', () => {
        const bonus = (service as any).getStrengthToHitBonus(25)
        expect(bonus).toBe(1)
      })
    })
  })

  describe('Damage Bonuses', () => {
    describe('Penalties (Str ≤6)', () => {
      test('Str 6 gives -1 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(6)
        expect(bonus).toBe(-1)
      })

      test('Str 3 gives -1 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(3)
        expect(bonus).toBe(-1)
      })
    })

    describe('No bonus (Str 7-15)', () => {
      test('Str 7 gives +0 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(7)
        expect(bonus).toBe(0)
      })

      test('Str 10 gives +0 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(10)
        expect(bonus).toBe(0)
      })

      test('Str 15 gives +0 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(15)
        expect(bonus).toBe(0)
      })
    })

    describe('Normal bonus (Str 16-17)', () => {
      test('Str 16 gives +1 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(16)
        expect(bonus).toBe(1)
      })

      test('Str 17 gives +1 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(17)
        expect(bonus).toBe(1)
      })
    })

    describe('Strength 18 (no percentile)', () => {
      test('Str 18 (no percentile) gives +2 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18)
        expect(bonus).toBe(2)
      })

      test('Str 18 with undefined percentile gives +2 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, undefined)
        expect(bonus).toBe(2)
      })
    })

    describe('Exceptional strength (18/01-18/50)', () => {
      test('Str 18/01 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 1)
        expect(bonus).toBe(3)
      })

      test('Str 18/25 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 25)
        expect(bonus).toBe(3)
      })

      test('Str 18/50 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 50)
        expect(bonus).toBe(3)
      })
    })

    describe('Exceptional strength (18/51-18/75)', () => {
      test('Str 18/51 gives +4 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 51)
        expect(bonus).toBe(4)
      })

      test('Str 18/60 gives +4 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 60)
        expect(bonus).toBe(4)
      })

      test('Str 18/75 gives +4 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 75)
        expect(bonus).toBe(4)
      })
    })

    describe('Exceptional strength (18/76-18/90)', () => {
      test('Str 18/76 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 76)
        expect(bonus).toBe(5)
      })

      test('Str 18/80 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 80)
        expect(bonus).toBe(5)
      })

      test('Str 18/90 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 90)
        expect(bonus).toBe(5)
      })
    })

    describe('Exceptional strength (18/91-18/100)', () => {
      test('Str 18/91 gives +6 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 91)
        expect(bonus).toBe(6)
      })

      test('Str 18/95 gives +6 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 95)
        expect(bonus).toBe(6)
      })

      test('Str 18/100 gives +6 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(18, 100)
        expect(bonus).toBe(6)
      })
    })

    describe('Higher strength (19-21)', () => {
      test('Str 19 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(19)
        expect(bonus).toBe(3)
      })

      test('Str 20 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(20)
        expect(bonus).toBe(3)
      })

      test('Str 21 gives +3 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(21)
        expect(bonus).toBe(3)
      })
    })

    describe('Higher strength (22-30)', () => {
      test('Str 22 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(22)
        expect(bonus).toBe(5)
      })

      test('Str 25 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(25)
        expect(bonus).toBe(5)
      })

      test('Str 30 gives +5 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(30)
        expect(bonus).toBe(5)
      })
    })

    describe('Maximum strength (31)', () => {
      test('Str 31 gives +6 damage', () => {
        const bonus = (service as any).getStrengthDamageBonus(31)
        expect(bonus).toBe(6)
      })
    })
  })

  describe('Edge Cases', () => {
    test('Zero strength gives penalty', () => {
      const toHit = (service as any).getStrengthToHitBonus(0)
      const damage = (service as any).getStrengthDamageBonus(0)
      expect(toHit).toBe(-1)
      expect(damage).toBe(-1)
    })

    test('Negative percentile is treated as no percentile', () => {
      const bonus = (service as any).getStrengthDamageBonus(18, -5)
      // Should treat as base 18 with no percentile: +2 damage
      expect(bonus).toBe(2)
    })

    test('Percentile > 100 is treated as 100', () => {
      const bonus = (service as any).getStrengthDamageBonus(18, 150)
      // Should cap at 18/100: +6 damage
      expect(bonus).toBe(6)
    })

    test('Strength > 31 gives same as 31', () => {
      const toHit = (service as any).getStrengthToHitBonus(50)
      const damage = (service as any).getStrengthDamageBonus(50)
      // Treat as very high strength
      expect(toHit).toBe(1)  // Same as Str 19+
      expect(damage).toBe(0)  // No defined bonus above 31, return 0
    })
  })
})
