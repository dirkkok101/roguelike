import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * RevealMapCommand - Reveal entire current level
 *
 * Effects:
 * - Marks all tiles as explored
 * - Useful for testing dungeon generation
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class RevealMapCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.revealMap(state)
  }
}
