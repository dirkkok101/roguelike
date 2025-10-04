import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType, MonsterState, MonsterBehavior } from '@game/core/core'

describe('DebugService - Monster Spawning', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    // Create state with empty level
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
      turnCount: 0,
      player: {
        position: { x: 1, y: 1 },
      },
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('spawnMonster creates new monster at player position', () => {
    const result = debugService.spawnMonster(mockState, 'T')

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(1)
    expect(level.monsters[0].letter).toBe('T')
  })

  test('spawnMonster creates monster with correct properties', () => {
    const result = debugService.spawnMonster(mockState, 'D')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.name).toBe('Debug D')
    expect(monster.hp).toBe(10)
    expect(monster.maxHp).toBe(10)
    expect(monster.ac).toBe(5)
    expect(monster.damage).toBe('1d6')
    expect(monster.xpValue).toBe(10)
  })

  test('spawnMonster creates awake hunting monster', () => {
    const result = debugService.spawnMonster(mockState, 'M')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.isAwake).toBe(true)
    expect(monster.isAsleep).toBe(false)
    expect(monster.state).toBe(MonsterState.HUNTING)
  })

  test('spawnMonster creates monster with SIMPLE behavior', () => {
    const result = debugService.spawnMonster(mockState, 'G')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.aiProfile.behavior).toBe(MonsterBehavior.SIMPLE)
    expect(monster.aiProfile.intelligence).toBe(5)
    expect(monster.aiProfile.aggroRange).toBe(5)
  })

  test('spawnMonster adds message with position', () => {
    const result = debugService.spawnMonster(mockState, 'T')

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned T at')
  })

  test('spawnMonster finds nearby empty tile when position blocked', () => {
    // Add monster at player position
    const blockedLevel: Level = {
      ...mockState.levels.get(1)!,
      monsters: [{
        position: { x: 1, y: 1 },
        id: 'existing',
      } as any],
    }
    const blockedState = {
      ...mockState,
      levels: new Map([[1, blockedLevel]]),
    }

    const result = debugService.spawnMonster(blockedState, 'T')

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(2)
    // New monster should be at different position
    expect(level.monsters[1].position).not.toEqual({ x: 1, y: 1 })
  })

  test('spawnMonster with explicit position uses that position', () => {
    const result = debugService.spawnMonster(mockState, 'T', { x: 5, y: 5 })

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.position).toEqual({ x: 5, y: 5 })
  })

  test('spawnMonster preserves immutability', () => {
    const result = debugService.spawnMonster(mockState, 'T')

    expect(result).not.toBe(mockState)
    expect(result.levels).not.toBe(mockState.levels)
    expect(mockState.levels.get(1)!.monsters).toHaveLength(0) // Original unchanged
  })

  test('spawnMonster does nothing in production mode', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.spawnMonster(mockState, 'T')

    expect(result).toBe(mockState)
  })

  test('spawnMonster returns state with warning if no empty tile found', () => {
    // Create level with all walls
    const walledLevel: Level = {
      ...mockState.levels.get(1)!,
      tiles: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
    }
    const walledState = {
      ...mockState,
      levels: new Map([[1, walledLevel]]),
    }

    const result = debugService.spawnMonster(walledState, 'T')

    expect(result.messages[0].text).toContain('No empty tile found')
    expect(result.levels.get(1)!.monsters).toHaveLength(0)
  })
})
