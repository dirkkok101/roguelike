import { GoldService } from './GoldService'
import { MockRandom } from '@services/RandomService'

describe('GoldService - Leprechaun Formulas', () => {
  let service: GoldService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new GoldService(mockRandom)
  })

  describe('calculateLeprechaunSteal()', () => {
    describe('Saving throw mechanics', () => {
      test('successful save (level + strength) / 2 >= 10: steals 1x GOLDCALC', () => {
        // Level 5, Strength 15: (5 + 15) / 2 = 10 (exactly meets threshold)
        mockRandom.setValues([50]) // GOLDCALC = 50 + 2 = 52 on level 5
        const stolen = service.calculateLeprechaunSteal(1000, 5, 15, 5)
        expect(stolen).toBe(52) // 1x GOLDCALC
      })

      test('failed save (level + strength) / 2 < 10: steals 5x GOLDCALC', () => {
        // Level 1, Strength 10: (1 + 10) / 2 = 5.5 (below threshold)
        mockRandom.setValues([30]) // GOLDCALC = 30 + 2 = 32 on level 5
        const stolen = service.calculateLeprechaunSteal(1000, 1, 10, 5)
        expect(stolen).toBe(160) // 5x GOLDCALC (32 * 5 = 160)
      })

      test('high level player makes save easily', () => {
        // Level 10, Strength 18: (10 + 18) / 2 = 14 (well above threshold)
        mockRandom.setValues([100]) // GOLDCALC = 100 + 2 = 102 on level 10
        const stolen = service.calculateLeprechaunSteal(1000, 10, 18, 10)
        expect(stolen).toBe(102) // 1x GOLDCALC (successful save)
      })

      test('low level player fails save', () => {
        // Level 1, Strength 8: (1 + 8) / 2 = 4.5 (well below threshold)
        mockRandom.setValues([20]) // GOLDCALC = 20 + 2 = 22 on level 1
        const stolen = service.calculateLeprechaunSteal(1000, 1, 8, 1)
        expect(stolen).toBe(110) // 5x GOLDCALC (22 * 5 = 110)
      })
    })

    describe('Gold amount constraints', () => {
      test('cannot steal more gold than player has (failed save)', () => {
        // Failed save would steal 5x GOLDCALC
        mockRandom.setValues([50]) // GOLDCALC = 52, 5x = 260
        const stolen = service.calculateLeprechaunSteal(100, 1, 10, 5) // Player has 100 gold
        expect(stolen).toBe(100) // Caps at player's gold
      })

      test('cannot steal more gold than player has (successful save)', () => {
        // Successful save would steal 1x GOLDCALC
        mockRandom.setValues([50]) // GOLDCALC = 52
        const stolen = service.calculateLeprechaunSteal(40, 5, 15, 5) // Player has 40 gold
        expect(stolen).toBe(40) // Caps at player's gold
      })

      test('steals 0 when player has no gold', () => {
        mockRandom.setValues([100])
        const stolen = service.calculateLeprechaunSteal(0, 5, 15, 5)
        expect(stolen).toBe(0)
      })

      test('can steal exact player gold amount', () => {
        // Player has exactly 1x GOLDCALC
        mockRandom.setValues([48]) // GOLDCALC = 48 + 2 = 50
        const stolen = service.calculateLeprechaunSteal(50, 5, 15, 5) // Successful save
        expect(stolen).toBe(50) // Takes all
      })
    })

    describe('Depth scaling', () => {
      test('level 1 leprechaun steals less than level 10 (failed save)', () => {
        mockRandom.setValues([30, 80]) // Two GOLDCALC rolls

        const stolenL1 = service.calculateLeprechaunSteal(1000, 1, 10, 1) // Failed save
        const stolenL10 = service.calculateLeprechaunSteal(1000, 1, 10, 10) // Failed save

        expect(stolenL10).toBeGreaterThan(stolenL1) // Deeper levels = more stolen
      })
    })
  })

  describe('calculateLeprechaunDrop()', () => {
    describe('Saving throw mechanics (inverted from steal)', () => {
      test('successful save (level + strength) / 2 >= 10: drops 5x GOLDCALC', () => {
        // Level 5, Strength 15: (5 + 15) / 2 = 10 (successful save)
        mockRandom.setValues([50]) // GOLDCALC = 50 + 2 = 52 on level 5
        const dropped = service.calculateLeprechaunDrop(5, 15, 5)
        expect(dropped).toBe(260) // 5x GOLDCALC (52 * 5)
      })

      test('failed save (level + strength) / 2 < 10: drops 1x GOLDCALC', () => {
        // Level 1, Strength 10: (1 + 10) / 2 = 5.5 (failed save)
        mockRandom.setValues([30]) // GOLDCALC = 30 + 2 = 32 on level 5
        const dropped = service.calculateLeprechaunDrop(1, 10, 5)
        expect(dropped).toBe(32) // 1x GOLDCALC
      })

      test('high level player gets 5x drop (successful save)', () => {
        // Level 10, Strength 18: (10 + 18) / 2 = 14
        mockRandom.setValues([100]) // GOLDCALC = 100 + 2 = 102 on level 10
        const dropped = service.calculateLeprechaunDrop(10, 18, 10)
        expect(dropped).toBe(510) // 5x GOLDCALC (102 * 5)
      })

      test('low level player gets 1x drop (failed save)', () => {
        // Level 1, Strength 8: (1 + 8) / 2 = 4.5
        mockRandom.setValues([20]) // GOLDCALC = 20 + 2 = 22 on level 1
        const dropped = service.calculateLeprechaunDrop(1, 8, 1)
        expect(dropped).toBe(22) // 1x GOLDCALC
      })
    })

    describe('Depth scaling', () => {
      test('deeper levels drop more gold (successful save)', () => {
        mockRandom.setValues([30, 80]) // Two GOLDCALC rolls

        const droppedL1 = service.calculateLeprechaunDrop(5, 15, 1) // Successful save
        const droppedL10 = service.calculateLeprechaunDrop(5, 15, 10) // Successful save

        expect(droppedL10).toBeGreaterThan(droppedL1)
      })

      test('deeper levels drop more gold (failed save)', () => {
        mockRandom.setValues([30, 80]) // Two GOLDCALC rolls

        const droppedL1 = service.calculateLeprechaunDrop(1, 10, 1) // Failed save
        const droppedL10 = service.calculateLeprechaunDrop(1, 10, 10) // Failed save

        expect(droppedL10).toBeGreaterThan(droppedL1)
      })
    })

    describe('Steal and drop are inverse', () => {
      test('successful save: steal 1x, drop 5x', () => {
        mockRandom.setValues([40, 40]) // Same GOLDCALC for both

        const stolen = service.calculateLeprechaunSteal(1000, 5, 15, 5) // Save succeeds
        const dropped = service.calculateLeprechaunDrop(5, 15, 5) // Save succeeds

        expect(stolen).toBe(42) // 1x (40 + 2)
        expect(dropped).toBe(210) // 5x (40 + 2) * 5
        expect(dropped).toBe(stolen * 5) // Drop is 5x steal
      })

      test('failed save: steal 5x, drop 1x', () => {
        mockRandom.setValues([40, 40]) // Same GOLDCALC for both

        const stolen = service.calculateLeprechaunSteal(1000, 1, 10, 5) // Save fails
        const dropped = service.calculateLeprechaunDrop(1, 10, 5) // Save fails

        expect(stolen).toBe(210) // 5x (40 + 2) * 5
        expect(dropped).toBe(42) // 1x (40 + 2)
        expect(stolen).toBe(dropped * 5) // Steal is 5x drop
      })
    })
  })

  describe('Edge cases', () => {
    test('exact save threshold (10) should succeed', () => {
      // (5 + 15) / 2 = 10 exactly
      mockRandom.setValues([50])
      const stolen = service.calculateLeprechaunSteal(1000, 5, 15, 5)
      expect(stolen).toBe(52) // 1x GOLDCALC (successful save)
    })

    test('just below save threshold (9.5) should fail', () => {
      // (4 + 15) / 2 = 9.5
      mockRandom.setValues([50])
      const stolen = service.calculateLeprechaunSteal(1000, 4, 15, 5)
      expect(stolen).toBe(260) // 5x GOLDCALC (failed save)
    })

    test('handles minimum viable stats', () => {
      // Level 1, Strength 1: (1 + 1) / 2 = 1 (definitely fails)
      mockRandom.setValues([10])
      const stolen = service.calculateLeprechaunSteal(1000, 1, 1, 1)
      expect(stolen).toBeGreaterThan(0)
    })

    test('handles maximum viable stats', () => {
      // Level 20, Strength 20: (20 + 20) / 2 = 20 (definitely succeeds)
      mockRandom.setValues([100])
      const dropped = service.calculateLeprechaunDrop(20, 20, 10)
      expect(dropped).toBeGreaterThan(0)
    })
  })
})
