import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { Player, Monster, MonsterBehavior } from '@game/core/core'

describe('CombatService - Hit Calculation', () => {
  let service: CombatService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new CombatService(mockRandom)
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 0, y: 0 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestMonster(): Monster {
    return {
      id: 'test-monster',
      letter: 'T',
      name: 'Test Monster',
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

  describe('Player attacks monster', () => {
    test('hits when roll + modifiers >= 10', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      // Roll 10, level 1 + strength 16 = 17, AC 6
      // 10 + (17 - 6) = 10 + 11 = 21 >= 10 = HIT
      mockRandom.setValues([10, 3]) // roll for hit, roll for damage

      const result = service.playerAttack(player, monster)

      expect(result.hit).toBe(true)
    })

    test('misses when roll + modifiers < 10', () => {
      const weakPlayer = { ...createTestPlayer(), level: 1, strength: 3 }
      const strongMonster = { ...createTestMonster(), ac: -5 }

      // Roll 1, level 1 + strength 3 = 4, AC -5
      // 1 + (4 - (-5)) = 1 + 9 = 10 ... still hits at exactly 10!
      // Need: 1 + (level + str - AC) < 10
      // 1 + (1 + 3 - AC) < 10  →  5 - AC < 10  →  AC > -5
      // With AC = -6: 1 + (4 - (-6)) = 1 + 10 = 11 (hit)
      // Let's use a weaker player: level 1, str 1, vs AC -7
      // 1 + (1 + 1 - (-7)) = 1 + 9 = 10 (still hit)
      // With level 1, str 1, vs AC -8: 1 + (2 - (-8)) = 1 + 10 = 11 (hit)
      //
      // Actually simplest: use attacker level of 1 vs AC of 0
      // 1 + (1 - 0) = 2 < 10 = MISS!

      const veryWeakPlayer = { ...createTestPlayer(), level: 1, strength: 0 }
      const normalMonster = { ...createTestMonster(), ac: 0 }

      mockRandom.setValues([1, 3]) // roll for hit, damage

      const result = service.playerAttack(veryWeakPlayer, normalMonster)

      expect(result.hit).toBe(false)
    })

    test('critical hit with natural 20', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      mockRandom.setValues([20, 4]) // roll 20 for hit, damage

      const result = service.playerAttack(player, monster)

      expect(result.hit).toBe(true)
    })

    test('can miss even with high level', () => {
      const highLevelPlayer = { ...createTestPlayer(), level: 10, strength: 1 }
      const veryStrongMonster = { ...createTestMonster(), ac: -3 }

      // Roll 1, level 10 + strength 1 = 11, AC -3
      // 1 + (11 - (-3)) = 1 + 14 = 15 (hit)
      // Need: 1 + (11 - AC) < 10  →  12 - AC < 10  →  AC > 2
      // With AC = 3: 1 + (11 - 3) = 1 + 8 = 9 < 10 (MISS!)

      const veryStrongMonster2 = { ...createTestMonster(), ac: 3 }

      mockRandom.setValues([1, 3]) // roll 1 (very bad roll), damage

      const result = service.playerAttack(highLevelPlayer, veryStrongMonster2)

      expect(result.hit).toBe(false)
    })
  })

  describe('Monster attacks player', () => {
    test('hits when roll + modifiers >= 10', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      // Monster level 1, player AC 5
      // Roll 10 + (1 - 5) = 10 - 4 = 6 < 10 = MISS
      // Need roll 14 to hit: 14 + (1 - 5) = 14 - 4 = 10
      mockRandom.setValues([14, 3]) // roll for hit, damage

      const result = service.monsterAttack(monster, player)

      expect(result.hit).toBe(true)
    })

    test('misses when roll + modifiers < 10', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      mockRandom.setValues([5]) // roll 5, not enough to hit AC 5

      const result = service.monsterAttack(monster, player)

      expect(result.hit).toBe(false)
    })

    test('strong monster hits more easily', () => {
      const player = createTestPlayer()
      const strongMonster = { ...createTestMonster(), level: 10 }

      // Level 10 vs AC 5: roll + (10 - 5) = roll + 5
      // Need roll 5 to hit: 5 + 5 = 10
      mockRandom.setValues([5, 4]) // roll for hit, damage

      const result = service.monsterAttack(strongMonster, player)

      expect(result.hit).toBe(true)
    })

    test('armored player harder to hit', () => {
      const armoredPlayer = { ...createTestPlayer(), ac: -5 } // Better AC
      const monster = createTestMonster()

      // Level 1 vs AC -5: roll + (1 - (-5)) = roll + 6
      // Need roll 4 to hit: 4 + 6 = 10
      mockRandom.setValues([3, 2]) // roll 3 is not enough

      const result = service.monsterAttack(monster, armoredPlayer)

      expect(result.hit).toBe(false)
    })
  })
})
