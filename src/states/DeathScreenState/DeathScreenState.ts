import { BaseState } from '@states/BaseState'
import { Input, GameState } from '@game/core/core'
import { DeathScreen } from '@ui/DeathScreen'
import { ComprehensiveDeathStats } from '@services/DeathService'

/**
 * DeathScreenState - Game over screen
 *
 * Purpose: Displayed when player dies, showing:
 * - Death message and cause
 * - Final statistics (level, turns, gold, kills, etc.)
 * - Score and leaderboard rank
 * - Options to view leaderboard, start new game, or return to main menu
 *
 * State Properties:
 * - isPaused(): true (game is over, nothing updates)
 * - isTransparent(): false (full-screen opaque overlay)
 *
 * Architecture:
 * - Wraps existing DeathScreen UI component
 * - Creates leaderboard entry automatically on show
 * - Provides callbacks for new game / main menu navigation
 *
 * @example
 * const deathScreenState = new DeathScreenState(
 *   deathScreen,
 *   stats,
 *   gameState,
 *   onNewGame,
 *   onReplaySeed,
 *   onQuitToMenu
 * )
 * stateManager.pushState(deathScreenState)
 */
export class DeathScreenState extends BaseState {
  constructor(
    private deathScreen: DeathScreen,
    private stats: ComprehensiveDeathStats,
    private gameState: GameState,
    private onNewGame: (characterName: string) => void,
    private onReplaySeed: (seed: string, characterName: string) => void,
    private onQuitToMenu: () => void
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the death screen with stats
   */
  enter(): void {
    this.deathScreen.show(
      this.stats,
      this.gameState,
      this.onNewGame,
      this.onReplaySeed,
      this.onQuitToMenu
    )
  }

  /**
   * Called when state is paused or removed
   * Hide the death screen
   */
  exit(): void {
    this.deathScreen.hide()
  }

  /**
   * Game tick logic (death screen is static)
   * @param deltaTime - Unused for static screen
   */
  update(deltaTime: number): void {
    // Death screen is static - no updates needed
  }

  /**
   * Render the death screen
   * DeathScreen handles its own rendering via DOM
   */
  render(): void {
    // DeathScreen manages its own DOM rendering
  }

  /**
   * Handle input for death screen navigation
   * DeathScreen has its own keydown handler for now
   * Future: Will move command registration here (Phase 4)
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // DeathScreen currently handles its own input via keydown listeners
    // Commands: l=leaderboard, n=new game, m=main menu, q=quit
    // This is a transition state - Phase 4 will refactor to handle input here
  }

  /**
   * Death screen is a paused state (game is over)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Death screen is opaque (full-screen, nothing visible below)
   */
  isTransparent(): boolean {
    return false
  }
}
