import { CanvasGameRenderer } from './CanvasGameRenderer'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { FOVService } from '@services/FOVService'
import { GameState, Position } from '@game/core/core'
import { createMockGameState, createMockLevel } from '../test-helpers/mockGameState'

// ============================================================================
// CAMERA SCROLL MARGIN SYSTEM TESTS
// ============================================================================

describe('CanvasGameRenderer - Camera Scroll Margin System', () => {
  let canvas: HTMLCanvasElement
  let renderer: CanvasGameRenderer
  let renderingService: RenderingService
  let assetLoader: AssetLoaderService
  let mockGameState: GameState

  beforeEach(() => {
    // Create canvas element
    canvas = document.createElement('canvas')

    // Mock canvas 2D context (jsdom doesn't support canvas natively)
    const mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
      })),
      imageSmoothingEnabled: false,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000000',
    }

    jest.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any)

    // Create mock services
    const fovService = new FOVService()
    renderingService = new RenderingService(fovService)
    assetLoader = new AssetLoaderService()

    // Mock tileset as loaded
    jest.spyOn(assetLoader, 'isLoaded').mockReturnValue(true)
    jest.spyOn(assetLoader, 'getCurrentTileset').mockReturnValue({
      config: {
        name: 'Test',
        tileWidth: 32,
        tileHeight: 32,
        imageUrl: 'test.png',
        tiles: new Map(),
      },
      image: new Image(),
      isLoaded: true,
    })
    jest.spyOn(assetLoader, 'getSprite').mockReturnValue({ x: 0, y: 0, hexX: 0x80, hexY: 0x80 })

    // Create renderer with scroll margins
    renderer = new CanvasGameRenderer(renderingService, assetLoader, canvas, {
      scrollMarginX: 10,
      scrollMarginY: 5,
    })

    // Create mock game state with 100×50 map
    mockGameState = createMockGameState({
      playerPosition: { x: 50, y: 25 },
      mapDimensions: { width: 100, height: 50 },
      currentLevel: 1,
    })
  })

  // ==========================================================================
  // Scenario 1: Initial Centering on Level Entry
  // ==========================================================================
  describe('Scenario 1: Initial Centering on Level Entry', () => {
    it('should center camera on player on first render', () => {
      // Given: New level, player at (50, 30)
      mockGameState.player.position = { x: 50, y: 30 }

      // When: First render() called
      renderer.render(mockGameState)

      // Then: Camera centered at (50-40, 30-11) = (10, 19)
      const config = renderer.getConfig()
      // Access private field for testing via type assertion
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const cameraOffsetY = (renderer as any).cameraOffsetY

      expect(cameraOffsetX).toBe(50 - Math.floor(config.gridWidth / 2))
      expect(cameraOffsetY).toBe(30 - Math.floor(config.gridHeight / 2))
      expect(cameraOffsetX).toBe(10)
      expect(cameraOffsetY).toBe(19)
    })
  })

  // ==========================================================================
  // Scenario 2: Player Movement Within Comfort Zone
  // ==========================================================================
  describe('Scenario 2: Player Movement Within Comfort Zone', () => {
    it('should not scroll camera when player moves within comfort zone', () => {
      // Given: Camera at (10, 10), player at (50, 21), margins (10, 5)
      mockGameState.player.position = { x: 50, y: 21 }
      renderer.render(mockGameState) // First render centers

      const initialCameraX = (renderer as any).cameraOffsetX
      const initialCameraY = (renderer as any).cameraOffsetY

      // When: Player moves to (51, 21) [still in comfort zone: X ∈ [20, 70], Y ∈ [15, 17]]
      mockGameState.player.position = { x: 51, y: 21 }
      renderer.render(mockGameState)

      // Then: Camera stays at same position
      expect((renderer as any).cameraOffsetX).toBe(initialCameraX)
      expect((renderer as any).cameraOffsetY).toBe(initialCameraY)
    })
  })

  // ==========================================================================
  // Scenario 3: Player Approaches Right Edge (Scroll Right)
  // ==========================================================================
  describe('Scenario 3: Player Approaches Right Edge', () => {
    it('should scroll camera right when player exits right margin', () => {
      // Given: Camera positioned, player at (69, 21)
      mockGameState.player.position = { x: 40, y: 21 }
      renderer.render(mockGameState) // Initial render

      // When: Player moves to (70, 21) [exits comfort zone: cameraX + (80-10) = 70]
      mockGameState.player.position = { x: 70, y: 21 }
      renderer.render(mockGameState)

      // Then: Camera scrolls to keep player in view
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const config = renderer.getConfig()

      // Player should be at scrollMarginX distance from right edge
      // cameraOffsetX = playerX - (gridWidth - scrollMarginX)
      expect(cameraOffsetX).toBe(70 - (config.gridWidth - config.scrollMarginX))
      expect(cameraOffsetX).toBe(0) // 70 - 70 = 0
    })
  })

  // ==========================================================================
  // Scenario 4: Player Approaches Left Edge (Scroll Left)
  // ==========================================================================
  describe('Scenario 4: Player Approaches Left Edge', () => {
    it('should scroll camera left when player enters left margin', () => {
      // Given: Camera at (20, 10), player at (30, 21)
      mockGameState.player.position = { x: 50, y: 21 }
      renderer.render(mockGameState) // Initial position

      const initialCameraX = (renderer as any).cameraOffsetX

      // Move player to trigger left margin
      const targetPlayerX = initialCameraX + renderer.getConfig().scrollMarginX - 1
      mockGameState.player.position = { x: targetPlayerX, y: 21 }
      renderer.render(mockGameState)

      // Then: Camera scrolls left
      const newCameraX = (renderer as any).cameraOffsetX
      expect(newCameraX).toBeLessThan(initialCameraX)
      expect(newCameraX).toBe(targetPlayerX - renderer.getConfig().scrollMarginX)
    })
  })

  // ==========================================================================
  // Scenario 5: Player Approaches Bottom Edge (Scroll Down)
  // ==========================================================================
  describe('Scenario 5: Player Approaches Bottom Edge', () => {
    it('should scroll camera down when player exits bottom margin', () => {
      // Given: Camera positioned, player moves toward bottom
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState) // Initial position

      const initialCameraY = (renderer as any).cameraOffsetY
      const config = renderer.getConfig()

      // When: Player moves down to exit comfort zone (one tile past threshold)
      const targetPlayerY = initialCameraY + config.gridHeight - config.scrollMarginY + 1
      mockGameState.player.position = { x: 50, y: targetPlayerY }
      renderer.render(mockGameState)

      // Then: Camera scrolls down
      const newCameraY = (renderer as any).cameraOffsetY
      expect(newCameraY).toBeGreaterThan(initialCameraY)
      expect(newCameraY).toBe(targetPlayerY - (config.gridHeight - config.scrollMarginY))
    })
  })

  // ==========================================================================
  // Scenario 6: Player Approaches Top Edge (Scroll Up)
  // ==========================================================================
  describe('Scenario 6: Player Approaches Top Edge', () => {
    it('should scroll camera up when player enters top margin', () => {
      // Given: Camera positioned, player moves toward top
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState) // Initial position

      const initialCameraY = (renderer as any).cameraOffsetY
      const config = renderer.getConfig()

      // When: Player moves up to enter top margin
      const targetPlayerY = initialCameraY + config.scrollMarginY - 1
      mockGameState.player.position = { x: 50, y: targetPlayerY }
      renderer.render(mockGameState)

      // Then: Camera scrolls up
      const newCameraY = (renderer as any).cameraOffsetY
      expect(newCameraY).toBeLessThan(initialCameraY)
      expect(newCameraY).toBe(targetPlayerY - config.scrollMarginY)
    })
  })

  // ==========================================================================
  // Scenario 7: Edge Clamping - Left/Top Map Boundary
  // ==========================================================================
  describe('Scenario 7: Edge Clamping - Left/Top Boundary', () => {
    it('should clamp camera at (0, 0) when player near map origin', () => {
      // Given: Player at (5, 5), map 100×50 tiles
      mockGameState.player.position = { x: 5, y: 5 }

      // When: render() called (would move camera to negative)
      renderer.render(mockGameState)

      // Then: Camera clamped at (0, 0)
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const cameraOffsetY = (renderer as any).cameraOffsetY

      expect(cameraOffsetX).toBeGreaterThanOrEqual(0)
      expect(cameraOffsetY).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================================================
  // Scenario 8: Edge Clamping - Right/Bottom Map Boundary
  // ==========================================================================
  describe('Scenario 8: Edge Clamping - Right/Bottom Boundary', () => {
    it('should clamp camera at map edges to prevent off-map display', () => {
      // Given: Map 100×50 tiles, viewport 80×22, player at (95, 45)
      mockGameState.player.position = { x: 95, y: 45 }

      // When: render() called
      renderer.render(mockGameState)

      // Then: Camera clamped to show map edge, not exceed it
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const cameraOffsetY = (renderer as any).cameraOffsetY
      const config = renderer.getConfig()

      // Max camera offset = mapSize - viewportSize
      expect(cameraOffsetX).toBeLessThanOrEqual(100 - config.gridWidth)
      expect(cameraOffsetY).toBeLessThanOrEqual(50 - config.gridHeight)
      expect(cameraOffsetX).toBe(20) // 100 - 80 = 20
      expect(cameraOffsetY).toBe(28) // 50 - 22 = 28
    })
  })

  // ==========================================================================
  // Scenario 9: Small Map - Width < Viewport
  // ==========================================================================
  describe('Scenario 9: Small Map - Width < Viewport', () => {
    it('should lock camera at X=0 when map width < viewport width', () => {
      // Given: Map 60×50 tiles (< 80 viewport width)
      const smallMapState = createMockGameState({
        playerPosition: { x: 30, y: 25 },
        mapDimensions: { width: 60, height: 50 },
        currentLevel: 1,
      })

      // When: render() called with player at various positions
      for (let x = 5; x < 55; x += 10) {
        smallMapState.player.position = { x, y: 25 }
        renderer.render(smallMapState)

        // Then: Camera always locked at X=0
        expect((renderer as any).cameraOffsetX).toBe(0)
      }
    })
  })

  // ==========================================================================
  // Scenario 10: Small Map - Height < Viewport
  // ==========================================================================
  describe('Scenario 10: Small Map - Height < Viewport', () => {
    it('should lock camera at Y=0 when map height < viewport height', () => {
      // Given: Map 100×18 tiles (< 22 viewport height)
      const smallMapState = createMockGameState({
        playerPosition: { x: 50, y: 9 },
        mapDimensions: { width: 100, height: 18 },
        currentLevel: 1,
      })

      // When: render() called with player at various positions
      for (let y = 2; y < 16; y += 3) {
        smallMapState.player.position = { x: 50, y }
        renderer.render(smallMapState)

        // Then: Camera always locked at Y=0
        expect((renderer as any).cameraOffsetY).toBe(0)
      }
    })
  })

  // ==========================================================================
  // Scenario 11: Level Transition via Stairs Down
  // ==========================================================================
  describe('Scenario 11: Level Transition via Stairs Down', () => {
    it('should re-center camera when player takes stairs to new level', () => {
      // Given: Player on level 1 at (70, 30)
      mockGameState.player.position = { x: 70, y: 30 }
      mockGameState.currentLevel = 1
      renderer.render(mockGameState)

      const level1CameraX = (renderer as any).cameraOffsetX

      // When: Player takes stairs to level 2, spawns at (40, 25)
      mockGameState.currentLevel = 2
      mockGameState.player.position = { x: 40, y: 25 }

      // Add level 2 to levels map
      const level2 = createMockLevel({ width: 100, height: 50 })
      mockGameState.levels.set(2, level2)

      renderer.render(mockGameState)

      // Then: Camera re-centers on new player position
      const level2CameraX = (renderer as any).cameraOffsetX
      const level2CameraY = (renderer as any).cameraOffsetY
      const config = renderer.getConfig()

      expect(level2CameraX).toBe(40 - Math.floor(config.gridWidth / 2))
      expect(level2CameraY).toBe(25 - Math.floor(config.gridHeight / 2))
      expect(level2CameraX).not.toBe(level1CameraX) // Camera moved
    })
  })

  // ==========================================================================
  // Scenario 12: Level Transition via Stairs Up
  // ==========================================================================
  describe('Scenario 12: Level Transition via Stairs Up', () => {
    it('should re-center camera when returning to previous level', () => {
      // Given: Player on level 2 at (20, 10)
      mockGameState.currentLevel = 2
      mockGameState.player.position = { x: 20, y: 10 }

      // Add level 2
      const level2 = createMockLevel({ width: 100, height: 50 })
      mockGameState.levels.set(2, level2)

      renderer.render(mockGameState)

      // When: Player takes stairs to level 1, spawns at (15, 8)
      mockGameState.currentLevel = 1
      mockGameState.player.position = { x: 15, y: 8 }
      renderer.render(mockGameState)

      // Then: Camera re-centers and clamps appropriately
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const cameraOffsetY = (renderer as any).cameraOffsetY

      // Should attempt to center but clamp to 0 if player too close to origin
      expect(cameraOffsetX).toBeGreaterThanOrEqual(0)
      expect(cameraOffsetY).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================================================
  // Scenario 13: Rapid Movement Within Comfort Zone
  // ==========================================================================
  describe('Scenario 13: Rapid Movement Within Comfort Zone', () => {
    it('should not scroll camera during rapid movement in comfort zone', () => {
      // Given: Camera at (10, 10), player at (50, 21)
      mockGameState.player.position = { x: 50, y: 21 }
      renderer.render(mockGameState)

      const initialCameraX = (renderer as any).cameraOffsetX
      const initialCameraY = (renderer as any).cameraOffsetY

      // When: Player makes 5 moves within comfort zone
      const movements = [
        { x: 51, y: 21 },
        { x: 52, y: 22 },
        { x: 51, y: 22 },
        { x: 50, y: 22 },
        { x: 50, y: 21 },
      ]

      movements.forEach(pos => {
        mockGameState.player.position = pos
        renderer.render(mockGameState)
      })

      // Then: Camera never scrolls
      expect((renderer as any).cameraOffsetX).toBe(initialCameraX)
      expect((renderer as any).cameraOffsetY).toBe(initialCameraY)
    })
  })

  // ==========================================================================
  // Scenario 14: Diagonal Movement Crossing Both Margins
  // ==========================================================================
  describe('Scenario 14: Diagonal Movement Crossing Both Margins', () => {
    it('should scroll on both axes when player crosses both margins', () => {
      // Given: Camera positioned, player near margins
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState)

      const initialCameraX = (renderer as any).cameraOffsetX
      const initialCameraY = (renderer as any).cameraOffsetY
      const config = renderer.getConfig()

      // When: Player moves diagonally to cross both left and top margins
      mockGameState.player.position = {
        x: initialCameraX + config.scrollMarginX - 1,
        y: initialCameraY + config.scrollMarginY - 1,
      }
      renderer.render(mockGameState)

      // Then: Camera scrolls on both axes
      const newCameraX = (renderer as any).cameraOffsetX
      const newCameraY = (renderer as any).cameraOffsetY

      expect(newCameraX).toBeLessThan(initialCameraX)
      expect(newCameraY).toBeLessThan(initialCameraY)
    })
  })

  // ==========================================================================
  // Scenario 15: Map Reveal Debug Command
  // ==========================================================================
  describe('Scenario 15: Map Reveal Debug Command', () => {
    it('should maintain camera position after revealing entire map', () => {
      // Given: Camera at (10, 10), player at (50, 25)
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState)

      const cameraBeforeReveal = {
        x: (renderer as any).cameraOffsetX,
        y: (renderer as any).cameraOffsetY,
      }

      // When: Map revealed (all tiles become explored) - player position unchanged
      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.tiles.forEach(row => {
        row.forEach(tile => {
          tile.explored = true
        })
      })

      renderer.render(mockGameState)

      // Then: Camera position unchanged (no unintended jump)
      const cameraAfterReveal = {
        x: (renderer as any).cameraOffsetX,
        y: (renderer as any).cameraOffsetY,
      }

      expect(cameraAfterReveal.x).toBe(cameraBeforeReveal.x)
      expect(cameraAfterReveal.y).toBe(cameraBeforeReveal.y)
    })
  })

  // ==========================================================================
  // Additional Edge Case Tests
  // ==========================================================================
  describe('Additional Edge Cases', () => {
    it('should handle missing level gracefully', () => {
      // Given: Invalid level ID
      mockGameState.currentLevel = 999

      // When: render() called
      expect(() => renderer.render(mockGameState)).not.toThrow()

      // Then: Camera offset unchanged
      const cameraOffsetX = (renderer as any).cameraOffsetX
      const cameraOffsetY = (renderer as any).cameraOffsetY

      // Should maintain previous values
      expect(typeof cameraOffsetX).toBe('number')
      expect(typeof cameraOffsetY).toBe('number')
    })

    it('should handle player at exact margin boundary', () => {
      // Given: Player positioned exactly at margin boundary
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState)

      const initialCameraX = (renderer as any).cameraOffsetX
      const config = renderer.getConfig()

      // When: Player moves to exactly the margin boundary
      mockGameState.player.position = {
        x: initialCameraX + config.scrollMarginX,
        y: 25,
      }
      renderer.render(mockGameState)

      // Then: Camera should not scroll (player still in comfort zone)
      expect((renderer as any).cameraOffsetX).toBe(initialCameraX)
    })
  })

  // ==========================================================================
  // Utility Method Tests
  // ==========================================================================
  describe('Utility Methods', () => {
    it('should correctly convert world coordinates to screen coordinates', () => {
      // Given: Camera at (10, 14), tile width=32, height=32
      mockGameState.player.position = { x: 50, y: 25 }
      renderer.render(mockGameState) // Sets camera to (10, 14)

      // When: Converting world position (50, 25) to screen
      const screen = renderer.worldToScreen({ x: 50, y: 25 })

      // Then: Screen = (world - camera) * tileSize = (50-10)*32, (25-14)*32
      expect(screen.x).toBe((50 - 10) * 32) // 1280px
      expect(screen.y).toBe((25 - 14) * 32) // 352px
      expect(screen.x).toBe(1280)
      expect(screen.y).toBe(352)
    })

    it('should convert off-camera coordinates correctly', () => {
      // Given: Camera at (0, 0)
      mockGameState.player.position = { x: 40, y: 11 }
      renderer.render(mockGameState)

      // When: Converting position at camera origin
      const screen = renderer.worldToScreen({ x: 0, y: 0 })

      // Then: Should be at top-left of viewport
      expect(screen.x).toBe(0)
      expect(screen.y).toBe(0)
    })

    it('should return canvas element via getCanvas', () => {
      // When: Getting canvas
      const returnedCanvas = renderer.getCanvas()

      // Then: Should return the same canvas instance
      expect(returnedCanvas).toBe(canvas)
    })

    it('should return config copy via getConfig', () => {
      // When: Getting config
      const config = renderer.getConfig()

      // Then: Should return config with expected values
      expect(config.scrollMarginX).toBe(10)
      expect(config.scrollMarginY).toBe(5)
      expect(config.gridWidth).toBe(80)
      expect(config.gridHeight).toBe(22)
      expect(config.tileWidth).toBe(32)
      expect(config.tileHeight).toBe(32)

      // And: Should be a copy (not same reference)
      expect(config).not.toBe((renderer as any).config)
    })

    it('should clear canvas with black background', () => {
      // Given: Canvas with mock context
      const mockContext = (renderer as any).ctx

      // When: Clearing canvas
      renderer.clear()

      // Then: Should call clearRect and fillRect
      expect(mockContext.clearRect).toHaveBeenCalled()
      expect(mockContext.fillRect).toHaveBeenCalled()
      expect(mockContext.fillStyle).toBe('#000000')
    })
  })

  // ==========================================================================
  // Rendering Integration Tests (Camera + Visibility)
  // ==========================================================================
  describe('Rendering with Camera', () => {
    it('should render only viewport tiles based on camera position', () => {
      // Given: Player at (50, 25), camera will center at (10, 14)
      mockGameState.player.position = { x: 50, y: 25 }

      // Mark some tiles as visible
      mockGameState.visibleCells.add('50,25')
      mockGameState.visibleCells.add('51,25')

      // Mark some tiles as explored
      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.explored[25][50] = true
      level.explored[25][51] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should call drawTile for player (@)
      // Verify rendering happened without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
      expect((renderer as any).cameraOffsetY).toBe(14)
    })

    it('should handle rendering with entities in viewport', () => {
      // Given: Player and monster in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      // Add monster at visible position
      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.monsters = [
        {
          id: 'test-monster-1',
          name: 'Kobold',
          letter: 'K',
          position: { x: 52, y: 26 },
          hp: 5,
          maxHp: 5,
          ac: 6,
          damage: { min: 1, max: 4 },
          xp: 10,
          behavior: 'SIMPLE',
          state: { type: 'IDLE' },
          speed: 1.0,
          abilities: {
            seeInvisible: false,
            regenerates: false,
            poisonous: false,
            rusts: false,
            steals: false,
            confuses: false,
            mean: false,
            flies: false,
            invisible: false,
          },
        },
      ]

      // Mark monster position as visible
      mockGameState.visibleCells.add('52,26')

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
      expect((renderer as any).cameraOffsetY).toBe(14)
    })

    it('should handle missing sprite gracefully', () => {
      // Given: Player position with visible tile
      mockGameState.player.position = { x: 50, y: 25 }
      mockGameState.visibleCells.add('50,25')

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.explored[25][50] = true

      // Mock getSprite to return null for terrain but valid for player
      jest.spyOn(assetLoader, 'getSprite').mockImplementation((char: string) => {
        if (char === '@') {
          return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
        }
        return null // Missing sprite
      })

      // When: Rendering
      expect(() => renderer.render(mockGameState)).not.toThrow()

      // Then: Should render without crashing
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle tileset not loaded', () => {
      // Given: Tileset not loaded
      jest.spyOn(assetLoader, 'isLoaded').mockReturnValue(false)

      // When: Attempting to render
      renderer.render(mockGameState)

      // Then: Should skip rendering (logged warning)
      // No assertion needed - just verify it doesn't throw
    })

    it('should handle monster color tinting for visible monsters', () => {
      // Given: Player and monster in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.monsters = [
        {
          id: 'test-monster-1',
          name: 'Kobold',
          letter: 'K',
          position: { x: 52, y: 26 },
          hp: 5,
          maxHp: 5,
          ac: 6,
          damage: { min: 1, max: 4 },
          xp: 10,
          behavior: 'SIMPLE',
          state: { type: 'IDLE' },
          speed: 1.0,
          abilities: {
            seeInvisible: false,
            regenerates: false,
            poisonous: false,
            rusts: false,
            steals: false,
            confuses: false,
            mean: false,
            flies: false,
            invisible: false,
          },
        },
      ]

      // Mark monster as visible (should trigger color tinting)
      mockGameState.visibleCells.add('52,26')
      level.explored[26][52] = true

      // Mock getColorForEntity to return a color
      jest.spyOn(renderingService, 'getColorForEntity').mockReturnValue('#44FF44')

      // When: Rendering
      renderer.render(mockGameState)

      // Then: getColorForEntity should have been called
      expect(renderingService.getColorForEntity).toHaveBeenCalled()
    })

    it('should handle items in visible cells', () => {
      // Given: Player and item in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.items = [
        {
          id: 'test-item-1',
          name: 'Sword',
          type: 'WEAPON',
          position: { x: 51, y: 25 },
        } as any,
      ]

      // Mark item as visible
      mockGameState.visibleCells.add('51,25')
      level.explored[25][51] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle gold piles in visible cells', () => {
      // Given: Player and gold in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.gold = [
        {
          id: 'test-gold-1',
          amount: 100,
          position: { x: 51, y: 25 },
        },
      ]

      // Mark gold as visible
      mockGameState.visibleCells.add('51,25')
      level.explored[25][51] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle stairs in visible cells', () => {
      // Given: Player and stairs in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.stairsUp = { x: 51, y: 25 }
      level.stairsDown = { x: 52, y: 26 }

      // Mark stairs as visible
      mockGameState.visibleCells.add('51,25')
      mockGameState.visibleCells.add('52,26')
      level.explored[25][51] = true
      level.explored[26][52] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle discovered traps in visible cells', () => {
      // Given: Player and discovered trap in viewport
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.traps = [
        {
          id: 'test-trap-1',
          type: 'DART',
          position: { x: 51, y: 25 },
          discovered: true,
          triggered: false,
        },
      ]

      // Mark trap as visible
      mockGameState.visibleCells.add('51,25')
      level.explored[25][51] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render without errors
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle player sprite missing', () => {
      // Given: Player position but no sprite for '@'
      mockGameState.player.position = { x: 50, y: 25 }

      // Mock getSprite to return null for player character
      jest.spyOn(assetLoader, 'getSprite').mockImplementation((char: string) => {
        if (char === '@') {
          return null // Missing player sprite
        }
        return { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
      })

      // When: Rendering
      expect(() => renderer.render(mockGameState)).not.toThrow()

      // Then: Should handle gracefully (warning logged)
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle drawTile with tileset not loaded', () => {
      // Given: Mock getCurrentTileset to return null
      jest.spyOn(assetLoader, 'getCurrentTileset').mockReturnValue(null)

      // When: Calling drawTile directly
      const sprite = { x: 0, y: 0, hexX: 0x80, hexY: 0x80 }
      expect(() => renderer.drawTile(50, 25, sprite, 1.0)).not.toThrow()

      // Then: Should handle gracefully (warning logged)
    })

    it('should handle detected monsters correctly', () => {
      // Given: Player and detected monster (not visible but detected)
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!
      level.monsters = [
        {
          id: 'test-monster-1',
          name: 'Kobold',
          letter: 'K',
          position: { x: 52, y: 26 },
          hp: 5,
          maxHp: 5,
          ac: 6,
          damage: { min: 1, max: 4 },
          xp: 10,
          behavior: 'SIMPLE',
          state: { type: 'IDLE' },
          speed: 1.0,
          abilities: {
            seeInvisible: false,
            regenerates: false,
            poisonous: false,
            rusts: false,
            steals: false,
            confuses: false,
            mean: false,
            flies: false,
            invisible: false,
          },
        },
      ]

      // Mark monster as detected but not visible (explored tile)
      mockGameState.detectedMonsters.add('52,26')
      level.explored[26][52] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should render with detected opacity
      expect((renderer as any).cameraOffsetX).toBe(10)
    })

    it('should handle explored tiles with entities', () => {
      // Given: Player with explored (non-visible) tiles containing entities
      mockGameState.player.position = { x: 50, y: 25 }

      const level = mockGameState.levels.get(mockGameState.currentLevel)!

      // Add item in explored (but not visible) location
      level.items = [
        {
          id: 'test-item-1',
          name: 'Sword',
          type: 'WEAPON',
          position: { x: 55, y: 28 },
        } as any,
      ]

      // Mark as explored but NOT visible
      level.explored[28][55] = true

      // When: Rendering
      renderer.render(mockGameState)

      // Then: Should handle items in memory (opacity reduced)
      expect((renderer as any).cameraOffsetX).toBe(10)
    })
  })
})
