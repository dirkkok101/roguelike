/**
 * TerrainSpriteService
 *
 * Manages terrain sprite mappings from terrain-sprites.json.
 * Provides sprite lookup by character with lighting variant support.
 *
 * Design Principles:
 * - Data-driven: Loads terrain sprite mappings from JSON (single source of truth)
 * - Lighting support: Returns appropriate sprite variant based on lighting condition
 * - Fallback logic: Returns default variant if specific lighting not available
 *
 * Dependencies: None (pure data service)
 */

/**
 * Lighting conditions for terrain sprites
 */
export type LightingCondition = 'torch' | 'lit' | 'los' | 'dark' | 'default'

/**
 * Terrain sprite configuration from terrain-sprites.json
 */
export interface TerrainSpriteConfig {
  char: string
  spriteName: string
  walkable: boolean
  description: string
  variants?: {
    torch?: string
    lit?: string
    los?: string
    dark?: string
    default: string
  }
}

/**
 * Terrain sprites data structure (from terrain-sprites.json)
 */
export interface TerrainSpritesData {
  [key: string]: TerrainSpriteConfig
}

export class TerrainSpriteService {
  private spriteMap: Map<string, TerrainSpriteConfig> = new Map()
  private charMap: Map<string, TerrainSpriteConfig> = new Map()
  private dataLoaded = false

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Load terrain sprite data from JSON file
   *
   * Should be called once at game initialization before any rendering.
   * Fetches terrain-sprites.json, validates structure, and caches in memory.
   *
   * @throws Error if fetch fails or JSON is malformed
   */
  async loadTerrainSprites(): Promise<void> {
    // Prevent duplicate loads
    if (this.dataLoaded) {
      return
    }

    try {
      const response = await fetch('/data/terrain-sprites.json')

      if (!response.ok) {
        throw new Error(
          `Failed to fetch terrain-sprites.json: ${response.status} ${response.statusText}`
        )
      }

      const data: TerrainSpritesData = await response.json()

      // Validate and store
      this.validateTerrainData(data)
      this.buildMaps(data)
      this.dataLoaded = true
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load terrain sprite data: ${error.message}`)
      }
      throw new Error('Failed to load terrain sprite data: Unknown error')
    }
  }

  /**
   * Get sprite name for a terrain character
   *
   * Returns the base sprite name without lighting variant.
   * Use getSpriteNameWithLighting() for lighting-aware lookup.
   *
   * @param char - Terrain character (e.g., '.', '#', '+')
   * @returns Sprite name if found, null if not found
   */
  getSpriteName(char: string): string | null {
    // Ensure data is loaded
    if (!this.dataLoaded) {
      console.warn('[TerrainSpriteService] Data not loaded. Call loadTerrainSprites() first.')
      return null
    }

    const config = this.charMap.get(char)
    return config ? config.spriteName : null
  }

  /**
   * Get sprite name for a terrain character with lighting variant
   *
   * Returns the appropriate sprite variant based on lighting condition.
   * Falls back to default variant if specific lighting not available.
   *
   * @param char - Terrain character (e.g., '.', '#', '+')
   * @param lighting - Lighting condition (torch/lit/los/dark)
   * @returns Sprite name with variant (e.g., 'FLOOR:torch') or null if not found
   */
  getSpriteNameWithLighting(
    char: string,
    lighting: LightingCondition = 'torch'
  ): string | null {
    // Ensure data is loaded
    if (!this.dataLoaded) {
      console.warn('[TerrainSpriteService] Data not loaded. Call loadTerrainSprites() first.')
      return null
    }

    const config = this.charMap.get(char)
    if (!config) {
      return null
    }

    // If no variants defined, return base sprite name
    if (!config.variants) {
      return config.spriteName
    }

    // Try to get specific lighting variant
    const variant = config.variants[lighting]
    if (variant) {
      return variant
    }

    // Fallback to default variant
    return config.variants.default
  }

  /**
   * Get terrain configuration by character
   *
   * Returns full terrain configuration including walkability and description.
   * Useful for game logic that needs more than just sprite name.
   *
   * @param char - Terrain character (e.g., '.', '#', '+')
   * @returns Full terrain config or null if not found
   */
  getTerrainConfig(char: string): TerrainSpriteConfig | null {
    if (!this.dataLoaded) {
      console.warn('[TerrainSpriteService] Data not loaded. Call loadTerrainSprites() first.')
      return null
    }

    return this.charMap.get(char) || null
  }

  /**
   * Check if terrain data has been loaded
   *
   * @returns true if data is loaded, false otherwise
   */
  isLoaded(): boolean {
    return this.dataLoaded
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate terrain sprite data structure
   * @private
   */
  private validateTerrainData(data: TerrainSpritesData): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Terrain data must be an object')
    }

    const keys = Object.keys(data)
    if (keys.length === 0) {
      throw new Error('Terrain data is empty')
    }

    // Validate each terrain config
    for (const [key, config] of Object.entries(data)) {
      // Check required fields
      const requiredFields = ['char', 'spriteName', 'walkable', 'description']

      for (const field of requiredFields) {
        if (!(field in config)) {
          throw new Error(`Terrain config '${key}' missing required field: ${field}`)
        }
      }

      // Validate types
      if (typeof config.char !== 'string' || config.char.length !== 1) {
        throw new Error(`Terrain config '${key}': char must be a single character string`)
      }

      if (typeof config.spriteName !== 'string') {
        throw new Error(`Terrain config '${key}': spriteName must be a string`)
      }

      if (typeof config.walkable !== 'boolean') {
        throw new Error(`Terrain config '${key}': walkable must be a boolean`)
      }

      if (typeof config.description !== 'string') {
        throw new Error(`Terrain config '${key}': description must be a string`)
      }

      // Validate variants if present
      if (config.variants) {
        if (typeof config.variants !== 'object' || config.variants === null) {
          throw new Error(`Terrain config '${key}': variants must be an object`)
        }

        if (!('default' in config.variants)) {
          throw new Error(`Terrain config '${key}': variants must have a 'default' field`)
        }
      }
    }
  }

  /**
   * Build lookup maps from terrain data
   * @private
   */
  private buildMaps(data: TerrainSpritesData): void {
    this.spriteMap.clear()
    this.charMap.clear()

    for (const [key, config] of Object.entries(data)) {
      this.spriteMap.set(key, config)
      this.charMap.set(config.char, config)
    }
  }
}
