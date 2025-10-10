import { PrfEntry, TileCoordinate } from '@assets/assets'

// ============================================================================
// PRF FILE PARSER - Angband tile mapping format
// ============================================================================

/**
 * Parse Angband .prf file content into structured entries
 *
 * Format examples:
 * - feat:FLOOR:torch:0x96:0x80
 * - monster:Bat:0x8B:0x81
 * - object:potion:Healing:0x82:0x80
 * - trap:poison gas trap:*:0x87:0xB8
 *
 * @param content - Raw .prf file content (text)
 * @returns Array of parsed entries
 */
export function parsePrfFile(content: string): PrfEntry[] {
  const entries: PrfEntry[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue
    }

    try {
      const entry = parsePrfLine(line)
      if (entry) {
        entries.push(entry)
      }
    } catch (error) {
      console.warn(`[prfParser] Failed to parse line ${i + 1}: ${line}`, error)
      // Continue parsing other lines
    }
  }

  return entries
}

/**
 * Parse a single .prf line into a PrfEntry
 *
 * @param line - Single line from .prf file
 * @returns Parsed entry or null if invalid
 */
function parsePrfLine(line: string): PrfEntry | null {
  const parts = line.split(':')

  // Minimum format: type:name:hexY:hexX (4 parts)
  if (parts.length < 4) {
    return null
  }

  const type = parts[0] as PrfEntry['type']
  let hexY: number
  let hexX: number

  // Parse based on type (different formats)
  switch (type) {
    case 'feat':
      // feat:NAME:CONDITION:0xYY:0xXX (5 parts)
      if (parts.length < 5) return null
      return {
        type: 'feat',
        name: parts[1],
        condition: parts[2],
        hexY: parseHex(parts[3]),
        hexX: parseHex(parts[4]),
        rawLine: line,
      }

    case 'monster':
      // monster:NAME:0xYY:0xXX (4 parts)
      if (parts.length < 4) return null
      return {
        type: 'monster',
        name: parts[1],
        hexY: parseHex(parts[2]),
        hexX: parseHex(parts[3]),
        rawLine: line,
      }

    case 'object':
      // object:CATEGORY:NAME:0xYY:0xXX (5 parts)
      if (parts.length < 5) return null
      return {
        type: 'object',
        category: parts[1],
        name: parts[2],
        hexY: parseHex(parts[3]),
        hexX: parseHex(parts[4]),
        rawLine: line,
      }

    case 'trap':
      // trap:NAME:CONDITION:0xYY:0xXX (5 parts)
      if (parts.length < 5) return null
      return {
        type: 'trap',
        name: parts[1],
        condition: parts[2],
        hexY: parseHex(parts[3]),
        hexX: parseHex(parts[4]),
        rawLine: line,
      }

    default:
      // Unknown type - try to parse as generic format
      hexY = parseHex(parts[parts.length - 2])
      hexX = parseHex(parts[parts.length - 1])
      return {
        type: 'unknown',
        name: parts.slice(1, -2).join(':'),
        hexY,
        hexX,
        rawLine: line,
      }
  }
}

/**
 * Parse hexadecimal string (0xNN) to decimal number
 *
 * @param hexString - Hex string like "0x80", "0x96", etc.
 * @returns Decimal number
 * @throws Error if not valid hex format
 */
function parseHex(hexString: string): number {
  if (!hexString.startsWith('0x')) {
    throw new Error(`Invalid hex format: ${hexString} (must start with 0x)`)
  }

  const decimal = parseInt(hexString, 16)

  if (isNaN(decimal)) {
    throw new Error(`Failed to parse hex: ${hexString}`)
  }

  return decimal
}

/**
 * Convert Angband hex coordinate to pixel offset
 *
 * Angband uses 0x80:0x80 as the base offset (origin of sprite sheet)
 * Formula: pixelOffset = (hex - 0x80) * tileSize
 *
 * @param hex - Hex value from .prf file (e.g., 0x80, 0x96)
 * @param tileSize - Tile size in pixels (32 for Gervais tileset)
 * @returns Pixel offset in sprite sheet
 */
export function hexToPixel(hex: number, tileSize: number): number {
  const BASE_OFFSET = 0x80
  return (hex - BASE_OFFSET) * tileSize
}

/**
 * Convert PrfEntry to TileCoordinate (pixel space)
 *
 * @param entry - Parsed .prf entry
 * @param tileSize - Tile size in pixels (default: 32)
 * @returns Tile coordinate with pixel offsets
 */
export function prfEntryToCoordinate(entry: PrfEntry, tileSize = 32): TileCoordinate {
  return {
    x: hexToPixel(entry.hexX, tileSize),
    y: hexToPixel(entry.hexY, tileSize),
    hexX: entry.hexX,
    hexY: entry.hexY,
  }
}

/**
 * Build a lookup map from .prf entries
 *
 * Maps game characters/entities to sprite coordinates
 * For features, uses condition-specific mappings (e.g., "FLOOR:torch")
 *
 * @param entries - Parsed .prf entries
 * @param tileSize - Tile size in pixels (default: 32)
 * @returns Map of lookup keys → tile coordinates
 */
export function buildLookupMap(entries: PrfEntry[], tileSize = 32): Map<string, TileCoordinate> {
  const map = new Map<string, TileCoordinate>()

  for (const entry of entries) {
    const coordinate = prfEntryToCoordinate(entry, tileSize)

    // Create lookup keys based on entry type
    let keys: string[] = []

    switch (entry.type) {
      case 'feat':
        // Key: "FLOOR:torch", "CLOSED:torch", etc.
        if (entry.condition) {
          keys.push(`${entry.name}:${entry.condition}`)
        }
        keys.push(entry.name) // Fallback without condition
        break

      case 'monster':
        // Key: monster name
        keys.push(entry.name)
        break

      case 'object':
        // Key: "category:name" and just "name"
        if (entry.category) {
          keys.push(`${entry.category}:${entry.name}`)
        }
        keys.push(entry.name)
        break

      case 'trap':
        // Key: trap name
        keys.push(entry.name)
        break

      default:
        // Unknown type - use name as key
        keys.push(entry.name)
    }

    // Add all keys to map
    for (const key of keys) {
      if (!map.has(key)) {
        map.set(key, coordinate)
      }
    }
  }

  return map
}
