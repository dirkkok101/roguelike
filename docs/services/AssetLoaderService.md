# AssetLoaderService

**Type**: Core Service
**Responsibilities**: Load sprite sheets, parse .prf tile mappings, cache loaded assets
**Dependencies**: None (uses browser Image API and fetch API)
**Created**: Phase 1 - Sprite Rendering Implementation

---

## Overview

The `AssetLoaderService` is responsible for loading and managing sprite tilesets for the game's canvas-based rendering system. It loads PNG sprite sheets, parses Angband .prf mapping files, and provides fast sprite coordinate lookups.

### Key Features

- **Asynchronous Loading**: Loads PNG images and .prf files via promises
- **Multiple Format Support**: Parses Angband .prf format (feat, monster, object, trap entries)
- **Hex to Pixel Conversion**: Converts Angband hex coordinates (0x80 base) to pixel offsets
- **Character Mapping**: Maps ASCII characters to Angband feature names
- **Caching**: Caches loaded tilesets to avoid duplicate network requests
- **Error Handling**: Graceful degradation when assets fail to load

---

## Architecture

### Service Location
```
src/services/AssetLoaderService/
├── AssetLoaderService.ts          # Service implementation
├── asset-loading.test.ts          # Unit tests (17 tests)
└── index.ts                       # Barrel export
```

### Dependencies
- **Browser APIs**: `Image`, `fetch`
- **Utilities**: `prfParser` (hex parsing, .prf format parsing)
- **Types**: `Tileset`, `TileCoordinate`, `PrfEntry` from `@assets/assets`

---

## Public API

### Core Methods

#### `loadTileset(imageUrl: string, prfFiles: string[], tileSize = 32): Promise<Tileset>`

Load a complete tileset from PNG sprite sheet and .prf mapping files.

**Parameters:**
- `imageUrl`: Path to sprite sheet PNG (e.g., `/assets/tilesets/gervais/32x32.png`)
- `prfFiles`: Array of .prf file paths to parse
- `tileSize`: Tile size in pixels (default: 32)

**Returns:** Promise resolving to loaded `Tileset` object

**Example:**
```typescript
const assetLoader = new AssetLoaderService()

await assetLoader.loadTileset(
  '/assets/tilesets/gervais/32x32.png',
  [
    '/assets/tilesets/gervais/graf-dvg.prf',
    '/assets/tilesets/gervais/flvr-dvg.prf',
    '/assets/tilesets/gervais/xtra-dvg.prf'
  ],
  32
)
```

**Error Handling:**
- Throws error if PNG fails to load (404, network error)
- Throws error if .prf files fail to fetch
- Throws error if .prf parsing fails

---

#### `getSprite(char: string): TileCoordinate | null`

Get sprite coordinates for a game character or entity.

**Parameters:**
- `char`: Character to look up (e.g., `'@'`, `'A'`, `'#'`, `'.'`)

**Returns:** `TileCoordinate` object or `null` if not found

**Lookup Strategy:**
1. Try direct character lookup (for monster letters A-Z)
2. Map character to Angband feature names (e.g., `'@'` → `'<player>'`)
3. Try feature names with different conditions: `torch`, `lit`, `los`, `*`, no condition

**Example:**
```typescript
const playerSprite = assetLoader.getSprite('@')
// Returns: { x: 224, y: 96, hexX: 0x87, hexY: 0x83 }

const floorSprite = assetLoader.getSprite('.')
// Returns: { x: 704, y: 0, hexX: 0x80, hexY: 0x96 }

const wallSprite = assetLoader.getSprite('#')
// Returns: { x: 576, y: 0, hexX: 0x92, hexY: 0x96 }
```

---

#### `getSpriteByName(type: string, name: string, condition?: string): TileCoordinate | null`

Get sprite by entity type and name (for advanced lookups).

