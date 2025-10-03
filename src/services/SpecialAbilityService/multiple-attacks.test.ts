import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '../RandomService'

describe('SpecialAbilityService - Multiple Attacks', () => {
  let service: SpecialAbilityService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new SpecialAbilityService(mockRandom)
  })

  describe('parseMultipleAttacks', () => {
    test('parses single attack', () => {
      const result = service.parseMultipleAttacks('1d6')

      expect(result).toEqual(['1d6'])
    })

    test('parses two attacks', () => {
      const result = service.parseMultipleAttacks('1d4/1d4')

      expect(result).toEqual(['1d4', '1d4'])
    })

    test('parses three attacks (Griffin)', () => {
      const result = service.parseMultipleAttacks('1d2/1d5/1d5')

      expect(result).toEqual(['1d2', '1d5', '1d5'])
    })

    test('parses Dragon attacks', () => {
      const result = service.parseMultipleAttacks('1d8/1d8/3d10')

      expect(result).toEqual(['1d8', '1d8', '3d10'])
    })

    test('parses four attacks', () => {
      const result = service.parseMultipleAttacks('1d3/1d3/1d3/1d3')

      expect(result).toEqual(['1d3', '1d3', '1d3', '1d3'])
    })

    test('preserves dice modifiers', () => {
      const result = service.parseMultipleAttacks('1d6+1/2d4-1')

      expect(result).toEqual(['1d6+1', '2d4-1'])
    })

    test('returns array with length matching attack count', () => {
      const single = service.parseMultipleAttacks('2d6')
      const triple = service.parseMultipleAttacks('1d4/1d6/1d8')

      expect(single).toHaveLength(1)
      expect(triple).toHaveLength(3)
    })
  })
})
