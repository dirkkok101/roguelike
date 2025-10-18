import { MovementService } from './MovementService'
import { MockRandom } from '@services/RandomService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Player, Equipment, StatusEffectType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

// ============================================================================
// TEST SETUP
// ============================================================================

// ============================================================================
// TESTS
// ============================================================================

describe('MovementService - Confused Movement', () => {
  let mockRandom: MockRandom
  let statusEffectService: StatusEffectService
  let movementService: MovementService

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
  })

  describe('applyDirection with confusion', () => {
    test('normal movement when not confused', () => {
      const player = createTestPlayer()
      const startPos = { x: 5, y: 5 }

      // Test all four directions
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 4 })
      expect(movementService.applyDirection(startPos, 'down', player)).toEqual({ x: 5, y: 6 })
      expect(movementService.applyDirection(startPos, 'left', player)).toEqual({ x: 4, y: 5 })
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 6, y: 5 })
    })

    test('randomizes direction when player is confused (80% chance)', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }

      // Rogue mechanic: 80% chance to randomize direction
      // Need two rolls: 1-100 for confusion check, then 1d4 for direction

      // Mock confusion trigger (50 <= 80) + 1d4 roll to return 1 (index 0 = 'up')
      mockRandom.setValues([50, 1])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 5, y: 4 }) // up instead of right

      // Mock confusion trigger (30 <= 80) + 1d4 roll to return 2 (index 1 = 'down')
      mockRandom.setValues([30, 2])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 5, y: 6 }) // down instead of right

      // Mock confusion trigger (70 <= 80) + 1d4 roll to return 3 (index 2 = 'left')
      mockRandom.setValues([70, 3])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 4, y: 5 }) // left instead of right

      // Mock confusion trigger (10 <= 80) + 1d4 roll to return 4 (index 3 = 'right')
      mockRandom.setValues([10, 4])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 6, y: 5 }) // right (randomly chose same direction)
    })

    test('randomizes direction 80% of the time while confused', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }

      // Player tries to go UP, but confusion triggers (40 <= 80) and random roll says DOWN
      mockRandom.setValues([40, 2]) // Confusion check: 40, then 1d4 = 2 → index 1 = 'down'
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 6 })

      // Player tries to go LEFT, but confusion triggers (60 <= 80) and random roll says RIGHT
      mockRandom.setValues([60, 4]) // Confusion check: 60, then 1d4 = 4 → index 3 = 'right'
      expect(movementService.applyDirection(startPos, 'left', player)).toEqual({ x: 6, y: 5 })
    })

    test('works without player parameter (backward compatibility)', () => {
      const startPos = { x: 5, y: 5 }

      // Should work normally without player
      expect(movementService.applyDirection(startPos, 'up')).toEqual({ x: 5, y: 4 })
      expect(movementService.applyDirection(startPos, 'down')).toEqual({ x: 5, y: 6 })
      expect(movementService.applyDirection(startPos, 'left')).toEqual({ x: 4, y: 5 })
      expect(movementService.applyDirection(startPos, 'right')).toEqual({ x: 6, y: 5 })
    })

    test('uses all four possible random directions', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }
      const results = new Set()

      // Test all 4 random outcomes (when confusion triggers)
      for (let i = 1; i <= 4; i++) {
        // First value: confusion trigger (50 <= 80), second value: direction (1d4)
        mockRandom.setValues([50, i])
        const result = movementService.applyDirection(startPos, 'up', player)
        results.add(`${result.x},${result.y}`)
      }

      // Should have produced 4 different positions (up, down, left, right)
      expect(results.size).toBe(4)
      expect(results).toContain('5,4') // up
      expect(results).toContain('5,6') // down
      expect(results).toContain('4,5') // left
      expect(results).toContain('6,5') // right
    })

    test('does not randomize when other status effects are present', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 10)

      const startPos = { x: 5, y: 5 }

      // Should move normally (not confused)
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 4 })
      expect(movementService.applyDirection(startPos, 'down', player)).toEqual({ x: 5, y: 6 })
    })

    test('randomizes when confused even with other status effects', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 10)

      const startPos = { x: 5, y: 5 }

      // Confusion triggers (20 <= 80), then direction roll (2 → down)
      mockRandom.setValues([20, 2])
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 6 }) // down instead of up
    })

    test('20% chance player moves in intended direction despite confusion', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }

      // Confusion does NOT trigger (85 > 80), so player moves in intended direction
      mockRandom.setValues([85])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 6, y: 5 }) // right as intended

      // Another example: 95 > 80
      mockRandom.setValues([95])
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 4 }) // up as intended
    })
  })
})
