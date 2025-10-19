import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { DownloadService } from '@services/DownloadService'

/**
 * ExportReplayCommand - Export current game's replay to console and file
 *
 * Purpose: Exports replay data for debugging, sharing, or archiving.
 *
 * Orchestration:
 * 1. Load replay data from ReplayDebuggerService
 * 2. Log replay data to console (for copy/paste)
 * 3. Trigger browser download using DownloadService
 *
 * Usage (from debug mode):
 * ```typescript
 * // Press 'e' in debug mode
 * const command = new ExportReplayCommand(replayDebugger, downloadService)
 * const newState = command.execute(gameState)
 * ```
 *
 * **Architecture Notes**:
 * - This is a Command (orchestration) not a Service (business logic)
 * - Coordinates two services: ReplayDebuggerService + DownloadService
 * - No business logic - just orchestrates service calls
 */
export class ExportReplayCommand implements ICommand {
  constructor(
    private replayDebugger: ReplayDebuggerService,
    private downloadService: DownloadService
  ) {}

  /**
   * Execute export replay command
   *
   * @param state - Current game state (provides gameId)
   * @returns Unchanged game state (export is side-effect only)
   */
  async execute(state: GameState): Promise<GameState> {
    console.log('='.repeat(60))
    console.log('📤 REPLAY EXPORT')
    console.log('='.repeat(60))

    try {
      // Load replay data
      const replayData = await this.replayDebugger.loadReplay(state.gameId)

      if (!replayData) {
        console.error('❌ No replay data found for this game')
        console.log('💡 Replay data is embedded in save files when you save a game')
        return state
      }

      // Display replay info
      console.log(`Game: ${replayData.metadata.characterName}`)
      console.log(`Turns: ${replayData.metadata.turnCount}`)
      console.log(`Commands: ${replayData.commands.length}`)
      console.log(`Outcome: ${replayData.metadata.outcome}`)
      console.log('')

      // Log to console for copy/paste
      console.log('To save, copy the JSON below:')
      console.log('='.repeat(60))
      console.log(JSON.stringify(replayData, (_key, value) => {
        if (value instanceof Map) return Object.fromEntries(value)
        if (value instanceof Set) return Array.from(value)
        return value
      }, 2))
      console.log('='.repeat(60))

      // Trigger browser download
      this.downloadService.downloadJSON(`replay-${state.gameId}.json`, replayData)

      console.log('✅ Replay exported to console and downloaded')
      console.log('💾 Check your Downloads folder for: replay-' + state.gameId + '.json')
      console.log('='.repeat(60))
    } catch (error) {
      console.error('❌ Error exporting replay:', error)
    }

    return state // Export doesn't modify game state
  }
}
