import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { IndexedDBService } from '@services/IndexedDBService'
import { ReplayDebugState } from '../../states/ReplayDebugState'

/**
 * ChooseReplayCommand - List all replays and launch chosen one
 *
 * Purpose: Browse all available replays and launch debugger for selected replay.
 *
 * Orchestration:
 * 1. Load all replay keys from IndexedDB
 * 2. Display list with metadata (character name, turns, outcome)
 * 3. Prompt user to choose replay number
 * 4. Launch ReplayDebugState for chosen replay
 *
 * Usage (from debug mode):
 * ```typescript
 * // Press 'R' (shift+r) in debug mode
 * const command = new ChooseReplayCommand(
 *   replayDebugger,
 *   stateManager,
 *   indexedDB
 * )
 * const newState = command.execute(gameState)
 * ```
 *
 * **Architecture Notes**:
 * - This is a Command (orchestration) not a Service (business logic)
 * - Uses `prompt()` for user input (browser API, but acceptable in command)
 * - Coordinates IndexedDBService + ReplayDebuggerService + GameStateManager
 */
export class ChooseReplayCommand implements ICommand {
  constructor(
    private replayDebugger: ReplayDebuggerService,
    private stateManager: GameStateManager,
    private indexedDB: IndexedDBService
  ) {}

  /**
   * Execute choose replay command
   *
   * @param state - Current game state (unused, but required by ICommand)
   * @returns Unchanged game state (state stack push is side-effect)
   */
  async execute(state: GameState): Promise<GameState> {
    try {
      // Get all replay IDs from IndexedDB
      const replayKeys = await this.indexedDB.getAll('replays')

      if (replayKeys.length === 0) {
        console.log('⚠️  No replays found')
        console.log('💡 Replays are created when you save games that were started fresh')
        console.log('   Start a new game and save it to create a replay')
        return state
      }

      console.log('='.repeat(60))
      console.log('📼 AVAILABLE REPLAYS')
      console.log('='.repeat(60))

      // Load metadata for each replay
      const replays = await Promise.all(
        replayKeys.map(async (key, index) => {
          const data = await this.indexedDB.get('replays', key)
          return {
            index,
            gameId: key,
            metadata: data?.metadata,
          }
        })
      )

      // Display list
      replays.forEach((replay) => {
        if (replay.metadata) {
          console.log(
            `[${replay.index}] ${replay.metadata.characterName} - ` +
            `Turn ${replay.metadata.turnCount} - ` +
            `Level ${replay.metadata.currentLevel} - ` +
            `${replay.metadata.outcome || 'ongoing'}`
          )
        } else {
          console.log(`[${replay.index}] ${replay.gameId} (no metadata)`)
        }
      })

      console.log('='.repeat(60))

      // Prompt for choice
      const choice = prompt(`Choose replay number (0-${replays.length - 1}), or Cancel:`)

      if (choice === null) {
        console.log('❌ Cancelled')
        return state
      }

      const index = parseInt(choice, 10)

      if (isNaN(index)) {
        console.error(`❌ Invalid input: "${choice}" is not a number`)
        return state
      }

      if (index < 0 || index >= replays.length) {
        console.error(
          `❌ Replay number ${index} out of range (0-${replays.length - 1})`
        )
        return state
      }

      // Launch chosen replay
      const selectedGameId = replays[index].gameId
      console.log(`✅ Launching replay for: ${selectedGameId}`)

      const replayState = new ReplayDebugState(
        selectedGameId,
        this.replayDebugger,
        this.stateManager
      )

      this.stateManager.pushState(replayState)

      console.log('💡 Press Escape to exit debugger')
    } catch (error) {
      console.error('❌ Error listing replays:', error)
    }

    return state // Choice doesn't modify game state
  }
}
