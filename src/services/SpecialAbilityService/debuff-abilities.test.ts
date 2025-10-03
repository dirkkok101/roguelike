import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '../RandomService'
import { Player, Monster, MonsterBehavior, Armor } from '../../types/core/core'

describe('SpecialAbilityService - Debuff Abilities', () => {
  let service: SpecialAbilityService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new SpecialAbilityService(mockRandom)
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

  describe('rustArmor', () => {
    test('rusts armor when chance succeeds', () => {
      const armor: Armor = {
        id: 'plate-mail',
        name: 'Plate Mail',
        type: 'ARMOR',
        identified: true,
        acBonus: 6,
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, armor } }
      const monster = createTestMonster()

      mockRandom.setValues([1]) // 50% chance succeeds

      const result = service.rustArmor(player, monster)

      expect(result.player).toBeDefined()
      expect(result.player!.equipment.armor).toBeDefined()
      expect((result.player!.equipment.armor as Armor).bonus).toBe(-1)
      expect(result.messages).toContain('Your armor rusts!')
    })

    test('does not rust armor when chance fails', () => {
      const armor: Armor = {
        id: 'plate-mail',
        name: 'Plate Mail',
        type: 'ARMOR',
        identified: true,
        acBonus: 6,
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, armor } }
      const monster = createTestMonster()

      mockRandom.setValues([0]) // 50% chance fails

      const result = service.rustArmor(player, monster)

      expect(result.player).toBeDefined()
      expect((result.player!.equipment.armor as Armor).bonus).toBe(0)
      expect(result.messages).toHaveLength(0)
    })

    test('does nothing when player has no armor', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      const result = service.rustArmor(player, monster)

      expect(result.player).toBe(player)
      expect(result.messages).toHaveLength(0)
    })

    test('rusts already rusted armor further', () => {
      const armor: Armor = {
        id: 'plate-mail',
        name: 'Plate Mail',
        type: 'ARMOR',
        identified: true,
        acBonus: 6,
        bonus: -2,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, armor } }
      const monster = createTestMonster()

      mockRandom.setValues([1]) // Success

      const result = service.rustArmor(player, monster)

      expect((result.player!.equipment.armor as Armor).bonus).toBe(-3)
    })

    test('returns new player object (immutability)', () => {
      const armor: Armor = {
        id: 'plate-mail',
        name: 'Plate Mail',
        type: 'ARMOR',
        identified: true,
        acBonus: 6,
        bonus: 0,
      }

      const player = { ...createTestPlayer(), equipment: { ...createTestPlayer().equipment, armor } }
      const monster = createTestMonster()

      mockRandom.setValues([1])

      const result = service.rustArmor(player, monster)

      expect(result.player).not.toBe(player)
      expect((player.equipment.armor as Armor).bonus).toBe(0)
    })
  })

  describe('freezePlayer', () => {
    test('freezes player when chance succeeds', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1]) // 40% chance succeeds

      const result = service.freezePlayer(player)

      expect(result.messages).toContain('You are frozen solid!')
    })

    test('does not freeze when chance fails', () => {
      const player = createTestPlayer()

      mockRandom.setValues([0]) // 40% chance fails

      const result = service.freezePlayer(player)

      expect(result.messages).toHaveLength(0)
    })

    test('returns player unchanged', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1])

      const result = service.freezePlayer(player)

      expect(result.player).toBe(player)
    })
  })

  describe('confusePlayer', () => {
    test('confuses player when chance succeeds', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1]) // 30% chance succeeds

      const result = service.confusePlayer(player)

      expect(result.messages).toContain('You feel confused!')
    })

    test('does not confuse when chance fails', () => {
      const player = createTestPlayer()

      mockRandom.setValues([0]) // 30% chance fails

      const result = service.confusePlayer(player)

      expect(result.messages).toHaveLength(0)
    })

    test('returns player unchanged', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1])

      const result = service.confusePlayer(player)

      expect(result.player).toBe(player)
    })
  })

  describe('holdPlayer', () => {
    test('holds player when chance succeeds', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1]) // 60% chance succeeds

      const result = service.holdPlayer(player)

      expect(result.messages).toContain('The flytrap grabs you!')
    })

    test('does not hold when chance fails', () => {
      const player = createTestPlayer()

      mockRandom.setValues([0]) // 60% chance fails

      const result = service.holdPlayer(player)

      expect(result.messages).toHaveLength(0)
    })

    test('returns player unchanged', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1])

      const result = service.holdPlayer(player)

      expect(result.player).toBe(player)
    })
  })
})
