import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import {
  Level,
  Monster,
  MonsterBehavior,
  MonsterState,
  Position,
  Door,
  DoorState,
  TileType,
} from '@game/core/core'

describe('MonsterAIService - Door Slam Detection', () => {
  let aiService: MonsterAIService
  let mockRandom: MockRandom
  let pathfindingService: PathfindingService
  let fovService: FOVService
  let levelService: LevelService

  beforeEach(() => {
    mockRandom = new MockRandom()
    const statusEffectService = new StatusEffectService()
    levelService = new LevelService()
    pathfindingService = new PathfindingService(levelService)
    fovService = new FOVService(statusEffectService)
    aiService = new MonsterAIService(pathfindingService, mockRandom, fovService, levelService)
  })

  function createLevel(doors: Door[], monsters: Monster[]): Level {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ffffff',
            colorExplored: '#888888',
          }))
      )

    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [
        { id: 1, x: 2, y: 2, width: 5, height: 5 },
        { id: 2, x: 10, y: 10, width: 5, height: 5 },
      ],
      doors,
      traps: [],
      monsters,
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 10, y: 10 },
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createSleepingMonster(position: Position, monsterId: string): Monster {
    return {
      id: monsterId,
      letter: 'O',
      name: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      level: 2,
      speed: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 5,
        fleeThreshold: 0.25,
        chaseChance: 1.0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      energy: 0,
      isInvisible: false,
      statusEffects: [],
    }
  }

  describe('detectDoorSlamAndWake', () => {
    test('detects door slam and wakes monsters in connected rooms', () => {
      // Arrange: Door connecting rooms 1 and 2, monster in room 1
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }

      const monsterInRoom1 = createSleepingMonster({ x: 3, y: 3 }, 'monster-1')
      const level = createLevel([door], [monsterInRoom1])

      const positionHistory: Position[] = [
        { x: 7, y: 7 }, // N-2: at door
        { x: 6, y: 7 }, // N-1: moved left
        { x: 7, y: 7 }, // N: returned to door (slam!)
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(true)
      expect(result.wokeMonsters).toHaveLength(1)
      expect(result.wokeMonsters[0].id).toBe('monster-1')
      expect(result.wokeMonsters[0].isAsleep).toBe(false)
      expect(result.wokeMonsters[0].state).toBe(MonsterState.HUNTING)

      const updatedMonster = result.updatedMonsters.find((m) => m.id === 'monster-1')
      expect(updatedMonster!.isAsleep).toBe(false)
      expect(updatedMonster!.state).toBe(MonsterState.HUNTING)
    })

    test('wakes multiple monsters in connected rooms', () => {
      // Arrange: Door connecting rooms 1 and 2, monsters in both rooms
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }

      const monsterInRoom1 = createSleepingMonster({ x: 3, y: 3 }, 'monster-1')
      const monsterInRoom2 = createSleepingMonster({ x: 11, y: 11 }, 'monster-2')
      const level = createLevel([door], [monsterInRoom1, monsterInRoom2])

      const positionHistory: Position[] = [
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 7, y: 7 },
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(true)
      expect(result.wokeMonsters).toHaveLength(2)
      expect(result.wokeMonsters.map((m) => m.id).sort()).toEqual(['monster-1', 'monster-2'])
    })

    test('does not wake monsters not in connected rooms', () => {
      // Arrange: Door connecting only room 1, monster in room 2
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1], // Only room 1
      }

      const monsterInRoom1 = createSleepingMonster({ x: 3, y: 3 }, 'monster-1')
      const monsterInRoom2 = createSleepingMonster({ x: 11, y: 11 }, 'monster-2')
      const level = createLevel([door], [monsterInRoom1, monsterInRoom2])

      const positionHistory: Position[] = [
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 7, y: 7 },
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(true)
      expect(result.wokeMonsters).toHaveLength(1)
      expect(result.wokeMonsters[0].id).toBe('monster-1')

      const monsterInRoom2After = result.updatedMonsters.find((m) => m.id === 'monster-2')
      expect(monsterInRoom2After!.isAsleep).toBe(true) // Still asleep
    })

    test('does not detect slam when player did not return to same position', () => {
      // Arrange
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }

      const level = createLevel([door], [])

      const positionHistory: Position[] = [
        { x: 5, y: 5 }, // N-2: different position
        { x: 6, y: 6 }, // N-1
        { x: 7, y: 7 }, // N: at door, but didn't return from door
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(false)
      expect(result.wokeMonsters).toHaveLength(0)
    })

    test('does not detect slam when position is not a doorway', () => {
      // Arrange: No door at the position
      const nonDoorPos: Position = { x: 5, y: 5 }
      const level = createLevel([], [])

      const positionHistory: Position[] = [
        { x: 5, y: 5 }, // N-2: at position
        { x: 4, y: 5 }, // N-1: moved left
        { x: 5, y: 5 }, // N: returned to position (not a door)
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, nonDoorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(false)
      expect(result.wokeMonsters).toHaveLength(0)
    })

    test('does not detect slam with insufficient position history', () => {
      // Arrange
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }

      const level = createLevel([door], [])

      const positionHistory: Position[] = [
        { x: 6, y: 7 }, // N-1: only 2 positions
        { x: 7, y: 7 }, // N
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(false)
      expect(result.wokeMonsters).toHaveLength(0)
    })

    test('does not wake already awake monsters', () => {
      // Arrange
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1],
      }

      const sleepingMonster = createSleepingMonster({ x: 3, y: 3 }, 'monster-sleeping')
      const awakeMonster = {
        ...createSleepingMonster({ x: 4, y: 4 }, 'monster-awake'),
        isAsleep: false,
        state: MonsterState.HUNTING,
      }

      const level = createLevel([door], [sleepingMonster, awakeMonster])

      const positionHistory: Position[] = [
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 7, y: 7 },
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(true)
      expect(result.wokeMonsters).toHaveLength(1)
      expect(result.wokeMonsters[0].id).toBe('monster-sleeping')
      // Awake monster not in wokeMonsters list
      expect(result.wokeMonsters.find((m) => m.id === 'monster-awake')).toBeUndefined()
    })

    test('returns empty wokeMonsters array when no monsters in connected rooms', () => {
      // Arrange: Door exists, but no monsters in connected rooms
      const doorPos: Position = { x: 7, y: 7 }
      const door: Door = {
        position: doorPos,
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [1, 2],
      }

      const level = createLevel([door], [])

      const positionHistory: Position[] = [
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 7, y: 7 },
      ]

      // Act
      const result = aiService.detectDoorSlamAndWake(level, doorPos, positionHistory)

      // Assert
      expect(result.slamDetected).toBe(true)
      expect(result.wokeMonsters).toHaveLength(0)
      expect(result.updatedMonsters).toEqual([])
    })
  })
})
