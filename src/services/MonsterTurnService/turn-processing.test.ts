import { MonsterTurnService } from './MonsterTurnService'
import { MonsterAIService } from '@services/MonsterAIService'
import { CombatService } from '@services/CombatService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Monster,
  MonsterBehavior,
  Player,
  SpecialAbilityFlag,
} from '@game/core/core'

describe('MonsterTurnService - Turn Processing', () => {
  let service: MonsterTurnService
  let aiService: MonsterAIService
  let combatService: CombatService
  let abilityService: SpecialAbilityService
  let messageService: MessageService
  let turnService: TurnService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const levelService = new LevelService()
    const pathfinding = new PathfindingService(levelService)
    const statusEffectService = new StatusEffectService()
    const fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    turnService = new TurnService(statusEffectService, levelService)

    aiService = new MonsterAIService(pathfinding, mockRandom, fovService, levelService)
    combatService = new CombatService(mockRandom)
    abilityService = new SpecialAbilityService(mockRandom)

    service = new MonsterTurnService(mockRandom, aiService, combatService, abilityService, messageService, turnService)
  })

  function createTestState(monsters: Monster[] = []): GameState {
    const player: Player = {
      position: { x: 10, y: 10 },
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
      energy: 100,
    }

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
      monsters,
      items: [],
      gold: [],
      traps: [],
      doors: [],
      upStairs: null,
      downStairs: null,
    }

    return {
      player,
      levels: new Map([[1, level]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  function createTestMonster(overrides?: Partial<Monster>): Monster {
    return {
      id: 'monster-1',
      letter: 'M',
      name: 'Monster',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 90,
      speed: 10,
      ...overrides,
    }
  }

  test('processes all monsters in level', () => {
    const monster1 = createTestMonster({ id: 'monster-1', position: { x: 5, y: 5 } })
    const monster2 = createTestMonster({ id: 'monster-2', position: { x: 7, y: 7 } })
    const state = createTestState([monster1, monster2])

    const result = service.processMonsterTurns(state)

    expect(result).toBeDefined()
    expect(result.levels.get(1)?.monsters).toHaveLength(2)
  })

  test('skips dead monsters', () => {
    const deadMonster = createTestMonster({ hp: 0 })
    const aliveMonster = createTestMonster({ id: 'monster-2', position: { x: 7, y: 7 } })
    const state = createTestState([deadMonster, aliveMonster])

    mockRandom.setValues([0]) // Movement toward player

    const result = service.processMonsterTurns(state)

    // Dead monster should not have moved
    const level = result.levels.get(1)!
    const deadMon = level.monsters.find(m => m.hp === 0)
    expect(deadMon?.position).toEqual(deadMonster.position)
  })

  test('returns same state when no level', () => {
    const state = createTestState([])
    state.levels = new Map()

    const result = service.processMonsterTurns(state)

    expect(result).toBe(state)
  })

  test('monster moves toward player', () => {
    const monster = createTestMonster({ position: { x: 5, y: 10 } })
    let state = createTestState([monster])

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    mockRandom.setValues([0]) // Not random, move toward player

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const movedMonster = level.monsters[0]

    // Should have moved closer to player
    expect(movedMonster.position.x).toBeGreaterThan(monster.position.x)
  })

  test('applies regeneration to monsters with regenerates ability', () => {
    const monster = createTestMonster({
      hp: 5,
      maxHp: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [SpecialAbilityFlag.REGENERATION],
      },
    })
    let state = createTestState([monster])

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    mockRandom.setValues([0])

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const regeneratedMonster = level.monsters[0]

    expect(regeneratedMonster.hp).toBe(6)
  })

  test('does not regenerate monsters without regenerates ability', () => {
    const monster = createTestMonster({ hp: 5, maxHp: 10 })
    const state = createTestState([monster])

    mockRandom.setValues([0])

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const processedMonster = level.monsters[0]

    expect(processedMonster.hp).toBe(5)
  })

  test('wakes up sleeping monsters when player nearby', () => {
    const sleepingMonster = createTestMonster({
      position: { x: 12, y: 10 },
      isAsleep: true,
      state: 'SLEEPING',
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
    })
    let state = createTestState([sleepingMonster])

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const awakenedMonster = level.monsters[0]

    expect(awakenedMonster.isAsleep).toBe(false)
    expect(awakenedMonster.state).toBe('HUNTING')
  })

  test('processes monster state transitions', () => {
    const cowardMonster = createTestMonster({
      hp: 2,
      maxHp: 10,
      state: 'HUNTING',
      aiProfile: {
        behavior: MonsterBehavior.COWARD,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: [],
      },
    })
    let state = createTestState([cowardMonster])

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    mockRandom.setValues([0])

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const fleeingMonster = level.monsters[0]

    expect(fleeingMonster.state).toBe('FLEEING')
  })

  test('returns immutable state', () => {
    const monster = createTestMonster()
    let state = createTestState([monster])

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    mockRandom.setValues([0])

    const result = service.processMonsterTurns(state)

    expect(result).not.toBe(state)
    expect(result.levels).not.toBe(state.levels)
  })
})
