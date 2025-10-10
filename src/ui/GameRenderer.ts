import { GameState, StatusEffectType } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { DeathService } from '@services/DeathService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { ScoreCalculationService } from '@services/ScoreCalculationService'
import { PreferencesService } from '@services/PreferencesService'
import { RingService } from '@services/RingService'
import { CanvasGameRenderer } from './CanvasGameRenderer'
import { AsciiDungeonRenderer } from './AsciiDungeonRenderer'
import { DebugConsole } from './DebugConsole'
import { DebugOverlays } from './DebugOverlays'
import { ContextualCommandBar } from './ContextualCommandBar'
import { MessageHistoryModal } from './MessageHistoryModal'
import { HelpModal } from './HelpModal'
import { VictoryScreen } from './VictoryScreen'
import { DeathScreen } from './DeathScreen'

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
  private canvasGameRenderer: CanvasGameRenderer | null = null
  private asciiRenderer: AsciiDungeonRenderer
  private currentRenderMode: 'ascii' | 'sprites' = 'sprites'
  private currentGameState: GameState | null = null

  constructor(
    private renderingService: RenderingService,
    private assetLoaderService: AssetLoaderService,
    _hungerService: HungerService,
    private levelingService: LevelingService,
    debugService: DebugService,
    contextService: ContextService,
    private victoryService: VictoryService,
    private localStorageService: LocalStorageService,
    private deathService: DeathService,
    leaderboardService: LeaderboardService,
    leaderboardStorageService: LeaderboardStorageService,
    scoreCalculationService: ScoreCalculationService,
    private preferencesService: PreferencesService,
    private ringService: RingService,
    private onReturnToMenu: () => void,
    private onStartNewGame: (characterName: string) => void,
    private onReplaySeed: (seed: string, characterName: string) => void,
    _config = {
      dungeonWidth: 80,
      dungeonHeight: 22,
      showItemsInMemory: false,
      showGoldInMemory: false,
    }
  ) {
    // Config will be used in future phases for customizable rendering
    // Initialize ASCII renderer (always available)
    this.asciiRenderer = new AsciiDungeonRenderer(renderingService)

    // Load initial render mode from preferences
    const prefs = this.preferencesService.getPreferences()
    this.currentRenderMode = prefs.renderMode

    // Subscribe to preference changes
    this.preferencesService.subscribe(this.handlePreferenceChange.bind(this))

    // Create UI structure
    this.dungeonContainer = this.createDungeonView()
    this.statsContainer = this.createStatsView()
    this.messagesContainer = this.createMessagesView()
    this.debugConsole = new DebugConsole(debugService)
    this.debugOverlays = new DebugOverlays(debugService)
    this.commandBar = new ContextualCommandBar(contextService)
    this.messageHistoryModal = new MessageHistoryModal()
    this.helpModal = new HelpModal(contextService)
    this.victoryScreen = new VictoryScreen(leaderboardService, leaderboardStorageService)
    this.deathScreen = new DeathScreen(leaderboardService, leaderboardStorageService, scoreCalculationService)
  }

  /**
   * Render complete game state
   */
  render(state: GameState): void {
    // Store current game state for re-rendering after mode changes
    this.currentGameState = state

    // Check for death before rendering
    if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
      // Permadeath: Delete save immediately when player dies
      this.localStorageService.deleteSave(state.gameId)
      console.log('Save deleted (permadeath)')

      // Calculate comprehensive death statistics via DeathService
      const stats = this.deathService.calculateDeathStats(state)

      this.deathScreen.show(
        stats,
        state,
        (characterName: string) => {
          // New Game (random seed)
          this.onStartNewGame(characterName)
        },
        (seed: string, characterName: string) => {
          // Replay Seed (same dungeon)
          this.onReplaySeed(seed, characterName)
        },
        () => {
          // Quit to Menu
          this.onReturnToMenu()
        }
      )
      return // Don't render game when death screen shown
    }

    // Check for victory before rendering
    if (state.hasWon && !this.victoryScreen.isVisible()) {
      const stats = this.victoryService.getVictoryStats(state)
      this.victoryScreen.show(stats, state, (characterName: string) => {
        // New Game after victory
        this.onStartNewGame(characterName)
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
   * Handle preference changes (e.g., render mode toggle)
   */
  private handlePreferenceChange(prefs: { renderMode: 'ascii' | 'sprites' }): void {
    const oldMode = this.currentRenderMode
    const newMode = prefs.renderMode

    // Skip if mode hasn't changed
    if (oldMode === newMode) {
      return
    }

    // Update current render mode
    this.currentRenderMode = newMode

    // Log mode change
    console.log(`[GameRenderer] Render mode changed: ${oldMode} → ${newMode}`)

    // Show visual feedback overlay
    this.showModeChangeNotification(newMode)

    // Handle DOM swapping
    this.switchRenderMode(newMode)

    // Re-render with current game state if available
    if (this.currentGameState) {
      this.renderDungeon(this.currentGameState)
    }
  }

  /**
   * Show brief overlay notification when render mode changes
   */
  private showModeChangeNotification(mode: 'ascii' | 'sprites'): void {
    const overlay = document.createElement('div')
    overlay.className = 'mode-change-notification'
    overlay.textContent = mode === 'sprites' ? 'SPRITE MODE' : 'ASCII MODE'

    document.body.appendChild(overlay)

    // Fade out and remove after 1 second
    setTimeout(() => {
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 300)
    }, 700)
  }

  /**
   * Switch rendering mode by managing DOM elements
   */
  private switchRenderMode(mode: 'ascii' | 'sprites'): void {
    // Clear container
    this.dungeonContainer.innerHTML = ''

    // Add appropriate element for new mode
    if (mode === 'sprites' && this.canvasGameRenderer) {
      // Find or recreate canvas element
      const canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement
      if (canvas) {
        this.dungeonContainer.appendChild(canvas)
      }
    }
    // For ASCII mode, renderDungeon will handle innerHTML
  }

  /**
   * Check if death screen is visible
   */
  isDeathScreenVisible(): boolean {
    return this.deathScreen.isVisible()
  }

  /**
   * Check if victory screen is visible
   */
  isVictoryScreenVisible(): boolean {
    return this.victoryScreen.isVisible()
  }

  /**
   * Hide death screen (cleanup on game restart)
   */
  hideDeathScreen(): void {
    this.deathScreen.hide()
  }

  /**
   * Hide victory screen (cleanup on game restart)
   */
  hideVictoryScreen(): void {
    this.victoryScreen.hide()
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

    // Create canvas for sprite-based rendering
    const canvas = document.createElement('canvas')
    canvas.id = 'dungeon-canvas'
    canvas.width = 2560  // 80 tiles × 32px
    canvas.height = 704  // 22 tiles × 32px
    canvas.className = 'dungeon-canvas'

    // Initialize CanvasGameRenderer if tileset is loaded
    if (this.assetLoaderService.isLoaded()) {
      this.canvasGameRenderer = new CanvasGameRenderer(
        this.renderingService,
        this.assetLoaderService,
        canvas,
        {
          tileWidth: 32,
          tileHeight: 32,
          gridWidth: 80,
          gridHeight: 22,
          enableSmoothing: false,
          enableDirtyRectangles: true,
          exploredOpacity: 0.5,
          detectedOpacity: 0.6,
        }
      )
      console.log('[GameRenderer] CanvasGameRenderer initialized')
    } else {
      console.warn('[GameRenderer] Tileset not loaded, will fall back to ASCII rendering')
    }

    // Add the appropriate element based on initial render mode
    if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
      container.appendChild(canvas)
    }
    // ASCII rendering will use innerHTML, no element needed initially

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
    // Render based on current mode preference
    if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
      // Use sprite rendering
      this.canvasGameRenderer.render(state)
    } else {
      // Use ASCII rendering (either by preference or fallback if sprites unavailable)
      const html = this.asciiRenderer.render(state)
      this.dungeonContainer.innerHTML = html
    }
  }

  private renderStats(state: GameState): void {
    const { player } = state

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
    const hpWarning = hpPercent < 25 ? ' ⚠️' : ''

    // Get XP progress for display
    const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
    const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`
    const xpPercentage = xpNeeded === Infinity ? 100 : Math.min(100, (player.xp / xpNeeded) * 100)

    // Ring bonuses
    const strBonus = this.ringService.getStrengthBonus(player)
    const acBonus = this.ringService.getACBonus(player)
    const strDisplay = strBonus !== 0 ? `${player.strength}(${strBonus > 0 ? '+' : ''}${strBonus})/${player.maxStrength}` : `${player.strength}/${player.maxStrength}`
    const acDisplay = acBonus !== 0 ? `${player.ac}(${acBonus > 0 ? '+' : ''}${acBonus})` : `${player.ac}`

    // Inventory color
    const invCount = player.inventory.length
    const invColor =
      invCount < 20 ? '#00FF00' : invCount < 24 ? '#FFDD00' : invCount < 26 ? '#FF8800' : '#FF0000'

    // Hunger bar
    const hungerPercent = Math.min(100, (player.hunger / 1300) * 100)
    const hungerBarClass = hungerPercent >= 50 ? 'hunger' : hungerPercent >= 25 ? 'hunger warning' : 'hunger critical'
    const hungerLabel = hungerPercent === 0 ? 'STARVING!' : hungerPercent < 10 ? 'Fainting' : hungerPercent < 25 ? 'Hungry' : 'Fed'
    const hungerWarning = hungerPercent < 25 ? ' 🍖' : ''

    // Light bar
    const lightSource = player.equipment.lightSource
    let lightPercent = 0
    let lightLabel = 'None!'
    let lightWarning = ''
    if (lightSource) {
      if ('fuel' in lightSource && 'maxFuel' in lightSource) {
        const fuel = lightSource.fuel
        const maxFuel = lightSource.maxFuel
        lightPercent = (fuel / maxFuel) * 100
        lightLabel = `${fuel}`
        lightWarning = lightPercent < 10 && fuel > 0 ? ' 🔥' : lightPercent === 0 ? ' OUT!' : ''
      } else {
        // Artifact - permanent
        lightPercent = 100
        lightLabel = '∞'
      }
    }
    const lightBarClass = lightPercent >= 50 ? 'light' : lightPercent >= 20 ? 'light warning' : 'light critical'

    this.statsContainer.innerHTML = `
      <style>
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      </style>
      <!-- Single Row: 4 Panels Side-by-Side -->
      <div class="stats-row">
        <div class="stats-panel">
          <div class="stats-panel-header">Combat</div>
          <div class="stats-panel-content">
            <div style="color: ${hpColor}; ${hpBlink}">HP: ${player.hp}/${player.maxHp}${hpWarning}</div>
            <div>Str: ${strDisplay}</div>
            <div>AC: ${acDisplay}</div>
            <div>Lvl: ${player.level}</div>
            <div>XP: ${xpDisplay}</div>
          </div>
        </div>
        <div class="stats-panel">
          <div class="stats-panel-header">Resources</div>
          <div class="stats-panel-content">
            <div>Gold: ${player.gold}</div>
            <div>Hunger: ${hungerLabel}${hungerWarning}</div>
            <div>Depth: ${state.currentLevel}</div>
            <div>Turn: ${state.turnCount}</div>
            <div>Torch: ${lightLabel}${lightWarning}</div>
          </div>
        </div>
        ${this.renderEquipmentSlots(state)}
        ${this.renderStatusEffects(state)}
      </div>
    `
  }

  private renderMessages(state: GameState): void {
    const recent = state.messages.slice(-30) // Vertical layout supports more messages
    this.messagesContainer.innerHTML = `
      <div class="messages">
        ${recent
          .map((msg) => {
            const importance = msg.importance || 3
            const weight = importance >= 4 ? 'font-weight: bold;' : ''
            const countText = msg.count && msg.count > 1 ? ` (x${msg.count})` : ''
            return `<div class="msg-${msg.type}" style="${weight}">› ${msg.text}${countText}</div>`
          })
          .join('')}
      </div>
    `

    // Auto-scroll to bottom to show latest messages
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  /**
   * Get status effect display information
   */
  private getStatusEffectDisplay(effectType: StatusEffectType): { icon: string; label: string; color: string } {
    switch (effectType) {
      case StatusEffectType.CONFUSED:
        return { icon: '?', label: 'Confused', color: '#FF00FF' }
      case StatusEffectType.BLIND:
        return { icon: '☀', label: 'Blind', color: '#888888' }
      case StatusEffectType.HASTED:
        return { icon: '⚡', label: 'Fast', color: '#00FFFF' }
      case StatusEffectType.SLOWED:
        return { icon: '🐢', label: 'Slow', color: '#FF8800' }
      case StatusEffectType.PARALYZED:
        return { icon: '❄', label: 'Paralyzed', color: '#00FFFF' }
      case StatusEffectType.LEVITATING:
        return { icon: '☁', label: 'Levitating', color: '#FFDD00' }
      case StatusEffectType.SEE_INVISIBLE:
        return { icon: '👁', label: 'See Invis', color: '#00FF00' }
      default:
        return { icon: '•', label: 'Unknown', color: '#FFFFFF' }
    }
  }

  /**
   * Render equipment slots display
   */
  private renderEquipmentSlots(state: GameState): string {
    const { equipment } = state.player

    // Weapon slot
    const weaponSlot = equipment.weapon
      ? `Weapon: ${equipment.weapon.name}${equipment.weapon.bonus !== 0 ? ` ${equipment.weapon.bonus > 0 ? '+' : ''}${equipment.weapon.bonus}` : ''}`
      : 'Weapon: (empty)'
    const weaponClass = equipment.weapon?.cursed ? 'equipment-slot cursed' : equipment.weapon ? 'equipment-slot' : 'equipment-slot empty'
    const weaponCursed = equipment.weapon?.cursed ? ' 🔒' : ''

    // Armor slot
    const armorSlot = equipment.armor
      ? `Armor: ${equipment.armor.name}${equipment.armor.bonus !== 0 ? ` ${equipment.armor.bonus > 0 ? '+' : ''}${equipment.armor.bonus}` : ''}`
      : 'Armor: (empty)'
    const armorClass = equipment.armor?.cursed ? 'equipment-slot cursed' : equipment.armor ? 'equipment-slot' : 'equipment-slot empty'
    const armorCursed = equipment.armor?.cursed ? ' 🔒' : ''

    // Left ring slot
    const leftRingSlot = equipment.leftRing
      ? `Left Hand: ${equipment.leftRing.name}${equipment.leftRing.bonus !== 0 ? ` ${equipment.leftRing.bonus > 0 ? '+' : ''}${equipment.leftRing.bonus}` : ''}`
      : 'Left Hand: (empty)'
    const leftRingClass = equipment.leftRing?.cursed ? 'equipment-slot cursed' : equipment.leftRing ? 'equipment-slot' : 'equipment-slot empty'
    const leftRingCursed = equipment.leftRing?.cursed ? ' 🔒' : ''

    // Right ring slot
    const rightRingSlot = equipment.rightRing
      ? `Right Hand: ${equipment.rightRing.name}${equipment.rightRing.bonus !== 0 ? ` ${equipment.rightRing.bonus > 0 ? '+' : ''}${equipment.rightRing.bonus}` : ''}`
      : 'Right Hand: (empty)'
    const rightRingClass = equipment.rightRing?.cursed ? 'equipment-slot cursed' : equipment.rightRing ? 'equipment-slot' : 'equipment-slot empty'
    const rightRingCursed = equipment.rightRing?.cursed ? ' 🔒' : ''

    return `
      <div class="stats-panel equipment-section">
        <div class="stats-panel-header equipment-header">Equipment</div>
        <div class="stats-panel-content">
          <div class="${weaponClass}">${weaponSlot}${weaponCursed}</div>
          <div class="${armorClass}">${armorSlot}${armorCursed}</div>
          <div class="${leftRingClass}">${leftRingSlot}${leftRingCursed}</div>
          <div class="${rightRingClass}">${rightRingSlot}${rightRingCursed}</div>
        </div>
      </div>
    `
  }

  /**
   * Render status effects section
   */
  private renderStatusEffects(state: GameState): string {
    const { statusEffects } = state.player

    if (statusEffects.length === 0) {
      return `
        <div class="stats-panel status-section">
          <div class="stats-panel-header status-header">Status</div>
          <div class="stats-panel-content">
            <div class="status-empty">None</div>
          </div>
        </div>
      `
    }

    const effectsHTML = statusEffects
      .map((effect) => {
        const display = this.getStatusEffectDisplay(effect.type)
        return `<div class="status-effect-item" style="color: ${display.color};">
          ${display.icon} ${display.label} (${effect.duration})
        </div>`
      })
      .join('')

    return `
      <div class="stats-panel status-section">
        <div class="stats-panel-header status-header">Status</div>
        <div class="stats-panel-content">
          ${effectsHTML}
        </div>
      </div>
    `
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
