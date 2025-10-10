import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService'
import { MonsterTemplate, MonsterBehavior } from '@game/core/core'

describe('MonsterSpawnService - Monster Creation', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)
  })

  // ============================================================================
  // TEST HELPERS
  // ============================================================================

  function createTestTemplate(): MonsterTemplate {
    return {
      letter: 'K',
      name: 'Kobold',
      spriteName: 'Kobold',
      hp: '1d8',
      ac: 7,
      damage: '1d4',
      xpValue: 5,
      level: 1,
      speed: 10,
      rarity: 'common',
      mean: false,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0.0,
        special: [],
      },
    }
  }

  // ============================================================================
  // TESTS
  // ============================================================================

  describe('createMonster() from template', () => {
    it('should create monster with correct stats from template', () => {
      const template = createTestTemplate()
      const position = { x: 5, y: 5 }
      const id = 'test-monster-1'

      // Set values for roll() and nextInt() calls
      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      // Access private method via type assertion for testing
      const monster = (service as any).createMonster(template, position, id)

      expect(monster.id).toBe(id)
      expect(monster.letter).toBe('K')
      expect(monster.name).toBe('Kobold')
      expect(monster.position).toEqual(position)
      expect(monster.ac).toBe(7)
      expect(monster.damage).toBe('1d4')
      expect(monster.xpValue).toBe(5)
      expect(monster.level).toBe(1)
    })

    it('should roll HP using template dice notation', () => {
      const template = createTestTemplate()
      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.hp).toBe(6)
      expect(monster.maxHp).toBe(6)
    })

    it('should apply speed from template', () => {
      const template = createTestTemplate()
      template.speed = 15 // Fast monster (Bat-like)

      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.speed).toBe(15)
    })

    it('should initialize energy randomly (0-99)', () => {
      const template = createTestTemplate()
      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.energy).toBe(42)
      expect(monster.energy).toBeGreaterThanOrEqual(0)
      expect(monster.energy).toBeLessThan(100)
    })

    it('should set isAwake=true and state=HUNTING for mean monsters', () => {
      const template = createTestTemplate()
      template.mean = true

      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.isAwake).toBe(true)
      expect(monster.isAsleep).toBe(false)
      expect(monster.state).toBe('HUNTING')
    })

    it('should set isAwake=false and state=SLEEPING for non-mean monsters', () => {
      const template = createTestTemplate()
      template.mean = false

      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.isAwake).toBe(false)
      expect(monster.isAsleep).toBe(true)
      expect(monster.state).toBe('SLEEPING')
    })

    it('should copy aiProfile from template', () => {
      const template = createTestTemplate()

      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.aiProfile.behavior).toBe(MonsterBehavior.SIMPLE)
      expect(monster.aiProfile.intelligence).toBe(1)
      expect(monster.aiProfile.aggroRange).toBe(5)
      expect(monster.aiProfile.fleeThreshold).toBe(0.0)
      expect(monster.aiProfile.special).toEqual([])
    })

    it('should set isInvisible to false by default', () => {
      const template = createTestTemplate()

      mockRandom.setValues([6, 42]) // HP roll=6, energy=42

      const monster = (service as any).createMonster(template, { x: 1, y: 1 }, 'test')

      expect(monster.isInvisible).toBe(false)
    })
  })
})
