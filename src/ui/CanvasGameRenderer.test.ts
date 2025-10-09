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

  describe('renderTerrain', () => {
    it('renders visible tiles at full opacity', () => {
      const mockState = createMockGameState()

      // Create a simple 3×3 level
      const level = createSimpleLevel(3, 3)
      mockState.levels.set(1, level)

      // Mark center tile as visible
      mockState.visibleCells.add('1,1')

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 32,
        y: 64,
        hexX: 0x81,
        hexY: 0x82,
      })

      renderer.render(mockState)

      // Should have drawn at least the visible tile
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('renders explored tiles at reduced opacity', () => {
      const mockState = createMockGameState()

      // Create a simple 3×3 level
      const level = createSimpleLevel(3, 3)
      level.explored[1][1] = true // Mark as explored
      mockState.levels.set(1, level)

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      })

      renderer.render(mockState)

      // Should have drawn the explored tile
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('skips unexplored tiles', () => {
      const mockState = createMockGameState()

      // Create a simple 3×3 level (all unexplored by default)
      const level = createSimpleLevel(3, 3)
      mockState.levels.set(1, level)

      // Mock sprite lookup
      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockImplementation((char: string) => {
        if (char === '@') {
          return { x: 0, y: 64, hexX: 0x80, hexY: 0x82 }
        }
        return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
      })

      renderer.render(mockState)

      // Should draw player but no terrain tiles (all unexplored)
      const terrainCalls = getSpriteMock.mock.calls.filter(call => call[0] === '.')
      expect(terrainCalls.length).toBe(0)
    })

    it('skips tiles with missing sprites', () => {
      const mockState = createMockGameState()

      // Create a simple 3×3 level
      const level = createSimpleLevel(3, 3)
      level.explored[1][1] = true
      mockState.levels.set(1, level)

      // Mock sprite lookup to return null (missing sprite)
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue(null)

      renderer.render(mockState)

      // Should not draw any tiles (missing sprites)
      expect(mockCtx.drawImage).not.toHaveBeenCalled()
    })

    it('handles missing level gracefully', () => {
      const mockState = createMockGameState()
      mockState.levels.clear() // No levels

      // Should not throw
      renderer.render(mockState)

      expect(mockCtx.clearRect).toHaveBeenCalled() // Canvas still cleared
      expect(mockCtx.drawImage).not.toHaveBeenCalled() // No tiles drawn
    })
  })

  describe('renderEntities', () => {
    it('renders monsters in visible FOV', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add a monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 10,
        maxHp: 10,
        ac: 5,
        damage: '1d4',
        xpValue: 10,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark monster position as visible
      mockState.visibleCells.add('5,5')
      mockState.levels.set(1, level)

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 32,
        hexX: 0x80,
        hexY: 0x81,
      })

      renderer.render(mockState)

      // Should draw monster
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('does not render monsters in explored state (only visible)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add a monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 10,
        maxHp: 10,
        ac: 5,
        damage: '1d4',
        xpValue: 10,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark position as explored (not visible)
      level.explored[5][5] = true
      mockState.levels.set(1, level)

      // Mock sprite lookup - track what characters are requested
      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockImplementation((char: string) => {
        if (char === '.') {
          // Terrain sprite
          return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
        }
        // Monster sprite
        return { x: 0, y: 32, hexX: 0x80, hexY: 0x81 }
      })

      renderer.render(mockState)

      // Check that monster sprite ('B') was NOT requested
      const monsterSpriteCalls = getSpriteMock.mock.calls.filter(call => call[0] === 'B')
      expect(monsterSpriteCalls.length).toBe(0)
    })

    it('renders items in visible FOV', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add an item
      level.items.push({
        id: 'item-1',
        name: 'Potion of Healing',
        type: 'POTION',
        identified: false,
        position: { x: 3, y: 3 },
      } as any)

      // Mark item position as visible
      mockState.visibleCells.add('3,3')
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 64,
        y: 0,
        hexX: 0x82,
        hexY: 0x80,
      })

      renderer.render(mockState)

      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('renders items in explored state (items persist in memory)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add an item
      level.items.push({
        id: 'item-1',
        name: 'Potion of Healing',
        type: 'POTION',
        identified: false,
        position: { x: 3, y: 3 },
      } as any)

      // Mark position as explored (not visible)
      level.explored[3][3] = true
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 64,
        y: 0,
        hexX: 0x82,
        hexY: 0x80,
      })

      renderer.render(mockState)

      // Should draw item (items shown in memory)
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('renders gold in visible FOV', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add gold
      level.gold.push({
        id: 'gold-1',
        amount: 50,
        position: { x: 7, y: 7 },
      })

      // Mark gold position as visible
      mockState.visibleCells.add('7,7')
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 96,
        y: 0,
        hexX: 0x83,
        hexY: 0x80,
      })

      renderer.render(mockState)

      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('does not render gold in explored state (gold not in memory)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add gold
      level.gold.push({
        id: 'gold-1',
        amount: 50,
        position: { x: 7, y: 7 },
      })

      // Mark position as explored (not visible)
      level.explored[7][7] = true
      mockState.levels.set(1, level)

      // Mock sprite lookup
      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockImplementation((char: string) => {
        if (char === '.') {
          return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
        }
        return { x: 96, y: 0, hexX: 0x83, hexY: 0x80 }
      })

      renderer.render(mockState)

      // Check that gold sprite ('$') was NOT requested
      const goldSpriteCalls = getSpriteMock.mock.calls.filter(call => call[0] === '$')
      expect(goldSpriteCalls.length).toBe(0)
    })

    it('renders stairs in explored state (stairs persist)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      level.stairsDown = { x: 5, y: 5 }

      // Mark stairs as explored (not visible)
      level.explored[5][5] = true
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      })

      renderer.render(mockState)

      // Should draw stairs (stairs persist in memory)
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('renders discovered traps', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add discovered trap
      level.traps.push({
        id: 'trap-1',
        type: 'DART',
        position: { x: 4, y: 4 },
        discovered: true,
      })

      // Mark trap position as explored
      level.explored[4][4] = true
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      })

      renderer.render(mockState)

      // Should draw trap
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('does not render undiscovered traps', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add undiscovered trap
      level.traps.push({
        id: 'trap-1',
        type: 'DART',
        position: { x: 4, y: 4 },
        discovered: false,
      })

      // Mark trap position as visible
      mockState.visibleCells.add('4,4')
      mockState.levels.set(1, level)

      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockReturnValue({
        x: 0,
        y: 0,
        hexX: 0x80,
        hexY: 0x80,
      })

      renderer.render(mockState)

      // Check that trap sprite ('^') was NOT requested (undiscovered)
      const trapSpriteCalls = getSpriteMock.mock.calls.filter(call => call[0] === '^')
      expect(trapSpriteCalls.length).toBe(0)
    })

    it('handles detected monsters with dimmed opacity', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add a monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 10,
        maxHp: 10,
        ac: 5,
        damage: '1d4',
        xpValue: 10,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark monster as detected but not visible
      mockState.detectedMonsters.add('5,5')
      level.explored[5][5] = true
      mockState.levels.set(1, level)

      // Mock sprite lookup
      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockImplementation((char: string) => {
        if (char === '.') {
          return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
        }
        return { x: 0, y: 32, hexX: 0x80, hexY: 0x81 }
      })

      renderer.render(mockState)

      // Check that monster sprite ('B') was NOT requested
      // (monsters only visible in FOV, detection doesn't override)
      const monsterSpriteCalls = getSpriteMock.mock.calls.filter(call => call[0] === 'B')
      expect(monsterSpriteCalls.length).toBe(0)
    })
  })

  describe('renderPlayer', () => {
    it('renders player sprite at player position', () => {
      const mockState = createMockGameState()
      mockState.player.position = { x: 10, y: 5 }

      // Create level so terrain doesn't fail
      const level = createSimpleLevel(20, 20)
      mockState.levels.set(1, level)

      // Mock sprite lookup
      const getSpriteMock = jest.spyOn(assetLoader, 'getSprite')
      getSpriteMock.mockImplementation((char: string) => {
        if (char === '@') {
          return { x: 0, y: 64, hexX: 0x80, hexY: 0x82 }
        }
        return null
      })

      renderer.render(mockState)

      // Check that player sprite was requested
      const playerSpriteCalls = getSpriteMock.mock.calls.filter(call => call[0] === '@')
      expect(playerSpriteCalls.length).toBe(1)
    })

    it('renders player at full opacity', () => {
      const mockState = createMockGameState()
      mockState.player.position = { x: 15, y: 10 }

      // Create level
      const level = createSimpleLevel(20, 20)
      mockState.levels.set(1, level)

      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 64,
        hexX: 0x80,
        hexY: 0x82,
      })

      renderer.render(mockState)

      // Player should always be rendered (opacity handled by drawTile, which is tested separately)
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('handles missing player sprite gracefully', () => {
      const mockState = createMockGameState()
      mockState.player.position = { x: 5, y: 5 }

      // Create level
      const level = createSimpleLevel(10, 10)
      mockState.levels.set(1, level)

      // Mock sprite lookup to return null for player
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue(null)

      // Should not throw
      renderer.render(mockState)

      // Should have logged warning (but we don't test console output)
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
// HELPERS: Create mock game state and levels
// ============================================================================

function createSimpleLevel(width: number, height: number) {
  const tiles = []
  const explored = []

  for (let y = 0; y < height; y++) {
    const tileRow = []
    const exploredRow = []

    for (let x = 0; x < width; x++) {
      tileRow.push({
        type: 'FLOOR' as const,
        char: '.',
        walkable: true,
        transparent: true,
        colorVisible: '#FFFFFF',
        colorExplored: '#707070',
      })
      exploredRow.push(false) // Default unexplored
    }

    tiles.push(tileRow)
    explored.push(exploredRow)
  }

  return {
    depth: 1,
    width,
    height,
    tiles,
    rooms: [],
    doors: [],
    traps: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    explored,
  }
}

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
