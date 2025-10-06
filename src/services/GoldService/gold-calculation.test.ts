import { GoldService } from './GoldService'
import { MockRandom } from '@services/RandomService'

describe('GoldService - Gold Calculation', () => {
  let service: GoldService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new GoldService(mockRandom)
  })

  describe('calculateGoldAmount()', () => {
    test('Level 1: returns 2-61 gold (formula: rnd(50 + 10*1) + 2)', () => {
      // Test minimum: rnd(60) returns 0 → 0 + 2 = 2
      mockRandom.setValues([0])
      expect(service.calculateGoldAmount(1)).toBe(2)

      // Test maximum: rnd(60) returns 60 → 60 + 2 = 62
      mockRandom.setValues([60])
      expect(service.calculateGoldAmount(1)).toBe(62)

      // Test mid-range: rnd(60) returns 30 → 30 + 2 = 32
      mockRandom.setValues([30])
      expect(service.calculateGoldAmount(1)).toBe(32)
    })

    test('Level 5: returns 2-102 gold (formula: rnd(50 + 10*5) + 2)', () => {
      // Test minimum: rnd(100) returns 0 → 0 + 2 = 2
      mockRandom.setValues([0])
      expect(service.calculateGoldAmount(5)).toBe(2)

      // Test maximum: rnd(100) returns 100 → 100 + 2 = 102
      mockRandom.setValues([100])
      expect(service.calculateGoldAmount(5)).toBe(102)

      // Test mid-range: rnd(100) returns 50 → 50 + 2 = 52
      mockRandom.setValues([50])
      expect(service.calculateGoldAmount(5)).toBe(52)
    })

    test('Level 10: returns 2-152 gold (formula: rnd(50 + 10*10) + 2)', () => {
      // Test minimum: rnd(150) returns 0 → 0 + 2 = 2
      mockRandom.setValues([0])
      expect(service.calculateGoldAmount(10)).toBe(2)

      // Test maximum: rnd(150) returns 150 → 150 + 2 = 152
      mockRandom.setValues([150])
      expect(service.calculateGoldAmount(10)).toBe(152)

      // Test mid-range: rnd(150) returns 75 → 75 + 2 = 77
      mockRandom.setValues([75])
      expect(service.calculateGoldAmount(10)).toBe(77)
    })

    test('Depth 0: edge case (formula: rnd(50 + 10*0) + 2 = rnd(50) + 2)', () => {
      // Minimum
      mockRandom.setValues([0])
      expect(service.calculateGoldAmount(0)).toBe(2)

      // Maximum
      mockRandom.setValues([50])
      expect(service.calculateGoldAmount(0)).toBe(52)
    })

    test('Gold amount scales correctly with depth', () => {
      // Use consistent mid-range roll (50% of max) to verify scaling
      const depths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const expected = depths.map(d => {
        const max = 50 + 10 * d
        return Math.floor(max / 2) + 2
      })

      depths.forEach((depth, i) => {
        const max = 50 + 10 * depth
        const midRoll = Math.floor(max / 2)
        mockRandom.setValues([midRoll])
        expect(service.calculateGoldAmount(depth)).toBe(expected[i])
      })
    })

    test('Formula matches Rogue 1980 GOLDCALC exactly', () => {
      // Rogue 1980: #define GOLDCALC (rnd(50 + 10 * level) + 2)
      // Our implementation: random(50 + 10 * depth) + 2

      const testCases = [
        { depth: 1, roll: 25, expected: 27 },  // 25 + 2
        { depth: 3, roll: 40, expected: 42 },  // 40 + 2
        { depth: 7, roll: 60, expected: 62 },  // 60 + 2
        { depth: 10, roll: 100, expected: 102 }, // 100 + 2
      ]

      testCases.forEach(({ depth, roll, expected }) => {
        mockRandom.setValues([roll])
        expect(service.calculateGoldAmount(depth)).toBe(expected)
      })
    })
  })
})
