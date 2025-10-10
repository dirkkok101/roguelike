import { MonsterAIService } from './MonsterAIService'
import { FOVService } from '@services/FOVService'
import { PathfindingService } from '@services/PathfindingService'
import { MockRandom } from '@services/RandomService'
import { Monster, MonsterState, MonsterBehavior } from '@game/core/core'

describe('MonsterAIService - Aggro Range (Authentic Rogue)', () => {
  let aiService: MonsterAIService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const pathfindingService = new PathfindingService()
    const fovService = new FOVService()
    aiService = new MonsterAIService(pathfindingService, fovService, mockRandom)
  })

  // Helper to create test monster
  function createMonster(aggroRange: number, behavior = MonsterBehavior.SIMPLE): Monster {
    return {
      id: 'test',
      letter: 'T',
      name: 'Test',
      position: { x: 10, y: 10 },
      hp: 20,
      maxHp: 20,
      ac: 5,
      damage: '1d8',
      xpValue: 10,
      aiProfile: {
        behavior,
        intelligence: 3,
        aggroRange,
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
      speed: 10,
      isInvisible: false,
      statusEffects: [],
      energy: 0,
    }
  }

  // Helper to create game state with player at specific distance
  function createStateWithPlayerAt(distance: number) {
    const player: any = {
      position: { x: 10 + distance, y: 10 }, // Place player at exact distance
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1000,
      equipment: { weapon: null, armor: null, leftRing: null, rightRing: null, lightSource: null },
      inventory: [],
      statusEffects: [],
      energy: 100,
      isRunning: false,
    }

    const level: any = {
      depth: 1,
      width: 80,
      height: 22,
      tiles: [],
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 40, y: 11 },
      explored: [],
    }

    return {
      player,
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test',
      characterName: 'Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: { potions: new Map(), scrolls: new Map(), rings: new Map(), wands: new Map() },
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    } as any
  }

  describe('Wake-up Distance Validation', () => {
    test('wake monster at exact aggroRange distance', () => {
      const monster = createMonster(6)
      const state = createStateWithPlayerAt(6)

      const result = aiService.checkWakeUp(monster, state)

      expect(result.state).toBe(MonsterState.HUNTING)
      expect(result.isAsleep).toBe(false)
    })

    test('do NOT wake monster beyond aggroRange', () => {
      const monster = createMonster(6)
      const state = createStateWithPlayerAt(7)

      const result = aiService.checkWakeUp(monster, state)

      expect(result.state).toBe(MonsterState.SLEEPING)
      expect(result.isAsleep).toBe(true)
    })
  })

  describe('ERRATIC Monsters (aggroRange 0)', () => {
    test('NEVER wake from proximity (authentic Rogue Bat behavior)', () => {
      const bat = createMonster(0, MonsterBehavior.ERRATIC)
      const state = createStateWithPlayerAt(1) // Adjacent!

      const result = aiService.checkWakeUp(bat, state)

      expect(result.state).toBe(MonsterState.SLEEPING)
      expect(result.isAsleep).toBe(true)
    })
  })

  describe('SIMPLE Monsters (low aggro range 4-5)', () => {
    test('wake Snake at aggroRange 4', () => {
      const snake = createMonster(4)
      const state = createStateWithPlayerAt(4)

      const result = aiService.checkWakeUp(snake, state)

      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('do NOT wake Snake beyond aggroRange 4', () => {
      const snake = createMonster(4)
      const state = createStateWithPlayerAt(5)

      const result = aiService.checkWakeUp(snake, state)

      expect(result.state).toBe(MonsterState.SLEEPING)
    })
  })

  describe('SMART Monsters (medium aggro range 7-8)', () => {
    test('wake Centaur at aggroRange 7', () => {
      const centaur = createMonster(7, MonsterBehavior.SMART)
      const state = createStateWithPlayerAt(7)

      const result = aiService.checkWakeUp(centaur, state)

      expect(result.state).toBe(MonsterState.HUNTING)
    })
  })

  describe('Boss Monsters (high aggro range 10)', () => {
    test('wake Dragon at aggroRange 10', () => {
      const dragon = createMonster(10, MonsterBehavior.SMART)
      const state = createStateWithPlayerAt(10)

      const result = aiService.checkWakeUp(dragon, state)

      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('do NOT wake Dragon beyond aggroRange 10', () => {
      const dragon = createMonster(10, MonsterBehavior.SMART)
      const state = createStateWithPlayerAt(11)

      const result = aiService.checkWakeUp(dragon, state)

      expect(result.state).toBe(MonsterState.SLEEPING)
    })
  })

  describe('STATIONARY Monsters (minimal aggro range 1)', () => {
    test('wake Venus Flytrap only when adjacent (aggroRange 1)', () => {
      const flytrap = createMonster(1, MonsterBehavior.STATIONARY)
      const state = createStateWithPlayerAt(1)

      const result = aiService.checkWakeUp(flytrap, state)

      expect(result.state).toBe(MonsterState.HUNTING)
    })

    test('do NOT wake Venus Flytrap at distance 2', () => {
      const flytrap = createMonster(1, MonsterBehavior.STATIONARY)
      const state = createStateWithPlayerAt(2)

      const result = aiService.checkWakeUp(flytrap, state)

      expect(result.state).toBe(MonsterState.SLEEPING)
    })
  })
})
