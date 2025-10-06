import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '@services/RandomService'
import { Monster, MonsterBehavior } from '@game/core/core'

describe('SpecialAbilityService - Regeneration', () => {
  let service: SpecialAbilityService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new SpecialAbilityService(mockRandom)
  })

  function createTestMonster(overrides?: Partial<Monster>): Monster {
    return {
      id: 'troll',
      letter: 'T',
      name: 'Troll',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 20,
      ac: 6,
      damage: '1d8+1d8',
      xpValue: 50,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['regenerates'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
      ...overrides,
    }
  }

  test('regenerates 1 HP when below max', () => {
    const monster = createTestMonster({ hp: 10, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster).toBeDefined()
    expect(result.monster!.hp).toBe(11)
  })

  test('does not regenerate when at max HP', () => {
    const monster = createTestMonster({ hp: 20, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster!.hp).toBe(20)
  })

  test('does not exceed max HP', () => {
    const monster = createTestMonster({ hp: 20, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster!.hp).toBe(20)
  })

  test('regenerates when at 1 HP', () => {
    const monster = createTestMonster({ hp: 1, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster!.hp).toBe(2)
  })

  test('caps at max HP when one below', () => {
    const monster = createTestMonster({ hp: 19, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster!.hp).toBe(20)
  })

  test('returns new monster object (immutability)', () => {
    const monster = createTestMonster({ hp: 10, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster).not.toBe(monster)
    expect(monster.hp).toBe(10)
  })

  test('returns same monster when at max (no change)', () => {
    const monster = createTestMonster({ hp: 20, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.monster).toBe(monster)
  })

  test('returns no messages', () => {
    const monster = createTestMonster({ hp: 10, maxHp: 20 })

    const result = service.regenerate(monster)

    expect(result.messages).toHaveLength(0)
  })
})
