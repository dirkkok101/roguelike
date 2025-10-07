import { TargetingService } from './TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import { Position } from '@game/core/core'

describe('TargetingService - Range Validation', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService

  beforeEach(() => {
    const mockRandom = new MockRandom()
    mockRandom.setValues([5, 5, 5])
    const statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
    fovService = new FOVService(statusEffectService)
    targetingService = new TargetingService(fovService, movementService)
  })

  describe('isTargetInRange', () => {
    test('returns true when target is in range', () => {
      const playerPos: Position = { x: 5, y: 5 }
      const targetPos: Position = { x: 8, y: 5 } // 3 tiles away
      const maxRange = 5

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(true)
      expect(result.distance).toBe(3)
    })

    test('returns false when target is out of range', () => {
      const playerPos: Position = { x: 5, y: 5 }
      const targetPos: Position = { x: 15, y: 5 } // 10 tiles away
      const maxRange = 7

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(false)
      expect(result.distance).toBe(10)
    })

    test('returns true at exact max range (inclusive)', () => {
      const playerPos: Position = { x: 5, y: 5 }
      const targetPos: Position = { x: 10, y: 5 } // 5 tiles away
      const maxRange = 5

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(true)
      expect(result.distance).toBe(5)
    })

    test('uses Manhattan distance (L1 norm)', () => {
      const playerPos: Position = { x: 5, y: 5 }
      const targetPos: Position = { x: 7, y: 7 } // 4 tiles Manhattan (2+2)
      const maxRange = 3

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(false)
      expect(result.distance).toBe(4) // Not 2.83 (Euclidean)
    })

    test('works with same position (distance 0)', () => {
      const playerPos: Position = { x: 5, y: 5 }
      const targetPos: Position = { x: 5, y: 5 } // Same position
      const maxRange = 1

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(true)
      expect(result.distance).toBe(0)
    })

    test('returns correct distance for diagonal movement', () => {
      const playerPos: Position = { x: 0, y: 0 }
      const targetPos: Position = { x: 3, y: 4 } // 7 tiles Manhattan
      const maxRange = 10

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(true)
      expect(result.distance).toBe(7)
    })

    test('handles negative coordinates correctly', () => {
      const playerPos: Position = { x: -5, y: -5 }
      const targetPos: Position = { x: 5, y: 5 } // 20 tiles away
      const maxRange = 15

      const result = targetingService.isTargetInRange(playerPos, targetPos, maxRange)

      expect(result.inRange).toBe(false)
      expect(result.distance).toBe(20)
    })
  })
})
