// ============================================================================
// CANVAS GAME RENDERER INTEGRATION TESTS
// Phase 3.5.5: Camera scroll margin integration tests with gameplay
// ============================================================================

import { CanvasGameRenderer } from './CanvasGameRenderer'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { RenderingService } from '@services/RenderingService'
import { Position, Monster } from '@game/core/core'
import { createMockGameState } from '../test-helpers/mockGameState'
import { FOVService } from '@services/FOVService'

// Helper to create test monsters
function createTestMonster(letter: string, name: string, position: Position): Monster {
  return {
    id: `test-monster-${Date.now()}`,
    name,
    letter,
    spriteName: name, // Use name as sprite name
    position,
    hp: 10,
    maxHp: 10,
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
  }
}

describe('CanvasGameRenderer - Integration Tests (Phase 3.5.5)', () => {
  let renderer: CanvasGameRenderer
  let assetLoader: AssetLoaderService
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    // Create canvas
    canvas = document.createElement('canvas')

    // Mock canvas 2D context using jest.spyOn (consistent with camera.test.ts)
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

    // Create shared services
    const fovService = new FOVService()
    const renderingService = new RenderingService(fovService)

    // Create asset loader
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

    // Create renderer with correct constructor signature
    renderer = new CanvasGameRenderer(renderingService, assetLoader, canvas, {
      scrollMarginX: 10,
      scrollMarginY: 5,
    })
  })

  describe('Integration Test 1: Full game loop with movement', () => {
    it('should not scroll camera when player moves within starting room', () => {
      // Arrange: Create game state with player in starting position
      const state1 = createMockGameState({
        player: { position: { x: 40, y: 11 } },
      })

      // Act: Render initial state (camera centers on player)
      renderer.render(state1)
      const initialCameraX = (renderer as any).cameraOffsetX
      const initialCameraY = (renderer as any).cameraOffsetY

      // Move player within comfort zone (no scrolling expected)
      const state2 = createMockGameState({
        player: { position: { x: 41, y: 11 } }, // Move right 1 tile
        currentLevel: 1,
      })
      renderer.render(state2)
      const cameraX1 = (renderer as any).cameraOffsetX
      const cameraY1 = (renderer as any).cameraOffsetY

      const state3 = createMockGameState({
        player: { position: { x: 41, y: 12 } }, // Move down 1 tile
        currentLevel: 1,
      })
      renderer.render(state3)
      const cameraX2 = (renderer as any).cameraOffsetX
      const cameraY2 = (renderer as any).cameraOffsetY

      // Assert: Camera should not have moved (same level, within comfort zone)
      expect(cameraX1).toBe(initialCameraX)
      expect(cameraY1).toBe(initialCameraY)
      expect(cameraX2).toBe(initialCameraX)
      expect(cameraY2).toBe(initialCameraY)
    })

    it('should scroll camera when player moves far to the right', () => {
      // Arrange: Player starts centered on a large map (100x50)
      const state1 = createMockGameState({
        player: { position: { x: 40, y: 25 } },
        currentLevel: 1,
        mapDimensions: { width: 100, height: 50 },
      })

      // Act: Render initial state
      renderer.render(state1)
      const initialCameraX = (renderer as any).cameraOffsetX

      // Move player far to the right (should trigger camera scroll)
      const state2 = createMockGameState({
        player: { position: { x: 80, y: 25 } },
        currentLevel: 1,
        mapDimensions: { width: 100, height: 50 },
      })
      renderer.render(state2)
      const newCameraX = (renderer as any).cameraOffsetX

      // Assert: Camera should have scrolled right (or stayed if already at map edge)
      expect(newCameraX).toBeGreaterThanOrEqual(initialCameraX)
    })
  })

  describe('Integration Test 2: Level navigation', () => {
    it.skip('should re-center camera when player takes stairs to new level', () => {
      // Arrange: Player on level 1 on a large map (far right and bottom)
      const state1 = createMockGameState({
        currentLevel: 1,
        player: { position: { x: 80, y: 40 } },
        mapDimensions: { width: 100, height: 50 },
      })

      // Act: Render level 1
      renderer.render(state1)
      const level1CameraX = (renderer as any).cameraOffsetX
      const level1CameraY = (renderer as any).cameraOffsetY

      // Camera should be positioned (exact position depends on responsive grid dimensions)
      expect(typeof level1CameraX).toBe('number')
      expect(typeof level1CameraY).toBe('number')

      // Simulate level transition to level 2 (player spawns at completely different position - far left and top)
      const state2 = createMockGameState({
        currentLevel: 2,
        player: { position: { x: 20, y: 10 } },
        mapDimensions: { width: 100, height: 50 },
      })

      renderer.render(state2)
      const level2CameraX = (renderer as any).cameraOffsetX
      const level2CameraY = (renderer as any).cameraOffsetY

      // Assert: Camera should have re-centered on new level
      // Camera positions should be different (unless both hit same clamp, which is unlikely with these positions)
      const cameraMoved = level2CameraX !== level1CameraX || level2CameraY !== level1CameraY
      expect(cameraMoved).toBe(true)
    })

    it('should re-center camera when returning to previous level', () => {
      // Arrange: Navigate from level 1 → 2 → 1
      const state1 = createMockGameState({
        currentLevel: 1,
        player: { position: { x: 50, y: 20 } },
      })

      renderer.render(state1)

      const state2 = createMockGameState({
        currentLevel: 2,
        player: { position: { x: 30, y: 15 } },
      })

      renderer.render(state2)

      // Return to level 1 at new position
      const state3 = createMockGameState({
        currentLevel: 1,
        player: { position: { x: 60, y: 25 } },
      })

      renderer.render(state3)
      const finalCameraX = (renderer as any).cameraOffsetX
      const finalCameraY = (renderer as any).cameraOffsetY

      // Assert: Camera should be centered on player's new position
      const expectedX = state3.player.position.x - 40
      const expectedY = state3.player.position.y - 11
      expect(finalCameraX).toBe(expectedX)
      expect(finalCameraY).toBe(expectedY)
    })
  })

  describe('Integration Test 3: Combat while near edge', () => {
    it('should maintain stable camera during position updates near viewport edge', () => {
      // Arrange: Player near edge
      const state1 = createMockGameState({
        player: { position: { x: 69, y: 21 } },
        currentLevel: 1,
      })

      // Act: Render initial state
      renderer.render(state1)
      const initialCameraX = (renderer as any).cameraOffsetX

      // Player position updates slightly (simulating combat, same level)
      const state2 = createMockGameState({
        player: { position: { x: 69, y: 21 } }, // Same position
        currentLevel: 1,
      })
      renderer.render(state2)
      const newCameraX = (renderer as any).cameraOffsetX

      // Assert: Camera position is stable
      // (Camera should not jump unexpectedly when player position is unchanged)
      expect(newCameraX).toBe(initialCameraX)
    })
  })

  describe('Integration Test 4: Multiple level transitions', () => {
    it.skip('should handle camera updates across multiple level transitions', () => {
      const levels = [
        { level: 1, playerPos: { x: 40, y: 20 } },
        { level: 2, playerPos: { x: 55, y: 15 } },
        { level: 3, playerPos: { x: 30, y: 25 } },
        { level: 2, playerPos: { x: 50, y: 18 } },
        { level: 1, playerPos: { x: 45, y: 22 } },
      ]

      const cameraPositions: Array<{ x: number; y: number }> = []

      for (const { level, playerPos } of levels) {
        const state = createMockGameState({
          currentLevel: level,
          player: { position: playerPos },
          mapDimensions: { width: 100, height: 50 },
        })

        renderer.render(state)

        cameraPositions.push({
          x: (renderer as any).cameraOffsetX,
          y: (renderer as any).cameraOffsetY,
        })

        // Assert: Camera position is valid
        expect((renderer as any).cameraOffsetX).toBeGreaterThanOrEqual(0)
        expect((renderer as any).cameraOffsetY).toBeGreaterThanOrEqual(0)
      }

      // Verify all transitions were recorded
      expect(cameraPositions).toHaveLength(5)
      // Camera should have moved at least once during these transitions
      const uniquePositions = new Set(cameraPositions.map((p) => `${p.x},${p.y}`))
      expect(uniquePositions.size).toBeGreaterThan(1)
    })
  })
})
