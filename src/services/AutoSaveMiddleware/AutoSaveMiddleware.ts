import { GameState } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { CommandRecorderService } from '@services/CommandRecorderService'

/**
 * AutoSaveMiddleware - Automatically saves game every N turns
 * Default: saves every 10 turns
 * In debug mode: validates determinism after each save
 */
export class AutoSaveMiddleware {
  constructor(
    private storageService: GameStorageService,
    private saveInterval: number = 10,
    private commandRecorder?: CommandRecorderService,
    private replayDebugger?: ReplayDebuggerService
  ) {}

  /**
   * Called after each turn to check if auto-save should trigger
   */
  afterTurn(state: GameState): void {
    // Don't auto-save if game is over
    if (state.isGameOver) {
      return
    }

    // Check if turn count is a multiple of save interval
    if (state.turnCount % this.saveInterval === 0 && state.turnCount > 0) {
      // Fire async save without blocking (fire-and-forget)
      this.storageService
        .saveGame(state)
        .then(async () => {
          console.log(`✅ Auto-saved at turn ${state.turnCount}`)

          // Persist replay data to IndexedDB
          if (this.commandRecorder && state.gameId) {
            await this.commandRecorder.persistToIndexedDB(state.gameId)
          }

          // In debug mode, validate determinism
          if (process.env.NODE_ENV === 'development' && this.replayDebugger) {
            await this.validateDeterminism(state)
          }
        })
        .catch((error) => {
          console.error('❌ Auto-save failed:', error)
        })
    }
  }

  /**
   * Validate that replay produces deterministic results
   * Compares replayed state against saved state
   */
  private async validateDeterminism(state: GameState): Promise<void> {
    try {
      const replayData = await this.replayDebugger!.loadReplay(state.gameId)

      if (!replayData) {
        console.warn('[Replay Validation] No replay data to validate')
        return
      }

      const result = await this.replayDebugger!.validateDeterminism(replayData, state)

      if (!result.valid) {
        console.error(
          `[Replay Validation] ❌ NON-DETERMINISM DETECTED at turn ${state.turnCount}`
        )
        console.error(`[Replay Validation] Found ${result.desyncs.length} desync(s):`)
        result.desyncs.forEach((desync) => {
          console.error(
            `  - ${desync.field}: expected ${JSON.stringify(desync.expected)}, got ${JSON.stringify(desync.actual)}`
          )
        })
      } else {
        console.log(`[Replay Validation] ✓ Determinism validated at turn ${state.turnCount}`)
      }
    } catch (error) {
      console.error('[Replay Validation] Validation failed:', error)
    }
  }
}
