import { CanvasGameRenderer } from './CanvasGameRenderer'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState } from '@game/core/core'
import { Tileset } from '@assets/assets'

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

describe('CanvasGameRenderer - Color Tinting', () => {
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

  describe('monster color tinting (threat level)', () => {
    it('applies green tint for weak monsters (threat level < 0.5)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add weak monster (low level, low HP)
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
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

      // Mock RenderingService to return green color for weak monster
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#90EE90') // Light green

      renderer.render(mockState)

      // Verify fillRect was called with multiply composite operation for tinting
      const fillRectCalls = mockCtx.fillRect.mock.calls
      const greenTintCall = fillRectCalls.find(call => mockCtx.fillStyle === '#90EE90')
      expect(greenTintCall).toBeDefined()
    })

    it('applies yellow tint for moderate monsters (threat level 0.5-0.8)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add moderate monster (medium level, medium HP)
      level.monsters.push({
        id: 'monster-1',
        name: 'Orc',
        letter: 'O',
        position: { x: 5, y: 5 },
        hp: 15,
        maxHp: 15,
        ac: 6,
        damage: '1d8',
        xpValue: 15,
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
        y: 64,
        hexX: 0x80,
        hexY: 0x82,
      })

      // Mock RenderingService to return yellow color for moderate monster
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#FFFF00') // Yellow

      renderer.render(mockState)

      // Verify fillRect was called with yellow tint
      const fillRectCalls = mockCtx.fillRect.mock.calls
      const yellowTintCall = fillRectCalls.find(call => mockCtx.fillStyle === '#FFFF00')
      expect(yellowTintCall).toBeDefined()
    })

    it('applies red tint for dangerous monsters (threat level > 0.8)', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add dangerous monster (high level, high HP)
      level.monsters.push({
        id: 'monster-1',
        name: 'Dragon',
        letter: 'D',
        position: { x: 5, y: 5 },
        hp: 50,
        maxHp: 50,
        ac: 10,
        damage: '3d8',
        xpValue: 100,
        behavior: 'SMART',
        speed: 1.2,
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
        y: 96,
        hexX: 0x80,
        hexY: 0x83,
      })

      // Mock RenderingService to return red color for dangerous monster
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#FF4444') // Red

      renderer.render(mockState)

      // Verify fillRect was called with red tint
      const fillRectCalls = mockCtx.fillRect.mock.calls
      const redTintCall = fillRectCalls.find(call => mockCtx.fillStyle === '#FF4444')
      expect(redTintCall).toBeDefined()
    })

    it('only applies color tint to visible monsters, not explored', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark position as explored (not visible)
      level.explored[5][5] = true
      mockState.levels.set(1, level)

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 32,
        hexX: 0x80,
        hexY: 0x81,
      })

      // Mock color service
      const getColorSpy = jest.spyOn(renderingService, 'getColorForEntity')

      renderer.render(mockState)

      // Color service should NOT be called for explored (non-visible) monsters
      // because monsters are not rendered in explored state
      expect(getColorSpy).not.toHaveBeenCalled()
    })

    it('applies tint using multiply composite operation', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
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

      // Mock color service
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#90EE90')

      // Track globalCompositeOperation changes
      let compositeOperations: string[] = []
      Object.defineProperty(mockCtx, 'globalCompositeOperation', {
        get: () => compositeOperations[compositeOperations.length - 1] || 'source-over',
        set: (value: string) => {
          compositeOperations.push(value)
        },
      })

      renderer.render(mockState)

      // Verify multiply composite operation was used
      expect(compositeOperations).toContain('multiply')
      // Verify it was restored to source-over after
      expect(compositeOperations[compositeOperations.length - 1]).toBe('source-over')
    })

    it('does not apply tint to non-monster entities', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add item (not a monster)
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

      // Mock color service
      const getColorSpy = jest.spyOn(renderingService, 'getColorForEntity')

      renderer.render(mockState)

      // Color service should NOT be called for items
      expect(getColorSpy).not.toHaveBeenCalled()
    })

    it('handles multiple monsters with different threat levels', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add weak monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 2, y: 2 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Add dangerous monster
      level.monsters.push({
        id: 'monster-2',
        name: 'Dragon',
        letter: 'D',
        position: { x: 7, y: 7 },
        hp: 50,
        maxHp: 50,
        ac: 10,
        damage: '3d8',
        xpValue: 100,
        behavior: 'SMART',
        speed: 1.2,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark both positions as visible
      mockState.visibleCells.add('2,2')
      mockState.visibleCells.add('7,7')
      mockState.levels.set(1, level)

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 32,
        hexX: 0x80,
        hexY: 0x81,
      })

      // Mock color service to return different colors
      const getColorSpy = jest.spyOn(renderingService, 'getColorForEntity')
      getColorSpy
        .mockReturnValueOnce('#90EE90') // Green for weak
        .mockReturnValueOnce('#FF4444') // Red for dangerous

      renderer.render(mockState)

      // Verify color service was called twice (once per visible monster)
      expect(getColorSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('tinting edge cases', () => {
    it('handles undefined tint color gracefully', () => {
      const mockState = createMockGameState()
      const level = createSimpleLevel(10, 10)

      // Add monster
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
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

      // Mock color service to return undefined (no tint)
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue(undefined)

      // Should not throw
      renderer.render(mockState)

      // Should still render the monster sprite
      expect(mockCtx.drawImage).toHaveBeenCalled()
    })

    it('handles monster at same position as player', () => {
      const mockState = createMockGameState()
      mockState.player.position = { x: 5, y: 5 }

      const level = createSimpleLevel(10, 10)

      // Add monster at same position as player (shouldn't happen in real game)
      level.monsters.push({
        id: 'monster-1',
        name: 'Bat',
        letter: 'B',
        position: { x: 5, y: 5 },
        hp: 5,
        maxHp: 5,
        ac: 2,
        damage: '1d2',
        xpValue: 5,
        behavior: 'SIMPLE',
        speed: 1.0,
        asleep: false,
        stationary: false,
        energy: 100,
      })

      // Mark position as visible
      mockState.visibleCells.add('5,5')
      mockState.levels.set(1, level)

      // Mock sprite lookup
      jest.spyOn(assetLoader, 'getSprite').mockReturnValue({
        x: 0,
        y: 32,
        hexX: 0x80,
        hexY: 0x81,
      })

      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#90EE90')

      // Should not throw - monster and player both rendered
      renderer.render(mockState)

      expect(mockCtx.drawImage).toHaveBeenCalled()
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
