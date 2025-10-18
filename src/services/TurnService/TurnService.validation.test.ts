import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { RingService } from '@services/RingService'
import { Player, Equipment } from '@game/core/core'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestPlayer(): Player {
  const equipment: Equipment = {
    weapon: null,
    armor: null,
    leftRing: null,
    rightRing: null,
    lightSource: null,
  }

  return {
    position: { x: 5, y: 5 },
    hp: 20,
    maxHp: 20,
    strength: 16,
    maxStrength: 16,
    ac: 5,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment,
    inventory: [],
    statusEffects: [],
    energy: 0,
    isRunning: false,
    runState: null,
  }
}

describe('TurnService - Validation', () => {
  let service: TurnService
  let statusEffect: StatusEffectService
  let level: LevelService
  let ring: RingService

  beforeEach(() => {
    statusEffect = new StatusEffectService()
    level = new LevelService()
    ring = new RingService()
    service = new TurnService(statusEffect, level, ring)
  })

  describe('Player validation', () => {
    it('should throw clear error when player.energy is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), energy: undefined as any }

      expect(() => service.consumePlayerEnergy(invalidPlayer))
        .toThrow('Player missing required fields: energy')
    })

    it('should throw clear error when player.statusEffects is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), statusEffects: undefined as any }

      expect(() => service.getPlayerSpeed(invalidPlayer))
        .toThrow('Player missing required fields: statusEffects')
    })

    it('should throw clear error when player.isRunning is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), isRunning: undefined as any }

      expect(() => service.getPlayerSpeed(invalidPlayer))
        .toThrow('Player missing required fields: isRunning')
    })

    it('should throw error with multiple missing fields', () => {
      const invalidPlayer = {
        ...createTestPlayer(),
        energy: undefined as any,
        statusEffects: undefined as any,
      }

      expect(() => service.consumePlayerEnergy(invalidPlayer))
        .toThrow('Player missing required fields: energy, statusEffects')
    })

    it('should not throw when player is properly initialized', () => {
      const validPlayer = createTestPlayer()

      expect(() => service.consumePlayerEnergy(validPlayer)).not.toThrow()
      expect(() => service.getPlayerSpeed(validPlayer)).not.toThrow()
    })

    it('should include helpful error message pointing to fix', () => {
      const invalidPlayer = { ...createTestPlayer(), energy: undefined as any }

      expect(() => service.consumePlayerEnergy(invalidPlayer))
        .toThrow('Check Player initialization in DungeonService or use PlayerFactory')
    })
  })
})
