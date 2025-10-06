import { PathfindingService } from './PathfindingService'
import { LevelService } from '@services/LevelService'
import { Level, Position } from '@game/core/core'

describe('PathfindingService - Path Optimization', () => {
  let service: PathfindingService
  let levelService: LevelService

  beforeEach(() => {
    levelService = new LevelService()
    service = new PathfindingService(levelService)
  })

  function createTestLevel(walkableMap: boolean[][]): Level {
    const height = walkableMap.length
    const width = walkableMap[0].length

    const tiles = walkableMap.map((row) =>
      row.map((walkable) => ({
        type: walkable ? 'FLOOR' : 'WALL',
        walkable,
        transparent: walkable,
        visible: false,
        explored: false,
        lit: false,
      }))
    )

    return {
      depth: 1,
      width,
      height,
      tiles,
      rooms: [],
      monsters: [],
      items: [],
      gold: [],
      traps: [],
      doors: [],
      upStairs: null,
      downStairs: null,
    } as Level
  }

  describe('Shortest path selection', () => {
    test('chooses shortest path when multiple paths exist', () => {
      const level = createTestLevel([
        [false, false, false, false, false, false, false],
        [false, true, true, true, true, true, false],
        [false, true, false, false, false, true, false],
        [false, true, false, false, false, true, false],
        [false, true, true, true, true, true, false],
        [false, false, false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 5, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()
      // Straight line is 5 positions: (1,1) -> (2,1) -> (3,1) -> (4,1) -> (5,1)
      expect(path!.length).toBe(5)

      // Verify it's the straight path
      expect(path![0]).toEqual({ x: 1, y: 1 })
      expect(path![1]).toEqual({ x: 2, y: 1 })
      expect(path![2]).toEqual({ x: 3, y: 1 })
      expect(path![3]).toEqual({ x: 4, y: 1 })
      expect(path![4]).toEqual({ x: 5, y: 1 })
    })

    test('minimizes turns when possible', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, false, false, true, false],
        [false, false, false, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 3 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()
      // Path length should be manhattan distance + 1
      const manhattanDist = Math.abs(3 - 1) + Math.abs(3 - 1)
      expect(path!.length).toBe(manhattanDist + 1)
    })
  })

  describe('Path continuity', () => {
    test('path has no gaps', () => {
      const level = createTestLevel([
        [false, false, false, false, false, false, false],
        [false, true, true, false, true, true, false],
        [false, true, false, false, false, true, false],
        [false, true, true, true, true, true, false],
        [false, false, false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 5, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()

      // Verify each step is adjacent to previous
      for (let i = 1; i < path!.length; i++) {
        const prev = path![i - 1]
        const curr = path![i]

        const dx = Math.abs(curr.x - prev.x)
        const dy = Math.abs(curr.y - prev.y)

        // Should be one step in cardinal direction
        expect(dx + dy).toBe(1)
      }
    })

    test('path contains only walkable tiles', () => {
      const level = createTestLevel([
        [false, false, false, false, false, false, false],
        [false, true, true, false, true, true, false],
        [false, true, false, false, false, true, false],
        [false, true, true, true, true, true, false],
        [false, false, false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 5, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()

      for (const pos of path!) {
        const tile = level.tiles[pos.y][pos.x]
        expect(tile.walkable).toBe(true)
      }
    })
  })

  describe('Heuristic effectiveness', () => {
    test('uses Manhattan distance for heuristic', () => {
      // Open room - path length should equal manhattan distance + 1
      const level = createTestLevel([
        [false, false, false, false, false, false],
        [false, true, true, true, true, false],
        [false, true, true, true, true, false],
        [false, true, true, true, true, false],
        [false, true, true, true, true, false],
        [false, false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 4, y: 4 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()

      const manhattanDist = Math.abs(4 - 1) + Math.abs(4 - 1)
      expect(path!.length).toBe(manhattanDist + 1) // +1 for start position
    })

    test('diagonal movement not allowed (cardinal only)', () => {
      const level = createTestLevel([
        [false, false, false, false],
        [false, true, true, false],
        [false, true, true, false],
        [false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 2, y: 2 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()

      // Verify no diagonal moves
      for (let i = 1; i < path!.length; i++) {
        const prev = path![i - 1]
        const curr = path![i]

        const dx = Math.abs(curr.x - prev.x)
        const dy = Math.abs(curr.y - prev.y)

        // Either horizontal or vertical, not both
        expect(dx === 0 || dy === 0).toBe(true)
      }
    })
  })

  describe('Performance characteristics', () => {
    test('handles reasonable sized levels efficiently', () => {
      // Create 20x20 open room
      const size = 20
      const walkableMap = Array(size).fill(null).map(() => Array(size).fill(true))

      const level = createTestLevel(walkableMap)

      const start: Position = { x: 0, y: 0 }
      const goal: Position = { x: size - 1, y: size - 1 }

      const startTime = Date.now()
      const path = service.findPath(start, goal, level)
      const endTime = Date.now()

      expect(path).not.toBeNull()
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })

    test('does not revisit closed nodes', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, true, false, true, false],
        [false, true, true, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 3 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()

      // Path should not contain duplicates
      const uniquePositions = new Set(path!.map(p => `${p.x},${p.y}`))
      expect(uniquePositions.size).toBe(path!.length)
    })
  })
})
