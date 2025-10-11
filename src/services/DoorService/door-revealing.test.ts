import { DoorService } from './DoorService'
import { Level, Door, DoorState, TileType } from '@game/core/core'

describe('DoorService - Secret Door Revealing', () => {
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
      state: DoorState.SECRET,
      discovered: false,
      orientation: 'horizontal',
      connectsRooms: [1, 2],
      ...overrides,
    }
  }

  describe('revealSecretDoor', () => {
    test('marks secret door as discovered', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      const revealedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(revealedDoor?.discovered).toBe(true)
    })

    test('updates tile char to closed door symbol', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      expect(result.tiles[5][5].char).toBe('+')
    })

    test('makes tile walkable', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      expect(result.tiles[5][5].walkable).toBe(true)
    })

    test('makes tile opaque for FOV', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      expect(result.tiles[5][5].transparent).toBe(false)
    })

    test('does not mutate original level', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.revealSecretDoor(level, door)

      expect(level.doors[0].discovered).toBe(false)
    })

    test('does not mutate original door', () => {
      const door = createTestDoor()
      const level = createTestLevel([door])

      service.revealSecretDoor(level, door)

      expect(door.discovered).toBe(false)
    })

    test('transitions door state from SECRET to CLOSED', () => {
      const door = createTestDoor({ state: DoorState.SECRET })
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      const revealedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(revealedDoor?.state).toBe(DoorState.CLOSED)
    })

    test('preserves door orientation', () => {
      const door = createTestDoor({ orientation: 'vertical' })
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      const revealedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(revealedDoor?.orientation).toBe('vertical')
    })

    test('preserves room connections', () => {
      const door = createTestDoor({ connectsRooms: [4, 7] })
      const level = createTestLevel([door])

      const result = service.revealSecretDoor(level, door)

      const revealedDoor = result.doors.find(
        (d) => d.position.x === 5 && d.position.y === 5
      )
      expect(revealedDoor?.connectsRooms).toEqual([4, 7])
    })

    test('preserves other doors unchanged', () => {
      const door1 = createTestDoor({ position: { x: 3, y: 3 } })
      const door2 = createTestDoor({ position: { x: 7, y: 7 } })
      const level = createTestLevel([door1, door2])

      const result = service.revealSecretDoor(level, door1)

      expect(result.doors[0].discovered).toBe(true)
      expect(result.doors[1].discovered).toBe(false)
    })

    test('reveals door at correct position', () => {
      const door1 = createTestDoor({ position: { x: 2, y: 2 } })
      const door2 = createTestDoor({ position: { x: 8, y: 8 } })
      const level = createTestLevel([door1, door2])

      const result = service.revealSecretDoor(level, door2)

      expect(result.tiles[2][2].char).toBe('.')
      expect(result.tiles[8][8].char).toBe('+')
    })
  })
})
