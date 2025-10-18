import { StatusEffectService } from './StatusEffectService'
import { Player, StatusEffectType, Equipment } from '@game/core/core'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestPlayer(): Player {
  const equipment: Equipment = {
    weapon: null,
    armor: null,
    leftRing: null,
    rightRing: null,
    lightSource: null,
  }

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
    equipment,
    inventory: [],
    statusEffects: [],
    // FIX: Add missing Player fields (energy, isRunning, runState)
    // These are required by TurnService validation
    energy: 0,
    isRunning: false,
    runState: null,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('StatusEffectService - Tick System', () => {
  let service: StatusEffectService

  beforeEach(() => {
    service = new StatusEffectService()
  })

  describe('tickStatusEffects', () => {
    test('decrements duration of single effect by 1', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 5)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].duration).toBe(4)
      expect(result.expired).toHaveLength(0)
    })

    test('removes effect when duration reaches 0', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 1)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(0)
      expect(result.expired).toEqual([StatusEffectType.CONFUSED])
    })

    test('removes effect when duration becomes negative', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 0)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(0)
      expect(result.expired).toEqual([StatusEffectType.CONFUSED])
    })

    test('ticks multiple effects simultaneously', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 5)
      player = service.addStatusEffect(player, StatusEffectType.BLIND, 3)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(3)
      expect(result.player.statusEffects[0].duration).toBe(9)
      expect(result.player.statusEffects[1].duration).toBe(4)
      expect(result.player.statusEffects[2].duration).toBe(2)
      expect(result.expired).toHaveLength(0)
    })

    test('removes multiple expired effects in single tick', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 1)
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 1)
      player = service.addStatusEffect(player, StatusEffectType.BLIND, 5)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.BLIND)
      expect(result.player.statusEffects[0].duration).toBe(4)
      expect(result.expired).toHaveLength(2)
      expect(result.expired).toContain(StatusEffectType.CONFUSED)
      expect(result.expired).toContain(StatusEffectType.HASTED)
    })

    test('handles no effects gracefully', () => {
      const player = createTestPlayer()

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects).toHaveLength(0)
      expect(result.expired).toHaveLength(0)
    })

    test('does not mutate original player', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 5)
      const originalEffects = player.statusEffects

      service.tickStatusEffects(player)

      expect(player.statusEffects).toBe(originalEffects)
      expect(player.statusEffects[0].duration).toBe(5)
    })

    test('preserves effect intensity when ticking', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.HASTED, 5, 2)

      const result = service.tickStatusEffects(player)

      expect(result.player.statusEffects[0].intensity).toBe(2)
      expect(result.player.statusEffects[0].duration).toBe(4)
    })

    test('multiple ticks eventually expire effect', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 3)

      // Tick 1
      let result = service.tickStatusEffects(player)
      expect(result.player.statusEffects[0].duration).toBe(2)
      expect(result.expired).toHaveLength(0)

      // Tick 2
      result = service.tickStatusEffects(result.player)
      expect(result.player.statusEffects[0].duration).toBe(1)
      expect(result.expired).toHaveLength(0)

      // Tick 3 - effect expires
      result = service.tickStatusEffects(result.player)
      expect(result.player.statusEffects).toHaveLength(0)
      expect(result.expired).toEqual([StatusEffectType.CONFUSED])
    })

    test('returns correct expired effect types', () => {
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 1)
      player = service.addStatusEffect(player, StatusEffectType.BLIND, 1)

      const result = service.tickStatusEffects(player)

      expect(result.expired).toHaveLength(2)
      expect(result.expired).toContain(StatusEffectType.CONFUSED)
      expect(result.expired).toContain(StatusEffectType.BLIND)
    })

    test('preserves all Player fields (isRunning, runState, energy)', () => {
      // Regression test: tickStatusEffects must preserve ALL Player fields
      // Bug: Previously only spread statusEffects, losing isRunning/runState
      let player = createTestPlayer()
      player = service.addStatusEffect(player, StatusEffectType.CONFUSED, 5)

      // Set running state
      player = {
        ...player,
        isRunning: true,
        runState: {
          direction: 'right' as const,
          previousHP: player.hp,
        },
        energy: 100,
      }

      const result = service.tickStatusEffects(player)

      // Verify Player fields preserved
      expect(result.player.isRunning).toBe(true)
      expect(result.player.runState).toEqual({
        direction: 'right',
        previousHP: player.hp,
      })
      expect(result.player.energy).toBe(100)
      expect(result.player.hp).toBe(player.hp) // Sanity check
      expect(result.player.position).toEqual(player.position) // Sanity check
    })
  })
})
