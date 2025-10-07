import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Monster, Ring, RingType, ItemType } from '@game/core/core'

describe('CombatService - Equipment Bonuses', () => {
  let service: CombatService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom([])
    ringService = new RingService(mockRandom)
    service = new CombatService(mockRandom, ringService)
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 0, y: 0 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 10,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestMonster(): Monster {
    return {
      id: 'bat-1',
      letter: 'B',
      name: 'Bat',
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
      mockRandom.setValues([10, 3]) // Hit roll, then damage roll

      const result = service.playerAttack(player, monster)

      // With strength 16 + 2 from ring = 18, level 1: modifier = 19
      // Roll 10 + modifier 19 - AC 8 = 21, which is >= 10, so should hit
      expect(result.hit).toBe(true)
    })

    test('adds strength bonus to hit calculation - right ring', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const ring = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      player.equipment.rightRing = ring

      mockRandom.setValues([10, 3])

      const result = service.playerAttack(player, monster)
      expect(result.hit).toBe(true)
    })

    test('stacks strength bonus from both rings', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const leftRing = createRing('ring-1', RingType.ADD_STRENGTH, 2)
      const rightRing = createRing('ring-2', RingType.ADD_STRENGTH, 3)
      player.equipment.leftRing = leftRing
      player.equipment.rightRing = rightRing

      mockRandom.setValues([5, 3]) // Lower base roll

      const result = service.playerAttack(player, monster)

      // With strength 16 + 2 + 3 = 21, level 1: modifier = 22
      // Roll 5 + modifier 22 - AC 8 = 19, which is >= 10, so should hit
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

      mockRandom.setValues([10, 3])

      const result = service.playerAttack(player, monster)

      // With strength 16, level 1: modifier = 17
      // Roll 10 + modifier 17 - AC 8 = 19, which is >= 10, so should hit
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
      mockRandom.setValues([10, 3])
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

      // Should work same as no rings
      mockRandom.setValues([10, 3])
      const playerResult = service.playerAttack(player, monster)
      expect(playerResult.hit).toBe(true)

      mockRandom.setValues([10])
      const monsterResult = service.monsterAttack(monster, player)
      expect(monsterResult.hit).toBe(false)
    })
  })
})
