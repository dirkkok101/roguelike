import { TargetingService } from './TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import { Monster, Level, Position, MonsterBehavior, MonsterState, TileType } from '@game/core/core'

describe('TargetingService - Direction Targeting', () => {
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService

  const createMonster = (id: string, x: number, y: number): Monster => ({
    id,
    letter: 'K',
    name: 'Kobold',
      spriteName: 'Kobold',
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

  const setWallAt = (level: Level, x: number, y: number): void => {
    level.tiles[y][x] = {
      type: TileType.WALL,
      char: '#',
      walkable: false,
      transparent: false,
      colorVisible: '#666',
      colorExplored: '#444',
    }
  }

  beforeEach(() => {
    const mockRandom = new MockRandom()
    mockRandom.setValues([5, 5, 5])
    const statusEffectService = new StatusEffectService()
    movementService = new MovementService(mockRandom, statusEffectService)
    fovService = new FOVService(statusEffectService)
    targetingService = new TargetingService(fovService, movementService)
  })

  describe('getDirectionVector', () => {
    it('should return correct vector for "up"', () => {
      const result = targetingService.getDirectionVector('up')
      expect(result).toEqual({ dx: 0, dy: -1 })
    })

    it('should return correct vector for "down"', () => {
      const result = targetingService.getDirectionVector('down')
      expect(result).toEqual({ dx: 0, dy: 1 })
    })

    it('should return correct vector for "left"', () => {
      const result = targetingService.getDirectionVector('left')
      expect(result).toEqual({ dx: -1, dy: 0 })
    })

    it('should return correct vector for "right"', () => {
      const result = targetingService.getDirectionVector('right')
      expect(result).toEqual({ dx: 1, dy: 0 })
    })

    it('should return correct vector for "up-left"', () => {
      const result = targetingService.getDirectionVector('up-left')
      expect(result).toEqual({ dx: -1, dy: -1 })
    })

    it('should return correct vector for "up-right"', () => {
      const result = targetingService.getDirectionVector('up-right')
      expect(result).toEqual({ dx: 1, dy: -1 })
    })

    it('should return correct vector for "down-left"', () => {
      const result = targetingService.getDirectionVector('down-left')
      expect(result).toEqual({ dx: -1, dy: 1 })
    })

    it('should return correct vector for "down-right"', () => {
      const result = targetingService.getDirectionVector('down-right')
      expect(result).toEqual({ dx: 1, dy: 1 })
    })
  })

  describe('castRay', () => {
    it('should cast ray in straight line (right)', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(15, 15, [])

      const ray = targetingService.castRay(origin, 'right', 5, level)

      expect(ray).toHaveLength(5)
      expect(ray[0]).toEqual({ x: 6, y: 5 })
      expect(ray[1]).toEqual({ x: 7, y: 5 })
      expect(ray[2]).toEqual({ x: 8, y: 5 })
      expect(ray[3]).toEqual({ x: 9, y: 5 })
      expect(ray[4]).toEqual({ x: 10, y: 5 })
    })

    it('should cast ray in straight line (up)', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(15, 15, [])

      const ray = targetingService.castRay(origin, 'up', 3, level)

      expect(ray).toHaveLength(3)
      expect(ray[0]).toEqual({ x: 5, y: 4 })
      expect(ray[1]).toEqual({ x: 5, y: 3 })
      expect(ray[2]).toEqual({ x: 5, y: 2 })
    })

    it('should cast ray diagonally', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(15, 15, [])

      const ray = targetingService.castRay(origin, 'up-right', 3, level)

      expect(ray).toHaveLength(3)
      expect(ray[0]).toEqual({ x: 6, y: 4 })
      expect(ray[1]).toEqual({ x: 7, y: 3 })
      expect(ray[2]).toEqual({ x: 8, y: 2 })
    })

    it('should stop at wall', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(15, 15, [])

      // Place wall at (7, 5)
      setWallAt(level, 7, 5)

      const ray = targetingService.castRay(origin, 'right', 5, level)

      // Should stop at wall (7, 5) and include it in path
      expect(ray).toHaveLength(2)
      expect(ray[0]).toEqual({ x: 6, y: 5 })
      expect(ray[1]).toEqual({ x: 7, y: 5 }) // Wall position included
    })

    it('should stop at level bounds', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(10, 10, [])

      // Cast ray to the right with maxRange that would exceed bounds
      const ray = targetingService.castRay(origin, 'right', 10, level)

      // Should stop at x=9 (level width is 10, so max x is 9)
      expect(ray[ray.length - 1].x).toBe(9)
    })

    it('should respect maxRange', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(20, 20, [])

      const ray = targetingService.castRay(origin, 'right', 3, level)

      expect(ray).toHaveLength(3)
    })

    it('should return empty array for invalid direction', () => {
      const origin: Position = { x: 5, y: 5 }
      const level = createLevel(15, 15, [])

      // @ts-expect-error - Testing invalid direction
      const ray = targetingService.castRay(origin, 'invalid', 5, level)

      expect(ray).toEqual([])
    })

    it('should handle ray starting at edge of level', () => {
      const origin: Position = { x: 0, y: 0 }
      const level = createLevel(10, 10, [])

      // Cast ray left from edge (should immediately stop)
      const ray = targetingService.castRay(origin, 'left', 5, level)

      expect(ray).toHaveLength(0)
    })
  })

  describe('findFirstMonsterInRay', () => {
    it('should return null when no monsters in ray', () => {
      const level = createLevel(15, 15, [])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).toBeNull()
    })

    it('should find monster at first position in ray', () => {
      const monster = createMonster('m1', 6, 5)
      const level = createLevel(15, 15, [monster])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should find monster at middle position in ray', () => {
      const monster = createMonster('m1', 7, 5)
      const level = createLevel(15, 15, [monster])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should find monster at last position in ray', () => {
      const monster = createMonster('m1', 8, 5)
      const level = createLevel(15, 15, [monster])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should return first monster when multiple monsters in ray', () => {
      const monster1 = createMonster('m1', 6, 5)
      const monster2 = createMonster('m2', 8, 5)
      const level = createLevel(15, 15, [monster1, monster2])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1') // First monster in ray path
    })

    it('should ignore monsters not in ray path', () => {
      const monsterInRay = createMonster('m1', 7, 5)
      const monsterOutsideRay = createMonster('m2', 7, 6) // Different y coordinate
      const level = createLevel(15, 15, [monsterInRay, monsterOutsideRay])
      const rayPath: Position[] = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ]

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should return null for empty ray path', () => {
      const level = createLevel(15, 15, [])
      const rayPath: Position[] = []

      const result = targetingService.findFirstMonsterInRay(rayPath, level)

      expect(result).toBeNull()
    })
  })

  describe('castRay + findFirstMonsterInRay integration', () => {
    it('should find monster in straight ray path', () => {
      const origin: Position = { x: 5, y: 5 }
      const monster = createMonster('m1', 7, 5)
      const level = createLevel(15, 15, [monster])

      const ray = targetingService.castRay(origin, 'right', 5, level)
      const result = targetingService.findFirstMonsterInRay(ray, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should find monster in diagonal ray path', () => {
      const origin: Position = { x: 5, y: 5 }
      const monster = createMonster('m1', 7, 3)
      const level = createLevel(15, 15, [monster])

      const ray = targetingService.castRay(origin, 'up-right', 5, level)
      const result = targetingService.findFirstMonsterInRay(ray, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })

    it('should not find monster behind wall', () => {
      const origin: Position = { x: 5, y: 5 }
      const monster = createMonster('m1', 9, 5)
      const level = createLevel(15, 15, [monster])

      // Place wall at (7, 5) between player and monster
      setWallAt(level, 7, 5)

      const ray = targetingService.castRay(origin, 'right', 8, level)
      const result = targetingService.findFirstMonsterInRay(ray, level)

      // Ray should stop at wall, not reach monster
      expect(result).toBeNull()
    })

    it('should find first monster before wall', () => {
      const origin: Position = { x: 5, y: 5 }
      const monster1 = createMonster('m1', 6, 5)
      const monster2 = createMonster('m2', 9, 5)
      const level = createLevel(15, 15, [monster1, monster2])

      // Place wall at (7, 5) between monsters
      setWallAt(level, 7, 5)

      const ray = targetingService.castRay(origin, 'right', 8, level)
      const result = targetingService.findFirstMonsterInRay(ray, level)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('m1')
    })
  })
})
