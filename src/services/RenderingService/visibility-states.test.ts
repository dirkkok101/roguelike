import { RenderingService } from './RenderingService'
import { FOVService } from '@services/FOVService'
import { Level, Position, TileType } from '@game/core/core'

describe('RenderingService - Visibility States', () => {
  let service: RenderingService
  let fovService: FOVService

  beforeEach(() => {
    fovService = new FOVService()
    service = new RenderingService(fovService)
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

  describe('getVisibilityState()', () => {
    test('returns visible for position in FOV', () => {
      const level = createTestLevel(10, 10)
      const origin: Position = { x: 5, y: 5 }
      const visibleCells = fovService.computeFOV(origin, 3, level)

      const state = service.getVisibilityState({ x: 6, y: 5 }, visibleCells, level)

      expect(state).toBe('visible')
    })

    test('returns explored for previously seen position', () => {
      const level = createTestLevel(10, 10)
      level.explored[5][6] = true

      const visibleCells = new Set<string>()

      const state = service.getVisibilityState({ x: 6, y: 5 }, visibleCells, level)

      expect(state).toBe('explored')
    })

    test('returns unexplored for never-seen position', () => {
      const level = createTestLevel(10, 10)
      const visibleCells = new Set<string>()

      const state = service.getVisibilityState({ x: 8, y: 8 }, visibleCells, level)

      expect(state).toBe('unexplored')
    })

    test('prioritizes visible over explored', () => {
      const level = createTestLevel(10, 10)
      level.explored[5][6] = true

      const origin: Position = { x: 5, y: 5 }
      const visibleCells = fovService.computeFOV(origin, 3, level)

      const state = service.getVisibilityState({ x: 6, y: 5 }, visibleCells, level)

      expect(state).toBe('visible')
    })

    test('handles edge of map correctly', () => {
      const level = createTestLevel(10, 10)
      const visibleCells = new Set<string>()

      const state = service.getVisibilityState({ x: 0, y: 0 }, visibleCells, level)

      expect(state).toBe('unexplored')
    })

    test('handles explored edge positions', () => {
      const level = createTestLevel(10, 10)
      level.explored[0][0] = true

      const visibleCells = new Set<string>()

      const state = service.getVisibilityState({ x: 0, y: 0 }, visibleCells, level)

      expect(state).toBe('explored')
    })
  })

  describe('visibility state transitions', () => {
    test('tile becomes visible when entering FOV', () => {
      const level = createTestLevel(10, 10)
      const position: Position = { x: 7, y: 5 }

      // Initially unexplored
      const visibleEmpty = new Set<string>()
      const stateUnexplored = service.getVisibilityState(
        position,
        visibleEmpty,
        level
      )
      expect(stateUnexplored).toBe('unexplored')

      // Mark as explored
      level.explored[position.y][position.x] = true

      // Now explored (but not visible)
      const stateExplored = service.getVisibilityState(
        position,
        visibleEmpty,
        level
      )
      expect(stateExplored).toBe('explored')

      // Move into FOV
      const origin: Position = { x: 5, y: 5 }
      const visibleCells = fovService.computeFOV(origin, 3, level)

      // Now visible
      const stateVisible = service.getVisibilityState(
        position,
        visibleCells,
        level
      )
      expect(stateVisible).toBe('visible')
    })

    test('tile becomes explored when leaving FOV', () => {
      const level = createTestLevel(10, 10)
      const position: Position = { x: 7, y: 5 }

      // In FOV, so visible
      const origin: Position = { x: 5, y: 5 }
      const visibleCells = fovService.computeFOV(origin, 3, level)
      level.explored[position.y][position.x] = true

      const stateVisible = service.getVisibilityState(
        position,
        visibleCells,
        level
      )
      expect(stateVisible).toBe('visible')

      // Move out of FOV
      const emptyFOV = new Set<string>()

      const stateExplored = service.getVisibilityState(position, emptyFOV, level)
      expect(stateExplored).toBe('explored')
    })
  })

  describe('multiple position states', () => {
    test('correctly identifies mixed visibility states', () => {
      const level = createTestLevel(10, 10)
      level.explored[3][3] = true
      level.explored[4][4] = true

      const origin: Position = { x: 5, y: 5 }
      const visibleCells = fovService.computeFOV(origin, 2, level)

      // Visible position
      const stateVisible = service.getVisibilityState(
        { x: 6, y: 5 },
        visibleCells,
        level
      )
      expect(stateVisible).toBe('visible')

      // Explored position
      const stateExplored = service.getVisibilityState(
        { x: 3, y: 3 },
        visibleCells,
        level
      )
      expect(stateExplored).toBe('explored')

      // Unexplored position
      const stateUnexplored = service.getVisibilityState(
        { x: 9, y: 9 },
        visibleCells,
        level
      )
      expect(stateUnexplored).toBe('unexplored')
    })
  })
})
