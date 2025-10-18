import { GameState, PotionType, ScrollType, RingType, WandType } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * DebugConsole - Visual debug panel overlay
 *
 * Displays:
 * - God mode status
 * - Current seed
 * - Turn count
 * - Player position
 * - Current level
 * - Monster stats
 * - Inventory/equipment
 * - Identification progress
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Renders debug state, doesn't modify it
 * - Uses DebugService for state queries
 */
export class DebugConsole {
  private container: HTMLDivElement

  constructor(private debugService: DebugService) {
    this.container = this.createContainer()
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div')
    div.className = 'debug-console'
    div.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border: 1px solid #0f0;
      border-radius: 4px;
      z-index: 1000;
      min-width: 200px;
      display: none;
    `
    return div
  }

  /**
   * Render debug console (called by GameRenderer)
   */
  render(state: GameState): void {
    const debugState = this.debugService.getDebugState(state)

    // Show/hide based on debug state
    if (debugState.debugConsoleVisible) {
      this.container.style.display = 'block'
      this.updateContent(state, debugState)
    } else {
      this.container.style.display = 'none'
    }
  }

  private updateContent(state: GameState, debugState: any): void {
    const { player, currentLevel, turnCount, seed, levels } = state

    // Get level data
    const level = levels.get(currentLevel)
    const monsters = level?.monsters || []
    const awakeMonsters = monsters.filter((m) => m.isAwake)

    // Get nearby monsters (within 5 tiles)
    const nearbyMonsters = monsters
      .filter((m) => {
        const dx = Math.abs(m.position.x - player.position.x)
        const dy = Math.abs(m.position.y - player.position.y)
        return dx <= 5 && dy <= 5
      })
      .slice(0, 3) // Show max 3

    const nearbyText =
      nearbyMonsters.length > 0
        ? nearbyMonsters
            .map((m) => `${m.letter} (${m.state})`)
            .join(', ')
        : 'None'

    // Get equipment info
    const weaponName = player.equipment.weapon?.name || 'None'
    const armorName = player.equipment.armor?.name || 'None'
    const leftRing = player.equipment.leftRing?.name || 'None'
    const rightRing = player.equipment.rightRing?.name || 'None'

    // Get identification stats
    const identifiedCount = state.identifiedItems?.size || 0
    const totalItemTypes =
      Object.keys(PotionType).length +
      Object.keys(ScrollType).length +
      Object.keys(RingType).length +
      Object.keys(WandType).length

    this.container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #ff0;">
        🐛 DEBUG CONSOLE
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Seed:</span> ${seed}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Turn:</span> ${turnCount}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Level:</span> ${currentLevel}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Position:</span> (${player.position.x}, ${player.position.y})
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">HP:</span> ${player.hp}/${player.maxHp}
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Inventory:</span> ${player.inventory.length}/26
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Weapon:</span> ${weaponName}
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Armor:</span> ${armorName}
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Rings:</span> ${leftRing}, ${rightRing}
        </div>
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Identified:</span> ${identifiedCount}/${totalItemTypes}
        </div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Monsters:</span> ${monsters.length} (${awakeMonsters.length} awake)
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Nearby:</span> ${nearbyText}
        </div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <span style="color: ${debugState.godMode ? '#0f0' : '#888'};">
          ${debugState.godMode ? '✓' : '✗'} God Mode
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.mapRevealed ? '#0f0' : '#888'};">
          ${debugState.mapRevealed ? '✓' : '✗'} Map Revealed
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.aiOverlay ? '#0f0' : '#888'};">
          ${debugState.aiOverlay ? '✓' : '✗'} AI Debug
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.pathOverlay ? '#0f0' : '#888'};">
          ${debugState.pathOverlay ? '✓' : '✗'} Path Debug
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.fovOverlay ? '#0f0' : '#888'};">
          ${debugState.fovOverlay ? '✓' : '✗'} FOV Debug
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: #888;">FOV Mode:</span>
        <span style="color: #0f0;"> ${state.config?.fovMode || 'radius'}</span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <div style="font-weight: bold; margin-bottom: 6px; color: #ff0; font-size: 11px;">
          DEBUG COMMANDS:
        </div>
        <div style="font-size: 10px; color: #888; line-height: 1.4;">
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">~</span> Toggle Console</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">g</span> God Mode</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">v</span> Reveal Map</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">a</span> Identify All Items</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">m</span> Spawn Monster</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">I</span> Spawn Item</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">M</span> Wake All Monsters</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">K</span> Kill All Monsters</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">f</span> FOV Overlay</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">p</span> Path Overlay</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">n</span> AI Overlay</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">x</span> Toggle FOV Mode</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">L</span> Launch Replay Debugger</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">C</span> Choose Replay</div>
          <div style="margin-bottom: 2px;"><span style="color: #0f0;">E</span> Export Replay</div>
        </div>
      </div>
    `
  }

  /**
   * Get container element (for mounting)
   */
  getContainer(): HTMLDivElement {
    return this.container
  }
}
