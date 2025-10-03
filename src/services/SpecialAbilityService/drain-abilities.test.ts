import { SpecialAbilityService } from './SpecialAbilityService'
import { MockRandom } from '../RandomService'
import { Player } from '../../types/core/core'

describe('SpecialAbilityService - Drain Abilities', () => {
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
      xp: 100,
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

  describe('drainStrength', () => {
    test('drains strength when chance succeeds', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1]) // 50% chance succeeds

      const result = service.drainStrength(player)

      expect(result.player).toBeDefined()
      expect(result.player!.strength).toBe(15)
      expect(result.messages).toContain('You feel weaker!')
    })

    test('does not drain strength when chance fails', () => {
      const player = createTestPlayer()

      mockRandom.setValues([0]) // 50% chance fails

      const result = service.drainStrength(player)

      expect(result.player!.strength).toBe(16)
      expect(result.messages).toHaveLength(0)
    })

    test('does not drain strength below 3', () => {
      const player = { ...createTestPlayer(), strength: 3 }

      mockRandom.setValues([1]) // Would succeed

      const result = service.drainStrength(player)

      expect(result.player!.strength).toBe(3)
      expect(result.messages).toHaveLength(0)
    })

    test('can drain down to 3', () => {
      const player = { ...createTestPlayer(), strength: 4 }

      mockRandom.setValues([1])

      const result = service.drainStrength(player)

      expect(result.player!.strength).toBe(3)
      expect(result.messages).toContain('You feel weaker!')
    })

    test('returns new player object (immutability)', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1])

      const result = service.drainStrength(player)

      expect(result.player).not.toBe(player)
      expect(player.strength).toBe(16)
    })
  })

  describe('drainXP', () => {
    test('drains XP when chance succeeds', () => {
      const player = { ...createTestPlayer(), xp: 100 }

      mockRandom.setValues([1, 30]) // 40% chance succeeds, drain 30 XP

      const result = service.drainXP(player)

      expect(result.player).toBeDefined()
      expect(result.player!.xp).toBe(70)
      expect(result.messages).toContain('You feel your life force drain away!')
    })

    test('does not drain XP when chance fails', () => {
      const player = { ...createTestPlayer(), xp: 100 }

      mockRandom.setValues([0]) // 40% chance fails

      const result = service.drainXP(player)

      expect(result.player!.xp).toBe(100)
      expect(result.messages).toHaveLength(0)
    })

    test('does not drain XP below 0', () => {
      const player = { ...createTestPlayer(), xp: 20 }

      mockRandom.setValues([1, 50]) // Drain more than current

      const result = service.drainXP(player)

      expect(result.player!.xp).toBe(0)
    })

    test('drains variable amounts', () => {
      const player = { ...createTestPlayer(), xp: 100 }

      mockRandom.setValues([1, 15]) // Drain 15

      const result = service.drainXP(player)

      expect(result.player!.xp).toBe(85)
    })

    test('returns new player object (immutability)', () => {
      const player = { ...createTestPlayer(), xp: 100 }

      mockRandom.setValues([1, 20])

      const result = service.drainXP(player)

      expect(result.player).not.toBe(player)
      expect(player.xp).toBe(100)
    })
  })

  describe('drainMaxHP', () => {
    test('drains max HP when chance succeeds', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1]) // 30% chance succeeds

      const result = service.drainMaxHP(player)

      expect(result.player).toBeDefined()
      expect(result.player!.maxHp).toBe(19)
      expect(result.messages).toContain('You feel your life essence fade!')
    })

    test('does not drain max HP when chance fails', () => {
      const player = createTestPlayer()

      mockRandom.setValues([0]) // 30% chance fails

      const result = service.drainMaxHP(player)

      expect(result.player!.maxHp).toBe(20)
      expect(result.messages).toHaveLength(0)
    })

    test('does not drain max HP below 1', () => {
      const player = { ...createTestPlayer(), hp: 1, maxHp: 1 }

      mockRandom.setValues([1]) // Would succeed

      const result = service.drainMaxHP(player)

      expect(result.player!.maxHp).toBe(1)
      expect(result.messages).toHaveLength(0)
    })

    test('reduces current HP if above new max', () => {
      const player = createTestPlayer() // hp: 20, maxHp: 20

      mockRandom.setValues([1])

      const result = service.drainMaxHP(player)

      expect(result.player!.maxHp).toBe(19)
      expect(result.player!.hp).toBe(19) // Capped at new max
    })

    test('keeps current HP if below new max', () => {
      const player = { ...createTestPlayer(), hp: 10, maxHp: 20 }

      mockRandom.setValues([1])

      const result = service.drainMaxHP(player)

      expect(result.player!.maxHp).toBe(19)
      expect(result.player!.hp).toBe(10) // Unchanged
    })

    test('returns new player object (immutability)', () => {
      const player = createTestPlayer()

      mockRandom.setValues([1])

      const result = service.drainMaxHP(player)

      expect(result.player).not.toBe(player)
      expect(player.maxHp).toBe(20)
      expect(player.hp).toBe(20)
    })
  })
})
