import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleGodModeCommand - Enable/disable god mode
 *
 * Effects:
 * - Player invincible (no damage taken)
 * - Infinite hunger (never starves)
 * - Infinite light (torches/lanterns never run out)
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleGodModeCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleGodMode(state)
  }
}
