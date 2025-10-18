import { GoldService } from './GoldService'
import { MockRandom } from '@services/RandomService'
import { Player } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('GoldService - Gold Pickup', () => {
  let service: GoldService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new GoldService(mockRandom)
  })

  function createTestPlayer(gold: number = 0): Player {
    return {
      position: { x: 10, y: 10 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold,
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
    }
  }

  describe('pickupGold()', () => {
    test('adds gold to player with 0 gold', () => {
      const player = createTestPlayer(0)
      const result = service.pickupGold(player, 50)

      expect(result.gold).toBe(50)
    })

    test('adds gold to player with existing gold', () => {
      const player = createTestPlayer(100)
      const result = service.pickupGold(player, 50)

      expect(result.gold).toBe(150)
    })

    test('handles large gold amounts', () => {
      const player = createTestPlayer(0)
      const result = service.pickupGold(player, 9999)

      expect(result.gold).toBe(9999)
    })

    test('handles picking up 1 gold', () => {
      const player = createTestPlayer(0)
      const result = service.pickupGold(player, 1)

      expect(result.gold).toBe(1)
    })

    test('preserves immutability - original player unchanged', () => {
      const player = createTestPlayer(100)
      const originalGold = player.gold

      const result = service.pickupGold(player, 50)

      expect(player.gold).toBe(originalGold) // Original unchanged
      expect(result.gold).toBe(150) // New player has updated gold
      expect(result).not.toBe(player) // Different object references
    })

    test('preserves all other player properties', () => {
      const player = createTestPlayer(100)
      const result = service.pickupGold(player, 50)

      expect(result.position).toEqual(player.position)
      expect(result.hp).toBe(player.hp)
      expect(result.maxHp).toBe(player.maxHp)
      expect(result.strength).toBe(player.strength)
      expect(result.level).toBe(player.level)
      expect(result.xp).toBe(player.xp)
      expect(result.equipment).toBe(player.equipment)
      expect(result.inventory).toBe(player.inventory)
    })

    test('can accumulate gold over multiple pickups', () => {
      let player = createTestPlayer(0)

      player = service.pickupGold(player, 10)
      expect(player.gold).toBe(10)

      player = service.pickupGold(player, 25)
      expect(player.gold).toBe(35)

      player = service.pickupGold(player, 100)
      expect(player.gold).toBe(135)
    })
  })
})
