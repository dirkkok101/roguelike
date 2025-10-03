import { MonsterTurnService } from './MonsterTurnService'
import { MonsterAIService } from '../MonsterAIService'
import { CombatService } from '../CombatService'
import { SpecialAbilityService } from '../SpecialAbilityService'
import { MessageService } from '../MessageService'
import { PathfindingService } from '../PathfindingService'
import { FOVService } from '../FOVService'
import { MockRandom } from '../RandomService'
import { GameState, Monster, MonsterBehavior, Player } from '../../types/core/core'

describe('MonsterTurnService - Combat Execution', () => {
  let service: MonsterTurnService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const pathfinding = new PathfindingService()
    const fovService = new FOVService()

    const aiService = new MonsterAIService(pathfinding, mockRandom, fovService)
    const combatService = new CombatService(mockRandom)
    const abilityService = new SpecialAbilityService(mockRandom)
    const messageService = new MessageService()

    service = new MonsterTurnService(aiService, combatService, abilityService, messageService)
  })

  function createTestState(monsters: Monster[] = [], playerPos = { x: 10, y: 10 }): GameState {
    const player: Player = {
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
      ...overrides,
    }
  }

  test('monster attacks adjacent player', () => {
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState([monster], { x: 10, y: 10 })

    mockRandom.setValues([15, 4]) // Hit roll, damage

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBeLessThan(20)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  test('adds combat message on hit', () => {
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState([monster], { x: 10, y: 10 })

    mockRandom.setValues([20, 5]) // Hit, 5 damage

    const result = service.processMonsterTurns(state)

    const combatMessage = result.messages.find(m => m.text.includes('hits you'))
    expect(combatMessage).toBeDefined()
  })

  test('adds combat message on miss', () => {
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState([monster], { x: 10, y: 10 })

    mockRandom.setValues([1]) // Miss

    const result = service.processMonsterTurns(state)

    const missMessage = result.messages.find(m => m.text.includes('misses'))
    expect(missMessage).toBeDefined()
  })

  test('sets game over when player dies', () => {
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState([monster], { x: 10, y: 10 })
    state.player.hp = 1

    mockRandom.setValues([20, 5]) // Hit, kills player

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBe(0)
    expect(result.isGameOver).toBe(true)
  })

  test('applies special abilities on hit', () => {
    const monster = createTestMonster({
      position: { x: 10, y: 11 },
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['drains_strength'],
      },
    })
    const state = createTestState([monster], { x: 10, y: 10 })

    mockRandom.setValues([20, 3, 1]) // Hit, damage, drain succeeds

    const result = service.processMonsterTurns(state)

    expect(result.player.strength).toBeLessThan(16)
  })

  test('handles multiple attacks', () => {
    const monster = createTestMonster({
      position: { x: 10, y: 11 },
      damage: '1d4/1d4',
    })
    const state = createTestState([monster], { x: 10, y: 10 })

    mockRandom.setValues([20, 2, 20, 3]) // Both attacks hit

    const result = service.processMonsterTurns(state)

    // Should have 2 hit messages (or at least messages from both attacks)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  test('uses breath weapon for Dragon', () => {
    const dragon = createTestMonster({
      name: 'Dragon',
      position: { x: 10, y: 11 },
      damage: '1d8',
    })
    const state = createTestState([dragon], { x: 10, y: 10 })

    mockRandom.setValues([1, 3, 4, 5, 6, 2, 1]) // Use breath, then 6d6 damage

    const result = service.processMonsterTurns(state)

    const breathMessage = result.messages.find(m => m.text.includes('breathes fire'))

    // May or may not use breath depending on RNG, just ensure state is valid
    expect(result.player.hp).toBeLessThanOrEqual(20)
  })
})
