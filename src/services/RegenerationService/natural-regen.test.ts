import { RegenerationService, REGEN_CONFIG } from './RegenerationService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { Player, Equipment, RingType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('RegenerationService - Natural Regeneration', () => {
  let service: RegenerationService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom([])
    ringService = new RingService(mockRandom)
    service = new RegenerationService(ringService)
  })

  function createTestPlayer(overrides?: Partial<Player>): Player {
    const defaultEquipment: Equipment = {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: null,
    }

    return {
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300, // Normal hunger
      equipment: defaultEquipment,
      inventory: [],
      ...overrides,
    }
  }

  describe('Base Regeneration (10 turns)', () => {
    test('heals 1 HP after 10 turns when below max HP', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Tick 9 times - should not heal
      for (let i = 0; i < 9; i++) {
        const result = service.tickRegeneration(player, false, 1)
        expect(result.healed).toBe(false)
        expect(result.player.hp).toBe(10)
      }

      // 10th tick - should heal
      const finalResult = service.tickRegeneration(player, false, 1)
      expect(finalResult.healed).toBe(true)
      expect(finalResult.player.hp).toBe(11)
    })

    test('does not heal when already at max HP', () => {
      const player = createTestPlayer({ hp: 20, maxHp: 20 })

      // Tick 10 times
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(player, false, 1)
        expect(result.healed).toBe(false)
        expect(result.player.hp).toBe(20)
      }
    })

    test('caps HP at max HP (does not overheal)', () => {
      const player = createTestPlayer({ hp: 19, maxHp: 20 })

      // Tick 10 times to trigger regen
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(20) // Not 21
    })

    test('resets counter after healing', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // First regen cycle
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }
      expect(updatedPlayer.hp).toBe(11)

      // Second regen cycle (counter should have reset)
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }
      expect(updatedPlayer.hp).toBe(12)
    })

    test('maintains immutability (returns new player object when healing)', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Tick 10 times to trigger healing
      let result
      for (let i = 0; i < 10; i++) {
        result = service.tickRegeneration(player, false, 1)
      }

      // Original player unchanged
      expect(player.hp).toBe(10)

      // New player returned after healing
      expect(result!.player).not.toBe(player)
      expect(result!.player.hp).toBe(11)
    })
  })

  describe('Hunger Gating', () => {
    test('requires hunger > 100 to regenerate', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20, hunger: 101 })

      // Tick 10 times with hunger just above threshold
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Should heal when hunger > 100
      expect(updatedPlayer.hp).toBe(11)
    })

    test('does not regenerate when hunger <= 100', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20, hunger: 100 })

      // Tick 10 times
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Should NOT heal when hunger <= threshold
      expect(updatedPlayer.hp).toBe(10)
    })

    test('does not regenerate when starving (hunger = 0)', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20, hunger: 0 })

      // Tick 10 times
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(10)
    })

    test('resets counter when hunger drops below threshold', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20, hunger: 1300 })

      // Tick 5 times (halfway to regen)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Now drop hunger below threshold and tick once
      updatedPlayer = { ...updatedPlayer, hunger: 50 }
      service.tickRegeneration(updatedPlayer, false, 1)

      // Restore hunger and tick 5 more times (would be 10 total if counter wasn't reset)
      updatedPlayer = { ...updatedPlayer, hunger: 1300 }
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Should NOT have healed (counter was reset when hunger dropped)
      expect(updatedPlayer.hp).toBe(10)
    })
  })

  describe('Combat Blocking', () => {
    test('does not regenerate when in combat', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })
      const inCombat = true

      // Tick 10 times in combat
      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, inCombat, 1)
        updatedPlayer = result.player
      }

      // Should NOT heal when in combat
      expect(updatedPlayer.hp).toBe(10)
    })

    test('resets counter when entering combat', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Tick 5 times out of combat (halfway to regen)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Enter combat for 1 turn
      service.tickRegeneration(updatedPlayer, true, 1)

      // Exit combat and tick 5 more times
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Should NOT have healed (counter was reset when combat started)
      expect(updatedPlayer.hp).toBe(10)
    })

    test('regenerates normally after combat ends', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Combat for 3 turns
      let updatedPlayer = player
      for (let i = 0; i < 3; i++) {
        service.tickRegeneration(updatedPlayer, true, 1)
      }

      // Combat ends, tick 10 times
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      // Should heal after combat ends
      expect(updatedPlayer.hp).toBe(11)
    })
  })

  describe('Edge Cases', () => {
    test('heals correctly when at 1 HP', () => {
      const player = createTestPlayer({ hp: 1, maxHp: 20 })

      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(2)
    })

    test('heals correctly when 1 HP below max', () => {
      const player = createTestPlayer({ hp: 19, maxHp: 20 })

      let updatedPlayer = player
      for (let i = 0; i < 10; i++) {
        const result = service.tickRegeneration(updatedPlayer, false, 1)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(20)
    })

    test('returns empty messages array', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      const result = service.tickRegeneration(player, false, 1)

      expect(result.messages).toEqual([])
    })

    test('healed flag is false when no regen occurs', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Only 5 turns (not enough)
      const result = service.tickRegeneration(player, false, 1)

      expect(result.healed).toBe(false)
    })

    test('healed flag is true when regen occurs', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // 10 turns
      let result
      for (let i = 0; i < 10; i++) {
        result = service.tickRegeneration(player, false, 1)
      }

      expect(result!.healed).toBe(true)
    })
  })

  describe('Configuration Constants', () => {
    test('uses BASE_TURNS constant for regen rate', () => {
      expect(REGEN_CONFIG.BASE_TURNS).toBe(10)
    })

    test('uses HUNGER_THRESHOLD constant for hunger gate', () => {
      expect(REGEN_CONFIG.HUNGER_THRESHOLD).toBe(100)
    })
  })
})
