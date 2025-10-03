import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'

describe('LightingService - Refill', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  describe('refillLantern()', () => {
    test('adds oil to lantern', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 100 }

      const refilled = service.refillLantern(lantern, 500)

      expect(refilled.fuel).toBe(600)
    })

    test('respects max fuel limit', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 800 }

      const refilled = service.refillLantern(lantern, 500)

      expect(refilled.fuel).toBe(1000) // Capped at maxFuel
    })

    test('uses default oil amount of 500 when not specified', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 0 }

      const refilled = service.refillLantern(lantern)

      expect(refilled.fuel).toBe(500)
    })

    test('throws error for non-lantern types', () => {
      const torch = service.createTorch()

      expect(() => service.refillLantern(torch, 500)).toThrow(
        'Can only refill lanterns'
      )
    })

    test('throws error when trying to refill artifact', () => {
      const artifact = service.createArtifact('Phial', 3)

      expect(() => service.refillLantern(artifact, 500)).toThrow(
        'Can only refill lanterns'
      )
    })

    test('returns new object (immutability)', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 100 }

      const refilled = service.refillLantern(lantern, 500)

      expect(refilled).not.toBe(lantern) // Different reference
      expect(lantern.fuel).toBe(100) // Original unchanged
      expect(refilled.fuel).toBe(600) // New object updated
    })

    test('can refill empty lantern', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 0 }

      const refilled = service.refillLantern(lantern, 500)

      expect(refilled.fuel).toBe(500)
    })

    test('can refill with partial oil flask', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 100 }

      const refilled = service.refillLantern(lantern, 250)

      expect(refilled.fuel).toBe(350)
    })

    test('respects maxFuel even with large refill amount', () => {
      let lantern = service.createLantern()
      lantern = { ...lantern, fuel: 500 }

      const refilled = service.refillLantern(lantern, 1000)

      expect(refilled.fuel).toBe(1000) // Capped at maxFuel, not 1500
    })
  })
})
