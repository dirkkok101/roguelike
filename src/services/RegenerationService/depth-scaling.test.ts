import { RegenerationService } from './RegenerationService'
import { RingService } from '@services/RingService'

describe('RegenerationService - Depth Scaling', () => {
  let service: RegenerationService
  let ringService: RingService

  beforeEach(() => {
    ringService = new RingService()
    service = new RegenerationService(ringService)
  })

  describe('calculateRegenTurns()', () => {
    test('depth 1 returns 10 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(1)
      expect(turns).toBe(10)
    })

    test('depth 5 returns 9 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(5)
      expect(turns).toBe(9)
    })

    test('depth 10 returns 8 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(10)
      expect(turns).toBe(8)
    })

    test('depth 15 returns 7 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(15)
      expect(turns).toBe(7)
    })

    test('depth 20 returns 6 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(20)
      expect(turns).toBe(6)
    })

    test('depth 26 returns 5 turns/HP (capped)', () => {
      const turns = (service as any).calculateRegenTurns(26)
      expect(turns).toBe(5)
    })

    test('depth 50 returns 5 turns/HP (capped, not negative)', () => {
      const turns = (service as any).calculateRegenTurns(50)
      expect(turns).toBe(5)
    })

    test('all depths return values between 5-10', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const turns = (service as any).calculateRegenTurns(depth)
        expect(turns).toBeGreaterThanOrEqual(5)
        expect(turns).toBeLessThanOrEqual(10)
      }
    })
  })
})
