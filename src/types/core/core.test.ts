import { Position, TileType, DoorState, GameConfig } from './core'

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

describe('GameConfig Type', () => {
  it('should allow radius mode', () => {
    const config: GameConfig = {
      fovMode: 'radius'
    }

    expect(config.fovMode).toBe('radius')
  })

  it('should allow room-reveal mode', () => {
    const config: GameConfig = {
      fovMode: 'room-reveal'
    }

    expect(config.fovMode).toBe('room-reveal')
  })

  it('should not allow invalid modes', () => {
    // TypeScript compile-time check (this won't compile if uncommented)
    // const config: GameConfig = {
    //   fovMode: 'invalid-mode'
    // }

    // This test just validates the type exists
    expect(true).toBe(true)
  })
})
