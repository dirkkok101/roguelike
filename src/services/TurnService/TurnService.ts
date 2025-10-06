import { GameState } from '@game/core/core'
import { StatusEffectService } from '@services/StatusEffectService'

// ============================================================================
// TURN SERVICE - Turn counter management
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
}
