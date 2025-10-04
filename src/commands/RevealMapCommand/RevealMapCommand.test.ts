import { RevealMapCommand } from './RevealMapCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType } from '@game/core/core'

describe('RevealMapCommand', () => {
  let debugService: DebugService
  let command: RevealMapCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new RevealMapCommand(debugService)
  })

  test('executes debugService.revealMap', () => {
    const level: Level = {
      depth: 1,
      width: 5,
      height: 5,
      tiles: Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(5).fill(null).map(() => Array(5).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 2, y: 2 },
    }

    const mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })

  test('marks all tiles as explored', () => {
    const level: Level = {
      depth: 1,
      width: 3,
      height: 3,
      tiles: Array(3).fill(null).map(() =>
        Array(3).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(3).fill(null).map(() => Array(3).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 1, y: 1 },
    }

    const mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    const resultLevel = result.levels.get(1)!
    expect(resultLevel.explored.every(row => row.every(cell => cell === true))).toBe(true)
  })
})
