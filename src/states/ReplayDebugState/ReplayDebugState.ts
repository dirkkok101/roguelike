import { BaseState } from '../BaseState'
import { GameState, Input } from '@game/core/core'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { ReplayData } from '@game/replay/replay'
import { GameStateManager } from '@services/GameStateManager'
import { IReplayController } from './IReplayController'
import { ReplayControlPanel } from '@ui/ReplayControlPanel'
import { StateInspectorPanel } from '@ui/StateInspectorPanel'
import { GameRenderer } from '@ui/GameRenderer'
import { CommandRecorderService } from '@services/CommandRecorderService'

/**
 * ReplayDebugState - Console-based replay debugging state
 *
 * Purpose: Debug game replays by stepping through command history and inspecting state.
 *
 * Features:
 * - Load replay from IndexedDB
 * - Step through turns one at a time
 * - Jump to specific turn
 * - Validate determinism at any point
 * - Log state to console for inspection
 * - Export current state for analysis
 *
 * Controls:
 * - Space: Step forward one turn
 * - Shift+Space: Step back one turn
 * - 'j': Jump to specific turn (prompts for turn number)
 * - 'v': Validate determinism (compare current vs initial + replayed commands)
 * - 's': Show current state (log to console)
 * - 'e': Export replay data to console
 * - Escape: Exit replay debugger
 *
 * **Note**: This is a console-based debugger. Visual replay UI was deferred as optional.
 * The focus is on programmatic debugging for Claude AI analysis.
 */
export class ReplayDebugState extends BaseState implements IReplayController {
  private replayData: ReplayData | null = null
  private currentTurn: number = 0
  private currentState: GameState | null = null
  private isLoadingData: boolean = true
  private reconstructionInProgress: boolean = false

  // UI components
  private controlPanel: ReplayControlPanel | null = null
  private stateInspector: StateInspectorPanel | null = null

  // Observer pattern
  private observers: Array<() => void> = []

  // Debug console element (to hide when in replay mode)
  private debugConsoleElement: HTMLElement | null = null

  // Initial turn to start at (defaults to 0, but can be set to current game turn)
  private initialTurn: number = 0

  // Keyboard event listener
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(
    private gameId: string,
    private replayDebugger: ReplayDebuggerService,
    private stateManager: GameStateManager,
    private commandRecorder: CommandRecorderService,
    private renderer: GameRenderer,
    initialTurn?: number,
    private inMemoryReplayData?: ReplayData
  ) {
    super()
    this.initialTurn = initialTurn ?? 0
  }

  // IReplayController implementation - State queries

  getCurrentTurn(): number {
    return this.currentTurn
  }

  getTotalTurns(): number {
    return this.replayData?.metadata.turnCount ?? 0
  }

  getCurrentState(): GameState | null {
    return this.currentState
  }

  getReplayMetadata() {
    return this.replayData?.metadata ?? null
  }

  getCommands() {
    return this.replayData?.commands ?? []
  }

  isLoading(): boolean {
    return this.isLoadingData
  }

  isReconstructing(): boolean {
    return this.reconstructionInProgress
  }

  // IReplayController implementation - Observer pattern

  onStateChange(callback: () => void): void {
    this.observers.push(callback)
  }

