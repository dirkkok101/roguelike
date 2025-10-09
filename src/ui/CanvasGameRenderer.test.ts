import { CanvasGameRenderer } from './CanvasGameRenderer'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Position } from '@game/core/core'
import { Tileset, TileCoordinate } from '@assets/assets'

// Mock canvas context
class MockCanvasRenderingContext2D {
  imageSmoothingEnabled = true
  globalAlpha = 1.0
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  globalCompositeOperation = 'source-over'

  clearRect = jest.fn()
  fillRect = jest.fn()
  drawImage = jest.fn()
  save = jest.fn()
  restore = jest.fn()
}

describe('CanvasGameRenderer', () => {
  let canvas: HTMLCanvasElement
  let renderer: CanvasGameRenderer
  let renderingService: RenderingService
  let assetLoader: AssetLoaderService
  let mockCtx: MockCanvasRenderingContext2D

  beforeEach(() => {
    // Create canvas element
    canvas = document.createElement('canvas')

    // Mock canvas context
    mockCtx = new MockCanvasRenderingContext2D()
    canvas.getContext = jest.fn().mockReturnValue(mockCtx)

    // Create services
    const fovService = new FOVService(new StatusEffectService())
    renderingService = new RenderingService(fovService)
    assetLoader = new AssetLoaderService()

    // Mock AssetLoaderService to simulate loaded tileset
    const mockImage = new Image()
    const mockTileset: Tileset = {
      config: {
        name: 'Test Tileset',
        tileWidth: 32,
        tileHeight: 32,
        imageUrl: '/test/32x32.png',
        tiles: new Map(),
      },
      image: mockImage,
      isLoaded: true,
    }

    jest.spyOn(assetLoader, 'isLoaded').mockReturnValue(true)
    jest.spyOn(assetLoader, 'getCurrentTileset').mockReturnValue(mockTileset)

    // Create renderer
    renderer = new CanvasGameRenderer(renderingService, assetLoader, canvas)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('initializes canvas with correct dimensions', () => {
      expect(canvas.width).toBe(2560) // 80 tiles × 32px
      expect(canvas.height).toBe(704) // 22 tiles × 32px
    })

    it('disables image smoothing for pixel art', () => {
      expect(mockCtx.imageSmoothingEnabled).toBe(false)
    })

    it('throws error if canvas context is unavailable', () => {
      const badCanvas = document.createElement('canvas')
      badCanvas.getContext = jest.fn().mockReturnValue(null)

      expect(
        () => new CanvasGameRenderer(renderingService, assetLoader, badCanvas)
      ).toThrow('Failed to get 2D rendering context')
    })

    it('accepts custom configuration', () => {
      const customCanvas = document.createElement('canvas')
      customCanvas.getContext = jest.fn().mockReturnValue(new MockCanvasRenderingContext2D())

      const customRenderer = new CanvasGameRenderer(
        renderingService,
        assetLoader,
        customCanvas,
        {
          tileWidth: 16,
          tileHeight: 16,
          exploredOpacity: 0.3,
        }
      )

      const config = customRenderer.getConfig()
      expect(config.tileWidth).toBe(16)
      expect(config.tileHeight).toBe(16)
      expect(config.exploredOpacity).toBe(0.3)
    })
  })

  describe('clear', () => {
    it('clears the canvas and fills with black', () => {
      renderer.clear()

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 2560, 704)
      expect(mockCtx.fillStyle).toBe('#000000')
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 2560, 704)
    })
  })

  describe('worldToScreen', () => {
    it('converts grid coordinates to pixel coordinates', () => {
      const screen = renderer.worldToScreen({ x: 10, y: 5 })

      expect(screen.x).toBe(320) // 10 × 32
      expect(screen.y).toBe(160) // 5 × 32
    })

    it('converts origin correctly', () => {
      const screen = renderer.worldToScreen({ x: 0, y: 0 })

      expect(screen.x).toBe(0)
      expect(screen.y).toBe(0)
    })

    it('converts bottom-right corner correctly', () => {
      const screen = renderer.worldToScreen({ x: 79, y: 21 })

      expect(screen.x).toBe(2528) // 79 × 32
      expect(screen.y).toBe(672) // 21 × 32
    })
  })

  describe('drawTile', () => {
    it('draws sprite at correct position', () => {
      const sprite: TileCoordinate = {
        x: 64, // Sprite offset in tileset
        y: 96,
        hexX: 0x82,
        hexY: 0x83,
      }

      renderer.drawTile(5, 3, sprite, 1.0)

      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        expect.any(Object), // HTMLImageElement
        64, // Source X
        96, // Source Y
        32, // Source width
        32, // Source height
        160, // Destination X (5 × 32)
        96, // Destination Y (3 × 32)
        32, // Destination width
        32 // Destination height
      )
    })

    it('applies opacity correctly', () => {
      const sprite: TileCoordinate = {
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      }

      renderer.drawTile(0, 0, sprite, 0.5)

      // Check that globalAlpha was set to 0.5
      expect(mockCtx.globalAlpha).toBe(1.0) // Should be restored after draw
    })

    it('handles missing tileset gracefully', () => {
      jest.spyOn(assetLoader, 'getCurrentTileset').mockReturnValue(null)

      const sprite: TileCoordinate = {
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      }

      // Should not throw, just log warning
      renderer.drawTile(0, 0, sprite, 1.0)

      expect(mockCtx.drawImage).not.toHaveBeenCalled()
    })
  })

  describe('render', () => {
    it('clears canvas before rendering', () => {
      const mockState = createMockGameState()

      renderer.render(mockState)

      expect(mockCtx.clearRect).toHaveBeenCalled()
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })

    it('skips rendering if tileset not loaded', () => {
      jest.spyOn(assetLoader, 'isLoaded').mockReturnValue(false)

      const mockState = createMockGameState()

      renderer.render(mockState)

      // Clear should not be called if tileset not loaded
      expect(mockCtx.clearRect).not.toHaveBeenCalled()
    })
  })

  describe('getters', () => {
    it('returns canvas element', () => {
      expect(renderer.getCanvas()).toBe(canvas)
    })

    it('returns configuration', () => {
      const config = renderer.getConfig()

      expect(config.tileWidth).toBe(32)
      expect(config.tileHeight).toBe(32)
      expect(config.gridWidth).toBe(80)
      expect(config.gridHeight).toBe(22)
      expect(config.exploredOpacity).toBe(0.5)
    })

    it('returns configuration copy (not reference)', () => {
      const config1 = renderer.getConfig()
      const config2 = renderer.getConfig()

      expect(config1).not.toBe(config2) // Different objects
      expect(config1).toEqual(config2) // But same values
    })
  })
})

// ============================================================================
// HELPER: Create mock game state
// ============================================================================

function createMockGameState(): GameState {
  return {
    player: {
      position: { x: 5, y: 5 },
      hp: 12,
      maxHp: 12,
      strength: 16,
      maxStrength: 16,
      ac: 4,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
    },
    currentLevel: 1,
    levels: new Map(),
    visibleCells: new Set(),
    messages: [],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'test-game',
    characterName: 'Test Hero',
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap: new Map(),
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    debug: {
      isEnabled: false,
      godMode: false,
      revealMap: false,
    },
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  }
}
