import { FOVService } from './FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Level, TileType, Position } from '@game/core/core'

describe('FOVService - Vision Blocking', () => {
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

  describe('isBlocking()', () => {
    test('returns true for walls', () => {
      const level = createTestLevel(10, 10)
      level.tiles[5][5] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      expect(service.isBlocking({ x: 5, y: 5 }, level)).toBe(true)
    })

    test('returns false for floor tiles', () => {
      const level = createTestLevel(10, 10)

      expect(service.isBlocking({ x: 5, y: 5 }, level)).toBe(false)
    })

    test('returns true for out of bounds positions', () => {
      const level = createTestLevel(10, 10)

      expect(service.isBlocking({ x: -1, y: 5 }, level)).toBe(true)
      expect(service.isBlocking({ x: 10, y: 5 }, level)).toBe(true)
      expect(service.isBlocking({ x: 5, y: -1 }, level)).toBe(true)
      expect(service.isBlocking({ x: 5, y: 10 }, level)).toBe(true)
    })
  })

  describe('walls block vision', () => {
    test('single wall blocks tiles behind it', () => {
      const level = createTestLevel(10, 10)

      // Place wall at (6, 5)
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Wall itself should be visible
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true)

      // Tile directly behind wall should NOT be visible
      expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(false)
    })

    test('wall blocks entire shadow cone', () => {
      const level = createTestLevel(15, 15)

      // Place wall at (8, 7)
      level.tiles[7][8] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 7, y: 7 }
      const visible = service.computeFOV(origin, 5, level)

      // Wall is visible
      expect(service.isInFOV({ x: 8, y: 7 }, visible)).toBe(true)

      // Tiles in shadow behind wall should not be visible
      expect(service.isInFOV({ x: 9, y: 7 }, visible)).toBe(false)
      expect(service.isInFOV({ x: 10, y: 7 }, visible)).toBe(false)
    })

    test('multiple walls create complex shadows', () => {
      const level = createTestLevel(10, 10)

      // Create an L-shaped wall
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }
      level.tiles[6][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Walls are visible
      expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 6, y: 6 }, visible)).toBe(true)

      // Tiles behind walls are not visible
      expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(false)
      expect(service.isInFOV({ x: 7, y: 6 }, visible)).toBe(false)
    })
  })

  describe('walls around corners', () => {
    test('can see around corner when not blocked', () => {
      const level = createTestLevel(10, 10)

      // Create corner wall at (6, 4)
      level.tiles[4][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Should see tiles not blocked by corner
      expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(true)
      expect(service.isInFOV({ x: 5, y: 3 }, visible)).toBe(true)
    })

    test('cannot see through corner wall', () => {
      const level = createTestLevel(10, 10)

      // Create solid corner
      level.tiles[4][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Tiles directly behind corner should be blocked
      expect(service.isInFOV({ x: 7, y: 4 }, visible)).toBe(false)
    })
  })

  describe('transparent vs opaque tiles', () => {
    test('transparent floor does not block vision', () => {
      const level = createTestLevel(10, 10)

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Should see through multiple floor tiles
      expect(service.isInFOV({ x: 8, y: 5 }, visible)).toBe(true)
    })

    test('opaque wall blocks vision', () => {
      const level = createTestLevel(10, 10)

      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const origin: Position = { x: 5, y: 5 }
      const visible = service.computeFOV(origin, 3, level)

      // Wall blocks vision
      expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(false)
    })
  })
})
