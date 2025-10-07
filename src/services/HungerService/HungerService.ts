import { Player, Ring, RingType } from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { RingService } from '@services/RingService'

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

export interface Message {
  text: string
  type: 'info' | 'success' | 'warning' | 'critical' | 'combat'
}

export interface HungerTickResult {
  player: Player
  messages: Message[]
  death?: {
    cause: string
  }
}

export interface FoodConsumptionResult {
  player: Player
  messages: Message[]
  improved: boolean
}

// ============================================================================
// HUNGER SERVICE - Hunger mechanics and food consumption
// ============================================================================

export class HungerService {
  constructor(
    private random: IRandomService,
    private ringService: RingService
  ) {}

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

    // 2. Calculate hunger depletion rate
    const rate = this.ringService.calculateHungerModifier(player)

    // 3. Apply depletion (don't go below 0)
    const newHunger = Math.max(0, player.hunger - rate)
    let updatedPlayer = {
      ...player,
      hunger: newHunger,
    }

    // 4. Calculate new state
    const newState = this.getHungerState(newHunger)

    // 5. Build messages array with types
    const messages: Message[] = []
    const warning = this.generateHungerWarning(oldState, newState)
    if (warning) {
      messages.push({
        text: warning,
        type: 'warning'
      })
    }

    // 6. Apply starvation damage if starving
    let death = undefined
    if (newState === HungerState.STARVING) {
      updatedPlayer = this.applyStarvationDamage(updatedPlayer)
      messages.push({
        text: 'You are fainting from hunger!',
        type: 'critical'
      })

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
   * Consume food - handles nutrition calculation and improvement messages
   * @param player Player consuming food
   * @param explicitNutrition Optional explicit nutrition value (for items with set nutrition)
   */
  consumeFood(player: Player, explicitNutrition?: number): FoodConsumptionResult {
    // Generate nutrition if not provided (1100-1499 for standard food)
    const nutrition = explicitNutrition ?? this.random.nextInt(1100, 1499)

    // Track old state for improvement detection
    const oldState = this.getHungerState(player.hunger)

    // Feed player (handles capping at 2000)
    const feedResult = this.feed(player, nutrition)
    const newState = this.getHungerState(feedResult.player.hunger)

    // Generate all messages
    const messages: Array<{ text: string; type: 'info' | 'success' | 'warning' | 'critical' | 'combat' }> = []

    // Base eating message
    messages.push({
      text: 'You eat the food ration.',
      type: 'info'
    })

    // Random "yuck" message (30% chance)
    if (this.random.chance(0.3)) {
      messages.push({
        text: 'Yuck, that food tasted awful!',
        type: 'info'
      })
    }

    // Improvement messages
    const improved = this.isImproving(oldState, newState)
    if (improved) {
      const improvementMessage = this.generateImprovementMessage(oldState, newState)
      if (improvementMessage) {
        messages.push({
          text: improvementMessage,
          type: 'success'
        })
      }
    }

    return {
      player: feedResult.player,
      messages,
      improved
    }
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

  /**
   * Generate improvement message based on state transition
   */
  private generateImprovementMessage(
    oldState: HungerState,
    newState: HungerState
  ): string | null {
    if (newState === HungerState.NORMAL) {
      return 'You feel satisfied.'
    }

    if (newState === HungerState.HUNGRY && oldState === HungerState.WEAK) {
      return 'You feel a bit better.'
    }

    if (newState === HungerState.WEAK && oldState === HungerState.STARVING) {
      return 'You feel slightly stronger.'
    }

    return null
  }
}
