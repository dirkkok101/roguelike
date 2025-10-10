import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { GoldService } from '@services/GoldService'
import { NotificationService } from '@services/NotificationService'
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType, DoorState, Door } from '@game/core/core'
import { createTestTorch } from '../../test-utils'

describe('MoveCommand - Door Interaction', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let turnService: TurnService
  let hungerService: HungerService
  let notificationService: NotificationService
  let regenerationService: RegenerationService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let goldService: GoldService
  let ringService: RingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    identificationService = new IdentificationService()
    ringService = new RingService(mockRandom)
    goldService = new GoldService(mockRandom)
    hungerService = new HungerService(mockRandom, ringService)
    movementService = new MovementService(mockRandom, statusEffectService)
    lightingService = new LightingService(mockRandom)
    fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    combatService = new CombatService(mockRandom, ringService, hungerService)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService, ringService)
    notificationService = new NotificationService(identificationService)
    regenerationService = new RegenerationService(ringService)
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
            }))
        ),
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 30,
        maxHp: 30,
        strength: 16,
        maxStrength: 16,
        ac: 4,
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
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
    }
  }

  describe('Auto-open on movement', () => {
    test('should open CLOSED door and move through it', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Place a CLOSED door at (5, 6)
      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Player should have moved through the door
      expect(newState.player.position).toEqual({ x: 5, y: 6 })
    })

    test('should update door state from CLOSED to OPEN', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)
      const newLevel = newState.levels.get(1)!
      const updatedDoor = newLevel.doors.find(
        (d) => d.position.x === 5 && d.position.y === 6
      )

      expect(updatedDoor?.state).toBe(DoorState.OPEN)
    })

    test('should update tile walkable and transparent flags', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)
      const newLevel = newState.levels.get(1)!
      const tile = newLevel.tiles[6][5]

      expect(tile.walkable).toBe(true)
      expect(tile.transparent).toBe(true)
      expect(tile.char).toBe("'")
    })

    test('should show "open and move through" message', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      const lastMessage = newState.messages[newState.messages.length - 1]
      expect(lastMessage.text).toBe('You open the door.')
    })

    test('should consume turn when opening and moving', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(1)
    })

    test('should update FOV after moving through door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // FOV should be updated (visibleCells should be populated)
      expect(newState.visibleCells.size).toBeGreaterThan(0)
    })

    test('should tick light fuel when moving through door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const originalFuel = state.player.equipment.lightSource?.fuel

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      expect(newState.player.equipment.lightSource?.fuel).toBe(originalFuel! - 1)
    })
  })

  describe('LOCKED door handling', () => {
    test('should block movement into LOCKED door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.LOCKED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Player should not have moved
      expect(newState.player.position).toEqual({ x: 5, y: 5 })
    })

    test('should show "door is locked" message', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.LOCKED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      const lastMessage = newState.messages[newState.messages.length - 1]
      expect(lastMessage.text).toBe('The door is locked.')
      expect(lastMessage.type).toBe('warning')
    })

    test('should not consume turn when blocked by locked door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.LOCKED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(0)
    })

    test('should not open LOCKED door without key', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.LOCKED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)
      const newLevel = newState.levels.get(1)!
      const doorAfter = newLevel.doors.find((d) => d.position.x === 5 && d.position.y === 6)

      // Door should still be LOCKED
      expect(doorAfter?.state).toBe(DoorState.LOCKED)
    })
  })

  describe('OPEN door handling', () => {
    test('should walk through OPEN door normally', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: "'",
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Player should have moved through
      expect(newState.player.position).toEqual({ x: 5, y: 6 })
    })

    test('should not show door-related message for OPEN door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: "'",
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Should not have a door opening message
      const lastMessage = newState.messages[newState.messages.length - 1]
      expect(lastMessage?.text).not.toBe('You open the door.')
    })
  })

  describe('SECRET door handling', () => {
    test('should block movement into undiscovered SECRET door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.SECRET,
        discovered: false,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Player should not have moved
      expect(newState.player.position).toEqual({ x: 5, y: 5 })
    })

    test('should show generic "cant go that way" for undiscovered SECRET', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.SECRET,
        discovered: false,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      const lastMessage = newState.messages[newState.messages.length - 1]
      expect(lastMessage.text).toBe("You can't go that way.")
    })
  })

  describe('Edge cases', () => {
    test('should handle door at level boundary', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Move player to edge
      state.player.position = { x: 0, y: 1 }

      const door: Door = {
        position: { x: 0, y: 0 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[0][0] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)

      // Should open and move through
      expect(newState.player.position).toEqual({ x: 0, y: 0 })
    })

    test('should preserve other level state when opening door', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Add a monster to the level
      level.monsters.push({
        id: 'monster-1',
        letter: 'Z',
        name: 'Zombie',
        position: { x: 3, y: 3 },
        hp: 10,
        maxHp: 10,
        damage: '1d4',
        xpValue: 5,
        aiProfile: {
          type: 'SIMPLE',
          aggression: 0.5,
          awareness: 3,
        },
        state: 'SLEEPING',
        visibleCells: new Set(),
        currentPath: null,
      })

      const door: Door = {
        position: { x: 5, y: 6 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      level.doors.push(door)
      level.tiles[6][5] = {
        type: TileType.DOOR,
        char: '+',
        walkable: false,
        transparent: false,
        colorVisible: '#fff',
        colorExplored: '#666',
      }

      const command = new MoveCommand(
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

      const newState = command.execute(state)
      const newLevel = newState.levels.get(1)!

      // Monster should still exist
      expect(newLevel.monsters.length).toBe(1)
      expect(newLevel.monsters[0].id).toBe('monster-1')
    })
  })
})
