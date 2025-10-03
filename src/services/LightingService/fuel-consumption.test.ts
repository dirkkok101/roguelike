import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'
import { LightSource } from '@types/core'

describe('LightingService - Fuel Consumption', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  describe('tickFuel()', () => {
    test('reduces fuel by 1 each tick', () => {
      const torch = service.createTorch()
      expect(torch.fuel).toBe(500)

      const ticked = service.tickFuel(torch)
      expect(ticked.fuel).toBe(499)
    })

    test('does not affect permanent lights', () => {
      const artifact = service.createArtifact('Phial', 3)
      const ticked = service.tickFuel(artifact)
      expect(ticked.fuel).toBeUndefined()
    })

    test('does not go below zero', () => {
      let torch: LightSource = { ...service.createTorch(), fuel: 0 }
      const ticked = service.tickFuel(torch)
      expect(ticked.fuel).toBe(0)
    })

    test('returns new object (immutability)', () => {
      const torch = service.createTorch()
      const ticked = service.tickFuel(torch)

      expect(ticked).not.toBe(torch) // Different reference
      expect(torch.fuel).toBe(500) // Original unchanged
      expect(ticked.fuel).toBe(499) // New object updated
    })
  })

  describe('generateFuelWarning()', () => {
    test('warns at 50 turns remaining', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 50 }
      expect(service.generateFuelWarning(torch)).toContain('getting dim')
    })

    test('warns at 10 turns remaining', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 10 }
      expect(service.generateFuelWarning(torch)).toContain('flickers')
    })

    test('warns when fuel exhausted', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 0 }
      expect(service.generateFuelWarning(torch)).toContain('goes out')
      expect(service.generateFuelWarning(torch)).toContain('darkness')
    })

    test('no warning for permanent lights', () => {
      const artifact = service.createArtifact('Phial', 3)
      expect(service.generateFuelWarning(artifact)).toBeNull()
    })

    test('no warning for normal fuel levels', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 100 }
      expect(service.generateFuelWarning(torch)).toBeNull()
    })
  })

  describe('isFuelLow()', () => {
    test('returns true when fuel < 50', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 49 }
      expect(service.isFuelLow(torch)).toBe(true)
    })

    test('returns false when fuel >= 50', () => {
      const torch: LightSource = { ...service.createTorch(), fuel: 50 }
      expect(service.isFuelLow(torch)).toBe(false)
    })

    test('returns false for permanent lights', () => {
      const artifact = service.createArtifact('Phial', 3)
      expect(service.isFuelLow(artifact)).toBe(false)
    })

    test('returns false when fuel is undefined', () => {
      const lightSource: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        name: 'Test',
      }
      expect(service.isFuelLow(lightSource)).toBe(false)
    })
  })
})
