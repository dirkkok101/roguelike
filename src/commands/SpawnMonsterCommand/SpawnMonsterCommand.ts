import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * SpawnMonsterCommand - Spawn monster for testing
 *
 * Shows monster selection UI (A-Z), spawns at player position or nearby
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class SpawnMonsterCommand implements ICommand {
  constructor(
    private letter: string,
    private debugService: DebugService
  ) {}

  execute(state: GameState): GameState {
    return this.debugService.spawnMonster(state, this.letter)
  }
}
