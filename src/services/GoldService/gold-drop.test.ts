import { GoldService } from './GoldService'
import { MockRandom } from '@services/RandomService'
import { Position } from '@game/core/core'

describe('GoldService - Gold Drop', () => {
  let service: GoldService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new GoldService(mockRandom)
  })

  describe('dropGold()', () => {
    test('creates gold pile with specified amount and position', () => {
      const position: Position = { x: 15, y: 20 }
      const amount = 100

      const goldPile = service.dropGold(position, amount)

      expect(goldPile.position).toEqual(position)
      expect(goldPile.amount).toBe(amount)
    })

    test('creates gold pile with small amount', () => {
      const position: Position = { x: 5, y: 5 }
      const amount = 1

      const goldPile = service.dropGold(position, amount)

      expect(goldPile.position).toEqual(position)
      expect(goldPile.amount).toBe(1)
    })

    test('creates gold pile with large amount', () => {
      const position: Position = { x: 50, y: 50 }
      const amount = 9999

      const goldPile = service.dropGold(position, amount)

      expect(goldPile.position).toEqual(position)
      expect(goldPile.amount).toBe(9999)
    })

    test('creates multiple distinct gold piles', () => {
      const pile1 = service.dropGold({ x: 1, y: 1 }, 10)
      const pile2 = service.dropGold({ x: 2, y: 2 }, 20)
      const pile3 = service.dropGold({ x: 3, y: 3 }, 30)

      expect(pile1.amount).toBe(10)
      expect(pile2.amount).toBe(20)
      expect(pile3.amount).toBe(30)

      expect(pile1.position).toEqual({ x: 1, y: 1 })
      expect(pile2.position).toEqual({ x: 2, y: 2 })
      expect(pile3.position).toEqual({ x: 3, y: 3 })
    })

    test('gold pile has correct structure', () => {
      const goldPile = service.dropGold({ x: 10, y: 10 }, 50)

      expect(goldPile).toHaveProperty('position')
      expect(goldPile).toHaveProperty('amount')
      expect(typeof goldPile.position.x).toBe('number')
      expect(typeof goldPile.position.y).toBe('number')
      expect(typeof goldPile.amount).toBe('number')
    })

    test('position is stored by value (not reference)', () => {
      const position: Position = { x: 10, y: 10 }
      const goldPile = service.dropGold(position, 50)

      // Mutate original position
      position.x = 99
      position.y = 99

      // Gold pile should have original values
      expect(goldPile.position.x).toBe(10)
      expect(goldPile.position.y).toBe(10)
    })
  })
})
