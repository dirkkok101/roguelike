// ============================================================================
// CHARACTER NAME MODAL - Prompt for character name before game start
// ============================================================================

export class CharacterNameModal {
  private container: HTMLDivElement | null = null
  private inputElement: HTMLInputElement | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  /**
   * Show character name input modal
   * @param defaultName - Pre-filled name (from preferences or "Anonymous")
   * @param onSubmit - Callback when name is submitted (Enter or OK button)
   * @param onCancel - Callback when modal is cancelled (ESC key)
   */
  show(
    defaultName: string,
    onSubmit: (name: string) => void,
    onCancel?: () => void
  ): void {
    this.container = this.createModal(defaultName, onSubmit, onCancel)
    document.body.appendChild(this.container)

    // Auto-focus input field after a brief delay (allows modal to render)
    setTimeout(() => {
      if (this.inputElement) {
        this.inputElement.focus()
        this.inputElement.select() // Select all text for easy replacement
      }
    }, 100)
  }

  /**
   * Hide and cleanup modal
   */
  hide(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }

    if (this.container) {
      this.container.remove()
      this.container = null
    }

    this.inputElement = null
  }

  /**
   * Check if modal is currently visible
   */
  isVisible(): boolean {
    return this.container !== null
  }

  private createModal(
    defaultName: string,
    onSubmit: (name: string) => void,
    onCancel?: () => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay character-name-modal'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
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
    modal.className = 'modal-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #00AA00;
      padding: 40px;
      min-width: 500px;
      max-width: 600px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = `
      <div class="character-name-title" style="margin-bottom: 25px;">
        <div style="font-size: 24px; color: #00FF00; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">
          ENTER CHARACTER NAME
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 8px;">
          This name will appear on the leaderboard
        </div>
      </div>

      <div class="character-name-input-container" style="margin: 30px 0;">
        <input
          type="text"
          id="character-name-input"
          maxlength="20"
          placeholder="${defaultName}"
          value="${defaultName}"
          style="
            width: 100%;
            padding: 12px 16px;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            background: #000;
            border: 2px solid #00AA00;
            color: #00FF00;
            text-align: center;
            outline: none;
            box-sizing: border-box;
          "
        />
        <div style="color: #666; font-size: 12px; margin-top: 8px; text-align: right;">
          Max 20 characters
        </div>
      </div>

      <div class="character-name-buttons" style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">
        <button
          id="character-name-ok"
          style="
            padding: 10px 30px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            background: #00AA00;
            border: 2px solid #00FF00;
            color: #000;
            cursor: pointer;
            font-weight: bold;
          "
        >
          OK [Enter]
        </button>
        <button
          id="character-name-cancel"
          style="
            padding: 10px 30px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            background: #000;
            border: 2px solid #666;
            color: #888;
            cursor: pointer;
          "
        >
          Cancel [ESC]
        </button>
      </div>
    `

    // Get elements
    this.inputElement = modal.querySelector('#character-name-input')
    const okButton = modal.querySelector('#character-name-ok')
    const cancelButton = modal.querySelector('#character-name-cancel')

    // Submit handler
    const handleSubmit = () => {
      const name = (this.inputElement?.value || '').trim()
      const finalName = name.length > 0 ? name : defaultName
      this.hide()
      onSubmit(finalName)
    }

    // Cancel handler
    const handleCancel = () => {
      this.hide()
      if (onCancel) {
        onCancel()
      }
    }

    // Keyboard event handler
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }
    document.addEventListener('keydown', this.keydownHandler)

    // Button click handlers
    okButton?.addEventListener('click', handleSubmit)
    cancelButton?.addEventListener('click', handleCancel)

    overlay.appendChild(modal)
    return overlay
  }
}
