import { GameState } from '@game/core/core'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { IndexedDBService } from '@services/IndexedDBService'
import { ReplayDebugState } from '../../states/ReplayDebugState'

/**
 * ReplayDebugCommands - Utility for launching replay debugger from debug mode
 *
 * Purpose: Provides keyboard commands to launch and manage replay debugging.
 *
 * Commands:
 * - `r`: Launch replay debugger for current game
 * - `R`: Choose replay from list (prompts)
 * - `e`: Export current game's replay to console
 *
 * Usage (from main game loop or UI layer):
 * ```typescript
 * const replayCommands = new ReplayDebugCommands(
 *   replayDebugger,
 *   stateManager,
 *   indexedDB
 * )
 *
 * // In debug key handler:
 * if (key === 'r') {
 *   replayCommands.launchReplayForCurrentGame(currentState.gameId)
 * }
 * ```
 *
 * **Integration Note**: These commands are separate from DebugService because they require
 * GameStateManager and IndexedDBService dependencies. They can be added to the debug key
 * handler in the UI layer or main game loop.
 */
export class ReplayDebugCommands {
  constructor(
    private replayDebugger: ReplayDebuggerService,
    private stateManager: GameStateManager,
    private indexedDB: IndexedDBService
  ) {}

  /**
   * Launch replay debugger for current game
   *
   * @param gameId - Current game ID
   */
  async launchReplayForCurrentGame(gameId: string): Promise<void> {
    console.log('Launching replay debugger for game:', gameId)

    try {
      // Check if replay exists
      const replayData = await this.replayDebugger.loadReplay(gameId)

      if (!replayData) {
        console.error('❌ No replay data found for this game')
        console.log('Replay data is only available for games started fresh (not loaded)')
        return
      }

      // Push ReplayDebugState onto state stack
      const replayState = new ReplayDebugState(
        gameId,
        this.replayDebugger,
        this.stateManager
      )

      this.stateManager.pushState(replayState)
    } catch (error) {
      console.error('❌ Error launching replay debugger:', error)
    }
  }

  /**
   * List all replays and launch chosen one
   */
  async chooseAndLaunchReplay(): Promise<void> {
    try {
      // Get all replay IDs from IndexedDB
      const replayKeys = await this.indexedDB.getAll('replays')

      if (replayKeys.length === 0) {
        console.log('⚠️  No replays found')
        console.log('Replays are created when you save games that were started fresh')
        return
      }

      console.log('='.repeat(60))
      console.log('Available Replays:')
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
            `${replay.metadata.outcome || 'ongoing'}`
          )
        } else {
          console.log(`[${replay.index}] ${replay.gameId} (no metadata)`)
        }
      })

      console.log('='.repeat(60))

      // Prompt for choice
      const choice = prompt('Choose replay number (or Cancel):')
      if (!choice) return

      const index = parseInt(choice, 10)

      if (isNaN(index) || index < 0 || index >= replays.length) {
        console.error('❌ Invalid replay number')
        return
      }

      // Launch chosen replay
      await this.launchReplayForCurrentGame(replays[index].gameId)
    } catch (error) {
      console.error('❌ Error listing replays:', error)
    }
  }

  /**
   * Export current game's replay to console
   *
   * @param gameId - Current game ID
   */
  async exportReplay(gameId: string): Promise<void> {
    try {
      const replayData = await this.replayDebugger.loadReplay(gameId)

      if (!replayData) {
        console.error('❌ No replay data found for this game')
        return
      }

      console.log('='.repeat(60))
      console.log('Replay Export')
      console.log('='.repeat(60))
      console.log(`Game: ${replayData.metadata.characterName}`)
      console.log(`Turns: ${replayData.metadata.turnCount}`)
      console.log(`Commands: ${replayData.commands.length}`)
      console.log('')
      console.log('To save, copy the JSON below:')
      console.log('='.repeat(60))

      // Convert to JSON (handle Map/Set serialization)
      const json = JSON.stringify(replayData, (key, value) => {
        if (value instanceof Map) {
          return Object.fromEntries(value)
        }
        if (value instanceof Set) {
          return Array.from(value)
        }
        return value
      }, 2)

      console.log(json)
      console.log('='.repeat(60))
      console.log('✅ Replay exported to console')

      // Also trigger browser download
      this.downloadReplayFile(gameId, json)
    } catch (error) {
      console.error('❌ Error exporting replay:', error)
    }
  }

  /**
   * Download replay as JSON file
   *
   * @param gameId - Game ID
   * @param json - JSON string
   */
  private downloadReplayFile(gameId: string, json: string): void {
    try {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `replay-${gameId}.json`
      a.click()
      URL.revokeObjectURL(url)

      console.log('💾 Replay file downloaded')
    } catch (error) {
      console.warn('Could not trigger download:', error)
    }
  }

  /**
   * Handle replay debug key press
   *
   * @param key - Key pressed
   * @param state - Current game state
   * @returns true if key was handled
   */
  async handleKey(key: string, state: GameState): Promise<boolean> {
    switch (key) {
      case 'r':
        await this.launchReplayForCurrentGame(state.gameId)
        return true

      case 'R':
        await this.chooseAndLaunchReplay()
        return true

      case 'e':
        await this.exportReplay(state.gameId)
        return true

      default:
        return false
    }
  }
}