  removeStateChangeListener(callback: () => void): void {
    const index = this.observers.indexOf(callback)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback())
  }

  // IReplayController implementation - Playback control

  async skipToStart(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn = 0
      // Use reconstructToTurn(0) to ensure proper deserialization
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        0
      )

      console.log('⏮️  Skipped to start (turn 0)')

      this.notifyObservers()
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  async skipToEnd(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      const totalTurns = this.replayData.metadata.turnCount
      this.currentTurn = totalTurns
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        totalTurns
      )

      console.log(`⏭️  Skipped to end (turn ${totalTurns})`)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error skipping to end:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  /**
   * Initialize replay debugger when state becomes active
   *
   * Note: Uses async loading pattern since enter() must be synchronous.
   * The actual data loading happens in loadReplayData() which is called
   * from here but not awaited.
   */
  enter(): void {
    console.log('='.repeat(60))
    console.log('REPLAY DEBUGGER')
    console.log('='.repeat(60))
    console.log(`Loading replay for game: ${this.gameId}`)

    // Hide debug console to avoid blocking the game view
    // Use data attribute so it persists across GameRenderer render() calls
    this.debugConsoleElement = document.querySelector('.debug-console')
    if (this.debugConsoleElement) {
      this.debugConsoleElement.setAttribute('data-suppress', 'true')
      this.debugConsoleElement.style.display = 'none'
    }

    // Create and mount UI components
    this.controlPanel = new ReplayControlPanel(this)
    this.stateInspector = new StateInspectorPanel(this)

    document.body.appendChild(this.controlPanel.element)
    document.body.appendChild(this.stateInspector.element)

    // Register keyboard event listener
    this.keydownHandler = (event: KeyboardEvent) => {
      event.preventDefault()

      // Convert KeyboardEvent to Input
      const input: Input = {
        key: event.key,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      }

      this.handleInput(input)
    }
    document.addEventListener('keydown', this.keydownHandler)

    // Start loading asynchronously (fire-and-forget)
    // The isLoading flag will be cleared once loading completes
    this.loadReplayData()
  }

  /**
   * Load replay data asynchronously
   *
   * Called from enter() as a fire-and-forget async operation.
   * Updates isLoading flag when complete.
   *
   * If in-memory replay data was provided (current session), use it directly.
   * Otherwise, load from IndexedDB (historical replay).
   */
  private async loadReplayData(): Promise<void> {
    try {
      // Use in-memory replay data if provided (current session)
      if (this.inMemoryReplayData) {
        console.log('📼 Using in-memory replay data (current session)')
        this.replayData = this.inMemoryReplayData
      } else {
        // Load from IndexedDB (historical replay)
        console.log('📼 Loading replay from IndexedDB (historical)')
        this.replayData = await this.replayDebugger.loadReplay(this.gameId)
      }

      if (!this.replayData) {
        console.error('❌ Failed to load replay data')
        console.log('Replay may not exist or version is incompatible')
        this.isLoadingData = false
        this.notifyObservers()
        return
      }

      // Start at initialTurn (current game turn, or 0 if not specified)
      // Clamp to valid range [0, metadata.turnCount]
      this.currentTurn = Math.min(this.initialTurn, this.replayData.metadata.turnCount)
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log('✅ Replay loaded successfully')
      console.log(`Character: ${this.replayData.metadata.characterName}`)
      console.log(`Total turns: ${this.replayData.metadata.turnCount}`)
      console.log(`Commands recorded: ${this.replayData.commands.length}`)
      console.log(`Outcome: ${this.replayData.metadata.outcome}`)
      console.log('')
      console.log('Controls:')
      console.log('  Space       - Step forward one turn')
      console.log('  Shift+Space - Step back one turn')
      console.log('  j           - Jump to specific turn')
      console.log('  v           - Validate determinism')
      console.log('  s           - Show current state')
      console.log('  e           - Export replay data')
      console.log('  Escape      - Exit')
      console.log('='.repeat(60))

      this.isLoadingData = false
      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error loading replay:', error)
      this.isLoadingData = false
      this.notifyObservers()
    }
  }

  /**
   * No per-frame updates needed (user-driven stepping)
   */
  update(_deltaTime: number): void {
    // Console-based debugger is user-driven, no automatic updates
  }

  /**
   * Minimal rendering (console-based debugging)
   */
  render(): void {
    // This is a console-based debugger
    // Visual rendering is handled by the game state below (if transparent)
    // Or we could add canvas overlay for turn counter/instructions
  }

  /**
   * Handle replay debug controls
   */
  handleInput(input: Input): void {
    if (this.isLoadingData || !this.replayData || !this.currentState) {
      return
    }

    switch (input.key) {
      case ' ':  // Space
        if (input.shift) {
          this.stepBackward()
        } else {
          this.stepForward()
        }
        break

      case 'j':  // Jump to turn
        this.jumpToTurn()
        break

      case 'v':  // Validate determinism
        this.validateDeterminism()
        break

      case 's':  // Show state
        this.showCurrentState()
        break

      case 'e':  // Export replay
        this.exportReplay()
        break

      case 'Escape':
        this.exitDebugger()
        break
    }
  }

  /**
   * Step forward one turn
   */
  async stepForward(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    if (this.currentTurn >= this.replayData.metadata.turnCount) {
      console.log('⚠️  Already at final turn')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn++
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`➡️  Turn ${this.currentTurn} / ${this.replayData.metadata.turnCount}`)

      // Show relevant command
      if (this.currentTurn <= this.replayData.commands.length) {
        const cmd = this.replayData.commands[this.currentTurn - 1]
        console.log(`   Command: ${cmd.commandType} (${cmd.actorType})`)
      }

      // Render the reconstructed state to update the game map
      this.renderer.render(this.currentState)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error stepping forward:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  /**
   * Step backward one turn
   */
  async stepBackward(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    if (this.currentTurn <= 0) {
      console.log('⚠️  Already at turn 0')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn--
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`⬅️  Turn ${this.currentTurn} / ${this.replayData.metadata.turnCount}`)

      // Render the reconstructed state to update the game map
      this.renderer.render(this.currentState)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error stepping backward:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  /**
   * Jump to specific turn
   */
  async jumpToTurn(targetTurn?: number): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    // If no turn provided, prompt user (keep existing prompt behavior)
    let turn = targetTurn
    if (turn === undefined) {
      const input = prompt(`Jump to turn (0-${this.replayData.metadata.turnCount}):`)
      if (!input) return
      turn = parseInt(input, 10)
    }

    if (isNaN(turn) || turn < 0 || turn > this.replayData.metadata.turnCount) {
      console.error('❌ Invalid turn number')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn = turn
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`⏩ Jumped to turn ${this.currentTurn}`)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error jumping to turn:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  /**
   * Validate determinism at current turn
   */
  private async validateDeterminism(): Promise<void> {
    if (!this.replayData || !this.currentState) return

    console.log('🔍 Validating determinism...')

    try {
      const result = await this.replayDebugger.validateDeterminism(
        this.replayData,
        this.currentState
      )

      if (result.valid) {
        console.log('✅ Determinism validated - replay is accurate')
      } else {
        console.error('❌ NON-DETERMINISM DETECTED')
        console.error(`Found ${result.desyncs.length} desync(s):`)
        result.desyncs.forEach((desync) => {
          console.error(`  - ${desync.field}: expected ${JSON.stringify(desync.expected)}, got ${JSON.stringify(desync.actual)}`)
        })
      }
    } catch (error) {
      console.error('❌ Error validating determinism:', error)
    }
  }

  /**
   * Show current state in console
   */
  private showCurrentState(): void {
    if (!this.currentState) return

    console.log('='.repeat(60))
    console.log(`Current State (Turn ${this.currentTurn})`)
    console.log('='.repeat(60))
    console.log('Player:', {
      position: this.currentState.player.position,
      hp: `${this.currentState.player.hp}/${this.currentState.player.maxHp}`,
      level: this.currentState.player.level,
      xp: this.currentState.player.xp,
      gold: this.currentState.player.gold,
      hunger: this.currentState.player.hunger,
    })
    console.log('Level:', this.currentState.currentLevel)
    console.log('Turn Count:', this.currentState.turnCount)

    const currentLevel = this.currentState.levels.get(this.currentState.currentLevel)
    if (currentLevel) {
      console.log('Monsters:', currentLevel.monsters.length)
      console.log('Items:', currentLevel.items.length)
    }

    console.log('='.repeat(60))
  }

  /**
   * Export replay data to console
   */
  private exportReplay(): void {
    if (!this.replayData) return

    console.log('='.repeat(60))
    console.log('Replay Data Export')
    console.log('='.repeat(60))
    console.log('To save this data, copy the JSON below:')
    console.log(JSON.stringify(this.replayData, null, 2))
    console.log('='.repeat(60))
  }

  /**
   * Exit replay debugger (public method for UI components)
   */
  close(): void {
    this.exitDebugger()
  }

  /**
   * Exit replay debugger (internal method)
   */
  private exitDebugger(): void {
    console.log('Exiting replay debugger')
    this.stateManager.popState()
  }

  /**
   * Cleanup when state is exited
   */
  exit(): void {
    // Remove keyboard event listener
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }

    // Cleanup UI components
    this.controlPanel?.destroy()
    this.stateInspector?.destroy()
    this.controlPanel = null
    this.stateInspector = null

    // Clear observers
    this.observers = []

    // Restore debug console visibility
    if (this.debugConsoleElement) {
      this.debugConsoleElement.removeAttribute('data-suppress')
      this.debugConsoleElement.style.display = ''
      this.debugConsoleElement = null
    }

    console.log('Replay debugger exited')
  }

  /**
   * Don't pause lower states (let game continue if needed)
   */
  isPaused(): boolean {
    return true  // Pause while debugging
  }

  /**
   * Transparent state - show game view behind UI overlays
   */
  isTransparent(): boolean {
    return true
  }
}