**Parameters:**
- `type`: Entity type (`"feat"`, `"monster"`, `"object"`, `"trap"`)
- `name`: Entity name (e.g., `"FLOOR"`, `"Bat"`, `"Healing"`)
- `condition`: Optional condition (e.g., `"torch"`, `"lit"`)

**Returns:** `TileCoordinate` object or `null` if not found

**Example:**
```typescript
const litFloor = assetLoader.getSpriteByName('feat', 'FLOOR', 'lit')
const darkFloor = assetLoader.getSpriteByName('feat', 'FLOOR', 'dark')
const bat = assetLoader.getSpriteByName('monster', 'Bat')
```

---

#### `isLoaded(): boolean`

Check if a tileset is currently loaded.

**Returns:** `true` if tileset loaded, `false` otherwise

**Example:**
```typescript
if (assetLoader.isLoaded()) {
  renderer.render(gameState)
} else {
  showLoadingScreen()
}
```

---

#### `getCurrentTileset(): Tileset | null`

Get the currently loaded tileset object.

**Returns:** `Tileset` object or `null` if not loaded

**Example:**
```typescript
const tileset = assetLoader.getCurrentTileset()
if (tileset) {
  console.log(`Loaded: ${tileset.config.name}`)
  console.log(`Dimensions: ${tileset.image.width}×${tileset.image.height}`)
}
```

---

#### `clearCache(): void`

Clear all cached tilesets (useful for hot-reloading during development).

**Example:**
```typescript
assetLoader.clearCache()
await assetLoader.loadTileset(...) // Reload from network
```

---

## Character Mapping

The service includes a built-in mapping from ASCII characters to Angband feature names:

| Character | Angband Features | Description |
|-----------|------------------|-------------|
| `@` | `<player>` | Player character |
| `.` | `FLOOR` | Floor tile |
| `#` | `GRANITE`, `PERM` | Walls |
| `+` | `CLOSED` | Closed door |
| `-` | `OPEN` | Open door |
| `<` | `LESS` | Up stairs |
| `>` | `MORE` | Down stairs |
| `^` | `trap` | Trap |
| `%` | `RUBBLE` | Rubble |
| `*` | `MAGMA`, `QUARTZ` | Mineral veins |
| `$` | `gold` | Gold |
| `!` | `potion` | Potion |
| `?` | `scroll` | Scroll |
| `=` | `ring` | Ring |
| `/` | `wand`, `staff` | Wand/Staff |
| `)` | `sword`, `weapon` | Weapon |
| `[` | `armor` | Armor |

---

## Angband .prf Format

The service parses Angband .prf tile mapping files with the following format:

### Format Examples

```
# Features (terrain)
feat:FLOOR:torch:0x96:0x80
feat:CLOSED:lit:0x96:0x84
feat:OPEN:dark:0x96:0x88

# Monsters
monster:Bat:0x90:0x80
monster:Kobold:0x8D:0x8C

# Objects (items)
object:potion:Healing:0x82:0x80
object:scroll:Light:0x82:0x81

# Traps
trap:poison gas trap:*:0x83:0x80
```

### Coordinate Conversion

Angband uses hexadecimal coordinates with a base offset of `0x80:0x80`.

**Formula:**
```
pixelX = (hexX - 0x80) × tileSize
pixelY = (hexY - 0x80) × tileSize
```

**Examples:**
- `0x80:0x80` → pixel `(0, 0)`
- `0x81:0x83` → pixel `(96, 32)` because `(0x83 - 0x80) × 32 = 96`, `(0x81 - 0x80) × 32 = 32`
- `0x96:0x92` → pixel `(576, 704)` because `(0x92 - 0x80) × 32 = 576`, `(0x96 - 0x80) × 32 = 704`

---

## Usage Patterns

### Basic Setup (in main.ts)

