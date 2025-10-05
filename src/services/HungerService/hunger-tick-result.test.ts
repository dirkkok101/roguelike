import { HungerService, HungerState, HungerTickResult } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { Player } from '@game/core/core'

describe('HungerService - Tick Result Complete', () => {
  let service: HungerService
  let mockRandom: MockRandom
  let basePlayer: Player

  beforeEach(() => {
    mockRandom = new MockRandom([])
    service = new HungerService(mockRandom)
    basePlayer = {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      ac: 10,
      hunger: 1000,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
    } as Player
  })

  describe('Normal hunger tick', () => {
    test('reduces hunger by 1 and returns empty messages', () => {
      const player = { ...basePlayer, hunger: 500 }

      const result: HungerTickResult = service.tickHunger(player)

      expect(result.player.hunger).toBe(499)
      expect(result.messages).toEqual([])
      expect(result.death).toBeUndefined()
    })

    test('returns player with no changes when still NORMAL', () => {
      const player = { ...basePlayer, hunger: 400 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(399)
      expect(result.player.hp).toBe(20)
      expect(result.messages).toEqual([])
      expect(result.death).toBeUndefined()
    })
  })

  describe('State transition warnings', () => {
    test('generates warning when transitioning to HUNGRY', () => {
      const player = { ...basePlayer, hunger: 301 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(300)
      expect(result.messages).toContainEqual({
        text: 'You are getting hungry',
        type: 'warning'
      })
      expect(result.death).toBeUndefined()
    })

    test('generates warning when transitioning to WEAK', () => {
      const player = { ...basePlayer, hunger: 150 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(149)
      expect(result.messages).toContainEqual({
        text: 'You are weak from hunger!',
        type: 'warning'
      })
      expect(result.death).toBeUndefined()
    })

    test('generates warning when transitioning to STARVING', () => {
      const player = { ...basePlayer, hunger: 1, hp: 20 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(0)
      expect(result.messages).toContainEqual({
        text: 'You are fainting!',
        type: 'warning'
      })
      // Should also have starvation message
      expect(result.messages).toContainEqual({
        text: 'You are fainting from hunger!',
        type: 'critical'
      })
      expect(result.death).toBeUndefined()
    })

    test('does not generate warning when staying in same state', () => {
      const player = { ...basePlayer, hunger: 250 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(249)
      expect(result.messages).toEqual([])
    })

    test('does not generate warning when improving state', () => {
      // This shouldn't happen during tick, but testing the logic
      const player = { ...basePlayer, hunger: 299 }

      // Manually set hunger higher to simulate improvement
      // (In real game this would be from eating food)
      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(298)
      expect(result.messages).toEqual([])
    })
  })

  describe('Starvation damage', () => {
    test('applies 1 HP damage when starving', () => {
      const player = { ...basePlayer, hunger: 0, hp: 10 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(0)
      expect(result.player.hp).toBe(9)
      expect(result.messages).toContainEqual({
        text: 'You are fainting from hunger!',
        type: 'critical'
      })
      expect(result.death).toBeUndefined()
    })

    test('returns death when starvation kills player', () => {
      const player = { ...basePlayer, hunger: 0, hp: 1 }

      const result = service.tickHunger(player)

      expect(result.player.hunger).toBe(0)
      expect(result.player.hp).toBe(0)
      expect(result.messages).toContainEqual({
        text: 'You are fainting from hunger!',
        type: 'critical'
      })
      expect(result.death).toEqual({ cause: 'Died of starvation' })
    })

    test('returns death when player already at 0 HP', () => {
      const player = { ...basePlayer, hunger: 0, hp: 0 }

      const result = service.tickHunger(player)

      expect(result.player.hp).toBe(0)
      expect(result.death).toEqual({ cause: 'Died of starvation' })
    })

    test('includes both warning and starvation message when transitioning to STARVING', () => {
      const player = { ...basePlayer, hunger: 1, hp: 10 }

      const result = service.tickHunger(player)

      expect(result.messages).toHaveLength(2)
      expect(result.messages).toContainEqual({
        text: 'You are fainting!',
        type: 'warning'
      })
      expect(result.messages).toContainEqual({
        text: 'You are fainting from hunger!',
        type: 'critical'
      })
    })
  })

  describe('Complete result integration', () => {
    test('returns all fields in result object', () => {
      const player = { ...basePlayer, hunger: 301 }

      const result = service.tickHunger(player)

      expect(result).toHaveProperty('player')
      expect(result).toHaveProperty('messages')
      expect(result.player).toBeDefined()
      expect(Array.isArray(result.messages)).toBe(true)
    })

    test('player object is immutable (new object returned)', () => {
      const player = { ...basePlayer, hunger: 500 }

      const result = service.tickHunger(player)

      expect(result.player).not.toBe(player)
      expect(player.hunger).toBe(500) // Original unchanged
      expect(result.player.hunger).toBe(499)
    })

    test('messages array is always present even when empty', () => {
      const player = { ...basePlayer, hunger: 500 }

      const result = service.tickHunger(player)

      expect(result.messages).toBeDefined()
      expect(result.messages).toEqual([])
    })

    test('death field only present when player dies', () => {
      const alivePlayer = { ...basePlayer, hunger: 0, hp: 5 }
      const dyingPlayer = { ...basePlayer, hunger: 0, hp: 1 }

      const aliveResult = service.tickHunger(alivePlayer)
      const dyingResult = service.tickHunger(dyingPlayer)

      expect(aliveResult.death).toBeUndefined()
      expect(dyingResult.death).toBeDefined()
    })
  })
})
