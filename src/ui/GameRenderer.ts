import { GameState, Position, ItemType, StatusEffectType, Level } from '@game/core/core'
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

  // Display thresholds for color-coded warnings
  private static readonly HP_THRESHOLDS = {
    HEALTHY: 75,
    WOUNDED: 50,
    CRITICAL: 25,
    BLINKING: 10,
  }

  private static readonly HUNGER_MAX = 1300

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
    config = {
      dungeonWidth: 80,
      dungeonHeight: 22,
      showItemsInMemory: false,
      showGoldInMemory: false,
    }
  ) {
    // FUTURE: Config parameter will be used for customizable rendering options
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
      this.localStorageService.deleteSave(state.gameId)
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
      // Reattach canvas element (it was removed when innerHTML was cleared)
      this.dungeonContainer.appendChild(this.dungeonCanvas)
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
   * Setup window resize handler with debouncing
   * Only resizes canvas in sprite mode (ASCII mode uses natural HTML reflow)
   */
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      // Debounce resize events (avoid excessive redraws during drag)
      if (this.resizeDebounceTimer !== null) {
        window.clearTimeout(this.resizeDebounceTimer)
      }

      this.resizeDebounceTimer = window.setTimeout(() => {
        // Only resize if in sprite mode with canvas renderer
        if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
          if (this.debugService.isEnabled()) {
            console.log('[GameRenderer] Window resized, recalculating canvas dimensions')
          }

          // Recalculate canvas dimensions based on new container size
          this.canvasGameRenderer.resize()

          // Re-render with current game state to update viewport
          if (this.currentGameState) {
            this.renderDungeon(this.currentGameState)
          }
        }
        // ASCII mode doesn't need resize - HTML naturally reflows
      }, 250) // 250ms debounce delay
    }

    window.addEventListener('resize', this.resizeHandler)
  }

  /**
   * Cleanup resize handler to prevent memory leaks
   * Called when returning to menu
   */
  public cleanupResizeHandler(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer)
      this.resizeDebounceTimer = null
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

    // ASCII rendering mode
    if (targetingState) {
      // Targeting requires custom overlay rendering
      this.renderDungeonWithTargeting(state, targetingState)
    } else {
      // Standard rendering via AsciiDungeonRenderer
      const html = this.asciiRenderer.render(state)
      this.dungeonContainer.innerHTML = html
    }
  }

  /**
   * Render dungeon with targeting overlay (ASCII mode only)
   * Separate method for rendering targeting line and cursor
   */
  private renderDungeonWithTargeting(state: GameState, targetingState: ITargetingState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Check for SEE_INVISIBLE status effect
    const canSeeInvisible = state.player.statusEffects.some((e) => e.type === StatusEffectType.SEE_INVISIBLE)

    // Get targeting data
    const cursorPos = targetingState.getCursorPosition()
    const targetingLine = this.calculateTargetingLine(state.player.position, cursorPos, level)

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

        // Items and gold (visible or detected in explored areas)
        if (visState === 'visible' || visState === 'explored') {
          // Gold piles (only if visible)
          if (visState === 'visible') {
            const gold = level.gold.find((g) => g.position.x === x && g.position.y === y)
            if (gold) {
              char = '$'
              color = '#FFD700' // Gold
            }
          }

          // Items (visible or detected)
          const item = level.items.find((i) => i.position?.x === x && i.position?.y === y)
          if (item) {
            const isDetected = state.detectedMagicItems.has(item.id)
            const isVisible = visState === 'visible'

            // Render if visible OR if detected and in explored area
            if (isVisible || isDetected) {
              char = this.getItemSymbol(item.type)
              color = isVisible ? this.getItemColor(item.type) : this.dimColor(this.getItemColor(item.type))
            }
          }

          // Monsters (visible or detected in explored areas, render on top of items)
          const monster = level.monsters.find((m) => m.position.x === x && m.position.y === y)
          if (monster) {
            const isDetected = state.detectedMonsters.has(monster.id)
            const isVisible = visState === 'visible'
            const canRenderInvisible = !monster.isInvisible || canSeeInvisible

            // Render if (visible OR detected) AND (not invisible OR has SEE_INVISIBLE)
            if ((isVisible || isDetected) && canRenderInvisible) {
              char = monster.letter
              color = isVisible
                ? this.renderingService.getColorForEntity(monster, visState)
                : this.dimColor(this.renderingService.getColorForEntity(monster, 'visible'))
            }
          }
        }

        // Stairs (visible or explored, render before player)
        const config = { showItemsInMemory: false, showGoldInMemory: false }
        if (
          level.stairsUp &&
          level.stairsUp.x === x &&
          level.stairsUp.y === y &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '<'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }
        if (
          level.stairsDown &&
          level.stairsDown.x === x &&
          level.stairsDown.y === y &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '>'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }

        // Targeting line (render before player but after entities)
        if (targetingLine.has(`${x},${y}`) && !(x === state.player.position.x && y === state.player.position.y) && !(x === cursorPos.x && y === cursorPos.y)) {
          char = '*'
          color = '#FFFF00' // Yellow
        }

        // Targeting cursor (render before player)
        if (pos.x === cursorPos.x && pos.y === cursorPos.y) {
          // Check if target is valid (position-based targeting)
          // Valid if: in FOV + within range + walkable tile
          const distance = Math.abs(cursorPos.x - state.player.position.x) + Math.abs(cursorPos.y - state.player.position.y)
          const key = `${cursorPos.x},${cursorPos.y}`
          const inFOV = state.visibleCells.has(key)
          const tile = level.tiles[cursorPos.y][cursorPos.x]
          const inRange = distance <= targetingState.getRange()
          const isValid = inFOV && inRange && tile.walkable

          char = 'X'
          color = isValid ? '#00FF00' : '#FF0000' // Green if valid, red if invalid
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

    // HP color (green > yellow > red > blinking red)
    const hpPercent = (player.hp / player.maxHp) * 100
    const hpColor =
      hpPercent >= GameRenderer.HP_THRESHOLDS.HEALTHY
        ? '#00FF00'
        : hpPercent >= GameRenderer.HP_THRESHOLDS.WOUNDED
        ? '#FFDD00'
        : hpPercent >= GameRenderer.HP_THRESHOLDS.CRITICAL
        ? '#FF8800'
        : '#FF0000'
    const hpBlinkClass = hpPercent < GameRenderer.HP_THRESHOLDS.BLINKING ? ' hp-critical-blink' : ''
    const hpWarning = hpPercent < GameRenderer.HP_THRESHOLDS.CRITICAL ? ' ⚠️' : ''

    // Get XP progress for display
    const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
    const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`

    // Ring bonuses
    const strBonus = this.ringService.getStrengthBonus(player)
    const acBonus = this.ringService.getACBonus(player)

    // Format strength display with exceptional strength (18/XX) support
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

    const acDisplay = acBonus !== 0 ? `${player.ac}(${acBonus > 0 ? '+' : ''}${acBonus})` : `${player.ac}`

    // Hunger bar
    const hungerPercent = Math.min(100, (player.hunger / GameRenderer.HUNGER_MAX) * 100)
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

    this.statsContainer.innerHTML = `
      <!-- Single Row: 4 Panels Side-by-Side -->
      <div class="stats-row">
        <div class="stats-panel">
          <div class="stats-panel-header">Combat</div>
          <div class="stats-panel-content">
            <div class="${hpBlinkClass}" style="color: ${hpColor}">HP: ${player.hp}/${player.maxHp}${hpWarning}</div>
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
   * Dim a color for detected entities (not directly visible)
   */
  private dimColor(color: string): string {
    // Convert hex to RGB, reduce brightness by 50%, return hex
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    const dimmedR = Math.floor(r * 0.5)
    const dimmedG = Math.floor(g * 0.5)
    const dimmedB = Math.floor(b * 0.5)

    return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`
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

  /**
   * Calculate targeting line from start to end position
   * Uses Bresenham-like algorithm to trace line until hitting wall
   *
   * @param start - Starting position (player)
   * @param end - End position (cursor)
   * @param level - Current dungeon level
   * @returns Set of position keys representing the line path
   */
  private calculateTargetingLine(start: Position, end: Position, level: Level): Set<string> {
    const line = new Set<string>()

    // Calculate direction vector
    const dx = end.x - start.x
    const dy = end.y - start.y

    // Number of steps = max of absolute differences
    const steps = Math.max(Math.abs(dx), Math.abs(dy))

    // Calculate step increments
    const xStep = steps === 0 ? 0 : dx / steps
    const yStep = steps === 0 ? 0 : dy / steps

    // Trace line from start to end
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(start.x + xStep * i)
      const y = Math.round(start.y + yStep * i)

      // Add position to line
      line.add(`${x},${y}`)

      // Stop if we hit a wall (but not at the cursor position itself)
      if (x >= 0 && x < level.width && y >= 0 && y < level.height) {
        const tile = level.tiles[y][x]
        if (!tile.walkable && (x !== end.x || y !== end.y)) {
          break
        }
      }
    }

    return line
  }
}
