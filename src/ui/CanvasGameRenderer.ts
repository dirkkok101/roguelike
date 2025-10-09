import { GameState, Position } from '@game/core/core'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { TileCoordinate } from '@assets/assets'

// ============================================================================
// CANVAS GAME RENDERER - Sprite-based rendering using HTML5 Canvas
// ============================================================================

export interface CanvasRenderConfig {
  tileWidth: number // 32 pixels
  tileHeight: number // 32 pixels
  gridWidth: number // 80 tiles
  gridHeight: number // 22 tiles
  enableSmoothing: boolean // false for pixel art
  enableDirtyRectangles: boolean // true for optimization
  exploredOpacity: number // 0.5 for dimming
  detectedOpacity: number // 0.6 for detected entities
  scrollMarginX: number // 10 tiles - horizontal deadzone for camera scrolling
  scrollMarginY: number // 5 tiles - vertical deadzone for camera scrolling
}

/**
 * Canvas-based game renderer that uses sprites from tileset
 *
 * Renders dungeon view using 2D sprites instead of ASCII text.
 * Maintains separation of concerns: rendering logic only, no game logic.
 */
export class CanvasGameRenderer {
  private ctx: CanvasRenderingContext2D
  private config: CanvasRenderConfig

  // Camera state for scroll margin system
  private cameraOffsetX = 0
  private cameraOffsetY = 0
  private isFirstRender = true
  private previousLevel: number | null = null
  private previousPlayerPos: Position | null = null

  constructor(
    private renderingService: RenderingService,
    private assetLoader: AssetLoaderService,
    private canvasElement: HTMLCanvasElement,
    config?: Partial<CanvasRenderConfig>
  ) {
    // Get 2D rendering context
    const context = canvasElement.getContext('2d')
    if (!context) {
      throw new Error('Failed to get 2D rendering context from canvas')
    }
    this.ctx = context

    // Set up configuration with defaults
    this.config = {
      tileWidth: 32,
      tileHeight: 32,
      gridWidth: 80,
      gridHeight: 22,
      enableSmoothing: false, // Disable for crisp pixel art
      enableDirtyRectangles: true,
      exploredOpacity: 0.5,
      detectedOpacity: 0.6,
      scrollMarginX: 10, // 10 tiles from left/right edges
      scrollMarginY: 5, // 5 tiles from top/bottom edges
      ...config,
    }

    // Configure canvas context
    this.setupCanvasContext()
  }

  /**
   * Set up canvas context with proper configuration for pixel art
   */
  private setupCanvasContext(): void {
    // Disable image smoothing for crisp pixel art
    this.ctx.imageSmoothingEnabled = this.config.enableSmoothing

    // Set canvas size based on tile dimensions
    this.canvasElement.width = this.config.gridWidth * this.config.tileWidth
    this.canvasElement.height = this.config.gridHeight * this.config.tileHeight

    console.log(
      `[CanvasGameRenderer] Canvas initialized: ${this.canvasElement.width}×${this.canvasElement.height}px ` +
        `(${this.config.gridWidth}×${this.config.gridHeight} tiles @ ${this.config.tileWidth}px)`
    )
  }

  /**
   * Update camera position using scroll margin system
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
      this.cameraOffsetX = playerPos.x - Math.floor(this.config.gridWidth / 2)
      this.cameraOffsetY = playerPos.y - Math.floor(this.config.gridHeight / 2)
      this.isFirstRender = false
      this.previousLevel = state.currentLevel
    } else {
      // 2. Scroll margin mode (normal gameplay)
      // Horizontal scrolling
      if (playerPos.x < this.cameraOffsetX + this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.scrollMarginX
      } else if (playerPos.x >= this.cameraOffsetX + this.config.gridWidth - this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.gridWidth + this.config.scrollMarginX
      }

      // Vertical scrolling
      if (playerPos.y < this.cameraOffsetY + this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.scrollMarginY
      } else if (playerPos.y >= this.cameraOffsetY + this.config.gridHeight - this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.gridHeight + this.config.scrollMarginY
      }
    }

    // 3. Edge clamping (prevent showing off-map areas)
    const mapWidth = level.tiles[0]?.length || this.config.gridWidth
    const mapHeight = level.tiles.length || this.config.gridHeight

    // Handle small maps (smaller than viewport)
    if (mapWidth <= this.config.gridWidth) {
      this.cameraOffsetX = 0
    } else {
      this.cameraOffsetX = Math.max(0, Math.min(this.cameraOffsetX, mapWidth - this.config.gridWidth))
    }

    if (mapHeight <= this.config.gridHeight) {
      this.cameraOffsetY = 0
    } else {
      this.cameraOffsetY = Math.max(0, Math.min(this.cameraOffsetY, mapHeight - this.config.gridHeight))
    }

    // Store for next frame
    this.previousPlayerPos = { ...playerPos }
  }

  /**
   * Render the entire game state to canvas
   *
   * @param state - Current game state
   */
  render(state: GameState): void {
    // Verify tileset is loaded
    if (!this.assetLoader.isLoaded()) {
      console.warn('[CanvasGameRenderer] Tileset not loaded, skipping render')
      return
    }

    console.log('[CanvasGameRenderer] render() called')

    // Update camera position using scroll margin system
    this.updateCamera(state)

    console.log(`[CanvasGameRenderer] Camera offset: (${this.cameraOffsetX}, ${this.cameraOffsetY}), player at (${state.player.position.x}, ${state.player.position.y})`)

    // Clear canvas
    this.clear()

    // Render terrain (floor, walls, doors, stairs)
    this.renderTerrain(state)

    // Render entities (items, gold, monsters)
    this.renderEntities(state)

    // Render player (always on top)
    this.renderPlayer(state)
  }

