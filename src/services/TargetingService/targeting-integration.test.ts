import { TargetingService } from './TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Player,
  Monster,
  Level,
  Position,
  MonsterBehavior,
  MonsterState,
  TargetingMode,
  TargetingRequest,
  TileType,
  Equipment,
} from '@game/core/core'

describe('TargetingService - Integration Tests', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService

  const createPlayer = (x: number, y: number): Player => ({
    position: { x, y },
    hp: 20,
    maxHp: 20,
    strength: 16,
    maxStrength: 16,
    ac: 5,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 500,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: null,
    } as Equipment,
    inventory: [],
    statusEffects: [],
    energy: 100,
  })

  const createMonster = (id: string, x: number, y: number): Monster => ({
    id,
    letter: 'K',
    name: 'Kobold',
    position: { x, y },
    hp: 10,
    maxHp: 10,
    ac: 5,
    damage: '1d4',
    xpValue: 10,
    aiProfile: {
      behavior: MonsterBehavior.SIMPLE,
      intelligence: 5,
      aggroRange: 5,
      fleeThreshold: 0,
      special: [],
    },
    isAsleep: false,
    isAwake: true,
    state: MonsterState.HUNTING,
    visibleCells: new Set(),
    currentPath: null,
    hasStolen: false,
    level: 1,
    energy: 100,
    speed: 10,
    isInvisible: false,
    statusEffects: [],
  })

  const createLevel = (width: number, height: number, monsters: Monster[]): Level => ({
    depth: 1,
    width,
    height,
    tiles: Array(height)
      .fill(null)
      .map(() =>
        Array(width).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        })
      ),
    rooms: [],
    doors: [],
    traps: [],
    monsters,
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: null,
    explored: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
  })

  const createGameState = (player: Player, level: Level): GameState => ({
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells: new Set(),
    messages: [],
    turnCount: 1,
    seed: 'test',
    gameId: 'test-game',
    characterName: 'TestHero',
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
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  })

  beforeEach(() => {
    const mockRandom = new MockRandom()
    mockRandom.setValues([5, 5, 5])
    const statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
    fovService = new FOVService(statusEffectService)
    targetingService = new TargetingService(fovService, movementService)
  })

  describe('selectTarget - Monster Mode', () => {
    it('should auto-select nearest visible monster', () => {
      const player = createPlayer(5, 5)
      const nearMonster = createMonster('m1', 5, 4) // Distance 1
      const farMonster = createMonster('m2', 5, 2) // Distance 3
      const level = createLevel(15, 15, [nearMonster, farMonster])

      // Compute FOV for player
      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(true)
      expect(result.targetMonsterId).toBe('m1') // Nearest monster
    })

    it('should return error when no monsters visible', () => {
      const player = createPlayer(5, 5)
      const level = createLevel(15, 15, [])

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(false)
      expect(result.message).toBe('No monsters in range.')
    })

    it('should respect max range', () => {
      const player = createPlayer(5, 5)
      const nearMonster = createMonster('m1', 5, 4) // Distance 1
      const farMonster = createMonster('m2', 5, 1) // Distance 4
      const level = createLevel(15, 15, [nearMonster, farMonster])

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 2, // Only near monster in range
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(true)
      expect(result.targetMonsterId).toBe('m1')
    })

    it('should return error when all monsters out of range', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 1) // Distance 4
      const level = createLevel(15, 15, [monster])

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 2, // Monster out of range
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(false)
      expect(result.message).toBe('No valid targets in range.')
    })

    it('should skip out-of-range monsters and select next valid one', () => {
      const player = createPlayer(5, 5)
      const farMonster = createMonster('m1', 5, 1) // Distance 4 (out of range)
      const nearMonster = createMonster('m2', 6, 5) // Distance 1 (in range)
      const level = createLevel(15, 15, [farMonster, nearMonster])

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 2,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(true)
      expect(result.targetMonsterId).toBe('m2') // Skips far monster, selects near one
    })
  })

  describe('selectTarget - Direction Mode', () => {
    it('should return error for direction mode (requires user input)', () => {
      const player = createPlayer(5, 5)
      const level = createLevel(15, 15, [])
      const state = createGameState(player, level)

      const request: TargetingRequest = {
        mode: TargetingMode.DIRECTION,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(false)
      expect(result.message).toContain('requires user input')
    })
  })

  describe('selectTarget - Position Mode', () => {
    it('should return error for position mode (requires user input)', () => {
      const player = createPlayer(5, 5)
      const level = createLevel(15, 15, [])
      const state = createGameState(player, level)

      const request: TargetingRequest = {
        mode: TargetingMode.POSITION,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(false)
      expect(result.message).toContain('requires user input')
    })
  })

  describe('selectTarget - Edge Cases', () => {
    it('should handle invalid level state', () => {
      const player = createPlayer(5, 5)
      const level = createLevel(15, 15, [])
      const state = createGameState(player, level)
      state.currentLevel = 99 // Invalid level

      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid level state.')
    })
  })

  describe('Full Targeting Workflow', () => {
    it('should support manual targeting cycle through monsters', () => {
      const player = createPlayer(5, 5)
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 6, 5),
        createMonster('m3', 7, 5),
      ]
      const level = createLevel(15, 15, monsters)

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      // Step 1: Get all visible monsters
      const visibleMonsters = targetingService.getVisibleMonsters(player, level, fovCells)
      expect(visibleMonsters).toHaveLength(3)

      // Step 2: Cycle to next target
      const target1 = targetingService.getNextTarget(undefined, visibleMonsters, 'nearest')
      expect(target1?.id).toBe('m1') // Nearest

      // Step 3: Cycle to next
      const target2 = targetingService.getNextTarget(target1?.id, visibleMonsters, 'next')
      expect(target2?.id).toBe('m2')

      // Step 4: Validate target
      const validation = targetingService.isValidMonsterTarget(target2!, player, level, 5, true, fovCells)
      expect(validation.valid).toBe(true)
    })

    it('should support auto-targeting for quick selection', () => {
      const player = createPlayer(5, 5)
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 6, 5),
      ]
      const level = createLevel(15, 15, monsters)

      const fovCells = fovService.computeFOV(player.position, 5, level)
      const state = createGameState(player, level)
      state.visibleCells = fovCells

      // Auto-select nearest
      const request: TargetingRequest = {
        mode: TargetingMode.MONSTER,
        maxRange: 5,
        requiresLOS: true,
      }

      const result = targetingService.selectTarget(request, state)

      expect(result.success).toBe(true)
      expect(result.targetMonsterId).toBe('m1') // Auto-selected nearest
    })
  })
})
