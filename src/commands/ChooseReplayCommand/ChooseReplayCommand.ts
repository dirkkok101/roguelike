import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { IndexedDBService } from '@services/IndexedDBService'
import { ReplayDebugState } from '../../states/ReplayDebugState'
import { CommandRecorderService } from '@services/CommandRecorderService'

/**
 * ChooseReplayCommand - List all replays and launch chosen one
 *
 * Purpose: Browse all available replays and launch debugger for selected replay.
 *
 * Orchestration:
 * 1. Load all saves with embedded replay data from IndexedDB
 * 2. Filter saves that have replayData
 * 3. Display list with metadata (character name, turns, commands)
 * 4. Prompt user to choose replay number
 * 5. Launch ReplayDebugState for chosen replay
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
 * - Replays are now embedded in save files (unified storage)
 */
export class ChooseReplayCommand implements ICommand {
  constructor(
    private replayDebugger: ReplayDebuggerService,
    private stateManager: GameStateManager,
    private indexedDB: IndexedDBService,
    private commandRecorder: CommandRecorderService
  ) {}

  /**
   * Execute choose replay command
   *
   * @param state - Current game state (unused, but required by ICommand)
   * @returns Unchanged game state (state stack push is side-effect)
   */
  async execute(state: GameState): Promise<GameState> {
    try {
      // Get all saves from IndexedDB (replays are now embedded in saves)
      const allSaves = await this.indexedDB.getAll('saves')

      // Filter saves that have replay data (ignore continue_pointer)
      const savesWithReplays = allSaves.filter(
        (save) => save.replayData && save.gameId !== 'continue_pointer'
      )

      if (savesWithReplays.length === 0) {
        console.log('⚠️  No replays found')
        console.log('💡 Replays are created when you save games')
        console.log('   Save your current game to create a replay')
        return state
      }

      console.log('='.repeat(60))
      console.log('📼 AVAILABLE REPLAYS')
      console.log('='.repeat(60))

      // Map saves to replay entries
      const replays = savesWithReplays.map((save, index) => ({
        index,
        gameId: save.gameId,
        metadata: save.metadata, // Use save metadata (not replay metadata)
        replayData: save.replayData,
      }))

      // Display list
      replays.forEach((replay) => {
        if (replay.metadata) {
          console.log(
            `[${replay.index}] ${replay.metadata.characterName} - ` +
            `Turn ${replay.metadata.turnCount} - ` +
            `Level ${replay.metadata.currentLevel} - ` +
            `${replay.replayData.commands.length} commands recorded`
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

      // Historical replays load from IndexedDB (no in-memory data)
      const replayState = new ReplayDebugState(
        selectedGameId,
        this.replayDebugger,
        this.stateManager,
        this.commandRecorder,
        0, // Historical replays start at turn 0
        undefined // No in-memory data, will load from IndexedDB
      )

      this.stateManager.pushState(replayState)

      console.log('💡 Press Escape or click ✕ Close to exit debugger')
    } catch (error) {
      console.error('❌ Error listing replays:', error)
    }

    return state // Choice doesn't modify game state
  }
}
