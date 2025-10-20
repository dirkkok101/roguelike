import { BaseState } from '../BaseState'
import { Input, SaveSummary, GameState } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { GameStateManager } from '@services/GameStateManager'
import { escapeHtml } from '@utils/sanitize'

/**
 * SaveActionMenuState - Action menu for selected save game
 *
 * Displays action options for a selected save:
 * - [L]oad: Load game and continue playing
 * - [R]eplay: Launch replay debugger from turn 0
 * - [D]elete: Delete save from storage
 * - [Escape]: Cancel and return to leaderboard
 */
export class SaveActionMenuState extends BaseState {
  private container: HTMLDivElement | null = null
  private deleteConfirmMode: boolean = false

  constructor(
    private save: SaveSummary,
    private gameStorage: GameStorageService,
    private stateManager: GameStateManager,
    private onDelete: () => void,
    private startGame: (gameState: GameState) => void
  ) {
    super()
  }

  enter(): void {
    // Create UI container
    this.container = document.createElement('div')
    this.container.className = 'save-action-menu'
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      font-family: monospace;
      padding: 20px;
      border-top: 2px solid #666;
      z-index: 2000;
    `
    document.body.appendChild(this.container)
    this.render()
  }

  exit(): void {
    if (this.container) {
      document.body.removeChild(this.container)
      this.container = null
    }
  }

  update(_deltaTime: number): void {
    // No updates needed
  }

  render(): void {
    if (!this.container) return

    const name = escapeHtml(this.save.characterName)
    const status = this.save.status
    const level = this.save.maxDepth
    const score = this.save.score

    let html = '<pre style="margin: 0;">'

    if (this.deleteConfirmMode) {
      html += `Delete "${name}"? [Y] Yes  [N] No`
    } else {
      html += `Selected: ${name} (${status}, L${level}, Score: ${score})\n`
      html += `[L]oad  [R]eplay  [D]elete  [Escape] Back`
    }

    html += '</pre>'

    this.container.innerHTML = html
  }

  handleInput(input: Input): void {
    // Handle delete confirmation mode
    if (this.deleteConfirmMode) {
      if (input.key === 'y' || input.key === 'Y') {
        this.deleteGame()
      } else if (input.key === 'n' || input.key === 'N' || input.key === 'Escape') {
        this.deleteConfirmMode = false
        this.render()
      }
      return
    }

    // Handle normal action menu
    switch (input.key) {
      case 'l':
      case 'L':
        this.loadGame()
        break

      case 'r':
      case 'R':
        this.replayGame()
        break

      case 'd':
      case 'D':
        // Enter delete confirmation mode
        this.deleteConfirmMode = true
        this.render()
        break

      case 'Escape':
        this.stateManager.popState()
        break
    }
  }

  isPaused(): boolean {
    return true
  }

  isTransparent(): boolean {
    return true // Show leaderboard underneath
  }

  getAllowedKeys(): string[] | null {
    return null // Allow all keys
  }

  private async loadGame(): Promise<void> {
    try {
      // Load game state from storage
      const gameState = await this.gameStorage.loadGame(this.save.gameId)

      if (!gameState) {
        console.error('Failed to load game state')
        // TODO: Show error message to user
        return
      }

      // Use the startGame factory to properly initialize PlayingState with all dependencies
      this.startGame(gameState)
    } catch (error) {
      console.error('Error loading game:', error)
      // TODO: Show error message to user
    }
  }

  private async replayGame(): Promise<void> {
    // TODO: Implement in next task
    console.log('Replay game:', this.save.gameId)
  }

  private async deleteGame(): Promise<void> {
    // TODO: Implement in next task
    console.log('Delete game:', this.save.gameId)
    // Will use this.gameStorage and this.onDelete in next task
  }
}
