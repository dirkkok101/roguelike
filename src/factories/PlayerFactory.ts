import { Player, Position } from '@game/core/core'

/**
 * Factory for creating Player objects with all required fields initialized.
 *
 * This is the single source of truth for Player creation to prevent runtime
 * errors from missing fields (energy, statusEffects, etc.)
 *
 * @example
 * const player = PlayerFactory.create({ x: 10, y: 10 })
 */
export class PlayerFactory {
  /**
   * Create a new Player with all required fields properly initialized
   *
   * @param position - Starting position for the player
   * @returns Fully initialized Player object
   */
  static create(position: Position): Player {
    return {
      // Position
      position,

      // Core stats
      hp: 12,
      maxHp: 12,
      strength: 16,
      maxStrength: 16,
      ac: 8,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,

      // Turn system (FIX: These were missing, causing runtime errors)
      energy: 0,
      statusEffects: [],
      isRunning: false,
      runState: null,

      // Equipment
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },

      // Inventory
      inventory: [],
    }
  }
}
