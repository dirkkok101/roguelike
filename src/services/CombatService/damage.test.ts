import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Monster, Weapon, MonsterBehavior } from '@game/core/core'

describe('CombatService - Damage Calculation', () => {
  let service: CombatService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom()
    ringService = new RingService(mockRandom)
    service = new CombatService(mockRandom, ringService)
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 0, y: 0 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      strengthPercentile: undefined,
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
      statusEffects: [],
      energy: 100,
      isRunning: false,
    }
  }

  function createTestMonster(): Monster {
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
        special: [],
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

  describe('Player damage calculation', () => {
    test('unarmed damage is 1d4', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      mockRandom.setValues([20, 3]) // hit roll, damage roll (1d4)

      const result = service.playerAttack(player, monster)

      expect(result.hit).toBe(true)
      expect(result.damage).toBe(4) // 3 from 1d4 + 1 Str bonus (16 gives +1 damage)
    })

    test('weapon damage uses weapon dice', () => {
      const weapon: Weapon = {
        id: 'longsword',
        name: 'Long Sword',
      spriteName: 'Long Sword',
        type: 'WEAPON',
        identified: true,
        damage: '1d12',
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, weapon } }
      const monster = createTestMonster()

      mockRandom.setValues([20, 8]) // hit roll, damage roll (1d12)

      const result = service.playerAttack(player, monster)

      expect(result.damage).toBe(9) // 8 from 1d12 + 1 Str bonus (16 gives +1 damage)
    })

    test('weapon bonus adds to damage', () => {
      const weapon: Weapon = {
        id: 'longsword+2',
        name: 'Long Sword +2',
      spriteName: 'Long Sword +2',
        type: 'WEAPON',
        identified: true,
        damage: '1d12',
        bonus: 2,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, weapon } }
      const monster = createTestMonster()

      mockRandom.setValues([20, 5]) // hit roll, damage roll

      const result = service.playerAttack(player, monster)

      expect(result.damage).toBe(8) // 5 roll + 2 weapon bonus + 1 Str bonus (16 gives +1 damage)
    })

    test('different weapons have different damage', () => {
      const mace: Weapon = {
        id: 'mace',
        name: 'Mace',
      spriteName: 'Mace',
        type: 'WEAPON',
        identified: true,
        damage: '2d4',
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, weapon: mace } }
      const monster = createTestMonster()

      mockRandom.setValues([20, 3, 4]) // hit roll, 2 dice for 2d4

      const result = service.playerAttack(player, monster)

      expect(result.damage).toBeGreaterThan(0)
    })
  })

  describe('Monster damage calculation', () => {
    test('uses monster damage dice', () => {
      const player = createTestPlayer()
      const monster = createTestMonster() // 1d6 damage

      mockRandom.setValues([20, 4]) // hit roll, damage roll

      const result = service.monsterAttack(monster, player)

      expect(result.damage).toBe(4)
    })

    test('different monsters have different damage', () => {
      const player = createTestPlayer()
      const dragon = { ...createTestMonster(), damage: '3d10', name: 'Dragon' }

      mockRandom.setValues([20, 5, 7, 9]) // hit roll, 3 dice for 3d10

      const result = service.monsterAttack(dragon, player)

      expect(result.damage).toBeGreaterThan(0)
    })
  })

  describe('Damage application', () => {
    test('applyDamageToPlayer reduces HP', () => {
      const player = createTestPlayer() // 20 HP
      const damaged = service.applyDamageToPlayer(player, 8)

      expect(damaged.hp).toBe(12)
    })

    test('applyDamageToPlayer does not go below 0', () => {
      const player = createTestPlayer() // 20 HP
      const damaged = service.applyDamageToPlayer(player, 100)

      expect(damaged.hp).toBe(0)
    })

    test('applyDamageToPlayer returns new object (immutability)', () => {
      const player = createTestPlayer()
      const damaged = service.applyDamageToPlayer(player, 5)

      expect(damaged).not.toBe(player)
      expect(player.hp).toBe(20) // Original unchanged
      expect(damaged.hp).toBe(15)
    })

    test('applyDamageToMonster reduces HP', () => {
      const monster = createTestMonster() // 10 HP
      const damaged = service.applyDamageToMonster(monster, 6)

      expect(damaged.hp).toBe(4)
    })

    test('applyDamageToMonster does not go below 0', () => {
      const monster = createTestMonster()
      const damaged = service.applyDamageToMonster(monster, 100)

      expect(damaged.hp).toBe(0)
    })

    test('applyDamageToMonster returns new object (immutability)', () => {
      const monster = createTestMonster()
      const damaged = service.applyDamageToMonster(monster, 3)

      expect(damaged).not.toBe(monster)
      expect(monster.hp).toBe(10)
      expect(damaged.hp).toBe(7)
    })
  })

  describe('Kill detection', () => {
    test('player attack kills monster when HP reaches 0', () => {
      const player = createTestPlayer()
      const weakMonster = { ...createTestMonster(), hp: 1 }

      mockRandom.setValues([20, 5]) // hit, damage

      const result = service.playerAttack(player, weakMonster)

      expect(result.killed).toBe(true)
    })

    test('player attack does not kill monster with HP remaining', () => {
      const player = createTestPlayer()
      const monster = createTestMonster() // 10 HP

      mockRandom.setValues([20, 3]) // hit, only 3 damage

      const result = service.playerAttack(player, monster)

      expect(result.killed).toBe(false)
    })

    test('monster attack kills player when HP reaches 0', () => {
      const weakPlayer = { ...createTestPlayer(), hp: 1 }
      const monster = createTestMonster()

      mockRandom.setValues([20, 5]) // hit, damage

      const result = service.monsterAttack(monster, weakPlayer)

      expect(result.killed).toBe(true)
    })

    test('monster attack does not kill player with HP remaining', () => {
      const player = createTestPlayer() // 20 HP
      const monster = createTestMonster()

      mockRandom.setValues([20, 3]) // hit, only 3 damage

      const result = service.monsterAttack(monster, player)

      expect(result.killed).toBe(false)
    })
  })

  describe('XP calculation', () => {
    test('returns monster xpValue', () => {
      const monster = { ...createTestMonster(), xpValue: 50 }

      const xp = service.calculateXP(monster)

      expect(xp).toBe(50)
    })

    test('different monsters have different XP values', () => {
      const weakMonster = { ...createTestMonster(), xpValue: 5 }
      const strongMonster = { ...createTestMonster(), xpValue: 100 }

      expect(service.calculateXP(weakMonster)).toBe(5)
      expect(service.calculateXP(strongMonster)).toBe(100)
    })
  })
})