```typescript
import { AssetLoaderService } from '@services/AssetLoaderService'

const assetLoader = new AssetLoaderService()

// Load tileset before starting game
await assetLoader.loadTileset(
  '/assets/tilesets/gervais/32x32.png',
  [
    '/assets/tilesets/gervais/graf-dvg.prf',
    '/assets/tilesets/gervais/flvr-dvg.prf',
    '/assets/tilesets/gervais/xtra-dvg.prf'
  ]
)

// Pass to renderer
const renderer = new CanvasGameRenderer(
  renderingService,
  assetLoader,  // ← Pass asset loader
  canvasElement,
  config
)
```

### Sprite Lookup in Renderer

```typescript
// In CanvasGameRenderer
renderTerrain(state: GameState): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = level.tiles[y][x]

      // Look up sprite for tile character
      const sprite = this.assetLoader.getSprite(tile.char)
      if (sprite) {
        this.drawTile(x, y, sprite, opacity)
      }
    }
  }
}
```

### Error Handling

```typescript
try {
  await assetLoader.loadTileset(imageUrl, prfFiles)
  console.log('Tileset loaded successfully')
} catch (error) {
  console.error('Failed to load tileset:', error)

  // Fall back to ASCII rendering
  renderer = new TextBasedRenderer(...)
}
```

---

## Performance Considerations

### Caching

- Tilesets are cached by a composite key: `imageUrl|prfFile1|prfFile2|...`
- Subsequent loads of the same tileset return the cached version
- No duplicate network requests

### Lookup Performance

- Sprite lookups use `Map.get()` (O(1) average case)
- Character mapping tries multiple conditions in sequence (O(1) per condition)
- Maximum ~5 lookups per character (direct + 4 condition variants)

### Memory Usage

- One `HTMLImageElement` per loaded tileset (~4MB for 4096×960 PNG)
- One `Map<string, TileCoordinate>` with ~1600 entries (~50KB)
- Total memory: ~4-5MB per tileset

---

## Testing

### Test Coverage

- **File**: `asset-loading.test.ts`
- **Tests**: 17 passing
- **Coverage**: >90%

### Test Scenarios

1. ✓ Load tileset successfully (PNG + .prf files)
2. ✓ Parse .prf format correctly (feat, monster, object, trap entries)
3. ✓ Hex to pixel conversion accuracy
4. ✓ Handle missing assets (404 error)
5. ✓ Handle malformed .prf syntax
6. ✓ Cache behavior (avoid duplicate loads)
7. ✓ Get sprite coordinates for valid/invalid characters
8. ✓ Character to Angband feature mapping
9. ✓ Multiple condition variants (torch, lit, los, *)

---

## Known Issues & Limitations

### Missing Sprites

- Not all game entities have exact Angband sprite matches
- Monsters without matching names will not render
- Future: Add fallback generic sprites or ASCII fallback

### .prf Format Limitations

- Conditional syntax (`?:[AND [EQU $CLASS Warrior]]`) is ignored
- Only basic entry types supported (feat, monster, object, trap)
- Category and condition fields partially supported

### Tileset Compatibility

- Only tested with Gervais 32×32 tileset
- Other Angband tilesets may use different naming conventions
- Future: Add support for multiple tileset formats

---

## Future Enhancements

1. **Fallback Sprites**: Add generic fallback for missing sprite definitions
2. **Multiple Tilesets**: Support loading/switching between different tilesets
3. **Sprite Variants**: Support color variants (e.g., colored potions)
4. **Animation Support**: Load animated sprite sequences
5. **Compression**: Support compressed sprite sheets (WebP, basis)

---

## Related Documentation

- [CanvasGameRenderer](../ui/CanvasGameRenderer.md) - Uses AssetLoaderService for rendering
- [prfParser Utility](../../src/utils/prfParser.ts) - .prf file parsing implementation
- [Architecture](../architecture.md) - Service layer architecture
- [Sprite Rendering Plan](../plans/sprite_rendering_plan.md) - Implementation plan

---

**Last Updated**: 2025-10-09
**Phase**: Sprite Rendering Implementation (Phase 1-3 Complete)
