import { TargetingService } from './TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import type { Level, Position, TileType } from '@game/core/core'

describe('TargetingService - Ray Calculation Edge Cases', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService

  /**
   * Helper: Create a test level with all walkable floor tiles
   */
  const createTestLevel = (width: number = 20, height: number = 20): Level => ({
    depth: 1,
    width,
    height,
    tiles: Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            type: 'floor' as TileType,
            walkable: true,
            transparent: true,
            explored: false,
          }))
      ),
    monsters: [],
    items: [],
    rooms: [],
    corridors: [],
    doors: [],
    traps: [],
    upStairs: { x: 1, y: 1 },
    downStairs: { x: 18, y: 18 },
  })

  beforeEach(() => {
    const mockRandom = new MockRandom()
    mockRandom.setValues([5, 5, 5])
    const statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
    fovService = new FOVService(statusEffectService)
    targetingService = new TargetingService(fovService, movementService)
  })

  describe('calculateRay - Bresenham Algorithm', () => {
    it('diagonal ray uses Bresenham algorithm correctly', () => {
      const level = createTestLevel()

      // Fire from (5,5) to (10,10) - perfect diagonal
      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 10, y: 10 }

      const ray = targetingService.calculateRay(start, end, level)

      // Bresenham should create smooth diagonal line
      expect(ray.length).toBeGreaterThan(0)
      expect(ray[0]).toEqual({ x: 6, y: 6 }) // First step diagonal
      expect(ray[ray.length - 1]).toEqual({ x: 10, y: 10 }) // Ends at target

      // Verify all intermediate steps are diagonal
      for (let i = 0; i < ray.length - 1; i++) {
        const current = ray[i]
        const next = ray[i + 1]
        const dx = Math.abs(next.x - current.x)
        const dy = Math.abs(next.y - current.y)

        // Diagonal movement: dx === 1 && dy === 1
        expect(dx).toBeLessThanOrEqual(1)
        expect(dy).toBeLessThanOrEqual(1)
      }
    })

    it('horizontal ray is a straight line', () => {
      const level = createTestLevel()

      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 10, y: 5 }

      const ray = targetingService.calculateRay(start, end, level)

      // Horizontal line should have 5 steps (6 -> 10)
      expect(ray.length).toBe(5)

      // All positions should have same Y coordinate
      for (const pos of ray) {
        expect(pos.y).toBe(5)
      }

      // X coordinates should increment from 6 to 10
      expect(ray[0]).toEqual({ x: 6, y: 5 })
      expect(ray[1]).toEqual({ x: 7, y: 5 })
      expect(ray[2]).toEqual({ x: 8, y: 5 })
      expect(ray[3]).toEqual({ x: 9, y: 5 })
      expect(ray[4]).toEqual({ x: 10, y: 5 })
    })

    it('vertical ray is a straight line', () => {
      const level = createTestLevel()

      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 5, y: 10 }

      const ray = targetingService.calculateRay(start, end, level)

      // Vertical line should have 5 steps (6 -> 10)
      expect(ray.length).toBe(5)

      // All positions should have same X coordinate
      for (const pos of ray) {
        expect(pos.x).toBe(5)
      }

      // Y coordinates should increment from 6 to 10
      expect(ray[0]).toEqual({ x: 5, y: 6 })
      expect(ray[4]).toEqual({ x: 5, y: 10 })
    })
  })

  describe('calculateRay - Wall Collision', () => {
    it('ray stops at wall before reaching target', () => {
      const level = createTestLevel()

      // Add wall at (7, 5)
      level.tiles[5][7].walkable = false
      level.tiles[5][7].transparent = false

      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 10, y: 5 }

      const ray = targetingService.calculateRay(start, end, level)

      // Ray should stop at wall (7, 5)
      expect(ray[ray.length - 1]).toEqual({ x: 7, y: 5 })

      // Ray should NOT reach the target (10, 5)
      const reachedTarget = ray.some((pos) => pos.x === 10 && pos.y === 5)
      expect(reachedTarget).toBe(false)
    })

    it('ray includes wall position but stops there', () => {
      const level = createTestLevel()

      // Add wall at (8, 8)
      level.tiles[8][8].walkable = false

      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 12, y: 12 }

      const ray = targetingService.calculateRay(start, end, level)

      // Ray should include the wall position
      const wallPos = ray.find((pos) => pos.x === 8 && pos.y === 8)
      expect(wallPos).toBeDefined()

      // Ray should stop at wall, not continue beyond
      const lastPos = ray[ray.length - 1]
      expect(lastPos).toEqual({ x: 8, y: 8 })
    })

    it('multiple walls - stops at first wall', () => {
      const level = createTestLevel()

      // Add walls at (7, 5) and (9, 5)
      level.tiles[5][7].walkable = false
      level.tiles[5][9].walkable = false

      const start: Position = { x: 5, y: 5 }
      const end: Position = { x: 12, y: 5 }

      const ray = targetingService.calculateRay(start, end, level)

      // Should stop at first wall (7, 5)
      expect(ray[ray.length - 1]).toEqual({ x: 7, y: 5 })

      // Should NOT reach second wall
      const reachedSecondWall = ray.some((pos) => pos.x === 9)
      expect(reachedSecondWall).toBe(false)
    })
  })

  describe('calculateRay - Out of Bounds', () => {
    it('ray stops at map boundary (right edge)', () => {
      const level = createTestLevel(20, 20)

      const start: Position = { x: 15, y: 10 }
      const end: Position = { x: 25, y: 10 } // Beyond map width (20)

      const ray = targetingService.calculateRay(start, end, level)

      // Ray should stop at map boundary (x = 19)
      const lastPos = ray[ray.length - 1]
      expect(lastPos.x).toBeLessThan(level.width)

      // All positions should be within bounds
      for (const pos of ray) {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThan(level.width)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThan(level.height)
      }
    })

    it('ray stops at map boundary (bottom edge)', () => {
      const level = createTestLevel(20, 20)

      const start: Position = { x: 10, y: 15 }
      const end: Position = { x: 10, y: 25 } // Beyond map height (20)

      const ray = targetingService.calculateRay(start, end, level)

      // Ray should stop at map boundary (y = 19)
      const lastPos = ray[ray.length - 1]
      expect(lastPos.y).toBeLessThan(level.height)

      // All positions should be within bounds
      for (const pos of ray) {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThan(level.width)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThan(level.height)
      }
    })

    it('ray stops at map boundary (diagonal out of bounds)', () => {
      const level = createTestLevel(20, 20)

      const start: Position = { x: 15, y: 15 }
      const end: Position = { x: 25, y: 25 } // Diagonal out of bounds

      const ray = targetingService.calculateRay(start, end, level)

      // All positions should be within bounds
      for (const pos of ray) {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThan(level.width)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThan(level.height)
      }
    })
  })

  describe('calculateRay - Edge Cases', () => {
    it('ray from player to player own position returns empty array', () => {
      const level = createTestLevel()

      const start: Position = { x: 10, y: 10 }
      const end: Position = { x: 10, y: 10 } // Same position

      const ray = targetingService.calculateRay(start, end, level)

      // Should return empty array (no movement)
      expect(ray).toEqual([])
    })

    it('ray with distance 1 (adjacent tile)', () => {
      const level = createTestLevel()

      const start: Position = { x: 10, y: 10 }
      const end: Position = { x: 11, y: 10 } // One tile right

      const ray = targetingService.calculateRay(start, end, level)

      // Should return single position
      expect(ray).toEqual([{ x: 11, y: 10 }])
    })

    it('ray backwards (negative direction)', () => {
      const level = createTestLevel()

      const start: Position = { x: 10, y: 10 }
      const end: Position = { x: 5, y: 10 } // Moving left

      const ray = targetingService.calculateRay(start, end, level)

      // Should trace from 10 back to 5
      expect(ray.length).toBe(5)
      expect(ray[0]).toEqual({ x: 9, y: 10 })
      expect(ray[ray.length - 1]).toEqual({ x: 5, y: 10 })
    })

    it('ray with steep angle (more vertical than horizontal)', () => {
      const level = createTestLevel()

      const start: Position = { x: 10, y: 5 }
      const end: Position = { x: 12, y: 15 } // Steep upward angle

      const ray = targetingService.calculateRay(start, end, level)

      // Bresenham should handle steep angles correctly
      expect(ray.length).toBeGreaterThan(0)
      expect(ray[0].x).toBeGreaterThanOrEqual(start.x)
      expect(ray[0].y).toBeGreaterThan(start.y)
      expect(ray[ray.length - 1]).toEqual(end)
    })

    it('ray with shallow angle (more horizontal than vertical)', () => {
      const level = createTestLevel()

      const start: Position = { x: 5, y: 10 }
      const end: Position = { x: 15, y: 12 } // Shallow horizontal angle

      const ray = targetingService.calculateRay(start, end, level)

      // Bresenham should handle shallow angles correctly
      expect(ray.length).toBeGreaterThan(0)
      expect(ray[0].x).toBeGreaterThan(start.x)
      expect(ray[ray.length - 1]).toEqual(end)
    })
  })
})
