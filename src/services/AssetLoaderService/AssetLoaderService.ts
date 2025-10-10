import { Tileset, TilesetConfig, TileCoordinate } from '@assets/assets'
import { parsePrfFile, buildLookupMap } from '@utils/prfParser'

// ============================================================================
// ASSET LOADER SERVICE - Load sprite sheets and .prf tile mappings
// ============================================================================

// Character to Angband feature name mapping
const CHAR_TO_ANGBAND: Record<string, string[]> = {
  '@': ['<player>'], // Player character
  '.': ['FLOOR'], // Floor
  '#': ['GRANITE', 'PERM'], // Walls
  '+': ['CLOSED'], // Closed door
  "'": ['OPEN'], // Open door (single quote)
  '<': ['LESS'], // Up stairs
  '>': ['MORE'], // Down stairs
  '^': ['trap'], // Trap
  '%': ['RUBBLE'], // Rubble
  '*': ['MAGMA', 'QUARTZ'], // Veins
  '$': ['gold'], // Gold
  '!': ['potion'], // Potion
  '?': ['scroll'], // Scroll
  '=': ['ring'], // Ring
  '/': ['wand', 'staff'], // Wand/Staff
  ')': ['sword', 'weapon'], // Weapon
  '[': ['armor'], // Armor
  // Monster letters will be looked up directly
}

export class AssetLoaderService {
  private tilesets: Map<string, Tileset> = new Map()
  private currentTileset: Tileset | null = null
  private missingSprites: Set<string> = new Set()

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
   * @param char - Character or monster name to look up (e.g., '@', 'A', '#', '.', 'Troll')
   * @returns Tile coordinate or null if not found
   */
  getSprite(char: string): TileCoordinate | null {
    if (!this.currentTileset) {
      console.warn('[AssetLoader] No tileset loaded')
      return null
    }

    let sprite: TileCoordinate | null = null

    // For multi-character strings, assume it's a monster name
    if (char.length > 1) {
      // Try looking up as "monster:Name" in tileset
      sprite = this.currentTileset.config.tiles.get(char)
      if (sprite) return sprite

      // Try with common Angband monster prefixes as fallbacks
      const prefixes = ['', 'Forest ', 'Stone ', 'Cave ', 'Hill ', 'Mountain ', 'Snow ', 'Scruffy little ']
      const suffixes = ['', ' scavenger', ' chieftain']

      for (const prefix of prefixes) {
        for (const suffix of suffixes) {
          const variant = `${prefix}${char}${suffix}`
          // Try exact case
          sprite = this.currentTileset.config.tiles.get(variant)
          if (sprite) return sprite

          // Try lowercase
          const lowercaseVariant = variant.toLowerCase()
          sprite = this.currentTileset.config.tiles.get(lowercaseVariant)
          if (sprite) return sprite
        }
      }

      // Last resort: Try suffix matching (e.g., "Bat" matches "Fruit bat")
      // This handles cases where monsters.json has simple names but .prf has variants
      const lowerName = char.toLowerCase()
      for (const [key, coord] of this.currentTileset.config.tiles.entries()) {
        if (key.toLowerCase().endsWith(lowerName) || key.toLowerCase().endsWith(` ${lowerName}`)) {
          return coord
        }
      }
    } else {
      // Single character - try direct lookup first (for monster letters A-Z, etc.)
      sprite = this.currentTileset.config.tiles.get(char)
      if (sprite) return sprite

      // Try mapping to Angband feature names
      const featureNames = CHAR_TO_ANGBAND[char]
      if (featureNames) {
        // Try each feature name with different conditions
        const conditions = ['torch', 'lit', 'los', '*', ''] // Common conditions in .prf files

        for (const featureName of featureNames) {
          for (const condition of conditions) {
            const key = condition ? `${featureName}:${condition}` : featureName
            sprite = this.currentTileset.config.tiles.get(key)
            if (sprite) return sprite
          }
        }
      }
    }

    // Debug: Log missing sprite (only once per character)
    if (!this.missingSprites.has(char)) {
      this.missingSprites.add(char)
      console.warn(`[AssetLoader] Sprite not found for '${char}'`)
      // Log a few example keys to help debugging
      const examples = Array.from(this.currentTileset.config.tiles.keys()).slice(0, 20)
      console.log('[AssetLoader] Example sprite keys:', examples.join(', '))
    }

    return null
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
