import { DoorService } from './DoorService'
import { Level, Door, DoorState, TileType } from '@game/core/core'

describe('DoorService - Door Opening', () => {
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
      state: DoorState.CLOSED,
      discovered: true,
      orientation: 'horizontal',
      connectsRooms: [1, 2],
      ...overrides,
    }
  }

  describe('openDoor', () => {
    test('updates door state to OPEN', () => {
      const door = createTestDoor({ state: DoorState.CLOSED })
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      const openedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(openedDoor?.state).toBe(DoorState.OPEN)
    })

    test('updates tile char to open door symbol', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      expect(result.tiles[5][5].char).toBe("'")
    })

    test('makes tile walkable', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      expect(result.tiles[5][5].walkable).toBe(true)
    })

    test('makes tile transparent for FOV', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      expect(result.tiles[5][5].transparent).toBe(true)
    })

    test('does not mutate original level', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.openDoor(level, door)

      expect(level.doors[0].state).toBe(DoorState.CLOSED)
    })

    test('does not mutate original door', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.openDoor(level, door)

      expect(door.state).toBe(DoorState.CLOSED)
    })

    test('preserves other doors unchanged', () => {
      const door1 = createTestDoor({ position: { x: 3, y: 3 }, state: DoorState.CLOSED })
      const door2 = createTestDoor({ position: { x: 7, y: 7 }, state: DoorState.LOCKED })
      const level = createTestLevel([door1, door2])

      const result = service.openDoor(level, door1)

      expect(result.doors[0].state).toBe(DoorState.OPEN)
      expect(result.doors[1].state).toBe(DoorState.LOCKED)
    })

    test('preserves door orientation', () => {
      const door = createTestDoor({ orientation: 'vertical' })
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      const openedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(openedDoor?.orientation).toBe('vertical')
    })

    test('preserves room connections', () => {
      const door = createTestDoor({ connectsRooms: [3, 5] })
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      const openedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(openedDoor?.connectsRooms).toEqual([3, 5])
    })

    test('opens discovered secret door', () => {
      const door = createTestDoor({ state: DoorState.SECRET, discovered: true })
      const level = createTestLevel([door])

      const result = service.openDoor(level, door)

      const openedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(openedDoor?.state).toBe(DoorState.OPEN)
    })
  })
})
