import { Player, Ring, RingType } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// HUNGER STATE ENUM
// ============================================================================

export enum HungerState {
  NORMAL = 'NORMAL', // 301+ food units, no effects
  HUNGRY = 'HUNGRY', // 150-300 food units, warning only
  WEAK = 'WEAK', // 1-149 food units, combat penalties
  STARVING = 'STARVING', // 0 food units, combat penalties + starvation damage
}

// ============================================================================
// HUNGER SERVICE - Hunger mechanics and food consumption
// ============================================================================

export class HungerService {
  constructor(private random: IRandomService) {}

  /**
   * Tick hunger depletion (call each turn)
   * Base rate: -1/turn
   * Ring modifier: +0.5 per equipped ring (except SLOW_DIGESTION which is -0.5)
   */
  tickHunger(player: Player): Player {
    // Get equipped rings
    const rings: Ring[] = [
      player.equipment.leftRing,
      player.equipment.rightRing,
    ].filter(Boolean) as Ring[]

    // Calculate depletion rate
    const rate = this.calculateHungerRate(rings)

    // Apply depletion (don't go below 0)
    const newHunger = Math.max(0, player.hunger - rate)

    return {
      ...player,
      hunger: newHunger,
    }
  }

  /**
   * Feed player with food ration
   * Restores random 1100-1499 hunger units (capped at 2000)
   */
  feed(player: Player, nutrition: number): { player: Player; message: string } {
    // Cap hunger at 2000 max
    const newHunger = Math.min(2000, player.hunger + nutrition)

    const updatedPlayer = {
      ...player,
      hunger: newHunger,
    }

    // Generate message
    let message = `You eat the food ration. (+${nutrition} hunger)`

    if (newHunger === 2000) {
      message += ' You are completely full.'
    }

    return { player: updatedPlayer, message }
  }

  /**
   * Get current hunger state based on food units
   */
  getHungerState(foodUnits: number): HungerState {
    if (foodUnits <= 0) return HungerState.STARVING
    if (foodUnits < 150) return HungerState.WEAK
    if (foodUnits <= 300) return HungerState.HUNGRY
    return HungerState.NORMAL
  }

  /**
   * Get combat penalties for current hunger state
   * Weak state: -1 to hit, -1 damage
   * Starving state: -1 to hit, -1 damage
   * Other states: no penalty
   */
  applyHungerEffects(player: Player): {
    toHitPenalty: number
    damagePenalty: number
  } {
    const state = this.getHungerState(player.hunger)

    if (state === HungerState.WEAK || state === HungerState.STARVING) {
      return { toHitPenalty: -1, damagePenalty: -1 }
    }

    return { toHitPenalty: 0, damagePenalty: 0 }
  }

  /**
   * Calculate hunger depletion rate based on equipped rings
   * Base: 1
   * Each ring: +0.5 (except SLOW_DIGESTION: -0.5)
   */
  calculateHungerRate(rings: Ring[]): number {
    let rate = 1.0 // Base rate

    rings.forEach((ring) => {
      if (!ring) return

      if (ring.ringType === RingType.SLOW_DIGESTION) {
        rate -= 0.5 // Reduces hunger
      } else {
        rate += 0.5 // Most rings increase hunger
      }
    })

    return Math.max(0, rate) // Never negative
  }

  /**
   * Apply starvation damage (1 HP per turn at 0 hunger)
   */
  applyStarvationDamage(player: Player): Player {
    if (player.hunger > 0) {
      return player // Not starving, no damage
    }

    // Reduce HP by 1, but don't go below 0
    const newHp = Math.max(0, player.hp - 1)

    return {
      ...player,
      hp: newHp,
    }
  }

  /**
   * Generate hunger warning message if state changed
   */
  generateHungerWarning(
    oldState: HungerState,
    newState: HungerState
  ): string | null {
    // Only warn when getting worse (not improving)
    if (oldState === newState) return null
    if (this.isImproving(oldState, newState)) return null

    // Generate warning based on new state
    switch (newState) {
      case HungerState.HUNGRY:
        return 'You are getting hungry'
      case HungerState.WEAK:
        return 'You are weak from hunger!'
      case HungerState.STARVING:
        return 'You are fainting!'
      default:
        return null
    }
  }

  /**
   * Check if hunger state is improving (getting better)
   */
  private isImproving(
    oldState: HungerState,
    newState: HungerState
  ): boolean {
    const stateOrder = {
      [HungerState.STARVING]: 0,
      [HungerState.WEAK]: 1,
      [HungerState.HUNGRY]: 2,
      [HungerState.NORMAL]: 3,
    }

    return stateOrder[newState] > stateOrder[oldState]
  }
}
