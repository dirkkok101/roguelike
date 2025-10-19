import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { GoldService } from '@services/GoldService'
import { NotificationService } from '@services/NotificationService'
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { CombatService } from '@services/CombatService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { GameState, Player, Level, TileType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('MoveCommand - Starvation Death', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let hungerService: HungerService
  let notificationService: NotificationService
  let regenerationService: RegenerationService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let turnService: TurnService
  let goldService: GoldService
  let ringService: RingService
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService()
    statusEffectService = new StatusEffectService()
    identificationService = new IdentificationService()
    ringService = new RingService(mockRandom)
    goldService = new GoldService(mockRandom)
    hungerService = new HungerService(mockRandom, ringService)
    movementService = new MovementService(mockRandom, statusEffectService)
    lightingService = new LightingService(mockRandom)
    fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    notificationService = new NotificationService(identificationService)
    regenerationService = new RegenerationService(ringService)
    combatService = new CombatService(mockRandom, ringService, hungerService)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService, ringService)
  })

  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 1, // Low HP so starvation kills
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 0, // Starving
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
        statusEffects: [],
        energy: 100,
      ...overrides,
    }
  }

  function createTestLevel(): Level {
    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20).fill({
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
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createTestState(overrides: Partial<GameState> = {}): GameState {
    return {
      player: createTestPlayer(),
      currentLevel: 1,
      levels: new Map([[1, createTestLevel()]]),
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

  test('sets deathCause when player dies of starvation', () => {
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
      turnService,
      goldService,
        recorder,
        mockRandom
      )

    const state = createTestState()

    const result = command.execute(state)

    expect(result.player.hp).toBe(0)
    expect(result.isGameOver).toBe(true)
    expect(result.deathCause).toBe('Died of starvation')
  })

  test('adds starvation death message', () => {
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
        recorder,
        mockRandom
      )

    const state = createTestState()

    const result = command.execute(state)

    const deathMessage = result.messages.find((m) =>
      m.text.includes('died of starvation')
    )
    expect(deathMessage).toBeDefined()
    expect(deathMessage?.type).toBe('critical')
  })

  test('does not set deathCause if player survives starvation damage', () => {
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
      goldService,
        recorder,
        mockRandom
      )

    const state = createTestState({
      player: createTestPlayer({ hp: 5, hunger: 0 }),
    })

    const result = command.execute(state)

    expect(result.player.hp).toBe(4) // Reduced by 1 but alive
    expect(result.isGameOver).toBe(false)
    expect(result.deathCause).toBeUndefined()
  })

  test('does not check starvation if hunger > 0', () => {
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
      turnService,
      goldService,
        recorder,
        mockRandom
      )

    const state = createTestState({
      player: createTestPlayer({ hp: 1, hunger: 100 }),
    })

    const result = command.execute(state)

    expect(result.player.hp).toBe(1) // Unchanged
    expect(result.isGameOver).toBe(false)
    expect(result.deathCause).toBeUndefined()
  })

  test('increments turn count on starvation death', () => {
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
        recorder,
        mockRandom
      )

    const state = createTestState({ turnCount: 50 })

    const result = command.execute(state)

    expect(result.turnCount).toBe(50) // Commands no longer increment turns
  })
})
