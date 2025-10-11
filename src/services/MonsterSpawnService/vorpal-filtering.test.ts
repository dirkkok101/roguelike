import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService'

// Mock monster data with vorpalness values from Task 1.2
const mockMonsterData = [
  {
    letter: 'B',
    name: 'Bat',
    spriteName: 'Fruit bat',
    hp: '1d8',
    ac: 3,
    damage: '1d2',
    xpValue: 1,
    level: 1,
    speed: 15,
    rarity: 'common',
    mean: false,
    vorpalness: 1,
    aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 0, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'S',
    name: 'Snake',
    spriteName: 'Large white snake',
    hp: '1d8',
    ac: 5,
    damage: '1d3',
    xpValue: 2,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    vorpalness: 1,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 4, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'E',
    name: 'Emu',
    spriteName: 'White harpy',
    hp: '1d8',
    ac: 7,
    damage: '1d2',
    xpValue: 2,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    vorpalness: 2,
    aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 4, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'H',
    name: 'Hobgoblin',
    spriteName: 'Large kobold',
    hp: '1d8',
    ac: 5,
    damage: '1d8',
    xpValue: 3,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    vorpalness: 3,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 4, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'K',
    name: 'Kestrel',
    spriteName: 'Giant roc',
    hp: '1d8',
    ac: 7,
    damage: '1d4',
    xpValue: 4,
    level: 2,
    speed: 15,
    rarity: 'common',
    mean: true,
    vorpalness: 5,
    aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 0, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'Y',
    name: 'Yeti',
    spriteName: 'Yeti',
    hp: '4d8',
    ac: 6,
    damage: '1d6+1d6',
    xpValue: 35,
    level: 4,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    vorpalness: 13,
    aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 5, fleeThreshold: 0.15, special: [] },
  },
  {
    letter: 'A',
    name: 'Aquator',
    spriteName: 'Water elemental',
    hp: '5d8',
    ac: 2,
    damage: '0d0',
    xpValue: 50,
    level: 5,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    vorpalness: 14,
    aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 4, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'N',
    name: 'Nymph',
    spriteName: 'Master thief',
    hp: '3d8',
    ac: 9,
    damage: '0d0',
    xpValue: 80,
    level: 6,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    vorpalness: 13,
    aiProfile: { behavior: 'THIEF', intelligence: 7, aggroRange: 7, fleeThreshold: 1.0, special: [] },
  },
  {
    letter: 'D',
    name: 'Dragon',
    spriteName: 'Baby blue dragon',
    hp: '10d8',
    ac: -1,
    damage: '1d8+3d10',
    xpValue: 5000,
    level: 10,
    speed: 18,
    rarity: 'rare',
    mean: true,
    vorpalness: 24,
    aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 10, fleeThreshold: 0.15, special: [] },
  },
  {
    letter: 'W',
    name: 'Wraith',
    spriteName: 'White wraith',
    hp: '5d8',
    ac: 4,
    damage: '1d6',
    xpValue: 200,
    level: 7,
    speed: 12,
    rarity: 'rare',
    mean: false,
    vorpalness: 20,
    aiProfile: { behavior: 'SMART', intelligence: 6, aggroRange: 7, fleeThreshold: 0.25, special: [] },
  },
  {
    letter: 'M',
    name: 'Medusa',
    spriteName: 'gorgon',
    hp: '8d8',
    ac: 2,
    damage: '3d4+3d4+2d5',
    xpValue: 500,
    level: 8,
    speed: 12,
    rarity: 'rare',
    mean: false,
    vorpalness: 21,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 8, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'P',
    name: 'Phantom',
    spriteName: 'Phantom',
    hp: '8d8',
    ac: 3,
    damage: '4d4',
    xpValue: 400,
    level: 8,
    speed: 15,
    rarity: 'rare',
    mean: false,
    vorpalness: 21,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 8, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'V',
    name: 'Vampire',
    spriteName: 'Vampire',
    hp: '8d8',
    ac: 1,
    damage: '1d10',
    xpValue: 800,
    level: 8,
    speed: 15,
    rarity: 'rare',
    mean: false,
    vorpalness: 22,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 8, fleeThreshold: 0.3, special: [] },
  },
  {
    letter: 'X',
    name: 'Umber Hulk',
    spriteName: 'Umber Hulk',
    hp: '8d8',
    ac: 2,
    damage: '3d4+3d4+2d5',
    xpValue: 900,
    level: 8,
    speed: 12,
    rarity: 'rare',
    mean: false,
    vorpalness: 22,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 8, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'I',
    name: 'Ice Monster',
    spriteName: 'Ice elemental',
    hp: '1d8',
    ac: 9,
    damage: '0d0',
    xpValue: 20,
    level: 5,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    vorpalness: 22,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 4, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'U',
    name: 'Ur-vile',
    spriteName: 'Bile Demon',
    hp: '7d8',
    ac: -2,
    damage: '1d9+1d9+2d9',
    xpValue: 1500,
    level: 9,
    speed: 15,
    rarity: 'rare',
    mean: true,
    vorpalness: 23,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 8, fleeThreshold: 0.15, special: [] },
  },
  {
    letter: 'G',
    name: 'Griffin',
    spriteName: 'Manticore',
    hp: '13d8',
    ac: 2,
    damage: '4d3+3d5',
    xpValue: 6000,
    level: 10,
    speed: 18,
    rarity: 'rare',
    mean: true,
    vorpalness: 24,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.1, special: [] },
  },
  {
    letter: 'J',
    name: 'Jabberwock',
    spriteName: 'Jabberwock',
    hp: '15d8',
    ac: 6,
    damage: '2d12+2d4',
    xpValue: 7000,
    level: 10,
    speed: 18,
    rarity: 'rare',
    mean: true,
    vorpalness: 25,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.1, special: [] },
  },
]

