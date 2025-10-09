// ============================================================================
// TILESET ASSET TYPES
// ============================================================================

/**
 * Tileset configuration for sprite-based rendering
 */
export interface TilesetConfig {
  name: string // "Gervais 32x32"
  tileWidth: number // 32
  tileHeight: number // 32
  imageUrl: string // "/assets/tilesets/gervais/32x32.png"
  tiles: Map<string, TileCoordinate> // Character → sprite mapping
}

/**
 * Sprite coordinate in pixel space
 */
export interface TileCoordinate {
  x: number // Pixel X offset (calculated from hex)
  y: number // Pixel Y offset (calculated from hex)
  hexX: number // Original hex value from .prf (e.g., 0x80, 0x81, ...)
  hexY: number // Original hex value from .prf (e.g., 0x80, 0x81, ...)
}

/**
 * Complete tileset with loaded image
 */
export interface Tileset {
  config: TilesetConfig
  image: HTMLImageElement
  isLoaded: boolean
}

/**
 * Parsed .prf file entry (Angband tile mapping format)
 */
export interface PrfEntry {
  type: 'feat' | 'monster' | 'object' | 'trap' | 'unknown'
  name: string // e.g., "FLOOR", "Bat", "Healing", "poison gas trap"
  category?: string // e.g., 'sword', 'FLOOR' (for objects/features)
  condition?: string // e.g., 'torch', 'lit', 'dark', '*' (wildcard)
  hexY: number // 0xYY attribute (row in sprite sheet)
  hexX: number // 0xXX character (column in sprite sheet)
  rawLine: string // Original line for debugging
}
