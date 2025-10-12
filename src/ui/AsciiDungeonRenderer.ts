// ============================================================================
// ASCII DUNGEON RENDERER - Text-based rendering for game state
// ============================================================================

import { GameState, Position, ItemType, StatusEffectType } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'

export interface AsciiRenderConfig {
  viewportWidth: number   // Characters wide (e.g., 80)
  viewportHeight: number  // Characters tall (e.g., 22)
  scrollMarginX: number   // Horizontal deadzone before camera scrolls (e.g., 10)
  scrollMarginY: number   // Vertical deadzone before camera scrolls (e.g., 5)
}

/**
 * AsciiDungeonRenderer
 *
 * Classic text-based rendering using colored ASCII characters.
 * Provides accessibility and lower resource usage compared to sprite rendering.
 *
 * Features:
 * - Viewport-based rendering (only renders visible portion of map)
 * - Camera system with scroll margins (matches CanvasGameRenderer behavior)
 * - Three-state visibility (visible/explored/unexplored)
 * - Color-coded entities (monsters, items, tiles)
 * - Support for detected entities (magic detection, monster detection)
 * - Respects same visibility rules as sprite renderer
 */
export class AsciiDungeonRenderer {
  private config: AsciiRenderConfig

  // Camera state for viewport system (matches CanvasGameRenderer)
  private cameraOffsetX = 0
  private cameraOffsetY = 0
  private isFirstRender = true
  private previousLevel: number | null = null

  constructor(
    private renderingService: RenderingService,
    config?: Partial<AsciiRenderConfig>
  ) {
    // Set up configuration with defaults
    this.config = {
      viewportWidth: 80,
      viewportHeight: 22,
      scrollMarginX: 10,
      scrollMarginY: 5,
      ...config,
    }
  }

  /**
   * Update camera position using scroll margin system (matches CanvasGameRenderer)
   *
   * @param state - Current game state
   */
  private updateCamera(state: GameState): void {
    const playerPos = state.player.position
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // 1. Check for level transition (new level or first render)
    const levelChanged = this.previousLevel !== state.currentLevel
    if (levelChanged || this.isFirstRender) {
      // Center camera on player for new level
      this.cameraOffsetX = playerPos.x - Math.floor(this.config.viewportWidth / 2)
      this.cameraOffsetY = playerPos.y - Math.floor(this.config.viewportHeight / 2)
      this.previousLevel = state.currentLevel
      this.isFirstRender = false
    } else {
      // 2. Scroll margin mode (normal gameplay)
      // Horizontal scrolling
      if (playerPos.x < this.cameraOffsetX + this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.scrollMarginX
      } else if (playerPos.x >= this.cameraOffsetX + this.config.viewportWidth - this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.viewportWidth + this.config.scrollMarginX
      }

      // Vertical scrolling
      if (playerPos.y < this.cameraOffsetY + this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.scrollMarginY
      } else if (playerPos.y >= this.cameraOffsetY + this.config.viewportHeight - this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.viewportHeight + this.config.scrollMarginY
      }
    }

    // 3. Edge clamping (prevent showing off-map areas)
    const mapWidth = level.tiles[0]?.length || this.config.viewportWidth
    const mapHeight = level.tiles.length || this.config.viewportHeight

    // Handle small maps (smaller than viewport)
    if (mapWidth <= this.config.viewportWidth) {
      this.cameraOffsetX = 0
    } else {
      this.cameraOffsetX = Math.max(0, Math.min(this.cameraOffsetX, mapWidth - this.config.viewportWidth))
    }

    if (mapHeight <= this.config.viewportHeight) {
      this.cameraOffsetY = 0
    } else {
      this.cameraOffsetY = Math.max(0, Math.min(this.cameraOffsetY, mapHeight - this.config.viewportHeight))
    }
  }