describe('MonsterSpawnService - Vorpal Filtering', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)

    // Save original fetch
    originalFetch = global.fetch

    // Mock fetch to return monster data with vorpalness
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMonsterData,
    } as Response)

    // Load monster data
    await service.loadMonsterData()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe('filterByVorpalRange', () => {
    it('should return only monsters within vorpal range for depth 1 (range [0, 4])', () => {
      // Arrange
      const minVorpal = 0
      const maxVorpal = 4

      // Act
      const result = service.filterByVorpalRange(minVorpal, maxVorpal)

      // Assert
      expect(result.length).toBeGreaterThan(0)
      result.forEach(monster => {
        expect(monster.vorpalness).toBeGreaterThanOrEqual(minVorpal)
        expect(monster.vorpalness).toBeLessThanOrEqual(maxVorpal)
      })

      // Verify specific monsters are included (from Task 1.2 vorpalness values)
      const names = result.map(m => m.name)
      expect(names).toContain('Bat') // vorpalness 1
      expect(names).toContain('Snake') // vorpalness 1
      expect(names).toContain('Emu') // vorpalness 2
      expect(names).toContain('Hobgoblin') // vorpalness 3

      // Verify exclusions
      expect(names).not.toContain('Kestrel') // vorpalness 5 (too high)
    })

    it('should return only monsters within vorpal range for depth 10 (range [4, 13])', () => {
      // Arrange
      const minVorpal = 4
      const maxVorpal = 13

      // Act
      const result = service.filterByVorpalRange(minVorpal, maxVorpal)

      // Assert
      expect(result.length).toBeGreaterThan(0)
      result.forEach(monster => {
        expect(monster.vorpalness).toBeGreaterThanOrEqual(minVorpal)
        expect(monster.vorpalness).toBeLessThanOrEqual(maxVorpal)
      })

      // Verify exclusions
      const names = result.map(m => m.name)
      expect(names).not.toContain('Bat') // vorpalness 1 (too low)
      expect(names).not.toContain('Snake') // vorpalness 1 (too low)
      expect(names).not.toContain('Emu') // vorpalness 2 (too low)
      expect(names).not.toContain('Hobgoblin') // vorpalness 3 (too low)
      expect(names).not.toContain('Aquator') // vorpalness 14 (too high)
      expect(names).not.toContain('Dragon') // vorpalness 24 (too high)
      expect(names).not.toContain('Jabberwock') // vorpalness 25 (too high)

      // Verify inclusions at boundaries
      expect(names).toContain('Kestrel') // vorpalness 5 is in range [4, 13]
      expect(names).toContain('Yeti') // vorpalness 13 (max boundary)
      expect(names).toContain('Nymph') // vorpalness 13 (max boundary)
    })

    it('should return only boss monsters for depth 26 (range [20, 25])', () => {
      // Arrange
      const minVorpal = 20
      const maxVorpal = 25

      // Act
      const result = service.filterByVorpalRange(minVorpal, maxVorpal)

      // Assert
      expect(result.length).toBeGreaterThan(0)
      result.forEach(monster => {
        expect(monster.vorpalness).toBeGreaterThanOrEqual(minVorpal)
        expect(monster.vorpalness).toBeLessThanOrEqual(maxVorpal)
      })

      // Verify specific boss monsters are included
      const names = result.map(m => m.name)
      expect(names).toContain('Wraith') // vorpalness 20
      expect(names).toContain('Medusa') // vorpalness 21
      expect(names).toContain('Phantom') // vorpalness 21
      expect(names).toContain('Vampire') // vorpalness 22
      expect(names).toContain('Umber Hulk') // vorpalness 22
      expect(names).toContain('Ice Monster') // vorpalness 22
      expect(names).toContain('Ur-vile') // vorpalness 23
      expect(names).toContain('Dragon') // vorpalness 24
      expect(names).toContain('Griffin') // vorpalness 24
      expect(names).toContain('Jabberwock') // vorpalness 25

      // Verify lower level monsters are excluded
      expect(names).not.toContain('Bat') // vorpalness 1 (too low)
      expect(names).not.toContain('Yeti') // vorpalness 13 (too low)
    })

    it('should return empty array if no monsters in range', () => {
      // Arrange
      const minVorpal = 26 // Above max vorpalness
      const maxVorpal = 30

      // Act
      const result = service.filterByVorpalRange(minVorpal, maxVorpal)

      // Assert
      expect(result).toEqual([])
      expect(result.length).toBe(0)
    })

    it('should throw error if monster data not loaded', async () => {
      // Arrange
      const freshService = new MonsterSpawnService(mockRandom)
      // Don't call loadMonsterData()

      // Act & Assert
      expect(() => {
        freshService.filterByVorpalRange(0, 4)
      }).toThrow('Monster data not loaded. Call loadMonsterData() first.')
    })
  })
})
