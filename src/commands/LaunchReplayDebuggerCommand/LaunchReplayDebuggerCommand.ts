import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { ReplayDebugState } from '../../states/ReplayDebugState'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayData } from '@game/replay/replay'

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
    private stateManager: GameStateManager,
    private commandRecorder: CommandRecorderService
  ) {}

  /**
   * Execute launch replay debugger command
   *
   * @param state - Current game state (provides gameId)
   * @returns Unchanged game state (state stack push is side-effect)
   */
  async execute(state: GameState): Promise<GameState> {
    console.log('🎬 Launching replay debugger for current game session')

    try {
      // Build ReplayData from current session's in-memory command log
      // This allows replay to work WITHOUT requiring a save first
      const initialState = this.commandRecorder.getInitialState()
      const commands = this.commandRecorder.getCommandLog()

      if (!initialState) {
        console.error('❌ No replay data available')
        console.log('💡 Replay is only available for games started in this session')
        console.log('   If you loaded a save, replay data starts from the load point')
        return state
      }

      // Build in-memory ReplayData structure
      const replayData: ReplayData = {
        gameId: state.gameId,
        version: 1, // REPLAY_VERSION
        initialState: initialState,
        seed: state.seed,
        commands: commands,
        metadata: {
          createdAt: Date.now(),
          turnCount: state.turnCount,
          characterName: state.characterName || 'Unknown Hero',
          currentLevel: state.currentLevel,
          outcome: state.isGameOver ? (state.hasWon ? 'won' : 'died') : 'ongoing',
        },
      }

      console.log(`📼 Replay ready: ${commands.length} commands, ${state.turnCount} turns`)

      // Validate replay data completeness
      if (commands.length === 0 && state.turnCount > 0) {
        console.error('❌ No commands recorded - replay not available')
        console.log('💡 This save was created before command recording was implemented')
        console.log('💡 Replay is only available for games started after the command recording feature')
        return state
      }

      // Warn if command log appears incomplete (might be an old save)
      if (commands.length > 0 && state.turnCount > commands.length * 2) {
        console.warn('⚠️  Replay data may be incomplete')
        console.warn(`   Game is at turn ${state.turnCount} but only ${commands.length} commands recorded`)
        console.warn('   This may be an old save from before full command recording was implemented')
        console.warn('   Replay may fail or be incomplete')
      }

      // Push ReplayDebugState onto state stack with in-memory replay data
      const replayState = new ReplayDebugState(
        state.gameId,
        this.replayDebugger,
        this.stateManager,
        this.commandRecorder,
        state.turnCount, // Start at current turn
        replayData // Pass in-memory replay data
      )

      this.stateManager.pushState(replayState)

      console.log('✅ Replay debugger launched')
      console.log('💡 Use ◀/▶ to step through turns, or drag the timeline slider')
      console.log('💡 Press Escape or click ✕ Close to exit')
    } catch (error) {
      console.error('❌ Error launching replay debugger:', error)
    }

    return state // Launch doesn't modify game state
  }
}
