import { PathfindingService } from './PathfindingService'
import { Level, Position } from '../../types/core/core'

describe('PathfindingService - A* Algorithm', () => {
  let service: PathfindingService

  beforeEach(() => {
    service = new PathfindingService()
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

  describe('Basic pathfinding', () => {
    test('finds straight path in open corridor', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()
      expect(path).toHaveLength(3) // start, middle, goal
      expect(path![0]).toEqual(start)
      expect(path![path!.length - 1]).toEqual(goal)
    })

    test('finds path around obstacle', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, false, true, false],
        [false, true, true, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()
      expect(path!.length).toBeGreaterThan(3) // Longer path due to obstacle
      expect(path![0]).toEqual(start)
      expect(path![path!.length - 1]).toEqual(goal)
    })

    test('returns null when no path exists', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, false, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 1 }

      const path = service.findPath(start, goal, level)

      expect(path).toBeNull()
    })

    test('returns path with start only when start equals goal', () => {
      const level = createTestLevel([
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ])

      const pos: Position = { x: 1, y: 1 }

      const path = service.findPath(pos, pos, level)

      expect(path).not.toBeNull()
      expect(path).toHaveLength(1)
      expect(path![0]).toEqual(pos)
    })
  })

  describe('Complex paths', () => {
    test('finds shortest path in maze', () => {
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
      expect(path![0]).toEqual(start)
      expect(path![path!.length - 1]).toEqual(goal)

      // Verify path is walkable
      for (const pos of path!) {
        expect(level.tiles[pos.y][pos.x].walkable).toBe(true)
      }
    })

    test('finds path in large open room', () => {
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
      expect(path![0]).toEqual(start)
      expect(path![path!.length - 1]).toEqual(goal)

      // Manhattan distance is 6, path should be 7 (start + 6 moves)
      expect(path!.length).toBe(7)
    })
  })

  describe('getNextStep helper', () => {
    test('returns first step toward goal', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 1 }

      const nextStep = service.getNextStep(start, goal, level)

      expect(nextStep).not.toBeNull()
      expect(nextStep).toEqual({ x: 2, y: 1 })
    })

    test('returns null when no path exists', () => {
      const level = createTestLevel([
        [false, false, false, false, false],
        [false, true, false, true, false],
        [false, false, false, false, false],
      ])

      const start: Position = { x: 1, y: 1 }
      const goal: Position = { x: 3, y: 1 }

      const nextStep = service.getNextStep(start, goal, level)

      expect(nextStep).toBeNull()
    })

    test('returns null when already at goal', () => {
      const level = createTestLevel([
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ])

      const pos: Position = { x: 1, y: 1 }

      const nextStep = service.getNextStep(pos, pos, level)

      expect(nextStep).toBeNull()
    })
  })

  describe('Edge cases', () => {
    test('handles level boundaries correctly', () => {
      const level = createTestLevel([
        [true, true, true],
        [true, true, true],
        [true, true, true],
      ])

      const start: Position = { x: 0, y: 0 }
      const goal: Position = { x: 2, y: 2 }

      const path = service.findPath(start, goal, level)

      expect(path).not.toBeNull()
      expect(path![0]).toEqual(start)
      expect(path![path!.length - 1]).toEqual(goal)

      // All positions should be within bounds
      for (const pos of path!) {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThan(level.width)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThan(level.height)
      }
    })

    test('handles single walkable tile', () => {
      const level = createTestLevel([
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ])

      const pos: Position = { x: 1, y: 1 }

      const path = service.findPath(pos, pos, level)

      expect(path).not.toBeNull()
      expect(path).toHaveLength(1)
    })
  })
})
