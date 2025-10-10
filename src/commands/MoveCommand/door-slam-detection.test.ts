import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { NotificationService } from '@services/NotificationService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'
import { MockRandom } from '@services/RandomService'
import { StatusEffectService } from '@services/StatusEffectService'
import { RingService } from '@services/RingService'
import { LevelService } from '@services/LevelService'
import { IdentificationService } from '@services/IdentificationService'
import { MonsterAIService } from '@services/MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { FOVService } from '@services/FOVService'
import {
  GameState,
  Level,
  TileType,
  Door,
  DoorState,
  Position,
  ItemType,
  Torch,
  Monster,
  MonsterBehavior,
  MonsterState,
} from '@game/core/core'

describe('MoveCommand - Door Slam Detection', () => {
  let mockRandom: MockRandom
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let hungerService: HungerService
  let regenerationService: RegenerationService
  let notificationService: NotificationService
  let turnService: TurnService
  let goldService: GoldService
  let monsterAIService: MonsterAIService

  beforeEach(() => {
    mockRandom = new MockRandom()
    const statusEffectService = new StatusEffectService()
    const ringService = new RingService(mockRandom)
    const levelService = new LevelService()
    const identificationService = new IdentificationService(mockRandom)
    const pathfindingService = new PathfindingService(levelService)

    movementService = new MovementService(mockRandom, statusEffectService)
    lightingService = new LightingService(mockRandom)
    fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    combatService = new CombatService(mockRandom, ringService, hungerService, undefined)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    hungerService = new HungerService(mockRandom, ringService, undefined)
    regenerationService = new RegenerationService(ringService)
    notificationService = new NotificationService(identificationService)
    turnService = new TurnService(statusEffectService, levelService, ringService, undefined, messageService)
    goldService = new GoldService(mockRandom)
    monsterAIService = new MonsterAIService(pathfindingService, mockRandom, fovService, levelService)
  })

  function createLevel(doors: Door[]): Level {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ffffff',
            colorExplored: '#888888',
          }))
      )

    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [
        { id: 1, x: 2, y: 2, width: 5, height: 5 },
        { id: 2, x: 10, y: 10, width: 5, height: 5 },
      ],
      doors,
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 10, y: 10 },
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createGameState(
    playerPosition: Position,
    positionHistory: Position[],
    level: Level
  ): GameState {
    const torch: Torch = {
      id: 'test-torch',
      name: 'Torch',
      type: ItemType.TORCH,
      identified: true,
      position: playerPosition,
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false,
    }

    return {
      player: {
        position: playerPosition,
        hp: 20,
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
          lightSource: torch,
        },
        inventory: [],
        statusEffects: [],
        energy: 0,
        isRunning: false,
      },
      levels: new Map([[1, level]]),
      currentLevel: 1,
      visibleCells: new Set(),
      messages: [],
      turnCount: 10,
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
      positionHistory,
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }
  }

  function createSleepingMonster(position: Position, roomId: number): Monster {
    return {
      id: `monster-room-${roomId}`,
      letter: 'O',
      name: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      level: 2,
      speed: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 5,
        fleeThreshold: 0.25,
        chaseChance: 1.0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      energy: 0,
      isInvisible: false,
      statusEffects: [],
    }
  }

  describe('door slam pattern detection', () => {
    test('detects door slam: wakes sleeping monsters in connected rooms', () => {
      const doorPos: Position = { x: 5, y: 5 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1], // Connects room 0 and room 1
      }

      // Create monster in room 0 (id=1 based on room order)
      const monster = createSleepingMonster({ x: 4, y: 4 }, 1)
      const level = createLevel([door])
      level.monsters = [monster]

      // Position history: door → left
      const positionHistory: Position[] = [
        { x: 5, y: 5 }, // N-2: at door
        { x: 4, y: 5 }, // N-1: moved left
      ]

      const currentPos: Position = { x: 4, y: 5 }
      const state = createGameState(currentPos, positionHistory, level)

      // Move right back to door (slam!)
      const moveCommand = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService,
        monsterAIService // Pass monster AI service
      )

      const result = moveCommand.execute(state)

      // Check that wake message was generated
      const wakeMessage = result.messages.find((msg) =>
        msg.text.includes('Your loud entrance wakes the monsters!')
      )
      expect(wakeMessage).toBeDefined()
      expect(wakeMessage?.type).toBe('warning')

      // Check that monster in room 1 was woken
      const resultLevel = result.levels.get(1)
      expect(resultLevel).toBeDefined()
      const wokeMonster = resultLevel!.monsters.find((m) => m.id === 'monster-room-1')
      expect(wokeMonster).toBeDefined()
      expect(wokeMonster!.isAsleep).toBe(false)
      expect(wokeMonster!.state).toBe(MonsterState.HUNTING)
    })

    test('no slam: player returns to non-doorway position', () => {
      const level = createLevel([]) // No doors

      const positionHistory: Position[] = [
        { x: 5, y: 5 }, // N-2: regular floor
        { x: 4, y: 5 }, // N-1: moved left
      ]

      const state = createGameState({ x: 5, y: 5 }, positionHistory, level)
      const consoleSpy = jest.spyOn(console, 'log')

      const moveCommand = new MoveCommand(
        'up',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService
      )

      moveCommand.execute(state)

      // No door slam (not a doorway)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[DOOR SLAM] Player returned to doorway - monsters should wake!'
      )

      consoleSpy.mockRestore()
    })

    test('no slam: player did not return to same position', () => {
      const door: Door = {
        position: { x: 5, y: 5 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }
      const level = createLevel([door])

      const positionHistory: Position[] = [
        { x: 3, y: 3 }, // N-2: different position
        { x: 4, y: 4 }, // N-1: moved
      ]

      const state = createGameState({ x: 5, y: 5 }, positionHistory, level)
      const consoleSpy = jest.spyOn(console, 'log')

      const moveCommand = new MoveCommand(
        'down',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService
      )

      moveCommand.execute(state)

      // No door slam (didn't return to same position)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[DOOR SLAM] Player returned to doorway - monsters should wake!'
      )

      consoleSpy.mockRestore()
    })

    test('no slam: insufficient position history (< 3 positions)', () => {
      const door: Door = {
        position: { x: 5, y: 5 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }
      const level = createLevel([door])

      // Only 2 positions in history (need 3 for pattern detection)
      const positionHistory: Position[] = [
        { x: 4, y: 5 }, // N-1: previous position
      ]

      const state = createGameState({ x: 5, y: 5 }, positionHistory, level)
      const consoleSpy = jest.spyOn(console, 'log')

      const moveCommand = new MoveCommand(
        'left',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService
      )

      moveCommand.execute(state)

      // No door slam (insufficient history)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[DOOR SLAM] Player returned to doorway - monsters should wake!'
      )

      consoleSpy.mockRestore()
    })

    test('position history is updated correctly (keeps last 3 positions)', () => {
      const level = createLevel([])
      const state = createGameState({ x: 5, y: 5 }, [], level)

      const moveCommand = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService
      )

      const result = moveCommand.execute(state)

      // After 1 move, history should have 1 position
      expect(result.positionHistory).toHaveLength(1)
      expect(result.positionHistory[0]).toEqual({ x: 6, y: 5 })
    })

    test('position history maintains max length of 3', () => {
      const level = createLevel([])

      // Start with 3 positions already in history
      const positionHistory: Position[] = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ]

      const state = createGameState({ x: 3, y: 3 }, positionHistory, level)

      const moveCommand = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService,
        combatService,
        levelingService,
        doorService,
        hungerService,
        regenerationService,
        notificationService,
        turnService,
        goldService
      )

      const result = moveCommand.execute(state)

      // History should still be length 3, oldest position removed
      expect(result.positionHistory).toHaveLength(3)
      expect(result.positionHistory[0]).toEqual({ x: 2, y: 2 }) // Oldest is now position 2
      expect(result.positionHistory[1]).toEqual({ x: 3, y: 3 })
      expect(result.positionHistory[2]).toEqual({ x: 4, y: 3 }) // New position
    })
  })
})
