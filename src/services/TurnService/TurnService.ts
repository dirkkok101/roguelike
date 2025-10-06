import { GameState, Player, StatusEffectType } from '@game/core/core'
import { StatusEffectService } from '@services/StatusEffectService'
import { ENERGY_THRESHOLD, NORMAL_SPEED, HASTED_SPEED } from '../../constants/energy'

// ============================================================================
// ENERGY SYSTEM TYPES
// ============================================================================

/**
 * Generic actor interface for energy system
 * Any entity with energy can use energy methods
 */
type Actor = { energy: number }

// ============================================================================
// TURN SERVICE - Turn counter and energy management
// ============================================================================

export class TurnService {
  constructor(private statusEffectService: StatusEffectService) {}

  /**
   * Increment turn counter by 1
   * Also ticks all player status effects (decrement duration, remove expired)
   * Returns new GameState with incremented turnCount (immutable)
   */
  incrementTurn(state: GameState): GameState {
    // Tick status effects (decrement durations, remove expired)
    const { player, expired } = this.statusEffectService.tickStatusEffects(state.player)

    // TODO: Add messages for expired effects in Phase 2.6 UI work
    // For now, just silently remove expired effects

    return { ...state, player, turnCount: state.turnCount + 1 }
  }

  /**
   * Get current turn count
   */
  getCurrentTurn(state: GameState): number {
    return state.turnCount
  }

  // ============================================================================
  // ENERGY SYSTEM METHODS
  // ============================================================================

  /**
   * Grant energy to actor based on speed
   * Returns new actor with increased energy (immutable)
   *
   * @param actor - Any entity with energy field
   * @param speed - Speed value (10=normal, 20=hasted, 5=slowed)
   * @returns New actor with energy + speed
   */
  grantEnergy<T extends Actor>(actor: T, speed: number): T {
    return { ...actor, energy: actor.energy + speed }
  }

  /**
   * Check if actor has enough energy to act
   * Actor can act when energy >= ENERGY_THRESHOLD (100)
   *
   * @param actor - Any entity with energy field
   * @returns True if actor.energy >= ENERGY_THRESHOLD
   */
  canAct<T extends Actor>(actor: T): boolean {
    return actor.energy >= ENERGY_THRESHOLD
  }

  /**
   * Consume energy after actor takes action
   * Returns new actor with energy - ENERGY_THRESHOLD (immutable)
   * Energy can carry over (e.g., 150 energy → consume → 50 remains)
   *
   * @param actor - Any entity with energy field
   * @returns New actor with energy - ENERGY_THRESHOLD
   */
  consumeEnergy<T extends Actor>(actor: T): T {
    return { ...actor, energy: actor.energy - ENERGY_THRESHOLD }
  }

  /**
   * Get player's current speed based on status effects
   * Returns HASTED_SPEED (20) if player has HASTED status
   * Returns NORMAL_SPEED (10) otherwise
   *
   * @param player - Player to check
   * @returns Speed value (10 or 20)
   */
  getPlayerSpeed(player: Player): number {
    const hasHaste = this.statusEffectService.hasStatusEffect(player, StatusEffectType.HASTED)
    return hasHaste ? HASTED_SPEED : NORMAL_SPEED
  }

  /**
   * Grant energy to player based on current speed
   * Checks player's status effects to determine speed
   * Returns new GameState with updated player (immutable)
   *
   * @param state - Current game state
   * @returns New GameState with player.energy increased
   */
  grantPlayerEnergy(state: GameState): GameState {
    const speed = this.getPlayerSpeed(state.player)
    const updatedPlayer = this.grantEnergy(state.player, speed)
    return { ...state, player: updatedPlayer }
  }

  /**
   * Consume energy from player after action
   * Wrapper for consumeEnergy() for Player type
   *
   * @param player - Player who took action
   * @returns New Player with energy - ENERGY_THRESHOLD
   */
  consumePlayerEnergy(player: Player): Player {
    return this.consumeEnergy(player)
  }

  /**
   * Check if player has enough energy to act
   * Wrapper for canAct() for Player type
   *
   * @param player - Player to check
   * @returns True if player can act
   */
  canPlayerAct(player: Player): boolean {
    return this.canAct(player)
  }
}
