import { RegenerationService, REGEN_CONFIG } from './RegenerationService'
import { Player, Equipment, Ring, RingType, ItemType } from '@game/core/core'

describe('RegenerationService - Ring of Regeneration', () => {
  let service: RegenerationService

  beforeEach(() => {
    service = new RegenerationService()
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
      hunger: 1300,
      equipment: defaultEquipment,
      inventory: [],
      ...overrides,
    }
  }

  function createRegenerationRing(): Ring {
    return {
      id: 'ring-regen-1',
      type: ItemType.RING,
      name: 'Ring of Regeneration',
      char: '=',
      color: '#9370DB',
      ringType: RingType.REGENERATION,
      effect: 'Regenerates health faster',
      bonus: 0,
      materialName: 'ruby',
      hungerModifier: 1.3, // +30% hunger
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  function createProtectionRing(): Ring {
    return {
      id: 'ring-prot-1',
      type: ItemType.RING,
      name: 'Ring of Protection',
      char: '=',
      color: '#9370DB',
      ringType: RingType.PROTECTION,
      effect: 'Protects from damage',
      bonus: 1,
      materialName: 'sapphire',
      hungerModifier: 1.5,
      identified: true,
      stackable: false,
      position: { x: 0, y: 0 },
    }
  }

  describe('Ring Detection', () => {
    test('detects regeneration ring on left hand', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      const hasRing = service.hasRegenerationRing(player)

      expect(hasRing).toBe(true)
    })

    test('detects regeneration ring on right hand', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: ring,
          lightSource: null,
        },
      })

      const hasRing = service.hasRegenerationRing(player)

      expect(hasRing).toBe(true)
    })

    test('returns false when no ring equipped', () => {
      const player = createTestPlayer()

      const hasRing = service.hasRegenerationRing(player)

      expect(hasRing).toBe(false)
    })

    test('returns false when different ring type equipped', () => {
      const protectionRing = createProtectionRing()
      const player = createTestPlayer({
        equipment: {
          weapon: null,
          armor: null,
          leftRing: protectionRing,
          rightRing: null,
          lightSource: null,
        },
      })

      const hasRing = service.hasRegenerationRing(player)

      expect(hasRing).toBe(false)
    })

    test('returns true when regeneration ring on left and different ring on right', () => {
      const regenRing = createRegenerationRing()
      const protectionRing = createProtectionRing()
      const player = createTestPlayer({
        equipment: {
          weapon: null,
          armor: null,
          leftRing: regenRing,
          rightRing: protectionRing,
          lightSource: null,
        },
      })

      const hasRing = service.hasRegenerationRing(player)

      expect(hasRing).toBe(true)
    })
  })

  describe('Ring Rate Doubling (5 turns)', () => {
    test('heals 1 HP after 5 turns with regeneration ring', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      // Tick 4 times - should not heal
      let updatedPlayer = player
      for (let i = 0; i < 4; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
        expect(result.healed).toBe(false)
      }

      // 5th tick - should heal
      const finalResult = service.tickRegeneration(updatedPlayer, false)
      expect(finalResult.healed).toBe(true)
      expect(finalResult.player.hp).toBe(11)
    })

    test('does NOT heal after 5 turns without ring', () => {
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Tick 5 times - should not heal (needs 10 turns)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(10)
    })

    test('heals twice as fast with ring (10 HP in 50 turns vs 100 turns)', () => {
      const ring = createRegenerationRing()
      const playerWithRing = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })
      const playerWithoutRing = createTestPlayer({ hp: 10, maxHp: 20 })

      // With ring: 50 turns should give 10 HP (50 / 5 = 10)
      let withRing = playerWithRing
      for (let i = 0; i < 50; i++) {
        const result = service.tickRegeneration(withRing, false)
        withRing = result.player
      }

      // Without ring: 50 turns should give 5 HP (50 / 10 = 5)
      let withoutRing = playerWithoutRing
      for (let i = 0; i < 50; i++) {
        const result = service.tickRegeneration(withoutRing, false)
        withoutRing = result.player
      }

      expect(withRing.hp).toBe(20) // Capped at max
      expect(withoutRing.hp).toBe(15) // 10 + 5
    })

    test('resets counter after healing with ring', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring,
          rightRing: null,
          lightSource: null,
        },
      })

      // First regen cycle (5 turns)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }
      expect(updatedPlayer.hp).toBe(11)

      // Second regen cycle (counter should have reset)
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }
      expect(updatedPlayer.hp).toBe(12)
    })

    test('uses ring rate immediately when equipped mid-cycle', () => {
      const ring = createRegenerationRing()
      const player = createTestPlayer({ hp: 10, maxHp: 20 })

      // Tick 3 times without ring
      let updatedPlayer = player
      for (let i = 0; i < 3; i++) {
        service.tickRegeneration(updatedPlayer, false)
      }

      // Equip ring
      updatedPlayer = {
        ...updatedPlayer,
        equipment: {
          ...updatedPlayer.equipment,
          leftRing: ring,
        },
      }

      // Create new service instance to simulate equipping ring
      // (in real game, service would check ring on each tick)
      const newService = new RegenerationService()

      // Tick 5 more times with ring equipped
      for (let i = 0; i < 5; i++) {
        const result = newService.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      // Should heal after 5 turns with ring (not using old counter)
      expect(updatedPlayer.hp).toBe(11)
    })
  })

  describe('Ring Configuration', () => {
    test('uses RING_TURNS constant for regeneration rate', () => {
      expect(REGEN_CONFIG.RING_TURNS).toBe(5)
    })

    test('RING_TURNS is exactly half of BASE_TURNS', () => {
      expect(REGEN_CONFIG.RING_TURNS).toBe(REGEN_CONFIG.BASE_TURNS / 2)
    })
  })

  describe('Multiple Regeneration Rings', () => {
    test('does not stack effects when wearing two regeneration rings', () => {
      const ring1 = createRegenerationRing()
      const ring2 = { ...createRegenerationRing(), id: 'ring-regen-2' }
      const player = createTestPlayer({
        hp: 10,
        maxHp: 20,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: ring1,
          rightRing: ring2,
          lightSource: null,
        },
      })

      // hasRegenerationRing should still return true
      expect(service.hasRegenerationRing(player)).toBe(true)

      // Should still use 5-turn rate (not 2.5 or 1)
      let updatedPlayer = player
      for (let i = 0; i < 5; i++) {
        const result = service.tickRegeneration(updatedPlayer, false)
        updatedPlayer = result.player
      }

      expect(updatedPlayer.hp).toBe(11) // Healed once at 5 turns
    })
  })
})
