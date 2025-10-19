import { BaseState } from '../BaseState'
import { Input, SaveSummary } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { GameStateManager } from '@services/GameStateManager'

/**
 * LeaderboardState - Display all saved games sorted by score
 *
 * Features:
 * - Shows all saves (ongoing, died, won) in score order
 * - Navigate with ↑/↓, select with Enter, back with Escape
 * - Enter opens action menu (Resume/Replay/Delete)
 */
export class LeaderboardState extends BaseState {
  private saves: SaveSummary[] = []
  private selectedIndex: number = 0
  private isLoading: boolean = true
  private container: HTMLDivElement | null = null

  constructor(
    private gameStorage: GameStorageService,
    private stateManager: GameStateManager
  ) {
    super()
  }

  async enter(): void {
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
    if (!this.container || this.isLoading) return

    if (this.saves.length === 0) {
      this.container.innerHTML = \`
        <pre>
╔════════════════════ LEADERBOARD ════════════════════╗
║                                                     ║
║            No saved games found.                    ║
║                                                     ║
║            Press [Escape] to return to menu         ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
        </pre>
      \`
      return
    }

    // Render table
    let html = '<pre>'
    html += '╔════════════════════════════════ LEADERBOARD ═══════════════════════════════╗\n'
    html += '║ Rank │ Character       │ Status  │ Score    │ Gold  │ Depth │ Monsters ║\n'
    html += '╠══════╪═════════════════╪═════════╪══════════╪═══════╪═══════╪══════════╣\n'

    this.saves.forEach((save, index) => {
      const rank = (index + 1).toString().padStart(4, ' ')
      const name = save.characterName.substring(0, 15).padEnd(15, ' ')
      const status = save.status.padEnd(7, ' ')
      const score = save.score.toString().padStart(8, ' ')
      const gold = save.gold.toString().padStart(5, ' ')
      const depth = \`L\${save.maxDepth}\`.padStart(5, ' ')
      const monsters = save.monstersKilled.toString().padStart(8, ' ')

      const isSelected = index === this.selectedIndex
      const prefix = isSelected ? '>' : ' '

      html += \`║ \${prefix}\${rank} │ \${name} │ \${status} │ \${score} │ \${gold} │ \${depth} │ \${monsters} ║\n\`
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
        // TODO: Open action menu (Resume/Replay/Delete)
        console.log('Selected save:', this.saves[this.selectedIndex])
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
    return false // Opaque overlay
  }

  getAllowedKeys(): string[] | null {
    return null // Allow all keys
  }
}
