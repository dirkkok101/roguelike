import { StatusEffectService } from './StatusEffectService'
import { StatusEffectType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

// ============================================================================
// TESTS
// ============================================================================

describe('StatusEffectService', () => {
  let service: StatusEffectService

  beforeEach(() => {
    service = new StatusEffectService()
  })

  describe('addStatusEffect', () => {
    test('adds a new status effect to player', () => {
      const player = createTestPlayer()

      const result = service.addStatusEffect(player, StatusEffectType.CONFUSED, 20)

      expect(result.statusEffects).toHaveLength(1)
      expect(result.statusEffects[0]).toEqual({
        type: StatusEffectType.CONFUSED,
        duration: 20,
        intensity: undefined,
      })
    })

    test('adds status effect with intensity', () => {
      const player = createTestPlayer()

      const result = service.addStatusEffect(player, StatusEffectType.HASTED, 5, 2)

      expect(result.statusEffects[0]).toEqual({
        type: StatusEffectType.HASTED,
        duration: 5,
        intensity: 2,
      })
    })

    test('replaces existing effect of same type (does not stack)', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 20)

      expect(player.statusEffects).toHaveLength(1)
      expect(player.statusEffects[0].duration).toBe(20)
    })

    test('allows multiple different effects simultaneously', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 5)
      player = service.addStatusEffect(player, StatusEffectType.BLIND, 40)

      expect(player.statusEffects).toHaveLength(3)
      expect(player.statusEffects.map(e => e.type)).toEqual([
        StatusEffectType.CONFUSED,
        StatusEffectType.HASTED,
        StatusEffectType.BLIND,
      ])
    })

    test('does not mutate original player', () => {
      const player = createTestPlayer()
      const originalEffects = player.statusEffects

      service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      expect(player.statusEffects).toBe(originalEffects)
      expect(player.statusEffects).toHaveLength(0)
    })
  })

  describe('removeStatusEffect', () => {
    test('removes a specific status effect', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 5)

      player = service.removeStatusEffect(player, StatusEffectType.CONFUSED)

      expect(player.statusEffects).toHaveLength(1)
      expect(player.statusEffects[0].type).toBe(StatusEffectType.HASTED)
    })

    test('does nothing if effect not present', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      player = service.removeStatusEffect(player, StatusEffectType.HASTED)

      expect(player.statusEffects).toHaveLength(1)
      expect(player.statusEffects[0].type).toBe(StatusEffectType.CONFUSED)
    })

    test('does not mutate original player', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      const originalEffects = player.statusEffects

      service.removeStatusEffect(player, StatusEffectType.CONFUSED)

      expect(player.statusEffects).toBe(originalEffects)
      expect(player.statusEffects).toHaveLength(1)
    })
  })

  describe('hasStatusEffect', () => {
    test('returns true when player has the effect', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      expect(service.hasStatusEffect(player, StatusEffectType.CONFUSED)).toBe(true)
    })

    test('returns false when player does not have the effect', () => {
      const player = createTestPlayer()

      expect(service.hasStatusEffect(player, StatusEffectType.CONFUSED)).toBe(false)
    })

    test('returns false after effect is removed', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.removeStatusEffect(player, StatusEffectType.CONFUSED)

      expect(service.hasStatusEffect(player, StatusEffectType.CONFUSED)).toBe(false)
    })
  })

  describe('getStatusEffect', () => {
    test('returns the status effect when present', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 15, 3)

      const effect = service.getStatusEffect(player, StatusEffectType.CONFUSED)

      expect(effect).toEqual({
        type: StatusEffectType.CONFUSED,
        duration: 15,
        intensity: 3,
      })
    })

    test('returns undefined when effect not present', () => {
      const player = createTestPlayer()

      const effect = service.getStatusEffect(player, StatusEffectType.CONFUSED)

      expect(effect).toBeUndefined()
    })

    test('returns correct effect when multiple effects present', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const effect = service.getStatusEffect(player, StatusEffectType.HASTED)

      expect(effect?.type).toBe(StatusEffectType.HASTED)
      expect(effect?.duration).toBe(5)
    })
  })
})
