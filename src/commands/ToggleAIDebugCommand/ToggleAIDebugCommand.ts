import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * ToggleAIDebugCommand - Toggle AI debug overlay
 *
 * Effects:
 * - Shows/hides AI state visualization
 * - Displays monster states (SLEEPING/HUNTING/FLEEING)
 * - Shows behavior types (SMART/SIMPLE/etc.)
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleAIDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.DEBUG_TOGGLE_AI,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    return this.debugService.toggleAIDebug(state)
  }
}
