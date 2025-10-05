import { GameState } from '@game/core/core'

// ============================================================================
// TURN SERVICE - Turn counter management
// ============================================================================

export class TurnService {
  /**
   * Increment turn counter by 1
   * Returns new GameState with incremented turnCount (immutable)
   */
  incrementTurn(state: GameState): GameState {
    return { ...state, turnCount: state.turnCount + 1 }
  }

  /**
   * Get current turn count
   */
  getCurrentTurn(state: GameState): number {
    return state.turnCount
  }
}
