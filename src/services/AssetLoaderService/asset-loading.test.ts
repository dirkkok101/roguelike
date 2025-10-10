import { AssetLoaderService } from './AssetLoaderService'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null
  onerror: ((error: Error) => void) | null = null
  src = ''
  width = 0
  height = 0

  constructor() {
    // Simulate successful load after src is set
    setTimeout(() => {
      if (this.onload) {
        this.width = 1024
        this.height = 1024
        this.onload()
      }
    }, 0)
  }
}

global.Image = MockImage as any

describe('AssetLoaderService', () => {
  let service: AssetLoaderService

  beforeEach(() => {
    service = new AssetLoaderService()
    jest.clearAllMocks()
  })

  describe('loadTileset', () => {
    it('loads PNG and .prf files successfully', async () => {
      const mockPrfContent = `
# Sample .prf file
feat:FLOOR:torch:0x96:0x80
monster:Bat:0x8B:0x81
object:potion:Healing:0x82:0x80
      `.trim()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      const tileset = await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'], 32)

      expect(tileset.isLoaded).toBe(true)
      expect(tileset.image.width).toBe(1024)
      expect(tileset.config.name).toBe('test 32x32')
      expect(tileset.config.tileWidth).toBe(32)
      expect(tileset.config.tiles.size).toBeGreaterThan(0)
    })

    it('caches loaded tilesets to avoid duplicate loads', async () => {
      const mockPrfContent = 'feat:FLOOR:torch:0x96:0x80'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      // First load
      const tileset1 = await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])

      // Second load (should use cache)
      const tileset2 = await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])

      expect(tileset1).toBe(tileset2) // Same reference
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only fetched once
    })

    it('loads multiple .prf files and combines entries', async () => {
      const mockPrf1 = 'feat:FLOOR:torch:0x96:0x80'
      const mockPrf2 = 'monster:Bat:0x8B:0x81'

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockPrf1,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockPrf2,
        })

      const tileset = await service.loadTileset('/assets/test/32x32.png', [
        '/assets/test/feat.prf',
        '/assets/test/monster.prf',
      ])

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(tileset.config.tiles.size).toBeGreaterThan(0)
    })

    it('throws error when image fails to load', async () => {
      // Override Image mock to trigger error
      class FailingImage {
        onload: (() => void) | null = null
        onerror: ((error: Error) => void) | null = null
        src = ''

        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Failed to load image'))
            }
          }, 0)
        }
      }

      global.Image = FailingImage as any

      const mockPrfContent = 'feat:FLOOR:torch:0x96:0x80'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await expect(service.loadTileset('/invalid/image.png', ['/assets/test/test.prf'])).rejects.toThrow(
        'Failed to load tileset'
      )

      // Restore mock
      global.Image = MockImage as any
    })

    it('throws error when .prf file fetch fails (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(service.loadTileset('/assets/test/32x32.png', ['/invalid/file.prf'])).rejects.toThrow(
        'Failed to load tileset'
      )
    })

    it('throws error when .prf file fetch fails (network error)', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])).rejects.toThrow(
        'Failed to load tileset'
      )
    })
  })

  describe('getSprite', () => {
    beforeEach(async () => {
      const mockPrfContent = `
feat:FLOOR:torch:0x96:0x80
feat:CLOSED:lit:0x96:0x84
monster:Bat:0x8B:0x81
      `.trim()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])
    })

    it('returns sprite coordinate for valid key', () => {
      const coord = service.getSprite('FLOOR')

      expect(coord).toBeDefined()
      expect(coord?.x).toBe(0) // (0x80 - 0x80) * 32
      expect(coord?.y).toBe(704) // (0x96 - 0x80) * 32
    })

    it('returns null for invalid key', () => {
      const coord = service.getSprite('INVALID_KEY')

      expect(coord).toBeNull()
    })

    it('returns null when no tileset loaded', () => {
      const emptyService = new AssetLoaderService()
      const coord = emptyService.getSprite('FLOOR')

      expect(coord).toBeNull()
    })
  })

  describe('getSpriteByName', () => {
    beforeEach(async () => {
      const mockPrfContent = `
feat:FLOOR:torch:0x96:0x80
feat:FLOOR:lit:0x96:0x81
monster:Bat:0x8B:0x82
      `.trim()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])
    })

    it('returns sprite with condition specified', () => {
      const coord = service.getSpriteByName('feat', 'FLOOR', 'torch')

      expect(coord).toBeDefined()
      expect(coord?.hexX).toBe(0x80)
      expect(coord?.hexY).toBe(0x96)
    })

    it('falls back to name without condition', () => {
      const coord = service.getSpriteByName('feat', 'FLOOR')

      expect(coord).toBeDefined()
      // Should get first FLOOR entry
      expect(coord?.hexY).toBe(0x96)
    })

    it('returns null for invalid name', () => {
      const coord = service.getSpriteByName('feat', 'INVALID')

      expect(coord).toBeNull()
    })
  })

  describe('isLoaded', () => {
    it('returns false when no tileset loaded', () => {
      expect(service.isLoaded()).toBe(false)
    })

    it('returns true when tileset loaded', async () => {
      const mockPrfContent = 'feat:FLOOR:torch:0x96:0x80'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])

      expect(service.isLoaded()).toBe(true)
    })
  })

  describe('getCurrentTileset', () => {
    it('returns null when no tileset loaded', () => {
      expect(service.getCurrentTileset()).toBeNull()
    })

    it('returns current tileset when loaded', async () => {
      const mockPrfContent = 'feat:FLOOR:torch:0x96:0x80'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])

      const tileset = service.getCurrentTileset()

      expect(tileset).not.toBeNull()
      expect(tileset?.isLoaded).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('clears all cached tilesets', async () => {
      const mockPrfContent = 'feat:FLOOR:torch:0x96:0x80'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockPrfContent,
      })

      await service.loadTileset('/assets/test/32x32.png', ['/assets/test/test.prf'])

      expect(service.isLoaded()).toBe(true)

      service.clearCache()

      expect(service.isLoaded()).toBe(false)
      expect(service.getCurrentTileset()).toBeNull()
    })
  })
})
