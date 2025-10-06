import { Player, Ring, RingType } from '@game/core/core'

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Comprehensive ring effect result containing all active ring bonuses
 * and passive abilities for the player.
 */
export interface RingEffectResult {
  // Numeric bonuses (stacking)
  acBonus: number               // PROTECTION + DEXTERITY
  strengthBonus: number         // ADD_STRENGTH
  dexterityBonus: number        // DEXTERITY
  hungerModifier: number        // Multiplier for hunger rate (0.0 to 1.8+)

  // Boolean abilities (passive effects)
  hasRegeneration: boolean      // REGENERATION ring equipped
  hasStealth: boolean           // STEALTH ring equipped
  hasSearching: boolean         // SEARCHING ring equipped
  hasSeeInvisible: boolean      // SEE_INVISIBLE ring equipped
  hasSustainStrength: boolean   // SUSTAIN_STRENGTH ring equipped
  hasTeleportation: boolean     // TELEPORTATION ring equipped (cursed)
}

// ============================================================================
// RING SERVICE - Centralized ring effect management
// ============================================================================

/**
 * RingService - Single source of truth for all ring effects
 *
 * Responsibilities:
 * - Query equipped rings
 * - Calculate ring bonuses (AC, strength, dexterity)
 * - Calculate hunger modifiers
 * - Check for passive ring abilities
 * - Provide comprehensive ring effect summaries
 *
 * Design Principles:
 * - Zero dependencies (pure query service)
 * - Immutable (never modifies player state)
 * - Testable (all methods are pure functions)
 *
 * Usage:
 * - Other services inject RingService and call query methods
 * - Commands never call RingService directly (use services)
 *
 * @see docs/services/RingService.md for complete documentation
 */
export class RingService {
  /**
   * Check if player has specific ring type equipped
   * @param player - Player to check
   * @param ringType - Type of ring to look for
   * @returns True if ring is equipped on either hand
   */
  hasRing(player: Player, ringType: RingType): boolean {
    const leftRing = player.equipment.leftRing
    const rightRing = player.equipment.rightRing

    if (leftRing && leftRing.ringType === ringType) {
      return true
    }

    if (rightRing && rightRing.ringType === ringType) {
      return true
    }

    return false
  }

  /**
   * Get total bonus from specific ring type
   * Handles stacking (two rings of same type sum bonuses)
   * Handles cursed rings (negative bonuses)
   *
   * @param player - Player to check
   * @param ringType - Type of ring to get bonus for
   * @returns Total bonus (positive or negative)
   *
   * @example
   * // Player has Protection +1 (left) and Protection +2 (right)
   * getRingBonus(player, RingType.PROTECTION) // Returns 3
   *
   * @example
   * // Player has cursed Protection -2 (left)
   * getRingBonus(player, RingType.PROTECTION) // Returns -2
   */
  getRingBonus(player: Player, ringType: RingType): number {
    let bonus = 0

    const leftRing = player.equipment.leftRing
    const rightRing = player.equipment.rightRing

    if (leftRing && leftRing.ringType === ringType) {
      bonus += leftRing.bonus
    }

    if (rightRing && rightRing.ringType === ringType) {
      bonus += rightRing.bonus
    }

    return bonus
  }

  /**
   * Get array of all equipped rings (left + right)
   * @param player - Player to check
   * @returns Array of equipped rings (0-2 rings)
   */
  getEquippedRings(player: Player): Ring[] {
    const rings: Ring[] = []

    if (player.equipment.leftRing) {
      rings.push(player.equipment.leftRing)
    }

    if (player.equipment.rightRing) {
      rings.push(player.equipment.rightRing)
    }

    return rings
  }

