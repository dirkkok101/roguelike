import { MonsterTurnService } from './MonsterTurnService'
import { MonsterAIService } from '@services/MonsterAIService'
import { CombatService } from '@services/CombatService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { GameState, Monster, MonsterBehavior, Item } from '@game/core/core'

describe('MonsterTurnService - Theft Mechanics', () => {
  let service: MonsterTurnService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    const pathfinding = new PathfindingService(levelService)
    const fovService = new FOVService(statusEffectService)
    const messageService = new MessageService()
    const ringService = new RingService(mockRandom)
    const hungerService = new HungerService(mockRandom, ringService)
    const turnService = new TurnService(statusEffectService, levelService)

    const aiService = new MonsterAIService(pathfinding, mockRandom, fovService, levelService)
    const combatService = new CombatService(mockRandom, ringService, hungerService)
    const abilityService = new SpecialAbilityService(mockRandom)

    service = new MonsterTurnService(mockRandom, aiService, combatService, abilityService, messageService, turnService)
  })

  function createTestState(monsters: Monster[] = []): GameState {
    const potion: Item = {
      id: 'potion-1',
      name: 'Potion',
      type: 'POTION',
      identified: false,
    }

    return {
      player: {
        position: { x: 10, y: 10 },
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 100,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [potion],
      },
      levels: new Map([[1, {
        depth: 1,
        width: 20,
        height: 20,
        tiles: Array(20).fill(null).map(() =>
          Array(20).fill(null).map(() => ({
            type: 'FLOOR' as const,
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
        ),
        rooms: [],
        monsters,
        items: [],
        gold: [],
        traps: [],
        doors: [],
        upStairs: null,
        downStairs: null,
      }]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  test('Leprechaun steals gold when adjacent', () => {
    const leprechaun: Monster = {
      id: 'leprechaun',
      letter: 'L',
      name: 'Leprechaun',
      position: { x: 10, y: 11 },
      hp: 8,
      maxHp: 8,
      ac: 8,
      damage: '1d4',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
      energy: 100,
      isInvisible: false,
      level: 1,
    }

    const state = createTestState([leprechaun])

    mockRandom.setValues([25]) // Amount stolen

    const result = service.processMonsterTurns(state)

    expect(result.player.gold).toBeLessThan(100)

    const stealMessage = result.messages.find(m => m.text.includes('steals') && m.text.includes('gold'))
    expect(stealMessage).toBeDefined()
  })

  test('Nymph steals item when adjacent', () => {
    const nymph: Monster = {
      id: 'nymph',
      letter: 'N',
      name: 'Nymph',
      position: { x: 10, y: 11 },
      hp: 10,
      maxHp: 10,
      ac: 9,
      damage: '0d0',
      xpValue: 20,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 7,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
      energy: 100,
      isInvisible: false,
      level: 1,
    }

    const state = createTestState([nymph])

    mockRandom.setValues([0]) // Select first item

    const result = service.processMonsterTurns(state)

    expect(result.player.inventory.length).toBe(0)

    const stealMessage = result.messages.find(m => m.text.includes('steals') && m.text.includes('Potion'))
    expect(stealMessage).toBeDefined()
  })

  test('thief transitions to FLEEING after stealing', () => {
    const leprechaun: Monster = {
      id: 'leprechaun',
      letter: 'L',
      name: 'Leprechaun',
      position: { x: 10, y: 11 },
      hp: 8,
      maxHp: 8,
      ac: 8,
      damage: '1d4',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
      energy: 100,
      isInvisible: false,
      level: 1,
    }

    const state = createTestState([leprechaun])

    mockRandom.setValues([25])

    const result = service.processMonsterTurns(state)

    const level = result.levels.get(1)!
    const thief = level.monsters.find(m => m.name === 'Leprechaun')

    expect(thief?.hasStolen).toBe(true)
    expect(thief?.state).toBe('FLEEING')
  })

  test('Leprechaun does not steal when player has no gold', () => {
    const leprechaun: Monster = {
      id: 'leprechaun',
      letter: 'L',
      name: 'Leprechaun',
      position: { x: 10, y: 11 },
      hp: 8,
      maxHp: 8,
      ac: 8,
      damage: '1d4',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
      energy: 100,
      isInvisible: false,
      level: 1,
    }

    const state = createTestState([leprechaun])
    state.player.gold = 0

    const result = service.processMonsterTurns(state)

    expect(result.player.gold).toBe(0)

    const level = result.levels.get(1)!
    const thief = level.monsters.find(m => m.name === 'Leprechaun')

    expect(thief?.hasStolen).toBe(true)
  })

  test('Nymph does not steal when player has no items', () => {
    const nymph: Monster = {
      id: 'nymph',
      letter: 'N',
      name: 'Nymph',
      position: { x: 10, y: 11 },
      hp: 10,
      maxHp: 10,
      ac: 9,
      damage: '0d0',
      xpValue: 20,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 7,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
      energy: 100,
      isInvisible: false,
      level: 1,
    }

    const state = createTestState([nymph])
    state.player.inventory = []

    const result = service.processMonsterTurns(state)

    expect(result.player.inventory).toHaveLength(0)

    const level = result.levels.get(1)!
    const thief = level.monsters.find(m => m.name === 'Nymph')

    expect(thief?.hasStolen).toBe(true)
  })
})
