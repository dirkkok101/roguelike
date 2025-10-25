import { IdentificationService } from './IdentificationService'
import { SeededRandom } from '@services/RandomService'
import { PotionType, ScrollType, RingType, WandType } from '@game/core/core'

describe('IdentificationService - Name Generation', () => {
  let service: IdentificationService
  let random: SeededRandom

  beforeEach(() => {
    random = new SeededRandom('test-seed')
    service = new IdentificationService(random)
  })

  describe('generateItemNames()', () => {
    test('generates unique names for all potion types', () => {
      const nameMap = service.generateItemNames()

      // Should have all potion types mapped
      expect(nameMap.potions.size).toBe(Object.values(PotionType).length)

      // All names should be unique
      const names = Array.from(nameMap.potions.values())
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)

      // Names should have correct format
      names.forEach((name) => {
        expect(name).toMatch(/^.+ potion$/)
      })
    })

    test('generates unique names for all scroll types', () => {
      const nameMap = service.generateItemNames()

      expect(nameMap.scrolls.size).toBe(Object.values(ScrollType).length)

      const names = Array.from(nameMap.scrolls.values())
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)

      names.forEach((name) => {
        expect(name).toMatch(/^scroll labeled .+$/)
      })
    })

    test('generates unique names for all ring types', () => {
      const nameMap = service.generateItemNames()

      expect(nameMap.rings.size).toBe(Object.values(RingType).length)

      const names = Array.from(nameMap.rings.values())
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)

      names.forEach((name) => {
        expect(name).toMatch(/^.+ ring$/)
      })
    })

    test('generates unique names for all wand types', () => {
      const nameMap = service.generateItemNames()

      expect(nameMap.wands.size).toBe(Object.values(WandType).length)

      const names = Array.from(nameMap.wands.values())
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)

      names.forEach((name) => {
        expect(name).toMatch(/^.+ wand$/)
      })
    })

    test('generates consistent names for same seed', () => {
      const service1 = new IdentificationService(new SeededRandom('consistent-seed'))
      const service2 = new IdentificationService(new SeededRandom('consistent-seed'))

      const nameMap1 = service1.generateItemNames()
      const nameMap2 = service2.generateItemNames()

      // Potions should match
      expect(nameMap1.potions.get(PotionType.MINOR_HEAL)).toBe(
        nameMap2.potions.get(PotionType.MINOR_HEAL)
      )
      expect(nameMap1.potions.get(PotionType.POISON)).toBe(
        nameMap2.potions.get(PotionType.POISON)
      )

      // Scrolls should match
      expect(nameMap1.scrolls.get(ScrollType.IDENTIFY)).toBe(
        nameMap2.scrolls.get(ScrollType.IDENTIFY)
      )

      // Rings should match
      expect(nameMap1.rings.get(RingType.PROTECTION)).toBe(
        nameMap2.rings.get(RingType.PROTECTION)
      )

      // Wands should match
      expect(nameMap1.wands.get(WandType.LIGHTNING)).toBe(
        nameMap2.wands.get(WandType.LIGHTNING)
      )
    })

    test('generates different names for different seeds', () => {
      const service1 = new IdentificationService(new SeededRandom('seed-1'))
      const service2 = new IdentificationService(new SeededRandom('seed-2'))

      const nameMap1 = service1.generateItemNames()
      const nameMap2 = service2.generateItemNames()

      // At least some names should be different
      const healPotion1 = nameMap1.potions.get(PotionType.MINOR_HEAL)
      const healPotion2 = nameMap2.potions.get(PotionType.MINOR_HEAL)

      const identifyScroll1 = nameMap1.scrolls.get(ScrollType.IDENTIFY)
      const identifyScroll2 = nameMap2.scrolls.get(ScrollType.IDENTIFY)

      // With different seeds, at least one should differ
      const allSame =
        healPotion1 === healPotion2 && identifyScroll1 === identifyScroll2

      expect(allSame).toBe(false)
    })

    test('all item types get mapped even with limited descriptor pools', () => {
      const nameMap = service.generateItemNames()

      // Even if there are more item types than descriptors,
      // all types should still get a name (may reuse descriptors)
      expect(nameMap.potions.size).toBe(Object.values(PotionType).length)
      expect(nameMap.scrolls.size).toBe(Object.values(ScrollType).length)
      expect(nameMap.rings.size).toBe(Object.values(RingType).length)
      expect(nameMap.wands.size).toBe(Object.values(WandType).length)

      // Every type should have a name
      Object.values(PotionType).forEach((type) => {
        expect(nameMap.potions.get(type)).toBeTruthy()
      })

      Object.values(ScrollType).forEach((type) => {
        expect(nameMap.scrolls.get(type)).toBeTruthy()
      })

      Object.values(RingType).forEach((type) => {
        expect(nameMap.rings.get(type)).toBeTruthy()
      })

      Object.values(WandType).forEach((type) => {
        expect(nameMap.wands.get(type)).toBeTruthy()
      })
    })
  })
})
