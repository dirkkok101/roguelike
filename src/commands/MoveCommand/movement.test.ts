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
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { NotificationService } from '@services/NotificationService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType } from '@game/core/core'
import { createTestTorch } from '../../test-utils'

describe('MoveCommand - Basic Movement', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let turnService: TurnService
  let hungerService: HungerService
  let regenerationService: RegenerationService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let notificationService: NotificationService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    identificationService = new IdentificationService()
    hungerService = new HungerService(mockRandom)
    movementService = new MovementService(mockRandom, statusEffectService)
    lightingService = new LightingService(mockRandom)
    fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    combatService = new CombatService(mockRandom, ringService, hungerService)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
    regenerationService = new RegenerationService()
    notificationService = new NotificationService(identificationService)
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

  describe('directional movement', () => {
    test('moves player up', () => {
      const state = createTestState()
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 5, y: 4 })
    })

    test('moves player down', () => {
      const state = createTestState()
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 5, y: 6 })
    })

    test('moves player left', () => {
      const state = createTestState()
      const command = new MoveCommand(
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 4, y: 5 })
    })

    test('moves player right', () => {
      const state = createTestState()
      const command = new MoveCommand(
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 6, y: 5 })
    })
  })

  describe('turn tracking', () => {
    test('increments turn count', () => {
      const state = createTestState()
      const command = new MoveCommand(
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(1)
    })

    test('increments turn count for multiple moves', () => {
      let state = createTestState()

      const right = new MoveCommand(
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
        turnService
      )
      const down = new MoveCommand(
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
        turnService
      )

      state = right.execute(state)
      expect(state.turnCount).toBe(1)

      state = down.execute(state)
      expect(state.turnCount).toBe(2)
    })
  })

  describe('immutability', () => {
    test('does not mutate original state', () => {
      const state = createTestState()
      const originalPosition = { ...state.player.position }
      const originalTurnCount = state.turnCount

      const command = new MoveCommand(
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
        turnService
      )

      command.execute(state)

      expect(state.player.position).toEqual(originalPosition)
      expect(state.turnCount).toBe(originalTurnCount)
    })

    test('returns new state object', () => {
      const state = createTestState()
      const command = new MoveCommand(
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
        turnService
      )

      const newState = command.execute(state)

      expect(newState).not.toBe(state)
      expect(newState.player).not.toBe(state.player)
    })
  })

  describe('level boundaries', () => {
    test('handles movement near edges', () => {
      const state = createTestState()
      state.player.position = { x: 1, y: 1 }

      const up = new MoveCommand(
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
        turnService
      )
      const left = new MoveCommand(
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
        turnService
      )

      const newState1 = up.execute(state)
      expect(newState1.player.position).toEqual({ x: 1, y: 0 })

      const newState2 = left.execute(state)
      expect(newState2.player.position).toEqual({ x: 0, y: 1 })
    })

    test('does not move when hitting boundary', () => {
      const state = createTestState()
      state.player.position = { x: 0, y: 0 }

      const up = new MoveCommand(
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
        turnService
      )

      const newState = up.execute(state)

      expect(newState.player.position).toEqual({ x: 0, y: 0 })
    })
  })

  describe('sequential movement', () => {
    test('supports chained movements', () => {
      let state = createTestState()

      const commands = [
        new MoveCommand('right', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
        new MoveCommand('right', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
        new MoveCommand('down', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
        new MoveCommand('left', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
      ]

      for (const command of commands) {
        state = command.execute(state)
      }

      expect(state.player.position).toEqual({ x: 6, y: 6 })
      expect(state.turnCount).toBe(4)
    })
  })
})
