// ============================================================================
// DEATH SCREEN - Display death modal with final stats
// ============================================================================

export interface DeathStats {
  cause: string
  finalLevel: number
  totalGold: number
  totalXP: number
  totalTurns: number
  deepestLevel: number
  seed: string
}

export class DeathScreen {
  private container: HTMLDivElement | null = null

  /**
   * Display death screen with final stats
   */
  show(stats: DeathStats, onNewGame: () => void): void {
    this.container = this.createDeathModal(stats, onNewGame)
    document.body.appendChild(this.container)
  }

  /**
   * Hide and cleanup
   */
  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private createDeathModal(stats: DeathStats, onNewGame: () => void): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease-in;
    `

    // Add keyframes for fade-in animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    document.head.appendChild(style)

    const modal = document.createElement('div')
    modal.className = 'modal-content death-modal'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #8B0000;
      padding: 30px;
      min-width: 500px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = `
      <pre class="death-title" style="font-size: 24px; color: #FF4444; margin-bottom: 20px; font-family: 'Courier New', monospace;">╔═══════════════════════════════╗
║        GAME OVER              ║
║      You have died...         ║
╚═══════════════════════════════╝</pre>

      <div class="death-cause" style="color: #FF8800; font-size: 16px; margin: 20px 0;">
        ${stats.cause}
      </div>

      <div class="death-stats" style="margin: 20px 0; text-align: left; border-top: 1px solid #444; padding-top: 15px;">
        <div style="margin: 5px 0;">Character Level: ${stats.finalLevel}</div>
        <div style="margin: 5px 0;">Total Gold: ${stats.totalGold}</div>
        <div style="margin: 5px 0;">Experience: ${stats.totalXP}</div>
        <div style="margin: 5px 0;">Deepest Level: ${stats.deepestLevel}</div>
        <div style="margin: 5px 0;">Total Turns: ${stats.totalTurns}</div>
        <div style="margin: 5px 0; color: #888;">Seed: ${stats.seed}</div>
      </div>

      <div class="death-footer" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 20px;">
        <div style="color: #888; margin-bottom: 10px; font-style: italic;">
          Permadeath - Your save has been deleted
        </div>
        <div style="color: #00FF00; margin-bottom: 10px;">
          Press [N] for New Game
        </div>
      </div>
    `

    // Handle keyboard input
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onNewGame()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
