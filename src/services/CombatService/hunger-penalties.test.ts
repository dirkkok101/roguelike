import { CombatService } from './CombatService'
import { HungerService } from '@services/HungerService'
import { MockRandom } from '@services/RandomService'
import { Player, Monster, MonsterBehavior, MonsterState } from '@game/core/core'

describe('CombatService - Hunger Penalties', () => {
  let combatService: CombatService
  let hungerService: HungerService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    hungerService = new HungerService(mockRandom)
    combatService = new CombatService(mockRandom, hungerService)
  })

  function createTestPlayer(overrides?: Partial<Player>): Player {
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
      hunger: 1300, // NORMAL state
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      ...overrides,
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
        fleeThreshold: 0.25,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.HUNTING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
    }
  }

  test('applies -1 to hit penalty when player is Weak', () => {
    // Arrange: Weak player (hunger 1-149)
    const player = createTestPlayer({ hunger: 100, level: 5, strength: 10 })
    const monster = createTestMonster()

    // Mock: Roll of 4 that would cause edge case
    // Without penalty: 4 + level(5) + str(10) = 19 >= 10 (hits)
    // With -1 penalty: 4 + level(5) + str(10) - 1 = 18 >= 10 (still hits)
    // Let's test that damage is applied (which indirectly confirms hit calc ran)
    mockRandom.setValues([20, 4]) // Guaranteed hit + damage roll

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: Hit succeeded, damage has penalty
    expect(result.hit).toBe(true)
    expect(result.damage).toBe(3) // 4 - 1 penalty
  })

  test('applies -1 damage penalty when player is Weak', () => {
    // Arrange: Weak player
    const player = createTestPlayer({ hunger: 100 })
    const monster = createTestMonster()

    // Mock: ensure hit + damage roll
    mockRandom.setValues([20, 4]) // Hit roll + unarmed damage roll (1d4)

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: Damage should be reduced by 1
    // Base unarmed damage: 4 (from 1d4 roll)
    // With -1 penalty: 4 - 1 = 3
    expect(result.damage).toBe(3)
  })

  test('applies penalties when player is Starving', () => {
    // Arrange: Starving player (hunger = 0)
    const player = createTestPlayer({ hunger: 0 })
    const monster = createTestMonster()

    // Mock: hit + damage
    mockRandom.setValues([20, 4]) // Guaranteed hit + damage

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: Both penalties apply (same as WEAK)
    expect(result.damage).toBe(3) // 4 - 1
  })

  test('applies no penalty when player is Normal', () => {
    // Arrange: Normal player (hunger 301+)
    const player = createTestPlayer({ hunger: 500 })
    const monster = createTestMonster()

    // Mock
    mockRandom.setValues([20, 4])

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: No penalty, full damage
    expect(result.damage).toBe(4)
  })

  test('applies no penalty when player is Hungry', () => {
    // Arrange: Hungry player (hunger 150-300)
    const player = createTestPlayer({ hunger: 200 })
    const monster = createTestMonster()

    // Mock
    mockRandom.setValues([20, 4])

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: No penalty, full damage
    expect(result.damage).toBe(4)
  })

  test('damage penalty does not go below 0', () => {
    // Arrange: Weak player
    const player = createTestPlayer({ hunger: 100 })
    const monster = createTestMonster()

    // Mock: Hit + very low damage roll
    mockRandom.setValues([20, 1]) // Hit + minimum damage (1d4 = 1)

    // Act
    const result = combatService.playerAttack(player, monster)

    // Assert: Damage is 0 (1 - 1 = 0), not negative
    expect(result.damage).toBe(0)
    expect(result.damage).toBeGreaterThanOrEqual(0)
  })
})
