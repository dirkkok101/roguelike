import { HungerService, HungerState } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('HungerService - Food Consumption', () => {
  let hungerService: HungerService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom()
    ringService = new RingService(mockRandom)
    hungerService = new HungerService(mockRandom, ringService)
  })

  function createTestPlayer(hunger: number = 1300): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger,
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

  describe('consumeFood()', () => {
    test('generates random nutrition when not specified (1100-1499)', () => {
      const player = createTestPlayer(500)
      mockRandom.setValues([1200, 0]) // nutrition, chance (no yuck)

      const result = hungerService.consumeFood(player)

      expect(result.player.hunger).toBe(1700) // 500 + 1200
    })

    test('uses explicit nutrition when provided', () => {
      const player = createTestPlayer(500)
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 1000)

      expect(result.player.hunger).toBe(1500) // 500 + 1000
    })

    test('caps hunger at 2000 max', () => {
      const player = createTestPlayer(1800)
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 1400)

      expect(result.player.hunger).toBe(2000) // Capped
    })

    test('returns base eating message', () => {
      const player = createTestPlayer(1000)
      mockRandom.setValues([1200, 0]) // nutrition, chance (no yuck)

      const result = hungerService.consumeFood(player)

      expect(result.messages).toContainEqual({
        text: 'You eat the food ration.',
        type: 'info'
      })
    })

    test('adds "yuck" message 30% of time', () => {
      const player = createTestPlayer(1000)
      mockRandom.setValues([1200, 1]) // nutrition, chance (yes yuck)

      const result = hungerService.consumeFood(player)

      expect(result.messages).toContainEqual({
        text: 'Yuck, that food tasted awful!',
        type: 'info'
      })
    })

    test('does not add "yuck" message 70% of time', () => {
      const player = createTestPlayer(1000)
      mockRandom.setValues([1200, 0]) // nutrition, chance (no yuck)

      const result = hungerService.consumeFood(player)

      const yuckMessage = result.messages.find(m =>
        m.text === 'Yuck, that food tasted awful!'
      )
      expect(yuckMessage).toBeUndefined()
    })

    test('adds improvement message when transitioning to NORMAL', () => {
      const player = createTestPlayer(100) // WEAK state
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 1300) // Will be NORMAL

      expect(result.messages).toContainEqual({
        text: 'You feel satisfied.',
        type: 'success'
      })
      expect(result.improved).toBe(true)
    })

    test('adds improvement message from WEAK to HUNGRY', () => {
      const player = createTestPlayer(100) // WEAK state
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 70) // Will be HUNGRY (170)

      expect(result.messages).toContainEqual({
        text: 'You feel a bit better.',
        type: 'success'
      })
      expect(result.improved).toBe(true)
    })

    test('adds improvement message from STARVING to WEAK', () => {
      const player = createTestPlayer(0) // STARVING state
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 50) // Will be WEAK (50)

      expect(result.messages).toContainEqual({
        text: 'You feel slightly stronger.',
        type: 'success'
      })
      expect(result.improved).toBe(true)
    })

    test('no improvement message when state unchanged', () => {
      const player = createTestPlayer(1500) // NORMAL state
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 100) // Still NORMAL

      const improvementMessages = result.messages.filter(m => m.type === 'success')
      expect(improvementMessages).toHaveLength(0)
      expect(result.improved).toBe(false)
    })

    test('no improvement message when transitioning within same level', () => {
      const player = createTestPlayer(200) // HUNGRY state
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 50) // Still HUNGRY (250)

      const improvementMessages = result.messages.filter(m => m.type === 'success')
      expect(improvementMessages).toHaveLength(0)
      expect(result.improved).toBe(false)
    })

    test('returns all messages when "yuck" and improvement both trigger', () => {
      const player = createTestPlayer(100) // WEAK state
      mockRandom.setValues([1]) // chance (yes yuck)

      const result = hungerService.consumeFood(player, 1300) // Will be NORMAL

      expect(result.messages).toHaveLength(3) // base + yuck + improvement
      expect(result.messages[0].text).toBe('You eat the food ration.')
      expect(result.messages[1].text).toBe('Yuck, that food tasted awful!')
      expect(result.messages[2].text).toBe('You feel satisfied.')
    })

    test('maintains immutability (does not mutate player)', () => {
      const player = createTestPlayer(1000)
      const originalHunger = player.hunger
      mockRandom.setValues([0]) // chance (no yuck)

      hungerService.consumeFood(player, 500)

      expect(player.hunger).toBe(originalHunger) // Unchanged
    })

    test('returns new player object', () => {
      const player = createTestPlayer(1000)
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 500)

      expect(result.player).not.toBe(player) // Different object
      expect(result.player.hunger).toBe(1500)
    })

    test('improvement flag correctly reflects state change', () => {
      const player1 = createTestPlayer(100) // WEAK
      mockRandom.setValues([0]) // chance (no yuck)
      const result1 = hungerService.consumeFood(player1, 1300) // to NORMAL
      expect(result1.improved).toBe(true)

      const player2 = createTestPlayer(1500) // NORMAL
      mockRandom.setValues([0]) // chance (no yuck)
      const result2 = hungerService.consumeFood(player2, 100) // stay NORMAL
      expect(result2.improved).toBe(false)
    })

    test('handles edge case: nutrition exactly reaches threshold', () => {
      const player = createTestPlayer(149) // WEAK (149)
      mockRandom.setValues([0]) // chance (no yuck)

      const result = hungerService.consumeFood(player, 1) // Exactly 150 = HUNGRY

      expect(result.player.hunger).toBe(150)
      expect(hungerService.getHungerState(150)).toBe(HungerState.HUNGRY)
      expect(result.improved).toBe(true)
    })

    test('handles multiple nutrition values in random range', () => {
      const player1 = createTestPlayer(500)
      const player2 = createTestPlayer(500)

      // Test low end of range
      mockRandom.setValues([1100, 0]) // nutrition, chance (no yuck)
      const result1 = hungerService.consumeFood(player1)
      expect(result1.player.hunger).toBe(1600)

      // Test high end of range
      mockRandom.setValues([1499, 0]) // nutrition, chance (no yuck)
      const result2 = hungerService.consumeFood(player2)
      expect(result2.player.hunger).toBe(1999)
    })
  })
})
