import { RenderingService } from './RenderingService'
import { FOVService } from '@services/FOVService'
import { Tile, TileType, Monster, Item, GoldPile } from '@game/core/core'

describe('RenderingService - Colors', () => {
  let service: RenderingService
  let fovService: FOVService

  beforeEach(() => {
    fovService = new FOVService()
    service = new RenderingService(fovService)
  })

  const createTestTile = (): Tile => ({
    type: TileType.FLOOR,
    char: '.',
    walkable: true,
    transparent: true,
    colorVisible: '#FFFFFF',
    colorExplored: '#808080',
  })

  const createTestMonster = (letter: string): Monster => ({
    letter,
    position: { x: 5, y: 5 },
    hp: 10,
    maxHp: 10,
    attack: 5,
    defense: 2,
    xp: 50,
  })

  const createTestItem = (): Item => ({
    name: 'Potion',
    position: { x: 5, y: 5 },
  })

  const createTestGold = (): GoldPile => ({
    amount: 100,
    position: { x: 5, y: 5 },
  })

  describe('getColorForTile()', () => {
    test('returns visible color when visible', () => {
      const tile = createTestTile()

      const color = service.getColorForTile(tile, 'visible')

      expect(color).toBe('#FFFFFF')
    })

    test('returns explored color when explored', () => {
      const tile = createTestTile()

      const color = service.getColorForTile(tile, 'explored')

      expect(color).toBe('#808080')
    })

    test('returns black when unexplored', () => {
      const tile = createTestTile()

      const color = service.getColorForTile(tile, 'unexplored')

      expect(color).toBe('#000000')
    })

    test('uses tile-specific colors', () => {
      const wall: Tile = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#8B7355',
        colorExplored: '#4A4A4A',
      }

      expect(service.getColorForTile(wall, 'visible')).toBe('#8B7355')
      expect(service.getColorForTile(wall, 'explored')).toBe('#4A4A4A')
    })
  })

  describe('getColorForEntity() - visibility', () => {
    test('returns black for unexplored entities', () => {
      const monster = createTestMonster('A')

      const color = service.getColorForEntity(monster, 'unexplored')

      expect(color).toBe('#000000')
    })

    test('returns gray for explored entities', () => {
      const monster = createTestMonster('A')

      const color = service.getColorForEntity(monster, 'explored')

      expect(color).toBe('#707070')
    })

    test('returns entity color for visible entities', () => {
      const gold = createTestGold()

      const color = service.getColorForEntity(gold, 'visible')

      expect(color).toBe('#FFD700') // Gold color
    })
  })

  describe('getColorForEntity() - monsters', () => {
    test('colors low-threat monsters green', () => {
      const monster = createTestMonster('A') // First letter = low threat

      const color = service.getColorForEntity(monster, 'visible')

      expect(color).toBe('#44FF44')
    })

    test('colors medium-threat monsters yellow', () => {
      const monster = createTestMonster('H') // Mid-alphabet = medium threat

      const color = service.getColorForEntity(monster, 'visible')

      expect(color).toBe('#FFDD00')
    })

    test('colors high-threat monsters orange', () => {
      const monster = createTestMonster('Q') // Upper alphabet = high threat

      const color = service.getColorForEntity(monster, 'visible')

      expect(color).toBe('#FF8800')
    })

    test('colors boss-tier monsters red', () => {
      const monster = createTestMonster('Z') // Last letter = boss

      const color = service.getColorForEntity(monster, 'visible')

      expect(color).toBe('#FF4444')
    })

    test('threat color scales with letter position', () => {
      const monsterA = createTestMonster('A')
      const monsterM = createTestMonster('M')
      const monsterZ = createTestMonster('Z')

      const colorA = service.getColorForEntity(monsterA, 'visible')
      const colorM = service.getColorForEntity(monsterM, 'visible')
      const colorZ = service.getColorForEntity(monsterZ, 'visible')

      // Each should be different, showing threat progression
      expect(colorA).not.toBe(colorM)
      expect(colorM).not.toBe(colorZ)
      expect(colorA).not.toBe(colorZ)
    })
  })

  describe('getColorForEntity() - gold', () => {
    test('returns gold color for visible gold', () => {
      const gold = createTestGold()

      const color = service.getColorForEntity(gold, 'visible')

      expect(color).toBe('#FFD700')
    })

    test('returns gray for explored gold', () => {
      const gold = createTestGold()

      const color = service.getColorForEntity(gold, 'explored')

      expect(color).toBe('#707070')
    })
  })

  describe('getColorForEntity() - items', () => {
    test('returns white for visible items', () => {
      const item = createTestItem()

      const color = service.getColorForEntity(item, 'visible')

      expect(color).toBe('#FFFFFF')
    })

    test('returns gray for explored items', () => {
      const item = createTestItem()

      const color = service.getColorForEntity(item, 'explored')

      expect(color).toBe('#707070')
    })
  })

  describe('getCSSClass()', () => {
    test('returns base class for visibility state', () => {
      const cssClass = service.getCSSClass('visible')

      expect(cssClass).toBe('tile-visible')
    })

    test('returns class with entity type', () => {
      const cssClass = service.getCSSClass('visible', 'monster')

      expect(cssClass).toBe('tile-visible monster')
    })

    test('handles all visibility states', () => {
      expect(service.getCSSClass('visible')).toBe('tile-visible')
      expect(service.getCSSClass('explored')).toBe('tile-explored')
      expect(service.getCSSClass('unexplored')).toBe('tile-unexplored')
    })

    test('combines state and entity type correctly', () => {
      expect(service.getCSSClass('explored', 'item')).toBe('tile-explored item')
      expect(service.getCSSClass('visible', 'gold')).toBe('tile-visible gold')
    })
  })
})
