import { KillAllMonstersCommand } from './KillAllMonstersCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType } from '@game/core/core'

describe('KillAllMonstersCommand', () => {
  let debugService: DebugService
  let command: KillAllMonstersCommand
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new KillAllMonstersCommand(debugService)

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
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [
        { id: 'monster1', letter: 'O', name: 'Orc' } as any,
        { id: 'monster2', letter: 'T', name: 'Troll' } as any,
      ],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('executes debugService.killAllMonsters', () => {
    const result = command.execute(mockState)

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(0)
  })

  test('removes all monsters from level', () => {
    const result = command.execute(mockState)

    const level = result.levels.get(1)!
    expect(level.monsters).toEqual([])
  })

  test('adds message with monster count', () => {
    const result = command.execute(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Removed')
    expect(result.messages[0].text).toContain('monsters')
  })
})
