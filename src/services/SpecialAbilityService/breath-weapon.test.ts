import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '../RandomService'
import { Monster, MonsterBehavior } from '../../types/core/core'

describe('SpecialAbilityService - Breath Weapon', () => {
  let service: SpecialAbilityService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new SpecialAbilityService(mockRandom)
  })

  function createDragon(): Monster {
    return {
      id: 'dragon',
      letter: 'D',
      name: 'Dragon',
      position: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      ac: 3,
      damage: '1d8/1d8/3d10',
      xpValue: 500,
      aiProfile: {
        behavior: MonsterBehavior.SMART,
        intelligence: 10,
        aggroRange: 15,
        fleeThreshold: 0,
        special: ['breathes_fire'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }
  }

  function createNonDragon(): Monster {
    return {
      id: 'troll',
      letter: 'T',
      name: 'Troll',
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 50,
      ac: 6,
      damage: '1d8+1d8',
      xpValue: 50,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }
  }

  describe('hasBreathWeapon', () => {
    test('returns true for Dragon', () => {
      const dragon = createDragon()

      expect(service.hasBreathWeapon(dragon)).toBe(true)
    })

    test('returns false for non-Dragon', () => {
      const troll = createNonDragon()

      expect(service.hasBreathWeapon(troll)).toBe(false)
    })
  })

  describe('rollBreathWeaponDamage', () => {
    test('rolls 6d6 damage for Dragon', () => {
      const dragon = createDragon()

      mockRandom.setValues([3, 4, 5, 6, 2, 1]) // 6d6 = 21

      const damage = service.rollBreathWeaponDamage(dragon)

      expect(damage).toBeGreaterThan(0)
    })

    test('returns 0 for non-Dragon', () => {
      const troll = createNonDragon()

      const damage = service.rollBreathWeaponDamage(troll)

      expect(damage).toBe(0)
    })

    test('damage varies based on dice rolls', () => {
      const dragon = createDragon()

      mockRandom.setValues([6, 6, 6, 6, 6, 6]) // Max: 36

      const damage = service.rollBreathWeaponDamage(dragon)

      expect(damage).toBeGreaterThan(0)
    })
  })

  describe('shouldUseBreathWeapon', () => {
    test('returns true when Dragon and chance succeeds', () => {
      const dragon = createDragon()

      mockRandom.setValues([1]) // 40% chance succeeds

      expect(service.shouldUseBreathWeapon(dragon)).toBe(true)
    })

    test('returns false when Dragon but chance fails', () => {
      const dragon = createDragon()

      mockRandom.setValues([0]) // 40% chance fails

      expect(service.shouldUseBreathWeapon(dragon)).toBe(false)
    })

    test('returns false for non-Dragon', () => {
      const troll = createNonDragon()

      mockRandom.setValues([1]) // Even if chance succeeds

      expect(service.shouldUseBreathWeapon(troll)).toBe(false)
    })
  })
})
