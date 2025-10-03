import { MockRandom } from './RandomService'

describe('MockRandom - Testing Helper', () => {
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
