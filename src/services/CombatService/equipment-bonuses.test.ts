import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Monster, Ring, RingType, ItemType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('CombatService - Equipment Bonuses', () => {
  let service: CombatService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom([])
    ringService = new RingService(mockRandom)
    service = new CombatService(mockRandom, ringService)
  })

  function createTestMonster(): Monster {
    return {
      id: 'bat-1',
      letter: 'B',
      name: 'Bat',
      spriteName: 'Bat',
      position: { x: 1, y: 1 },
      hp: 5,
      maxHp: 5,
      ac: 8,
      damage: '1d2',
      xpValue: 10,
      level: 1,
      aiProfile: {
        behavior: 'SIMPLE' as any,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING' as any,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      speed: 10,
    }
  }

  function createRing(id: string, type: RingType, bonus: number): Ring {
    return {
      id,
      name: `Ring of ${type}`,
      type: ItemType.RING,
      identified: false,
      ringType: type,
      effect: 'test',
      bonus,
      materialName: 'test',
      hungerModifier: 1.5,
    }
  }

  describe('Ring of Add Strength', () => {
    test('adds strength bonus to hit calculation - left ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      player.equipment.leftRing = ring

      // Mock roll for hit (d20) and damage (1d4 unarmed)
      mockRandom.setValues([17, 3]) // Hit roll, then damage roll

      const result = service.playerAttack(player, monster)

      // NEW FORMULA: Str 16 + 2 from ring = 18, gives +1 to-hit (not +18!)
      // Roll + (level + str_to_hit_bonus - AC) >= 10
      // 17 + (1 + 1 - 8) = 17 - 6 = 11 >= 10, so should hit
      expect(result.hit).toBe(true)
    })

    test('adds strength bonus to hit calculation - right ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      player.equipment.rightRing = ring

      mockRandom.setValues([17, 3])

      const result = service.playerAttack(player, monster)
      // Str 18 gives +1 to-hit: 17 + (1 + 1 - 8) = 11 >= 10
      expect(result.hit).toBe(true)
    })

    test('stacks strength bonus from both rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const leftRing = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      const rightRing = createRing('ring-2', RingType.ADD_STRENGTH, 3)
      player.equipment.leftRing = leftRing
      player.equipment.rightRing = rightRing

      mockRandom.setValues([16, 3]) // Need higher roll with correct formula

      const result = service.playerAttack(player, monster)

      // NEW FORMULA: Str 16 + 2 + 3 = 21, gives +1 to-hit (Str 19-21)
      // Roll + (level + str_to_hit_bonus - AC) >= 10
      // 16 + (1 + 1 - 8) = 16 - 6 = 10 >= 10, so should hit
      expect(result.hit).toBe(true)
    })
  })

  describe('Ring of Protection', () => {
    test('reduces effective AC for defense - left ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.PROTECTION, 2)
      player.equipment.leftRing = ring

      // Mock roll for monster attack
      mockRandom.setValues([5])

      const result = service.monsterAttack(monster, player)

      // Player AC 10 - 2 from ring = 8 (better defense)
      // Roll 5 + level 1 - AC 8 = -2, which is < 10, so should miss
      expect(result.hit).toBe(false)
    })

    test('reduces effective AC for defense - right ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.PROTECTION, 2)
      player.equipment.rightRing = ring

      mockRandom.setValues([5])

      const result = service.monsterAttack(monster, player)
      expect(result.hit).toBe(false)
    })

    test('stacks AC bonus from both protection rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const leftRing = createRing('ring-1', RingType.PROTECTION, 2)
      const rightRing = createRing('ring-2', RingType.PROTECTION, 1)
      player.equipment.leftRing = leftRing
      player.equipment.rightRing = rightRing

      mockRandom.setValues([7])

      const result = service.monsterAttack(monster, player)

      // Player AC 10 - 3 from rings = 7 (much better defense)
      // Roll 7 + level 1 - AC 7 = 1, which is < 10, so should miss
      expect(result.hit).toBe(false)
    })
  })

  describe('Ring of Dexterity', () => {
    test('reduces effective AC like protection ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.DEXTERITY, 2)
      player.equipment.leftRing = ring

      mockRandom.setValues([5])

      const result = service.monsterAttack(monster, player)

      // Player AC 10 - 2 from ring = 8
      // Roll 5 + level 1 - AC 8 = -2, which is < 10, so should miss
      expect(result.hit).toBe(false)
    })

    test('stacks with protection ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const protectionRing = createRing('ring-1', RingType.PROTECTION, 2)
      const dexterityRing = createRing('ring-2', RingType.DEXTERITY, 1)
      player.equipment.leftRing = protectionRing
      player.equipment.rightRing = dexterityRing

      mockRandom.setValues([7])

      const result = service.monsterAttack(monster, player)

      // Player AC 10 - 3 from rings = 7
      // Roll 7 + level 1 - AC 7 = 1, which is < 10, so should miss
      expect(result.hit).toBe(false)
    })
  })

  describe('no ring bonuses', () => {
    test('player attack works without rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      mockRandom.setValues([17, 3])

      const result = service.playerAttack(player, monster)

      // NEW FORMULA: Str 16 gives +0 to-hit (not +16!)
      // Roll + (level + str_to_hit_bonus - AC) >= 10
      // 17 + (1 + 0 - 8) = 17 - 7 = 10 >= 10, so should hit
      expect(result.hit).toBe(true)
    })

    test('monster attack works without rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()

      mockRandom.setValues([10])

      const result = service.monsterAttack(monster, player)

      // Monster level 1 - player AC 10 = -9
      // Roll 10 + modifier -9 = 1, which is < 10, so should miss
      expect(result.hit).toBe(false)
    })
  })

  describe('mixed ring types', () => {
    test('only applies bonuses from relevant ring types', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const strengthRing = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      const protectionRing = createRing('ring-2', RingType.PROTECTION, 1)
      player.equipment.leftRing = strengthRing
      player.equipment.rightRing = protectionRing

      // Test player attack (uses strength bonus)
      // Str 16 + 2 from ring = 18, gives +1 to-hit
      // Roll + (1 + 1 - 8) >= 10, so roll >= 16
      mockRandom.setValues([17, 3])
      const playerResult = service.playerAttack(player, monster)
      expect(playerResult.hit).toBe(true)

      // Test monster attack (uses AC bonus)
      mockRandom.setValues([5])
      const monsterResult = service.monsterAttack(monster, player)
      expect(monsterResult.hit).toBe(false)
    })

    test('ignores non-combat rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const regenRing = createRing('ring-1', RingType.REGENERATION, 2)
      const searchRing = createRing('ring-2', RingType.SEARCHING, 1)
      player.equipment.leftRing = regenRing
      player.equipment.rightRing = searchRing

      // Should work same as no rings (Str 16 gives +0 to-hit)
      // Roll + (1 + 0 - 8) >= 10, so roll >= 17
      mockRandom.setValues([17, 3])
      const playerResult = service.playerAttack(player, monster)
      expect(playerResult.hit).toBe(true)

      mockRandom.setValues([10])
      const monsterResult = service.monsterAttack(monster, player)
      expect(monsterResult.hit).toBe(false)
    })
  })
})
