import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// ENTRY DETAILS MODAL - Display detailed statistics for a leaderboard entry
// ============================================================================

export class EntryDetailsModal {
  private container: HTMLDivElement | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  /**
   * Show entry details modal
   */
  show(entry: LeaderboardEntry, onClose: () => void): void {
    this.container = this.createDetailsModal(entry, onClose)
    document.body.appendChild(this.container)
  }

  /**
   * Hide and cleanup modal
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
   * Check if modal is visible
   */
  isVisible(): boolean {
    return this.container !== null
  }

  private createDetailsModal(entry: LeaderboardEntry, onClose: () => void): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay entry-details-modal'
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

    const modal = document.createElement('div')
    modal.className = 'modal-content entry-details-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid ${entry.isVictory ? '#00FF00' : '#FF6666'};
      padding: 30px;
      min-width: 800px;
      max-width: 1000px;
      max-height: 90vh;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = this.renderModalContent(entry)

    // Handle keyboard input
    this.keydownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (key === 'escape' || key === 'q') {
        e.preventDefault()
        this.hide()
        onClose()
      } else if (key === 'c') {
        e.preventDefault()
        this.copySeedToClipboard(entry.seed)
      }
    }

    document.addEventListener('keydown', this.keydownHandler)

    // Add copy seed button handler
    const copyButton = modal.querySelector('.copy-seed-button')
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        this.copySeedToClipboard(entry.seed)
      })
    }

    overlay.appendChild(modal)
    return overlay
  }

  private renderModalContent(entry: LeaderboardEntry): string {
    const date = new Date(entry.timestamp).toLocaleString()
    const outcomeColor = entry.isVictory ? '#00FF00' : '#FF6666'
    const outcomeText = entry.isVictory ? '✓ VICTORY' : '✗ DEATH'
    const outcomeIcon = entry.isVictory ? '👑' : '💀'

    return `
      <div class="details-header" style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 36px; color: ${outcomeColor}; font-weight: bold; margin-bottom: 10px;">
          ${outcomeIcon} ${outcomeText} ${outcomeIcon}
        </div>
        <div style="font-size: 20px; color: #FFD700; font-weight: bold;">
          Score: ${entry.score.toLocaleString()}
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 10px;">
          ${date}
        </div>
      </div>

      ${this.renderDeathInfo(entry)}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        ${this.renderProgressionStats(entry)}
        ${this.renderExplorationStats(entry)}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        ${this.renderCombatStats(entry)}
        ${this.renderItemStats(entry)}
      </div>

      ${this.renderEquipment(entry)}
      ${this.renderAchievements(entry)}

      <div class="seed-section" style="margin: 30px 0; padding: 20px; background: rgba(255, 170, 0, 0.1); border: 2px solid #FFAA00; border-radius: 4px;">
        <div style="text-align: center;">
          <div style="color: #FFAA00; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
            🎲 Dungeon Seed
          </div>
          <div style="color: #FFFFFF; font-size: 18px; font-family: 'Courier New', monospace; margin-bottom: 15px;">
            ${entry.seed}
          </div>
          <button class="copy-seed-button" style="
            background: #FFAA00;
            color: #000000;
            border: none;
            padding: 10px 20px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
          ">
            📋 Copy Seed [C]
          </button>
          <div style="color: #888; font-size: 12px; margin-top: 10px;">
            Use this seed to replay the exact same dungeon
          </div>
        </div>
      </div>

      <div class="details-footer" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 15px; text-align: center;">
        <div style="color: #888; font-size: 14px;">
          <span style="color: #FFAA00;">[C]</span> Copy Seed |
          <span style="color: #FF6666;">[ESC]</span> Close
        </div>
      </div>
    `
  }

  private renderDeathInfo(entry: LeaderboardEntry): string {
    if (entry.isVictory || !entry.deathCause) return ''

    return `
      <div class="death-info" style="margin: 20px 0; padding: 20px; background: rgba(255, 102, 102, 0.1); border: 2px solid #FF6666; border-radius: 4px; text-align: center;">
        <div style="color: #FF6666; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          ${entry.deathCause}
        </div>
        ${entry.epitaph ? `<div style="color: #888; font-size: 14px; font-style: italic;">"${entry.epitaph}"</div>` : ''}
      </div>
    `
  }

  private renderProgressionStats(entry: LeaderboardEntry): string {
    return `
      <div class="progression-stats" style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid #444; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
          📊 Character Progression
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Final Level:</span>
            <span style="color: #00FFFF; font-weight: bold;">Level ${entry.finalLevel}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Total XP:</span>
            <span style="color: #FFFFFF;">${entry.totalXP.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Gold Collected:</span>
            <span style="color: #FFD700; font-weight: bold;">${entry.totalGold.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `
  }

  private renderExplorationStats(entry: LeaderboardEntry): string {
    return `
      <div class="exploration-stats" style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid #444; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
          🗺️ Exploration
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Deepest Level:</span>
            <span style="color: #FF8888; font-weight: bold;">Level ${entry.deepestLevel}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Levels Explored:</span>
            <span style="color: #FFFFFF;">${entry.levelsExplored}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Total Turns:</span>
            <span style="color: #FFFFFF;">${entry.totalTurns.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `
  }

  private renderCombatStats(entry: LeaderboardEntry): string {
    const killsPerLevel = entry.killsPerLevel?.toFixed(2) || '0.00'

    return `
      <div class="combat-stats" style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid #444; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
          ⚔️ Combat
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Monsters Killed:</span>
            <span style="color: #FF4444; font-weight: bold;">${entry.monstersKilled}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Kills per Level:</span>
            <span style="color: #888888;">${killsPerLevel}</span>
          </div>
        </div>
      </div>
    `
  }

  private renderItemStats(entry: LeaderboardEntry): string {
    const scorePerTurn = entry.scorePerTurn?.toFixed(2) || '0.00'

    return `
      <div class="item-stats" style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid #444; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
          🎒 Items
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Items Found:</span>
            <span style="color: #FFFFFF;">${entry.itemsFound}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Items Used:</span>
            <span style="color: #FFFFFF;">${entry.itemsUsed}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Score/Turn:</span>
            <span style="color: #888888;">${scorePerTurn}</span>
          </div>
        </div>
      </div>
    `
  }

  private renderEquipment(entry: LeaderboardEntry): string {
    if (!entry.finalEquipment) return ''

    const { weapon, armor, lightSource, rings } = entry.finalEquipment
    const hasEquipment = weapon || armor || lightSource || (rings && rings.length > 0)

    if (!hasEquipment) return ''

    return `
      <div class="equipment-section" style="margin: 20px 0; padding: 20px; background: rgba(255, 215, 0, 0.05); border: 2px solid #FFD700; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; border-bottom: 1px solid #444; padding-bottom: 10px;">
          ⚔️ Final Equipment ⚔️
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          ${weapon ? `
            <div>
              <div style="color: #888; font-size: 12px; margin-bottom: 5px;">Weapon:</div>
              <div style="color: #FFFFFF; font-weight: bold;">${weapon}</div>
            </div>
          ` : ''}
          ${armor ? `
            <div>
              <div style="color: #888; font-size: 12px; margin-bottom: 5px;">Armor:</div>
              <div style="color: #FFFFFF; font-weight: bold;">${armor}</div>
            </div>
          ` : ''}
          ${lightSource ? `
            <div>
              <div style="color: #888; font-size: 12px; margin-bottom: 5px;">Light Source:</div>
              <div style="color: #FFFF00; font-weight: bold;">${lightSource}</div>
            </div>
          ` : ''}
          ${rings && rings.length > 0 ? `
            <div>
              <div style="color: #888; font-size: 12px; margin-bottom: 5px;">Rings:</div>
              <div style="color: #FF88FF; font-weight: bold;">${rings.join(', ')}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  private renderAchievements(entry: LeaderboardEntry): string {
    if (!entry.achievements || entry.achievements.length === 0) return ''

    return `
      <div class="achievements-section" style="margin: 20px 0; padding: 20px; background: rgba(255, 215, 0, 0.05); border: 2px solid #FFD700; border-radius: 4px;">
        <div style="color: #FFD700; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; border-bottom: 1px solid #444; padding-bottom: 10px;">
          🏆 Achievements 🏆
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${entry.achievements.map((achievement, i) => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
              <span style="color: #FFD700; font-size: 20px;">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              <span style="color: #FFFFFF;">${achievement}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  private copySeedToClipboard(seed: string): void {
    navigator.clipboard.writeText(seed).then(
      () => {
        // Visual feedback - show "Copied!" message
        const button = document.querySelector('.copy-seed-button')
        if (button) {
          const originalText = button.textContent
          button.textContent = '✓ Copied!'
          ;(button as HTMLButtonElement).style.background = '#00FF00'

          setTimeout(() => {
            button.textContent = originalText || '📋 Copy Seed [C]'
            ;(button as HTMLButtonElement).style.background = '#FFAA00'
          }, 1500)
        }
      },
      (err) => {
        console.error('Failed to copy seed:', err)
      }
    )
  }
}
