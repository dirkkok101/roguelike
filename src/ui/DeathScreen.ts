import { ComprehensiveDeathStats } from '@services/DeathService'

// ============================================================================
// DEATH SCREEN - Display death modal with final stats
// ============================================================================

export class DeathScreen {
  private container: HTMLDivElement | null = null

  /**
   * Display death screen with final stats
   */
  show(stats: ComprehensiveDeathStats, onNewGame: () => void): void {
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

  private createDeathModal(stats: ComprehensiveDeathStats, onNewGame: () => void): HTMLDivElement {
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

    // Build final blow details if available
    const finalBlowText = stats.finalBlow
      ? `${stats.finalBlow.attacker} dealt ${stats.finalBlow.damage} damage`
      : ''

    // Build achievements display
    const achievementsHTML = stats.achievements.length > 0
      ? `<div style="color: #FFD700; margin: 15px 0; padding: 10px; background: rgba(255, 215, 0, 0.1); border-left: 3px solid #FFD700;">
          <div style="font-weight: bold; margin-bottom: 5px;">🏆 Achievements:</div>
          ${stats.achievements.map(a => `<div style="margin: 3px 0; font-size: 14px;">• ${a}</div>`).join('')}
        </div>`
      : ''

    // Build epitaph display
    const epitaphHTML = stats.epitaph
      ? `<div style="color: #888; font-style: italic; margin: 15px 0; padding: 10px; border-left: 3px solid #444;">
          "${stats.epitaph}"
        </div>`
      : ''

    modal.innerHTML = `
      <pre class="death-title" style="font-size: 24px; color: #FF4444; margin-bottom: 15px; font-family: 'Courier New', monospace;">╔═══════════════════════════════════════════════════════╗
║                    GAME OVER                          ║
║                 You have died...                      ║
╚═══════════════════════════════════════════════════════╝</pre>

      <div class="death-cause" style="color: #FF8800; font-size: 16px; margin: 15px 0;">
        ${stats.cause}
        ${finalBlowText ? `<div style="color: #FF6666; font-size: 14px; margin-top: 5px;">${finalBlowText}</div>` : ''}
      </div>

      <pre class="death-stats-header" style="color: #CCCCCC; margin: 20px 0 10px 0; font-family: 'Courier New', monospace; font-size: 14px;">┌──────────────────── Final Statistics ─────────────────────┐</pre>

      <div class="death-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 10px 0; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
        <div style="text-align: left;">
          <div style="color: #00FFFF; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #00FFFF; padding-bottom: 3px;">Progression</div>
          <div style="margin: 5px 0; font-size: 14px;">Level: ${stats.finalLevel}</div>
          <div style="margin: 5px 0; font-size: 14px;">XP: ${stats.totalXP.toLocaleString()}</div>
        </div>
        <div style="text-align: left;">
          <div style="color: #00FF00; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #00FF00; padding-bottom: 3px;">Exploration</div>
          <div style="margin: 5px 0; font-size: 14px;">Deepest: ${stats.deepestLevel}</div>
          <div style="margin: 5px 0; font-size: 14px;">Levels: ${stats.levelsExplored}</div>
          <div style="margin: 5px 0; font-size: 14px;">Turns: ${stats.totalTurns.toLocaleString()}</div>
        </div>
        <div style="text-align: left;">
          <div style="color: #FF8800; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #FF8800; padding-bottom: 3px;">Combat & Loot</div>
          <div style="margin: 5px 0; font-size: 14px;">Kills: ${stats.monstersKilled}</div>
          <div style="margin: 5px 0; font-size: 14px;">Gold: ${stats.totalGold.toLocaleString()}</div>
          <div style="margin: 5px 0; font-size: 14px;">Items: ${stats.itemsFound}</div>
        </div>
      </div>

      <pre class="death-stats-footer" style="color: #CCCCCC; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 14px;">└───────────────────────────────────────────────────────────┘</pre>

      ${achievementsHTML}
      ${epitaphHTML}

      <div class="death-footer" style="margin-top: 25px; border-top: 1px solid #444; padding-top: 20px;">
        <div style="color: #888; margin-bottom: 8px; font-size: 13px;">
          Seed: <span style="color: #AAA; user-select: all; cursor: text;">${stats.seed}</span>
        </div>
        <div style="color: #888; margin-bottom: 15px; font-style: italic; font-size: 14px;">
          Permadeath - Your save has been deleted
        </div>
        <div style="color: #00FF00; font-size: 16px;">
          Press [N] to Continue
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
