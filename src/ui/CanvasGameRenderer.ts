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

  // Dirty rectangle tracking for performance optimization
  private previousVisibleCells: Set<string> | null = null
  private previousMonsterPositions: Map<string, Position> = new Map()
  private previousCameraOffsetX = 0
  private previousCameraOffsetY = 0

  /**
   * Calculate responsive viewport dimensions based on container size and tile size
   *
   * @param tileWidth - Width of each tile in pixels
   * @param tileHeight - Height of each tile in pixels
   * @returns Calculated grid dimensions
   */
  private calculateResponsiveDimensions(tileWidth: number, tileHeight: number): { gridWidth: number; gridHeight: number } {
    // Get parent container dimensions
    const container = this.canvasElement.parentElement
    if (!container) {
      // Fallback to default if no parent container
      console.warn('[CanvasGameRenderer] No parent container found, using default dimensions')
      return { gridWidth: 80, gridHeight: 22 }
    }

    // Get container's client dimensions (actual rendered size)
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate how many tiles fit in the container
    const gridWidth = Math.floor(containerWidth / tileWidth)
    const gridHeight = Math.floor(containerHeight / tileHeight)

    // Ensure minimum dimensions (at least 20×10 tiles visible)
    const minGridWidth = 20
    const minGridHeight = 10

    const finalGridWidth = Math.max(gridWidth, minGridWidth)
    const finalGridHeight = Math.max(gridHeight, minGridHeight)

    console.log(
      `[CanvasGameRenderer] Responsive viewport: container ${containerWidth}×${containerHeight}px ` +
        `→ ${finalGridWidth}×${finalGridHeight} tiles @ ${tileWidth}×${tileHeight}px`
    )

    return {
      gridWidth: finalGridWidth,
      gridHeight: finalGridHeight,
    }
  }

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

    // Determine grid dimensions: use explicit config if provided, otherwise calculate responsive
    let gridWidth: number
    let gridHeight: number

    if (config?.gridWidth !== undefined && config?.gridHeight !== undefined) {
      // Use explicit dimensions provided in config (useful for testing)
      gridWidth = config.gridWidth
      gridHeight = config.gridHeight
      console.log(
        `[CanvasGameRenderer] Using explicit grid dimensions from config: ${gridWidth}×${gridHeight} tiles`
      )
    } else {
      // Calculate responsive viewport dimensions based on container size
      const responsiveDimensions = this.calculateResponsiveDimensions(
        config?.tileWidth || 32,
        config?.tileHeight || 32
      )
      gridWidth = responsiveDimensions.gridWidth
      gridHeight = responsiveDimensions.gridHeight
    }

    // Set up configuration
    this.config = {
      tileWidth: 32,
      tileHeight: 32,
      gridWidth,
      gridHeight,
      enableSmoothing: false, // Disable for crisp pixel art
      enableDirtyRectangles: true,
      exploredOpacity: 0.5,
      detectedOpacity: 0.6,
      scrollMarginX: Math.min(10, Math.floor(gridWidth / 8)), // Dynamic based on viewport size
      scrollMarginY: Math.min(5, Math.floor(gridHeight / 4)), // Dynamic based on viewport size
      ...config,
      // Preserve explicit dimensions if provided
      gridWidth,
      gridHeight,
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
   * Calculate which tiles have changed since last frame (dirty rectangle optimization)
   *
   * @param state - Current game state
   * @returns Set of tile positions that need redrawing (in world coordinates)
   */
  private calculateDirtyTiles(state: GameState): Set<string> {
    const dirtyTiles = new Set<string>()

    // If dirty rectangles disabled or first render, mark all tiles as dirty
    if (!this.config.enableDirtyRectangles || this.isFirstRender) {
      for (let viewportY = 0; viewportY < this.config.gridHeight; viewportY++) {
        for (let viewportX = 0; viewportX < this.config.gridWidth; viewportX++) {
          const worldX = viewportX + this.cameraOffsetX
          const worldY = viewportY + this.cameraOffsetY
          dirtyTiles.add(`${worldX},${worldY}`)
        }
      }
      return dirtyTiles
    }

    // 1. Check if camera scrolled (entire viewport is dirty)
    const cameraScrolled = this.cameraOffsetX !== this.previousCameraOffsetX ||
                           this.cameraOffsetY !== this.previousCameraOffsetY

    if (cameraScrolled) {
      // Camera scrolled - all visible tiles are dirty
      for (let viewportY = 0; viewportY < this.config.gridHeight; viewportY++) {
        for (let viewportX = 0; viewportX < this.config.gridWidth; viewportX++) {
          const worldX = viewportX + this.cameraOffsetX
          const worldY = viewportY + this.cameraOffsetY
          dirtyTiles.add(`${worldX},${worldY}`)
        }
      }
      return dirtyTiles
    }

    // 2. Check for player movement
    if (this.previousPlayerPos) {
      // Mark old player position as dirty
      dirtyTiles.add(`${this.previousPlayerPos.x},${this.previousPlayerPos.y}`)
      // Mark new player position as dirty
      dirtyTiles.add(`${state.player.position.x},${state.player.position.y}`)
    }

    // 3. Check for monster movement
    const level = state.levels.get(state.currentLevel)
    if (level) {
      const currentMonsterPositions = new Map<string, Position>()
      for (const monster of level.monsters) {
        const key = monster.id
        currentMonsterPositions.set(key, { ...monster.position })

        // Check if monster moved
        const previousPos = this.previousMonsterPositions.get(key)
        if (previousPos) {
          if (previousPos.x !== monster.position.x || previousPos.y !== monster.position.y) {
            // Monster moved - mark both positions as dirty
            dirtyTiles.add(`${previousPos.x},${previousPos.y}`)
            dirtyTiles.add(`${monster.position.x},${monster.position.y}`)
          }
        } else {
          // New monster - mark position as dirty
          dirtyTiles.add(`${monster.position.x},${monster.position.y}`)
        }
      }

      // Check for removed monsters (monster died or left viewport)
      for (const [monsterId, previousPos] of this.previousMonsterPositions) {
        if (!currentMonsterPositions.has(monsterId)) {
          dirtyTiles.add(`${previousPos.x},${previousPos.y}`)
        }
      }
    }

    // 4. Check for FOV changes (visibility changes)
    if (this.previousVisibleCells) {
      // Find tiles that became visible
      for (const cell of state.visibleCells) {
        if (!this.previousVisibleCells.has(cell)) {
          dirtyTiles.add(cell)
        }
      }

      // Find tiles that became not visible (but still explored)
      for (const cell of this.previousVisibleCells) {
        if (!state.visibleCells.has(cell)) {
          dirtyTiles.add(cell)
        }
      }
    }

    return dirtyTiles
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

    // Update camera position using scroll margin system
    this.updateCamera(state)

    // DEBUG: Log camera and viewport state
    const playerPos = state.player.position
    const playerScreen = this.worldToScreen(playerPos)
    const level = state.levels.get(state.currentLevel)
    const mapSize = level ? `${level.tiles[0]?.length || 0}×${level.tiles.length || 0}` : 'unknown'

    console.log(`[Render] Player: world(${playerPos.x},${playerPos.y}) → screen(${playerScreen.x},${playerScreen.y})`)
    console.log(`[Render] Camera: offset(${this.cameraOffsetX},${this.cameraOffsetY}) viewport(${this.config.gridWidth}×${this.config.gridHeight}) map(${mapSize})`)
    console.log(`[Render] Viewport bounds: world X[${this.cameraOffsetX} to ${this.cameraOffsetX + this.config.gridWidth}], Y[${this.cameraOffsetY} to ${this.cameraOffsetY + this.config.gridHeight}]`)

    // Calculate which tiles need to be redrawn (dirty rectangle optimization)
    const dirtyTiles = this.calculateDirtyTiles(state)

    // Decide rendering strategy based on dirty tiles count
    const totalTiles = this.config.gridWidth * this.config.gridHeight
    const dirtyTileCount = dirtyTiles.size

    // If more than 30% of tiles are dirty, do full render (it's faster)
    const useFullRender = !this.config.enableDirtyRectangles || dirtyTileCount > totalTiles * 0.3

    if (useFullRender) {
      // Full render (original behavior)
      this.clear()
      this.renderTerrain(state)
      this.renderEntities(state)
      this.renderPlayer(state)
    } else {
      // Selective render (dirty rectangles only)
      for (const tileKey of dirtyTiles) {
        const [xStr, yStr] = tileKey.split(',')
        const worldX = parseInt(xStr, 10)
        const worldY = parseInt(yStr, 10)

        // Only render tiles that are in the current viewport
        const viewportX = worldX - this.cameraOffsetX
        const viewportY = worldY - this.cameraOffsetY

        if (viewportX >= 0 && viewportX < this.config.gridWidth &&
            viewportY >= 0 && viewportY < this.config.gridHeight) {
          // Clear and re-render this tile
          this.clearTile(worldX, worldY)
          this.renderTileAt(state, worldX, worldY)
        }
      }
    }

    // Update previous state for next frame's dirty rectangle calculation
    this.updatePreviousState(state)
  }

  /**
   * Update previous state tracking for dirty rectangle optimization
   *
   * @param state - Current game state
   */
  private updatePreviousState(state: GameState): void {
    // Update visible cells
    this.previousVisibleCells = new Set(state.visibleCells)

    // Update monster positions
    const level = state.levels.get(state.currentLevel)
    if (level) {
      this.previousMonsterPositions.clear()
      for (const monster of level.monsters) {
        this.previousMonsterPositions.set(monster.id, { ...monster.position })
      }
    }

    // Update camera offsets
    this.previousCameraOffsetX = this.cameraOffsetX
    this.previousCameraOffsetY = this.cameraOffsetY

    // Update player position (for next frame's dirty rectangle calculation)
    this.previousPlayerPos = { ...state.player.position }

    // Reset first render flag after rendering is complete
    if (this.isFirstRender) {
      this.isFirstRender = false
    }
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

    // Loop through viewport grid (80×22 tiles)
    for (let viewportY = 0; viewportY < this.config.gridHeight; viewportY++) {
      for (let viewportX = 0; viewportX < this.config.gridWidth; viewportX++) {
        // Convert viewport coordinates to world coordinates
        const worldX = viewportX + this.cameraOffsetX
        const worldY = viewportY + this.cameraOffsetY

        // Get tile at world position
        const tile = level.tiles[worldY]?.[worldX]
        if (!tile) continue

        // Get visibility state using world coordinates
        const position: Position = { x: worldX, y: worldY }
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
            console.warn(`[CanvasGameRenderer] No sprite for '${tile.char}' at (${worldX},${worldY})`)
          }
          continue
        }

        spriteFoundCount++

        // Determine opacity based on visibility
        const opacity = visibilityState === 'visible' ? 1.0 : this.config.exploredOpacity

        // Draw tile sprite using world coordinates
        this.drawTile(worldX, worldY, sprite, opacity)
      }
    }
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
      // Use spriteName if available (weapons, armor, light sources, food, oil flask)
      // Otherwise fall back to first character (potions, scrolls, rings, wands)
      const itemSprite = 'spriteName' in item ? item.spriteName : item.name[0] || '?'
      this.renderEntity(state, level, item.position, itemSprite, 'item', renderConfig)
    }

    // Render gold piles
    for (const gold of level.gold) {
      this.renderEntity(state, level, gold.position, '$', 'gold', renderConfig)
    }

    // Render monsters (top layer)
    for (const monster of level.monsters) {
      // Use sprite name for Angband tileset lookup (e.g., 'Bat' → 'Fruit bat')
      this.renderEntity(state, level, monster.position, monster.spriteName, 'monster', renderConfig)
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
   * Clear a single tile at world coordinates
   *
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   */
  private clearTile(worldX: number, worldY: number): void {
    const screen = this.worldToScreen({ x: worldX, y: worldY })

    // Clear the tile rectangle
    this.ctx.clearRect(screen.x, screen.y, this.config.tileWidth, this.config.tileHeight)

    // Fill with black background
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(screen.x, screen.y, this.config.tileWidth, this.config.tileHeight)
  }

  /**
   * Render everything at a specific tile position (terrain, entities, player)
   *
   * @param state - Current game state
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   */
  private renderTileAt(state: GameState, worldX: number, worldY: number): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    const position: Position = { x: worldX, y: worldY }

    // 1. Render terrain at this position
    const tile = level.tiles[worldY]?.[worldX]
    if (tile) {
      const visibilityState = this.renderingService.getVisibilityState(
        position,
        state.visibleCells,
        level
      )

      // Only render if not unexplored
      if (visibilityState !== 'unexplored') {
        const sprite = this.assetLoader.getSprite(tile.char)
        if (sprite) {
          const opacity = visibilityState === 'visible' ? 1.0 : this.config.exploredOpacity
          this.drawTile(worldX, worldY, sprite, opacity)
        }
      }
    }

    // 2. Render entities at this position (items, gold, monsters, stairs, traps)
    const renderConfig = {
      showItemsInMemory: true,
      showGoldInMemory: false,
    }

    // Check for items
    for (const item of level.items) {
      if (item.position.x === worldX && item.position.y === worldY) {
        const itemSprite = 'spriteName' in item ? item.spriteName : item.name[0] || '?'
        this.renderEntity(state, level, item.position, itemSprite, 'item', renderConfig)
      }
    }

    // Check for gold
    for (const gold of level.gold) {
      if (gold.position.x === worldX && gold.position.y === worldY) {
        this.renderEntity(state, level, gold.position, '$', 'gold', renderConfig)
      }
    }

    // Check for monsters
    for (const monster of level.monsters) {
      if (monster.position.x === worldX && monster.position.y === worldY) {
        this.renderEntity(state, level, monster.position, monster.spriteName, 'monster', renderConfig)
      }
    }

    // Check for stairs
    if (level.stairsUp && level.stairsUp.x === worldX && level.stairsUp.y === worldY) {
      this.renderEntity(state, level, level.stairsUp, '<', 'stairs', renderConfig)
    }
    if (level.stairsDown && level.stairsDown.x === worldX && level.stairsDown.y === worldY) {
      this.renderEntity(state, level, level.stairsDown, '>', 'stairs', renderConfig)
    }

    // Check for discovered traps
    for (const trap of level.traps) {
      if (trap.discovered && trap.position.x === worldX && trap.position.y === worldY) {
        this.renderEntity(state, level, trap.position, '^', 'trap', renderConfig)
      }
    }

    // 3. Render player if at this position
    if (state.player.position.x === worldX && state.player.position.y === worldY) {
      const sprite = this.assetLoader.getSprite('@')
      if (sprite) {
        this.drawTile(worldX, worldY, sprite, 1.0)
      }
    }
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

  /**
   * Resize canvas to fit container (call after canvas is added to DOM)
   * Recalculates responsive dimensions based on current container size
   */
  resize(): void {
    // Recalculate responsive dimensions
    const newDimensions = this.calculateResponsiveDimensions(
      this.config.tileWidth,
      this.config.tileHeight
    )

    // Check if dimensions changed
    if (newDimensions.gridWidth === this.config.gridWidth &&
        newDimensions.gridHeight === this.config.gridHeight) {
      // No change needed
      return
    }

    // Update config with new dimensions
    this.config.gridWidth = newDimensions.gridWidth
    this.config.gridHeight = newDimensions.gridHeight

    // Recalculate scroll margins based on new viewport size
    this.config.scrollMarginX = Math.min(10, Math.floor(newDimensions.gridWidth / 8))
    this.config.scrollMarginY = Math.min(5, Math.floor(newDimensions.gridHeight / 4))

    // Resize canvas element
    this.canvasElement.width = this.config.gridWidth * this.config.tileWidth
    this.canvasElement.height = this.config.gridHeight * this.config.tileHeight

    console.log(
      `[CanvasGameRenderer] Canvas resized: ${this.canvasElement.width}×${this.canvasElement.height}px ` +
        `(${this.config.gridWidth}×${this.config.gridHeight} tiles @ ${this.config.tileWidth}px)`
    )

    // Recenter camera on player (will be adjusted on next render)
    this.isFirstRender = true
  }
}