  /**
   * Render terrain tiles (floor, walls, corridors, doors, stairs)
   *
   * @param state - Current game state
   */
  private renderTerrain(state: GameState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      console.warn('[CanvasGameRenderer] Current level not found')
      return
    }

    let visibleCount = 0
    let exploredCount = 0
    let unexploredCount = 0
    let spriteFoundCount = 0
    let spriteNotFoundCount = 0

    // Loop through entire grid
    for (let y = 0; y < this.config.gridHeight; y++) {
      for (let x = 0; x < this.config.gridWidth; x++) {
        // Get tile at position
        const tile = level.tiles[y]?.[x]
        if (!tile) continue

        // Get visibility state
        const position: Position = { x, y }
        const visibilityState = this.renderingService.getVisibilityState(
          position,
          state.visibleCells,
          level
        )

        // Count visibility states
        if (visibilityState === 'visible') visibleCount++
        else if (visibilityState === 'explored') exploredCount++
        else unexploredCount++

        // Skip unexplored tiles
        if (visibilityState === 'unexplored') continue

        // Look up sprite for tile character
        const sprite = this.assetLoader.getSprite(tile.char)
        if (!sprite) {
          spriteNotFoundCount++
          // Log first few missing sprites
          if (spriteNotFoundCount <= 3) {
            console.warn(`[CanvasGameRenderer] No sprite for '${tile.char}' at (${x},${y})`)
          }
          continue
        }

        spriteFoundCount++

        // Determine opacity based on visibility
        const opacity = visibilityState === 'visible' ? 1.0 : this.config.exploredOpacity

        // Draw tile sprite
        this.drawTile(x, y, sprite, opacity)
      }
    }

