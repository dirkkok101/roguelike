import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService'
import { MonsterTemplate } from '@game/core/core'

// Mock monster data with all 26 letters for testing
const mockMonsterData = [
  {
    letter: 'A',
    name: 'Aquator',
      spriteName: 'Aquator',
    hp: '5d8',
    ac: 2,
    damage: '0d0',
    xpValue: 50,
    level: 5,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 7, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'B',
    name: 'Bat',
      spriteName: 'Bat',
    hp: '1d8',
    ac: 3,
    damage: '1d2',
    xpValue: 1,
    level: 1,
    speed: 15,
    rarity: 'common',
    mean: false,
    aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 8, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'C',
    name: 'Centaur',
      spriteName: 'Centaur',
    hp: '4d8',
    ac: 4,
    damage: '1d2+1d5+1d5',
    xpValue: 30,
    level: 4,
    speed: 12,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'SMART', intelligence: 6, aggroRange: 10, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'D',
    name: 'Dragon',
      spriteName: 'Dragon',
    hp: '10d8',
    ac: -1,
    damage: '1d8+3d10',
    xpValue: 5000,
    level: 10,
    speed: 18,
    rarity: 'rare',
    mean: true,
    aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 15, fleeThreshold: 0.15, special: [] },
  },
  {
    letter: 'E',
    name: 'Emu',
      spriteName: 'Emu',
    hp: '1d8',
    ac: 7,
    damage: '1d2',
    xpValue: 2,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 6, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'F',
    name: 'Venus Flytrap',
      spriteName: 'Venus Flytrap',
    hp: '8d8',
    ac: 3,
    damage: '1d6',
    xpValue: 100,
    level: 6,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'STATIONARY', intelligence: 1, aggroRange: 2, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'G',
    name: 'Griffin',
      spriteName: 'Griffin',
    hp: '13d8',
    ac: 2,
    damage: '4d3+3d5',
    xpValue: 6000,
    level: 10,
    speed: 18,
    rarity: 'rare',
    mean: true,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 12, fleeThreshold: 0.1, special: [] },
  },
  {
    letter: 'H',
    name: 'Hobgoblin',
      spriteName: 'Hobgoblin',
    hp: '1d8',
    ac: 5,
    damage: '1d8',
    xpValue: 3,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 7, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'I',
    name: 'Ice Monster',
      spriteName: 'Ice Monster',
    hp: '1d8',
    ac: 9,
    damage: '0d0',
    xpValue: 20,
    level: 5,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 6, fleeThreshold: 0.0, special: [] },
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
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 12, fleeThreshold: 0.1, special: [] },
  },
  {
    letter: 'K',
    name: 'Kestrel',
      spriteName: 'Kestrel',
    hp: '1d8',
    ac: 7,
    damage: '1d4',
    xpValue: 4,
    level: 2,
    speed: 15,
    rarity: 'common',
    mean: true,
    aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 8, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'L',
    name: 'Leprechaun',
      spriteName: 'Leprechaun',
    hp: '3d8',
    ac: 8,
    damage: '1d1',
    xpValue: 25,
    level: 4,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'THIEF', intelligence: 6, aggroRange: 10, fleeThreshold: 1.0, special: [] },
  },
  {
    letter: 'M',
    name: 'Medusa',
      spriteName: 'Medusa',
    hp: '8d8',
    ac: 2,
    damage: '3d4+3d4+2d5',
    xpValue: 500,
    level: 8,
    speed: 12,
    rarity: 'rare',
    mean: false,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'N',
    name: 'Nymph',
      spriteName: 'Nymph',
    hp: '3d8',
    ac: 9,
    damage: '0d0',
    xpValue: 80,
    level: 6,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'THIEF', intelligence: 7, aggroRange: 8, fleeThreshold: 1.0, special: [] },
  },
  {
    letter: 'O',
    name: 'Orc',
      spriteName: 'Orc',
    hp: '1d8',
    ac: 6,
    damage: '1d8',
    xpValue: 5,
    level: 2,
    speed: 10,
    rarity: 'uncommon',
    mean: true,
    aiProfile: { behavior: 'GREEDY', intelligence: 5, aggroRange: 8, fleeThreshold: 0.25, special: [] },
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
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'Q',
    name: 'Quagga',
      spriteName: 'Quagga',
    hp: '3d8',
    ac: 3,
    damage: '1d5+1d5',
    xpValue: 15,
    level: 3,
    speed: 10,
    rarity: 'common',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 7, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'R',
    name: 'Rattlesnake',
      spriteName: 'Rattlesnake',
    hp: '2d8',
    ac: 3,
    damage: '1d6',
    xpValue: 12,
    level: 3,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 6, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'S',
    name: 'Snake',
      spriteName: 'Snake',
    hp: '1d8',
    ac: 5,
    damage: '1d3',
    xpValue: 2,
    level: 1,
    speed: 10,
    rarity: 'common',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 5, fleeThreshold: 0.0, special: [] },
  },
  {
    letter: 'T',
    name: 'Troll',
      spriteName: 'Troll',
    hp: '6d8',
    ac: 4,
    damage: '1d8+1d8',
    xpValue: 120,
    level: 6,
    speed: 7,
    rarity: 'uncommon',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] },
  },
  {
    letter: 'U',
    name: 'Ur-vile',
      spriteName: 'Ur-vile',
    hp: '7d8',
    ac: -2,
    damage: '1d9+1d9+2d9',
    xpValue: 1500,
    level: 9,
    speed: 15,
    rarity: 'rare',
    mean: true,
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.15, special: [] },
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
    aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 10, fleeThreshold: 0.3, special: [] },
  },
  {
    letter: 'W',
    name: 'Wraith',
      spriteName: 'Wraith',
    hp: '5d8',
    ac: 4,
    damage: '1d6',
    xpValue: 200,
    level: 7,
    speed: 12,
    rarity: 'rare',
    mean: false,
    aiProfile: { behavior: 'SMART', intelligence: 6, aggroRange: 9, fleeThreshold: 0.25, special: [] },
  },
  {
    letter: 'X',
    name: 'Xeroc',
      spriteName: 'Xeroc',
    hp: '7d8',
    ac: 7,
    damage: '4d4',
    xpValue: 150,
    level: 7,
    speed: 10,
    rarity: 'uncommon',
    mean: false,
    aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 7, fleeThreshold: 0.2, special: [] },
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
    aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 7, fleeThreshold: 0.15, special: [] },
  },
  {
    letter: 'Z',
    name: 'Zombie',
      spriteName: 'Zombie',
    hp: '2d8',
    ac: 8,
    damage: '1d8',
    xpValue: 7,
    level: 2,
    speed: 5,
    rarity: 'uncommon',
    mean: true,
    aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 6, fleeThreshold: 0.0, special: [] },
  },
]

