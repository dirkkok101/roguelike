import { DoorService } from './DoorService'
import { Level, Door, DoorState, TileType } from '@game/core/core'

describe('DoorService - Door Closing', () => {
  let service: DoorService

  beforeEach(() => {
    service = new DoorService()
  })

  function createTestLevel(doors: Door[]): Level {
    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          })
        ),
      rooms: [],
      doors,
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }
  }

  function createTestDoor(overrides: Partial<Door> = {}): Door {
    return {
      position: { x: 5, y: 5 },
      state: DoorState.OPEN,
      discovered: true,
      orientation: 'horizontal',
      connectsRooms: [1, 2],
      ...overrides,
    }
  }

  describe('closeDoor', () => {
    test('updates door state to CLOSED', () => {
      const door = createTestDoor({ state: DoorState.OPEN })
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      const closedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(closedDoor?.state).toBe(DoorState.CLOSED)
    })

    test('updates tile char to closed door symbol', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      expect(result.tiles[5][5].char).toBe('+')
    })

    test('keeps tile walkable', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      expect(result.tiles[5][5].walkable).toBe(true)
    })

    test('makes tile opaque for FOV', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      expect(result.tiles[5][5].transparent).toBe(false)
    })

    test('does not mutate original level', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.closeDoor(level, door)

      expect(level.doors[0].state).toBe(DoorState.OPEN)
    })

    test('does not mutate original door', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.closeDoor(level, door)

      expect(door.state).toBe(DoorState.OPEN)
    })

    test('preserves other doors unchanged', () => {
      const door1 = createTestDoor({ position: { x: 3, y: 3 }, state: DoorState.OPEN })
      const door2 = createTestDoor({ position: { x: 7, y: 7 }, state: DoorState.BROKEN })
      const level = createTestLevel([door1, door2])

      const result = service.closeDoor(level, door1)

      expect(result.doors[0].state).toBe(DoorState.CLOSED)
      expect(result.doors[1].state).toBe(DoorState.BROKEN)
    })

    test('preserves door orientation', () => {
      const door = createTestDoor({ orientation: 'vertical' })
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      const closedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(closedDoor?.orientation).toBe('vertical')
    })

    test('preserves room connections', () => {
      const door = createTestDoor({ connectsRooms: [3, 5] })
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      const closedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(closedDoor?.connectsRooms).toEqual([3, 5])
    })

    test('preserves discovered status', () => {
      const door = createTestDoor({ discovered: false })
      const level = createTestLevel([door])

      const result = service.closeDoor(level, door)

      const closedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(closedDoor?.discovered).toBe(false)
    })
  })
})
