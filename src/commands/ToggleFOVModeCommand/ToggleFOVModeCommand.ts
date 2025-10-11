import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleFOVModeCommand - Toggle FOV mode between radius and room-reveal
 *
 * Effects:
 * - Switches between radius-based FOV (default) and room-reveal mode
 * - Room-reveal mode reveals entire rooms upon entry (like 1980 Rogue)
 * - Shows confirmation message
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleFOVModeCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleFOVMode(state)
  }
}
