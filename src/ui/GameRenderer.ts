import { GameState, Position, StatusEffectType } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { VictoryService } from '@services/VictoryService'
import { GameStorageService } from '@services/GameStorageService'
import { DeathService } from '@services/DeathService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { ScoreCalculationService } from '@services/ScoreCalculationService'
import { PreferencesService } from '@services/PreferencesService'
import { RingService } from '@services/RingService'
import { CanvasGameRenderer } from './CanvasGameRenderer'
import { AsciiDungeonRenderer } from './AsciiDungeonRenderer'
import { type ITargetingState } from '@states/TargetSelectionState'
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
  // Canvas rendering constants
  private static readonly TILE_SIZE = 32  // Sprite tile size (always 32×32)

  // Notification display durations (in milliseconds)
  private static readonly NOTIFICATION_DISPLAY_DURATION = 700 // Time before fade starts
  private static readonly NOTIFICATION_FADE_DURATION = 300 // Time to complete fade-out

  // CSS class name for mode change notification overlay
  private static readonly MODE_CHANGE_NOTIFICATION_CLASS = 'mode-change-notification'

  // Display thresholds for color-coded warnings (inline in renderStats)
  // private static readonly HP_THRESHOLDS = {
  //   HEALTHY: 75,
  //   WOUNDED: 50,
  //   CRITICAL: 25,
  //   BLINKING: 10,
  // }
  // private static readonly HUNGER_MAX = 1300

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
  private dungeonCanvas: HTMLCanvasElement | null = null
  private asciiRenderer: AsciiDungeonRenderer
  private currentRenderMode: 'ascii' | 'sprites' = 'sprites'
  private currentGameState: GameState | null = null
  private canvasNeedsResize = true // Flag to resize canvas on first render (after DOM is constructed)
  private resizeHandler: (() => void) | null = null // Window resize event handler
  private resizeDebounceTimer: number | null = null // Debounce timer for resize events

  constructor(
    private renderingService: RenderingService,
    private assetLoaderService: AssetLoaderService,
    _hungerService: HungerService,
    private levelingService: LevelingService,
    private debugService: DebugService,
    contextService: ContextService,
    private victoryService: VictoryService,
    private gameStorageService: GameStorageService,
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
    // FUTURE: _config parameter will be used for customizable rendering options
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
    this.debugConsole = new DebugConsole(this.debugService)
    this.debugOverlays = new DebugOverlays(this.debugService)
    this.commandBar = new ContextualCommandBar(contextService)
    this.messageHistoryModal = new MessageHistoryModal()
    this.helpModal = new HelpModal(contextService)
    this.victoryScreen = new VictoryScreen(leaderboardService, leaderboardStorageService)
    this.deathScreen = new DeathScreen(leaderboardService, leaderboardStorageService, scoreCalculationService)

    // Setup window resize handler
    this.setupResizeHandler()
  }

  private targetingState: ITargetingState | null = null // Store active targeting state

  /**
   * Render complete game state
   */
  render(state: GameState): void {
    // Store current game state for re-rendering after mode changes
    this.currentGameState = state

    // Check for death before rendering
    if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
      // Permadeath: Delete save immediately when player dies
      this.gameStorageService.deleteSave(state.gameId)
      if (this.debugService.isEnabled()) {
        console.log('[GameRenderer] Save deleted (permadeath)')
      }

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

    this.renderDungeon(state, this.targetingState)
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

    // Log mode change (debug only)
    if (this.debugService.isEnabled()) {
      console.log(`[GameRenderer] Render mode changed: ${oldMode} → ${newMode}`)
    }

    // Show visual feedback overlay
    this.showModeChangeNotification(newMode)

    // Handle DOM swapping
    this.switchRenderMode(newMode)

    // Re-render with current game state if available
    // Both modes now use viewport systems with automatic camera centering
    if (this.currentGameState) {
      this.renderDungeon(this.currentGameState)
    }
  }

  /**
   * Show brief overlay notification when render mode changes
   */
  private showModeChangeNotification(mode: 'ascii' | 'sprites'): void {
    const overlay = document.createElement('div')
    overlay.className = GameRenderer.MODE_CHANGE_NOTIFICATION_CLASS
    overlay.textContent = mode === 'sprites' ? 'SPRITE MODE' : 'ASCII MODE'

    document.body.appendChild(overlay)

    // Fade out and remove after display duration
    setTimeout(() => {
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), GameRenderer.NOTIFICATION_FADE_DURATION)
    }, GameRenderer.NOTIFICATION_DISPLAY_DURATION)
  }

  /**
   * Switch rendering mode by managing DOM elements
   */
  private switchRenderMode(mode: 'ascii' | 'sprites'): void {
    // Clear container
    this.dungeonContainer.innerHTML = ''

    // Add appropriate element for new mode
    if (mode === 'sprites' && this.canvasGameRenderer && this.dungeonCanvas) {
      // Sprite mode: enable flex centering, disable scrolling
      this.dungeonContainer.style.overflow = 'hidden'
      this.dungeonContainer.style.display = 'flex'
      this.dungeonContainer.style.alignItems = 'center'
      this.dungeonContainer.style.justifyContent = 'center'

      // Reattach canvas element (it was removed when innerHTML was cleared)
      this.dungeonContainer.appendChild(this.dungeonCanvas)

      // Trigger resize to recalculate dimensions for new mode
      this.canvasGameRenderer.resize()
    } else if (mode === 'ascii') {
      // ASCII mode: viewport-based rendering (no scrolling needed)
      this.dungeonContainer.style.overflow = 'hidden'
      this.dungeonContainer.style.display = 'block'
      this.dungeonContainer.style.alignItems = ''
      this.dungeonContainer.style.justifyContent = ''

      // Note: ASCII renderer handles camera automatically via viewport system
    }
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
   * Setup window resize handler with debouncing
   * Handles sprite mode canvas resize (ASCII mode uses viewport system, no resize needed)
   */
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      // Debounce resize events (avoid excessive redraws during drag)
      if (this.resizeDebounceTimer !== null) {
        window.clearTimeout(this.resizeDebounceTimer)
      }

      this.resizeDebounceTimer = window.setTimeout(() => {
        // Handle sprite mode resize only (ASCII mode viewport is fixed)
        if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
          if (this.debugService.isEnabled()) {
            console.log('[GameRenderer] Window resized (sprite mode), recalculating canvas dimensions')
          }

          // Recalculate canvas dimensions based on new container size
          this.canvasGameRenderer.resize()

          // Re-render with current game state to update viewport
          if (this.currentGameState) {
            this.renderDungeon(this.currentGameState)
          }
        }
      }, 250) // 250ms debounce delay
    }

    window.addEventListener('resize', this.resizeHandler)
  }

  /**
   * Cleanup resize handler to prevent memory leaks
   * Called when returning to menu
   */
  public cleanupResizeHandler(): void {
    // Clean up event listener with error handling
    if (this.resizeHandler) {
      try {
        window.removeEventListener('resize', this.resizeHandler)
      } catch (error) {
        if (this.debugService.isEnabled()) {
          console.warn('[GameRenderer] Error removing resize event listener:', error)
        }
      } finally {
        this.resizeHandler = null
      }
    }

    // Clean up debounce timer with error handling
    if (this.resizeDebounceTimer !== null) {
      try {
        window.clearTimeout(this.resizeDebounceTimer)
      } catch (error) {
        if (this.debugService.isEnabled()) {
          console.warn('[GameRenderer] Error clearing resize debounce timer:', error)
        }
      } finally {
        this.resizeDebounceTimer = null
      }
    }
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
    canvas.className = 'dungeon-canvas'
    // Don't set width/height here - let CanvasGameRenderer calculate responsive dimensions

    // Store canvas reference for mode switching
    this.dungeonCanvas = canvas

    // IMPORTANT: Append canvas to container BEFORE creating CanvasGameRenderer
    // so it can access parentElement to calculate responsive dimensions
    if (this.currentRenderMode === 'sprites' && this.assetLoaderService.isLoaded()) {
      container.appendChild(canvas)
    }

    // Initialize CanvasGameRenderer if tileset is loaded
    // Let it calculate responsive viewport based on container size
    if (this.assetLoaderService.isLoaded()) {
      this.canvasGameRenderer = new CanvasGameRenderer(
        this.renderingService,
        this.assetLoaderService,
        canvas,
        {
          tileWidth: GameRenderer.TILE_SIZE,
          tileHeight: GameRenderer.TILE_SIZE,
          // Don't specify gridWidth/gridHeight - let it auto-calculate from container size
          enableSmoothing: false,
          enableDirtyRectangles: true,
          exploredOpacity: 0.5,
          detectedOpacity: 0.6,
        }
      )
      if (this.debugService.isEnabled()) {
        console.log('[GameRenderer] CanvasGameRenderer initialized')
      }
    } else {
      if (this.debugService.isEnabled()) {
        console.warn('[GameRenderer] Tileset not loaded, will fall back to ASCII rendering')
      }
    }

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

  private renderDungeon(state: GameState, targetingState: ITargetingState | null = null): void {
    // Sprite rendering mode
    if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
      // Resize canvas on first render (after DOM is constructed and container has dimensions)
      if (this.canvasNeedsResize) {
        this.canvasGameRenderer.resize()
        this.canvasNeedsResize = false
      }

      // Use sprite rendering
      this.canvasGameRenderer.render(state)

      // Graceful degradation: Targeting not yet supported in sprite mode
      if (targetingState) {
        if (this.debugService.isEnabled()) {
          console.warn('[GameRenderer] Targeting overlay not yet supported in sprite mode')
        }
      }
      return
    }

    // ASCII rendering mode (viewport-based with camera system)
    const level = state.levels.get(state.currentLevel)
    if (targetingState && level) {
      // Targeting mode: use AsciiDungeonRenderer.renderWithTargeting()
      const cursorPos = targetingState.getCursorPosition()
      const range = targetingState.getRange()
      const html = this.asciiRenderer.renderWithTargeting(state, cursorPos, range, level)
      this.dungeonContainer.innerHTML = html
    } else {
      // Standard rendering via AsciiDungeonRenderer.render()
      const html = this.asciiRenderer.render(state)
      this.dungeonContainer.innerHTML = html
    }
  }

  private renderStats(state: GameState): void {
    const { player } = state

    // HP calculation with color classes
    const hpPercent = (player.hp / player.maxHp) * 100
    const hpClass =
      hpPercent >= 75 ? 'hp' :
      hpPercent >= 50 ? 'hp wounded' :
      hpPercent >= 25 ? 'hp critical' :
      'hp danger'
    const hpBlink = hpPercent < 10 ? ' hp-critical-blink' : ''

    // XP calculation
    const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
    const xpPercent = xpNeeded === Infinity ? 100 : (player.xp / xpNeeded) * 100
    const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`

    // Hunger calculation
    const hungerPercent = Math.min(100, (player.hunger / 1300) * 100)
    const hungerClass =
      hungerPercent < 10 ? 'hunger critical' :
      hungerPercent < 25 ? 'hunger warning' :
      'hunger'
    const hungerLabel =
      hungerPercent === 0 ? 'STARVING!' :
      hungerPercent < 10 ? 'Fainting' :
      hungerPercent < 25 ? 'Hungry' :
      'Fed'

    // Light calculation
    let lightPercent = 0
    let lightClass = 'light'
    let lightLabel = 'None!'
    const lightSource = player.equipment.lightSource

    if (lightSource) {
      if ('fuel' in lightSource && 'maxFuel' in lightSource) {
        const fuel = lightSource.fuel
        const maxFuel = lightSource.maxFuel
        lightPercent = (fuel / maxFuel) * 100
        lightClass =
          lightPercent < 10 && fuel > 0 ? 'light critical' :
          lightPercent < 25 ? 'light warning' :
          'light'
        lightLabel = `${fuel}`
      } else {
        // Artifact - permanent
        lightPercent = 100
        lightLabel = '∞'
      }
    }

    // Ring bonuses
    const strBonus = this.ringService.getStrengthBonus(player)
    const acBonus = this.ringService.getACBonus(player)

    // Format strength with exceptional strength support
    const formatStrength = (str: number, percentile: number | undefined): string => {
      if (str === 18 && percentile !== undefined) {
        return `18/${percentile.toString().padStart(2, '0')}`
      }
      return str.toString()
    }

    const currentStr = formatStrength(player.strength, player.strengthPercentile)
    const maxStr = formatStrength(player.maxStrength, player.strengthPercentile)
    const strDisplay = strBonus !== 0
      ? `${currentStr}(${strBonus > 0 ? '+' : ''}${strBonus})/${maxStr}`
      : `${currentStr}/${maxStr}`

    const acDisplay = acBonus !== 0
      ? `${player.ac}(${acBonus > 0 ? '+' : ''}${acBonus})`
      : `${player.ac}`

    this.statsContainer.innerHTML = `
      <!-- Player Stats Section -->
      <div class="stats-panel stats-panel-wide">
        <div class="stats-panel-header">Player Stats</div>
        <div class="stats-panel-content-vertical">
          <!-- HP Bar -->
          <div class="stat-line${hpBlink}">
            <span class="stat-label">HP:</span>
            <span class="stat-value">${player.hp}/${player.maxHp}</span>
            <div class="segmented-bar hp-bar">
              <div class="bar-fill ${hpClass}" style="width: ${hpPercent}%"></div>
            </div>
          </div>

          <!-- XP Bar -->
          <div class="stat-line">
            <span class="stat-label">XP:</span>
            <span class="stat-value">${xpDisplay}</span>
            <div class="segmented-bar xp-bar">
              <div class="bar-fill xp" style="width: ${xpPercent}%"></div>
            </div>
          </div>

          <!-- Hunger Bar -->
          <div class="stat-line">
            <span class="stat-label">Hunger:</span>
            <span class="stat-value">${hungerLabel}</span>
            <div class="segmented-bar hunger-bar">
              <div class="bar-fill ${hungerClass}" style="width: ${hungerPercent}%"></div>
            </div>
          </div>

          <!-- Light Bar -->
          <div class="stat-line">
            <span class="stat-label">Light:</span>
            <span class="stat-value">${lightLabel}</span>
            <div class="segmented-bar light-bar">
              <div class="bar-fill ${lightClass}" style="width: ${lightPercent}%"></div>
            </div>
          </div>

          <!-- Compact Secondary Stats -->
          <div class="stat-compact">
            <span>Str: ${strDisplay}</span>
            <span>AC: ${acDisplay}</span>
            <span>Lvl: ${player.level}</span>
            <span>Gold: ${player.gold}</span>
            <span>Depth: ${state.currentLevel}</span>
            <span>Turn: ${state.turnCount}</span>
          </div>
        </div>
      </div>

      ${this.renderEquipmentAndStatus(state)}
  `
  }

  /**
   * Render equipment and status effects panel (vertical stack)
   */
  private renderEquipmentAndStatus(state: GameState): string {
    const { equipment, statusEffects } = state.player

    // Equipment slots with cursed indicators
    const weaponSlot = equipment.weapon
      ? `${equipment.weapon.name}${equipment.weapon.bonus !== 0 ? ` ${equipment.weapon.bonus > 0 ? '+' : ''}${equipment.weapon.bonus}` : ''}`
      : '(empty)'
    const weaponClass = equipment.weapon?.cursed ? 'equip-cursed' : 'equip-value'
    const weaponCursed = equipment.weapon?.cursed ? ' 🔒' : ''

    const armorSlot = equipment.armor
      ? `${equipment.armor.name}${equipment.armor.bonus !== 0 ? ` ${equipment.armor.bonus > 0 ? '+' : ''}${equipment.armor.bonus}` : ''}`
      : '(empty)'
    const armorClass = equipment.armor?.cursed ? 'equip-cursed' : 'equip-value'
    const armorCursed = equipment.armor?.cursed ? ' 🔒' : ''

    const leftRingSlot = equipment.leftRing
      ? `${equipment.leftRing.name}${equipment.leftRing.bonus !== 0 ? ` ${equipment.leftRing.bonus > 0 ? '+' : ''}${equipment.leftRing.bonus}` : ''}`
      : '(empty)'
    const leftRingClass = equipment.leftRing?.cursed ? 'equip-cursed' : 'equip-value'
    const leftRingCursed = equipment.leftRing?.cursed ? ' 🔒' : ''

    const rightRingSlot = equipment.rightRing
      ? `${equipment.rightRing.name}${equipment.rightRing.bonus !== 0 ? ` ${equipment.rightRing.bonus > 0 ? '+' : ''}${equipment.rightRing.bonus}` : ''}`
      : '(empty)'
    const rightRingClass = equipment.rightRing?.cursed ? 'equip-cursed' : 'equip-value'
    const rightRingCursed = equipment.rightRing?.cursed ? ' 🔒' : ''

    // Status effects with colored badges
    const statusHTML = statusEffects.length > 0
      ? statusEffects.map(effect => {
          const display = this.getStatusEffectDisplay(effect.type)
          return `<div class="status-badge" style="color: ${display.color};">
          ${display.icon} ${display.label} (${effect.duration})
        </div>`
        }).join('')
      : '<span class="status-empty" style="color: #666; font-style: italic;">No effects</span>'

    return `
    <div class="stats-panel stats-panel-wide">
      <div class="stats-panel-header">Equipment & Status</div>
      <div class="stats-panel-content-vertical">
        <div class="equipment-list">
          <div class="equipment-item">
            <span class="equip-label">Weapon:</span>
            <span class="${weaponClass}">${weaponSlot}${weaponCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Armor:</span>
            <span class="${armorClass}">${armorSlot}${armorCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Left Hand:</span>
            <span class="${leftRingClass}">${leftRingSlot}${leftRingCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Right Hand:</span>
            <span class="${rightRingClass}">${rightRingSlot}${rightRingCursed}</span>
          </div>
        </div>

        <div class="status-effects">
          ${statusHTML}
        </div>
      </div>
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
    // Size will be set when renderer is available
    canvas.width = 800
    canvas.height = 600
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 10;
      display: none; // Hide until properly sized
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

  /**
   * Render targeting overlay (cursor, line, info panel)
   * Called when TargetSelectionState is active
   *
   * @param targetingState - The active targeting state
   */
  renderTargetingOverlay(targetingState: ITargetingState): void {
    // Store targeting state so it can be used in next render() call
    this.targetingState = targetingState

    // Render info panel showing target details
    const cursor = targetingState.getCursorPosition()
    const range = targetingState.getRange()
    const state = targetingState.getGameState()
    this.renderTargetingInfo(state, cursor, range)
  }

  /**
   * Render targeting info panel (DOM overlay with target details)
   */
  private renderTargetingInfo(state: GameState, cursor: Position, range: number): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Check if cursor is on a monster
    const monster = level.monsters.find(m => m.position.x === cursor.x && m.position.y === cursor.y)

    // Calculate distance
    const distance = Math.abs(cursor.x - state.player.position.x) +
                    Math.abs(cursor.y - state.player.position.y)

    // Check validity (position-based targeting)
    // Valid if: in FOV + within range + walkable tile (monster not required)
    const key = `${cursor.x},${cursor.y}`
    const inFOV = state.visibleCells.has(key)
    const tile = level.tiles[cursor.y][cursor.x]
    const isValid = distance <= range && inFOV && tile.walkable

    // Create or update info panel
    let infoPanel = document.getElementById('targeting-info-panel')
    if (!infoPanel) {
      infoPanel = document.createElement('div')
      infoPanel.id = 'targeting-info-panel'
      infoPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid ${isValid ? '#00ff00' : '#ff0000'};
        color: white;
        padding: 12px;
        font-family: monospace;
        font-size: 14px;
        z-index: 1000;
        min-width: 250px;
        border-radius: 4px;
      `
      document.body.appendChild(infoPanel)
    }

    infoPanel.style.borderColor = isValid ? '#00ff00' : '#ff0000'

    // Update content
    let content = `<div style="margin-bottom: 8px;"><strong>Targeting Mode</strong></div>`

    if (monster) {
      content += `
        <div style="color: ${isValid ? '#00ff00' : '#ff6666'};">
          ${monster.name} (${monster.letter})
        </div>
        <div style="font-size: 12px; color: #aaa; margin-top: 4px;">
          HP: ${monster.hp}/${monster.maxHp}<br>
          Distance: ${distance} tiles<br>
          Range: ${range} tiles
        </div>
      `
      if (!isValid) {
        if (distance > range) {
          content += `<div style="color: #ff6666; margin-top: 6px;">⚠ Out of range!</div>`
        } else if (!inFOV) {
          content += `<div style="color: #ff6666; margin-top: 6px;">⚠ Not visible!</div>`
        }
      }
    } else {
      content += `
        <div style="color: #888;">No target</div>
        <div style="font-size: 12px; color: #aaa; margin-top: 4px;">
          Distance: ${distance} tiles<br>
          Range: ${range} tiles
        </div>
      `
    }

    content += `
      <div style="border-top: 1px solid #444; margin-top: 10px; padding-top: 8px; font-size: 11px; color: #888;">
        <div>hjkl/arrows: Move cursor</div>
        <div>Tab: Cycle monsters</div>
        <div>Enter: Confirm</div>
        <div>ESC: Cancel</div>
      </div>
    `

    infoPanel.innerHTML = content
  }

  /**
   * Hide targeting info panel
   */
  hideTargetingInfo(): void {
    const infoPanel = document.getElementById('targeting-info-panel')
    if (infoPanel) {
      infoPanel.remove()
    }

    // Clear targeting state
    this.targetingState = null
  }

}
