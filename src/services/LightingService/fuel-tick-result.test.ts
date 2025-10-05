import { LightingService, FuelTickResult } from './LightingService'
import { MockRandom } from '@services/RandomService'
import { Player, LightSource } from '@game/core/core'

describe('LightingService - Fuel Tick Result', () => {
  let service: LightingService
  let mockRandom: MockRandom
  let basePlayer: Player

  beforeEach(() => {
    mockRandom = new MockRandom([])
    service = new LightingService(mockRandom)
    basePlayer = {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      ac: 10,
      hunger: 1300,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
    } as Player
  })

  describe('No light source', () => {
    test('returns player unchanged with no messages', () => {
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: null } }

      const result: FuelTickResult = service.tickFuel(player)

      expect(result.player).toBe(player)
      expect(result.messages).toEqual([])
    })
  })

  describe('Permanent light (artifact)', () => {
    test('returns player unchanged with no messages', () => {
      const artifact: LightSource = {
        type: 'artifact',
        radius: 3,
        isPermanent: true,
        name: 'Glowing Amulet',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: artifact } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource).toEqual(artifact)
      expect(result.messages).toEqual([])
    })
  })

  describe('Fuel depletion', () => {
    test('reduces fuel by 1 each tick', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 500,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(499)
      expect(result.messages).toEqual([])
    })

    test('does not go below 0', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 0,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(0)
      expect(result.messages).toEqual([])
    })

    test('returns new player object (immutability)', () => {
      const torch = service.createTorch()
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player).not.toBe(player)
      expect(result.player.equipment).not.toBe(player.equipment)
      expect(result.player.equipment.lightSource).not.toBe(player.equipment.lightSource)
    })
  })

  describe('Fuel warnings', () => {
    test('warns at 50 fuel remaining', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 51,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(50)
      expect(result.messages).toContainEqual({
        text: 'Your torch is getting dim...',
        type: 'warning'
      })
    })

    test('warns at 10 fuel remaining', () => {
      const lantern: LightSource = {
        type: 'lantern',
        radius: 2,
        isPermanent: false,
        fuel: 11,
        maxFuel: 1000,
        name: 'Lantern',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: lantern } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(10)
      expect(result.messages).toContainEqual({
        text: 'Your lantern flickers...',
        type: 'critical'
      })
    })

    test('warns when light goes out (0 fuel)', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 1,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(0)
      expect(result.messages).toContainEqual({
        text: 'Your torch goes out! You are in darkness!',
        type: 'critical'
      })
    })

    test('does not warn between milestones', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 100,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.player.equipment.lightSource?.fuel).toBe(99)
      expect(result.messages).toEqual([])
    })
  })

  describe('Complete result integration', () => {
    test('returns all required fields', () => {
      const torch = service.createTorch()
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result).toHaveProperty('player')
      expect(result).toHaveProperty('messages')
      expect(result.player).toBeDefined()
      expect(Array.isArray(result.messages)).toBe(true)
    })

    test('messages array is always present even when empty', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 100,
        maxFuel: 500,
        name: 'Torch',
      }
      const player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      const result = service.tickFuel(player)

      expect(result.messages).toBeDefined()
      expect(result.messages).toEqual([])
    })

    test('handles multiple ticks correctly', () => {
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 52,
        maxFuel: 500,
        name: 'Torch',
      }
      let player = { ...basePlayer, equipment: { ...basePlayer.equipment, lightSource: torch } }

      // Tick 1: 52 -> 51 (no warning)
      let result = service.tickFuel(player)
      expect(result.player.equipment.lightSource?.fuel).toBe(51)
      expect(result.messages).toEqual([])

      // Tick 2: 51 -> 50 (warning)
      result = service.tickFuel(result.player)
      expect(result.player.equipment.lightSource?.fuel).toBe(50)
      expect(result.messages).toContainEqual({
        text: 'Your torch is getting dim...',
        type: 'warning'
      })

      // Tick 3: 50 -> 49 (no warning)
      result = service.tickFuel(result.player)
      expect(result.player.equipment.lightSource?.fuel).toBe(49)
      expect(result.messages).toEqual([])
    })
  })
})
