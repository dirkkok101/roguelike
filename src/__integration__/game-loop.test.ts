import { GameState, Monster, Level, Player } from '@game/core/core'
import { MoveCommand } from '@commands/MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { LevelingService } from '@services/LevelingService'
import { MonsterTurnService } from '@services/MonsterTurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { RegenerationService } from '@services/RegenerationService'
import { MonsterAIService } from '@services/MonsterAIService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { PathfindingService } from '@services/PathfindingService'
import { DoorService } from '@services/DoorService'
import { NotificationService } from '@services/NotificationService'
import { IdentificationService } from '@services/IdentificationService'
import { TurnService } from '@services/TurnService'
import { SeededRandom } from '@services/RandomService'
import { LevelService } from '@services/LevelService'
import { createTestTorch } from '../test-utils'

/**
 * Integration test: Game Loop
 *
 * Purpose: Validates the complete turn sequence works correctly:
 * 1. Player executes command (MoveCommand)
 * 2. Monsters take turns (MonsterTurnService.processMonsterTurns)
 * 3. Turn counter increments
 * 4. State updates correctly
 *
 * This test simulates the actual game loop from main.ts:
 *   gameState = command.execute(gameState)
 *   gameState = monsterTurnService.processMonsterTurns(gameState)
 */
