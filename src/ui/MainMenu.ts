/**
 * MainMenu - Main menu screen with Continue/New Game/Help options
 */
export class MainMenu {
  private container: HTMLDivElement | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  /**
   * Show main menu
   * @param hasSave Whether a save exists (shows Continue option)
   * @param onNewGame Callback when N is pressed
   * @param onContinue Callback when C is pressed
   */
  show(hasSave: boolean, onNewGame: () => void, onContinue: () => void): void {
    this.container = this.createMenuModal(hasSave, onNewGame, onContinue)
    document.body.appendChild(this.container)
  }

  /**
   * Hide and cleanup menu
   */
  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }

    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }
  }

  /**
   * Check if menu is currently visible
   */
  isVisible(): boolean {
    return this.container !== null
  }

  private createMenuModal(
    hasSave: boolean,
    onNewGame: () => void,
    onContinue: () => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay main-menu'
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
      z-index: 3000;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content main-menu-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #8B7355;
      padding: 40px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
      min-width: 500px;
    `

    const continueOption = hasSave
      ? `<div style="color: #00FF00; margin: 10px 0; font-size: 16px;">[C] Continue</div>`
      : ''

    modal.innerHTML = `
      <div class="menu-title" style="margin-bottom: 40px;">
        <pre style="color: #D4AF37; font-size: 14px; line-height: 1.2;">
╔═══════════════════════════════╗
║   ROGUE: THE QUEST FOR        ║
║   THE AMULET OF YENDOR        ║
╚═══════════════════════════════╝
        </pre>
      </div>

      <div class="menu-options" style="margin: 30px 0;">
        <div style="color: #FFFFFF; margin: 10px 0; font-size: 16px;">[N] New Game</div>
        ${continueOption}
        <div style="color: #888; margin: 10px 0; font-size: 16px;">[?] Help</div>
      </div>

      <div class="menu-footer" style="margin-top: 40px; color: #666; font-size: 12px;">
        Press a key to begin...
      </div>
    `

    // Handle keyboard input
    this.keydownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (key === 'n') {
        e.preventDefault()
        this.hide()
        onNewGame()
      } else if (key === 'c' && hasSave) {
        e.preventDefault()
        this.hide()
        onContinue()
      } else if (key === '?') {
        e.preventDefault()
        // Help will be handled in future task
        console.log('Help screen - not yet implemented')
      }
    }

    document.addEventListener('keydown', this.keydownHandler)

    overlay.appendChild(modal)
    return overlay
  }
}
