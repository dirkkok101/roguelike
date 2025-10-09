import { Tileset, TilesetConfig, TileCoordinate } from '@assets/assets'
import { parsePrfFile, buildLookupMap } from '@utils/prfParser'

// ============================================================================
// ASSET LOADER SERVICE - Load sprite sheets and .prf tile mappings
// ============================================================================

export class AssetLoaderService {
  private tilesets: Map<string, Tileset> = new Map()
  private currentTileset: Tileset | null = null

  /**
   * Load a tileset from PNG + .prf files
   *
   * @param imageUrl - Path to sprite sheet PNG (e.g., "/assets/tilesets/gervais/32x32.png")
   * @param prfFiles - Array of .prf file paths to parse
   * @param tileSize - Tile size in pixels (default: 32)
   * @returns Promise that resolves with loaded tileset
   */
  async loadTileset(imageUrl: string, prfFiles: string[], tileSize = 32): Promise<Tileset> {
    try {
      // Check if already loaded
      const cacheKey = this.getCacheKey(imageUrl, prfFiles)
      if (this.tilesets.has(cacheKey)) {
        const cached = this.tilesets.get(cacheKey)!
        this.currentTileset = cached
        return cached
      }

      console.log('[AssetLoader] Loading tileset:', imageUrl)

      // Load PNG image
      const image = await this.loadImage(imageUrl)

      // Fetch and parse all .prf files
      const allEntries = []
      for (const prfUrl of prfFiles) {
        console.log('[AssetLoader] Fetching .prf file:', prfUrl)
        const prfContent = await this.fetchPrfFile(prfUrl)
        const entries = parsePrfFile(prfContent)
        allEntries.push(...entries)
      }

      console.log(`[AssetLoader] Parsed ${allEntries.length} tile entries from ${prfFiles.length} .prf files`)

      // Build lookup map
      const tiles = buildLookupMap(allEntries, tileSize)

      console.log(`[AssetLoader] Built lookup map with ${tiles.size} entries`)

      // Create tileset config
      const config: TilesetConfig = {
        name: this.extractTilesetName(imageUrl),
        tileWidth: tileSize,
        tileHeight: tileSize,
        imageUrl,
        tiles,
      }

      // Create tileset
      const tileset: Tileset = {
        config,
        image,
        isLoaded: true,
      }

      // Cache it
      this.tilesets.set(cacheKey, tileset)
      this.currentTileset = tileset

      console.log('[AssetLoader] Tileset loaded successfully')

      return tileset
    } catch (error) {
      console.error('[AssetLoader] Failed to load tileset:', error)
      throw new Error(`Failed to load tileset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get sprite coordinates for a game character/entity
   *
   * @param char - Character to look up (e.g., '@', 'A', '#', '.')
   * @returns Tile coordinate or null if not found
   */
  getSprite(char: string): TileCoordinate | null {
    if (!this.currentTileset) {
      console.warn('[AssetLoader] No tileset loaded')
      return null
    }

    return this.currentTileset.config.tiles.get(char) ?? null
  }

  /**
   * Get sprite by entity type and name
   *
   * @param type - Entity type (e.g., "feat", "monster", "object")
   * @param name - Entity name (e.g., "FLOOR", "Bat", "Healing")
   * @param condition - Optional condition (e.g., "torch", "lit")
   * @returns Tile coordinate or null if not found
   */
  getSpriteByName(type: string, name: string, condition?: string): TileCoordinate | null {
    if (!this.currentTileset) {
      console.warn('[AssetLoader] No tileset loaded')
      return null
    }

    // Try with condition first
    if (condition) {
      const key = `${name}:${condition}`
      const coord = this.currentTileset.config.tiles.get(key)
      if (coord) return coord
    }

    // Fallback to name only
    return this.currentTileset.config.tiles.get(name) ?? null
  }

  /**
   * Check if a tileset is currently loaded
   */
  isLoaded(): boolean {
    return this.currentTileset !== null && this.currentTileset.isLoaded
  }

  /**
   * Get current tileset (if loaded)
   */
  getCurrentTileset(): Tileset | null {
    return this.currentTileset
  }

  /**
   * Clear all cached tilesets
   */
  clearCache(): void {
    this.tilesets.clear()
    this.currentTileset = null
  }

  // ============================================================================
  // PRIVATE: Helper methods
  // ============================================================================

  /**
   * Load PNG image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        console.log(`[AssetLoader] Image loaded: ${url} (${img.width}x${img.height}px)`)
        resolve(img)
      }

      img.onerror = (error) => {
        reject(new Error(`Failed to load image: ${url} - ${error}`))
      }

      img.src = url
    })
  }

  /**
   * Fetch .prf file content
   */
  private async fetchPrfFile(url: string): Promise<string> {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const content = await response.text()
      return content
    } catch (error) {
      throw new Error(`Failed to fetch .prf file: ${url} - ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate cache key from image URL and .prf files
   */
  private getCacheKey(imageUrl: string, prfFiles: string[]): string {
    return `${imageUrl}|${prfFiles.join('|')}`
  }

  /**
   * Extract tileset name from image URL
   */
  private extractTilesetName(imageUrl: string): string {
    // Extract from path like "/assets/tilesets/gervais/32x32.png" → "Gervais 32x32"
    const parts = imageUrl.split('/')
    const folderName = parts[parts.length - 2] || 'Unknown'
    const fileName = parts[parts.length - 1]?.replace('.png', '') || ''

    return `${folderName} ${fileName}`.trim()
  }
}
