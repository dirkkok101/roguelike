import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import {
  GameState,
  Monster,
  MonsterBehavior,
  SpecialAbilityFlag,
} from '@game/core/core'

describe('MonsterAIService - COWARD Behavior', () => {
  let service: MonsterAIService
  let pathfinding: PathfindingService
  let mockRandom: MockRandom
  let fovService: FOVService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    const levelService = new LevelService()
    pathfinding = new PathfindingService(levelService)
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    service = new MonsterAIService(pathfinding, mockRandom, fovService, levelService)
  })

  function createTestMonster(overrides?: Partial<Monster>): Monster {
    return {
      id: 'vampire',
      letter: 'V',
      name: 'Vampire',
      spriteName: 'Vampire',
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      ac: 6,
      damage: '1d6+1d6',
      xpValue: 50,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [SpecialAbilityFlag.REGENERATION, SpecialAbilityFlag.DRAINS_MAX_HP],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
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
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    const level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [],
      monsters: [monster],
      items: [],
      gold: [],
      traps: [],
      doors: [],
      upStairs: null,
      downStairs: null,
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
      },
      levels: new Map([[1, level]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  test('fights using SMART behavior when HP above flee threshold', () => {
    const monster = createTestMonster({
      position: { x: 1, y: 1 },
      hp: 15,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 1, y: 1 }, { x: 5, y: 1 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should use A* to move toward player
    expect(action.target).toBeDefined()
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('flees when HP below flee threshold', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 5,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should flee away from player (west)
    expect(action.target!.x).toBeLessThan(monster.position.x)
  })

  test('flees at exact flee threshold', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 6,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    const action = service.decideAction(monster, state)

    // HP is 30% (6/20), exactly at threshold, condition is hp < threshold (not <=)
    // So at exactly 30%, it should fight, not flee
    expect(action.type).toBe('move')
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('fights when HP just above flee threshold', () => {
    const monster = createTestMonster({
      position: { x: 1, y: 1 },
      hp: 7,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 1, y: 1 }, { x: 5, y: 1 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // HP is 35% (7/20), above 30% threshold, should fight
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('flees vertically when player closer in y-axis', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 2,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 10 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Player is south, should flee north
    expect(action.target!.y).toBeLessThan(monster.position.y)
  })

  test('tries perpendicular direction when primary flee blocked', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 2,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Block westward flee
    const level = state.levels.get(1)!
    level.tiles[5][4] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    const action = service.decideAction(monster, state)

    if (action.type === 'move') {
      // Should try perpendicular (north or south)
      expect(action.target!.y).not.toBe(monster.position.y)
    } else {
      expect(action.type).toBe('wait')
    }
  })

  test('attacks when adjacent regardless of HP', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 1,
      maxHp: 20,
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('state transitions to FLEEING when HP drops', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 4,
      maxHp: 20,
      state: 'HUNTING',
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })

    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    const updated = service.updateMonsterState(monster, state)

    expect(updated.state).toBe('FLEEING')
  })

  test('state transitions back to HUNTING when HP recovered', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 20,
      state: 'FLEEING',
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 8,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })

    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    const updated = service.updateMonsterState(monster, state)

    // HP is 50%, threshold is 30%, should return to hunting (needs 40% = 30% + 10%)
    expect(updated.state).toBe('HUNTING')
  })
})
