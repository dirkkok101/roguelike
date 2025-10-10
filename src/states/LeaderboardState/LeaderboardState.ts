import { BaseState } from '@states/BaseState'
import { Input } from '@game/core/core'
import { LeaderboardScreen } from '@ui/LeaderboardScreen'

/**
 * LeaderboardState - High scores screen
 *
 * Purpose: Displays leaderboard with:
 * - All-time high scores
 * - Filtering by victories/deaths
 * - Sorting by score, level, turns, date
 * - Pagination
 * - Entry details on click
 * - Can be accessed from main menu, death screen, or victory screen
 *
 * State Properties:
 * - isPaused(): true (leaderboard doesn't update underlying state)
 * - isTransparent(): true (shows dimmed background underneath)
 *
 * Architecture:
 * - Wraps existing LeaderboardScreen UI component
 * - Can be pushed on top of any other state
 * - ESC closes and returns to previous state via popState()
 *
 * @example
 * // From main menu
 * const leaderboardState = new LeaderboardState(leaderboardScreen, () => {
 *   stateManager.popState() // Return to main menu
 * })
 * stateManager.pushState(leaderboardState)
 *
 * @example
 * // From death screen
 * const leaderboardState = new LeaderboardState(leaderboardScreen, () => {
 *   stateManager.popState() // Return to death screen
 * })
 * stateManager.pushState(leaderboardState)
 */
export class LeaderboardState extends BaseState {
  constructor(
    private leaderboardScreen: LeaderboardScreen,
    private onClose: () => void
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the leaderboard screen
   */
  enter(): void {
    this.leaderboardScreen.show(this.onClose)
  }

  /**
   * Called when state is paused or removed
   * Hide the leaderboard screen
   */
  exit(): void {
    this.leaderboardScreen.hide()
  }

  /**
   * Game tick logic (leaderboard is static)
   * @param deltaTime - Unused for static screen
   */
  update(_deltaTime: number): void {
    // Leaderboard is static - no updates needed
  }

  /**
   * Render the leaderboard
   * LeaderboardScreen handles its own rendering via DOM
   */
  render(): void {
    // LeaderboardScreen manages its own DOM rendering
  }

  /**
   * Handle input for leaderboard navigation
   * LeaderboardScreen has its own keydown handler for now
   * Future: Will move command registration here (Phase 4)
   *
   * Commands:
   * - Arrow keys: Navigate entries
   * - Enter: View entry details
   * - Tab keys: Switch between tabs (all/victories/deaths)
   * - ESC: Close leaderboard (calls onClose which typically does popState())
   *
   * @param input - Key press and modifiers
   */
  handleInput(_input: Input): void {
    // LeaderboardScreen currently handles its own input via keydown listeners
    // This is a transition state - Phase 4 will refactor to handle input here
  }

  /**
   * Leaderboard is a paused state (doesn't update lower states)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Leaderboard is transparent (shows dimmed background)
   * This allows seeing the context (main menu, death screen, etc.) underneath
   */
  isTransparent(): boolean {
    return true
  }
}
