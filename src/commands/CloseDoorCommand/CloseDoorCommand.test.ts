import { CloseDoorCommand } from './CloseDoorCommand'
import { MessageService } from '@services/MessageService'
import { DoorService } from '@services/DoorService'
import {
  GameState,
  DoorState,
  Door,
  Player,
  Monster,
  MonsterBehavior,
  Position,
} from '@game/core/core'

describe('CloseDoorCommand', () => {
  let messageService: MessageService
  let doorService: DoorService

  beforeEach(() => {
    messageService = new MessageService()
    doorService = new DoorService()
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

  function createTestMonster(position: Position): Monster {
    return {
      id: 'test-monster',
      letter: 'T',
      name: 'Test Monster',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
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

  function createTestState(
    player: Player,
    doors: Door[],
    monsters: Monster[] = []
  ): GameState {
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
            monsters,
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

  describe('Closing open doors', () => {
    test('closes an open door successfully', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const updatedDoor = level.doors[0]

      expect(updatedDoor.state).toBe(DoorState.CLOSED)
      expect(result.turnCount).toBe(1)
      expect(result.messages[0].text).toBe('You close the door.')
    })

    test('updates tile transparency when closing door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const tile = level.tiles[5][6]

      expect(tile.transparent).toBe(false)
      expect(tile.walkable).toBe(true)
      expect(tile.char).toBe('+')
    })

    test('does not mutate original state', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.levels).not.toBe(state.levels)
      expect(state.levels.get(1)!.doors[0].state).toBe(DoorState.OPEN)
    })
  })

  describe('Already closed doors', () => {
    test('reports door is already closed', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.CLOSED)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('That door is already closed.')
      expect(result.turnCount).toBe(0)
    })

    test('reports locked door is already closed', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.LOCKED)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('That door is already closed.')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('Special door types', () => {
    test('cannot close broken door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.BROKEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('The door is broken and cannot be closed.')
      expect(result.turnCount).toBe(0)
      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.BROKEN)
    })

    test('cannot close archway', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.ARCHWAY)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('There is no door to close, only an archway.')
      expect(result.turnCount).toBe(0)
      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.ARCHWAY)
    })
  })

  describe('Monster blocking', () => {
    test('cannot close door with monster in the way', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const monster = createTestMonster({ x: 6, y: 5 })
      const state = createTestState(player, [door], [monster])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('There is a monster in the way!')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.OPEN)
    })

    test('closes door when no monster is blocking', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 6, y: 5 }, DoorState.OPEN)
      const monster = createTestMonster({ x: 10, y: 10 })
      const state = createTestState(player, [door], [monster])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.CLOSED)
      expect(result.messages[0].text).toBe('You close the door.')
      expect(result.turnCount).toBe(1)
    })
  })

  describe('No door present', () => {
    test('reports no door when none exists', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, [])

      const command = new CloseDoorCommand({ x: 1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('There is no door there.')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('Direction handling', () => {
    test('closes door to the left', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 4, y: 5 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: -1, y: 0 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.CLOSED)
    })

    test('closes door above', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 5, y: 4 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 0, y: -1 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.CLOSED)
    })

    test('closes door below', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const door = createTestDoor({ x: 5, y: 6 }, DoorState.OPEN)
      const state = createTestState(player, [door])

      const command = new CloseDoorCommand({ x: 0, y: 1 }, messageService, doorService)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].state).toBe(DoorState.CLOSED)
    })
  })
})
