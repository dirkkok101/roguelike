import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '@services/RandomService'
import { Player, Monster, MonsterBehavior, Armor } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('SpecialAbilityService - Ability Orchestration', () => {
  let service: SpecialAbilityService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new SpecialAbilityService(mockRandom)
  })

  function createTestMonster(special: string[] = []): Monster {
    return {
      id: 'test-monster',
      letter: 'T',
      name: 'Test Monster',
      spriteName: 'Test Monster',
      position: { x: 1, y: 1 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special,
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
    }
  }

  describe('hasSpecial', () => {
    test('returns true when monster has special ability', () => {
      const monster = createTestMonster(['regenerates'])

      expect(service.hasSpecial(monster, 'regenerates')).toBe(true)
    })

    test('returns false when monster does not have special ability', () => {
      const monster = createTestMonster(['regenerates'])

      expect(service.hasSpecial(monster, 'freezes')).toBe(false)
    })

    test('returns false when monster has no special abilities', () => {
      const monster = createTestMonster([])

      expect(service.hasSpecial(monster, 'regenerates')).toBe(false)
    })

    test('returns false when special array is undefined', () => {
      const monster = createTestMonster()
      monster.aiProfile.special = undefined

      expect(service.hasSpecial(monster, 'regenerates')).toBe(false)
    })

    test('checks for multiple different abilities', () => {
      const monster = createTestMonster(['regenerates', 'freezes', 'drains_xp'])

      expect(service.hasSpecial(monster, 'regenerates')).toBe(true)
      expect(service.hasSpecial(monster, 'freezes')).toBe(true)
      expect(service.hasSpecial(monster, 'drains_xp')).toBe(true)
      expect(service.hasSpecial(monster, 'confuses')).toBe(false)
    })
  })

  describe('applyOnHitAbilities', () => {
    test('applies rust armor ability', () => {
      const armor: Armor = {
        id: 'plate',
        name: 'Plate',
      spriteName: 'Plate',
        type: 'ARMOR',
        identified: true,
        acBonus: 6,
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, armor } }
      const monster = createTestMonster(['rusts_armor'])

      mockRandom.setValues([1]) // Rust succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player).toBeDefined()
      expect((result.player!.equipment.armor as Armor).bonus).toBe(-1)
      expect(result.messages).toContain('Your armor rusts!')
    })

    test('applies freeze ability', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(['freezes'])

      mockRandom.setValues([1]) // Freeze succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.messages).toContain('You are frozen solid!')
    })

    test('applies confuse ability', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(['confuses'])

      mockRandom.setValues([1]) // Confuse succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.messages).toContain('You feel confused!')
    })

    test('applies drain strength ability', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(['drains_strength'])

      mockRandom.setValues([1]) // Drain succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player!.strength).toBe(15)
      expect(result.messages).toContain('You feel weaker!')
    })

    test('applies drain XP ability', () => {
      const player = createTestPlayer({ xp: 100 }) // Start with 100 XP, drain 30, expect 70
      const monster = createTestMonster(['drains_xp'])

      mockRandom.setValues([1, 30]) // Drain succeeds, drain 30

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player!.xp).toBe(70)
      expect(result.messages).toContain('You feel your life force drain away!')
    })

    test('applies drain max HP ability', () => {
      const player = createTestPlayer({ maxHp: 20 }) // Start with 20, drain 1, expect 19
      const monster = createTestMonster(['drains_max_hp'])

      mockRandom.setValues([1]) // Drain succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player!.maxHp).toBe(19)
      expect(result.messages).toContain('You feel your life essence fade!')
    })

    test('applies hold ability', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(['holds'])

      mockRandom.setValues([1]) // Hold succeeds

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.messages).toContain('The flytrap grabs you!')
    })

    test('applies multiple abilities in sequence', () => {
      const player = { ...createTestPlayer(), xp: 100 }
      const monster = createTestMonster(['drains_strength', 'drains_xp'])

      mockRandom.setValues([1, 1, 20]) // Both succeed, drain 20 XP

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player!.strength).toBe(15)
      expect(result.player!.xp).toBe(80)
      expect(result.messages).toContain('You feel weaker!')
      expect(result.messages).toContain('You feel your life force drain away!')
    })

    test('returns unchanged player when no abilities trigger', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(['drains_strength'])

      mockRandom.setValues([0]) // Fails

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player).toBe(player)
      expect(result.messages).toHaveLength(0)
    })

    test('returns unchanged player when monster has no special abilities', () => {
      const player = createTestPlayer()
      const monster = createTestMonster([])

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player).toBe(player)
      expect(result.messages).toHaveLength(0)
    })

    test('chains player state through multiple abilities', () => {
      const player = { ...createTestPlayer(), strength: 16, xp: 100, hp: 20, maxHp: 20 }
      const monster = createTestMonster(['drains_strength', 'drains_xp', 'drains_max_hp'])

      mockRandom.setValues([1, 1, 25, 1]) // All succeed

      const result = service.applyOnHitAbilities(player, monster)

      expect(result.player!.strength).toBe(15)
      expect(result.player!.xp).toBe(75)
      expect(result.player!.maxHp).toBe(19)
      expect(result.player!.hp).toBe(19)
    })
  })
})