  /**
   * Get comprehensive ring effects for player
   * Returns all active bonuses and passive abilities
   *
   * @param player - Player to analyze
   * @returns Complete ring effect result
   *
   * @example
   * const effects = ringService.getRingEffects(player)
   * if (effects.hasStealth) {
   *   // Don't wake sleeping monsters
   * }
   *
   * const effectiveAC = player.ac - effects.acBonus
   */
  getRingEffects(player: Player): RingEffectResult {
    return {
      // Numeric bonuses (calculated methods below)
      acBonus: this.getACBonus(player),
      strengthBonus: this.getStrengthBonus(player),
      dexterityBonus: this.getDexterityBonus(player),
      hungerModifier: this.calculateHungerModifier(player),

      // Boolean abilities (simple checks)
      hasRegeneration: this.hasRing(player, RingType.REGENERATION),
      hasStealth: this.hasRing(player, RingType.STEALTH),
      hasSearching: this.hasRing(player, RingType.SEARCHING),
      hasSeeInvisible: this.hasRing(player, RingType.SEE_INVISIBLE),
      hasSustainStrength: this.hasRing(player, RingType.SUSTAIN_STRENGTH),
      hasTeleportation: this.hasRing(player, RingType.TELEPORTATION),
    }
  }

  // ============================================================================
  // BONUS CALCULATIONS (AC, Strength, Dexterity)
  // ============================================================================

  /**
   * Get total AC bonus from equipped rings
   * Includes PROTECTION and DEXTERITY rings
   * Lower AC is better, so bonus reduces AC
   *
   * @param player - Player to calculate for
   * @returns Total AC bonus (positive reduces AC, negative increases AC)
   *
   * @example
   * // Player AC: 5, Protection +2, Dexterity +1
   * // Effective AC = 5 - getACBonus(player) = 5 - 3 = 2
   */
  getACBonus(player: Player): number {
    let bonus = 0

    // PROTECTION ring bonus
    bonus += this.getRingBonus(player, RingType.PROTECTION)

    // DEXTERITY ring also improves AC
    bonus += this.getRingBonus(player, RingType.DEXTERITY)

    return bonus
  }

  /**
   * Get total strength bonus from equipped rings
   * Only ADD_STRENGTH rings provide strength bonus
   *
   * @param player - Player to calculate for
   * @returns Total strength bonus
   */
  getStrengthBonus(player: Player): number {
    return this.getRingBonus(player, RingType.ADD_STRENGTH)
  }

  /**
   * Get total dexterity bonus from equipped rings
   * Only DEXTERITY rings provide dexterity bonus
   *
   * @param player - Player to calculate for
   * @returns Total dexterity bonus
   */
  getDexterityBonus(player: Player): number {
    return this.getRingBonus(player, RingType.DEXTERITY)
  }

  // ============================================================================
  // HUNGER MODIFIER CALCULATION
  // ============================================================================

  /**
   * Calculate hunger consumption modifier based on equipped rings
   *
   * Rules:
   * - Base rate: 1.0 (normal hunger consumption)
   * - REGENERATION: +0.3 per ring (30% increase)
   * - SLOW_DIGESTION: -0.5 per ring (50% decrease)
   * - All other rings: +0.5 per ring (50% increase)
   * - Never negative: Math.max(0, rate)
   *
   * @param player - Player to calculate for
   * @returns Hunger modifier (0.0 to 1.8+)
   *
   * @example
   * // No rings: 1.0 (normal)
   * // REGENERATION: 1.3 (30% faster hunger)
   * // SLOW_DIGESTION: 0.5 (50% slower hunger)
   * // Two SLOW_DIGESTION: 0.0 (no hunger consumption!)
   * // PROTECTION + ADD_STRENGTH: 2.0 (100% faster hunger)
   */
  calculateHungerModifier(player: Player): number {
    let rate = 1.0 // Base rate

    const rings = this.getEquippedRings(player)

    rings.forEach((ring) => {
      if (ring.ringType === RingType.SLOW_DIGESTION) {
        rate -= 0.5 // Reduces hunger
      } else if (ring.ringType === RingType.REGENERATION) {
        rate += 0.3 // Ring of Regeneration: +30% hunger
      } else {
        rate += 0.5 // Most rings increase hunger
      }
    })

    return Math.max(0, rate) // Never negative
  }
}
