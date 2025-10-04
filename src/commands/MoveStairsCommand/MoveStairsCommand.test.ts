import { MoveStairsCommand } from './MoveStairsCommand'
import { MessageService } from '@services/MessageService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { FOVService } from '@services/FOVService'
import { LightingService } from '@services/LightingService'
import { SeededRandom } from '@services/RandomService'
import { GameState, Player, Position, Level } from '@game/core/core'

describe('MoveStairsCommand', () => {
  let messageService: MessageService
  let dungeonService: DungeonService
  let fovService: FOVService
  let lightingService: LightingService
  let dungeonConfig: DungeonConfig

  beforeEach(() => {
    messageService = new MessageService()
    const random = new SeededRandom('test-seed')
    dungeonService = new DungeonService(random)
    fovService = new FOVService()
    lightingService = new LightingService()

    dungeonConfig = {
      width: 80,
      height: 22,
      minRooms: 4,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 8,
      minSpacing: 2,
      loopChance: 0.25,
    }
  })

  function createTestPlayer(position: Position = { x: 5, y: 5 }): Player {
    return {
      position,
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestLevel(depth: number): Level {
    const tiles = Array(22)
      .fill(null)
      .map(() =>
        Array(80)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      depth,
      width: 80,
      height: 22,
      tiles,
      rooms: [
        { id: 0, x: 5, y: 5, width: 6, height: 6 },
        { id: 1, x: 15, y: 5, width: 6, height: 6 },
      ],
      monsters: [],
      items: [],
      gold: [],
      traps: [],
      doors: [],
      explored: tiles.map((row) => row.map(() => false)),
      upStairs: depth > 1 ? { x: 7, y: 7 } : null,
      downStairs: depth < 26 ? { x: 17, y: 7 } : null,
      stairsUp: depth > 1 ? { x: 7, y: 7 } : null,
      stairsDown: depth < 26 ? { x: 17, y: 7 } : null,
    }
  }

  function createTestState(player: Player, currentLevel: number = 1): GameState {
    return {
      player,
      levels: new Map([[currentLevel, createTestLevel(currentLevel)]]),
      currentLevel,
      messages: [],
      turnCount: 0,
      isGameOver: false,
      visibleCells: new Set(),
    }
  }

  describe('Moving down stairs', () => {
    test('descends to next level when on stairs down', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(2)
      expect(result.turnCount).toBe(1)
      expect(result.messages[0].text).toContain('descend to level 2')
    })

    test('spawns player at stairs up on new level', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      const newLevel = result.levels.get(2)!
      expect(result.player.position).toEqual(newLevel.stairsUp)
    })

    test('generates new level if it does not exist', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.levels.has(2)).toBe(true)
      expect(result.levels.get(2)!.depth).toBe(2)
    })

    test('reuses existing level when revisiting', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const level2 = createTestLevel(2)
      const state = createTestState(player, 1)
      state.levels.set(2, level2)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      // Level gets updated with new exploration data, but structure remains
      const resultLevel = result.levels.get(2)!
      expect(resultLevel.depth).toBe(level2.depth)
      expect(resultLevel.rooms).toBe(level2.rooms)
      expect(resultLevel.monsters).toBe(level2.monsters)
    })

    test('reports error when not on stairs down', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(1)
      expect(result.messages[0].text).toBe('There are no stairs down here.')
      expect(result.turnCount).toBe(0)
    })

    test('prevents descending below level 26', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const level26 = createTestLevel(26)
      // Manually add stairs down for testing max depth check
      level26.stairsDown = { x: 17, y: 7 }
      level26.downStairs = { x: 17, y: 7 }

      const state = createTestState(player, 26)
      state.levels.set(26, level26)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(26)
      expect(result.messages[0].text).toBe('You cannot go any deeper!')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('Moving up stairs', () => {
    test('ascends to previous level when on stairs up', () => {
      const player = createTestPlayer({ x: 7, y: 7 })
      const state = createTestState(player, 2)

      const command = new MoveStairsCommand(
        'up',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(1)
      expect(result.turnCount).toBe(1)
      expect(result.messages[0].text).toContain('climb to level 1')
    })

    test('spawns player at stairs down on previous level', () => {
      const player = createTestPlayer({ x: 7, y: 7 })
      const level1 = createTestLevel(1)
      const state = createTestState(player, 2)
      state.levels.set(1, level1)

      const command = new MoveStairsCommand(
        'up',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.player.position).toEqual(level1.stairsDown)
    })

    test('reports error when not on stairs up', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, 2)

      const command = new MoveStairsCommand(
        'up',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(2)
      expect(result.messages[0].text).toBe('There are no stairs up here.')
      expect(result.turnCount).toBe(0)
    })

    test('prevents ascending above level 1', () => {
      const player = createTestPlayer({ x: 7, y: 7 })
      const level1 = createTestLevel(1)
      // Manually add stairs up for testing min depth check
      level1.stairsUp = { x: 7, y: 7 }
      level1.upStairs = { x: 7, y: 7 }

      const state = createTestState(player, 1)
      state.levels.set(1, level1)

      const command = new MoveStairsCommand(
        'up',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.currentLevel).toBe(1)
      expect(result.messages[0].text).toContain('You cannot go any higher')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('FOV and exploration', () => {
    test('computes FOV on new level', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result.visibleCells).toBeDefined()
      expect(result.visibleCells.size).toBeGreaterThan(0)
    })

    test('marks visible tiles as explored', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      const newLevel = result.levels.get(2)!
      const playerPos = result.player.position

      // Check that tile at player position is explored
      expect(newLevel.explored[playerPos.y][playerPos.x]).toBe(true)
    })
  })

  describe('State immutability', () => {
    test('does not mutate original state when moving down', () => {
      const player = createTestPlayer({ x: 17, y: 7 })
      const state = createTestState(player, 1)
      const originalLevel = state.currentLevel

      const command = new MoveStairsCommand(
        'down',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.player).not.toBe(state.player)
      expect(state.currentLevel).toBe(originalLevel)
    })

    test('does not mutate original state when moving up', () => {
      const player = createTestPlayer({ x: 7, y: 7 })
      const state = createTestState(player, 2)
      const originalLevel = state.currentLevel

      const command = new MoveStairsCommand(
        'up',
        dungeonService,
        dungeonConfig,
        fovService,
        lightingService,
        messageService
      )
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.player).not.toBe(state.player)
      expect(state.currentLevel).toBe(originalLevel)
    })
  })
})
