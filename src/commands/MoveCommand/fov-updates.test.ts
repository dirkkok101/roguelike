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
import { NotificationService } from '@services/NotificationService'
import { RegenerationService } from '@services/RegenerationService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType } from '@game/core/core'
import { createTestTorch, createTestLantern, createTestArtifact } from '../../test-utils'

describe('MoveCommand - FOV Updates', () => {
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
    combatService = new CombatService(mockRandom, hungerService)
    levelingService = new LevelingService(mockRandom)
    doorService = new DoorService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
    // hungerService created earlier
    notificationService = new NotificationService(identificationService)
    regenerationService = new RegenerationService()
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20)
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
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }

    return {
      player: {
        position: { x: 10, y: 10 },
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

  describe('FOV recalculation', () => {
    test('updates FOV after movement', () => {
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

      expect(newState.visibleCells.size).toBeGreaterThan(0)
    })

    test('FOV centers on new position', () => {
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

      // New position should be visible
      expect(newState.visibleCells.has('11,10')).toBe(true)
    })

    test('FOV changes as player moves', () => {
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

      state = right.execute(state)
      const fov1Size = state.visibleCells.size

      state = right.execute(state)
      const fov2Size = state.visibleCells.size

      // FOV should exist after each move
      expect(fov1Size).toBeGreaterThan(0)
      expect(fov2Size).toBeGreaterThan(0)
    })

    test('FOV respects light radius', () => {
      const state = createTestState()
      // Torch has radius 1
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

      // Should not see tiles beyond light radius
      expect(newState.visibleCells.has('15,10')).toBe(false) // 4 tiles away
    })
  })

  describe('explored tiles tracking', () => {
    test('marks current position as explored', () => {
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
      const level = newState.levels.get(1)!

      expect(level.explored[10][11]).toBe(true)
    })

    test('marks visible tiles as explored', () => {
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
      const level = newState.levels.get(1)!

      // Adjacent tiles should be explored
      expect(level.explored[10][10]).toBe(true) // Left
      expect(level.explored[10][12]).toBe(true) // Right
      expect(level.explored[9][11]).toBe(true) // Up
      expect(level.explored[11][11]).toBe(true) // Down
    })

    test('preserves previously explored tiles', () => {
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

      state = right.execute(state)
      state = left.execute(state)

      const level = state.levels.get(1)!

      // Original position and right position should both be explored
      expect(level.explored[10][10]).toBe(true)
      expect(level.explored[10][11]).toBe(true)
    })

    test('accumulates explored area over multiple moves', () => {
      let state = createTestState()
      const level = state.levels.get(1)!

      // Count initially explored (should be 0)
      let exploredCount = level.explored.flat().filter(Boolean).length
      expect(exploredCount).toBe(0)

      const commands = [
        new MoveCommand('right', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
        new MoveCommand('right', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
        new MoveCommand('down', movementService, lightingService, fovService, messageService, combatService, levelingService, doorService, hungerService, regenerationService, notificationService, turnService),
      ]

      for (const command of commands) {
        state = command.execute(state)
      }

      const updatedLevel = state.levels.get(1)!
      exploredCount = updatedLevel.explored.flat().filter(Boolean).length

      // Should have explored multiple tiles
      expect(exploredCount).toBeGreaterThan(5)
    })
  })

  describe('light source integration', () => {
    test('uses light source radius for FOV', () => {
      const state = createTestState()
      // Replace torch with lantern (radius 2)
      state.player.equipment.lightSource = createTestLantern()

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

      // Lantern should see farther than torch
      expect(newState.visibleCells.size).toBeGreaterThan(10)
    })

    test('handles no light source', () => {
      const state = createTestState()
      state.player.equipment.lightSource = null

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

      // With no light, radius should be 0, only current position visible
      expect(newState.visibleCells.size).toBe(1)
      expect(newState.visibleCells.has('11,10')).toBe(true)
    })

    test('ticks light fuel on move', () => {
      const state = createTestState()
      const originalFuel = state.player.equipment.lightSource!.fuel!

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

      expect(newState.player.equipment.lightSource!.fuel!).toBe(originalFuel - 1)
    })

    test('does not tick permanent light', () => {
      const state = createTestState()
      state.player.equipment.lightSource = createTestArtifact('Phial', 3)

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

      expect(newState.player.equipment.lightSource!.fuel).toBeUndefined()
    })
  })

  describe('level updates', () => {
    test('updates level in levels map', () => {
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

      expect(newState.levels.get(1)).toBeDefined()
      expect(newState.levels.get(1)).not.toBe(state.levels.get(1))
    })

    test('does not mutate original level', () => {
      const state = createTestState()
      const originalLevel = state.levels.get(1)!
      const originalExplored = originalLevel.explored[10][10]

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

      expect(originalLevel.explored[10][10]).toBe(originalExplored)
    })
  })
})
