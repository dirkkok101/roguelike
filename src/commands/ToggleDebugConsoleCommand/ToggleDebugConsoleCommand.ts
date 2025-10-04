import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleDebugConsoleCommand - Show/hide debug console UI
 *
 * Effects:
 * - Toggles debug panel visibility
 * - Panel shows seed, god mode status, turn count
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleDebugConsoleCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleDebugConsole(state)
  }
}
