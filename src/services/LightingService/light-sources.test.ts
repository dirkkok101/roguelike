import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'

describe('LightingService - Light Sources', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  describe('createTorch()', () => {
    test('creates torch with correct properties', () => {
      const torch = service.createTorch()

      expect(torch.type).toBe('torch')
      expect(torch.radius).toBe(2)
      expect(torch.isPermanent).toBe(false)
      expect(torch.fuel).toBe(500)
      expect(torch.maxFuel).toBe(500)
      expect(torch.name).toBe('Torch')
    })
  })

  describe('createLantern()', () => {
    test('creates lantern with correct properties', () => {
      const lantern = service.createLantern()

      expect(lantern.type).toBe('lantern')
      expect(lantern.radius).toBe(2)
      expect(lantern.isPermanent).toBe(false)
      expect(lantern.fuel).toBe(500)
      expect(lantern.maxFuel).toBe(1000)
      expect(lantern.name).toBe('Lantern')
    })
  })

  describe('createArtifact()', () => {
    test('creates permanent light with custom radius', () => {
      const artifact = service.createArtifact('Phial of Galadriel', 3)

      expect(artifact.type).toBe('artifact')
      expect(artifact.radius).toBe(3)
      expect(artifact.isPermanent).toBe(true)
      expect(artifact.fuel).toBeUndefined()
      expect(artifact.maxFuel).toBeUndefined()
      expect(artifact.name).toBe('Phial of Galadriel')
    })

    test('creates artifact with different names and radii', () => {
      const star = service.createArtifact('Star of Elendil', 3)
      expect(star.name).toBe('Star of Elendil')
      expect(star.radius).toBe(3)

      const stone = service.createArtifact('Arkenstone of Thrain', 2)
      expect(stone.name).toBe('Arkenstone of Thrain')
      expect(stone.radius).toBe(2)
    })
  })

  describe('getLightRadius()', () => {
    test('returns correct radius for torch', () => {
      const torch = service.createTorch()
      expect(service.getLightRadius(torch)).toBe(2)
    })

    test('returns correct radius for lantern', () => {
      const lantern = service.createLantern()
      expect(service.getLightRadius(lantern)).toBe(2)
    })

    test('returns correct radius for artifact', () => {
      const artifact = service.createArtifact('Phial', 3)
      expect(service.getLightRadius(artifact)).toBe(3)
    })

    test('returns 0 when fuel is exhausted', () => {
      const torch = { ...service.createTorch(), fuel: 0 }
      expect(service.getLightRadius(torch)).toBe(0)
    })

    test('returns 0 for null light source', () => {
      expect(service.getLightRadius(null)).toBe(0)
    })

    test('returns radius when fuel is low but not empty', () => {
      const torch = { ...service.createTorch(), fuel: 1 }
      expect(service.getLightRadius(torch)).toBe(2)
    })

    test('returns radius for permanent lights regardless of fuel field', () => {
      const artifact = service.createArtifact('Phial', 3)
      expect(service.getLightRadius(artifact)).toBe(3)
    })
  })
})
