import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * KillAllMonstersCommand - Remove all monsters from level
 *
 * Effects:
 * - Removes all monsters from current level
 * - Useful for clearing combat scenarios
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class KillAllMonstersCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.killAllMonsters(state)
  }
}
