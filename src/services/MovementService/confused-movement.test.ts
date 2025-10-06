import { MovementService } from './MovementService'
import { MockRandom } from '@services/RandomService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Player, Equipment, StatusEffectType } from '@game/core/core'

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
    position: { x: 5, y: 5 },
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
  }
}

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

    test('randomizes direction when player is confused', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }

      // Mock 1d4 roll to return 1 (index 0 = 'up')
      mockRandom.setValues([1])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 5, y: 4 }) // up instead of right

      // Mock 1d4 roll to return 2 (index 1 = 'down')
      mockRandom.setValues([2])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 5, y: 6 }) // down instead of right

      // Mock 1d4 roll to return 3 (index 2 = 'left')
      mockRandom.setValues([3])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 4, y: 5 }) // left instead of right

      // Mock 1d4 roll to return 4 (index 3 = 'right')
      mockRandom.setValues([4])
      expect(movementService.applyDirection(startPos, 'right', player)).toEqual({ x: 6, y: 5 }) // right (randomly chose same direction)
    })

    test('always randomizes direction while confused (ignores input)', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const startPos = { x: 5, y: 5 }

      // Player tries to go UP, but random roll says DOWN
      mockRandom.setValues([2]) // 1d4 = 2 → index 1 = 'down'
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 6 })

      // Player tries to go LEFT, but random roll says RIGHT
      mockRandom.setValues([4]) // 1d4 = 4 → index 3 = 'right'
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

      // Test all 4 random outcomes
      for (let i = 1; i <= 4; i++) {
        mockRandom.setValues([i])
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

      mockRandom.setValues([2]) // 1d4 = 2 → index 1 = 'down'
      expect(movementService.applyDirection(startPos, 'up', player)).toEqual({ x: 5, y: 6 }) // down instead of up
    })
  })
})
