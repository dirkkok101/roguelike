import { RunCommand } from './RunCommand'
import { MoveCommand } from '@commands/MoveCommand'
import { GameState, Level, TileType, Monster, MonsterBehavior, MonsterState } from '@game/core/core'
import { createTestTorch } from '../../test-utils'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { NotificationService } from '@services/NotificationService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'
import { MonsterAIService } from '@services/MonsterAIService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { StatusEffectService } from '@services/StatusEffectService'
import { RingService } from '@services/RingService'
import { LevelService } from '@services/LevelService'
import { PathfindingService } from '@services/PathfindingService'
import { IdentificationService } from '@services/IdentificationService'

describe('RunCommand - Integration', () => {
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService()
  })

  // Helper to create test state
  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 15,
      height: 15,
      tiles: Array(15)
        .fill(null)
        .map(() =>
          Array(15)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
              isRoom: false,
            }))
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(15)
        .fill(null)
        .map(() => Array(15).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 20,
        maxHp: 20,
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
        isRunning: false,
        runState: null,
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(['5,5']),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      characterName: 'TestHero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: new Set(),
      maxDepth: 26,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: {
        fovMode: 'radius',
      },
    }
  }

  function createTestMonster(id: string, position: { x: number; y: number }, name: string = 'Orc'): Monster {
    return {
      id,
      letter: 'O',
      name,
      spriteName: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    }
  }

  // Helper to create services for MoveCommand
  function createServices() {
    const mockRandom = new MockRandom()
    const statusEffectService = new StatusEffectService()
    const identificationService = new IdentificationService()
    const ringService = new RingService(mockRandom)
    const levelService = new LevelService()
    const pathfindingService = new PathfindingService(levelService)

    return {
      movementService: new MovementService(mockRandom, statusEffectService),
      lightingService: new LightingService(mockRandom),
      fovService: new FOVService(statusEffectService),
      messageService: new MessageService(),
      combatService: new CombatService(mockRandom, ringService, new HungerService(mockRandom, ringService)),
      hungerService: new HungerService(mockRandom, ringService),
      regenerationService: new RegenerationService(ringService),
      notificationService: new NotificationService(identificationService),
      levelingService: new LevelingService(mockRandom),
      doorService: new DoorService(),
      turnService: new TurnService(statusEffectService, levelService, ringService),
      goldService: new GoldService(mockRandom),
      monsterAIService: new MonsterAIService(pathfindingService, mockRandom, new FOVService(statusEffectService), levelService),
    }
  }

  describe('Full run cycle - monster detection', () => {
    it('runs continuously until hitting monster (3 move steps, stops on 3rd)', () => {
      // Setup: Player at (5,5), corridor to right, monster at (8,5)
      let state = createTestState()
      const level = state.levels.get(1)!

      // Create straight corridor: (5,5) -> (6,5) -> (7,5) -> (8,5) -> (9,5)
      // Make it wide enough to not trigger branch detection (2 walkable directions: forward + backward)
      // Player has torch with radius 2, so from (5,5) can see to (7,5), from (6,5) can see to (8,5), from (7,5) can see to (9,5)
      for (let x = 4; x <= 10; x++) {
        level.tiles[5][x] = {
          type: TileType.CORRIDOR,
          char: '#',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#666',
          isRoom: false,
        }
      }

      // Make walls above and below to ensure straight corridor
      for (let x = 4; x <= 10; x++) {
        level.tiles[4][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
        level.tiles[6][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
      }

      // Monster at (9,5) - will be visible on 3rd move (from position 7,5)
      const monster = createTestMonster('orc-1', { x: 9, y: 5 }, 'Orc')
      level.monsters = [monster]

      const services = createServices()

      // Step 1: Start run with RunCommand
      const runCommand = new RunCommand('right', recorder, mockRandom)
      state = runCommand.execute(state)

      // Verify run started
      expect(state.player.isRunning).toBe(true)
      expect(state.player.runState).not.toBeNull()
      expect(state.player.runState?.direction).toBe('right')
      expect(state.player.runState?.startingFOV.size).toBe(0) // No monsters visible at start
      expect(state.player.position).toEqual({ x: 5, y: 5 }) // Position unchanged

      // Step 2: First move to (6,5) - should continue running
      state.visibleCells = new Set(['5,5', '6,5']) // Limited FOV, monster at (8,5) not visible yet
      const move1 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move1.execute(state)

      // Verify moved and still running
      expect(state.player.position).toEqual({ x: 6, y: 5 })
      expect(state.player.isRunning).toBe(true)
      expect(state.player.runState).not.toBeNull()
      expect(state.turnCount).toBe(1)

      // Step 3: Second move to (7,5) - monster (9,5) becomes visible, should STOP
      const move2 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move2.execute(state)

      // Verify moved to (7,5) and STOPPED running (monster at 9,5 is now visible with radius 2)
      expect(state.player.position).toEqual({ x: 7, y: 5 })
      expect(state.player.isRunning).toBe(false) // Should stop
      expect(state.player.runState).toBeNull() // Run state cleared
      expect(state.turnCount).toBe(2)

      // Verify disturbance message was added
      const stopMessage = state.messages.find(m => m.text.includes('stop running'))
      expect(stopMessage).toBeDefined()
      expect(stopMessage?.text).toContain('Orc appears!')
    })
  })

  describe('Full run cycle - corridor branch', () => {
    it('runs until corridor branches (2 move steps, stops on branch)', () => {
      let state = createTestState()
      const level = state.levels.get(1)!

      // Create straight corridor with T-junction at (7,5)
      // Path: (5,5) -> (6,5) -> (7,5) with branch
      for (let x = 4; x <= 8; x++) {
        level.tiles[5][x] = {
          type: TileType.CORRIDOR,
          char: '#',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#666',
          isRoom: false,
        }
      }

      // Make walls around initial straight corridor
      for (let x = 4; x <= 6; x++) {
        level.tiles[4][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
        level.tiles[6][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
      }

      // Add T-junction branches at (7,5): paths up and down
      level.tiles[4][7] = {
        type: TileType.CORRIDOR,
        char: '#',
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#666',
        isRoom: false,
      } // up from (7,5)
      level.tiles[6][7] = {
        type: TileType.CORRIDOR,
        char: '#',
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#666',
        isRoom: false,
      } // down from (7,5)

      const services = createServices()

      // Step 1: Start run
      const runCommand = new RunCommand('right', recorder, mockRandom)
      state = runCommand.execute(state)

      expect(state.player.isRunning).toBe(true)
      expect(state.player.position).toEqual({ x: 5, y: 5 })

      // Step 2: First move to (6,5) - should continue (straight corridor)
      state.visibleCells = new Set(['5,5', '6,5', '7,5'])
      const move1 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move1.execute(state)

      // Verify still running
      expect(state.player.position).toEqual({ x: 6, y: 5 })
      expect(state.player.isRunning).toBe(true)
      expect(state.turnCount).toBe(1)

      // Step 3: Second move to (7,5) - T-junction, should STOP
      const move2 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move2.execute(state)

      // Verify stopped at T-junction
      expect(state.player.position).toEqual({ x: 7, y: 5 })
      expect(state.player.isRunning).toBe(false) // Stopped
      expect(state.player.runState).toBeNull()
      expect(state.turnCount).toBe(2)

      // Verify branch detection message
      const stopMessage = state.messages.find(m => m.text.includes('corridor branches'))
      expect(stopMessage).toBeDefined()
    })
  })

  describe('FOV updates between steps', () => {
    it('updates FOV after each move step and detects newly visible monsters', () => {
      let state = createTestState()
      const level = state.levels.get(1)!

      // Create corridor with monster that becomes visible gradually
      for (let x = 4; x <= 10; x++) {
        level.tiles[5][x] = {
          type: TileType.CORRIDOR,
          char: '#',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#666',
          isRoom: false,
        }
      }

      // Make walls above and below
      for (let x = 4; x <= 10; x++) {
        level.tiles[4][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
        level.tiles[6][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
      }

      // Monster at (9,5)
      const monster = createTestMonster('kobold-1', { x: 9, y: 5 }, 'Kobold')
      level.monsters = [monster]

      const services = createServices()

      // Start run
      const runCommand = new RunCommand('right', recorder, mockRandom)
      state = runCommand.execute(state)
      const initialFOV = new Set(state.player.runState?.startingFOV || [])
      expect(initialFOV.size).toBe(0) // No monsters visible initially

      // Move 1: (5,5) -> (6,5), FOV includes tiles 4-8
      state.visibleCells = new Set(['5,5', '6,5', '7,5', '8,5'])
      const move1 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move1.execute(state)

      // Still running, monster not in FOV yet
      expect(state.player.isRunning).toBe(true)
      expect(state.player.position).toEqual({ x: 6, y: 5 })

      // Move 2: (6,5) -> (7,5), FOV now includes monster at (9,5)
      state.visibleCells = new Set(['6,5', '7,5', '8,5', '9,5'])
      const move2 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move2.execute(state)

      // Should stop due to monster detection
      expect(state.player.position).toEqual({ x: 7, y: 5 })
      expect(state.player.isRunning).toBe(false)
      expect(state.messages.some(m => m.text.includes('Kobold appears'))).toBe(true)
    })
  })

  describe('Multiple disturbance types', () => {
    it('stops for low health even if corridor continues', () => {
      let state = createTestState()
      const level = state.levels.get(1)!

      // Create long straight corridor
      for (let x = 4; x <= 12; x++) {
        level.tiles[5][x] = {
          type: TileType.CORRIDOR,
          char: '#',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#666',
          isRoom: false,
        }
      }

      // Make walls above and below
      for (let x = 4; x <= 12; x++) {
        level.tiles[4][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
        level.tiles[6][x] = {
          type: TileType.WALL,
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#333',
          colorExplored: '#111',
          isRoom: false,
        }
      }

      // Lower HP to 25% (below 30% threshold)
      state.player.hp = 5
      state.player.maxHp = 20

      const services = createServices()

      // Start run
      const runCommand = new RunCommand('right', recorder, mockRandom)
      state = runCommand.execute(state)

      // First move - should stop immediately due to low HP
      state.visibleCells = new Set(['5,5', '6,5', '7,5'])
      const move1 = new MoveCommand(
        'right',
        services.movementService,
        services.lightingService,
        services.fovService,
        services.messageService,
        services.combatService,
        services.levelingService,
        services.doorService,
        services.hungerService,
        services.regenerationService,
        services.notificationService,
        services.turnService,
        services.goldService,
        recorder,
        mockRandom,
        services.monsterAIService
      )
      state = move1.execute(state)

      // Should stop due to low health
      expect(state.player.isRunning).toBe(false)
      expect(state.messages.some(m => m.text.includes('health is low'))).toBe(true)
    })
  })
})
