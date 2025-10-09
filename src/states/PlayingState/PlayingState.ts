import { BaseState } from '@states/BaseState'
import { GameState, Input } from '@game/core/core'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'
import { MonsterTurnService } from '@services/MonsterTurnService'
import { TurnService } from '@services/TurnService'
import { AutoSaveMiddleware } from '@services/AutoSaveMiddleware'

/**
 * PlayingState - Main gameplay state
 *
 * Purpose: Represents the core dungeon exploration gameplay where the player:
 * - Moves through the dungeon
 * - Fights monsters
 * - Manages inventory
 * - Uses items
 * - Interacts with the environment
 *
 * State Properties:
 * - isPaused(): false (this is the base gameplay state, nothing below it)
 * - isTransparent(): false (opaque full-screen game view)
 *
 * Architecture:
 * - Wraps existing GameRenderer and InputHandler for now
 * - Owns the game loop logic (energy system, monster turns)
 * - Future: Will own command registration directly
 *
 * Game Loop (Energy-based, 3 phases):
 * 1. Grant energy to all actors until player can act
 * 2. Player acts and consumes energy
 * 3. Process monster turns if player exhausted energy
 */
export class PlayingState extends BaseState {
  private gameState: GameState

  constructor(
    initialState: GameState,
    private renderer: GameRenderer,
    private inputHandler: InputHandler,
    private monsterTurnService: MonsterTurnService,
    private turnService: TurnService,
    private autoSaveMiddleware: AutoSaveMiddleware
  ) {
    super()
    this.gameState = initialState
  }

  /**
   * Called when state becomes active
   * Render initial game state
   */
  enter(): void {
    this.renderer.render(this.gameState)
  }

  /**
   * Called when state is paused or removed
   * No cleanup needed for now
   */
  exit(): void {
    // Future: Clean up event listeners, save temporary state, etc.
  }

  /**
   * Game tick logic (currently unused - game is turn-based, not frame-based)
   * @param deltaTime - Time since last update (unused)
   */
  update(deltaTime: number): void {
    // Turn-based game doesn't need frame updates
    // All logic is driven by player input in handleInput()
  }

  /**
   * Render the current game state
   */
  render(): void {
    this.renderer.render(this.gameState)
  }

  /**
   * Handle player input and execute game loop
   *
   * Game Loop:
   * 1. Grant energy to all actors until player can act (min 1 tick)
   * 2. Player acts via InputHandler (returns command)
   * 3. Execute command and consume player energy
   * 4. Process monster turns if player exhausted energy
   * 5. Increment turn counter
   * 6. Auto-save
   *
   * Note: Rendering is now handled by the main loop's renderAllVisibleStates()
   * after handleInput() completes. This ensures correct state stack rendering.
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // Don't process input if death or victory screen is visible
    if (this.renderer.isDeathScreenVisible() || this.renderer.isVictoryScreenVisible()) {
      return
    }

    // Convert Input to KeyboardEvent for existing InputHandler
    // TODO: Phase 4 will refactor to use Input directly
    const keyboardEvent = this.inputToKeyboardEvent(input)

    // PHASE 1: Grant energy to all actors until player can act
    do {
      this.gameState = this.turnService.grantEnergyToAllActors(this.gameState)
    } while (!this.turnService.canPlayerAct(this.gameState.player))

    // PHASE 2: Player acts
    const command = this.inputHandler.handleKeyPress(keyboardEvent, this.gameState)
    if (command) {
      this.gameState = command.execute(this.gameState)

      // Consume player energy after action
      this.gameState = {
        ...this.gameState,
        player: this.turnService.consumePlayerEnergy(this.gameState.player),
      }

      // PHASE 3: Process monsters only if player exhausted energy
      if (!this.turnService.canPlayerAct(this.gameState.player)) {
        this.gameState = this.monsterTurnService.processMonsterTurns(this.gameState)
        this.gameState = this.turnService.incrementTurn(this.gameState)
      }

      this.autoSaveMiddleware.afterTurn(this.gameState)
    }

    // Rendering is now handled by main loop after handleInput() returns
    // This allows the state stack to render correctly (base game + overlays)
  }

  /**
   * Playing state is not paused (it's the base gameplay state)
   * Lower states (if any) would be paused, but PlayingState has nothing below it
   */
  isPaused(): boolean {
    return false
  }

  /**
   * Playing state is opaque (covers entire screen)
   */
  isTransparent(): boolean {
    return false
  }

  /**
   * Get current game state (for saving, debugging, etc.)
   */
  getGameState(): GameState {
    return this.gameState
  }

  /**
   * Convert Input to KeyboardEvent for existing InputHandler
   * TODO: Phase 4 will refactor InputHandler to use Input directly
   *
   * @param input - Input object from state manager
   * @returns Mock KeyboardEvent for compatibility
   */
  private inputToKeyboardEvent(input: Input): KeyboardEvent {
    return new KeyboardEvent('keydown', {
      key: input.key,
      shiftKey: input.shift,
      ctrlKey: input.ctrl,
      altKey: input.alt,
    })
  }
}
