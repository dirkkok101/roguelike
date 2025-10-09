import { GameState, Position, ItemType, StatusEffectType, Level } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'
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

  constructor(
    private renderingService: RenderingService,
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
    _preferencesService: PreferencesService,
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

    // Check for status effects to show visual indicators
    const isConfused = state.player.statusEffects.some((e) => e.type === StatusEffectType.CONFUSED)
    const isHasted = state.player.statusEffects.some((e) => e.type === StatusEffectType.HASTED)
    const canSeeInvisible = state.player.statusEffects.some((e) => e.type === StatusEffectType.SEE_INVISIBLE)

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

        // Player (always on top)
        if (pos.x === state.player.position.x && pos.y === state.player.position.y) {
          char = '@'
          color = '#00FFFF'
        }

        // Status effect indicators near player
        // Confused indicator (?) to the right of player
        if (isConfused && pos.x === state.player.position.x + 1 && pos.y === state.player.position.y) {
          char = '?'
          color = '#FF00FF'
        }
        // Hasted indicator (⚡) to the left of player
        if (isHasted && pos.x === state.player.position.x - 1 && pos.y === state.player.position.y) {
          char = '⚡'
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
    const hpWarning = hpPercent < 25 ? ' ⚠️' : ''

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
    const hungerWarning = hungerPercent < 25 ? ' 🍖' : ''
    const hungerStatus = hungerPercent === 0 ? ' STARVING!' : hungerPercent < 10 ? ' Fainting' : hungerPercent < 25 ? ' Hungry' : ''

    // Inventory color
    const invCount = player.inventory.length
    const invColor =
      invCount < 20 ? '#00FF00' : invCount < 24 ? '#FFDD00' : invCount < 26 ? '#FF8800' : '#FF0000'

    // Light status
    let lightDisplay = 'None (darkness!)'
    let lightColor = '#FF0000'
    let fuelWarning = ''
    if (lightSource) {
      if ('fuel' in lightSource && 'maxFuel' in lightSource) {
        const fuel = lightSource.fuel
        const maxFuel = lightSource.maxFuel
        const fuelPercent = (fuel / maxFuel) * 100

        lightColor = fuelPercent >= 50 ? '#FFDD00' : fuelPercent >= 20 ? '#FF8800' : '#FF0000'
        fuelWarning = fuelPercent < 10 && fuel > 0 ? ' 🔥' : fuelPercent === 0 ? ' OUT!' : ''

        const fuelText = ` (${fuel})`
        lightDisplay = `${lightSource.name}${fuelText}${fuelWarning}`
      } else {
        // Artifact - no fuel
        lightColor = '#00FF00'
        lightDisplay = `${lightSource.name} (∞)`
      }
    }

    // Get XP progress for display
    const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
    const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`
    const xpPercentage = xpNeeded === Infinity ? 100 : Math.min(100, (player.xp / xpNeeded) * 100)

    // Ring bonuses
    const strBonus = this.ringService.getStrengthBonus(player)
    const acBonus = this.ringService.getACBonus(player)
    const strDisplay = strBonus !== 0 ? `${player.strength}(${strBonus > 0 ? '+' : ''}${strBonus})/${player.maxStrength}` : `${player.strength}/${player.maxStrength}`
    const acDisplay = acBonus !== 0 ? `${player.ac}(${acBonus > 0 ? '+' : ''}${acBonus})` : `${player.ac}`

    // Status effects display
    let statusEffectsHTML = ''
    if (player.statusEffects.length > 0) {
      statusEffectsHTML = `
        <div style="margin-top: 8px;">
          <span style="color: #888;">Status:</span><br>
          ${player.statusEffects
            .map((effect) => {
              const display = this.getStatusEffectDisplay(effect.type)
              return `<div style="color: ${display.color}; font-size: 0.9em;">
                ${display.icon} ${display.label} (${effect.duration})
              </div>`
            })
            .join('')}
        </div>
      `
    }

    this.statsContainer.innerHTML = `
      <style>
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      </style>
      <div class="stats">
        <div style="color: ${hpColor}; ${hpBlink}">HP: ${player.hp}/${player.maxHp}${hpWarning}</div>
        <div>Str: ${strDisplay}</div>
        <div>AC: ${acDisplay}</div>
        <div>Level: ${player.level}</div>
        <div>XP: ${xpDisplay}</div>
        <div style="font-size: 0.8em; color: #666;">
          <span style="display: inline-block; width: 100px; height: 8px; background: #333; border: 1px solid #555;">
            <span style="display: block; width: ${xpPercentage}%; height: 100%; background: #0af;"></span>
          </span>
        </div>
        <div>Gold: ${player.gold}</div>
        <div style="margin-top: 8px;">
          <span style="color: #888;">Hunger:</span>${hungerWarning}<br>
          <span style="color: ${hungerColor};">[${hungerBar}]${hungerStatus}</span>
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
        ${statusEffectsHTML}
      </div>
    `
  }

  private renderMessages(state: GameState): void {
    const recent = state.messages.slice(-15) // Increased from 8 to 15 to show more context
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

    // Auto-scroll to bottom to show latest messages
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  /**
   * Dim a color for detected entities (not directly visible)
   */
  private dimColor(color: string): string {
    // Convert hex to RGB, reduce brightness by 50%, return hex
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

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

  /**
   * Render targeting overlay (cursor, line, info panel)
   * Called when TargetSelectionState is active
   *
   * @param targetingState - The active targeting state
   */
  renderTargetingOverlay(targetingState: any): void {
    const cursor = targetingState.getCursorPosition()
    const range = targetingState.getRange()
    const state = targetingState.getGameState()
    const level = state.levels.get(state.currentLevel)

    if (!level || !this.debugCanvas) return

    const ctx = this.debugCanvas.getContext('2d')
    if (!ctx) return

    const cellSize = 16

    // 1. Render line from player to cursor
    this.renderTargetingLine(ctx, state, cursor, level, cellSize)

    // 2. Render cursor at target position
    this.renderTargetingCursor(ctx, state, cursor, range, cellSize)

    // 3. Render info panel if cursor is on a monster
    this.renderTargetingInfo(state, cursor, range)
  }

  /**
   * Render line from player to cursor position
   */
  private renderTargetingLine(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    cursor: Position,
    level: Level,
    cellSize: number
  ): void {
    // Calculate direction vector from player to cursor
    const dx = cursor.x - state.player.position.x
    const dy = cursor.y - state.player.position.y

    // Normalize to get direction
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return

    // Use castRay to get line path (from TargetingService logic)
    // For now, draw a simple line - could enhance with castRay later
    const positions: Position[] = []
    const steps = Math.max(Math.abs(dx), Math.abs(dy))

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      const x = Math.round(state.player.position.x + dx * t)
      const y = Math.round(state.player.position.y + dy * t)
      positions.push({ x, y })

      // Stop at walls
      if (x >= 0 && x < level.width && y >= 0 && y < level.height) {
        const tile = level.tiles[y][x]
        if (!tile.walkable && (x !== cursor.x || y !== cursor.y)) {
          break
        }
      }
    }

    // Draw line segments
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)' // Yellow semi-transparent
    ctx.lineWidth = 2

    for (let i = 0; i < positions.length - 1; i++) {
      const pos = positions[i]
      const nextPos = positions[i + 1]

      ctx.beginPath()
      ctx.moveTo(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2)
      ctx.lineTo(nextPos.x * cellSize + cellSize / 2, nextPos.y * cellSize + cellSize / 2)
      ctx.stroke()
    }
  }

  /**
   * Render cursor at target position
   */
  private renderTargetingCursor(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    cursor: Position,
    range: number,
    cellSize: number
  ): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Check if cursor position is valid (in range, in FOV, has monster)
    const distance = Math.abs(cursor.x - state.player.position.x) +
                    Math.abs(cursor.y - state.player.position.y)
    const inRange = distance <= range
    const key = `${cursor.x},${cursor.y}`
    const inFOV = state.visibleCells.has(key)
    const monster = level.monsters.find(m => m.position.x === cursor.x && m.position.y === cursor.y)
    const isValid = inRange && inFOV && !!monster

    // Draw cursor box
    ctx.strokeStyle = isValid ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(
      cursor.x * cellSize + 2,
      cursor.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    )

    // Draw crosshair
    ctx.beginPath()
    ctx.moveTo(cursor.x * cellSize + cellSize / 2, cursor.y * cellSize + 4)
    ctx.lineTo(cursor.x * cellSize + cellSize / 2, cursor.y * cellSize + cellSize - 4)
    ctx.moveTo(cursor.x * cellSize + 4, cursor.y * cellSize + cellSize / 2)
    ctx.lineTo(cursor.x * cellSize + cellSize - 4, cursor.y * cellSize + cellSize / 2)
    ctx.stroke()
  }

  /**
   * Render targeting info panel
   */
  private renderTargetingInfo(state: GameState, cursor: Position, range: number): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Check if cursor is on a monster
    const monster = level.monsters.find(m => m.position.x === cursor.x && m.position.y === cursor.y)

    // Calculate distance
    const distance = Math.abs(cursor.x - state.player.position.x) +
                    Math.abs(cursor.y - state.player.position.y)

    // Check validity
    const key = `${cursor.x},${cursor.y}`
    const inFOV = state.visibleCells.has(key)
    const isValid = distance <= range && inFOV && !!monster

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
  }
}
