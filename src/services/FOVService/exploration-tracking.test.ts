import { FOVService } from './FOVService'
import { Level, TileType } from '@game/core/core'

describe('FOVService - Exploration Tracking', () => {
  let service: FOVService

  beforeEach(() => {
    service = new FOVService()
  })

  function createTestLevel(): Level {
    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
            }))
        ),
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }
  }

  describe('updateExploredTiles', () => {
    test('marks visible cells as explored', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['5,5', '5,6', '6,5'])

      const result = service.updateExploredTiles(level, visibleCells)

      expect(result.explored[5][5]).toBe(true)
      expect(result.explored[5][6]).toBe(true)
      expect(result.explored[6][5]).toBe(true)
    })

    test('preserves previously explored tiles', () => {
      const level = createTestLevel()
      level.explored[2][2] = true
      level.explored[3][3] = true

      const visibleCells = new Set(['5,5'])

      const result = service.updateExploredTiles(level, visibleCells)

      // Previously explored tiles should remain explored
      expect(result.explored[2][2]).toBe(true)
      expect(result.explored[3][3]).toBe(true)
      // Newly visible tile should also be explored
      expect(result.explored[5][5]).toBe(true)
    })

    test('does not mutate original level', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['5,5'])

      const result = service.updateExploredTiles(level, visibleCells)

      // Original level should be unchanged
      expect(level.explored[5][5]).toBe(false)
      // New level should have the update
      expect(result.explored[5][5]).toBe(true)
    })

    test('handles out-of-bounds positions gracefully', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['5,5', '100,100', '-1,-1', '5,100'])

      const result = service.updateExploredTiles(level, visibleCells)

      // Valid position should be marked
      expect(result.explored[5][5]).toBe(true)
      // Out-of-bounds positions should not cause errors
      expect(() => service.updateExploredTiles(level, visibleCells)).not.toThrow()
    })

    test('handles empty visible cells set', () => {
      const level = createTestLevel()
      const visibleCells = new Set<string>()

      const result = service.updateExploredTiles(level, visibleCells)

      // No tiles should be marked as explored
      expect(result.explored.every((row) => row.every((cell) => !cell))).toBe(true)
    })

    test('returns new Level object with updated explored array', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['5,5'])

      const result = service.updateExploredTiles(level, visibleCells)

      // Should return a new level object
      expect(result).not.toBe(level)
      // But other properties should reference the same objects (shallow copy)
      expect(result.tiles).toBe(level.tiles)
      expect(result.monsters).toBe(level.monsters)
      // Explored should be a new array
      expect(result.explored).not.toBe(level.explored)
    })

    test('marks multiple cells in same row', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['5,3', '5,4', '5,5', '5,6', '5,7'])

      const result = service.updateExploredTiles(level, visibleCells)

      expect(result.explored[3][5]).toBe(true)
      expect(result.explored[4][5]).toBe(true)
      expect(result.explored[5][5]).toBe(true)
      expect(result.explored[6][5]).toBe(true)
      expect(result.explored[7][5]).toBe(true)
    })

    test('marks multiple cells in same column', () => {
      const level = createTestLevel()
      const visibleCells = new Set(['3,5', '4,5', '5,5', '6,5', '7,5'])

      const result = service.updateExploredTiles(level, visibleCells)

      expect(result.explored[5][3]).toBe(true)
      expect(result.explored[5][4]).toBe(true)
      expect(result.explored[5][5]).toBe(true)
      expect(result.explored[5][6]).toBe(true)
      expect(result.explored[5][7]).toBe(true)
    })

    test('handles large visible sets efficiently', () => {
      const level = createTestLevel()
      const visibleCells = new Set<string>()

      // Add all tiles in a 5x5 area
      for (let x = 2; x <= 6; x++) {
        for (let y = 2; y <= 6; y++) {
          visibleCells.add(`${x},${y}`)
        }
      }

      const result = service.updateExploredTiles(level, visibleCells)

      // All tiles in the 5x5 area should be explored
      for (let x = 2; x <= 6; x++) {
        for (let y = 2; y <= 6; y++) {
          expect(result.explored[y][x]).toBe(true)
        }
      }
    })
  })
})
