import { GameState, Position, ItemType } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { DebugConsole } from './DebugConsole'
import { DebugOverlays } from './DebugOverlays'
import { ContextualCommandBar } from './ContextualCommandBar'
import { MessageHistoryModal } from './MessageHistoryModal'
import { HelpModal } from './HelpModal'
import { VictoryScreen } from './VictoryScreen'
import { DeathScreen, DeathStats } from './DeathScreen'

// ============================================================================
// GAME RENDERER - DOM rendering for game state
// ============================================================================

export class GameRenderer {
  private dungeonContainer: HTMLElement
  private statsContainer: HTMLElement
  private messagesContainer: HTMLElement
  private debugConsole: DebugConsole
  private debugOverlays: DebugOverlays
  private debugCanvas: HTMLCanvasElement | null = null
  private commandBar: ContextualCommandBar
  private messageHistoryModal: MessageHistoryModal
  private helpModal: HelpModal
  private victoryScreen: VictoryScreen
  private deathScreen: DeathScreen

  constructor(
    private renderingService: RenderingService,
    private hungerService: HungerService,
    private levelingService: LevelingService,
    private debugService: DebugService,
    private contextService: ContextService,
    private victoryService: VictoryService,
    private localStorageService: LocalStorageService,
    _config = {
      dungeonWidth: 80,
      dungeonHeight: 22,
      showItemsInMemory: false,
      showGoldInMemory: false,
    }
  ) {
    // Config will be used in future phases for customizable rendering
    // Create UI structure
    this.dungeonContainer = this.createDungeonView()
    this.statsContainer = this.createStatsView()
    this.messagesContainer = this.createMessagesView()
    this.debugConsole = new DebugConsole(debugService)
    this.debugOverlays = new DebugOverlays(debugService)
    this.commandBar = new ContextualCommandBar(contextService)
    this.messageHistoryModal = new MessageHistoryModal()
    this.helpModal = new HelpModal(contextService)
    this.victoryScreen = new VictoryScreen()
    this.deathScreen = new DeathScreen()
  }

  /**
   * Render complete game state
   */
  render(state: GameState): void {
    // Check for death before rendering
    if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
      // Permadeath: Delete save immediately when player dies
      this.localStorageService.deleteSave(state.gameId)
      console.log('Save deleted (permadeath)')

      const stats: DeathStats = {
        cause: state.deathCause || 'Unknown cause',
        finalLevel: state.player.level,
        totalGold: state.player.gold,
        totalXP: state.player.xp,
        totalTurns: state.turnCount,
        deepestLevel: Math.max(...Array.from(state.levels.keys())),
        seed: state.seed,
      }

      this.deathScreen.show(stats, () => {
        // New game callback - reload page
        window.location.reload()
      })
      return // Don't render game when death screen shown
    }

    // Check for victory before rendering
    if (state.hasWon && !this.victoryScreen.isVisible()) {
      const stats = this.victoryService.getVictoryStats(state)
      this.victoryScreen.show(stats, () => {
        // New game callback - reload page
        window.location.reload()
      })
      return // Don't render game when victory screen shown
    }

    this.renderDungeon(state)
    this.renderStats(state)
    this.renderMessages(state)
    this.commandBar.render(state)

    // Render debug console
    this.debugConsole.render(state)

