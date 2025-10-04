import { GameState } from '@game/core/core'
import { ContextService } from '@services/ContextService'

// ============================================================================
// HELP MODAL - Quick reference and contextual help
// ============================================================================

/**
 * HelpModal - Quick reference and contextual help
 *
 * Press '?' to show help overlay
 *
 * Shows:
 * - Context-aware tips
 * - Command reference
 * - Item symbols
 * - Monster guide
 */
export class HelpModal {
  private overlay: HTMLDivElement | null = null
  private onCloseCallback: (() => void) | null = null

  constructor(private contextService: ContextService) {}

  /**
   * Show help modal
   */
  show(state: GameState, onClose?: () => void): void {
    if (this.overlay) return

    this.onCloseCallback = onClose || null

    const context = this.contextService.analyzeContext(state)

    this.overlay = document.createElement('div')
    this.overlay.className = 'help-modal'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      color: #fff;
      font-family: 'Courier New', monospace;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #00FF00;
      border-radius: 8px;
      padding: 24px;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
    `

    // Context-aware tips
    const contextTips = context.actions
      .slice(0, 5)
      .map(
        (action) =>
          `<span style="color: #00FF00;">[${action.key}]</span> ${action.label}`
      )
      .join(' | ')

    content.innerHTML = `
      <h2 style="color: #00FF00; margin-top: 0;">📖 Quick Help</h2>

      <div style="background: #222; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
        <div style="color: #FFD700; margin-bottom: 8px;">🎯 Available Now:</div>
        <div>${contextTips || 'Explore the dungeon!'}</div>
      </div>

      <h3 style="color: #00FFFF;">Movement & Actions</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div><span style="color: #00FF00;">↑↓←→</span> Move/Attack</div>
        <div><span style="color: #00FF00;">[,]</span> Pick up item</div>
        <div><span style="color: #00FF00;">[i]</span> Inventory</div>
        <div><span style="color: #00FF00;">[d]</span> Drop item</div>
        <div><span style="color: #00FF00;">[o]</span> Open door</div>
        <div><span style="color: #00FF00;">[c]</span> Close door</div>
        <div><span style="color: #00FF00;">[s]</span> Search</div>
        <div><span style="color: #00FF00;">[>]</span> Descend stairs</div>
        <div><span style="color: #00FF00;">[<]</span> Ascend stairs</div>
        <div><span style="color: #00FF00;">[S]</span> Save game</div>
      </div>

      <h3 style="color: #00FFFF;">Items</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div><span style="color: #00FF00;">[q]</span> Quaff potion</div>
        <div><span style="color: #00FF00;">[r]</span> Read scroll</div>
        <div><span style="color: #00FF00;">[z]</span> Zap wand</div>
        <div><span style="color: #00FF00;">[e]</span> Eat food</div>
        <div><span style="color: #00FF00;">[w]</span> Wield weapon</div>
        <div><span style="color: #00FF00;">[W]</span> Wear armor</div>
        <div><span style="color: #00FF00;">[P]</span> Put on ring</div>
        <div><span style="color: #00FF00;">[R]</span> Remove ring</div>
      </div>

      <h3 style="color: #00FFFF;">Symbols</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; font-size: 13px;">
        <div><span style="color: #00FFFF;">@</span> You</div>
        <div><span style="color: #FF00FF;">!</span> Potion</div>
        <div><span style="color: #FFFFFF;">?</span> Scroll</div>
        <div><span style="color: #FFD700;">*</span> Gold</div>
        <div><span style="color: #FFD700;">=</span> Ring</div>
        <div><span style="color: #00FFFF;">/</span> Wand</div>
        <div><span style="color: #8B4513;">%</span> Food</div>
        <div><span style="color: #C0C0C0;">)</span> Weapon</div>
        <div><span style="color: #C0C0C0;">[</span> Armor</div>
        <div><span style="color: #FFFFFF;">></span> Stairs down</div>
        <div><span style="color: #FFFFFF;"><</span> Stairs up</div>
        <div><span style="color: #D4AF37;">+</span> Door</div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #444; color: #888;">
        Press [?] or [ESC] to close
      </div>
    `

    this.overlay.appendChild(content)
    document.body.appendChild(this.overlay)

    // Add keyboard listener for closing
    this.addCloseListener()
  }

  /**
   * Hide help modal
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

  private closeHandler = (event: KeyboardEvent) => {
    if (event.key === '?' || event.key === 'Escape') {
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
