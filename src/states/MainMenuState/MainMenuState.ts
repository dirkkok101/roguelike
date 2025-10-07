import { BaseState } from '@states/BaseState'
import { Input } from '@game/core/core'
import { MainMenu } from '@ui/MainMenu'

/**
 * MainMenuState - Title screen and main menu
 *
 * Purpose: Initial state shown when game loads or when returning from gameplay.
 * Provides options for:
 * - New Game (with character name input)
 * - Continue (load saved game)
 * - Custom Seed (replay specific seed)
 * - Leaderboard
 * - Quit
 *
 * State Properties:
 * - isPaused(): true (menu doesn't update anything below)
 * - isTransparent(): false (full-screen opaque menu)
 *
 * Architecture:
 * - Wraps existing MainMenu UI component
 * - Delegates to MainMenu for rendering and interaction
 * - Future: Could integrate MainMenu directly into state
 *
 * @example
 * const mainMenuState = new MainMenuState(
 *   mainMenu,
 *   hasSave,
 *   onNewGame,
 *   onContinue,
 *   onCustomSeed
 * )
 * stateManager.pushState(mainMenuState)
 */
export class MainMenuState extends BaseState {
  constructor(
    private mainMenu: MainMenu,
    private hasSave: boolean,
    private onNewGame: (characterName: string) => void,
    private onContinue: () => void,
    private onCustomSeed: (seed: string, characterName: string) => void
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the main menu UI
   */
  enter(): void {
    this.mainMenu.show(this.hasSave, this.onNewGame, this.onContinue, this.onCustomSeed)
  }

  /**
   * Called when state is paused or removed
   * Hide the main menu UI
   */
  exit(): void {
    this.mainMenu.hide()
  }

  /**
   * Game tick logic (menu doesn't need updates)
   * @param deltaTime - Unused for static menu
   */
  update(deltaTime: number): void {
    // Menu is static - no updates needed
  }

  /**
   * Render the menu
   * MainMenu handles its own rendering via DOM
   */
  render(): void {
    // MainMenu manages its own DOM rendering
    // Could call a refresh method here if needed
  }

  /**
   * Handle input for menu navigation
   * MainMenu already has its own keydown handler for now
   * Future: Will move command registration here
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // MainMenu currently handles its own input via keydown listeners
    // This is a transition state - Phase 4 will refactor to handle input here

    // For now, MainMenu's internal handlers will continue to work
    // because they're registered directly on document
  }

  /**
   * Main menu is a paused state (nothing below it updates)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Main menu is opaque (full-screen, nothing visible below)
   */
  isTransparent(): boolean {
    return false
  }
}
