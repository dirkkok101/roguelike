import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'
import { createTestTorch, createTestLantern, createTestArtifact } from '../../test-utils'

describe('LightingService - Light Sources', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  // NOTE: Factory methods (createTorch, createLantern, createArtifact) have been removed
  // Light sources are now created directly in DungeonService using new item structures
  // Tests use createTestTorch/Lantern/Artifact helpers from test-utils

  describe('getLightRadius()', () => {
    test('returns correct radius for torch', () => {
      const torch = createTestTorch()
      expect(service.getLightRadius(torch)).toBe(2)
    })

    test('returns correct radius for lantern', () => {
      const lantern = createTestLantern()
      expect(service.getLightRadius(lantern)).toBe(2)
    })

    test('returns correct radius for artifact', () => {
      const artifact = createTestArtifact('Phial', 3)
      expect(service.getLightRadius(artifact)).toBe(3)
    })

    test('returns 0 when fuel is exhausted', () => {
      const torch = createTestTorch({ fuel: 0 })
      expect(service.getLightRadius(torch)).toBe(0)
    })

    test('returns 0 for null light source', () => {
      expect(service.getLightRadius(null)).toBe(0)
    })

    test('returns radius when fuel is low but not empty', () => {
      const torch = createTestTorch({ fuel: 1 })
      expect(service.getLightRadius(torch)).toBe(2)
    })

    test('returns radius for permanent lights regardless of fuel field', () => {
      const artifact = createTestArtifact('Phial', 3)
      expect(service.getLightRadius(artifact)).toBe(3)
    })
  })

  describe('isFuelLow()', () => {
    test('returns true when fuel is below 50', () => {
      const torch = createTestTorch({ fuel: 49 })
      expect(service.isFuelLow(torch)).toBe(true)
    })

    test('returns false when fuel is 50 or above', () => {
      const torch = createTestTorch({ fuel: 50 })
      expect(service.isFuelLow(torch)).toBe(false)
    })

    test('returns false for permanent lights', () => {
      const artifact = createTestArtifact('Phial', 3)
      expect(service.isFuelLow(artifact)).toBe(false)
    })
  })

  describe('generateFuelWarning()', () => {
    test('returns warning at 50 fuel', () => {
      const torch = createTestTorch({ fuel: 50 })
      expect(service.generateFuelWarning(torch)).toContain('dim')
    })

    test('returns warning at 10 fuel', () => {
      const torch = createTestTorch({ fuel: 10 })
      expect(service.generateFuelWarning(torch)).toContain('flickers')
    })

    test('returns warning at 0 fuel', () => {
      const torch = createTestTorch({ fuel: 0 })
      expect(service.generateFuelWarning(torch)).toContain('goes out')
    })

    test('returns null for permanent lights', () => {
      const artifact = createTestArtifact('Phial', 3)
      expect(service.generateFuelWarning(artifact)).toBeNull()
    })

    test('returns null for fuel levels without warnings', () => {
      const torch = createTestTorch({ fuel: 100 })
      expect(service.generateFuelWarning(torch)).toBeNull()
    })
  })
})
