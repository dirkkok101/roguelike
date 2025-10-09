import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { PotionType, ScrollType, RingType, WandType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('DebugService - Enum Parsing Helpers', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService

  const mockMonsterData = [
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
      aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] },
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
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(
      messageService,
      monsterSpawnService,
      itemSpawnService,
      mockRandom,
      true
    )
  })

  describe('parsePotionType', () => {
    test('returns HEAL when subType is undefined', () => {
      // Access private method via type assertion for testing
      const result = (debugService as any).parsePotionType(undefined)
      expect(result).toBe(PotionType.HEAL)
    })

    test('returns HEAL when subType is null', () => {
      const result = (debugService as any).parsePotionType(null)
      expect(result).toBe(PotionType.HEAL)
    })

    test('returns HEAL when subType is empty string', () => {
      const result = (debugService as any).parsePotionType('')
      expect(result).toBe(PotionType.HEAL)
    })

    test('returns correct PotionType for valid string', () => {
      const result = (debugService as any).parsePotionType('EXTRA_HEAL')
      expect(result).toBe(PotionType.EXTRA_HEAL)
    })

    test('returns HEAL for invalid enum string', () => {
      const result = (debugService as any).parsePotionType('INVALID_TYPE')
      expect(result).toBe(PotionType.HEAL)
    })

    test('handles all valid PotionType values', () => {
      expect((debugService as any).parsePotionType('HEAL')).toBe(PotionType.HEAL)
      expect((debugService as any).parsePotionType('EXTRA_HEAL')).toBe(PotionType.EXTRA_HEAL)
      expect((debugService as any).parsePotionType('GAIN_STRENGTH')).toBe(PotionType.GAIN_STRENGTH)
      expect((debugService as any).parsePotionType('RESTORE_STRENGTH')).toBe(
        PotionType.RESTORE_STRENGTH
      )
      expect((debugService as any).parsePotionType('POISON')).toBe(PotionType.POISON)
      expect((debugService as any).parsePotionType('CONFUSION')).toBe(PotionType.CONFUSION)
      expect((debugService as any).parsePotionType('BLINDNESS')).toBe(PotionType.BLINDNESS)
      expect((debugService as any).parsePotionType('HASTE_SELF')).toBe(PotionType.HASTE_SELF)
      expect((debugService as any).parsePotionType('DETECT_MONSTERS')).toBe(
        PotionType.DETECT_MONSTERS
      )
      expect((debugService as any).parsePotionType('DETECT_MAGIC')).toBe(PotionType.DETECT_MAGIC)
      expect((debugService as any).parsePotionType('RAISE_LEVEL')).toBe(PotionType.RAISE_LEVEL)
      expect((debugService as any).parsePotionType('SEE_INVISIBLE')).toBe(PotionType.SEE_INVISIBLE)
      expect((debugService as any).parsePotionType('LEVITATION')).toBe(PotionType.LEVITATION)
    })
  })

  describe('parseScrollType', () => {
    test('returns IDENTIFY when subType is undefined', () => {
      const result = (debugService as any).parseScrollType(undefined)
      expect(result).toBe(ScrollType.IDENTIFY)
    })

    test('returns IDENTIFY when subType is null', () => {
      const result = (debugService as any).parseScrollType(null)
      expect(result).toBe(ScrollType.IDENTIFY)
    })

    test('returns IDENTIFY when subType is empty string', () => {
      const result = (debugService as any).parseScrollType('')
      expect(result).toBe(ScrollType.IDENTIFY)
    })

    test('returns correct ScrollType for valid string', () => {
      const result = (debugService as any).parseScrollType('MAGIC_MAPPING')
      expect(result).toBe(ScrollType.MAGIC_MAPPING)
    })

    test('returns IDENTIFY for invalid enum string', () => {
      const result = (debugService as any).parseScrollType('INVALID_TYPE')
      expect(result).toBe(ScrollType.IDENTIFY)
    })

    test('handles all valid ScrollType values', () => {
      expect((debugService as any).parseScrollType('IDENTIFY')).toBe(ScrollType.IDENTIFY)
      expect((debugService as any).parseScrollType('ENCHANT_WEAPON')).toBe(
        ScrollType.ENCHANT_WEAPON
      )
      expect((debugService as any).parseScrollType('ENCHANT_ARMOR')).toBe(ScrollType.ENCHANT_ARMOR)
      expect((debugService as any).parseScrollType('MAGIC_MAPPING')).toBe(ScrollType.MAGIC_MAPPING)
      expect((debugService as any).parseScrollType('TELEPORTATION')).toBe(ScrollType.TELEPORTATION)
      expect((debugService as any).parseScrollType('REMOVE_CURSE')).toBe(ScrollType.REMOVE_CURSE)
      expect((debugService as any).parseScrollType('CREATE_MONSTER')).toBe(
        ScrollType.CREATE_MONSTER
      )
      expect((debugService as any).parseScrollType('SCARE_MONSTER')).toBe(ScrollType.SCARE_MONSTER)
      expect((debugService as any).parseScrollType('LIGHT')).toBe(ScrollType.LIGHT)
      expect((debugService as any).parseScrollType('SLEEP')).toBe(ScrollType.SLEEP)
      expect((debugService as any).parseScrollType('HOLD_MONSTER')).toBe(ScrollType.HOLD_MONSTER)
    })
  })

  describe('parseRingType', () => {
    test('returns PROTECTION when subType is undefined', () => {
      const result = (debugService as any).parseRingType(undefined)
      expect(result).toBe(RingType.PROTECTION)
    })

    test('returns PROTECTION when subType is null', () => {
      const result = (debugService as any).parseRingType(null)
      expect(result).toBe(RingType.PROTECTION)
    })

    test('returns PROTECTION when subType is empty string', () => {
      const result = (debugService as any).parseRingType('')
      expect(result).toBe(RingType.PROTECTION)
    })

    test('returns correct RingType for valid string', () => {
      const result = (debugService as any).parseRingType('STEALTH')
      expect(result).toBe(RingType.STEALTH)
    })

    test('returns PROTECTION for invalid enum string', () => {
      const result = (debugService as any).parseRingType('INVALID_TYPE')
      expect(result).toBe(RingType.PROTECTION)
    })

    test('handles all valid RingType values', () => {
      expect((debugService as any).parseRingType('PROTECTION')).toBe(RingType.PROTECTION)
      expect((debugService as any).parseRingType('REGENERATION')).toBe(RingType.REGENERATION)
      expect((debugService as any).parseRingType('SEARCHING')).toBe(RingType.SEARCHING)
      expect((debugService as any).parseRingType('SEE_INVISIBLE')).toBe(RingType.SEE_INVISIBLE)
      expect((debugService as any).parseRingType('SLOW_DIGESTION')).toBe(RingType.SLOW_DIGESTION)
      expect((debugService as any).parseRingType('ADD_STRENGTH')).toBe(RingType.ADD_STRENGTH)
      expect((debugService as any).parseRingType('SUSTAIN_STRENGTH')).toBe(
        RingType.SUSTAIN_STRENGTH
      )
      expect((debugService as any).parseRingType('DEXTERITY')).toBe(RingType.DEXTERITY)
      expect((debugService as any).parseRingType('TELEPORTATION')).toBe(RingType.TELEPORTATION)
      expect((debugService as any).parseRingType('STEALTH')).toBe(RingType.STEALTH)
    })
  })

  describe('parseWandType', () => {
    test('returns MAGIC_MISSILE when subType is undefined', () => {
      const result = (debugService as any).parseWandType(undefined)
      expect(result).toBe(WandType.MAGIC_MISSILE)
    })

    test('returns MAGIC_MISSILE when subType is null', () => {
      const result = (debugService as any).parseWandType(null)
      expect(result).toBe(WandType.MAGIC_MISSILE)
    })

    test('returns MAGIC_MISSILE when subType is empty string', () => {
      const result = (debugService as any).parseWandType('')
      expect(result).toBe(WandType.MAGIC_MISSILE)
    })

    test('returns correct WandType for valid string', () => {
      const result = (debugService as any).parseWandType('LIGHTNING')
      expect(result).toBe(WandType.LIGHTNING)
    })

    test('returns MAGIC_MISSILE for invalid enum string', () => {
      const result = (debugService as any).parseWandType('INVALID_TYPE')
      expect(result).toBe(WandType.MAGIC_MISSILE)
    })

    test('handles all valid WandType values', () => {
      expect((debugService as any).parseWandType('LIGHTNING')).toBe(WandType.LIGHTNING)
      expect((debugService as any).parseWandType('FIRE')).toBe(WandType.FIRE)
      expect((debugService as any).parseWandType('COLD')).toBe(WandType.COLD)
      expect((debugService as any).parseWandType('MAGIC_MISSILE')).toBe(WandType.MAGIC_MISSILE)
      expect((debugService as any).parseWandType('SLEEP')).toBe(WandType.SLEEP)
      expect((debugService as any).parseWandType('HASTE_MONSTER')).toBe(WandType.HASTE_MONSTER)
      expect((debugService as any).parseWandType('SLOW_MONSTER')).toBe(WandType.SLOW_MONSTER)
      expect((debugService as any).parseWandType('POLYMORPH')).toBe(WandType.POLYMORPH)
      expect((debugService as any).parseWandType('TELEPORT_AWAY')).toBe(WandType.TELEPORT_AWAY)
      expect((debugService as any).parseWandType('CANCELLATION')).toBe(WandType.CANCELLATION)
    })
  })
})
