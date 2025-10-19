import { BaseState } from '@states/BaseState'
import { GameState, Input, Direction } from '@game/core/core'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'
import { MonsterTurnService } from '@services/MonsterTurnService'
import { TurnService } from '@services/TurnService'
import { AutoSaveMiddleware } from '@services/AutoSaveMiddleware'
import { ToggleRenderModeCommand } from '@commands/ToggleRenderModeCommand'
import { PreferencesService } from '@services/PreferencesService'
import { MessageService } from '@services/MessageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { RunCommand } from '@commands/RunCommand'

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
  private toggleRenderModeCommand: ToggleRenderModeCommand

  constructor(
    initialState: GameState,
    private renderer: GameRenderer,
    private inputHandler: InputHandler,
    private monsterTurnService: MonsterTurnService,
    private turnService: TurnService,
    private autoSaveMiddleware: AutoSaveMiddleware,
    preferencesService: PreferencesService,
    messageService: MessageService,
    private commandRecorder: CommandRecorderService,
    private randomService: IRandomService
  ) {
    super()
    this.gameState = initialState
    this.toggleRenderModeCommand = new ToggleRenderModeCommand(
      preferencesService,
      messageService,
      commandRecorder,
      randomService
    )
  }

  /**
   * Called when state becomes active
   * Render initial game state
   * Also check for pending commands (from targeting, modals, etc.)
   */
  enter(): void {
    // Initialize replay recording for this game session
    // This enables replay debugging and determinism validation
    if (this.gameState.gameId) {
      this.commandRecorder.startRecording(this.gameState, this.gameState.gameId)
    }

    this.renderer.render(this.gameState)

    // Check for pending commands when state becomes active
    // This handles cases where a higher state (like TargetSelectionState) pops
    // and leaves a pending command to execute
    this.checkAndExecutePendingCommand()
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
  update(_deltaTime: number): void {
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
  async handleInput(_input: Input): Promise<void> {
    // Don't process input if death or victory screen is visible
    if (this.renderer.isDeathScreenVisible() || this.renderer.isVictoryScreenVisible()) {
      return
    }

    // Handle render mode toggle (free action - doesn't consume turn)
    // Shift+T to toggle between sprite and ASCII rendering
    if (_input.key === 'T' && _input.shift) {
      this.gameState = this.toggleRenderModeCommand.execute(this.gameState)
      this.renderer.render(this.gameState)
      return
    }

    // Handle Shift+Arrow to initiate run command
    // Only call RunCommand once when initiating a new run, not on every Shift+Arrow press
    if (_input.shift && !this.gameState.player.isRunning) {
      const direction = this.getDirectionFromKey(_input.key)
      if (direction) {
        // Initiate run with RunCommand
        const runCommand = new RunCommand(direction, this.commandRecorder, this.randomService)
        this.gameState = runCommand.execute(this.gameState)

        // Take first step with MoveCommand (needs all services from InputHandler)
        // Note: InputHandler constructs MoveCommand with all required services
        // For now, delegate to InputHandler by falling through
        // The MoveCommand will be created by InputHandler with arrow key
      }
    }

    // Convert Input to KeyboardEvent for existing InputHandler
    // TODO: Phase 4 will refactor to use Input directly
    const keyboardEvent = this.inputToKeyboardEvent(_input)

    // PHASE 1: Grant energy to all actors until player can act
    do {
      this.gameState = this.turnService.grantEnergyToAllActors(this.gameState)
    } while (!this.turnService.canPlayerAct(this.gameState.player))

    // PHASE 2: Player acts
    const command = this.inputHandler.handleKeyPress(keyboardEvent, this.gameState)
    if (command) {
      const result = command.execute(this.gameState)
      // Handle both sync and async commands
      this.gameState = result instanceof Promise ? await result : result

      // Consume player energy after action
      this.gameState = {
        ...this.gameState,
        player: this.turnService.consumePlayerEnergy(this.gameState.player),
      }

      // PHASE 3: Process monsters and increment turn only if player exhausted energy and game not over
      if (!this.turnService.canPlayerAct(this.gameState.player) && !this.gameState.isGameOver) {
        this.gameState = this.monsterTurnService.processMonsterTurns(this.gameState)
        this.gameState = this.turnService.processWanderingSpawns(this.gameState)
        this.gameState = this.turnService.incrementTurn(this.gameState)
      }

      this.autoSaveMiddleware.afterTurn(this.gameState)

      // PHASE 4: Continue running if player is still in run mode
      // Keep executing MoveCommand until disturbance or run stops
      let runMoveCount = 0
      const maxRunMoves = 100 // Safety limit to prevent infinite loops

      while (this.gameState.player.isRunning && this.gameState.player.runState && runMoveCount < maxRunMoves) {
        runMoveCount++

        // Grant energy for next move
        do {
          this.gameState = this.turnService.grantEnergyToAllActors(this.gameState)
        } while (!this.turnService.canPlayerAct(this.gameState.player))

        // Execute next move in run direction
        const direction = this.gameState.player.runState!.direction
        const runKeyEvent = this.directionToKeyboardEvent(direction)
        const runCommand = this.inputHandler.handleKeyPress(runKeyEvent, this.gameState)

        if (runCommand) {
          const result = runCommand.execute(this.gameState)
          // Handle both sync and async commands
          this.gameState = result instanceof Promise ? await result : result

          // Consume player energy
          this.gameState = {
            ...this.gameState,
            player: this.turnService.consumePlayerEnergy(this.gameState.player),
          }

          // Process monsters and increment turn if player exhausted energy and game not over
          if (!this.turnService.canPlayerAct(this.gameState.player) && !this.gameState.isGameOver) {
            this.gameState = this.monsterTurnService.processMonsterTurns(this.gameState)
            this.gameState = this.turnService.processWanderingSpawns(this.gameState)
            this.gameState = this.turnService.incrementTurn(this.gameState)
          }

          // Render after each run move to show exploration progress
          this.renderer.render(this.gameState)

          this.autoSaveMiddleware.afterTurn(this.gameState)
        } else {
          // No command returned, stop running
          break
        }
      }

      if (runMoveCount >= maxRunMoves) {
        // Safety limit reached - stop running
        this.gameState = {
          ...this.gameState,
          player: {
            ...this.gameState.player,
            isRunning: false,
            runState: null
          }
        }
      }
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
   * Check for and execute pending commands
   * Called when state becomes active (via enter()) to handle commands
   * left by states that popped themselves (like TargetSelectionState)
   */
  private async checkAndExecutePendingCommand(): Promise<void> {
    // Create a dummy keyboard event to check for pending commands
    const dummyEvent = new KeyboardEvent('keydown', { key: '' })
    const command = this.inputHandler.handleKeyPress(dummyEvent, this.gameState)

    if (command) {
      // Execute the pending command and update game state
      const result = command.execute(this.gameState)
      // Handle both sync and async commands
      this.gameState = result instanceof Promise ? await result : result

      // Consume player energy after action
      this.gameState = {
        ...this.gameState,
        player: this.turnService.consumePlayerEnergy(this.gameState.player),
      }

      // Process monsters only if player exhausted energy
      if (!this.turnService.canPlayerAct(this.gameState.player)) {
        this.gameState = this.monsterTurnService.processMonsterTurns(this.gameState)
        this.gameState = this.turnService.processWanderingSpawns(this.gameState)
        this.gameState = this.turnService.incrementTurn(this.gameState)
      }

      this.autoSaveMiddleware.afterTurn(this.gameState)

      // Re-render after command execution
      this.renderer.render(this.gameState)
    }
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

  /**
   * Convert arrow key to Direction
   * Supports all 8 directions (4 cardinal + 4 diagonal)
   *
   * @param key - Arrow key name
   * @returns Direction or null if not an arrow key
   */
  private getDirectionFromKey(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp':
        return 'up'
      case 'ArrowDown':
        return 'down'
      case 'ArrowLeft':
        return 'left'
      case 'ArrowRight':
        return 'right'
      default:
        return null
    }
  }

  /**
   * Convert Direction to KeyboardEvent for InputHandler
   * Used when continuing a run to simulate arrow key press
   *
   * @param direction - Direction to convert
   * @returns KeyboardEvent with corresponding arrow key
   */
  private directionToKeyboardEvent(direction: Direction): KeyboardEvent {
    let key: string
    switch (direction) {
      case 'up':
        key = 'ArrowUp'
        break
      case 'down':
        key = 'ArrowDown'
        break
      case 'left':
        key = 'ArrowLeft'
        break
      case 'right':
        key = 'ArrowRight'
        break
      case 'up-left':
        key = 'ArrowUp' // Diagonal - use primary direction
        break
      case 'up-right':
        key = 'ArrowUp'
        break
      case 'down-left':
        key = 'ArrowDown'
        break
      case 'down-right':
        key = 'ArrowDown'
        break
      default:
        key = 'ArrowUp' // Fallback
        break
    }
    return new KeyboardEvent('keydown', { key })
  }
}
