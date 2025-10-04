import { GameState, Message } from '@game/core/core'

// ============================================================================
// MESSAGE HISTORY MODAL - Full message log viewer
// ============================================================================

/**
 * MessageHistoryModal - Full message log viewer
 *
 * Press 'm' to view all messages from current game
 *
 * Features:
 * - Scrollable message list
 * - Color-coded by type
 * - Shows turn numbers
 * - Close with ESC or 'm' again
 */
export class MessageHistoryModal {
  private overlay: HTMLDivElement | null = null
  private onCloseCallback: (() => void) | null = null

  /**
   * Show message history modal
   */
  show(state: GameState, onClose?: () => void): void {
    if (this.overlay) return // Already showing

    this.onCloseCallback = onClose || null

    this.overlay = document.createElement('div')
    this.overlay.className = 'message-history-modal'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 20px;
      max-width: 800px;
      max-height: 600px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      color: #fff;
    `

    const messages = state.messages
      .map((msg, i) => {
        const color = this.getColorForType(msg.type)
        const countText = msg.count && msg.count > 1 ? ` (x${msg.count})` : ''
        return `
        <div style="margin-bottom: 8px;">
          <span style="color: #666;">Turn ${msg.turn}:</span>
          <span style="color: ${color};">${msg.text}${countText}</span>
        </div>
      `
      })
      .join('')

    content.innerHTML = `
      <h2 style="margin-top: 0;">Message History</h2>
      <div style="margin-top: 16px;">${messages}</div>
      <div style="margin-top: 16px; text-align: center; color: #888;">
        Press [m] or [ESC] to close
      </div>
    `

    this.overlay.appendChild(content)
    document.body.appendChild(this.overlay)

    // Scroll to bottom
    content.scrollTop = content.scrollHeight

    // Add keyboard listener for closing
    this.addCloseListener()
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay)
      this.overlay = null
      this.removeCloseListener()

      if (this.onCloseCallback) {
        this.onCloseCallback()
        this.onCloseCallback = null
      }
    }
  }

  /**
   * Check if modal is currently showing
   */
  isShowing(): boolean {
    return this.overlay !== null
  }

  private getColorForType(type: string): string {
    switch (type) {
      case 'combat':
        return '#FF4444'
      case 'warning':
        return '#FFDD00'
      case 'critical':
        return '#FF0000'
      case 'success':
        return '#00FF00'
      case 'debug':
        return '#00FFFF'
      default:
        return '#FFFFFF'
    }
  }

  private closeHandler = (event: KeyboardEvent) => {
    if (event.key === 'm' || event.key === 'Escape') {
      event.preventDefault()
      this.hide()
    }
  }

  private addCloseListener(): void {
    document.addEventListener('keydown', this.closeHandler)
  }

  private removeCloseListener(): void {
    document.removeEventListener('keydown', this.closeHandler)
  }
}
