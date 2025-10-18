import { PlayerFactory } from '@factories/PlayerFactory'
import { Player, Position } from '@game/core/core'

/**
 * Create a test Player with all required fields initialized via PlayerFactory.
 * Accepts overrides for customization in tests.
 *
 * This is the single source of truth for test Player creation, delegating to
 * PlayerFactory to ensure all required fields are properly initialized.
 *
 * @example
 * const player = createTestPlayer()  // All defaults
 * const lowHpPlayer = createTestPlayer({ hp: 5 })  // Override hp
 * const playerAtPos = createTestPlayer({ position: { x: 10, y: 20 } })
 */
export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  const defaultPlayer = PlayerFactory.create({ x: 5, y: 5 })
  return {
    ...defaultPlayer,
    ...overrides,
    // Ensure nested objects are properly merged
    equipment: {
      ...defaultPlayer.equipment,
      ...(overrides.equipment || {})
    },
    position: overrides.position || defaultPlayer.position
  }
}
