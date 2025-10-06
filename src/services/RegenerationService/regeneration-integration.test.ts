import { RegenerationService } from './RegenerationService'
import { HungerService } from '@services/HungerService'
import { MoveCommand } from '@commands/MoveCommand'
import { RestCommand } from '@commands/RestCommand'
import { MockRandom } from '@services/RandomService'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { NotificationService } from '@services/NotificationService'
import { TurnService } from '@services/TurnService'
import {
  GameState,
  Player,
  Level,
  TileType,
  Equipment,
  Monster,
  MonsterBehavior,
  Torch,
  ItemType,
  Ring,
  RingType,
} from '@game/core/core'

describe('RegenerationService - Integration Tests', () => {
  let regenerationService: RegenerationService
  let hungerService: HungerService
  let moveCommand: MoveCommand
  let restCommand: RestCommand
  let mockRandom: MockRandom
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let combatService: CombatService
  let levelingService: LevelingService
  let doorService: DoorService
  let notificationService: NotificationService
  let turnService: TurnService

  beforeEach(() => {
    mockRandom = new MockRandom()
    regenerationService = new RegenerationService()
    hungerService = new HungerService(mockRandom)
    movementService = new MovementService()
    lightingService = new LightingService(mockRandom)
    fovService = new FOVService()
    messageService = new MessageService()
    combatService = new CombatService(mockRandom)
    levelingService = new LevelingService()
    doorService = new DoorService(mockRandom)
    notificationService = new NotificationService()
    turnService = new TurnService()

    moveCommand = new MoveCommand(
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

    restCommand = new RestCommand(
      regenerationService,
      hungerService,
      lightingService,
      fovService,
      messageService,
      turnService
    )
  })

  function createTestState(overrides?: Partial<GameState>): GameState {
    const defaultEquipment: Equipment = {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: createTorch(),
    }

    const player: Player = {
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: defaultEquipment,
      inventory: [],
    }

    const level: Level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles: createEmptyTiles(20, 20),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: createExploredArray(20, 20),
    }

    const levels = new Map<number, Level>()
    levels.set(1, level)

    return {
      player,
      currentLevel: 1,
      levels,
      messages: [],
      turnCount: 0,
      seed: 'test',
      itemNames: new Map(),
      identifiedItems: new Set(),
      hasAmulet: false,
      gameId: 'test-game',
      isGameOver: false,
      isVictory: false,
      debugMode: false,
      visibleCells: new Set(),
      ...overrides,
    }
  }

  function createTorch(): Torch {
    return {
      id: 'torch-1',
      type: ItemType.TORCH,
      name: 'Torch',
      char: '~',
      color: '#FFAA00',
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false,
      identified: true,
      stackable: true,
      position: { x: 0, y: 0 },
    }
  }

  function createRegenerationRing(): Ring {
    return {
      id: 'ring-regen-1',
      type: ItemType.RING,
      name: 'Ring of Regeneration',
      char: '=',
      color: '#9370DB',
      ringType: RingType.REGENERATION,
      effect: 'Regenerates health faster',
      bonus: 0,
      materialName: 'ruby',
      hungerModifier: 1.3,
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  function createEmptyTiles(width: number, height: number) {
    const tiles: any[][] = []
    for (let y = 0; y < height; y++) {
      tiles[y] = []
      for (let x = 0; x < width; x++) {
        tiles[y][x] = {
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#A89078',
          colorExplored: '#5A5A5A',
        }
      }
    }
    return tiles
  }

  function createExploredArray(width: number, height: number): boolean[][] {
    const explored: boolean[][] = []
    for (let y = 0; y < height; y++) {
      explored[y] = []
      for (let x = 0; x < width; x++) {
        explored[y][x] = false
      }
    }
    return explored
  }

  function createTestMonster(position: { x: number; y: number }): Monster {
    return {
      id: 'orc-1',
      letter: 'O',
      name: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }
  }

  describe('Combat → Retreat → Heal Cycle', () => {
    test('player takes damage in combat, retreats, heals over time', () => {
      const monster = createTestMonster({ x: 15, y: 15 }) // Far away, out of FOV
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      let state = createTestState({
        player: {
          ...createTestState().player,
          hp: 15, // Damaged
          maxHp: 20,
          position: { x: 5, y: 5 },
        },
        levels: new Map([[1, level]]),
      })

      // Monster is far away - no combat blocking
      const initialHp = state.player.hp

      // Move 10 times (should heal once after 10 turns)
      for (let i = 0; i < 10; i++) {
        const moveRight = new MoveCommand(
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
        state = moveRight.execute(state)
      }

      // After 10 turns out of combat, player should have regenerated 1 HP
      expect(state.player.hp).toBe(initialHp + 1)
    })

    test('regeneration blocked during combat, resumes after retreat', () => {
      const monster = createTestMonster({ x: 6, y: 5 }) // Adjacent
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      let state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
        levels: new Map([[1, level]]),
        visibleCells: new Set(['6,5']), // Monster visible
      })

      const initialHp = state.player.hp

      // Move 10 times while monster in FOV - no regen
      for (let i = 0; i < 10; i++) {
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
          turnService
        )
        // Keep monster visible by manually setting visibleCells
        state = { ...moveCommand.execute(state), visibleCells: new Set(['6,5']) }
      }

      // No regeneration during combat
      expect(state.player.hp).toBe(initialHp)

      // Remove monster from level (simulating monster death/leaving)
      const updatedLevel = { ...state.levels.get(1)!, monsters: [] }
      state = {
        ...state,
        levels: new Map([[1, updatedLevel]]),
        visibleCells: new Set(),
      }

      // Move 10 more times - should regenerate
      for (let i = 0; i < 10; i++) {
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
          turnService
        )
        state = moveCommand.execute(state)
      }

      // Should heal after combat ends (1 HP over 10 turns)
      expect(state.player.hp).toBe(initialHp + 1)
    })
  })

  describe('Hunger Depletion Blocks Regen', () => {
    test('player stops regenerating when hunger falls below 100', () => {
      let state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
          hunger: 110, // Just above threshold
        },
      })

      // Move 10 times - hunger will fall below 100
      for (let i = 0; i < 15; i++) {
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
          turnService
        )
        state = moveCommand.execute(state)
      }

      // Hunger should be below threshold, blocking regen
      expect(state.player.hunger).toBeLessThanOrEqual(100)
      // Should not have healed (or minimal healing before hunger dropped)
      expect(state.player.hp).toBeLessThan(12) // At most 1 heal
    })
  })

  describe('Ring of Regeneration Rate Doubling', () => {
    test('ring doubles regeneration rate in real gameplay', () => {
      const regenRing = createRegenerationRing()

      const withRingState = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
          equipment: {
            weapon: null,
            armor: null,
            leftRing: regenRing,
            rightRing: null,
            lightSource: createTorch(),
          },
        },
      })

      const withoutRingState = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
      })

      // Execute 10 moves for both
      let stateWith = withRingState
      let stateWithout = withoutRingState

      for (let i = 0; i < 10; i++) {
        const moveWithRing = new MoveCommand(
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
        stateWith = moveWithRing.execute(stateWith)

        const moveWithoutRing = new MoveCommand(
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
        stateWithout = moveWithoutRing.execute(stateWithout)
      }

      // With ring should heal 2x HP (10 turns / 5 per heal = 2 HP)
      // Without ring should heal 1x HP (10 turns / 10 per heal = 1 HP)
      expect(stateWith.player.hp).toBe(12) // 10 + 2
      expect(stateWithout.player.hp).toBe(11) // 10 + 1
    })
  })

  describe('Rest Command with Monsters', () => {
    test('rest interrupted when monster enters FOV', () => {
      const monster = createTestMonster({ x: 7, y: 5 }) // Will be visible
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
        levels: new Map([[1, level]]),
      })

      const result = restCommand.execute(state)

      // Should be interrupted
      expect(result.player.hp).toBeLessThan(20)
      const messages = result.messages.map((m) => m.text)
      expect(messages.some((m) => m.includes('interrupted'))).toBe(true)
    })

    test('rest succeeds when no monsters nearby', () => {
      const monster = createTestMonster({ x: 15, y: 15 }) // Far away
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19, // Need just 1 HP
          maxHp: 20,
        },
        levels: new Map([[1, level]]),
      })

      const result = restCommand.execute(state)

      // Should heal to full
      expect(result.player.hp).toBe(20)
    })
  })

  describe('Turn Count Accuracy', () => {
    test('turn count increments correctly with regeneration', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
        turnCount: 100,
      })

      // Execute 5 moves
      let currentState = state
      for (let i = 0; i < 5; i++) {
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
          turnService
        )
        currentState = moveCommand.execute(currentState)
      }

      // Turn count should be 105
      expect(currentState.turnCount).toBe(105)
    })

    test('rest command increments turns accurately', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19, // Need 1 HP = 10 turns
          maxHp: 20,
        },
        turnCount: 50,
      })

      const result = restCommand.execute(state)

      // Should be 60 (50 + 10 turns to heal 1 HP)
      expect(result.turnCount).toBe(60)
      expect(result.player.hp).toBe(20)
    })
  })
})
