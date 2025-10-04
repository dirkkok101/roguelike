import { GameState } from '@game/core/core'
import { ContextService, GameContext } from '@services/ContextService'

// ============================================================================
// CONTEXTUAL COMMAND BAR - Dynamic status bar showing available actions
// ============================================================================

/**
 * ContextualCommandBar - Dynamic status bar showing available actions
 *
 * Displays:
 * - Context-aware commands (pickup, open, attack, etc.)
 * - Primary hint (item here, door nearby)
 * - Warnings (inventory full, low health)
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Consumes ContextService analysis
 * - Renders below dungeon view
 */
export class ContextualCommandBar {
  private container: HTMLDivElement

  constructor(private contextService: ContextService) {
    this.container = this.createContainer()
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div')
    div.className = 'contextual-command-bar'
    div.style.cssText = `
      background: #1a1a1a;
      color: #aaa;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      padding: 8px 12px;
      border-top: 1px solid #444;
    `
    return div
  }

  /**
   * Render contextual commands
   */
  render(state: GameState): void {
    const context = this.contextService.analyzeContext(state)
    this.container.innerHTML = this.buildContent(context)
  }

  private buildContent(context: GameContext): string {
    let html = ''

    // Primary hint (e.g., "Item here!")
    if (context.primaryHint) {
      html += `<span style="color: #FFD700; font-weight: bold;">📍 ${context.primaryHint}</span>`
      html += `<span style="color: #666;">│</span>`
    }

    // Warnings (inventory full, etc.)
    if (context.warnings.length > 0) {
      html += `<span style="color: #FF8800;">${context.warnings.join(' ')}</span>`
      html += `<span style="color: #666;">│</span>`
    }

    // Commands
    const commandsHtml = context.actions
      .map((action) => {
        const keyColor = action.category === 'primary' ? '#00FF00' : '#0088FF'
        const labelColor = action.category === 'primary' ? '#FFFFFF' : '#AAA'
        return `<span style="color: ${keyColor};">[${action.key}]</span> <span style="color: ${labelColor};">${action.label}</span>`
      })
      .join('  ')

    html += commandsHtml

    return html
  }

  /**
   * Get container element
   */
  getContainer(): HTMLDivElement {
    return this.container
  }
}
