/**
 * MainMenu - Main menu screen with Continue/New Game/Help options
 */
export class MainMenu {
  private container: HTMLDivElement | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  // Store show() parameters for re-showing after seed input cancel
  private lastShowParams: {
    hasSave: boolean
    onNewGame: () => void
    onContinue: () => void
    onCustomSeed: (seed: string) => void
  } | null = null

  /**
   * Show main menu
   * @param hasSave Whether a save exists (shows Continue option)
   * @param onNewGame Callback when N is pressed
   * @param onContinue Callback when C is pressed
   * @param onCustomSeed Callback when custom seed is provided
   */
  show(
    hasSave: boolean,
    onNewGame: () => void,
    onContinue: () => void,
    onCustomSeed: (seed: string) => void
  ): void {
    // Store parameters for potential re-show (e.g., after ESC from seed input)
    this.lastShowParams = { hasSave, onNewGame, onContinue, onCustomSeed }

    this.container = this.createMenuModal(hasSave, onNewGame, onContinue, onCustomSeed)
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
    onContinue: () => void,
    onCustomSeed: (seed: string) => void
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
        <div style="color: #FFAA00; margin: 10px 0; font-size: 16px;">[S] Play Custom Seed</div>
        <div style="color: #888; margin: 10px 0; font-size: 16px;">[?] Help</div>
      </div>

      <div class="menu-footer" style="margin-top: 40px; color: #666; font-size: 12px;">
        <div style="margin-bottom: 10px;">Press a key to begin...</div>
        <div style="color: #555; font-size: 11px; font-style: italic;">
          💡 Tip: Use custom seeds to replay dungeons or share challenges with friends
        </div>
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
      } else if (key === 's') {
        e.preventDefault()
        this.showSeedInput(onCustomSeed)
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

  private showSeedInput(onCustomSeed: (seed: string) => void): void {
    // Hide main menu temporarily
    this.hide()

    // Create seed input modal
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay seed-input-modal'
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
      z-index: 3001;
      animation: fadeIn 0.3s ease-in;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content seed-input-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #FFAA00;
      padding: 30px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
      min-width: 400px;
    `

    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="color: #FFAA00; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          Enter Custom Seed
        </div>
        <div style="color: #888; font-size: 13px; margin-bottom: 20px;">
          Use a seed to replay a previous dungeon or share with friends
        </div>
      </div>

      <div style="margin: 20px 0;">
        <input
          type="text"
          id="seed-input"
          placeholder="seed-1234567890"
          style="
            width: 100%;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            background: #2a2a2a;
            border: 2px solid #555;
            color: #FFFFFF;
            text-align: center;
            outline: none;
          "
        />
      </div>

      <div style="margin-top: 20px; color: #666; font-size: 12px;">
        Press <span style="color: #00FF00;">Enter</span> to start | <span style="color: #FF8888;">ESC</span> to cancel
      </div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const input = modal.querySelector('#seed-input') as HTMLInputElement
    input.focus()

    // Handle keyboard input
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const seed = input.value.trim()
        if (seed.length > 0) {
          // Valid seed - clean up and start game
          document.removeEventListener('keydown', handleKeyPress)
          overlay.remove()
          onCustomSeed(seed)
        } else {
          // Invalid seed - shake the input
          input.style.borderColor = '#FF0000'
          input.placeholder = 'Seed cannot be empty!'
          setTimeout(() => {
            input.style.borderColor = '#555'
            input.placeholder = 'seed-1234567890'
          }, 1000)
        }
      } else if (e.key === 'Escape') {
        // Cancel - return to main menu
        document.removeEventListener('keydown', handleKeyPress)
        overlay.remove()

        // Re-show main menu with stored parameters
        if (this.lastShowParams) {
          this.show(
            this.lastShowParams.hasSave,
            this.lastShowParams.onNewGame,
            this.lastShowParams.onContinue,
            this.lastShowParams.onCustomSeed
          )
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
  }
}
