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
  TileType,
  Equipment,
} from '@game/core/core'

describe('TargetingService - Wand Target Validation', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService
  let state: GameState
  let level: Level
  let player: Player
  let monster: Monster

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

    // Setup test state
    player = createPlayer(5, 5)
    monster = createMonster('monster-1', 7, 5) // 2 tiles away
    level = createLevel(15, 15, [monster])

    // Compute FOV for player (radius 5)
    const fovCells = fovService.computeFOV(player.position, 5, level)

    state = createGameState(player, level)
    state.visibleCells = fovCells
  })

  describe('validateWandTarget', () => {
    test('returns valid for target in range and FOV', () => {
      const result = targetingService.validateWandTarget('monster-1', 5, state)

      expect(result.isValid).toBe(true)
      expect(result.monster).toBeDefined()
      expect(result.monster!.id).toBe('monster-1')
      expect(result.error).toBeUndefined()
    })

    test('returns error when level invalid', () => {
      state.currentLevel = 99 // Invalid level

      const result = targetingService.validateWandTarget('monster-1', 5, state)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid level state.')
      expect(result.monster).toBeUndefined()
    })

    test('returns error when monster does not exist', () => {
      const result = targetingService.validateWandTarget('nonexistent', 5, state)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Target no longer exists.')
      expect(result.monster).toBeUndefined()
    })

    test('returns error when monster not in FOV', () => {
      state.visibleCells.clear() // Remove all visible cells

      const result = targetingService.validateWandTarget('monster-1', 5, state)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Target no longer visible.')
      expect(result.monster).toBeUndefined()
    })

    test('returns error when monster out of range', () => {
      // Move monster far away (but keep in FOV)
      monster.position = { x: 15, y: 5 } // 10 tiles away
      state.visibleCells.add('15,5')

      const result = targetingService.validateWandTarget('monster-1', 5, state)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('out of range')
      expect(result.error).toContain('Range: 5')
      expect(result.monster).toBeUndefined()
    })

    test('allows target at exact max range', () => {
      // Position monster at exact range
      monster.position = { x: 10, y: 5 } // 5 tiles away
      state.visibleCells.add('10,5')

      const result = targetingService.validateWandTarget('monster-1', 5, state)

      expect(result.isValid).toBe(true)
      expect(result.monster).toBeDefined()
      expect(result.monster!.id).toBe('monster-1')
    })

    test('validates checks in correct order (level before monster)', () => {
      // Set both invalid level and nonexistent monster
      state.currentLevel = 99

      const result = targetingService.validateWandTarget('nonexistent', 5, state)

      // Should fail on level check first
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid level state.')
    })

    test('validates checks in correct order (monster before FOV)', () => {
      state.visibleCells.clear()

      const result = targetingService.validateWandTarget('nonexistent', 5, state)

      // Should fail on monster existence check before FOV
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Target no longer exists.')
    })

    test('validates checks in correct order (FOV before range)', () => {
      // Monster exists but is out of FOV and out of range
      monster.position = { x: 20, y: 20 }
      // Don't add to visibleCells

      const result = targetingService.validateWandTarget('monster-1', 5, state)

      // Should fail on FOV check before range check
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Target no longer visible.')
    })

    test('works with different wand ranges', () => {
      // Monster at distance 4
      monster.position = { x: 9, y: 5 }
      state.visibleCells.add('9,5')

      // Should pass with range 5
      const result1 = targetingService.validateWandTarget('monster-1', 5, state)
      expect(result1.isValid).toBe(true)

      // Should fail with range 3
      const result2 = targetingService.validateWandTarget('monster-1', 3, state)
      expect(result2.isValid).toBe(false)
      expect(result2.error).toContain('Range: 3')
    })

    test('returns monster reference for successful validation', () => {
      const result = targetingService.validateWandTarget('monster-1', 10, state)

      expect(result.isValid).toBe(true)
      expect(result.monster).toBe(monster) // Same object reference
    })
  })
})
