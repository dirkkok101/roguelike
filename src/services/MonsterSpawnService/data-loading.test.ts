import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService'

describe('MonsterSpawnService - Data Loading', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)
    originalFetch = global.fetch
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe('loadMonsterData()', () => {
    it('should load monster data from JSON file', async () => {
      // Mock valid monster data
      const mockData = [
        {
          letter: 'K',
          name: 'Kobold',
          hp: '1d8',
          ac: 7,
          damage: '1d4',
          xpValue: 5,
          level: 1,
          speed: 10,
          rarity: 'common',
          mean: false,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 1,
            aggroRange: 5,
            fleeThreshold: 0.0,
            special: [],
          },
        },
      ]

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response)

      await service.loadMonsterData()

      // Should have called fetch with correct path
      expect(global.fetch).toHaveBeenCalledWith('/data/monsters.json')
    })

    it('should handle missing JSON file gracefully', async () => {
      // Mock 404 response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      await expect(service.loadMonsterData()).rejects.toThrow(
        'Failed to load monster data'
      )
    })

    it('should handle malformed JSON', async () => {
      // Mock fetch with invalid JSON
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token')
        },
      } as Response)

      await expect(service.loadMonsterData()).rejects.toThrow(
        'Failed to load monster data'
      )
    })

    it('should validate monster data structure', async () => {
      // Mock data with missing required field
      const invalidData = [
        {
          letter: 'K',
          name: 'Kobold',
          // Missing hp field
          ac: 7,
        },
      ]

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      } as Response)

      await expect(service.loadMonsterData()).rejects.toThrow(
        'missing required field'
      )
    })

    it('should cache loaded data', async () => {
      // Mock valid monster data
      const mockData = [
        {
          letter: 'K',
          name: 'Kobold',
          hp: '1d8',
          ac: 7,
          damage: '1d4',
          xpValue: 5,
          level: 1,
          speed: 10,
          rarity: 'common',
          mean: false,
          aiProfile: {
            behavior: 'SIMPLE',
            intelligence: 1,
            aggroRange: 5,
            fleeThreshold: 0.0,
            special: [],
          },
        },
      ]

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response)

      // First load
      await service.loadMonsterData()

      // Second load - should not call fetch again (cached)
      await service.loadMonsterData()

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
