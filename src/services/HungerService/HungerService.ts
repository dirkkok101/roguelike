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
// RESULT TYPES
// ============================================================================

export interface HungerTickResult {
  player: Player
  messages: string[]
  death?: {
    cause: string
  }
}

// ============================================================================
// HUNGER SERVICE - Hunger mechanics and food consumption
// ============================================================================

export class HungerService {
  constructor(private random: IRandomService) {}

  /**
   * Tick hunger depletion (call each turn)
   * Returns complete result with player, messages, and death status
   *
   * Base rate: -1/turn
   * Ring modifier: +0.5 per equipped ring (except SLOW_DIGESTION which is -0.5)
   */
  tickHunger(player: Player): HungerTickResult {
    // 1. Calculate old state
    const oldState = this.getHungerState(player.hunger)

    // 2. Get equipped rings and calculate rate
    const rings: Ring[] = [
      player.equipment.leftRing,
      player.equipment.rightRing,
    ].filter(Boolean) as Ring[]
    const rate = this.calculateHungerRate(rings)

    // 3. Apply depletion (don't go below 0)
    const newHunger = Math.max(0, player.hunger - rate)
    let updatedPlayer = {
      ...player,
      hunger: newHunger,
    }

    // 4. Calculate new state
    const newState = this.getHungerState(newHunger)

    // 5. Build messages array
    const messages: string[] = []
    const warning = this.generateHungerWarning(oldState, newState)
    if (warning) {
      messages.push(warning)
    }

    // 6. Apply starvation damage if starving
    let death = undefined
    if (newState === HungerState.STARVING) {
      updatedPlayer = this.applyStarvationDamage(updatedPlayer)
      messages.push('You are fainting from hunger!')

      if (updatedPlayer.hp <= 0) {
        death = { cause: 'Died of starvation' }
      }
    }

    return { player: updatedPlayer, messages, death }
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
   * Consume food item
   * Wrapper around feed() for item consumption
   */
  consumeFood(player: Player, nutrition: number): { player: Player; message: string } {
    return this.feed(player, nutrition)
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
