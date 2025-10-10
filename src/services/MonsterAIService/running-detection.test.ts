import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import {
  GameState,
  Monster,
  Level,
  MonsterBehavior,
  MonsterState,
  TileType,
} from '@game/core/core'

describe('MonsterAIService - Running Detection', () => {
  let aiService: MonsterAIService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const pathfindingService = new PathfindingService(new LevelService())
    const fovService = new FOVService(new StatusEffectService())
    const levelService = new LevelService()
    aiService = new MonsterAIService(pathfindingService, mockRandom, fovService, levelService)
  })

  function createLevel(): Level {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ffffff',
            colorExplored: '#888888',
          }))
      )

    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 10, y: 10 },
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createMonster(position: { x: number; y: number }, aggroRange: number): Monster {
    return {
      id: 'test-monster',
      letter: 'O',
      name: 'Orc',
      position,
      hp: 8,
      maxHp: 8,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      level: 2,
      speed: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange,
        fleeThreshold: 0.25,
        chaseChance: 1.0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      energy: 0,
      isInvisible: false,
      statusEffects: [],
    }
  }

  function createGameState(
    playerPosition: { x: number; y: number },
    isRunning: boolean,
    level: Level
  ): GameState {
    return {
      player: {
        position: playerPosition,
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1000,
        equipment: {
          weapon: null,
          armor: null,
          rings: [],
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 0,
        isRunning, // Key field for testing
      },
      levels: new Map([[1, level]]),
      currentLevel: 1,
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      characterName: 'Test Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
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
    }
  }

  describe('checkWakeUp with running detection', () => {
    test('player walking: monster wakes at exact aggro range', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 5) // aggro range = 5
      const state = createGameState({ x: 10, y: 15 }, false, level) // 5 tiles away, NOT running

      const result = aiService.checkWakeUp(monster, state)

      expect(result.isAsleep).toBe(false)
      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('player walking: monster stays asleep at aggro range + 1', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 5) // aggro range = 5
      const state = createGameState({ x: 10, y: 16 }, false, level) // 6 tiles away, NOT running

      const result = aiService.checkWakeUp(monster, state)

      expect(result.isAsleep).toBe(true)
      expect(result.state).toBe(MonsterState.SLEEPING)
    })

    test('player running: monster wakes at increased range (50% farther)', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 5) // aggro range = 5
      // Effective range when running = 5 * 1.5 = 7.5 rounded to 8
      const state = createGameState({ x: 10, y: 18 }, true, level) // 8 tiles away, RUNNING

      const result = aiService.checkWakeUp(monster, state)

      expect(result.isAsleep).toBe(false)
      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('player running: monster stays asleep beyond increased range', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 5) // aggro range = 5
      // Effective range when running = 5 * 1.5 = 7.5 rounded to 8
      const state = createGameState({ x: 10, y: 19 }, true, level) // 9 tiles away, RUNNING

      const result = aiService.checkWakeUp(monster, state)

      expect(result.isAsleep).toBe(true)
      expect(result.state).toBe(MonsterState.SLEEPING)
    })

    test('running doubles detection for close range monsters', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 3) // aggro range = 3 (Snake)
      // Effective range when running = 3 * 1.5 = 4.5 rounded to 5
      const state = createGameState({ x: 10, y: 15 }, true, level) // 5 tiles away, RUNNING

      const result = aiService.checkWakeUp(monster, state)

      expect(result.isAsleep).toBe(false) // Would stay asleep if walking (5 > 3)
      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('already awake monster is not affected by running', () => {
      const level = createLevel()
      const awakeMonster = {
        ...createMonster({ x: 10, y: 10 }, 5),
        isAsleep: false,
        isAwake: true,
        state: MonsterState.HUNTING,
      }
      const state = createGameState({ x: 10, y: 18 }, true, level) // Running, far away

      const result = aiService.checkWakeUp(awakeMonster, state)

      expect(result.isAsleep).toBe(false) // Still awake
      expect(result.state).toBe(MonsterState.HUNTING) // Still hunting
    })
  })

  describe('updateMonsterState with running detection', () => {
    test('WANDERING → HUNTING when player running enters increased range', () => {
      const level = createLevel()
      const monster = {
        ...createMonster({ x: 10, y: 10 }, 5),
        isAsleep: false,
        state: MonsterState.WANDERING,
      }
      // Effective range when running = 5 * 1.5 = 7.5 rounded to 8
      const state = createGameState({ x: 10, y: 18 }, true, level) // 8 tiles away, RUNNING

      const result = aiService.updateMonsterState(monster, state)

      expect(result.state).toBe(MonsterState.HUNTING) // Transitions to hunting
    })

    test('WANDERING stays WANDERING when player running is beyond increased range', () => {
      const level = createLevel()
      const monster = {
        ...createMonster({ x: 10, y: 10 }, 5),
        isAsleep: false,
        state: MonsterState.WANDERING,
      }
      // Effective range when running = 5 * 1.5 = 7.5 rounded to 8
      const state = createGameState({ x: 10, y: 19 }, true, level) // 9 tiles away, RUNNING

      const result = aiService.updateMonsterState(monster, state)

      expect(result.state).toBe(MonsterState.WANDERING) // Stays wandering
    })

    test('running increases aggro range for state transitions', () => {
      const level = createLevel()
      const monster = {
        ...createMonster({ x: 10, y: 10 }, 4),
        isAsleep: false,
        state: MonsterState.WANDERING,
      }
      // Effective range when running = 4 * 1.5 = 6
      const state = createGameState({ x: 10, y: 16 }, true, level) // 6 tiles away, RUNNING

      const result = aiService.updateMonsterState(monster, state)

      expect(result.state).toBe(MonsterState.HUNTING) // Transitions (would stay WANDERING if walking)
    })
  })

  describe('edge cases', () => {
    test('running with aggroRange 0 (ERRATIC monsters) never wakes', () => {
      const level = createLevel()
      const erraticMonster = {
        ...createMonster({ x: 10, y: 10 }, 0), // Bat/Kestrel aggro range = 0
        aiProfile: {
          behavior: MonsterBehavior.ERRATIC,
          intelligence: 2,
          aggroRange: 0, // Never wakes from proximity
          fleeThreshold: 0,
          chaseChance: 1.0,
          special: [],
        },
      }
      const state = createGameState({ x: 10, y: 11 }, true, level) // Adjacent, RUNNING

      const result = aiService.checkWakeUp(erraticMonster, state)

      expect(result.isAsleep).toBe(true) // Still asleep (ERRATIC never wake)
    })

    test('rounding works correctly for aggro range 7', () => {
      const level = createLevel()
      const monster = createMonster({ x: 10, y: 10 }, 7) // aggro range = 7
      // Effective range when running = 7 * 1.5 = 10.5 rounded to 11
      const stateAt11 = createGameState({ x: 10, y: 21 }, true, level) // 11 tiles away, RUNNING
      const stateAt12 = createGameState({ x: 10, y: 22 }, true, level) // 12 tiles away, RUNNING

      const resultAt11 = aiService.checkWakeUp(monster, stateAt11)
      const resultAt12 = aiService.checkWakeUp(monster, stateAt12)

      expect(resultAt11.isAsleep).toBe(false) // Wakes at 11
      expect(resultAt12.isAsleep).toBe(true) // Stays asleep at 12
    })
  })
})
