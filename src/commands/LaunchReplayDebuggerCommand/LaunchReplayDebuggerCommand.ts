import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { ReplayDebugState } from '../../states/ReplayDebugState'

/**
 * LaunchReplayDebuggerCommand - Launch replay debugger for current game
 *
 * Purpose: Opens the console-based replay debugger for the current game.
 *
 * Orchestration:
 * 1. Check if replay data exists (via ReplayDebuggerService)
 * 2. If exists, push ReplayDebugState onto state stack
 * 3. User can step through replay, validate determinism, etc.
 *
 * Usage (from debug mode):
 * ```typescript
 * // Press 'r' in debug mode
 * const command = new LaunchReplayDebuggerCommand(
 *   replayDebugger,
 *   stateManager
 * )
 * const newState = command.execute(gameState)
 * ```
 *
 * **Architecture Notes**:
 * - This is a Command (orchestration) not a Service (business logic)
 * - Coordinates ReplayDebuggerService + GameStateManager
 * - Pushes new state onto stack (modal overlay pattern)
 */
export class LaunchReplayDebuggerCommand implements ICommand {
  constructor(
    private replayDebugger: ReplayDebuggerService,
    private stateManager: GameStateManager
  ) {}

  /**
   * Execute launch replay debugger command
   *
   * @param state - Current game state (provides gameId)
   * @returns Unchanged game state (state stack push is side-effect)
   */
  async execute(state: GameState): Promise<GameState> {
    console.log('🎬 Launching replay debugger for game:', state.gameId)

    try {
      // Check if replay exists (don't load full data yet - ReplayDebugState will do that)
      const replayData = await this.replayDebugger.loadReplay(state.gameId)

      if (!replayData) {
        console.error('❌ No replay data found for this game')
        console.log('💡 Replay data is only available for games started fresh (not loaded)')
        console.log('   Start a new game to create a replay')
        return state
      }

      // Push ReplayDebugState onto state stack
      const replayState = new ReplayDebugState(
        state.gameId,
        this.replayDebugger,
        this.stateManager
      )

      this.stateManager.pushState(replayState)

      console.log('✅ Replay debugger launched')
      console.log('💡 Press Escape to exit debugger and return to game')
    } catch (error) {
      console.error('❌ Error launching replay debugger:', error)
    }

    return state // Launch doesn't modify game state
  }
}
