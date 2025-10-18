import { PlayerFactory } from './PlayerFactory'
import { Position } from '@game/core/core'

describe('PlayerFactory', () => {
  describe('create', () => {
    it('should create player with all required fields', () => {
      const position: Position = { x: 10, y: 10 }
      const player = PlayerFactory.create(position)

      // Core stats
      expect(player.position).toEqual(position)
      expect(player.hp).toBe(12)
      expect(player.maxHp).toBe(12)
      expect(player.strength).toBe(16)
      expect(player.maxStrength).toBe(16)
      expect(player.ac).toBe(8)
      expect(player.level).toBe(1)
      expect(player.xp).toBe(0)
      expect(player.gold).toBe(0)
      expect(player.hunger).toBe(1300)

      // Fields that were missing (causing runtime errors)
      expect(player.energy).toBe(0)
      expect(player.statusEffects).toEqual([])
      expect(player.isRunning).toBe(false)
      expect(player.runState).toBeNull()

      // Equipment
      expect(player.equipment).toEqual({
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      })

      // Inventory
      expect(player.inventory).toEqual([])
    })

    it('should use provided position', () => {
      const position: Position = { x: 42, y: 99 }
      const player = PlayerFactory.create(position)

      expect(player.position).toEqual(position)
    })
  })
})
