import { GameState } from '@types/core/core'

// ============================================================================
// COMMAND INTERFACE - All commands implement this
// ============================================================================

export interface ICommand {
  execute(state: GameState): GameState
}