    console.log(`[CanvasGameRenderer] Terrain: visible=${visibleCount}, explored=${exploredCount}, unexplored=${unexploredCount}, sprites found=${spriteFoundCount}, not found=${spriteNotFoundCount}`)
  }

  /**
   * Render entities (items, gold, monsters)
   *
   * Entities are rendered in order: items → gold → monsters
   * This ensures monsters appear on top of items/gold.
   *
   * @param state - Current game state
   */
  private renderEntities(state: GameState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    const renderConfig = {
      showItemsInMemory: true, // TODO: Make this configurable in Phase 5
      showGoldInMemory: false, // Gold only visible in FOV
    }

    // Render items first (bottom layer)
    for (const item of level.items) {
      this.renderEntity(state, level, item.position, item.name[0] || '?', 'item', renderConfig)
    }

    // Render gold piles
    for (const gold of level.gold) {
      this.renderEntity(state, level, gold.position, '$', 'gold', renderConfig)
    }

    // Render monsters (top layer)
    for (const monster of level.monsters) {
      // Pass monster name for Angband tileset lookup
      this.renderEntity(state, level, monster.position, monster.name, 'monster', renderConfig)
    }

    // Render stairs
    if (level.stairsUp) {
      this.renderEntity(state, level, level.stairsUp, '<', 'stairs', renderConfig)
    }
    if (level.stairsDown) {
      this.renderEntity(state, level, level.stairsDown, '>', 'stairs', renderConfig)
    }

    // Render discovered traps
    for (const trap of level.traps) {
      if (trap.discovered) {
        this.renderEntity(state, level, trap.position, '^', 'trap', renderConfig)
      }
    }
  }

  /**
   * Render a single entity (monster, item, gold, stairs, trap)
   *
   * @param state - Current game state
   * @param level - Current level
   * @param position - Entity position
   * @param char - Character to look up sprite
   * @param entityType - Type of entity
   * @param config - Render configuration
   */
  private renderEntity(
    state: GameState,
    level: typeof state.levels extends Map<number, infer L> ? L : never,
    position: Position,
    char: string,
    entityType: 'monster' | 'item' | 'gold' | 'stairs' | 'trap',
    config: { showItemsInMemory: boolean; showGoldInMemory: boolean }
  ): void {
    // Get visibility state
    const visibilityState = this.renderingService.getVisibilityState(
      position,
      state.visibleCells,
      level
    )

    // Check if entity should be rendered
    if (!this.renderingService.shouldRenderEntity(position, entityType, visibilityState, config)) {
      return
    }

    // Look up sprite
    const sprite = this.assetLoader.getSprite(char)
    if (!sprite) {
      // Missing sprite - skip (could add fallback in Phase 5)
      return
    }

    // Determine opacity
    let opacity = 1.0
    if (visibilityState === 'explored') {
      // Explored entities are dimmed
      opacity = this.config.exploredOpacity
    } else if (visibilityState === 'visible') {
      opacity = 1.0
    }

    // Handle detection effects (detected but not visible)
    if (entityType === 'monster' && state.detectedMonsters.has(`${position.x},${position.y}`)) {
      if (visibilityState !== 'visible') {
        opacity = this.config.detectedOpacity
      }
    }

    // Get color tint for entities (Phase 3: color tinting)
    let tintColor: string | undefined
    if (entityType === 'monster' && visibilityState === 'visible') {
      // Find the monster at this position to get its color
      const monster = level.monsters.find(m => m.position.x === position.x && m.position.y === position.y)
      if (monster) {
        tintColor = this.renderingService.getColorForEntity(monster, visibilityState)
      }
    }

    // Draw entity sprite
    this.drawTile(position.x, position.y, sprite, opacity, tintColor)
  }

  /**
   * Render player character (@)
   *
   * Player is always rendered on top of all other entities with full opacity.
   *
   * @param state - Current game state
   */
  private renderPlayer(state: GameState): void {
    const playerPos = state.player.position

    // Look up player sprite ('@')
    const sprite = this.assetLoader.getSprite('@')
    if (!sprite) {
      console.warn('[CanvasGameRenderer] Player sprite not found')
      return
    }

    // Always render player at full opacity
    this.drawTile(playerPos.x, playerPos.y, sprite, 1.0)
  }

  /**
   * Clear the entire canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)

    // Fill with black background
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height)
  }

  /**
   * Draw a single tile sprite at the specified grid position
   *
   * @param x - Grid X coordinate (0-79)
   * @param y - Grid Y coordinate (0-21)
   * @param sprite - Sprite coordinates in tileset
   * @param opacity - Opacity (0.0-1.0)
   * @param tintColor - Optional color to tint the sprite (e.g., '#FF4444' for red)
   */
  drawTile(x: number, y: number, sprite: TileCoordinate, opacity: number, tintColor?: string): void {
    const tileset = this.assetLoader.getCurrentTileset()
    if (!tileset) {
      console.warn('[CanvasGameRenderer] No tileset loaded, cannot draw tile')
      return
    }

    // Convert grid coordinates to screen coordinates
    const screen = this.worldToScreen({ x, y })

    // Debug: Log first few draw calls WITH image state
    if (this.drawCallCount < 3) {
      console.log(`[CanvasGameRenderer] drawTile(${x}, ${y}) sprite=(${sprite.x}, ${sprite.y}) screen=(${screen.x}, ${screen.y}) opacity=${opacity}`)
      console.log(`[CanvasGameRenderer] image.complete=${tileset.image.complete}, image.width=${tileset.image.width}, image.height=${tileset.image.height}, image.naturalWidth=${tileset.image.naturalWidth}, image.naturalHeight=${tileset.image.naturalHeight}`)
      this.drawCallCount++
    }

    // Set opacity
    const previousAlpha = this.ctx.globalAlpha
    this.ctx.globalAlpha = opacity

    // Draw sprite from tileset
    this.ctx.drawImage(
      tileset.image,
      sprite.x, // Source X in sprite sheet
      sprite.y, // Source Y in sprite sheet
      this.config.tileWidth, // Source width
      this.config.tileHeight, // Source height
      screen.x, // Destination X on canvas
      screen.y, // Destination Y on canvas
      this.config.tileWidth, // Destination width
      this.config.tileHeight // Destination height
    )

    // Apply color tint if provided
    if (tintColor) {
      const previousComposite = this.ctx.globalCompositeOperation
      this.ctx.globalCompositeOperation = 'multiply'
      this.ctx.fillStyle = tintColor
      this.ctx.fillRect(screen.x, screen.y, this.config.tileWidth, this.config.tileHeight)
      this.ctx.globalCompositeOperation = previousComposite
    }

    // Restore previous alpha
    this.ctx.globalAlpha = previousAlpha
  }

  private drawCallCount = 0

  /**
   * Convert world (grid) coordinates to screen (pixel) coordinates
   *
   * @param pos - Grid position
   * @returns Screen position in pixels
   */
  worldToScreen(pos: Position): { x: number; y: number } {
    return {
      x: (pos.x - this.cameraOffsetX) * this.config.tileWidth,
      y: (pos.y - this.cameraOffsetY) * this.config.tileHeight,
    }
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvasElement
  }

  /**
   * Get the rendering configuration
   */
  getConfig(): CanvasRenderConfig {
    return { ...this.config }
  }
}
