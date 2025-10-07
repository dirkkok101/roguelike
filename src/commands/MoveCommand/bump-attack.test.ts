import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { GoldService } from '@services/GoldService'
import { NotificationService } from '@services/NotificationService'
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Level,
  TileType,
  Monster,
  MonsterBehavior,
  MonsterState,
} from '@game/core/core'
import { createTestTorch } from '../../test-utils'

describe('MoveCommand - Bump-to-Attack Combat', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let hungerService: HungerService
  let notificationService: NotificationService
  let regenerationService: RegenerationService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let turnService: TurnService
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
    notificationService = new NotificationService(identificationService)
    regenerationService = new RegenerationService(ringService)
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService, ringService)
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

  function createTestMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      id: 'test-monster',
      letter: 'O',
      name: 'Orc',
      position: { x: 6, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
      ...overrides,
    }
  }

  describe('combat trigger', () => {
    test('triggers combat when moving into monster', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ hp: 1 })
      level.monsters = [monster]

      // Roll: 15 (hit), 3 (damage), 5 (HP gain on level up)
      mockRandom.setValues([15, 3, 5])

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
        ringService
      )

      const newState = command.execute(state)

      // Should have combat messages
      expect(newState.messages.length).toBeGreaterThan(0)
      expect(newState.messages.some((m) => m.text.includes('hit'))).toBe(true)
    })

    test('kills monster and removes from level', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ hp: 1 })
      level.monsters = [monster]

      // Roll: 15 (hit), 3 (damage), 5 (HP gain on level up)
      mockRandom.setValues([15, 3, 5])

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
        ringService
      )

      const newState = command.execute(state)

      // Monster should be removed
      expect(newState.levels.get(1)!.monsters).toHaveLength(0)
    })

    test('awards XP on kill', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ hp: 1, xpValue: 25 })
      level.monsters = [monster]

      // Roll: 15 (hit), 3 (damage), 5 (HP gain on level up)
      mockRandom.setValues([15, 3, 5])

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
        ringService
      )

      const newState = command.execute(state)

      // Player leveled up (10 XP needed for level 2), so XP = 25 - 10 = 15
      expect(newState.player.xp).toBe(15)
    })

    test('wounds monster without killing', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ hp: 10 })
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

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
        ringService
      )

      const newState = command.execute(state)

      // Monster should still exist but wounded
      expect(newState.levels.get(1)!.monsters).toHaveLength(1)
      expect(newState.levels.get(1)!.monsters[0].hp).toBe(7)
    })

    test('generates miss message on miss', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ ac: 20 }) // High AC to force miss
      level.monsters = [monster]

      mockRandom.setValues([1]) // Low roll guarantees miss

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
        ringService
      )

      const newState = command.execute(state)

      expect(newState.messages.some((m) => m.text.includes('miss'))).toBe(true)
    })

    test('increments turn count on combat', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster()
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

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
        ringService
      )

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(1)
    })
  })

  describe('orchestration verification', () => {
    test('does not move player when attacking monster', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster()
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

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
        ringService
      )

      const newState = command.execute(state)

      // Player should still be at original position (not moved into monster's tile)
      expect(newState.player.position).toEqual({ x: 5, y: 5 })
    })

    test('delegates to CombatService (not implementing logic)', () => {
      const state = createTestState()
      const level = state.levels.get(1)!
      const monster = createTestMonster({ hp: 1, xpValue: 30 })
      level.monsters = [monster]

      // Roll: 15 (hit), 3 (damage), 5 (HP gain on level up)
      mockRandom.setValues([15, 3, 5])

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
        ringService
      )

      const newState = command.execute(state)

      // Verify CombatService handled everything:
      // - Monster removed (CombatService logic)
      // - XP awarded (CombatService logic)
      // - Messages added (CombatService logic)
      // - Turn incremented (CombatService logic)
      expect(newState.levels.get(1)!.monsters).toHaveLength(0)
      // Player leveled up (10 XP needed for level 2), so XP = 30 - 10 = 20
      expect(newState.player.xp).toBe(20)
      expect(newState.messages.length).toBeGreaterThan(0)
      expect(newState.turnCount).toBe(1)
    })
  })
})
