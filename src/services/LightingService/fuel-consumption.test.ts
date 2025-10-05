import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'
import { LightSource } from '@game/core'

describe('LightingService - Fuel Consumption', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  // NOTE: tickFuel() tests moved to fuel-tick-result.test.ts with new Player-based signature

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
