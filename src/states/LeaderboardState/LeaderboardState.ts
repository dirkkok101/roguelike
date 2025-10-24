import { BaseState } from '../BaseState'
import { Input, SaveSummary, GameState } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { GameStateManager } from '@services/GameStateManager'
import { SaveActionMenuState } from '../SaveActionMenuState'
import { escapeHtml } from '@utils/sanitize'

/**
 * LeaderboardState - Display all saved games sorted by score
 *
 * Features:
 * - Shows all saves (ongoing, died, won) in score order
 * - Navigate with ↑/↓, select with Enter, back with Escape
 * - Enter opens action menu (Resume/Replay/Delete)
 *
 * Factory Functions:
 * The constructor requires two factory functions to integrate with the game lifecycle:
 *
 * 1. startGame(gameState: GameState): void
 *    - Should clear the state stack
 *    - Should create a new PlayingState with all required dependencies
 *    - Should push PlayingState onto the state manager
 *    - Example from main.ts line 557 shows the pattern
 *
 * 2. startReplay(gameId: string): Promise<void>
 *    - Should load replay data from storage using the gameId
 *    - Should create a new ReplayDebugState with all required dependencies
 *    - Should push ReplayDebugState onto the state manager
 *    - See ReplayDebugState constructor for required dependencies:
 *      - gameId, replayDebugger, stateManager, commandRecorder, renderer
 */
export class LeaderboardState extends BaseState {
  private saves: SaveSummary[] = []
  private selectedIndex: number = 0
  private isLoading: boolean = true
  private container: HTMLDivElement | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(
    private gameStorage: GameStorageService,
    private stateManager: GameStateManager,
    private startGame: (gameState: GameState) => void,
    private startReplay: (gameId: string) => Promise<void>,
    private onClose?: () => void
  ) {
    super()
  }

  async enter(): Promise<void> {
    // Load saves
    this.saves = await this.gameStorage.listGames()
    this.isLoading = false

    // Create UI container
    this.container = document.createElement('div')
    this.container.className = 'leaderboard-container'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      color: #fff;
      font-family: monospace;
      padding: 20px;
      overflow-y: auto;
      z-index: 1000;
    `
    document.body.appendChild(this.container)

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

    this.render()
  }

  exit(): void {
    // Remove keyboard event listener
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }

    if (this.container) {
      document.body.removeChild(this.container)
      this.container = null
    }

    // Note: onClose callback is NOT called here
    // It's called explicitly when Escape is pressed (see handleInput)
    // This prevents the menu from showing when startGame() clears the stack
  }

  update(_deltaTime: number): void {
    // No updates needed
  }

  render(): void {
    if (!this.container || this.isLoading) return

    if (this.saves.length === 0) {
      this.container.innerHTML = `
        <pre>
╔════════════════════ LEADERBOARD ════════════════════╗
║                                                     ║
║            No saved games found.                    ║
║                                                     ║
║            Press [Escape] to return to menu         ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
        </pre>
      `
      return
    }

    // Render table
    let html = '<pre>'
    html += '╔════════════════════════════════ LEADERBOARD ═══════════════════════════════╗\n'
    html += '║ Rank │ Character       │ Status  │ Score    │ Gold  │ Depth │ Monsters ║\n'
    html += '╠══════╪═════════════════╪═════════╪══════════╪═══════╪═══════╪══════════╣\n'

    this.saves.forEach((save, index) => {
      const rank = (index + 1).toString().padStart(4, ' ')
      const name = escapeHtml(save.characterName).substring(0, 15).padEnd(15, ' ')
      const status = save.status.padEnd(7, ' ')
      const score = save.score.toString().padStart(8, ' ')
      const gold = save.gold.toString().padStart(5, ' ')
      const depth = `L${save.maxDepth}`.padStart(5, ' ')
      const monsters = save.monstersKilled.toString().padStart(8, ' ')

      const isSelected = index === this.selectedIndex
      const prefix = isSelected ? '>' : ' '

      html += `║ ${prefix}${rank} │ ${name} │ ${status} │ ${score} │ ${gold} │ ${depth} │ ${monsters} ║\n`
    })

    html += '╚═══════════════════════════════════════════════════════════════════════════════╝\n'
    html += '\n'
    html += '[↑/↓] Navigate  [Enter] Actions  [Escape] Back\n'
    html += '</pre>'

    this.container.innerHTML = html
  }

  handleInput(input: Input): void {
    if (this.isLoading) return

    switch (input.key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1)
        this.render()
        break

      case 'ArrowDown':
        this.selectedIndex = Math.min(this.saves.length - 1, this.selectedIndex + 1)
        this.render()
        break

      case 'Enter':
        if (this.saves.length > 0) {
          const selectedSave = this.saves[this.selectedIndex]
          this.stateManager.pushState(
            new SaveActionMenuState(
              selectedSave,
              this.gameStorage,
              this.stateManager,
              () => this.refreshLeaderboard(),
              this.startGame,
              this.startReplay
            )
          )
        }
        break

      case 'Escape':
        // Call onClose callback BEFORE popping state
        // This ensures the menu is shown when user presses Escape
        // but NOT when startGame() clears the stack
        if (this.onClose) {
          this.onClose()
        }
        this.stateManager.popState()
        break
    }
  }

  isPaused(): boolean {
    return true
  }

  isTransparent(): boolean {
    return false // Opaque overlay
  }

  getAllowedKeys(): string[] | null {
    return null // Allow all keys
  }

  /**
   * Refresh leaderboard after save deletion
   * Reloads saves from storage and updates UI
   */
  private async refreshLeaderboard(): Promise<void> {
    this.saves = await this.gameStorage.listGames()
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.saves.length - 1))
    this.render()
  }
}
