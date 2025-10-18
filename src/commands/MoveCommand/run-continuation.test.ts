import { MoveCommand } from './MoveCommand'
import { GameState, RunState, Player, Monster, MonsterBehavior, ItemType } from '@game/core/core'
import { createMockGameState, createMockLevel } from '../../test-helpers/mockGameState'
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
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { NotificationService } from '@services/NotificationService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'

describe('MoveCommand - Run Continuation', () => {
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
    combatService = new CombatService(mockRandom, ringService, hungerService)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService, ringService)
    regenerationService = new RegenerationService(ringService)
    notificationService = new NotificationService(identificationService)
  })

  // Helper function to create test players
  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    return {
      position: { x: 5, y: 5 },
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
        lightSource: {
          id: 'test-torch',
          name: 'Torch',
          type: ItemType.TORCH,
          spriteName: 'torch',
          identified: true,
          position: { x: 0, y: 0 },
          fuel: 500,
          maxFuel: 500,
          radius: 2,
          isPermanent: false,
        },
      },
      inventory: [],
      statusEffects: [],
      energy: 100,
      isRunning: false,
      runState: null,
      ...overrides,
    }
  }

  // Helper function to create test monsters
  function createTestMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      id: 'monster-1',
      name: 'Orc',
      char: 'O',
      position: { x: 10, y: 10 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      behavior: MonsterBehavior.SIMPLE,
      isAsleep: false,
      carriesGold: false,
      level: 1,
      aggro: 5,
      spriteName: 'orc',
      isUnique: false,
      hasSpecialAttack: false,
      canOpenDoors: false,
      canPickUpItems: false,
      ...overrides,
    }
  }

  describe('when runState exists', () => {
    it('continues run if not disturbed', () => {
      const player = createTestPlayer({
        position: { x: 5, y: 5 },
        hp: 20,
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()
      // Create simple corridor (only 2 walkable directions - not a branch)
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          level.tiles[y][x].walkable = false
        }
      }
      level.tiles[5][4] = { walkable: true, type: 'CORRIDOR' } as any // left (where we came from)
      level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any // current position
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right (where we're going)

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)

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
        mockRandom,
      recorder,
      mockRandom
      )
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(true)
      expect(newState.player.runState).not.toBeNull()
    })

    it('stops run when disturbed by new monster', () => {
      const player = createTestPlayer({
        position: { x: 5, y: 5 },
        hp: 20,
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()
      // Create simple corridor (only 2 walkable directions - not a branch)
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          level.tiles[y][x].walkable = false
        }
      }
      level.tiles[5][4] = { walkable: true, type: 'CORRIDOR' } as any // left (where we came from)
      level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any // current position
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right (where we're going)
      level.tiles[5][7] = { walkable: true, type: 'CORRIDOR' } as any // monster position
      level.monsters = [
        createTestMonster({ id: 'orc-1', position: { x: 6, y: 6 }, name: 'Orc' }) // Monster adjacent to new position
      ]
      level.tiles[6][6] = { walkable: true, type: 'CORRIDOR' } as any // monster tile

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)

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
        mockRandom,
      recorder,
      mockRandom
      )
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.includes('stop running'))).toBe(true)
      expect(newState.messages.some(m => m.text.includes('Orc appears'))).toBe(true)
    })

    it('stops run at corridor branch', () => {
      const player = createTestPlayer({
        position: { x: 5, y: 5 },
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()

      // T-junction after movement - block all tiles first
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          level.tiles[y][x].walkable = false
        }
      }

      // Create path to T-junction
      level.tiles[5][4] = { walkable: true, type: 'CORRIDOR' } as any // left (where we came from)
      level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any // current position
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right - new position

      // T-junction at new position (6, 5): up, down, left all walkable (3 directions)
      level.tiles[4][6] = { walkable: true, type: 'CORRIDOR' } as any // up from new pos
      level.tiles[6][6] = { walkable: true, type: 'CORRIDOR' } as any // down from new pos
      // left (where we came from) is already walkable

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)

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
        mockRandom,
      recorder,
      mockRandom
      )
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
    })
  })
})
