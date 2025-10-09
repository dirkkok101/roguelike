import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { GameState, Level, TileType, MonsterState, MonsterBehavior } from '@game/core/core'

describe('DebugService - Monster Control', () => {
  async function createDebugService(isDevMode: boolean = true) {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    return new DebugService(new MessageService(), monsterSpawnService, mockRandom, isDevMode)
  }

  let debugService: DebugService
  let mockState: GameState

  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    debugService = new DebugService(messageService, monsterSpawnService, mockRandom, true)

    // Create state with sleeping and awake monsters
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
        {
          id: 'monster1',
          letter: 'O',
          name: 'Orc',
          position: { x: 2, y: 2 },
          hp: 10,
          maxHp: 10,
          ac: 5,
          damage: '1d8',
          xpValue: 15,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
          isAsleep: true,
          isAwake: false,
          state: MonsterState.SLEEPING,
          visibleCells: new Set(),
          currentPath: null,
          hasStolen: false,
          level: 1,
        },
        {
          id: 'monster2',
          letter: 'T',
          name: 'Troll',
          position: { x: 4, y: 4 },
          hp: 20,
          maxHp: 20,
          ac: 4,
          damage: '1d10',
          xpValue: 30,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
          isAsleep: true,
          isAwake: false,
          state: MonsterState.SLEEPING,
          visibleCells: new Set(),
          currentPath: null,
          hasStolen: false,
          level: 1,
        },
        {
          id: 'monster3',
          letter: 'K',
          name: 'Kobold',
          position: { x: 6, y: 6 },
          hp: 5,
          maxHp: 5,
          ac: 6,
          damage: '1d4',
          xpValue: 5,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
          isAsleep: false,
          isAwake: true,
          state: MonsterState.HUNTING,
          visibleCells: new Set(),
          currentPath: null,
          hasStolen: false,
          level: 1,
        },
      ] as any,
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

  describe('wakeAllMonsters', () => {
    test('wakes all sleeping monsters', async () => {
      const result = debugService.wakeAllMonsters(mockState)

      const monsters = result.levels.get(1)!.monsters
      expect(monsters.every(m => m.isAwake)).toBe(true)
      expect(monsters.every(m => !m.isAsleep)).toBe(true)
    })

    test('sets sleeping monsters to HUNTING state', async () => {
      const result = debugService.wakeAllMonsters(mockState)

      const monsters = result.levels.get(1)!.monsters
      const previouslySleeping = monsters.filter(m => m.id === 'monster1' || m.id === 'monster2')
      expect(previouslySleeping.every(m => m.state === MonsterState.HUNTING)).toBe(true)
    })

    test('preserves state of already awake monsters', async () => {
      const result = debugService.wakeAllMonsters(mockState)

      const kobold = result.levels.get(1)!.monsters.find(m => m.id === 'monster3')
      expect(kobold!.state).toBe(MonsterState.HUNTING)
    })

    test('adds message with awake count', async () => {
      const result = debugService.wakeAllMonsters(mockState)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Woke 3 monsters')
    })

    test('preserves immutability', async () => {
      const result = debugService.wakeAllMonsters(mockState)

      expect(result).not.toBe(mockState)
      expect(result.levels).not.toBe(mockState.levels)
      expect(mockState.levels.get(1)!.monsters[0].isAsleep).toBe(true) // Original unchanged
    })

    test('does nothing in production mode', async () => {
      const prodService = await createDebugService(false)
      const result = prodService.wakeAllMonsters(mockState)

      expect(result).toBe(mockState)
    })
  })

  describe('killAllMonsters', () => {
    test('removes all monsters from level', async () => {
      const result = debugService.killAllMonsters(mockState)

      const level = result.levels.get(1)!
      expect(level.monsters).toHaveLength(0)
    })

    test('adds message with monster count', async () => {
      const result = debugService.killAllMonsters(mockState)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toContain('Removed 3 monsters')
    })

    test('preserves immutability', async () => {
      const result = debugService.killAllMonsters(mockState)

      expect(result).not.toBe(mockState)
      expect(result.levels).not.toBe(mockState.levels)
      expect(mockState.levels.get(1)!.monsters).toHaveLength(3) // Original unchanged
    })

    test('does nothing in production mode', async () => {
      const prodService = await createDebugService(false)
      const result = prodService.killAllMonsters(mockState)

      expect(result).toBe(mockState)
    })

    test('handles empty monster list', async () => {
      const emptyLevel: Level = {
        ...mockState.levels.get(1)!,
        monsters: [],
      }
      const emptyState = {
        ...mockState,
        levels: new Map([[1, emptyLevel]]),
      }

      const result = debugService.killAllMonsters(emptyState)

      expect(result.messages[0].text).toContain('Removed 0 monsters')
    })
  })
})
