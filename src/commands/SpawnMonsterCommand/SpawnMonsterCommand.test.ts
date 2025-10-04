import { SpawnMonsterCommand } from './SpawnMonsterCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType } from '@game/core/core'

describe('SpawnMonsterCommand', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

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
      player: {
        position: { x: 1, y: 1 },
      },
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('executes debugService.spawnMonster with specified letter', () => {
    const command = new SpawnMonsterCommand('T', debugService)
    const result = command.execute(mockState)

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(1)
    expect(level.monsters[0].letter).toBe('T')
  })

  test('spawns different monster letters', () => {
    const commandA = new SpawnMonsterCommand('A', debugService)
    const commandB = new SpawnMonsterCommand('B', debugService)

    const resultA = commandA.execute(mockState)
    const resultB = commandB.execute(resultA)

    const level = resultB.levels.get(1)!
    expect(level.monsters).toHaveLength(2)
    expect(level.monsters[0].letter).toBe('A')
    expect(level.monsters[1].letter).toBe('B')
  })

  test('adds message indicating spawn', () => {
    const command = new SpawnMonsterCommand('D', debugService)
    const result = command.execute(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned D')
  })

  test('creates command with dragon letter', () => {
    const command = new SpawnMonsterCommand('D', debugService)
    expect(command).toBeInstanceOf(SpawnMonsterCommand)
  })
})
