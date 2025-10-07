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
import { RegenerationService } from '@services/RegenerationService'
import { RingService } from '@services/RingService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { NotificationService } from '@services/NotificationService'
import { GoldService } from '@services/GoldService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType, GoldPile } from '@game/core/core'
import { createTestTorch } from '../../test-utils'

describe('MoveCommand - Gold Pickup', () => {
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
  let ringService: RingService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let notificationService: NotificationService
  let goldService: GoldService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    identificationService = new IdentificationService()
    ringService = new RingService(mockRandom)
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
    regenerationService = new RegenerationService(ringService)
    notificationService = new NotificationService(identificationService)
    goldService = new GoldService(mockRandom)
  })

  function createTestState(gold: GoldPile[] = []): GameState {
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
      traps: [],
      monsters: [],
      items: [],
      gold,
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
          lightSource: createTestTorch({ fuel: 100 }),
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

  describe('Automatic gold pickup', () => {
    test('picks up gold when moving to position with gold', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 50 }
      const state = createTestState([goldPile])

      mockRandom.setValues([10, 10, 10]) // Hunger tick, fuel tick values

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(result.player.gold).toBe(50)
      expect(result.player.position).toEqual({ x: 5, y: 4 })
    })

    test('removes gold pile from level after pickup', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 100 }
      const state = createTestState([goldPile])

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      const level = result.levels.get(1)
      expect(level?.gold.length).toBe(0)
    })

    test('adds pickup message to message log', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 75 }
      const state = createTestState([goldPile])

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      const pickupMessage = result.messages.find(m => m.text.includes('pick up') && m.text.includes('75'))
      expect(pickupMessage).toBeDefined()
      expect(pickupMessage?.type).toBe('success')
    })

    test('accumulates gold with existing player gold', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 50 }
      const state = createTestState([goldPile])
      state.player.gold = 100

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(result.player.gold).toBe(150)
    })

    test('no pickup when moving to position without gold', () => {
      const goldPile: GoldPile = { position: { x: 7, y: 7 }, amount: 50 }
      const state = createTestState([goldPile])

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(result.player.gold).toBe(0)
      const level = result.levels.get(1)
      expect(level?.gold.length).toBe(1) // Gold still there
    })

    test('picks up correct gold pile when multiple exist', () => {
      const gold1: GoldPile = { position: { x: 5, y: 4 }, amount: 100 }
      const gold2: GoldPile = { position: { x: 7, y: 7 }, amount: 200 }
      const state = createTestState([gold1, gold2])

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(result.player.gold).toBe(100) // Only picked up gold1
      const level = result.levels.get(1)
      expect(level?.gold.length).toBe(1)
      expect(level?.gold[0]).toEqual(gold2) // gold2 still there
    })
  })

  describe('Gold pickup timing', () => {
    test('gold pickup happens during movement (no extra turn)', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 50 }
      const state = createTestState([goldPile])

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(result.turnCount).toBe(1) // Only 1 turn consumed (for movement)
    })

    test('gold pickup is immutable (returns new player object)', () => {
      const goldPile: GoldPile = { position: { x: 5, y: 4 }, amount: 50 }
      const state = createTestState([goldPile])
      const originalPlayer = state.player

      mockRandom.setValues([10, 10, 10])

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
        goldService,
        ringService
      )

      const result = command.execute(state)

      expect(originalPlayer.gold).toBe(0) // Original unchanged
      expect(result.player.gold).toBe(50) // New player has gold
      expect(result.player).not.toBe(originalPlayer) // Different objects
    })
  })
})
