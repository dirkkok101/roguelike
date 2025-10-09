import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService'
import { MonsterTemplate, MonsterState } from '@game/core/core'

describe('MonsterSpawnService - createMonsterFromTemplate', () => {
  let originalFetch: typeof global.fetch
  let monsterSpawnService: MonsterSpawnService
  let mockRandom: MockRandom

  const mockMonsterData: MonsterTemplate[] = [
    {
      letter: 'T',
      name: 'Troll',
      hp: '6d8',
      ac: 4,
      damage: '1d8',
      xpValue: 120,
      level: 6,
      speed: 12,
      rarity: 'uncommon',
      mean: true,
      aiProfile: {
        behavior: 'SIMPLE',
        intelligence: 4,
        aggroRange: 8,
        fleeThreshold: 0.2,
        special: [],
      },
    },
    {
      letter: 'D',
      name: 'Dragon',
      hp: '10d8',
      ac: -1,
      damage: '1d8+3d10',
      xpValue: 5000,
      level: 10,
      speed: 15,
      rarity: 'rare',
      mean: true,
      aiProfile: {
        behavior: 'SMART',
        intelligence: 10,
        aggroRange: 10,
        fleeThreshold: 0.3,
        special: ['BREATHE_FIRE'],
      },
    },
  ]

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMonsterData,
    } as Response)
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  beforeEach(async () => {
    mockRandom = new MockRandom()
    monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
  })

  describe('createMonsterFromTemplate - basic functionality', () => {
    test('creates monster from template with provided ID', () => {
      const template = mockMonsterData[0] // Troll
      const position = { x: 10, y: 10 }
      const customId = 'debug-troll-123'

      // Set mock values: HP roll, energy
      // MockRandom.roll() returns single nextInt value (not 6 separate rolls)
      mockRandom.setValues([37, 50]) // HP: 37, energy: 50

      const monster = monsterSpawnService.createMonsterFromTemplate(
        template,
        position,
        customId
      )

      expect(monster.id).toBe(customId)
      expect(monster.letter).toBe('T')
      expect(monster.name).toBe('Troll')
      expect(monster.position).toEqual({ x: 10, y: 10 })
      expect(monster.hp).toBe(37)
      expect(monster.maxHp).toBe(37)
      expect(monster.ac).toBe(4)
      expect(monster.damage).toBe('1d8')
      expect(monster.xpValue).toBe(120)
      expect(monster.level).toBe(6)
      expect(monster.speed).toBe(12)
    })

    test('creates monster with auto-generated ID when not provided', () => {
      const template = mockMonsterData[0] // Troll
      const position = { x: 5, y: 5 }

      // Set mock values: ID generation, HP roll, energy
      // Order: createMonsterFromTemplate generates ID first, then calls createMonster
      mockRandom.setValues([1234, 30, 25]) // ID: 1234, HP: 30, energy: 25

      const monster = monsterSpawnService.createMonsterFromTemplate(template, position)

      expect(monster.id).toBe('monster-1234')
      expect(monster.letter).toBe('T')
      expect(monster.name).toBe('Troll')
      expect(monster.position).toEqual({ x: 5, y: 5 })
    })

    test('creates monster with correct AI state based on mean flag', () => {
      const template = mockMonsterData[0] // Troll (mean: true)
      const position = { x: 10, y: 10 }

      mockRandom.setValues([30, 40]) // HP roll, energy

      const monster = monsterSpawnService.createMonsterFromTemplate(
        template,
        position,
        'test-1'
      )

      // mean: true -> isAwake: true, state: HUNTING, isAsleep: false
      expect(monster.isAwake).toBe(true)
      expect(monster.isAsleep).toBe(false)
      expect(monster.state).toBe(MonsterState.HUNTING)
    })

    test('creates sleeping monster when mean flag is false', () => {
      const sleepyTemplate: MonsterTemplate = {
        ...mockMonsterData[0],
        mean: false, // Not mean -> starts sleeping
      }
      const position = { x: 10, y: 10 }

      mockRandom.setValues([30, 40]) // HP roll, energy

      const monster = monsterSpawnService.createMonsterFromTemplate(
        sleepyTemplate,
        position,
        'test-1'
      )

      // mean: false -> isAwake: false, state: SLEEPING, isAsleep: true
      expect(monster.isAwake).toBe(false)
      expect(monster.isAsleep).toBe(true)
      expect(monster.state).toBe(MonsterState.SLEEPING)
    })
  })

  describe('createMonsterFromTemplate - different monster types', () => {
    test('creates Dragon with correct stats', () => {
      const template = mockMonsterData[1] // Dragon
      const position = { x: 20, y: 20 }

      // Set mock values: HP roll, energy
      mockRandom.setValues([80, 60]) // HP: 80, energy: 60

      const monster = monsterSpawnService.createMonsterFromTemplate(
        template,
        position,
        'debug-dragon-1'
      )

      expect(monster.id).toBe('debug-dragon-1')
      expect(monster.letter).toBe('D')
      expect(monster.name).toBe('Dragon')
      expect(monster.hp).toBe(80)
      expect(monster.maxHp).toBe(80)
      expect(monster.ac).toBe(-1) // Better AC (negative)
      expect(monster.damage).toBe('1d8+3d10')
      expect(monster.xpValue).toBe(5000)
      expect(monster.level).toBe(10)
      expect(monster.speed).toBe(15)
      expect(monster.aiProfile.behavior).toBe('SMART')
      expect(monster.aiProfile.special).toContain('BREATHE_FIRE')
    })
  })

  describe('createMonsterFromTemplate - error handling', () => {
    test('throws error if monster data not loaded', () => {
      const newService = new MonsterSpawnService(mockRandom)
      // Don't call loadMonsterData()

      const template = mockMonsterData[0]
      const position = { x: 10, y: 10 }

      expect(() => {
        newService.createMonsterFromTemplate(template, position, 'test-1')
      }).toThrow('Monster data not loaded. Call loadMonsterData() first.')
    })
  })

  describe('createMonsterFromTemplate - integration with DebugService', () => {
    test('creates monster with debug-specific ID format', () => {
      const template = mockMonsterData[0]
      const position = { x: 15, y: 15 }
      const timestamp = Date.now()
      const debugId = `debug-monster-${timestamp}`

      mockRandom.setValues([35, 45]) // HP roll, energy

      const monster = monsterSpawnService.createMonsterFromTemplate(
        template,
        position,
        debugId
      )

      expect(monster.id).toBe(debugId)
      expect(monster.id).toMatch(/^debug-monster-\d+$/)
    })

    test('creates multiple monsters with different IDs', () => {
      const template = mockMonsterData[0]
      const position1 = { x: 10, y: 10 }
      const position2 = { x: 20, y: 20 }

      // ID, HP, energy for monster1, then ID, HP, energy for monster2
      // Order: createMonsterFromTemplate generates ID first, then calls createMonster
      mockRandom.setValues([1111, 30, 40, 2222, 35, 45])

      const monster1 = monsterSpawnService.createMonsterFromTemplate(
        template,
        position1
      )
      const monster2 = monsterSpawnService.createMonsterFromTemplate(
        template,
        position2
      )

      expect(monster1.id).toBe('monster-1111')
      expect(monster2.id).toBe('monster-2222')
      expect(monster1.id).not.toBe(monster2.id)
    })
  })

  describe('createMonsterFromTemplate - monster initialization', () => {
    test('initializes monster with correct default values', () => {
      const template = mockMonsterData[0]
      const position = { x: 10, y: 10 }

      mockRandom.setValues([30, 50]) // HP, energy

      const monster = monsterSpawnService.createMonsterFromTemplate(
        template,
        position,
        'test-1'
      )

      // Check default monster properties
      expect(monster.visibleCells).toEqual(new Set())
      expect(monster.currentPath).toBeNull()
      expect(monster.hasStolen).toBe(false)
      expect(monster.lastKnownPlayerPosition).toBeNull()
      expect(monster.turnsWithoutSight).toBe(0)
      expect(monster.isInvisible).toBe(false)
      expect(monster.statusEffects).toEqual([])
      expect(monster.energy).toBe(50)
    })
  })
})
