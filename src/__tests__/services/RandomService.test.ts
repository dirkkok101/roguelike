import { SeededRandom, MockRandom } from '@services/RandomService'

describe('SeededRandom', () => {
  test('same seed produces same results', () => {
    const rng1 = new SeededRandom('test123')
    const rng2 = new SeededRandom('test123')

    expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))
    expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))
  })

  test('different seeds produce different results', () => {
    const rng1 = new SeededRandom('seed1')
    const rng2 = new SeededRandom('seed2')

    expect(rng1.nextInt(1, 100)).not.toBe(rng2.nextInt(1, 100))
  })

  test('roll parses dice notation correctly', () => {
    const rng = new SeededRandom('test')
    const result = rng.roll('2d6')
    expect(result).toBeGreaterThanOrEqual(2)
    expect(result).toBeLessThanOrEqual(12)
  })

  test('roll handles modifiers', () => {
    const rng = new SeededRandom('test')
    const result = rng.roll('1d20+5')
    expect(result).toBeGreaterThanOrEqual(6)
    expect(result).toBeLessThanOrEqual(25)
  })

  test('roll handles negative modifiers', () => {
    const rng = new SeededRandom('test')
    const result = rng.roll('1d20-5')
    expect(result).toBeGreaterThanOrEqual(-4)
    expect(result).toBeLessThanOrEqual(15)
  })

  test('chance works correctly', () => {
    const rng = new SeededRandom('test')
    let trueCount = 0
    for (let i = 0; i < 100; i++) {
      if (rng.chance(1.0)) trueCount++
    }
    expect(trueCount).toBe(100) // 100% chance should always be true
  })

  test('pickRandom returns element from array', () => {
    const rng = new SeededRandom('test')
    const arr = ['a', 'b', 'c']
    const picked = rng.pickRandom(arr)
    expect(arr).toContain(picked)
  })
})

describe('MockRandom', () => {
  test('returns preset values', () => {
    const mock = new MockRandom([5, 10, 15])
    expect(mock.nextInt(0, 100)).toBe(5)
    expect(mock.nextInt(0, 100)).toBe(10)
    expect(mock.nextInt(0, 100)).toBe(15)
  })

  test('throws when no more values', () => {
    const mock = new MockRandom([5])
    mock.nextInt(0, 100)
    expect(() => mock.nextInt(0, 100)).toThrow()
  })

  test('setValues resets index', () => {
    const mock = new MockRandom([5])
    mock.nextInt(0, 100)
    mock.setValues([10, 20])
    expect(mock.nextInt(0, 100)).toBe(10)
    expect(mock.nextInt(0, 100)).toBe(20)
  })
})
