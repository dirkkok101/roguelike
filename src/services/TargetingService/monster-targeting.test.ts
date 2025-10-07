import { TargetingService } from './TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import { Player, Monster, Level, Position, MonsterBehavior, MonsterState } from '@game/core/core'

describe('TargetingService - Monster Targeting', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService

  // Test fixtures
  const playerPos: Position = { x: 5, y: 5 }
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
    },
    inventory: [],
    statusEffects: [],
    energy: 100,
  })

  const createBasicLevel = (monsters: Monster[]): Level => ({
    depth: 1,
    width: 10,
    height: 10,
    tiles: Array(10)
      .fill(null)
      .map(() =>
        Array(10).fill({
          type: 'FLOOR',
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
    explored: Array(10)
      .fill(null)
      .map(() => Array(10).fill(false)),
  })

  beforeEach(() => {
    const mockRandom = new MockRandom()
    mockRandom.setValues([5, 5, 5]) // Not used in targeting, but required for services
    const statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
    fovService = new FOVService(statusEffectService)
    targetingService = new TargetingService(fovService, movementService)
  })

  describe('getVisibleMonsters', () => {
    it('should return empty array when no monsters are visible', () => {
      const player = createPlayer(5, 5)
      const level = createBasicLevel([])
      const fovCells = new Set<string>()

      const result = targetingService.getVisibleMonsters(player, level, fovCells)

      expect(result).toEqual([])
    })

    it('should filter monsters by FOV visibility', () => {
      const player = createPlayer(5, 5)
      const monster1 = createMonster('m1', 5, 4) // Visible (adjacent)
      const monster2 = createMonster('m2', 9, 9) // Not visible (out of FOV)
      const level = createBasicLevel([monster1, monster2])

      // Only monster1 position is in FOV
      const fovCells = new Set(['5,4'])

      const result = targetingService.getVisibleMonsters(player, level, fovCells)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('m1')
    })

    it('should sort monsters by distance (closest first)', () => {
      const player = createPlayer(5, 5)
      const monsterFar = createMonster('m1', 5, 1) // Distance: 4
      const monsterNear = createMonster('m2', 5, 4) // Distance: 1
      const monsterMid = createMonster('m3', 7, 5) // Distance: 2
      const level = createBasicLevel([monsterFar, monsterNear, monsterMid])

      // All monsters in FOV
      const fovCells = new Set(['5,1', '5,4', '7,5'])

      const result = targetingService.getVisibleMonsters(player, level, fovCells)

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('m2') // Closest (distance 1)
      expect(result[1].id).toBe('m3') // Middle (distance 2)
      expect(result[2].id).toBe('m1') // Farthest (distance 4)
    })

    it('should use Manhattan distance (L1 norm)', () => {
      const player = createPlayer(5, 5)
      const monsterDiagonal = createMonster('m1', 7, 7) // Manhattan distance: 4 (2+2)
      const monsterStraight = createMonster('m2', 5, 9) // Manhattan distance: 4 (0+4)
      const level = createBasicLevel([monsterDiagonal, monsterStraight])

      const fovCells = new Set(['7,7', '5,9'])

      const result = targetingService.getVisibleMonsters(player, level, fovCells)

      // Both should have same distance (4), order preserved from input
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('m1')
      expect(result[1].id).toBe('m2')
    })
  })

  describe('getNextTarget', () => {
    it('should return null when no monsters are visible', () => {
      const result = targetingService.getNextTarget(undefined, [], 'nearest')

      expect(result).toBeNull()
    })

    it('should return first monster when direction is "nearest"', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
        createMonster('m3', 5, 2),
      ]

      const result = targetingService.getNextTarget(undefined, monsters, 'nearest')

      expect(result?.id).toBe('m1')
    })

    it('should cycle to next monster', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
        createMonster('m3', 5, 2),
      ]

      const result = targetingService.getNextTarget('m1', monsters, 'next')

      expect(result?.id).toBe('m2')
    })

    it('should wrap around to start when cycling next from last monster', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
        createMonster('m3', 5, 2),
      ]

      const result = targetingService.getNextTarget('m3', monsters, 'next')

      expect(result?.id).toBe('m1') // Wrap to first
    })

    it('should cycle to previous monster', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
        createMonster('m3', 5, 2),
      ]

      const result = targetingService.getNextTarget('m2', monsters, 'prev')

      expect(result?.id).toBe('m1')
    })

    it('should wrap around to end when cycling prev from first monster', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
        createMonster('m3', 5, 2),
      ]

      const result = targetingService.getNextTarget('m1', monsters, 'prev')

      expect(result?.id).toBe('m3') // Wrap to last
    })

    it('should default to first monster when currentTargetId is undefined', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
      ]

      const result = targetingService.getNextTarget(undefined, monsters, 'next')

      expect(result?.id).toBe('m1')
    })

    it('should default to last monster when cycling prev with no currentTargetId', () => {
      const monsters = [
        createMonster('m1', 5, 4),
        createMonster('m2', 5, 3),
      ]

      const result = targetingService.getNextTarget(undefined, monsters, 'prev')

      expect(result?.id).toBe('m2') // Last monster
    })
  })

  describe('isValidMonsterTarget', () => {
    it('should validate monster in FOV and in range', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 4) // Distance: 1
      const level = createBasicLevel([monster])
      const fovCells = new Set(['5,4'])

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        5, // maxRange
        true, // requiresLOS
        fovCells
      )

      expect(result.isValid).toBe(true)
    })

    it('should reject monster out of FOV when LOS required', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 4)
      const level = createBasicLevel([monster])
      const fovCells = new Set() // Monster not in FOV

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        5,
        true, // requiresLOS
        fovCells
      )

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('You cannot see that monster.')
    })

    it('should accept monster out of FOV when LOS not required', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 4) // Distance: 1
      const level = createBasicLevel([monster])
      const fovCells = new Set() // Monster not in FOV

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        5,
        false, // LOS NOT required
        fovCells
      )

      expect(result.isValid).toBe(true)
    })

    it('should reject monster beyond max range', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 1) // Distance: 4
      const level = createBasicLevel([monster])
      const fovCells = new Set(['5,1'])

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        3, // maxRange: 3 (monster at distance 4)
        true,
        fovCells
      )

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('That monster is too far away. (Range: 3)')
    })

    it('should accept monster at exactly max range', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 5, 2) // Distance: 3
      const level = createBasicLevel([monster])
      const fovCells = new Set(['5,2'])

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        3, // maxRange: 3 (monster at distance 3)
        true,
        fovCells
      )

      expect(result.isValid).toBe(true)
    })

    it('should use Manhattan distance for range check', () => {
      const player = createPlayer(5, 5)
      const monster = createMonster('m1', 7, 7) // Manhattan distance: 4 (2+2)
      const level = createBasicLevel([monster])
      const fovCells = new Set(['7,7'])

      const result = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        3, // maxRange: 3 (monster at distance 4)
        true,
        fovCells
      )

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('too far away')
    })
  })
})
