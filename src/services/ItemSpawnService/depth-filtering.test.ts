import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { Room, Tile, ItemType } from '@game/core/core'

describe('ItemSpawnService - Depth Filtering', () => {
  let service: ItemSpawnService
  let realRandom: SeededRandom
  let mockItemData: ItemData

  const createMockTiles = (): Tile[][] => {
    const tiles: Tile[][] = []
    for (let y = 0; y < 22; y++) {
      tiles[y] = []
      for (let x = 0; x < 80; x++) {
        tiles[y][x] = { walkable: true, transparent: true, type: 'floor' } as Tile
      }
    }
    return tiles
  }

  const createTestRooms = (count: number): Room[] => {
    const rooms: Room[] = []
    for (let i = 0; i < count; i++) {
      rooms.push({
        x: 10 + i * 20,
        y: 10,
        width: 15,
        height: 10,
        doors: [],
        connected: true
      })
    }
    return rooms
  }

  beforeEach(() => {
    realRandom = new SeededRandom('test-seed-' + Date.now())
    mockItemData = {
      weapons: [{ name: 'Dagger', spriteName: 'dagger', damage: '1d4', rarity: 'common' }],
      armor: [{ name: 'Leather Armor', spriteName: 'leather', ac: 2, rarity: 'common' }],
      potions: [
        { type: 'MINOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '5d8', rarity: 'common', minDepth: 1, maxDepth: 10, descriptors: [] },
        { type: 'MEDIUM_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '8d10', rarity: 'uncommon', minDepth: 8, maxDepth: 18, descriptors: [] },
        { type: 'MAJOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '12d10', rarity: 'uncommon', minDepth: 15, maxDepth: 27, descriptors: [] },
        { type: 'SUPERIOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '15d12', rarity: 'rare', minDepth: 20, maxDepth: 27, descriptors: [] }
      ],
      scrolls: [{ type: 'IDENTIFY', spriteName: 'scroll', effect: 'identify', rarity: 'common' }],
      rings: [{ type: 'PROTECTION', spriteName: 'ring', effect: 'ac_bonus', rarity: 'uncommon' }],
      wands: [{ type: 'MAGIC_MISSILE', spriteName: 'wand', damage: '1d6', charges: '3d3', rarity: 'uncommon' }],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: '900', rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 500, isPermanent: false, rarity: 'common' },
        { type: 'lantern', name: 'Lantern', spriteName: 'lantern', radius: 2, fuel: 750, isPermanent: false, rarity: 'uncommon' }
      ],
      consumables: [{ name: 'Oil Flask', spriteName: 'flask', type: 'lantern_fuel', fuelAmount: 600, rarity: 'common' }]
    }
    service = new ItemSpawnService(realRandom, mockItemData)
  })

  test('depth 1 only spawns MINOR_HEAL potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 1)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)
    potions.forEach(potion => {
      expect(potion.name).toContain('MINOR_HEAL') // Should only be Minor Heal
    })
  })

  test('depth 10 does not spawn MINOR_HEAL (maxDepth reached)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 10)
    const potions = items.filter(i => i.type === ItemType.POTION)

    potions.forEach(potion => {
      expect(potion.name).not.toContain('MINOR_HEAL') // No Minor Heal at depth 10
    })
  })

  test('depth 13 spawns only MEDIUM_HEAL potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 13)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)
    potions.forEach(potion => {
      expect(potion.name).toContain('MEDIUM_HEAL') // Only Medium at depth 13
    })
  })

  test('depth 20 spawns MAJOR and SUPERIOR potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 20)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)

    const hasMajor = potions.some(p => p.name.includes('MAJOR_HEAL'))
    const hasSuperior = potions.some(p => p.name.includes('SUPERIOR_HEAL'))

    expect(hasMajor || hasSuperior).toBe(true)
  })

  test('depth 26 spawns MAJOR and SUPERIOR potions (no low-tier)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 26)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)

    potions.forEach(potion => {
      expect(potion.name).not.toContain('MINOR_HEAL')
      expect(potion.name).not.toContain('MEDIUM_HEAL')
    })
  })
})
