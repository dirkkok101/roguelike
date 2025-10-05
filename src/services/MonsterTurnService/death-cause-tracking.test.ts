import { MonsterTurnService } from './MonsterTurnService'
import { CombatService } from '@services/CombatService'
import { MonsterAIService } from '@services/MonsterAIService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import { MockRandom } from '@services/RandomService'
import { GameState, Monster, Player, Level, TileType } from '@game/core/core'

describe('MonsterTurnService - Death Cause Tracking', () => {
  let service: MonsterTurnService
  let combatService: CombatService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const messageService = new MessageService()
    const pathfindingService = new PathfindingService()
    const fovService = new FOVService()
    const aiService = new MonsterAIService(pathfindingService, mockRandom, fovService)
    combatService = new CombatService(mockRandom)
    const abilityService = new SpecialAbilityService(mockRandom)

    service = new MonsterTurnService(mockRandom, aiService, combatService, abilityService, messageService)
  })

  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    return {
      position: { x: 10, y: 10 },
      hp: 1, // Low HP for easy kills
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
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      ...overrides,
    }
  }

  function createTestMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      letter: 'T',
      name: 'Troll',
      position: { x: 10, y: 11 },
      hp: 10,
      maxHp: 10,
      damage: '1d8+4',
      ac: 4,
      xpValue: 120,
      aiProfile: {
        behavior: 'SIMPLE' as any,
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

  function createTestLevel(monsters: Monster[]): Level {
    return {
      depth: 1,
      width: 40,
      height: 22,
      tiles: Array(22)
        .fill(null)
        .map(() =>
          Array(40).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#FFFFFF',
            colorExplored: '#888888',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters,
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(22)
        .fill(null)
        .map(() => Array(40).fill(false)),
    }
  }

  function createTestState(
    player: Player,
    monsters: Monster[],
    overrides: Partial<GameState> = {}
  ): GameState {
    const level = createTestLevel(monsters)

    return {
      player,
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 10,
      seed: 'test-seed',
      gameId: 'test-game',
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
      ...overrides,
    }
  }

  test('sets deathCause when player killed by monster', () => {
    const player = createTestPlayer()
    const monster = createTestMonster({ name: 'Zombie', position: { x: 10, y: 11 } })
    const state = createTestState(player, [monster])
    state.player.hp = 1 // Set low HP after state creation

    // Force a hit that kills player
    mockRandom.setValues([20, 8]) // Hit, 8+4=12 damage kills player with 1 HP

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBe(0)
    expect(result.isGameOver).toBe(true)
    expect(result.deathCause).toBe('Killed by Zombie')
  })

  test('sets deathCause for breath weapon kill', () => {
    const player = createTestPlayer()
    const dragon = createTestMonster({
      name: 'Dragon',
      letter: 'D',
      position: { x: 10, y: 11 },
      damage: '3d8',
      aiProfile: {
        behavior: 'SIMPLE' as any,
        intelligence: 1,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['breathes-fire'],
      },
    })
    const state = createTestState(player, [dragon])
    state.player.hp = 1

    // Trigger breath weapon (needs: breathChance, damage1, damage2, damage3 for 3d8)
    mockRandom.setValues([1, 8, 8, 8]) // Breath triggers, 3d8 = 24 damage

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBe(0)
    expect(result.isGameOver).toBe(true)
    expect(result.deathCause).toBe("Killed by Dragon's breath weapon")
  })

  test('does not set deathCause if player survives', () => {
    const player = createTestPlayer({ hp: 10 })
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState(player, [monster])

    mockRandom.setValues([20, 3]) // Hit, minor damage

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBeGreaterThan(0)
    expect(result.isGameOver).toBe(false)
    expect(result.deathCause).toBeUndefined()
  })

  test('preserves existing deathCause if already set', () => {
    const player = createTestPlayer({ hp: 10 })
    const monster = createTestMonster({ position: { x: 10, y: 11 } })
    const state = createTestState(player, [monster], {
      deathCause: 'Existing cause',
    })

    mockRandom.setValues([5]) // Miss

    const result = service.processMonsterTurns(state)

    expect(result.deathCause).toBe('Existing cause')
  })

  test('tracks correct monster when multiple monsters present', () => {
    const player = createTestPlayer()
    const troll = createTestMonster({ name: 'Troll', position: { x: 10, y: 11 } })
    const zombie = createTestMonster({ name: 'Zombie', position: { x: 10, y: 9 } })
    const state = createTestState(player, [troll, zombie])
    state.player.hp = 1

    // Troll misses, Zombie hits and kills
    mockRandom.setValues([5, 20, 8]) // Troll miss, Zombie hit, damage

    const result = service.processMonsterTurns(state)

    expect(result.isGameOver).toBe(true)
    expect(result.deathCause).toBe('Killed by Zombie')
  })

  test('stops processing monsters after player dies', () => {
    const player = createTestPlayer()
    const firstMonster = createTestMonster({ name: 'Killer', position: { x: 10, y: 11 } })
    const secondMonster = createTestMonster({ name: 'NotReached', position: { x: 10, y: 9 } })
    const state = createTestState(player, [firstMonster, secondMonster])
    state.player.hp = 1

    mockRandom.setValues([20, 8]) // First monster hits and kills

    const result = service.processMonsterTurns(state)

    expect(result.deathCause).toBe('Killed by Killer')
    // Second monster should not have attacked (break on death)
  })
})
