import { FOVService } from './FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { RoomDetectionService } from '@services/RoomDetectionService'
import { Level, TileType, Position } from '@game/core/core'

describe('FOVService - Light Radius', () => {
  let service: FOVService
  let statusEffectService: StatusEffectService
  let roomDetectionService: RoomDetectionService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    roomDetectionService = new RoomDetectionService()
    service = new FOVService(statusEffectService, roomDetectionService)
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

  describe('radius 0 (darkness)', () => {
    test('only origin is visible', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 0, level)

      expect(visible.size).toBe(1)
      expect(service.isInFOV(origin, visible)).toBe(true)
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(false)
    })
  })

  describe('radius 1 (torch)', () => {
    test('sees adjacent tiles', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 1, level)

      // All adjacent tiles visible
      expect(service.isInFOV({ x: 5, y: 4 }, visible)).toBe(true) // N
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true) // E
      expect(service.isInFOV({ x: 5, y: 6 }, visible)).toBe(true) // S
      expect(service.isInFOV({ x: 4, y: 5 }, visible)).toBe(true) // W

      // Tiles 2 steps away not visible
      expect(service.isInFOV({ x: 5, y: 3 }, visible)).toBe(false) // 2N
      expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(false) // 2E
    })

    test('has limited visibility', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 1, level)

      // Should be small FOV
      expect(visible.size).toBeLessThan(15)
    })
  })

  describe('radius 2 (lantern)', () => {
    test('sees tiles within radius 2', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 2, level)

      // Within radius 2
      expect(service.isInFOV({ x: 10, y: 8 }, visible)).toBe(true) // 2N
      expect(service.isInFOV({ x: 12, y: 10 }, visible)).toBe(true) // 2E
      expect(service.isInFOV({ x: 11, y: 11 }, visible)).toBe(true) // Diagonal

      // Outside radius 2
      expect(service.isInFOV({ x: 10, y: 7 }, visible)).toBe(false) // 3N
      expect(service.isInFOV({ x: 13, y: 10 }, visible)).toBe(false) // 3E
    })

    test('larger than radius 1', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }

      const visible1 = service.computeFOV(origin, 1, level)
      const visible2 = service.computeFOV(origin, 2, level)

      expect(visible2.size).toBeGreaterThan(visible1.size)
    })
  })

  describe('radius 3 (artifact)', () => {
    test('sees tiles within radius 3', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 3, level)

      // Within radius 3
      expect(service.isInFOV({ x: 10, y: 7 }, visible)).toBe(true) // 3N
      expect(service.isInFOV({ x: 13, y: 10 }, visible)).toBe(true) // 3E

      // Outside radius 3
      expect(service.isInFOV({ x: 10, y: 6 }, visible)).toBe(false) // 4N
      expect(service.isInFOV({ x: 14, y: 10 }, visible)).toBe(false) // 4E
    })

    test('largest standard radius', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }

      const visible2 = service.computeFOV(origin, 2, level)
      const visible3 = service.computeFOV(origin, 3, level)

      expect(visible3.size).toBeGreaterThan(visible2.size)
      expect(visible3.size).toBeGreaterThan(20) // Radius 3 typically sees 20-30 tiles in open space
    })
  })

  describe('radius limits visibility correctly', () => {
    test('euclidean distance calculation is accurate', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 2, level)

      // Diagonal at exactly sqrt(8) ≈ 2.83 should be visible with radius 3
      // but not with radius 2
      expect(service.isInFOV({ x: 12, y: 12 }, visible)).toBe(false)
    })

    test('tiles at exact radius boundary', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 3, level)

      // Exactly 3 tiles away (cardinal directions)
      expect(service.isInFOV({ x: 10, y: 7 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 13, y: 10 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 10, y: 13 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 7, y: 10 }, visible)).toBe(true)
    })
  })

  describe('varying radii', () => {
    test('radius affects FOV size proportionally', () => {
      const level = createTestLevel(30, 30)
      const origin: Position = { x: 15, y: 15 }

      const sizes = [0, 1, 2, 3, 4, 5].map((radius) => {
        const visible = service.computeFOV(origin, radius, level)
        return visible.size
      })

      // Each radius should be larger than previous
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1])
      }
    })

    test('large radius sees most of small map', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 10, level)

      // Should see almost entire map
      expect(visible.size).toBeGreaterThan(90)
    })
  })
})
