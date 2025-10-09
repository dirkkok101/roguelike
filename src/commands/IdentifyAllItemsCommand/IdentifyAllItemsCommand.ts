import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * IdentifyAllItemsCommand - Identify all item types in the game
 *
 * Effects:
 * - Marks all potions, scrolls, rings, and wands as identified
 * - Shows real names instead of appearance descriptions
 * - Debug command for testing item mechanics
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class IdentifyAllItemsCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.identifyAll(state)
  }
}
