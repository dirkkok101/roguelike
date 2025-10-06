import { FOVService } from './FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Level, TileType, Position } from '@game/core/core'

describe('FOVService - Shadowcasting Algorithm', () => {
  let service: FOVService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    service = new FOVService(statusEffectService)
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

  describe('computeFOV()', () => {
    test('origin is always visible', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      expect(service.isInFOV(origin, visible)).toBe(true)
    })

    test('radius 0 only shows origin', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 0, level)

      expect(visible.size).toBe(1)
      expect(service.isInFOV(origin, visible)).toBe(true)
    })

    test('all 8 directions are visible in open space', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 2, level)

      // Check all 8 cardinal/diagonal directions
      expect(service.isInFOV({ x: 5, y: 4 }, visible)).toBe(true) // North
      expect(service.isInFOV({ x: 6, y: 4 }, visible)).toBe(true) // NE
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true) // East
      expect(service.isInFOV({ x: 6, y: 6 }, visible)).toBe(true) // SE
      expect(service.isInFOV({ x: 5, y: 6 }, visible)).toBe(true) // South
      expect(service.isInFOV({ x: 4, y: 6 }, visible)).toBe(true) // SW
      expect(service.isInFOV({ x: 4, y: 5 }, visible)).toBe(true) // West
      expect(service.isInFOV({ x: 4, y: 4 }, visible)).toBe(true) // NW
    })

    test('computes circular FOV in open space', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 3, level)

      // Should see tiles within radius 3
      expect(service.isInFOV({ x: 10, y: 7 }, visible)).toBe(true) // 3 north
      expect(service.isInFOV({ x: 13, y: 10 }, visible)).toBe(true) // 3 east

      // Should NOT see tiles beyond radius 3
      expect(service.isInFOV({ x: 10, y: 6 }, visible)).toBe(false) // 4 north
      expect(service.isInFOV({ x: 14, y: 10 }, visible)).toBe(false) // 4 east
    })

    test('handles edge of map correctly', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 0, y: 0 } // Top-left corner
      const visible = service.computeFOV(origin, 3, level)

      // Origin visible
      expect(service.isInFOV(origin, visible)).toBe(true)

      // Nearby tiles visible
      expect(service.isInFOV({ x: 1, y: 0 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 0, y: 1 }, visible)).toBe(true)

      // Out of bounds not included
      expect(service.isInFOV({ x: -1, y: 0 }, visible)).toBe(false)
      expect(service.isInFOV({ x: 0, y: -1 }, visible)).toBe(false)
    })

    test('handles center of map correctly', () => {
      const level = createTestLevel(20, 20)
      const origin: Position = { x: 10, y: 10 }
      const visible = service.computeFOV(origin, 5, level)

      // Should have many visible tiles in open space
      expect(visible.size).toBeGreaterThan(50)
    })
  })

  describe('isInFOV()', () => {
    test('returns true for visible positions', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      expect(service.isInFOV({ x: 5, y: 5 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true)
    })

    test('returns false for non-visible positions', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 2, level)

      expect(service.isInFOV({ x: 9, y: 9 }, visible)).toBe(false)
    })
  })

  describe('keyToPos() and posToKey()', () => {
    test('converts position to key and back', () => {
      const pos: Position = { x: 5, y: 10 }
      const key = service['posToKey'](pos)

      expect(key).toBe('5,10')

      const converted = service.keyToPos(key)
      expect(converted).toEqual(pos)
    })

    test('handles zero coordinates', () => {
      const pos: Position = { x: 0, y: 0 }
      const key = service['posToKey'](pos)
      const converted = service.keyToPos(key)

      expect(converted).toEqual(pos)
    })
  })
})
