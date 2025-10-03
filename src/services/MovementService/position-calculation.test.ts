import { MovementService } from './MovementService'
import { Position, Player } from '@game/core/core'

describe('MovementService - Position Calculation', () => {
  let service: MovementService

  beforeEach(() => {
    service = new MovementService()
  })

  describe('applyDirection()', () => {
    test('calculates up direction correctly', () => {
      const position: Position = { x: 5, y: 5 }

      const newPosition = service.applyDirection(position, 'up')

      expect(newPosition).toEqual({ x: 5, y: 4 })
    })

    test('calculates down direction correctly', () => {
      const position: Position = { x: 5, y: 5 }

      const newPosition = service.applyDirection(position, 'down')

      expect(newPosition).toEqual({ x: 5, y: 6 })
    })

    test('calculates left direction correctly', () => {
      const position: Position = { x: 5, y: 5 }

      const newPosition = service.applyDirection(position, 'left')

      expect(newPosition).toEqual({ x: 4, y: 5 })
    })

    test('calculates right direction correctly', () => {
      const position: Position = { x: 5, y: 5 }

      const newPosition = service.applyDirection(position, 'right')

      expect(newPosition).toEqual({ x: 6, y: 5 })
    })

    test('does not mutate original position', () => {
      const position: Position = { x: 5, y: 5 }

      service.applyDirection(position, 'up')

      expect(position).toEqual({ x: 5, y: 5 })
    })

    test('handles position at origin', () => {
      const position: Position = { x: 0, y: 0 }

      expect(service.applyDirection(position, 'up')).toEqual({ x: 0, y: -1 })
      expect(service.applyDirection(position, 'left')).toEqual({ x: -1, y: 0 })
    })

    test('handles large coordinate values', () => {
      const position: Position = { x: 100, y: 100 }

      expect(service.applyDirection(position, 'up')).toEqual({ x: 100, y: 99 })
      expect(service.applyDirection(position, 'down')).toEqual({
        x: 100,
        y: 101,
      })
      expect(service.applyDirection(position, 'left')).toEqual({ x: 99, y: 100 })
      expect(service.applyDirection(position, 'right')).toEqual({
        x: 101,
        y: 100,
      })
    })

    test('multiple movements in sequence', () => {
      let position: Position = { x: 5, y: 5 }

      position = service.applyDirection(position, 'up')
      expect(position).toEqual({ x: 5, y: 4 })

      position = service.applyDirection(position, 'right')
      expect(position).toEqual({ x: 6, y: 4 })

      position = service.applyDirection(position, 'down')
      expect(position).toEqual({ x: 6, y: 5 })

      position = service.applyDirection(position, 'left')
      expect(position).toEqual({ x: 5, y: 5 })
    })
  })

  describe('movePlayer()', () => {
    const createTestPlayer = (): Player => ({
      position: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 5,
      gold: 0,
      xp: 0,
      level: 1,
      lightSource: null,
      inventory: [],
    })

    test('moves player to new position', () => {
      const player = createTestPlayer()
      const newPosition: Position = { x: 6, y: 5 }

      const movedPlayer = service.movePlayer(player, newPosition)

      expect(movedPlayer.position).toEqual(newPosition)
    })

    test('does not mutate original player', () => {
      const player = createTestPlayer()
      const originalPosition = { ...player.position }
      const newPosition: Position = { x: 6, y: 5 }

      service.movePlayer(player, newPosition)

      expect(player.position).toEqual(originalPosition)
    })

    test('returns new player object', () => {
      const player = createTestPlayer()
      const newPosition: Position = { x: 6, y: 5 }

      const movedPlayer = service.movePlayer(player, newPosition)

      expect(movedPlayer).not.toBe(player)
    })

    test('preserves all other player properties', () => {
      const player = createTestPlayer()
      const newPosition: Position = { x: 6, y: 5 }

      const movedPlayer = service.movePlayer(player, newPosition)

      expect(movedPlayer.hp).toBe(player.hp)
      expect(movedPlayer.maxHp).toBe(player.maxHp)
      expect(movedPlayer.attack).toBe(player.attack)
      expect(movedPlayer.defense).toBe(player.defense)
      expect(movedPlayer.gold).toBe(player.gold)
      expect(movedPlayer.xp).toBe(player.xp)
      expect(movedPlayer.level).toBe(player.level)
      expect(movedPlayer.lightSource).toBe(player.lightSource)
      expect(movedPlayer.inventory).toBe(player.inventory)
    })

    test('moves player to any valid position', () => {
      const player = createTestPlayer()

      const movedPlayer1 = service.movePlayer(player, { x: 0, y: 0 })
      expect(movedPlayer1.position).toEqual({ x: 0, y: 0 })

      const movedPlayer2 = service.movePlayer(player, { x: 99, y: 99 })
      expect(movedPlayer2.position).toEqual({ x: 99, y: 99 })
    })
  })

  describe('movement integration', () => {
    test('applyDirection and movePlayer work together', () => {
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        gold: 0,
        xp: 0,
        level: 1,
        lightSource: null,
        inventory: [],
      }

      const newPosition = service.applyDirection(player.position, 'up')
      const movedPlayer = service.movePlayer(player, newPosition)

      expect(movedPlayer.position).toEqual({ x: 5, y: 4 })
      expect(player.position).toEqual({ x: 5, y: 5 }) // Original unchanged
    })

    test('chain multiple moves', () => {
      let player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        gold: 0,
        xp: 0,
        level: 1,
        lightSource: null,
        inventory: [],
      }

      // Move up
      player = service.movePlayer(
        player,
        service.applyDirection(player.position, 'up')
      )
      expect(player.position).toEqual({ x: 5, y: 4 })

      // Move right
      player = service.movePlayer(
        player,
        service.applyDirection(player.position, 'right')
      )
      expect(player.position).toEqual({ x: 6, y: 4 })

      // Move down
      player = service.movePlayer(
        player,
        service.applyDirection(player.position, 'down')
      )
      expect(player.position).toEqual({ x: 6, y: 5 })

      // Move left
      player = service.movePlayer(
        player,
        service.applyDirection(player.position, 'left')
      )
      expect(player.position).toEqual({ x: 5, y: 5 })
    })
  })
})
