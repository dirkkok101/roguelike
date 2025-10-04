import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType } from '@game/core/core'

describe('DebugService - Map Reveal', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    // Create state with unexplored level
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)), // All unexplored
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      turnCount: 0,
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('revealMap marks all tiles as explored', () => {
    const result = debugService.revealMap(mockState)

    const level = result.levels.get(1)!
    expect(level.explored.every(row => row.every(cell => cell === true))).toBe(true)
  })

  test('revealMap sets mapRevealed flag', () => {
    const result = debugService.revealMap(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })

  test('revealMap adds message', () => {
    const result = debugService.revealMap(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Map REVEALED')
  })

  test('revealMap toggles off when called twice', () => {
    const revealed = debugService.revealMap(mockState)
    const hidden = debugService.revealMap(revealed)

    expect(hidden.debug?.mapRevealed).toBe(false)
    expect(hidden.messages[hidden.messages.length - 1].text).toContain('DISABLED')
  })

  test('revealMap does nothing in production', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.revealMap(mockState)

    expect(result).toBe(mockState)
  })

  test('preserves original state immutability', () => {
    const result = debugService.revealMap(mockState)

    expect(result).not.toBe(mockState)
    expect(result.levels).not.toBe(mockState.levels)
    expect(mockState.levels.get(1)!.explored[0][0]).toBe(false) // Original unchanged
  })

  test('revealMap returns unchanged state if level not found', () => {
    const invalidState = {
      ...mockState,
      currentLevel: 99,
    }

    const result = debugService.revealMap(invalidState)

    expect(result).toBe(invalidState)
  })

  test('revealMap creates new level object', () => {
    const result = debugService.revealMap(mockState)

    const originalLevel = mockState.levels.get(1)!
    const resultLevel = result.levels.get(1)!

    expect(resultLevel).not.toBe(originalLevel)
    expect(resultLevel.explored).not.toBe(originalLevel.explored)
  })

  test('revealMap preserves other level properties', () => {
    const result = debugService.revealMap(mockState)

    const originalLevel = mockState.levels.get(1)!
    const resultLevel = result.levels.get(1)!

    expect(resultLevel.depth).toBe(originalLevel.depth)
    expect(resultLevel.width).toBe(originalLevel.width)
    expect(resultLevel.height).toBe(originalLevel.height)
    expect(resultLevel.monsters).toBe(originalLevel.monsters)
  })
})
