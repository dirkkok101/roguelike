import { OpenDoorCommand } from './OpenDoorCommand'
import { MessageService } from '@services/MessageService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { GameState, DoorState, Door, Player, Position } from '@game/core/core'

describe('OpenDoorCommand', () => {
  let messageService: MessageService
  let doorService: DoorService
  let turnService: TurnService

  beforeEach(() => {
    messageService = new MessageService()
    doorService = new DoorService()
    turnService = new TurnService()
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

  function createTestDoor(
    position: Position,
    state: DoorState,
    discovered: boolean = true
  ): Door {
    return {
      id: `door-${position.x}-${position.y}`,
      position,
      state,
      discovered,
      orientation: 'horizontal',
      connectedRooms: [],
    }
  }

  function createTestState(player: Player, doors: Door[]): GameState {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
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
      player,
      levels: new Map([
        [
          1,
          {
            depth: 1,
            width: 20,
            height: 20,
            tiles,
            rooms: [],
            monsters: [],
            items: [],
            gold: [],
            traps: [],
            doors,
            upStairs: null,
            downStairs: null,
          },
        ],
      ]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  describe('Opening closed doors', () => {
    test('opens a closed door successfully', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const updatedDoor = level.doors[0]

      expect(updatedDoor.state).toBe(DoorState.OPEN)
      expect(result.turnCount).toBe(1)
      expect(result.messages[0].text).toBe('You open the door.')
    })

    test('updates tile transparency when opening door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const tile = level.tiles[5][6]

      expect(tile.transparent).toBe(true)
      expect(tile.walkable).toBe(true)
      expect(tile.char).toBe("'")
    })

    test('does not mutate original state', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.levels).not.toBe(state.levels)
      expect(state.levels.get(1)!.doors[0].state).toBe(DoorState.CLOSED)
    })
  })

  describe('Already open doors', () => {
    test('reports door is already open', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('That door is already open.')
      expect(result.turnCount).toBe(0)
    })

    test('reports broken door is already open', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.BROKEN)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('That door is already open.')
      expect(result.turnCount).toBe(0)
    })

    test('reports archway is already open', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.ARCHWAY)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('That door is already open.')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('Locked doors', () => {
    test('cannot open locked door without key', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.LOCKED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('The door is locked. You need a key.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)

      const level = result.levels.get(1)!
      expect(level.doors[0].state).toBe(DoorState.LOCKED)
    })
  })

  describe('Secret doors', () => {
    test('cannot open undiscovered secret door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('There is no door there.')
      expect(result.turnCount).toBe(0)
    })

    test('can open discovered secret door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, true)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.doors[0].state).toBe(DoorState.OPEN)
      expect(result.messages[0].text).toBe('You open the secret door.')
      expect(result.turnCount).toBe(1)
    })
  })

  describe('No door present', () => {
    test('reports no door when none exists', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, [])

      const command = new OpenDoorCommand({ x: 1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('There is no door there.')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('Direction handling', () => {
    test('opens door to the left', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 4, y: 5 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: -1, y: 0 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.doors[0].state).toBe(DoorState.OPEN)
    })

    test('opens door above', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 5, y: 4 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 0, y: -1 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.doors[0].state).toBe(DoorState.OPEN)
    })

    test('opens door below', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 5, y: 6 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new OpenDoorCommand({ x: 0, y: 1 }, messageService, doorService, turnService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.doors[0].state).toBe(DoorState.OPEN)
    })
  })
})
