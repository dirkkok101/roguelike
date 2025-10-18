import { SeededRandom, MockRandom } from './RandomService'

describe('RandomService Determinism', () => {
  describe('SeededRandom state capture/restore', () => {
    it('should capture and restore state correctly', () => {
      const rng = new SeededRandom('test-seed')

      // Generate some numbers
      const val1 = rng.nextInt(1, 100)
      const val2 = rng.nextInt(1, 100)

      // Capture state
      const state = rng.getState()
      expect(state).toBeDefined()
      expect(typeof state).toBe('string')

      // Generate more numbers
      const val3 = rng.nextInt(1, 100)
      const val4 = rng.nextInt(1, 100)

      // Restore state
      rng.setState(state)

      // Should produce same sequence as after state capture
      expect(rng.nextInt(1, 100)).toBe(val3)
      expect(rng.nextInt(1, 100)).toBe(val4)
    })

    it('should produce same sequence after state restore', () => {
      const rng1 = new SeededRandom('determinism-test')
      const rng2 = new SeededRandom('different-seed')

      // Generate sequence in rng1
      const sequence1 = [
        rng1.nextInt(1, 100),
        rng1.nextInt(1, 100),
        rng1.nextInt(1, 100)
      ]

      // Capture state after 3 calls
      const state = rng1.getState()

      // Continue generating in rng1
      const sequence2 = [
        rng1.nextInt(1, 100),
        rng1.nextInt(1, 100)
      ]

      // Restore state to rng2
      rng2.setState(state)

      // rng2 should produce same sequence as rng1's sequence2
      expect(rng2.nextInt(1, 100)).toBe(sequence2[0])
      expect(rng2.nextInt(1, 100)).toBe(sequence2[1])
    })

    it('should handle multiple captures in sequence', () => {
      const rng = new SeededRandom('multi-capture')

      // First capture
      const state1 = rng.getState()
      const val1 = rng.nextInt(1, 100)

      // Second capture
      const state2 = rng.getState()
      const val2 = rng.nextInt(1, 100)

      // Third capture
      const state3 = rng.getState()
      const val3 = rng.nextInt(1, 100)

      // Restore to state2
      rng.setState(state2)
      expect(rng.nextInt(1, 100)).toBe(val2)

      // Restore to state1
      rng.setState(state1)
      expect(rng.nextInt(1, 100)).toBe(val1)

      // Restore to state3
      rng.setState(state3)
      expect(rng.nextInt(1, 100)).toBe(val3)
    })

    it('should serialize/deserialize state correctly', () => {
      const rng = new SeededRandom('serialize-test')

      // Generate some values
      rng.nextInt(1, 100)
      rng.nextInt(1, 100)

      // Capture state
      const state = rng.getState()

      // State should be a valid string representation of a number
      expect(state).toMatch(/^\d+$/)

      // Should be able to parse back
      const parsed = parseInt(state, 10)
      expect(parsed).not.toBeNaN()
      expect(parsed).toBeGreaterThan(0)

      // Restore and verify it works
      rng.setState(state)
      const next = rng.nextInt(1, 100)
      expect(next).toBeGreaterThanOrEqual(1)
      expect(next).toBeLessThanOrEqual(100)
    })

    it('should work with existing seed-based tests', () => {
      // Create two RNGs with same seed
      const rng1 = new SeededRandom('same-seed')
      const rng2 = new SeededRandom('same-seed')

      // They should produce same initial values
      expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))
      expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))

      // Capture state from rng1
      const state = rng1.getState()

      // Generate more in rng1
      const val1 = rng1.nextInt(1, 100)

      // Restore state to rng2 (which is now behind)
      rng2.setState(state)

      // They should be in sync again
      expect(rng2.nextInt(1, 100)).toBe(val1)
    })

    it('should maintain determinism with dice rolls', () => {
      const rng = new SeededRandom('dice-test')

      // Roll some dice
      rng.roll('2d6')
      rng.roll('1d20')

      // Capture state
      const state = rng.getState()

      // Roll more dice
      const damage = rng.roll('3d8+5')

      // Restore state
      rng.setState(state)

      // Should get same damage roll
      expect(rng.roll('3d8+5')).toBe(damage)
    })

    it('should maintain determinism with chance()', () => {
      const rng = new SeededRandom('chance-test')

      // Some chance checks
      rng.chance(0.5)
      rng.chance(0.8)

      // Capture state
      const state = rng.getState()

      // More chance checks
      const result1 = rng.chance(0.3)
      const result2 = rng.chance(0.7)

      // Restore state
      rng.setState(state)

      // Should get same results
      expect(rng.chance(0.3)).toBe(result1)
      expect(rng.chance(0.7)).toBe(result2)
    })
  })

  describe('MockRandom state capture/restore', () => {
    it('should capture and restore state correctly', () => {
      const mock = new MockRandom([10, 20, 30, 40, 50])

      // Consume some values
      expect(mock.nextInt(0, 100)).toBe(10)
      expect(mock.nextInt(0, 100)).toBe(20)

      // Capture state
      const state = mock.getState()

      // Consume more values
      expect(mock.nextInt(0, 100)).toBe(30)
      expect(mock.nextInt(0, 100)).toBe(40)

      // Restore state
      mock.setState(state)

      // Should replay from captured point
      expect(mock.nextInt(0, 100)).toBe(30)
      expect(mock.nextInt(0, 100)).toBe(40)
    })

    it('should serialize state to JSON', () => {
      const mock = new MockRandom([1, 2, 3])
      mock.nextInt(0, 10) // Consume first value

      const state = mock.getState()

      // Should be valid JSON
      const parsed = JSON.parse(state)
      expect(parsed.index).toBe(1)
      expect(parsed.values).toEqual([1, 2, 3])
    })

    it('should deserialize state from JSON', () => {
      const mock = new MockRandom()

      // Set state from JSON string
      const state = JSON.stringify({ index: 2, values: [100, 200, 300] })
      mock.setState(state)

      // Should start from index 2
      expect(mock.nextInt(0, 1000)).toBe(300)
    })
  })
})