describe('Integration: Game Loop', () => {
  let services: {
    random: SeededRandom
    movement: MovementService
    lighting: LightingService
    fov: FOVService
    message: MessageService
    combat: CombatService
    hunger: HungerService
    leveling: LevelingService
    door: DoorService
    notification: NotificationService
    regeneration: RegenerationService
    turn: TurnService
    pathfinding: PathfindingService
    ai: MonsterAIService
    ability: SpecialAbilityService
    monsterTurn: MonsterTurnService
  }

  beforeEach(() => {
    const random = new SeededRandom('test-game-loop')
    const statusEffectService = new StatusEffectService()
    const movement = new MovementService(random, statusEffectService)
    const lighting = new LightingService(random)
    const fov = new FOVService(statusEffectService)
    const message = new MessageService()
    const ringService = new RingService(random)
    const hunger = new HungerService(random, ringService)
    const combat = new CombatService(random, ringService, hunger)
    const leveling = new LevelingService(random)
    const door = new DoorService()
    const identificationService = new IdentificationService(random)
    const notification = new NotificationService(identificationService)
    const regeneration = new RegenerationService(ringService)
    const levelService = new LevelService()
    const turn = new TurnService(statusEffectService, levelService)
    const pathfinding = new PathfindingService(levelService)
    const ai = new MonsterAIService(pathfinding, random, fov, levelService)
    const ability = new SpecialAbilityService(random)
    const monsterTurn = new MonsterTurnService(random, ai, combat, ability, message, turn)

    services = {
      random,
      movement,
      lighting,
      fov,
      message,
      combat,
      hunger,
      leveling,
      door,
      notification,
      regeneration,
      turn,
      pathfinding,
      ai,
      ability,
      monsterTurn,
    }
  })

  function createTestLevel(): Level {
    // Create a simple 20x20 level with a room
    // Important: Create unique tile objects, not shared references!
    const tiles = Array(20).fill(null).map(() =>
      Array(20).fill(null).map(() => ({
        type: 'WALL' as const,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A'
      }))
    )

    // Carve out a room (5,5) to (15,15)
    for (let y = 5; y <= 15; y++) {
      for (let x = 5; x <= 15; x++) {
        tiles[y][x] = {
          type: 'FLOOR' as const,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#A89078',
          colorExplored: '#5A5A5A'
        }
      }
    }

    return {
      depth: 1,
      tiles,
      rooms: [{ x: 5, y: 5, width: 11, height: 11 }],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      traps: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20).fill(null).map(() => Array(20).fill(false)),
      width: 20,
      height: 20,
    }
  }

  function createTestPlayer(position: { x: number; y: number }): Player {
    return {
      position,
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
        lightSource: createTestTorch(),
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
    }
  }

  function createTestMonster(position: { x: number; y: number }): Monster {
    return {
      id: `monster-${position.x}-${position.y}`,
      letter: 'O',
      name: 'Orc',
      position,
      hp: 15,
      maxHp: 15,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      aiProfile: {
        behavior: 'SIMPLE',
        aggroRange: 5,
        fleeThreshold: 0,
        intelligence: 1,
        special: [],
      },
      state: 'SLEEPING',
      isAsleep: true,
      isAwake: false,
      hasStolen: false,
      level: 1,
      speed: 10,
      energy: 100,
      isInvisible: false,
      visibleCells: new Set(),
      currentPath: null,
    }
  }

  function createTestState(playerPos: { x: number; y: number }, monsterPos?: { x: number; y: number }): GameState {
    const level = createTestLevel()
    const player = createTestPlayer(playerPos)

    if (monsterPos) {
      level.monsters.push(createTestMonster(monsterPos))
    }

    // Compute initial FOV
    const lightRadius = services.lighting.getLightRadius(player.equipment.lightSource)
    const visibleCells = services.fov.computeFOV(player.position, lightRadius, level)

    return {
      player,
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells,
      messages: [{ text: 'Test game started', type: 'info', turn: 0 }],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {},
      identifiedItems: new Set(),
      debug: {
        isEnabled: false,
        godMode: false,
        revealMap: false,
        fovDebug: false,
        pathDebug: false,
        aiDebug: false,
      },
    }
  }

  describe('Complete Turn Sequence', () => {
    test('player move increments turn counter', () => {
      const state = createTestState({ x: 10, y: 10 })
      expect(state.turnCount).toBe(0)

      // Execute player command
      const moveCommand = new MoveCommand(
        'right',
        services.movement,
        services.lighting,
        services.fov,
        services.message,
        services.combat,
        services.leveling,
        services.door,
        services.hunger,
        services.regeneration,
        services.notification,
        services.turn
      )

      const newState = moveCommand.execute(state)

      expect(newState.turnCount).toBe(1)
      expect(newState.player.position.x).toBe(11)
      expect(newState.player.position.y).toBe(10)
    })

    test('full turn sequence: player move → monster turns → state updates', () => {
      // Start with player at (10, 10) and sleeping monster at (12, 10)
      const state = createTestState({ x: 10, y: 10 }, { x: 12, y: 10 })

      expect(state.turnCount).toBe(0)
      expect(state.player.position.x).toBe(10)

      const level = state.levels.get(1)!
      expect(level.monsters[0].isAsleep).toBe(true)
      expect(level.monsters[0].state).toBe('SLEEPING')

      // STEP 1: Player moves right (closer to monster)
      const moveCommand = new MoveCommand(
        'right',
        services.movement,
        services.lighting,
        services.fov,
        services.message,
        services.combat,
        services.leveling,
        services.door,
        services.hunger,
        services.regeneration,
        services.notification,
        services.turn
      )

      let newState = moveCommand.execute(state)

      // Verify player moved
      expect(newState.player.position.x).toBe(11)
      expect(newState.turnCount).toBe(1)

      // STEP 2: Monster turns (should wake up since player is close)
      newState = services.monsterTurn.processMonsterTurns(newState)

      // Verify state is consistent
      expect(newState.turnCount).toBe(1) // Monster turns don't increment global counter
      expect(newState.player.position.x).toBe(11) // Player position unchanged

      // Monster should have woken up and potentially moved
      const updatedLevel = newState.levels.get(1)!
      const monster = updatedLevel.monsters[0]

      // Monster should wake up when player gets close (within aggro range)
      expect(monster.isAsleep).toBe(false)
      expect(monster.state).toBe('HUNTING')
    })

    test('monster AI activates and pursues player', () => {
      // Player far from monster initially
      const state = createTestState({ x: 10, y: 10 }, { x: 13, y: 10 })

      const level = state.levels.get(1)!
      const monster = level.monsters[0]

      // Initially sleeping
      expect(monster.isAsleep).toBe(true)
      expect(monster.position.x).toBe(13)

      // Move player right to get closer
      const moveRight = new MoveCommand(
        'right',
        services.movement,
        services.lighting,
        services.fov,
        services.message,
        services.combat,
        services.leveling,
        services.door,
        services.hunger,
        services.regeneration,
        services.notification,
        services.turn
      )

      // Execute first right move
      let currentState = state
      currentState = moveRight.execute(currentState)
      currentState = services.monsterTurn.processMonsterTurns(currentState)
      expect(currentState.player.position.x).toBe(11)

      // Execute second right move
      // Monster should wake up and move towards player, potentially blocking the path
      currentState = moveRight.execute(currentState)
      currentState = services.monsterTurn.processMonsterTurns(currentState)

      // Player may not move if monster blocks the position (combat occurs instead)
      // The important thing is that the monster woke up and is now hunting
      const updatedLevel = currentState.levels.get(1)!
      expect(updatedLevel.monsters.length).toBeGreaterThan(0)
      const updatedMonster = updatedLevel.monsters[0]

      // Verify monster woke up and is hunting
      expect(updatedMonster.isAsleep).toBe(false)
      expect(updatedMonster.state).toBe('HUNTING')

      // Monster should have moved towards player (from 13 to closer position)
      expect(updatedMonster.position.x).toBeLessThan(13)
    })

    test('hunger depletes each turn', () => {
      const state = createTestState({ x: 10, y: 10 })

      const initialHunger = state.player.hunger
      expect(initialHunger).toBe(1300)

      // Execute 4 turns (alternating right/left to stay in room)
      let currentState = state
      const directions: Array<'right' | 'left' | 'down' | 'up'> = ['right', 'down', 'left', 'up']

      for (let i = 0; i < 4; i++) {
        const moveCommand = new MoveCommand(
          directions[i],
          services.movement,
          services.lighting,
          services.fov,
          services.message,
          services.combat,
          services.leveling,
          services.door,
          services.hunger,
        services.regeneration,
          services.notification,
          services.turn
        )
        currentState = moveCommand.execute(currentState)
        currentState = services.monsterTurn.processMonsterTurns(currentState)
      }

      // Hunger should have decreased (base rate -1/turn)
      expect(currentState.player.hunger).toBeLessThan(initialHunger)
      expect(currentState.player.hunger).toBe(initialHunger - 4)
      expect(currentState.turnCount).toBe(4)
    })

    test('light fuel depletes each turn', () => {
      const state = createTestState({ x: 10, y: 10 })

      const initialFuel = state.player.equipment.lightSource!.fuel!
      expect(initialFuel).toBe(500)

      // Execute 4 turns (alternating right/left to stay in room)
      let currentState = state
      const directions: Array<'right' | 'left' | 'down' | 'up'> = ['right', 'down', 'left', 'up']

      for (let i = 0; i < 4; i++) {
        const moveCommand = new MoveCommand(
          directions[i],
          services.movement,
          services.lighting,
          services.fov,
          services.message,
          services.combat,
          services.leveling,
          services.door,
          services.hunger,
        services.regeneration,
          services.notification,
          services.turn
        )
        currentState = moveCommand.execute(currentState)
        currentState = services.monsterTurn.processMonsterTurns(currentState)
      }

      // Fuel should have decreased
      expect(currentState.player.equipment.lightSource!.fuel!).toBeLessThan(initialFuel)
      expect(currentState.player.equipment.lightSource!.fuel!).toBe(initialFuel - 4)
    })

    test('FOV updates after movement', () => {
      const state = createTestState({ x: 10, y: 10 })

      const initialVisibleCount = state.visibleCells.size

      // Move player
      const moveCommand = new MoveCommand(
        'right',
        services.movement,
        services.lighting,
        services.fov,
        services.message,
        services.combat,
        services.leveling,
        services.door,
        services.hunger,
        services.regeneration,
        services.notification,
        services.turn
      )

      const newState = moveCommand.execute(state)

      // FOV should be recalculated
      expect(newState.visibleCells).toBeDefined()
      expect(newState.visibleCells.size).toBeGreaterThan(0)

      // Position should be in visible cells
      const newPosKey = `${newState.player.position.x},${newState.player.position.y}`
      expect(newState.visibleCells.has(newPosKey)).toBe(true)
    })
  })

  describe('State Immutability', () => {
    test('game loop preserves state immutability', () => {
      const state = createTestState({ x: 10, y: 10 })

      const originalTurnCount = state.turnCount
      const originalPosition = { ...state.player.position }

      // Execute command
      const moveCommand = new MoveCommand(
        'right',
        services.movement,
        services.lighting,
        services.fov,
        services.message,
        services.combat,
        services.leveling,
        services.door,
        services.hunger,
        services.regeneration,
        services.notification,
        services.turn
      )

      const newState = moveCommand.execute(state)

      // Original state should be unchanged
      expect(state.turnCount).toBe(originalTurnCount)
      expect(state.player.position).toEqual(originalPosition)

      // New state should have changes
      expect(newState.turnCount).toBe(originalTurnCount + 1)
      expect(newState.player.position.x).toBe(originalPosition.x + 1)
    })
  })
})
