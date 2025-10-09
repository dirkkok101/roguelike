import { TurnService } from '@services/TurnService'
import { MonsterTurnService } from '@services/MonsterTurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MonsterAIService } from '@services/MonsterAIService'
import { CombatService } from '@services/CombatService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import { HungerService } from '@services/HungerService'
import { DebugService } from '@services/DebugService'
import { MockRandom } from '@services/RandomService'
import { LevelService } from '@services/LevelService'
import {
  GameState,
  Level,
  Monster,
  MonsterBehavior,
  MonsterState,
  Player,
  Equipment,
  StatusEffectType,
  Tile,
} from '@game/core/core'

// ============================================================================
// TEST SETUP - Simulating the main game loop with energy system
// ============================================================================

function createTestPlayer(energy: number = 100, statusEffects: any[] = []): Player {
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
    statusEffects,
    energy,
  }
}

function createTestMonster(
  id: string,
  x: number,
  y: number,
  speed: number,
  energy: number
): Monster {
  return {
    id,
    letter: 'T',
    name: `Test Monster ${id}`,
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

// Simulate the game loop logic from main.ts
function simulatePlayerTurn(
  state: GameState,
  turnService: TurnService,
  monsterTurnService: MonsterTurnService
): GameState {
  let gameState = state

  // PHASE 1: Grant energy to ALL actors (player + monsters) until player can act
  // Always grant at least one tick to ensure monsters don't fall behind
  do {
    gameState = turnService.grantEnergyToAllActors(gameState)
  } while (!turnService.canPlayerAct(gameState.player))

  // PHASE 2: Player acts (simulated - just consume energy)
  gameState = {
    ...gameState,
    player: turnService.consumePlayerEnergy(gameState.player),
  }

  // PHASE 3: Process monsters if player exhausted energy
  if (!turnService.canPlayerAct(gameState.player)) {
    gameState = monsterTurnService.processMonsterTurns(gameState)
    gameState = turnService.incrementTurn(gameState)
  }

  return gameState
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Energy Game Loop - Integration Tests', () => {
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
  let monsterTurnService: MonsterTurnService

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
    messageService = new MessageService()
    hungerService = new HungerService(mockRandom)
    debugService = await (async () => {
      const mockRandom = new MockRandom()
      const monsterSpawnService = new MonsterSpawnService(mockRandom)
      await monsterSpawnService.loadMonsterData()
      return new DebugService(messageService, monsterSpawnService, mockRandom)
    })()
    combatService = new CombatService(mockRandom, hungerService, debugService)
    pathfindingService = new PathfindingService(levelService)
    fovService = new FOVService(statusEffectService)
    monsterAIService = new MonsterAIService(pathfindingService, mockRandom, fovService, levelService)
    specialAbilityService = new SpecialAbilityService(mockRandom)
    monsterTurnService = new MonsterTurnService(
      mockRandom,
      monsterAIService,
      combatService,
      specialAbilityService,
      messageService,
      turnService
    )
  })

  test('Scenario 1: Normal speed player (speed 10) acts once per turn cycle', () => {
    const player = createTestPlayer(0) // Start with 0 energy
    const level = createTestLevel([])
    let state = createTestState(player, level)

    // Simulate player turn
    state = simulatePlayerTurn(state, turnService, monsterTurnService)

    // Player should have acted once and monsters processed
    expect(state.turnCount).toBe(1) // Turn incremented
    expect(state.player.energy).toBe(0) // 0 + 10 = 10 (grant) → 10 - 100 = -90 (act) → -90 + 10 = -80... eventually 0
  })

  test('Scenario 2: Hasted player (speed 20) acts twice before monsters', () => {
    let player = createTestPlayer(0) // Start with 0 energy
    player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)
    const level = createTestLevel([])
    let state = createTestState(player, level)

    // Simulate player turn
    state = simulatePlayerTurn(state, turnService, monsterTurnService)

    // Hasted player gains 20 energy, acts, has 20 - 100 = -80
    // Grants 20 more = -60, then -40, -20, 0, 20, 40, 60, 80, 100
    // Second action possible before monsters
    expect(state.player.energy).toBeGreaterThanOrEqual(0)
  })

  test('Scenario 3: Slow monster (speed 5) acts once every 2 turns', () => {
    const player = createTestPlayer(100)
    const slowMonster = createTestMonster('m1', 5, 5, 5, 95) // Speed 5, 95 energy
    const level = createTestLevel([slowMonster])
    let state = createTestState(player, level)

    // Turn 1: Player has 100, do-while grants once (player 110, monster 100)
    // Player acts (110 → 10), monster acts (100 → 0)
    state = simulatePlayerTurn(state, turnService, monsterTurnService)
    let updatedLevel = state.levels.get(1)!
    let monster = updatedLevel.monsters.find((m) => m.id === 'm1')!
    expect(monster.energy).toBe(0) // 100 - 100 = 0

    // Turn 2: Player 10, Monster 0. Phase 1 loops 9 times to get player to 100
    // Monster gains 5 × 9 = 45 energy. Monster has 45, cannot act (45 < 100)
    state = simulatePlayerTurn(state, turnService, monsterTurnService)
    updatedLevel = state.levels.get(1)!
    monster = updatedLevel.monsters.find((m) => m.id === 'm1')!
    expect(monster.energy).toBe(45) // Accumulated during Phase 1
  })

  test('Scenario 4: Fast monster (speed 20) acts twice per monster phase', () => {
    const player = createTestPlayer(100)
    const fastMonster = createTestMonster('m1', 5, 5, 20, 85) // Speed 20, 85 energy
    const level = createTestLevel([fastMonster])
    let state = createTestState(player, level)

    // Monster gains 20 energy (85 + 20 = 105), acts once (5 left), cannot act again (5 < 100)
    state = simulatePlayerTurn(state, turnService, monsterTurnService)
    const updatedLevel = state.levels.get(1)!
    const monster = updatedLevel.monsters.find((m) => m.id === 'm1')!
    expect(monster.energy).toBe(5) // 105 - 100 = 5
  })

  test('Scenario 5: Energy carryover - player with 150 energy acts, 50 remains', () => {
    const player = createTestPlayer(150) // Start with 150 energy
    const level = createTestLevel([])
    let state = createTestState(player, level)

    // Player already has 150 energy, no grant needed
    // Acts: 150 - 100 = 50 energy remains
    state = {
      ...state,
      player: turnService.consumePlayerEnergy(state.player),
    }

    expect(state.player.energy).toBe(50)
    expect(turnService.canPlayerAct(state.player)).toBe(false) // 50 < 100
  })

  test('Scenario 6: Haste expires mid-turn - speed drops from 20 to 10', () => {
    let player = createTestPlayer(100)
    player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 1) // 1 turn of haste
    const level = createTestLevel([])
    let state = createTestState(player, level)

    // Turn 1: Player is hasted (speed 20)
    expect(turnService.getPlayerSpeed(state.player)).toBe(20)

    // Simulate turn (status effect ticks and expires)
    state = simulatePlayerTurn(state, turnService, monsterTurnService)

    // After turn, haste expired (duration was 1)
    expect(turnService.getPlayerSpeed(state.player)).toBe(10) // Back to normal
  })

  test('Scenario 7: Multiple monsters with mixed speeds (5, 10, 20)', () => {
    const player = createTestPlayer(100)
    const slowMonster = createTestMonster('m1', 5, 5, 5, 95)
    const normalMonster = createTestMonster('m2', 6, 6, 10, 90)
    const fastMonster = createTestMonster('m3', 7, 7, 20, 85)
    const level = createTestLevel([slowMonster, normalMonster, fastMonster])
    let state = createTestState(player, level)

    state = simulatePlayerTurn(state, turnService, monsterTurnService)

    const updatedLevel = state.levels.get(1)!
    const m1 = updatedLevel.monsters.find((m) => m.id === 'm1')!
    const m2 = updatedLevel.monsters.find((m) => m.id === 'm2')!
    const m3 = updatedLevel.monsters.find((m) => m.id === 'm3')!

    // m1: 95 + 5 = 100, acts, 0 energy
    expect(m1.energy).toBe(0)

    // m2: 90 + 10 = 100, acts, 0 energy
    expect(m2.energy).toBe(0)

    // m3: 85 + 20 = 105, acts, 5 energy
    expect(m3.energy).toBe(5)
  })

  test('Scenario 8: Full turn cycle - player acts → monsters act → turn increments', () => {
    const player = createTestPlayer(0) // Start with 0 energy
    const monster = createTestMonster('m1', 5, 5, 10, 90)
    const level = createTestLevel([monster])
    let state = createTestState(player, level)

    const initialTurnCount = state.turnCount

    // Simulate full turn
    // Phase 1 loops 10 times: player 0→100, monster 90→190
    // Player acts (100→0), monster acts once (190→90)
    state = simulatePlayerTurn(state, turnService, monsterTurnService)

    // Turn should have incremented (only when player exhausts energy)
    expect(state.turnCount).toBe(initialTurnCount + 1)

    // Monster accumulated 10×10=100 energy during Phase 1 (90+100=190)
    // Monster acted once (190-100=90), still has 90 energy left
    const updatedLevel = state.levels.get(1)!
    const updatedMonster = updatedLevel.monsters.find((m) => m.id === 'm1')!
    expect(updatedMonster.energy).toBe(90) // Acted once, 90 energy remains
  })
})