    // Render debug overlays (on canvas if available)
    this.renderDebugOverlays(state)
  }

  /**
   * Get root container
   */
  getContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'game-container'
    container.appendChild(this.messagesContainer)
    container.appendChild(this.dungeonContainer)
    container.appendChild(this.commandBar.getContainer())
    container.appendChild(this.statsContainer)
    container.appendChild(this.debugConsole.getContainer())

    // Add debug canvas for overlays
    this.debugCanvas = this.createDebugCanvas()
    container.appendChild(this.debugCanvas)

    return container
  }

  // ============================================================================
  // PRIVATE: Rendering methods
  // ============================================================================

  private createDungeonView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'dungeon'
    container.className = 'dungeon-view'
    return container
  }

  private createStatsView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'stats'
    container.className = 'stats-view'
    return container
  }

  private createMessagesView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'messages'
    container.className = 'messages-view'
    return container
  }

  private renderDungeon(state: GameState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    let html = '<pre class="dungeon-grid">'

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const pos: Position = { x, y }
        const tile = level.tiles[y][x]
        const visState = this.renderingService.getVisibilityState(
          pos,
          state.visibleCells,
          level
        )

        // Check for entities at this position
        let char = tile.char
        let color = this.renderingService.getColorForTile(tile, visState)

        // Items and gold (only if visible, before monsters so monsters render on top)
        if (visState === 'visible') {
          // Gold piles
          const gold = level.gold.find((g) => g.position.x === x && g.position.y === y)
          if (gold) {
            char = '*'
            color = '#FFD700' // Gold
          }

          // Items
          const item = level.items.find((i) => i.position?.x === x && i.position?.y === y)
          if (item) {
            char = this.getItemSymbol(item.type)
            color = this.getItemColor(item.type)
          }

          // Monsters (only if visible, render on top of items)
          const monster = level.monsters.find((m) => m.position.x === x && m.position.y === y)
          if (monster) {
            char = monster.letter
            color = this.renderingService.getColorForEntity(monster, visState)
          }
        }

        // Player (always on top)
        if (pos.x === state.player.position.x && pos.y === state.player.position.y) {
          char = '@'
          color = '#00FFFF'
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    this.dungeonContainer.innerHTML = html
  }

  private renderStats(state: GameState): void {
    const { player } = state
    const lightSource = player.equipment.lightSource

    // HP color (green > yellow > red > blinking red)
    const hpPercent = (player.hp / player.maxHp) * 100
    const hpColor =
      hpPercent >= 75
        ? '#00FF00'
        : hpPercent >= 50
        ? '#FFDD00'
        : hpPercent >= 25
        ? '#FF8800'
        : '#FF0000'
    const hpBlink = hpPercent < 10 ? 'animation: blink 1s infinite;' : ''

    // Hunger bar (green > yellow > orange > red)
    const hungerPercent = Math.min(100, (player.hunger / 1300) * 100)
    const hungerColor =
      hungerPercent >= 75
        ? '#00FF00'
        : hungerPercent >= 50
        ? '#FFDD00'
        : hungerPercent >= 25
        ? '#FF8800'
        : '#FF0000'
    const hungerBar =
      '█'.repeat(Math.floor(hungerPercent / 10)) + '▒'.repeat(10 - Math.floor(hungerPercent / 10))

    // Inventory color
    const invCount = player.inventory.length
    const invColor =
      invCount < 20 ? '#00FF00' : invCount < 24 ? '#FFDD00' : invCount < 26 ? '#FF8800' : '#FF0000'

    // Light status
    let lightDisplay = 'None (darkness!)'
    let lightColor = '#FF0000'
    if (lightSource) {
      const fuel = lightSource.fuel || 0
      const maxFuel = lightSource.maxFuel || 1
      const fuelPercent = (fuel / maxFuel) * 100

      lightColor = fuelPercent >= 50 ? '#FFDD00' : fuelPercent >= 20 ? '#FF8800' : '#FF0000'

      const fuelText = lightSource.fuel !== undefined ? ` (${fuel})` : ''
      lightDisplay = `${lightSource.name}${fuelText}`
    }

    // Get XP progress for display
    const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
    const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`
    const xpPercentage = xpNeeded === Infinity ? 100 : Math.min(100, (player.xp / xpNeeded) * 100)

    this.statsContainer.innerHTML = `
      <style>
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      </style>
      <div class="stats">
        <div style="color: ${hpColor}; ${hpBlink}">HP: ${player.hp}/${player.maxHp}</div>
        <div>Str: ${player.strength}/${player.maxStrength}</div>
        <div>AC: ${player.ac}</div>
        <div>Level: ${player.level}</div>
        <div>XP: ${xpDisplay}</div>
        <div style="font-size: 0.8em; color: #666;">
          <span style="display: inline-block; width: 100px; height: 8px; background: #333; border: 1px solid #555;">
            <span style="display: block; width: ${xpPercentage}%; height: 100%; background: #0af;"></span>
          </span>
        </div>
        <div>Gold: ${player.gold}</div>
        <div style="margin-top: 8px;">
          <span style="color: #888;">Hunger:</span><br>
          <span style="color: ${hungerColor};">[${hungerBar}]</span>
        </div>
        <div>Depth: ${state.currentLevel}</div>
        <div>Turn: ${state.turnCount}</div>
        <div style="margin-top: 8px;">
          <span style="color: #888;">Light:</span><br>
          <span style="color: ${lightColor};">${lightDisplay}</span>
        </div>
        <div style="margin-top: 8px;">
          <span style="color: #888;">Inventory:</span>
          <span style="color: ${invColor};"> ${invCount}/26</span>
        </div>
      </div>
    `
  }

  private renderMessages(state: GameState): void {
    const recent = state.messages.slice(-8)
    this.messagesContainer.innerHTML = `
      <div class="messages">
        ${recent
          .map((msg) => {
            const importance = msg.importance || 3
            const weight = importance >= 4 ? 'font-weight: bold;' : ''
            const countText = msg.count && msg.count > 1 ? ` (x${msg.count})` : ''
            return `<div class="msg-${msg.type}" style="${weight}">${msg.text}${countText}</div>`
          })
          .join('')}
      </div>
    `
  }

  /**
   * Get display symbol for item type
   */
  private getItemSymbol(itemType: ItemType): string {
    switch (itemType) {
      case ItemType.POTION:
        return '!'
      case ItemType.SCROLL:
        return '?'
      case ItemType.RING:
        return '='
      case ItemType.WAND:
        return '/'
      case ItemType.FOOD:
        return '%'
      case ItemType.OIL_FLASK:
        return '!'
      case ItemType.WEAPON:
        return ')'
      case ItemType.ARMOR:
        return '['
      default:
        return '?'
    }
  }

  /**
   * Get display color for item type
   */
  private getItemColor(itemType: ItemType): string {
    switch (itemType) {
      case ItemType.POTION:
        return '#FF00FF' // Magenta
      case ItemType.SCROLL:
        return '#FFFFFF' // White
      case ItemType.RING:
        return '#FFD700' // Gold
      case ItemType.WAND:
        return '#00FFFF' // Cyan
      case ItemType.FOOD:
        return '#8B4513' // Brown
      case ItemType.OIL_FLASK:
        return '#FFA500' // Orange
      case ItemType.WEAPON:
        return '#C0C0C0' // Silver
      case ItemType.ARMOR:
        return '#C0C0C0' // Silver
      default:
        return '#FFFFFF'
    }
  }

  /**
   * Get message history modal
   */
  getMessageHistoryModal(): MessageHistoryModal {
    return this.messageHistoryModal
  }

  /**
   * Get help modal
   */
  getHelpModal(): HelpModal {
    return this.helpModal
  }

  /**
   * Create debug canvas overlay
   */
  private createDebugCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.id = 'debug-canvas'
    canvas.width = 80 * 16 // 80 cells × 16px cell size
    canvas.height = 22 * 16 // 22 cells × 16px cell size
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 10;
    `
    return canvas
  }

  /**
   * Render debug overlays on canvas
   */
  private renderDebugOverlays(state: GameState): void {
    if (!this.debugCanvas) return

    const ctx = this.debugCanvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height)

    const cellSize = 16

    // Render overlays in order (FOV → Path → AI for proper layering)
    this.debugOverlays.renderFOVOverlay(state, ctx, cellSize)
    this.debugOverlays.renderPathOverlay(state, ctx, cellSize)
    this.debugOverlays.renderAIOverlay(state, ctx, cellSize)
  }
}
