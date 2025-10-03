import { MovementService } from './MovementService'
import { Level, TileType, Position } from '@game/core/core'

describe('MovementService - Bounds Validation', () => {
  let service: MovementService

  beforeEach(() => {
    service = new MovementService()
  })

  function createTestLevel(width: number, height: number): Level {
    const tiles = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          }))
      )

    return {
      depth: 1,
      width,
      height,
      tiles,
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(height)
        .fill(null)
        .map(() => Array(width).fill(false)),
    }
  }

  describe('isInBounds()', () => {
    test('returns true for position at origin', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: 0, y: 0 }, level)).toBe(true)
    })

    test('returns true for position at max bounds', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: 9, y: 9 }, level)).toBe(true)
    })

    test('returns true for position in center', () => {
      const level = createTestLevel(20, 20)

      expect(service.isInBounds({ x: 10, y: 10 }, level)).toBe(true)
    })

    test('returns false for negative x', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: -1, y: 5 }, level)).toBe(false)
    })

    test('returns false for negative y', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: 5, y: -1 }, level)).toBe(false)
    })

    test('returns false for x beyond width', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: 10, y: 5 }, level)).toBe(false)
    })

    test('returns false for y beyond height', () => {
      const level = createTestLevel(10, 10)

      expect(service.isInBounds({ x: 5, y: 10 }, level)).toBe(false)
    })

    test('handles different level sizes', () => {
      const smallLevel = createTestLevel(5, 5)
      const largeLevel = createTestLevel(50, 50)

      expect(service.isInBounds({ x: 4, y: 4 }, smallLevel)).toBe(true)
      expect(service.isInBounds({ x: 5, y: 5 }, smallLevel)).toBe(false)

      expect(service.isInBounds({ x: 49, y: 49 }, largeLevel)).toBe(true)
      expect(service.isInBounds({ x: 50, y: 50 }, largeLevel)).toBe(false)
    })
  })

  describe('isWalkable()', () => {
    test('returns true for floor tiles', () => {
      const level = createTestLevel(10, 10)

      expect(service.isWalkable({ x: 5, y: 5 }, level)).toBe(true)
    })

    test('returns false for wall tiles', () => {
      const level = createTestLevel(10, 10)
      level.tiles[5][5] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      expect(service.isWalkable({ x: 5, y: 5 }, level)).toBe(false)
    })

    test('returns false for out of bounds positions', () => {
      const level = createTestLevel(10, 10)

      expect(service.isWalkable({ x: -1, y: 5 }, level)).toBe(false)
      expect(service.isWalkable({ x: 10, y: 5 }, level)).toBe(false)
      expect(service.isWalkable({ x: 5, y: -1 }, level)).toBe(false)
      expect(service.isWalkable({ x: 5, y: 10 }, level)).toBe(false)
    })

    test('handles multiple walls correctly', () => {
      const level = createTestLevel(10, 10)

      // Create a wall row
      for (let x = 0; x < 10; x++) {
        level.tiles[5][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#8B7355',
          colorExplored: '#4A4A4A',
        }
      }

      // All positions in row 5 should be unwalkable
      for (let x = 0; x < 10; x++) {
        expect(service.isWalkable({ x, y: 5 }, level)).toBe(false)
      }

      // Adjacent rows should still be walkable
      expect(service.isWalkable({ x: 5, y: 4 }, level)).toBe(true)
      expect(service.isWalkable({ x: 5, y: 6 }, level)).toBe(true)
    })

    test('walkable at edges of map', () => {
      const level = createTestLevel(10, 10)

      expect(service.isWalkable({ x: 0, y: 0 }, level)).toBe(true)
      expect(service.isWalkable({ x: 9, y: 0 }, level)).toBe(true)
      expect(service.isWalkable({ x: 0, y: 9 }, level)).toBe(true)
      expect(service.isWalkable({ x: 9, y: 9 }, level)).toBe(true)
    })
  })

  describe('bounds and walkability interaction', () => {
    test('isWalkable checks bounds before tile walkability', () => {
      const level = createTestLevel(10, 10)

      // Out of bounds should return false even if we imagine it's walkable
      expect(service.isWalkable({ x: -1, y: 0 }, level)).toBe(false)
    })

    test('valid bounds but unwalkable tile', () => {
      const level = createTestLevel(10, 10)
      level.tiles[5][5] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      // In bounds but not walkable
      expect(service.isInBounds({ x: 5, y: 5 }, level)).toBe(true)
      expect(service.isWalkable({ x: 5, y: 5 }, level)).toBe(false)
    })
  })
})
