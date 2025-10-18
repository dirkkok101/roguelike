import { RunCommand } from './RunCommand'
import { GameState, Direction, Level, TileType, Monster, MonsterBehavior, MonsterState } from '@game/core/core'
import { createTestTorch } from '../../test-utils'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'

describe('RunCommand', () => {
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService()
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 15,
      height: 15,
      tiles: Array(15)
        .fill(null)
        .map(() =>
          Array(15)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
              isRoom: true,
            }))
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(15)
        .fill(null)
        .map(() => Array(15).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: createTestTorch(),
        },
        inventory: [],
        statusEffects: [],
        energy: 100,
        isRunning: false,
        runState: null,
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(['5,5']),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      characterName: 'TestHero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: new Set(),
      maxDepth: 26,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: {
        fovMode: 'radius',
      },
    }
  }

  function createTestMonster(id: string, position: { x: number; y: number }, name: string = 'Orc'): Monster {
    return {
      id,
      letter: 'O',
      name,
      spriteName: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    }
  }

  describe('execute', () => {
    it('sets runState and isRunning flag on player', () => {
      const state = createTestState()

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(true)
      expect(newState.player.runState).not.toBeNull()
      expect(newState.player.runState?.direction).toBe('right')
      expect(newState.player.runState?.startingPosition).toEqual({ x: 5, y: 5 })
      expect(newState.player.runState?.previousHP).toBe(20)
    })

    it('captures starting FOV monsters (only visible monsters)', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Add two monsters: one visible, one not
      const visibleMonster = createTestMonster('orc-1', { x: 6, y: 5 }, 'Orc')
      const invisibleMonster = createTestMonster('kobold-2', { x: 10, y: 10 }, 'Kobold')
      level.monsters = [visibleMonster, invisibleMonster]

      // Only orc is visible
      state.visibleCells = new Set(['5,5', '6,5'])

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.runState?.startingFOV.has('orc-1')).toBe(true)
      expect(newState.player.runState?.startingFOV.has('kobold-2')).toBe(false)
      expect(newState.player.runState?.startingFOV.size).toBe(1)
    })

    it('does not start run if player is confused', () => {
      const state = createTestState()
      state.player.statusEffects = [{ type: 'CONFUSED', duration: 5 }]

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.length).toBeGreaterThan(0)
      expect(newState.messages.some(m => m.text.toLowerCase().includes('confused'))).toBe(true)
    })

    it('does not start run if player is blind', () => {
      const state = createTestState()
      state.player.statusEffects = [{ type: 'BLIND', duration: 5 }]

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.toLowerCase().includes('blind'))).toBe(true)
    })

    it('does not start run if player is paralyzed', () => {
      const state = createTestState()
      state.player.statusEffects = [{ type: 'PARALYZED', duration: 3 }]

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.toLowerCase().includes('paralyzed'))).toBe(true)
    })

    it('does not start run if player is held', () => {
      const state = createTestState()
      state.player.statusEffects = [{ type: 'HELD', duration: 4 }]

      const command = new RunCommand('right', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.toLowerCase().includes('held'))).toBe(true)
    })

    it('captures empty startingFOV when no monsters are visible', () => {
      const state = createTestState()

      const command = new RunCommand('up', recorder, mockRandom)
      const newState = command.execute(state)

      expect(newState.player.runState?.startingFOV.size).toBe(0)
      expect(newState.player.isRunning).toBe(true)
    })

    it('supports all eight directions', () => {
      const directions: Direction[] = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right']

      directions.forEach(direction => {
        const state = createTestState()
        const command = new RunCommand(direction, recorder, mockRandom)
        const newState = command.execute(state)

        expect(newState.player.runState?.direction).toBe(direction)
        expect(newState.player.isRunning).toBe(true)
      })
    })

    it('does not mutate original state', () => {
      const state = createTestState()
      const originalIsRunning = state.player.isRunning
      const originalRunState = state.player.runState

      const command = new RunCommand('down', recorder, mockRandom)
      command.execute(state)

      expect(state.player.isRunning).toBe(originalIsRunning)
      expect(state.player.runState).toBe(originalRunState)
    })
  })
})
