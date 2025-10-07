import { BaseState } from '@states/BaseState'
import { Input, GameState } from '@game/core/core'
import { VictoryScreen } from '@ui/VictoryScreen'
import { VictoryStats } from '@services/VictoryService'

/**
 * VictoryScreenState - Victory screen
 *
 * Purpose: Displayed when player wins (retrieves Amulet and returns to surface), showing:
 * - Victory message
 * - Final statistics (level, turns, gold, kills, etc.)
 * - Score and leaderboard rank
 * - Option to start new game or return to main menu
 *
 * State Properties:
 * - isPaused(): true (game is over, nothing updates)
 * - isTransparent(): false (full-screen opaque overlay)
 *
 * Architecture:
 * - Wraps existing VictoryScreen UI component
 * - Creates leaderboard entry automatically on show
 * - Provides callbacks for new game navigation
 *
 * @example
 * const victoryScreenState = new VictoryScreenState(
 *   victoryScreen,
 *   stats,
 *   gameState,
 *   onNewGame
 * )
 * stateManager.pushState(victoryScreenState)
 */
export class VictoryScreenState extends BaseState {
  constructor(
    private victoryScreen: VictoryScreen,
    private stats: VictoryStats,
    private gameState: GameState,
    private onNewGame: (characterName: string) => void
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the victory screen with stats
   */
  enter(): void {
    this.victoryScreen.show(this.stats, this.gameState, this.onNewGame)
  }

  /**
   * Called when state is paused or removed
   * Hide the victory screen
   */
  exit(): void {
    this.victoryScreen.hide()
  }

  /**
   * Game tick logic (victory screen is static)
   * @param deltaTime - Unused for static screen
   */
  update(deltaTime: number): void {
    // Victory screen is static - no updates needed
  }

  /**
   * Render the victory screen
   * VictoryScreen handles its own rendering via DOM
   */
  render(): void {
    // VictoryScreen manages its own DOM rendering
  }

  /**
   * Handle input for victory screen navigation
   * VictoryScreen has its own keydown handler for now
   * Future: Will move command registration here (Phase 4)
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // VictoryScreen currently handles its own input via keydown listeners
    // Commands: n=new game, l=leaderboard, q=quit
    // This is a transition state - Phase 4 will refactor to handle input here
  }

  /**
   * Victory screen is a paused state (game is over)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Victory screen is opaque (full-screen, nothing visible below)
   */
  isTransparent(): boolean {
    return false
  }
}