  /**
   * Render game state to HTML string (viewport-based rendering)
   * Returns HTML containing colored ASCII characters in <pre> tags
   *
   * @param state - Current game state
   * @returns HTML string for dungeon view
   */
  render(state: GameState): string {
    const level = state.levels.get(state.currentLevel)
    if (!level) return '<pre class="dungeon-grid">No level data</pre>'

    // Update camera position using scroll margin system
    this.updateCamera(state)

    // Check for SEE_INVISIBLE status effect
    const canSeeInvisible = state.player.statusEffects.some(
      (e) => e.type === StatusEffectType.SEE_INVISIBLE
    )

    let html = '<pre class="dungeon-grid">'

    // Loop through VIEWPORT (not full map)
    for (let viewportY = 0; viewportY < this.config.viewportHeight; viewportY++) {
      for (let viewportX = 0; viewportX < this.config.viewportWidth; viewportX++) {
        // Convert viewport coordinates to world coordinates
        const worldX = viewportX + this.cameraOffsetX
        const worldY = viewportY + this.cameraOffsetY

        // Get tile at world position
        const tile = level.tiles[worldY]?.[worldX]
        if (!tile) {
          // Out of bounds - render as unexplored
          html += `<span style="color: #000000"> </span>`
          continue
        }

        const pos: Position = { x: worldX, y: worldY }
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
            const gold = level.gold.find((g) => g.position.x === worldX && g.position.y === worldY)
            if (gold) {
              char = '$'
              color = '#FFD700' // Gold
            }
          }

          // Items (visible or detected)
          const item = level.items.find((i) => i.position?.x === worldX && i.position?.y === worldY)
          if (item) {
            const isDetected = state.detectedMagicItems.has(item.id)
            const isVisible = visState === 'visible'

            // Render if visible OR if detected and in explored area
            if (isVisible || isDetected) {
              char = this.getItemSymbol(item.type)
              color = isVisible
                ? this.getItemColor(item.type)
                : this.dimColor(this.getItemColor(item.type))
            }
          }

          // Monsters (visible or detected in explored areas, render on top of items)
          const monster = level.monsters.find((m) => m.position.x === worldX && m.position.y === worldY)
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
          level.stairsUp.x === worldX &&
          level.stairsUp.y === worldY &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '<'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }
        if (
          level.stairsDown &&
          level.stairsDown.x === worldX &&
          level.stairsDown.y === worldY &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '>'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }

        // Player (always on top)
        if (worldX === state.player.position.x && worldY === state.player.position.y) {
          char = '@'
          color = '#00FFFF'
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    return html
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
   * Render game state with targeting overlay (viewport-based)
   *
   * @param state - Current game state
   * @param cursorPos - Targeting cursor position (world coordinates)
   * @param range - Targeting range
   * @param level - Current level (for targeting line calculation)
   * @returns HTML string for dungeon view with targeting overlay
   */
  renderWithTargeting(
    state: GameState,
    cursorPos: Position,
    range: number,
    level: ReturnType<GameState['levels']['get']>
  ): string {
    if (!level) return '<pre class="dungeon-grid">No level data</pre>'

    // Update camera position using scroll margin system
    this.updateCamera(state)

    // Check for SEE_INVISIBLE status effect
    const canSeeInvisible = state.player.statusEffects.some(
      (e) => e.type === StatusEffectType.SEE_INVISIBLE
    )

    // Calculate targeting line (in world coordinates)
    const targetingLine = this.calculateTargetingLine(state.player.position, cursorPos, level)

    let html = '<pre class="dungeon-grid">'

    // Loop through VIEWPORT (not full map)
    for (let viewportY = 0; viewportY < this.config.viewportHeight; viewportY++) {
      for (let viewportX = 0; viewportX < this.config.viewportWidth; viewportX++) {
        // Convert viewport coordinates to world coordinates
        const worldX = viewportX + this.cameraOffsetX
        const worldY = viewportY + this.cameraOffsetY

        // Get tile at world position
        const tile = level.tiles[worldY]?.[worldX]
        if (!tile) {
          // Out of bounds - render as unexplored
          html += `<span style="color: #000000"> </span>`
          continue
        }

        const pos: Position = { x: worldX, y: worldY }
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
            const gold = level.gold.find((g) => g.position.x === worldX && g.position.y === worldY)
            if (gold) {
              char = '$'
              color = '#FFD700' // Gold
            }
          }

          // Items (visible or detected)
          const item = level.items.find((i) => i.position?.x === worldX && i.position?.y === worldY)
          if (item) {
            const isDetected = state.detectedMagicItems.has(item.id)
            const isVisible = visState === 'visible'

            // Render if visible OR if detected and in explored area
            if (isVisible || isDetected) {
              char = this.getItemSymbol(item.type)
              color = isVisible
                ? this.getItemColor(item.type)
                : this.dimColor(this.getItemColor(item.type))
            }
          }

          // Monsters (visible or detected in explored areas, render on top of items)
          const monster = level.monsters.find((m) => m.position.x === worldX && m.position.y === worldY)
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

        // Stairs (visible or explored, render before targeting overlay)
        const config = { showItemsInMemory: false, showGoldInMemory: false }
        if (
          level.stairsUp &&
          level.stairsUp.x === worldX &&
          level.stairsUp.y === worldY &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '<'
          color = visState === 'visible' ? '#FFFF00' : '#707070'
        }
        if (
          level.stairsDown &&
          level.stairsDown.x === worldX &&
          level.stairsDown.y === worldY &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '>'
          color = visState === 'visible' ? '#FFFF00' : '#707070'
        }

        // Targeting line (render before cursor but after entities)
        const isOnTargetingLine = targetingLine.has(`${worldX},${worldY}`)
        const isNotPlayerPos = !(worldX === state.player.position.x && worldY === state.player.position.y)
        const isNotCursorPos = !(worldX === cursorPos.x && worldY === cursorPos.y)
        if (isOnTargetingLine && isNotPlayerPos && isNotCursorPos) {
          char = '*'
          color = '#FFFF00' // Yellow
        }

        // Targeting cursor (render before player)
        if (worldX === cursorPos.x && worldY === cursorPos.y) {
          // Check if target is valid (position-based targeting)
          const distance = Math.abs(cursorPos.x - state.player.position.x) + Math.abs(cursorPos.y - state.player.position.y)
          const key = `${cursorPos.x},${cursorPos.y}`
          const inFOV = state.visibleCells.has(key)
          const inRange = distance <= range
          const isValid = inFOV && inRange && tile.walkable

          char = 'X'
          color = isValid ? '#00FF00' : '#FF0000' // Green if valid, red if invalid
        }

        // Player (always on top)
        if (worldX === state.player.position.x && worldY === state.player.position.y) {
          char = '@'
          color = '#00FFFF'
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    return html
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
  private calculateTargetingLine(
    start: Position,
    end: Position,
    level: ReturnType<GameState['levels']['get']>
  ): Set<string> {
    const line = new Set<string>()
    if (!level) return line

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

  /**
   * Get current camera offset (for debugging)
   */
  getCameraOffset(): { x: number; y: number } {
    return { x: this.cameraOffsetX, y: this.cameraOffsetY }
  }

  /**
   * Get viewport configuration
   */
  getConfig(): AsciiRenderConfig {
    return { ...this.config }
  }
}
