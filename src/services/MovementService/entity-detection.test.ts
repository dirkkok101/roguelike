import { MovementService } from './MovementService'
import { Level, TileType, Position, Monster, Item, GoldPile } from '@types/core/core'

describe('MovementService - Entity Detection', () => {
  let service: MovementService

  beforeEach(() => {
    service = new MovementService()
  })

  function createTestLevel(): Level {
    const tiles = Array(10)
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
      )

    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
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
  }

  const createTestMonster = (x: number, y: number, letter: string): Monster => ({
    letter,
    position: { x, y },
    hp: 10,
    maxHp: 10,
    attack: 5,
    defense: 2,
    xp: 50,
  })

  const createTestItem = (x: number, y: number): Item => ({
    name: 'Potion',
    position: { x, y },
  })

  const createTestGold = (x: number, y: number, amount: number): GoldPile => ({
    amount,
    position: { x, y },
  })

  describe('getMonsterAt()', () => {
    test('returns monster at position', () => {
      const level = createTestLevel()
      const monster = createTestMonster(5, 5, 'G')
      level.monsters.push(monster)

      const found = service.getMonsterAt({ x: 5, y: 5 }, level)

      expect(found).toBe(monster)
    })

    test('returns undefined when no monster at position', () => {
      const level = createTestLevel()

      const found = service.getMonsterAt({ x: 5, y: 5 }, level)

      expect(found).toBeUndefined()
    })

    test('returns correct monster when multiple monsters exist', () => {
      const level = createTestLevel()
      const monster1 = createTestMonster(3, 3, 'G')
      const monster2 = createTestMonster(5, 5, 'O')
      const monster3 = createTestMonster(7, 7, 'D')
      level.monsters.push(monster1, monster2, monster3)

      const found = service.getMonsterAt({ x: 5, y: 5 }, level)

      expect(found).toBe(monster2)
      expect(found?.letter).toBe('O')
    })

    test('does not return monster at different position', () => {
      const level = createTestLevel()
      const monster = createTestMonster(5, 5, 'G')
      level.monsters.push(monster)

      const found = service.getMonsterAt({ x: 6, y: 5 }, level)

      expect(found).toBeUndefined()
    })

    test('handles empty monster list', () => {
      const level = createTestLevel()

      const found = service.getMonsterAt({ x: 5, y: 5 }, level)

      expect(found).toBeUndefined()
    })

    test('handles edge positions', () => {
      const level = createTestLevel()
      const monster = createTestMonster(0, 0, 'G')
      level.monsters.push(monster)

      const found = service.getMonsterAt({ x: 0, y: 0 }, level)

      expect(found).toBe(monster)
    })
  })

  describe('hasItem()', () => {
    test('returns true when item at position', () => {
      const level = createTestLevel()
      const item = createTestItem(5, 5)
      level.items.push(item)

      const hasItem = service.hasItem({ x: 5, y: 5 }, level)

      expect(hasItem).toBe(true)
    })

    test('returns false when no item at position', () => {
      const level = createTestLevel()

      const hasItem = service.hasItem({ x: 5, y: 5 }, level)

      expect(hasItem).toBe(false)
    })

    test('returns false when item at different position', () => {
      const level = createTestLevel()
      const item = createTestItem(5, 5)
      level.items.push(item)

      const hasItem = service.hasItem({ x: 6, y: 5 }, level)

      expect(hasItem).toBe(false)
    })

    test('returns true when multiple items at same position', () => {
      const level = createTestLevel()
      const item1 = createTestItem(5, 5)
      const item2 = createTestItem(5, 5)
      level.items.push(item1, item2)

      const hasItem = service.hasItem({ x: 5, y: 5 }, level)

      expect(hasItem).toBe(true)
    })

    test('handles items at different positions', () => {
      const level = createTestLevel()
      level.items.push(createTestItem(3, 3))
      level.items.push(createTestItem(5, 5))
      level.items.push(createTestItem(7, 7))

      expect(service.hasItem({ x: 3, y: 3 }, level)).toBe(true)
      expect(service.hasItem({ x: 5, y: 5 }, level)).toBe(true)
      expect(service.hasItem({ x: 7, y: 7 }, level)).toBe(true)
      expect(service.hasItem({ x: 4, y: 4 }, level)).toBe(false)
    })

    test('handles empty item list', () => {
      const level = createTestLevel()

      const hasItem = service.hasItem({ x: 5, y: 5 }, level)

      expect(hasItem).toBe(false)
    })
  })

  describe('hasGold()', () => {
    test('returns true when gold at position', () => {
      const level = createTestLevel()
      const gold = createTestGold(5, 5, 100)
      level.gold.push(gold)

      const hasGold = service.hasGold({ x: 5, y: 5 }, level)

      expect(hasGold).toBe(true)
    })

    test('returns false when no gold at position', () => {
      const level = createTestLevel()

      const hasGold = service.hasGold({ x: 5, y: 5 }, level)

      expect(hasGold).toBe(false)
    })

    test('returns false when gold at different position', () => {
      const level = createTestLevel()
      const gold = createTestGold(5, 5, 100)
      level.gold.push(gold)

      const hasGold = service.hasGold({ x: 6, y: 5 }, level)

      expect(hasGold).toBe(false)
    })

    test('returns true regardless of gold amount', () => {
      const level = createTestLevel()
      level.gold.push(createTestGold(3, 3, 1))
      level.gold.push(createTestGold(5, 5, 100))
      level.gold.push(createTestGold(7, 7, 1000))

      expect(service.hasGold({ x: 3, y: 3 }, level)).toBe(true)
      expect(service.hasGold({ x: 5, y: 5 }, level)).toBe(true)
      expect(service.hasGold({ x: 7, y: 7 }, level)).toBe(true)
    })

    test('handles multiple gold piles at different positions', () => {
      const level = createTestLevel()
      level.gold.push(createTestGold(3, 3, 50))
      level.gold.push(createTestGold(5, 5, 100))
      level.gold.push(createTestGold(7, 7, 150))

      expect(service.hasGold({ x: 3, y: 3 }, level)).toBe(true)
      expect(service.hasGold({ x: 5, y: 5 }, level)).toBe(true)
      expect(service.hasGold({ x: 7, y: 7 }, level)).toBe(true)
      expect(service.hasGold({ x: 4, y: 4 }, level)).toBe(false)
    })

    test('handles empty gold list', () => {
      const level = createTestLevel()

      const hasGold = service.hasGold({ x: 5, y: 5 }, level)

      expect(hasGold).toBe(false)
    })
  })

  describe('entity detection integration', () => {
    test('position can have multiple entity types', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }

      level.monsters.push(createTestMonster(5, 5, 'G'))
      level.items.push(createTestItem(5, 5))
      level.gold.push(createTestGold(5, 5, 100))

      expect(service.getMonsterAt(position, level)).toBeDefined()
      expect(service.hasItem(position, level)).toBe(true)
      expect(service.hasGold(position, level)).toBe(true)
    })

    test('adjacent positions are independent', () => {
      const level = createTestLevel()

      level.monsters.push(createTestMonster(5, 5, 'G'))
      level.items.push(createTestItem(6, 5))
      level.gold.push(createTestGold(5, 6))

      // (5, 5) has monster only
      expect(service.getMonsterAt({ x: 5, y: 5 }, level)).toBeDefined()
      expect(service.hasItem({ x: 5, y: 5 }, level)).toBe(false)
      expect(service.hasGold({ x: 5, y: 5 }, level)).toBe(false)

      // (6, 5) has item only
      expect(service.getMonsterAt({ x: 6, y: 5 }, level)).toBeUndefined()
      expect(service.hasItem({ x: 6, y: 5 }, level)).toBe(true)
      expect(service.hasGold({ x: 6, y: 5 }, level)).toBe(false)

      // (5, 6) has gold only
      expect(service.getMonsterAt({ x: 5, y: 6 }, level)).toBeUndefined()
      expect(service.hasItem({ x: 5, y: 6 }, level)).toBe(false)
      expect(service.hasGold({ x: 5, y: 6 }, level)).toBe(true)
    })

    test('empty position returns no entities', () => {
      const level = createTestLevel()
      const position: Position = { x: 5, y: 5 }

      expect(service.getMonsterAt(position, level)).toBeUndefined()
      expect(service.hasItem(position, level)).toBe(false)
      expect(service.hasGold(position, level)).toBe(false)
    })
  })
})
