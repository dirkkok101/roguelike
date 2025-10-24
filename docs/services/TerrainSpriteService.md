# TerrainSpriteService

**Location**: `src/services/TerrainSpriteService/TerrainSpriteService.ts`
**Dependencies**: None (browser fetch API)
**Test Coverage**: None (data-driven service)

---

## Purpose

Data-driven terrain sprite mappings from `terrain-sprites.json`. Provides sprite lookup by character with lighting variant support for dynamic terrain rendering.

---

## Public API

### Data Loading

#### `loadTerrainSprites(): Promise<void>`
Loads terrain sprite data from JSON file.

**Rules**:
- Call once at game initialization before rendering
- Fetches `/data/terrain-sprites.json`
- Validates structure and caches in memory
- Safe to call multiple times (idempotent)
- Throws on fetch failure or malformed JSON

**Example**:
```typescript
const service = new TerrainSpriteService()

await service.loadTerrainSprites()
// Data loaded and validated
```

---

#### `isLoaded(): boolean`
Checks if terrain data has been loaded.

**Returns**:
```typescript
boolean  // true if data loaded, false otherwise
```

**Example**:
```typescript
if (!service.isLoaded()) {
  await service.loadTerrainSprites()
}
```

---

### Sprite Lookup

#### `getSpriteName(char: string): string | null`
Gets base sprite name for terrain character.

**Parameters**:
- `char` - Terrain character (e.g., `'.'`, `'#'`, `'+'`)

**Returns**:
```typescript
string | null  // Sprite name or null if not found
```

**Rules**:
- Returns base sprite name without lighting variant
- Warns if data not loaded
- Returns `null` for unknown characters

**Example**:
```typescript
const spriteName = service.getSpriteName('.')
// spriteName: 'FLOOR' or null
```

---

#### `getSpriteNameWithLighting(char: string, lighting?: LightingCondition): string | null`
Gets sprite name with lighting variant.

**Parameters**:
- `char` - Terrain character
- `lighting` - Lighting condition (default: `'torch'`)

**Returns**:
```typescript
string | null  // Sprite variant (e.g., 'FLOOR:torch') or null
```

**Lighting Conditions**:
```typescript
type LightingCondition = 'torch' | 'lit' | 'los' | 'dark' | 'default'
```

**Rules**:
- Returns specific lighting variant if available
- Falls back to `'default'` variant if specific not available
- Returns base sprite name if no variants defined
- Returns `null` for unknown characters

**Example**:
```typescript
// Get torch-lit floor sprite
const torch = service.getSpriteNameWithLighting('.', 'torch')
// torch: 'FLOOR:torch'

// Get dark floor sprite
const dark = service.getSpriteNameWithLighting('.', 'dark')
// dark: 'FLOOR:dark'

// Fallback behavior
const wall = service.getSpriteNameWithLighting('#', 'torch')
// wall: 'WALL' (no variants defined, returns base)
```

---

#### `getTerrainConfig(char: string): TerrainSpriteConfig | null`
Gets full terrain configuration.

**Parameters**:
- `char` - Terrain character

**Returns**:
```typescript
interface TerrainSpriteConfig {
  char: string          // Terrain character
  spriteName: string    // Base sprite name
  walkable: boolean     // Can player walk on this?
  description: string   // Human-readable name
  variants?: {          // Optional lighting variants
    torch?: string
    lit?: string
    los?: string
    dark?: string
    default: string
  }
}
```

**Example**:
```typescript
const config = service.getTerrainConfig('.')
// config: {
//   char: '.',
//   spriteName: 'FLOOR',
//   walkable: true,
//   description: 'Stone floor',
//   variants: { ... }
// }

// Use for game logic
if (config?.walkable) {
  allowMovement(position)
}
```

---

## Integration Notes

**Used By**:
- CanvasGameRenderer (sprite rendering with lighting)
- RenderingService (terrain display)
- LevelService (terrain validation)

**Usage Pattern**:
```typescript
const terrainService = new TerrainSpriteService()

// Load on startup
await terrainService.loadTerrainSprites()

// Rendering loop
function renderTerrain(char: string, lighting: LightingCondition) {
  const spriteName = terrainService.getSpriteNameWithLighting(char, lighting)
  if (spriteName) {
    drawSprite(spriteName)
  }
}

// Game logic
function canWalkOn(char: string): boolean {
  const config = terrainService.getTerrainConfig(char)
  return config?.walkable ?? false
}
```

---

## Testing

**Test Files**: None (data-driven service)

**Coverage**: Manually tested via integration

**Note**: Could benefit from unit tests covering:
- JSON loading and validation
- Sprite lookup by character
- Lighting variant fallback logic
- Error handling for malformed data

---

## Related Services

- [AssetLoaderService](./AssetLoaderService.md) - Loads sprite sheets referenced by this service
- [RenderingService](./RenderingService.md) - Uses terrain sprites for rendering
- CanvasGameRenderer - Renders terrain sprites with lighting

---

## Technical Details

**Data File Location**: `/data/terrain-sprites.json`

**JSON Structure**:
```json
{
  "FLOOR": {
    "char": ".",
    "spriteName": "FLOOR",
    "walkable": true,
    "description": "Stone floor",
    "variants": {
      "torch": "FLOOR:torch",
      "lit": "FLOOR:lit",
      "los": "FLOOR:los",
      "dark": "FLOOR:dark",
      "default": "FLOOR"
    }
  },
  "WALL": {
    "char": "#",
    "spriteName": "WALL",
    "walkable": false,
    "description": "Stone wall"
  }
}
```

**Validation Rules**:
- All configs must have: `char`, `spriteName`, `walkable`, `description`
- `char` must be single character string
- `walkable` must be boolean
- If `variants` defined, must include `'default'` field

**Lighting Variants**:
| Condition | Usage |
|-----------|-------|
| `torch` | Torch/lantern light (radius 1-2) |
| `lit` | Artifact light (radius 3) |
| `los` | Line of sight (no light source) |
| `dark` | Explored but not visible |
| `default` | Fallback for any condition |

**Performance**:
- Data loaded once at startup
- Lookups use Map (O(1) performance)
- No runtime JSON parsing (cached in memory)

**Error Handling**:
- Throws on load failure (must be caught by caller)
- Warns on lookup before load
- Returns null for unknown characters (graceful degradation)
