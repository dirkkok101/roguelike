import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType, Monster, MonsterBehavior, MonsterState } from '@game/core/core'

describe('MoveCommand - Collision Detection', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService

  beforeEach(() => {
    movementService = new MovementService()
    lightingService = new LightingService(new MockRandom())
    fovService = new FOVService()
    messageService = new MessageService()
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
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
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
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
          lightSource: lightingService.createTorch(),
        },
        inventory: [],
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

  function createTestMonster(x: number, y: number, name: string = 'Goblin'): Monster {
    return {
      id: `monster-${x}-${y}`,
      letter: name[0],
      name,
      position: { x, y },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }
  }

  describe('wall collision', () => {
    test('blocks movement into wall', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Place wall to the right
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 5, y: 5 }) // Didn't move
    })

    test('adds message when blocked by wall', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0].text).toBe("You can't go that way.")
      expect(newState.messages[0].type).toBe('info')
    })

    test('does not increment turn when blocked', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(0)
    })
  })

  describe('monster collision', () => {
    test('blocks movement into monster', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Place monster to the right
      level.monsters.push(createTestMonster(6, 5, 'Orc'))

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.player.position).toEqual({ x: 5, y: 5 }) // Didn't move
    })

    test('adds message when blocked by monster', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      level.monsters.push(createTestMonster(6, 5, 'Orc'))

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0].text).toBe('A Orc blocks your way!')
      expect(newState.messages[0].type).toBe('info')
    })

    test('does not increment turn when blocked by monster', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      level.monsters.push(createTestMonster(6, 5, 'Dragon'))

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.turnCount).toBe(0)
    })

    test('shows correct monster name', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      level.monsters.push(createTestMonster(6, 5, 'Troll'))

      const command = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = command.execute(state)

      expect(newState.messages[0].text).toContain('Troll')
    })
  })

  describe('out of bounds', () => {
    test('blocks movement out of bounds (negative)', () => {
      const state = createTestState()
      state.player.position = { x: 0, y: 0 }

      const up = new MoveCommand(
        'up',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = up.execute(state)

      expect(newState.player.position).toEqual({ x: 0, y: 0 })
    })

    test('blocks movement out of bounds (positive)', () => {
      const state = createTestState()
      state.player.position = { x: 9, y: 9 }

      const right = new MoveCommand(
        'right',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = right.execute(state)

      expect(newState.player.position).toEqual({ x: 9, y: 9 })
    })

    test('adds message when out of bounds', () => {
      const state = createTestState()
      state.player.position = { x: 0, y: 0 }

      const left = new MoveCommand(
        'left',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = left.execute(state)

      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0].text).toBe("You can't go that way.")
    })
  })

  describe('mixed obstacles', () => {
    test('allows movement in unblocked direction', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Block right and up
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }
      level.monsters.push(createTestMonster(5, 4))

      // But left is free
      const left = new MoveCommand(
        'left',
        movementService,
        lightingService,
        fovService,
        messageService
      )

      const newState = left.execute(state)

      expect(newState.player.position).toEqual({ x: 4, y: 5 })
    })
  })
})
