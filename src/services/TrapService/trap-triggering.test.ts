import { TrapService } from './TrapService'
import { MockRandom } from '@services/RandomService'
import { Trap, TrapType } from '@game/core/core'

describe('TrapService - Trap Triggering', () => {
  let service: TrapService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new TrapService(mockRandom)
  })

  function createTestTrap(type: TrapType, discovered = false, triggered = false): Trap {
    return {
      id: 'trap-1',
      position: { x: 5, y: 5 },
      type,
      discovered,
      triggered,
    }
  }

  describe('shouldTriggerTrap', () => {
    test('undiscovered trap always triggers', () => {
      const trap = createTestTrap(TrapType.BEAR, false, false)

      const result = service.shouldTriggerTrap(trap)

      expect(result).toBe(true)
    })

    test('discovered trap has 10% trigger chance when succeeds', () => {
      const trap = createTestTrap(TrapType.BEAR, true, false)

      mockRandom.setValues([1]) // 10% chance succeeds

      const result = service.shouldTriggerTrap(trap)

      expect(result).toBe(true)
    })

    test('discovered trap has 10% trigger chance when fails', () => {
      const trap = createTestTrap(TrapType.BEAR, true, false)

      mockRandom.setValues([0]) // 10% chance fails

      const result = service.shouldTriggerTrap(trap)

      expect(result).toBe(false)
    })

    test('already triggered trap does not trigger again', () => {
      const trap = createTestTrap(TrapType.BEAR, false, true)

      const result = service.shouldTriggerTrap(trap)

      expect(result).toBe(false)
    })

    test('discovered and triggered trap does not trigger', () => {
      const trap = createTestTrap(TrapType.BEAR, true, true)

      mockRandom.setValues([1])

      const result = service.shouldTriggerTrap(trap)

      expect(result).toBe(false)
    })
  })
})
