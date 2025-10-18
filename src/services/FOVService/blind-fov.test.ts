import { FOVService } from './FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { RoomDetectionService } from '@services/RoomDetectionService'
import { Player, Level, Equipment, StatusEffectType, Position } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestLevel(): Level {
  const width = 20
  const height = 10

  // Create all transparent floor tiles
  const tiles = Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({
          type: 'FLOOR' as const,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#888',
          colorExplored: '#444',
        }))
    )

  const explored = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false))

  return {
    depth: 1,
    width,
    height,
    tiles,
    rooms: [],
    doors: [],
    traps: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: null,
    explored,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('FOVService - Blind FOV', () => {
  let statusEffectService: StatusEffectService
  let roomDetectionService: RoomDetectionService
  let fovService: FOVService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    roomDetectionService = new RoomDetectionService()
    fovService = new FOVService(statusEffectService, roomDetectionService)
  })

  describe('computeFOV with blindness', () => {
    test('returns normal FOV when player is not blind', () => {
      const player = createTestPlayer()
      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      const result = fovService.computeFOV(origin, 2, level, player)

      // Should have multiple visible cells (origin + radius 2 FOV)
      expect(result.size).toBeGreaterThan(1)
      expect(result.has('5,5')).toBe(true) // Origin always visible
    })

    test('returns empty set when player is blind', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      const result = fovService.computeFOV(origin, 2, level, player)

      // Blind player sees nothing
      expect(result.size).toBe(0)
      expect(result.has('5,5')).toBe(false)
    })

    test('returns empty set even with large radius when blind', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      // Large radius doesn't help when blind
      const result = fovService.computeFOV(origin, 10, level, player)

      expect(result.size).toBe(0)
    })

    test('works without player parameter (backward compatibility)', () => {
      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      // Should work normally without player
      const result = fovService.computeFOV(origin, 2, level)

      expect(result.size).toBeGreaterThan(1)
      expect(result.has('5,5')).toBe(true)
    })

    test('returns normal FOV when player has other status effects but not blind', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      const result = fovService.computeFOV(origin, 2, level, player)

      // Confusion and haste don't affect vision
      expect(result.size).toBeGreaterThan(1)
      expect(result.has('5,5')).toBe(true)
    })

    test('blindness overrides even when other status effects present', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      const result = fovService.computeFOV(origin, 2, level, player)

      // Blind overrides all other effects
      expect(result.size).toBe(0)
    })

    test('vision returns when blindness expires', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 1)

      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      // Blind: no vision
      const blindResult = fovService.computeFOV(origin, 2, level, player)
      expect(blindResult.size).toBe(0)

      // Tick status effects (blindness expires)
      const tickResult = statusEffectService.tickStatusEffects(player)
      player = tickResult.player

      // Vision restored
      const normalResult = fovService.computeFOV(origin, 2, level, player)
      expect(normalResult.size).toBeGreaterThan(1)
      expect(normalResult.has('5,5')).toBe(true)
    })

    test('returns empty set at radius 0 regardless of blindness', () => {
      const player = createTestPlayer()
      const level = createTestLevel()
      const origin: Position = { x: 5, y: 5 }

      // Radius 0 without blind
      const normalResult = fovService.computeFOV(origin, 0, level, player)
      expect(normalResult.size).toBe(1) // Just origin
      expect(normalResult.has('5,5')).toBe(true)

      // Radius 0 with blind
      let blindPlayer = createTestPlayer()
      blindPlayer = statusEffectService.addStatusEffect(blindPlayer, StatusEffectType.BLIND, 40)
      const blindResult = fovService.computeFOV(origin, 0, level, blindPlayer)
      expect(blindResult.size).toBe(0) // Nothing when blind
    })
  })
})