describe('MonsterSpawnService - getMonsterByLetter', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)

    // Save original fetch
    originalFetch = global.fetch

    // Mock fetch to return monster data
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

  describe('valid monster letters', () => {
    test('returns Dragon template for letter "D"', () => {
      const template = service.getMonsterByLetter('D')

      expect(template).not.toBeNull()
      expect(template?.letter).toBe('D')
      expect(template?.name).toBe('Dragon')
      expect(template?.level).toBe(10)
    })

    test('returns Aquator template for letter "A"', () => {
      const template = service.getMonsterByLetter('A')

      expect(template).not.toBeNull()
      expect(template?.letter).toBe('A')
      expect(template?.name).toBe('Aquator')
    })

    test('returns Bat template for letter "B"', () => {
      const template = service.getMonsterByLetter('B')

      expect(template).not.toBeNull()
      expect(template?.letter).toBe('B')
      expect(template?.name).toBe('Bat')
    })

    test('returns Zombie template for letter "Z"', () => {
      const template = service.getMonsterByLetter('Z')

      expect(template).not.toBeNull()
      expect(template?.letter).toBe('Z')
      expect(template?.name).toBe('Zombie')
    })

    test('returns templates for all 26 letters A-Z', () => {
      // All 26 monster types should be defined
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

      for (const letter of letters) {
        const template = service.getMonsterByLetter(letter)
        expect(template).not.toBeNull()
        expect(template?.letter).toBe(letter)
      }
    })

    test('returned template has all required fields', () => {
      const template = service.getMonsterByLetter('D')

      expect(template).toMatchObject({
        letter: expect.any(String),
        name: expect.any(String),
        hp: expect.any(String),
        ac: expect.any(Number),
        damage: expect.any(String),
        xpValue: expect.any(Number),
        level: expect.any(Number),
        speed: expect.any(Number),
        rarity: expect.stringMatching(/^(common|uncommon|rare)$/),
        mean: expect.any(Boolean),
        aiProfile: expect.any(Object),
      })
    })
  })

  describe('case insensitivity', () => {
    test('lowercase letter returns same template as uppercase', () => {
      const upperTemplate = service.getMonsterByLetter('D')
      const lowerTemplate = service.getMonsterByLetter('d')

      expect(lowerTemplate).toEqual(upperTemplate)
      expect(lowerTemplate?.letter).toBe('D')
    })

    test('works for all lowercase letters', () => {
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')

      for (const letter of letters) {
        const template = service.getMonsterByLetter(letter)
        expect(template).not.toBeNull()
        expect(template?.letter).toBe(letter.toUpperCase())
      }
    })
  })

  describe('invalid input', () => {
    test('returns null for number string', () => {
      const template = service.getMonsterByLetter('1')
      expect(template).toBeNull()
    })

    test('returns null for special character', () => {
      const template = service.getMonsterByLetter('!')
      expect(template).toBeNull()
    })

    test('returns null for empty string', () => {
      const template = service.getMonsterByLetter('')
      expect(template).toBeNull()
    })

    test('returns null for multi-character string', () => {
      const template = service.getMonsterByLetter('Dragon')
      expect(template).toBeNull()
    })

    test('returns null for space character', () => {
      const template = service.getMonsterByLetter(' ')
      expect(template).toBeNull()
    })

    test('returns null for non-existent letter (if any)', () => {
      // Test with a character that shouldn't be in monsters.json
      const template = service.getMonsterByLetter('@')
      expect(template).toBeNull()
    })
  })

  describe('data loading', () => {
    test('throws error if data not loaded', () => {
      // Create new service without loading data
      const uninitializedService = new MonsterSpawnService(mockRandom)

      expect(() => {
        uninitializedService.getMonsterByLetter('D')
      }).toThrow('Monster data not loaded. Call loadMonsterData() first.')
    })

    test('works correctly after data is loaded', async () => {
      const newService = new MonsterSpawnService(mockRandom)

      // Initially should throw
      expect(() => {
        newService.getMonsterByLetter('D')
      }).toThrow()

      // Mock fetch for this service
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMonsterData,
      } as Response)

      // Load data
      await newService.loadMonsterData()

      // Now should work
      const template = newService.getMonsterByLetter('D')
      expect(template).not.toBeNull()
      expect(template?.name).toBe('Dragon')
    })
  })

  describe('template integrity', () => {
    test('Dragon has correct stats', () => {
      const dragon = service.getMonsterByLetter('D')

      expect(dragon).toMatchObject({
        letter: 'D',
        name: 'Dragon',
      spriteName: 'Dragon',
        hp: '10d8',
        ac: -1,
        damage: '1d8+3d10',
        level: 10,
      })
    })

    test('Aquator has correct stats', () => {
      const aquator = service.getMonsterByLetter('A')

      expect(aquator).toMatchObject({
        letter: 'A',
        name: 'Aquator',
      spriteName: 'Aquator',
        level: 5,
      })
    })

    test('all templates have valid AI profiles', () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

      for (const letter of letters) {
        const template = service.getMonsterByLetter(letter)
        expect(template?.aiProfile).toBeDefined()
        expect(template?.aiProfile.behavior).toBeDefined()
      }
    })
  })
})
