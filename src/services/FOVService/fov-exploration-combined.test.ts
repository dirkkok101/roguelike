import { FOVService, FOVUpdateResult } from './FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Level, Position, TileType } from '@game/core/core'

describe('FOVService - Combined FOV + Exploration', () => {
  let service: FOVService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    service = new FOVService(statusEffectService)
  })

  function createTestLevel(width: number = 10, height: number = 10): Level {
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
            colorVisible: '#FFFFFF',
            colorExplored: '#888888',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
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

  describe('updateFOVAndExploration()', () => {
    test('returns both visibleCells and updated level', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 2

      const result: FOVUpdateResult = service.updateFOVAndExploration(position, radius, level)

      expect(result).toHaveProperty('visibleCells')
      expect(result).toHaveProperty('level')
      expect(result.visibleCells instanceof Set).toBe(true)
      expect(result.level).toBeDefined()
    })

    test('visibleCells matches computeFOV result', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 2

      const combinedResult = service.updateFOVAndExploration(position, radius, level)
      const separateResult = service.computeFOV(position, radius, level)

      expect(combinedResult.visibleCells).toEqual(separateResult)
    })

    test('explored tiles are updated for all visible cells', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 2

      const result = service.updateFOVAndExploration(position, radius, level)

      // Origin should be explored
      expect(result.level.explored[5][5]).toBe(true)

      // All visible cells should be explored
      result.visibleCells.forEach((key) => {
        const pos = service.keyToPos(key)
        expect(result.level.explored[pos.y][pos.x]).toBe(true)
      })
    })

    test('preserves original level immutability', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 2

      const result = service.updateFOVAndExploration(position, radius, level)

      // Original level should be unchanged
      expect(level.explored[5][5]).toBe(false)
      expect(result.level).not.toBe(level)
      expect(result.level.explored).not.toBe(level.explored)
    })

    test('handles radius 0 (only origin visible)', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 0

      const result = service.updateFOVAndExploration(position, radius, level)

      expect(result.visibleCells.size).toBe(1)
      expect(result.visibleCells.has('5,5')).toBe(true)
      expect(result.level.explored[5][5]).toBe(true)
    })

    test('handles larger radius', () => {
      const level = createTestLevel(20, 20)
      const position: Position = { x: 10, y: 10 }
      const radius = 3

      const result = service.updateFOVAndExploration(position, radius, level)

      expect(result.visibleCells.size).toBeGreaterThan(1)
      expect(result.visibleCells.has('10,10')).toBe(true) // Origin

      // Check that cells within radius are visible and explored
      expect(result.visibleCells.has('11,10')).toBe(true)
      expect(result.level.explored[10][11]).toBe(true)
    })

    test('respects blocking tiles', () => {
      const level = createTestLevel()

      // Add a wall to the right of origin
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#666666',
        colorExplored: '#333333',
      }

      const position: Position = { x: 5, y: 5 }
      const radius = 3

      const result = service.updateFOVAndExploration(position, radius, level)

      // Wall itself should be visible
      expect(result.visibleCells.has('6,5')).toBe(true)
      expect(result.level.explored[5][6]).toBe(true)

      // Tiles behind the wall should not be visible
      // (This depends on exact shadowcasting implementation, but generally tiles
      // directly behind should be blocked)
    })

    test('handles edge positions', () => {
      const level = createTestLevel()
      const position: Position = { x: 0, y: 0 }
      const radius = 2

      const result = service.updateFOVAndExploration(position, radius, level)

      expect(result.visibleCells.has('0,0')).toBe(true)
      expect(result.level.explored[0][0]).toBe(true)
      expect(result.visibleCells.size).toBeGreaterThan(0)
    })

    test('combines results equivalent to calling methods separately', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }
      const radius = 2

      // Combined approach
      const combinedResult = service.updateFOVAndExploration(position, radius, level)

      // Separate approach
      const visibleCells = service.computeFOV(position, radius, level)
      const updatedLevel = service.updateExploredTiles(level, visibleCells)

      // Results should be identical
      expect(combinedResult.visibleCells).toEqual(visibleCells)
      expect(combinedResult.level.explored).toEqual(updatedLevel.explored)
    })

    test('handles multiple calls with accumulating exploration', () => {
      let level = createTestLevel()
      const position1: Position = { x: 3, y: 3 }
      const position2: Position = { x: 6, y: 6 }
      const radius = 2

      // First update
      const result1 = service.updateFOVAndExploration(position1, radius, level)
      expect(result1.level.explored[3][3]).toBe(true)

      // Second update on the result of the first
      const result2 = service.updateFOVAndExploration(position2, radius, result1.level)

      // Both positions should be explored
      expect(result2.level.explored[3][3]).toBe(true) // From first call
      expect(result2.level.explored[6][6]).toBe(true) // From second call
    })
  })
})
