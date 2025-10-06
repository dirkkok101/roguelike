import { Player, GoldPile, Position } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// GOLD SERVICE - Gold calculation, pickup, and leprechaun mechanics
// ============================================================================

/**
 * GoldService handles all gold-related operations using authentic Rogue 1980 formulas
 *
 * Key formulas:
 * - GOLDCALC = random(50 + 10 * depth) + 2
 * - Leprechaun steal: 5x GOLDCALC (failed save) or 1x GOLDCALC (successful save)
 * - Leprechaun drop: 5x GOLDCALC (successful save) or 1x GOLDCALC (failed save)
 */
export class GoldService {
  constructor(private random: IRandomService) {}

  /**
   * Calculate gold amount using original Rogue 1980 formula
   * Formula: GOLDCALC = random(50 + 10 * depth) + 2
   *
   * Examples:
   * - Level 1: 2-61 gold
   * - Level 5: 2-101 gold
   * - Level 10: 2-151 gold
   *
   * @param depth Dungeon depth (1-10)
   * @returns Gold amount
   */
  calculateGoldAmount(depth: number): number {
    const max = 50 + 10 * depth
    return this.random.nextInt(0, max) + 2
  }

  /**
   * Add gold to player (immutable)
   *
   * @param player Current player state
   * @param amount Gold amount to add
   * @returns New player with updated gold
   */
  pickupGold(player: Player, amount: number): Player {
    return {
      ...player,
      gold: player.gold + amount,
    }
  }

  /**
   * Create a gold pile at a position
   *
   * @param position Position for gold pile
   * @param amount Gold amount
   * @returns New GoldPile object
   */
  dropGold(position: Position, amount: number): GoldPile {
    return {
      position: { ...position }, // Copy by value to prevent mutations
      amount,
    }
  }

  /**
   * Calculate how much gold a leprechaun steals
   * Uses saving throw to determine if player saves against theft
   *
   * Formula:
   * - Saving throw: (player.level + player.strength) / 2 >= 10
   * - Failed save: steal min(player.gold, 5 * GOLDCALC)
   * - Successful save: steal min(player.gold, GOLDCALC)
   *
   * @param playerGold Current player gold
   * @param playerLevel Player level
   * @param playerStrength Player strength
   * @param depth Current dungeon depth
   * @returns Amount stolen
   */
  calculateLeprechaunSteal(
    playerGold: number,
    playerLevel: number,
    playerStrength: number,
    depth: number
  ): number {
    if (playerGold === 0) return 0

    const savedThrow = this.makeSavingThrow(playerLevel, playerStrength)
    const baseAmount = this.calculateGoldAmount(depth)
    const multiplier = savedThrow ? 1 : 5 // Successful save = 1x, failed = 5x
    const stealAmount = multiplier * baseAmount

    return Math.min(playerGold, stealAmount)
  }

  /**
   * Calculate how much gold a leprechaun drops when killed
   * Uses saving throw - note that drop formula is INVERTED from steal
   * (successful save = 5x, failed save = 1x)
   *
   * @param playerLevel Player level (for saving throw)
   * @param playerStrength Player strength (for saving throw)
   * @param depth Current dungeon depth
   * @returns Amount dropped
   */
  calculateLeprechaunDrop(
    playerLevel: number,
    playerStrength: number,
    depth: number
  ): number {
    const savedThrow = this.makeSavingThrow(playerLevel, playerStrength)
    const baseAmount = this.calculateGoldAmount(depth)
    const multiplier = savedThrow ? 5 : 1 // Successful save = 5x, failed = 1x (inverted from steal)

    return multiplier * baseAmount
  }

  /**
   * Make a saving throw for leprechaun interactions
   * Simplified formula: (player.level + player.strength) / 2 >= 10
   *
   * @param playerLevel Player level
   * @param playerStrength Player strength
   * @returns True if save successful, false otherwise
   */
  private makeSavingThrow(playerLevel: number, playerStrength: number): boolean {
    const saveValue = (playerLevel + playerStrength) / 2
    return saveValue >= 10
  }
}
