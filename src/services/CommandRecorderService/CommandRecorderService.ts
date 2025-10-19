import { GameState } from '@game/core/core'
import { CommandEvent, ReplayData } from '@game/replay/replay'
import { IndexedDBService } from '@services/IndexedDBService'

// ============================================================================
// COMMAND RECORDER SERVICE - In-memory command tracking for replay
// ============================================================================

/**
 * CommandRecorderService
 *
 * Responsibilities:
 * - Track current game's command log in memory
 * - Record each command as it executes
 * - Store initial state (turn 0) for replay
 * - Provide access to command log for saving
 *
 * Memory Management:
 * - Commands stored in memory during active game
 * - Flushed to IndexedDB on save (via GameStorageService)
 * - Cleared on new game start
 * - Typical memory usage: ~1-5MB for 1000 turn game
 */
export class CommandRecorderService {
  private commands: CommandEvent[] = []
  private initialState: GameState | null = null
  private currentGameId: string | null = null
  private startTime: number = 0

  constructor(private indexedDBService: IndexedDBService) {}

  /**
   * Record a command event
   * Should be called BEFORE command execution to capture RNG state
   */
  recordCommand(event: CommandEvent): void {
    this.commands.push(event)
  }

  /**
   * Start recording commands for a new game session
   * Clears previous commands and captures initial state
   *
   * @param initialState - Game state at turn 0
   * @param gameId - Unique game identifier
   */
  startRecording(initialState: GameState, gameId: string): void {
    this.commands = []
    this.initialState = JSON.parse(JSON.stringify(initialState))
    this.currentGameId = gameId
    this.startTime = Date.now()
    console.log(`📼 Started recording for game: ${gameId}`)
  }

  /**
   * Set the initial game state (turn 0)
   * Should be called when new game starts or game loads
   *
   * @deprecated Use startRecording instead
   */
  setInitialState(state: GameState): void {
    // Deep copy to avoid mutations affecting initial state
    this.initialState = JSON.parse(JSON.stringify(state))
    this.currentGameId = state.gameId
    this.startTime = Date.now()
  }

  /**
   * Get all recorded commands
   * Returns a copy to prevent external mutations
   */
  getCommandLog(): CommandEvent[] {
    return [...this.commands]
  }

  /**
   * Get the initial game state
   * Returns a copy to prevent external mutations
   */
  getInitialState(): GameState | null {
    if (!this.initialState) {
      return null
    }

    // Return deep copy
    return JSON.parse(JSON.stringify(this.initialState))
  }

  /**
   * Get the current game ID being recorded
   */
  getGameId(): string | null {
    return this.currentGameId
  }

  /**
   * Get the number of commands recorded
   */
  getCommandCount(): number {
    return this.commands.length
  }

  /**
   * Clear all recorded data
   * Should be called when:
   * - Starting a new game
   * - Loading an existing game (start fresh recording from load point)
   */
  clearLog(): void {
    this.commands = []
    this.initialState = null
    this.currentGameId = null
  }

  /**
   * Restore command log from loaded save file
   * Used when loading a game to restore full replay history
   *
   * This allows replaying loaded games from turn 0, instead of only
   * from the load point forward.
   *
   * @param commands - Array of command events to restore
   */
  restoreCommandLog(commands: CommandEvent[]): void {
    // Deep copy to prevent external mutations
    this.commands = [...commands]
    console.log(`📼 Restored ${commands.length} commands from save`)
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.initialState !== null && this.currentGameId !== null
  }

  /**
   * Persist recorded commands to IndexedDB for replay debugging
   *
   * @deprecated This method is now a no-op. Replay data is automatically
   * embedded in save files by GameStorageService.saveGame().
   *
   * Previously called by:
   * - AutoSaveMiddleware (every 10 turns) - now redundant
   * - SaveCommand (manual save) - now redundant
   * - QuitCommand (on quit) - now redundant
   *
   * Kept for backward compatibility. Can be safely removed in future.
   */
  async persistToIndexedDB(gameId: string): Promise<void> {
    // NO-OP: Replay data is now embedded in save files automatically
    // GameStorageService.saveGame() calls getCommandLog() and getInitialState()
    // and embeds them in the save file's replayData field.
    //
    // This method kept for backward compatibility with existing code that calls it,
    // but it does nothing. The calls can be removed in a future cleanup.
    return Promise.resolve()
  }
}
