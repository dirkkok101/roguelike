import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Monster, MonsterBehavior, MonsterState } from '@game/core/core'

describe('MonsterAIService - Chase Probability', () => {
  let service: MonsterAIService
  let pathfinding: PathfindingService
  let mockRandom: MockRandom
  let fovService: FOVService
  let statusEffectService: StatusEffectService
  let levelService: LevelService

  beforeEach(() => {
    levelService = new LevelService()
    pathfinding = new PathfindingService(levelService)
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    service = new MonsterAIService(pathfinding, mockRandom, fovService, levelService)
  })

  function createTestMonster(overrides?: Partial<Monster>): Monster {
    return {
      id: 'test-monster',
      letter: 'H',
      name: 'Hobgoblin',
      spriteName: 'Hobgoblin',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 5,
      damage: '1d8',
      xpValue: 3,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 7,
        fleeThreshold: 0.0,
        chaseChance: 0.67, // MEAN monster with 67% chase chance
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.HUNTING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
      ...overrides,
    }
  }

  function createTestState(monsterPos = { x: 5, y: 5 }, playerPos = { x: 10, y: 10 }): GameState {
    const monster = createTestMonster({ position: monsterPos })

    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#808080',
            colorExplored: '#404040',
          }))
      )

    const explored = Array(20)
      .fill(null)
      .map(() => Array(20).fill(false))

    const level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      explored,
      rooms: [],
      monsters: [monster],
      items: [],
      gold: [],
      traps: [],
      doors: [],
      stairsUp: null,
      stairsDown: { x: 15, y: 15 },
    }

    return {
      player: {
        position: playerPos,
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 0,
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

  describe('MEAN monster with chaseChance: 0.67', () => {
    test('waits when chase roll fails (roll > chaseChance)', () => {
      // Arrange: MEAN monster with 67% chase chance, MockRandom will return 0.8 (> 0.67)
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Set MockRandom to fail chance() call (return 0 from nextInt)
      mockRandom.setValues([0]) // chance() returns false when nextInt returns 0

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should wait instead of chasing
      expect(action.type).toBe('wait')
    })

    test('pursues when chase roll succeeds (roll <= chaseChance)', () => {
      // Arrange: MEAN monster with 67% chase chance, MockRandom will return 0.5 (<= 0.67)
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Set MockRandom to succeed chance() call (return 1 from nextInt)
      mockRandom.setValues([1]) // chance() returns true when nextInt returns 1

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should pursue (move toward player)
      expect(action.type).toBe('move')
      expect(action.target).toBeDefined()
      // SIMPLE behavior: when dx == dy, moves vertically first
      // Monster at (5,5) toward (10,10): dx=5, dy=5, so moves vertically
      expect(action.target).toEqual({ x: 5, y: 6 })
    })
  })

  describe('Backwards compatibility', () => {
    test('monster without chaseChance always pursues (defaults to 1.0)', () => {
      // Arrange: Monster without chaseChance field (should default to 100% chase)
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 2,
          aggroRange: 7,
          fleeThreshold: 0.0,
          // No chaseChance field - should default to 1.0
          special: [],
        },
      })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Even if MockRandom would fail, monster should still pursue (no roll needed)
      mockRandom.setValues([0])

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should pursue regardless of random roll
      expect(action.type).toBe('move')
      expect(action.target).toBeDefined()
    })

    test('monster with chaseChance: 1.0 always pursues', () => {
      // Arrange: Monster with explicit 100% chase chance
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 2,
          aggroRange: 7,
          fleeThreshold: 0.0,
          chaseChance: 1.0, // Explicit 100% chase
          special: [],
        },
      })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should pursue
      expect(action.type).toBe('move')
      expect(action.target).toBeDefined()
    })
  })

  describe('Sleeping monsters', () => {
    test('sleeping monster waits regardless of chase probability', () => {
      // Arrange: Sleeping MEAN monster (should wait regardless of chaseChance)
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        isAsleep: true,
        state: MonsterState.SLEEPING,
      })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Set MockRandom to succeed (shouldn't matter for sleeping monsters)
      mockRandom.setValues([1])

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Sleeping monster should always wait
      expect(action.type).toBe('wait')
    })
  })

  describe('Adjacent to player', () => {
    test('monster attacks when adjacent even if chase roll fails', () => {
      // Arrange: MEAN monster adjacent to player, but chase roll fails
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 }) // Adjacent

      // Set MockRandom to fail chase roll
      mockRandom.setValues([0])

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should attack (adjacency takes priority over chase probability)
      expect(action.type).toBe('attack')
      expect(action.target).toEqual({ x: 6, y: 5 })
    })
  })

  describe('Scare scroll priority', () => {
    test('monster flees from scare scroll even if chase roll succeeds', () => {
      // Arrange: MEAN monster with scare scroll adjacent
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Add scare scroll item adjacent to monster
      const level = state.levels.get(1)!
      const scareScroll = {
        id: 'scare-1',
        name: 'Scroll of Scare Monster',
      spriteName: 'Scroll of Scare Monster',
        type: 'SCROLL' as const,
        identified: true,
        position: { x: 6, y: 5 }, // Adjacent to monster
        scrollType: 'SCARE_MONSTER' as const,
        effect: 'Scares monsters',
        labelName: 'scroll labeled VENZAR BORGAVVE',
      }
      level.items = [scareScroll]

      // Set MockRandom to succeed chase roll (shouldn't matter - scare takes priority)
      mockRandom.setValues([1])

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should flee from scare scroll (highest priority)
      expect(action.type).toBe('move')
      // Should move away from scare scroll at (6,5)
      expect(action.target?.x).toBeLessThan(6) // Moves left away from scroll
    })
  })

  describe('Different chase probabilities', () => {
    test('monster with chaseChance: 0.5 has 50% chance to chase', () => {
      // Arrange: Monster with 50% chase chance
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 2,
          aggroRange: 7,
          fleeThreshold: 0.0,
          chaseChance: 0.5, // 50% chase chance
          special: [],
        },
      })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Test failure case
      mockRandom.setValues([0])
      const failAction = service.decideAction(monster, state)
      expect(failAction.type).toBe('wait')

      // Test success case
      mockRandom.setValues([1])
      const successAction = service.decideAction(monster, state)
      expect(successAction.type).toBe('move')
    })

    test('monster with chaseChance: 0.0 never chases', () => {
      // Arrange: Monster with 0% chase chance (passive)
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 2,
          aggroRange: 7,
          fleeThreshold: 0.0,
          chaseChance: 0.0, // Never chases
          special: [],
        },
      })
      const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

      // Even with successful roll, 0% should fail
      mockRandom.setValues([1])

      // Act
      const action = service.decideAction(monster, state)

      // Assert: Monster should never chase
      expect(action.type).toBe('wait')
    })
  })
})
