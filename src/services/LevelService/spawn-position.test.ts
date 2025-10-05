import { LevelService } from './LevelService'
import { Level, Position, Room, TileType } from '@game/core/core'

describe('LevelService - Spawn Position', () => {
  let service: LevelService

  beforeEach(() => {
    service = new LevelService()
  })

  function createTestLevel(
    width: number = 20,
    height: number = 20,
    rooms: Room[] = []
  ): Level {
    return {
      depth: 1,
      width,
      height,
      tiles: Array(height)
        .fill(null)
        .map(() =>
          Array(width).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          })
        ),
      rooms,
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

  function createTestRoom(
    x: number,
    y: number,
    width: number,
    height: number
  ): Room {
    return { x, y, width, height }
  }

  describe('getSpawnPosition()', () => {
    describe('Preferred position', () => {
      test('uses valid preferred position', () => {
        const level = createTestLevel()
        const preferred: Position = { x: 5, y: 5 }

        const result = service.getSpawnPosition(level, preferred)

        expect(result).toEqual(preferred)
      })

      test('uses stairs up position when provided', () => {
        const level = createTestLevel()
        const stairsPos: Position = { x: 10, y: 10 }

        const result = service.getSpawnPosition(level, stairsPos)

        expect(result).toEqual(stairsPos)
      })

      test('uses stairs down position when provided', () => {
        const level = createTestLevel()
        const stairsPos: Position = { x: 3, y: 7 }

        const result = service.getSpawnPosition(level, stairsPos)

        expect(result).toEqual(stairsPos)
      })

      test('rejects out-of-bounds preferred position', () => {
        const level = createTestLevel(20, 20)
        const outOfBounds: Position = { x: 25, y: 10 } // x > width

        const result = service.getSpawnPosition(level, outOfBounds)

        // Should fallback to level center (no rooms)
        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('rejects negative coordinate preferred position', () => {
        const level = createTestLevel(20, 20)
        const negative: Position = { x: -1, y: 5 }

        const result = service.getSpawnPosition(level, negative)

        // Should fallback to level center
        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('rejects non-walkable preferred position', () => {
        const level = createTestLevel()
        // Make position 5,5 non-walkable
        level.tiles[5][5] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#fff',
          colorExplored: '#666',
        }
        const nonWalkable: Position = { x: 5, y: 5 }

        const result = service.getSpawnPosition(level, nonWalkable)

        // Should fallback to level center
        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('handles null preferred position', () => {
        const level = createTestLevel()

        const result = service.getSpawnPosition(level, null)

        // Should fallback to level center
        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('handles undefined preferred position', () => {
        const level = createTestLevel()

        const result = service.getSpawnPosition(level)

        // Should fallback to level center
        expect(result).toEqual({ x: 10, y: 10 })
      })
    })

    describe('Room center fallback', () => {
      test('uses center of first room when no preferred position', () => {
        const room = createTestRoom(4, 6, 8, 10) // Center: (8, 11)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 8, y: 11 })
      })

      test('calculates room center correctly for even dimensions', () => {
        const room = createTestRoom(0, 0, 10, 10) // Center: (5, 5)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 5, y: 5 })
      })

      test('calculates room center correctly for odd dimensions', () => {
        const room = createTestRoom(2, 3, 7, 9) // Center: (5, 7)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 5, y: 7 })
      })

      test('uses first room when multiple rooms exist', () => {
        const room1 = createTestRoom(4, 4, 6, 6) // Center: (7, 7)
        const room2 = createTestRoom(10, 10, 4, 4) // Center: (12, 12)
        const level = createTestLevel(20, 20, [room1, room2])

        const result = service.getSpawnPosition(level)

        // Should use first room
        expect(result).toEqual({ x: 7, y: 7 })
      })

      test('falls back to room center when preferred position invalid', () => {
        const room = createTestRoom(5, 5, 8, 6) // Center: (9, 8)
        const level = createTestLevel(20, 20, [room])
        const invalid: Position = { x: -1, y: -1 }

        const result = service.getSpawnPosition(level, invalid)

        expect(result).toEqual({ x: 9, y: 8 })
      })
    })

    describe('Level center ultimate fallback', () => {
      test('uses level center when no rooms exist', () => {
        const level = createTestLevel(20, 20, [])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('calculates level center correctly for different sizes', () => {
        const level = createTestLevel(30, 40, [])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 15, y: 20 })
      })

      test('uses level center when rooms array is empty', () => {
        const level = createTestLevel(50, 60, [])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 25, y: 30 })
      })

      test('uses level center for small levels', () => {
        const level = createTestLevel(10, 10, [])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 5, y: 5 })
      })
    })

    describe('Edge cases', () => {
      test('handles level with single room filling entire level', () => {
        const room = createTestRoom(0, 0, 20, 20) // Center: (10, 10)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 10, y: 10 })
      })

      test('handles very small room', () => {
        const room = createTestRoom(5, 5, 2, 2) // Center: (6, 6)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 6, y: 6 })
      })

      test('handles room at level boundary', () => {
        const room = createTestRoom(0, 0, 5, 5) // Center: (2, 2)
        const level = createTestLevel(20, 20, [room])

        const result = service.getSpawnPosition(level)

        expect(result).toEqual({ x: 2, y: 2 })
      })

      test('preferred position at exact boundary is accepted', () => {
        const level = createTestLevel(20, 20)
        const boundary: Position = { x: 19, y: 19 } // Max valid position

        const result = service.getSpawnPosition(level, boundary)

        expect(result).toEqual(boundary)
      })

      test('position just outside boundary is rejected', () => {
        const level = createTestLevel(20, 20)
        const outsideBoundary: Position = { x: 20, y: 20 } // Just outside

        const result = service.getSpawnPosition(level, outsideBoundary)

        // Should fallback to level center
        expect(result).toEqual({ x: 10, y: 10 })
      })
    })
  })
})
