import { MonsterTurnService } from './MonsterTurnService'
import { MockRandom } from '@services/RandomService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MonsterAIService } from '@services/MonsterAIService'
import { CombatService } from '@services/CombatService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { DebugService } from '@services/DebugService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import { LevelService } from '@services/LevelService'
import {
  GameState,
  Level,
  Monster,
  MonsterBehavior,
  MonsterState,
  Player,
  Equipment,
  Tile,
} from '@game/core/core'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestPlayer(): Player {
  const equipment: Equipment = {
    weapon: null,
    armor: null,
    leftRing: null,
    rightRing: null,
    lightSource: null,
  }

  return {
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
    equipment,
    inventory: [],
    statusEffects: [],
    energy: 100,
    isRunning: false,
    runState: null,
  }
}

function createTestMonster(id: string, x: number, y: number, speed: number, energy: number): Monster {
  return {
    id,
    letter: 'T',
    name: 'Test Monster',
      spriteName: 'Test Monster',
    position: { x, y },
    hp: 10,
    maxHp: 10,
    ac: 5,
    damage: '1d6',
    xpValue: 10,
    level: 1,
    aiProfile: {
      behavior: MonsterBehavior.SIMPLE,
      intelligence: 1,
      aggroRange: 5,
      fleeThreshold: 0.0,
      special: [],
    },
    isAsleep: false,
    isAwake: true,
    state: MonsterState.WANDERING,
    visibleCells: new Set(),
    currentPath: null,
    hasStolen: false,
    lastKnownPlayerPosition: null,
    turnsWithoutSight: 0,
    energy,
    speed,
  }
}

function createTestLevel(monsters: Monster[]): Level {
  const width = 30
  const height = 20

  const tiles: Tile[][] = Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({
          type: 'FLOOR' as const,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#888',
          colorExplored: '#444',
        }))
    )

  const explored = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false))

  return {
    depth: 1,
    width,
    height,
    tiles,
    rooms: [],
    doors: [],
    traps: [],
    monsters,
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: null,
    explored,
  }
}

function createTestState(player: Player, level: Level): GameState {
  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells: new Set(),
    messages: [],
    turnCount: 0,
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
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('MonsterTurnService - Energy Turn Processing', () => {
  let mockRandom: MockRandom
  let statusEffectService: StatusEffectService
  let turnService: TurnService
  let messageService: MessageService
  let hungerService: HungerService
  let debugService: DebugService
  let combatService: CombatService
  let pathfindingService: PathfindingService
  let fovService: FOVService
  let monsterAIService: MonsterAIService
  let specialAbilityService: SpecialAbilityService
  let service: MonsterTurnService

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
    messageService = new MessageService()
    hungerService = new HungerService(mockRandom)
    debugService = new DebugService(messageService)
    combatService = new CombatService(mockRandom, hungerService, debugService)
    pathfindingService = new PathfindingService(levelService)
    fovService = new FOVService(statusEffectService)
    monsterAIService = new MonsterAIService(pathfindingService, mockRandom, fovService, levelService)
    specialAbilityService = new SpecialAbilityService(mockRandom)
    service = new MonsterTurnService(
      mockRandom,
      monsterAIService,
      combatService,
      specialAbilityService,
      messageService,
      turnService
    )
  })

  test('monster with speed 10 acts once per turn (after energy grant)', () => {
    const monster = createTestMonster('m1', 5, 5, 10, 90) // Start with 90 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 90, gains 10 (speed), has 100, acts once, consumes 100, ends with 0
    expect(updatedMonster.energy).toBe(0)
  })

  test('monster with speed 20 acts twice per turn', () => {
    const monster = createTestMonster('m1', 5, 5, 20, 90) // Start with 90 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 90, gains 20 (speed), has 110
    // Acts once: 110 - 100 = 10
    // Has 10 energy, cannot act again (< 100)
    expect(updatedMonster.energy).toBe(10)
  })

  test('monster with speed 5 does not act if starting with 94 energy', () => {
    const monster = createTestMonster('m1', 5, 5, 5, 94) // Start with 94 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 94, gains 5 (speed), has 99
    // 99 < 100, cannot act
    expect(updatedMonster.energy).toBe(99)
  })

  test('energy carries over between turns', () => {
    const monster = createTestMonster('m1', 5, 5, 10, 95) // Start with 95 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 95, gains 10 (speed), has 105
    // Acts once: 105 - 100 = 5 energy remains
    expect(updatedMonster.energy).toBe(5)
  })

  test('multiple monsters with different speeds process correctly', () => {
    const m1 = createTestMonster('m1', 5, 5, 5, 95) // Slow
    const m2 = createTestMonster('m2', 6, 6, 10, 90) // Normal
    const m3 = createTestMonster('m3', 7, 7, 20, 85) // Fast
    const level = createTestLevel([m1, m2, m3])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedM1 = updatedLevel.monsters.find((m) => m.id === 'm1')!
    const updatedM2 = updatedLevel.monsters.find((m) => m.id === 'm2')!
    const updatedM3 = updatedLevel.monsters.find((m) => m.id === 'm3')!

    // m1: 95 + 5 = 100, acts once, 0 energy
    expect(updatedM1.energy).toBe(0)

    // m2: 90 + 10 = 100, acts once, 0 energy
    expect(updatedM2.energy).toBe(0)

    // m3: 85 + 20 = 105, acts once, 5 energy
    expect(updatedM3.energy).toBe(5)
  })

  test('monster with 150 energy acts once, 50 energy remains', () => {
    const monster = createTestMonster('m1', 5, 5, 10, 140) // Start with 140 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 140, gains 10 (speed), has 150
    // Acts once: 150 - 100 = 50 energy remains
    expect(updatedMonster.energy).toBe(50)
  })

  test('monster with 99 energy does not act', () => {
    const monster = createTestMonster('m1', 5, 5, 10, 89) // Start with 89 energy
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    let state = createTestState(player, level)

    // Grant energy to all actors (simulating Phase 1 of game loop)
    state = turnService.grantEnergyToAllActors(state)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Monster starts with 89, gains 10 (speed), has 99
    // 99 < 100, cannot act
    expect(updatedMonster.energy).toBe(99)
  })

  test('dead monster (hp <= 0) does not process energy', () => {
    const monster = createTestMonster('m1', 5, 5, 10, 90)
    monster.hp = 0 // Dead monster
    const level = createTestLevel([monster])
    const player = createTestPlayer()
    const state = createTestState(player, level)

    const result = service.processMonsterTurns(state)

    const updatedLevel = result.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!

    // Dead monster should not gain energy or process
    expect(updatedMonster.energy).toBe(90) // Unchanged
  })
})
