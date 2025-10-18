import { ICommand } from '../ICommand'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * QuitCommand - Auto-saves game and quits
 * Triggered by Q key
 */
export class QuitCommand implements ICommand {
  constructor(
    private localStorageService: LocalStorageService,
    private onReturnToMenu: () => void,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  async execute(state: GameState): Promise<GameState> {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.QUIT,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Persist replay data to IndexedDB before quitting
    try {
      if (state.gameId) {
        await this.recorder.persistToIndexedDB(state.gameId)
        console.log('💾 Replay data persisted before quit')
      }
    } catch (error) {
      // Replay persistence is non-critical, log and continue
      console.warn('⚠️ Could not persist replay data:', error)
    }

    // STEP 3: Execute normally (existing logic unchanged)
    // Don't save if game is over (permadeath already deleted save)
    if (state.isGameOver) {
      this.onReturnToMenu()
      return state
    }

    // Save before quitting - wait for completion before returning to menu
    console.log('Saving before quit...')
    try {
      await this.localStorageService.saveGame(state)
      console.log('✅ Saved successfully, returning to menu')
      this.onReturnToMenu()
    } catch (error) {
      console.error('❌ Save failed:', error)
      // Still return to menu even if save fails
      this.onReturnToMenu()
    }

    return state
  }
}
