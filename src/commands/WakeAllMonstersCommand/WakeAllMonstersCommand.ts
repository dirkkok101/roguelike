import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * WakeAllMonstersCommand - Wake all sleeping monsters
 *
 * Effects:
 * - Sets all monsters to awake
 * - Changes SLEEPING state to HUNTING
 * - Useful for quick combat testing
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class WakeAllMonstersCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.wakeAllMonsters(state)
  }
}
