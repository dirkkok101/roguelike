import { Position, TileType, DoorState } from '@types/core'

describe('Core Types', () => {
  test('Position type works', () => {
    const pos: Position = { x: 5, y: 10 }
    expect(pos.x).toBe(5)
    expect(pos.y).toBe(10)
  })

  test('TileType enum works', () => {
    expect(TileType.WALL).toBe('WALL')
    expect(TileType.FLOOR).toBe('FLOOR')
  })

  test('DoorState enum works', () => {
    expect(DoorState.OPEN).toBe('OPEN')
    expect(DoorState.CLOSED).toBe('CLOSED')
  })
})
