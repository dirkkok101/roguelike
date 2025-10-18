import { GameState } from '@game/core/core'
import { CommandEvent } from '@game/replay/replay'

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

  /**
   * Record a command event
   * Should be called BEFORE command execution to capture RNG state
   */
  recordCommand(event: CommandEvent): void {
    this.commands.push(event)
  }

  /**
   * Set the initial game state (turn 0)
   * Should be called when new game starts or game loads
   */
  setInitialState(state: GameState): void {
    // Deep copy to avoid mutations affecting initial state
    this.initialState = JSON.parse(JSON.stringify(state))
    this.currentGameId = state.gameId
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
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.initialState !== null && this.currentGameId !== null
  }
}
