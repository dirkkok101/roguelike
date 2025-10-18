import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { Player } from '@game/core/core'
import { PlayerFactory } from '../../factories/PlayerFactory'

/**
 * Test that TurnService preserves ALL Player fields through energy operations
 * 
 * CRITICAL BUG: consumePlayerEnergy() was losing isRunning and runState fields
 * Symptom: First move works, second move fails with "Player missing required fields: isRunning"
 * Root cause: Generic consumeEnergy() method not preserving all Player fields
 */
describe('TurnService - Player field preservation', () => {
  let service: TurnService
  let player: Player

  beforeEach(() => {
    const statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    service = new TurnService(statusEffectService, levelService)
    
    // Create player with ALL fields initialized
    player = PlayerFactory.create({ x: 5, y: 5 })
  })

  describe('consumePlayerEnergy preserves all Player fields', () => {
    it('should preserve isRunning=false and runState=null', () => {
      // Arrange: Player with default running state
      expect(player.isRunning).toBe(false)
      expect(player.runState).toBe(null)
      const initialEnergy = player.energy

      // Act: Consume energy
      const result = service.consumePlayerEnergy(player)

      // Assert: All fields preserved
      expect(result.energy).toBe(initialEnergy - 100) // Energy consumed
      expect(result.isRunning).toBe(false) // BUG: This field was lost!
      expect(result.runState).toBe(null) // BUG: This field was lost!
      expect(result.hp).toBe(player.hp)
      expect(result.position).toEqual(player.position)
      expect(result.statusEffects).toEqual(player.statusEffects)
    })

    it('should preserve isRunning=true and runState when running', () => {
      // Arrange: Player in running state
      const runningPlayer = {
        ...player,
        isRunning: true,
        runState: {
          direction: 'right' as const,
          initialPosition: { x: 5, y: 5 },
          previousHP: 16,
        },
      }

      // Act: Consume energy
      const result = service.consumePlayerEnergy(runningPlayer)

      // Assert: Running state preserved
      expect(result.isRunning).toBe(true)
      expect(result.runState).toEqual({
        direction: 'right',
        initialPosition: { x: 5, y: 5 },
        previousHP: 16,
      })
    })

    it('should preserve ALL Player fields across multiple consume calls', () => {
      // Arrange: Start with full Player
      let current = { ...player, energy: 500 } // Lots of energy

      // Act: Consume energy 5 times (simulating 5 moves)
      for (let i = 0; i < 5; i++) {
        current = service.consumePlayerEnergy(current)
        
        // Assert: isRunning and runState still present after each consumption
        expect(current.isRunning).toBe(false)
        expect(current.runState).toBe(null)
        expect(current.energy).toBe(500 - (i + 1) * 100)
      }
    })
  })

  describe('grantEnergy preserves all Player fields', () => {
    it('should preserve isRunning and runState when granting energy', () => {
      // Arrange: Player with running state
      const runningPlayer = {
        ...player,
        energy: 50,
        isRunning: true,
        runState: {
          direction: 'up' as const,
          initialPosition: { x: 3, y: 7 },
          previousHP: 16,
        },
      }

      // Act: Grant energy
      const result = service.grantEnergy(runningPlayer, 10)

      // Assert: All fields preserved
      expect(result.energy).toBe(60)
      expect(result.isRunning).toBe(true)
      expect(result.runState).toEqual(runningPlayer.runState)
    })
  })
})
