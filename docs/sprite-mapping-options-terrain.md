# Terrain Sprite Mapping Analysis - Gervais Tileset

**Purpose**: Comprehensive analysis of available terrain/feature sprites in the Gervais 32×32 tileset for implementing data-driven sprite mappings

**Created**: 2025-10-10

---

## Summary

**Total Feature Sprites**: 24 unique terrain types in graf-dvg.prf
**Lighting Variants**: 4 conditions per feature (torch, los, lit, dark)
**Total Sprite Entries**: 69+ feature entries

**Feature Categories**:
- Core Terrain: FLOOR, GRANITE, PERM
- Doors: CLOSED, OPEN, BROKEN
- Stairs: LESS (up), MORE (down)
- Rubble/Veins: RUBBLE, MAGMA, QUARTZ, LAVA
- Special: PASS_RUBBLE (passable rubble)
- Stores: 7 shop types (GENERAL, ARMOR, WEAPON, etc.)
- Miscellaneous: NONE (empty), HOME (player house)

---

## Current Character Mappings (CHAR_TO_ANGBAND)

**From AssetLoaderService.ts and validate-assets.js**:

```typescript
const CHAR_TO_ANGBAND = {
  '@': ['<player>'],     // Player character
  '.': ['FLOOR'],        // Floor
  '#': ['GRANITE', 'PERM'], // Walls
  '+': ['CLOSED'],       // Closed door
  "'": ['OPEN'],         // Open door (single quote)
  '<': ['LESS'],         // Up stairs
  '>': ['MORE'],         // Down stairs
  '^': ['trap'],         // Trap
  '%': ['RUBBLE'],       // Rubble
  '*': ['MAGMA', 'QUARTZ'], // Veins
  '$': ['gold'],         // Gold (item, not terrain)
  '!': ['potion'],       // Potion (item, not terrain)
  '?': ['scroll'],       // Scroll (item, not terrain)
  '=': ['ring'],         // Ring (item, not terrain)
  '/': ['wand', 'staff'], // Wand/Staff (item, not terrain)
  ')': ['sword', 'weapon'], // Weapon (item, not terrain)
  '[': ['armor'],        // Armor (item, not terrain)
}
```

**Problem**: Hardcoded mapping table mixes terrain and items, lacks lighting variants

---

## Available Terrain Sprites

### 🟫 Floor Tiles

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `FLOOR` | torch | 0x96:0x80 | Floor lit by torch |
| `FLOOR` | los | 0x96:0x80 | Floor in line of sight |
| `FLOOR` | lit | 0x96:0x81 | Floor in bright light |
| `FLOOR` | dark | 0x96:0x82 | Floor in darkness |

**Usage**: Every walkable dungeon tile (`.` character)

**Lighting Strategy**:
- `torch` - Within player's torch/lantern radius
- `los` - Within line of sight but dim
- `lit` - Permanently lit room (future feature)
- `dark` - Out of line of sight (explored but not visible)

---

### 🧱 Wall Tiles

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `GRANITE` | torch | 0x96:0x92 | Granite wall lit by torch |
| `GRANITE` | los | 0x96:0x92 | Granite wall in line of sight |
| `GRANITE` | lit | 0x96:0x93 | Granite wall in bright light |
| `GRANITE` | dark | 0x96:0x94 | Granite wall in darkness |
| `PERM` | *(no variants)* | *(not in .prf)* | Permanent wall (indestructible) |

**Usage**: Impassable walls (`#` character)

**Note**: PERM might use GRANITE sprites or have separate visuals (need to verify)

---

### 🚪 Doors

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `CLOSED` | torch | 0x96:0x83 | Closed door lit by torch |
| `CLOSED` | los | 0x96:0x83 | Closed door in line of sight |
| `CLOSED` | lit | 0x96:0x84 | Closed door in bright light |
| `CLOSED` | dark | 0x96:0x85 | Closed door in darkness |
| `OPEN` | torch | 0x96:0x86 | Open door lit by torch |
| `OPEN` | los | 0x96:0x86 | Open door in line of sight |
| `OPEN` | lit | 0x96:0x87 | Open door in bright light |
| `OPEN` | dark | 0x96:0x88 | Open door in darkness |
| `BROKEN` | torch | 0x96:0x89 | Broken door lit by torch |
| `BROKEN` | los | 0x96:0x89 | Broken door in line of sight |
| `BROKEN` | lit | 0x96:0x8A | Broken door in bright light |
| `BROKEN` | dark | 0x96:0x8B | Broken door in darkness |

**Usage**:
- `CLOSED` - Closed door (`+` character)
- `OPEN` - Open door (`'` character)
- `BROKEN` - Broken/bashed door (currently unused, but available)

**Future Door States** (not in current game):
- Locked doors (use CLOSED sprite with indicator?)
- Secret doors (use GRANITE sprite until discovered)
- Archways (alternative to OPEN?)

---

### 🪜 Stairs

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `LESS` | torch | 0x96:0x8C | Up stairs lit by torch |
| `LESS` | los | 0x96:0x8C | Up stairs in line of sight |
| `LESS` | lit | 0x96:0x8D | Up stairs in bright light |
| `LESS` | dark | 0x96:0x8E | Up stairs in darkness |
| `MORE` | torch | 0x96:0x8F | Down stairs lit by torch |
| `MORE` | los | 0x96:0x8F | Down stairs in line of sight |
| `MORE` | lit | 0x96:0x90 | Down stairs in bright light |
| `MORE` | dark | 0x96:0x91 | Down stairs in darkness |

**Usage**:
- `LESS` - Stairs up (`<` character)
- `MORE` - Stairs down (`>` character)

**Note**: "LESS" and "MORE" are Angband naming (less-than/greater-than symbols)

---

### 🪨 Rubble and Veins

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `RUBBLE` | torch | 0x9B:0x96 | Rubble lit by torch |
| `RUBBLE` | los | 0x9B:0x96 | Rubble in line of sight |
| `RUBBLE` | lit | 0x9B:0x97 | Rubble in bright light |
| `RUBBLE` | dark | 0x9B:0x98 | Rubble in darkness |
| `PASS_RUBBLE` | *(no variants)* | *(check .prf)* | Passable rubble (can walk through) |
| `MAGMA` | torch | 0x96:0x95 | Magma vein lit by torch |
| `MAGMA` | los | 0x96:0x95 | Magma vein in line of sight |
| `MAGMA` | lit | 0x96:0x96 | Magma vein in bright light |
| `MAGMA` | dark | 0x96:0x97 | Magma vein in darkness |
| `QUARTZ` | torch | 0x96:0x98 | Quartz vein lit by torch |
| `QUARTZ` | los | 0x96:0x98 | Quartz vein in line of sight |
| `QUARTZ` | lit | 0x96:0x99 | Quartz vein in bright light |
| `QUARTZ` | dark | 0x96:0x9A | Quartz vein in darkness |
| `LAVA` | torch | 0x96:0x9B | Lava lit by torch |
| `LAVA` | los | 0x96:0x9B | Lava in line of sight |
| `LAVA` | lit | 0x96:0x9C | Lava in bright light |
| `LAVA` | dark | 0x96:0x9D | Lava in darkness |

**Usage**:
- `RUBBLE` - Pile of rocks (`%` character) - impassable
- `MAGMA` - Magma vein (`*` character) - mineral deposits
- `QUARTZ` - Quartz vein (`*` character) - mineral deposits
- `LAVA` - Lava pools (currently unused)

**Note**: Currently our `*` character maps to both MAGMA and QUARTZ (alternates randomly?)

---

### 🏪 Stores and Buildings (Future Use)

Available store sprites (not currently used in dungeon generation):

| Feature Name | Hex Coordinates | Description |
|-------------|-----------------|-------------|
| `STORE_GENERAL` | 0x96:0xA4 | General store |
| `STORE_ARMOR` | 0x96:0xA5 | Armor shop |
| `STORE_WEAPON` | 0x96:0xA6 | Weapon shop |
| `STORE_BOOK` | 0x96:0xA2 | Book store |
| `STORE_ALCHEMY` | 0x96:0xA8 | Alchemy shop |
| `STORE_MAGIC` | 0x96:0xA9 | Magic shop |
| `STORE_BLACK` | 0x96:0xAB | Black market |
| `HOME` | 0x96:0xAA | Player's home |

**Note**: These are for town/hub levels (not implemented in current roguelike)

---

### 🎯 Special Tiles

| Feature Name | Variants | Hex Coordinates | Description |
|-------------|----------|-----------------|-------------|
| `NONE` | * | 0x80:0x80 | Empty/void tile |
| `<player>` | *(item, not terrain)* | *(check monster sprites)* | Player character sprite |

**Note**: Player is rendered as an entity, not terrain

---

## Lighting Variants Explained

**The Four Lighting Conditions**:

1. **`torch`** - Default for tiles within torch/lantern radius
   - Used when player is standing near the tile
   - Full brightness, full color

2. **`los`** - Line of sight but dim (same as torch in most cases)
   - Tiles visible but not directly lit
   - Useful for future "seen but not illuminated" mechanic

3. **`lit`** - Permanently lit (bright light)
   - Future feature: permanently lit rooms
   - Used for special areas (temples, treasure rooms, etc.)

4. **`dark`** - Out of sight (memory/explored)
   - Tiles that were seen but are no longer visible
   - Dimmed/grayed out appearance

**Current Game Usage**:
- ✅ Uses `torch` for tiles in FOV
- ❌ Does not use `lit` (no permanently lit rooms)
- ❌ Does not differentiate `los` from `torch`
- ✅ Could use `dark` for explored but not visible tiles (currently uses opacity instead)

---

## Proposed terrain-sprites.json Structure

### Option A: Flat Configuration (Simple)

```json
{
  "floor": {
    "char": ".",
    "spriteName": "FLOOR",
    "walkable": true,
    "description": "Stone floor",
    "variants": {
      "torch": "FLOOR:torch",
      "lit": "FLOOR:lit",
      "dark": "FLOOR:dark",
      "default": "FLOOR:torch"
    }
  },
  "wall": {
    "char": "#",
    "spriteName": "GRANITE",
    "walkable": false,
    "description": "Granite wall",
    "variants": {
      "torch": "GRANITE:torch",
      "lit": "GRANITE:lit",
      "dark": "GRANITE:dark",
      "default": "GRANITE:torch"
    }
  },
  "doorClosed": {
    "char": "+",
    "spriteName": "CLOSED",
    "walkable": false,
    "description": "Closed door",
    "variants": {
      "torch": "CLOSED:torch",
      "lit": "CLOSED:lit",
      "dark": "CLOSED:dark",
      "default": "CLOSED:torch"
    }
  },
  "doorOpen": {
    "char": "'",
    "spriteName": "OPEN",
    "walkable": true,
    "description": "Open door",
    "variants": {
      "torch": "OPEN:torch",
      "lit": "OPEN:lit",
      "dark": "OPEN:dark",
      "default": "OPEN:torch"
    }
  },
  "stairsUp": {
    "char": "<",
    "spriteName": "LESS",
    "walkable": true,
    "description": "Stairs up",
    "variants": {
      "torch": "LESS:torch",
      "lit": "LESS:lit",
      "dark": "LESS:dark",
      "default": "LESS:torch"
    }
  },
  "stairsDown": {
    "char": ">",
    "spriteName": "MORE",
    "walkable": true,
    "description": "Stairs down",
    "variants": {
      "torch": "MORE:torch",
      "lit": "MORE:lit",
      "dark": "MORE:dark",
      "default": "MORE:torch"
    }
  },
  "rubble": {
    "char": "%",
    "spriteName": "RUBBLE",
    "walkable": false,
    "description": "Pile of rubble",
    "variants": {
      "torch": "RUBBLE:torch",
      "lit": "RUBBLE:lit",
      "dark": "RUBBLE:dark",
      "default": "RUBBLE:torch"
    }
  },
  "trap": {
    "char": "^",
    "spriteName": "trap",
    "walkable": true,
    "description": "Trap",
    "variants": null
  }
}
```

### Option B: Hierarchical (Complex, Future)

```json
{
  "terrain": {
    "floors": [
      { "id": "floor", "char": ".", "spriteName": "FLOOR", "walkable": true }
    ],
    "walls": [
      { "id": "wall", "char": "#", "spriteName": "GRANITE", "walkable": false },
      { "id": "permWall", "char": "#", "spriteName": "PERM", "walkable": false }
    ],
    "doors": [
      { "id": "doorClosed", "char": "+", "spriteName": "CLOSED", "state": "closed" },
      { "id": "doorOpen", "char": "'", "spriteName": "OPEN", "state": "open" },
      { "id": "doorBroken", "char": "'", "spriteName": "BROKEN", "state": "broken" }
    ]
  }
}
```

**Recommendation**: **Option A** (flat) - simpler, more readable, easier to maintain

---

## Character-to-Sprite Mapping Table

**Current game terrain characters** and their proposed sprite names:

| Char | Current Name | Proposed spriteName | Lighting Support | Implementation Priority |
|------|-------------|--------------------|--------------------|------------------------|
| `.` | Floor | `FLOOR` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `#` | Wall (granite) | `GRANITE` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `+` | Closed door | `CLOSED` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `'` | Open door | `OPEN` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `<` | Stairs up | `LESS` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `>` | Stairs down | `MORE` | ✅ Full (4 variants) | ⭐⭐⭐ Phase 1 |
| `%` | Rubble | `RUBBLE` | ✅ Full (4 variants) | ⭐⭐ Phase 2 |
| `^` | Trap | `trap` | ❌ None (item sprite) | ⭐ Phase 3 |
| `*` | Magma/Quartz | `MAGMA` or `QUARTZ` | ✅ Full (4 variants) | ⭐ Phase 3 |

**Special Characters** (items, not terrain):
| Char | Type | Proposed spriteName | Notes |
|------|------|-----------------------|-------|
| `@` | Player | `<player>` | Rendered as entity, not terrain |
| `$` | Gold | `gold` | Item sprite, not terrain |

---

## Implementation Recommendations

### Phase 1: Core Terrain (High Priority)

**Create** `/public/data/terrain-sprites.json`:

```json
{
  "floor": {
    "char": ".",
    "spriteName": "FLOOR",
    "walkable": true,
    "description": "Stone floor",
    "variants": {
      "torch": "FLOOR:torch",
      "lit": "FLOOR:lit",
      "dark": "FLOOR:dark",
      "default": "FLOOR:torch"
    }
  },
  "wall": {
    "char": "#",
    "spriteName": "GRANITE",
    "walkable": false,
    "description": "Granite wall",
    "variants": {
      "torch": "GRANITE:torch",
      "lit": "GRANITE:lit",
      "dark": "GRANITE:dark",
      "default": "GRANITE:torch"
    }
  },
  "doorClosed": {
    "char": "+",
    "spriteName": "CLOSED",
    "walkable": false,
    "description": "Closed door",
    "variants": {
      "torch": "CLOSED:torch",
      "lit": "CLOSED:lit",
      "dark": "CLOSED:dark",
      "default": "CLOSED:torch"
    }
  },
  "doorOpen": {
    "char": "'",
    "spriteName": "OPEN",
    "walkable": true,
    "description": "Open door",
    "variants": {
      "torch": "OPEN:torch",
      "lit": "OPEN:lit",
      "dark": "OPEN:dark",
      "default": "OPEN:torch"
    }
  },
  "stairsUp": {
    "char": "<",
    "spriteName": "LESS",
    "walkable": true,
    "description": "Stairs up",
    "variants": {
      "torch": "LESS:torch",
      "lit": "LESS:lit",
      "dark": "LESS:dark",
      "default": "LESS:torch"
    }
  },
  "stairsDown": {
    "char": ">",
    "spriteName": "MORE",
    "walkable": true,
    "description": "Stairs down",
    "variants": {
      "torch": "MORE:torch",
      "lit": "MORE:lit",
      "dark": "MORE:dark",
      "default": "MORE:torch"
    }
  }
}
```

**Create** `TerrainSpriteService`:
```typescript
export class TerrainSpriteService {
  private spriteMap: Map<string, TerrainSpriteConfig> = new Map()

  async loadTerrainSprites(): Promise<void> {
    const response = await fetch('/data/terrain-sprites.json')
    const data = await response.json()

    for (const [key, config] of Object.entries(data)) {
      this.spriteMap.set(key, config as TerrainSpriteConfig)
    }
  }

  getSpriteName(char: string, lighting: 'torch' | 'lit' | 'dark' = 'torch'): string | null {
    for (const config of this.spriteMap.values()) {
      if (config.char === char) {
        if (config.variants) {
          return config.variants[lighting] || config.variants.default
        }
        return config.spriteName
      }
    }
    return null
  }
}
```

**Update** `AssetLoaderService`:
- Remove hardcoded `CHAR_TO_ANGBAND` constant (lines 126-144)
- Inject `TerrainSpriteService`
- Delegate terrain lookups to service

**Update** `CanvasGameRenderer`:
- Pass lighting condition to terrain sprite lookup
- Use `TerrainSpriteService.getSpriteName(char, lighting)`

---

### Phase 2: Secondary Terrain (Medium Priority)

**Add to terrain-sprites.json**:

```json
{
  "rubble": {
    "char": "%",
    "spriteName": "RUBBLE",
    "walkable": false,
    "description": "Pile of rubble",
    "variants": {
      "torch": "RUBBLE:torch",
      "lit": "RUBBLE:lit",
      "dark": "RUBBLE:dark",
      "default": "RUBBLE:torch"
    }
  },
  "magma": {
    "char": "*",
    "spriteName": "MAGMA",
    "walkable": false,
    "description": "Magma vein",
    "variants": {
      "torch": "MAGMA:torch",
      "lit": "MAGMA:lit",
      "dark": "MAGMA:dark",
      "default": "MAGMA:torch"
    }
  },
  "quartz": {
    "char": "*",
    "spriteName": "QUARTZ",
    "walkable": false,
    "description": "Quartz vein",
    "variants": {
      "torch": "QUARTZ:torch",
      "lit": "QUARTZ:lit",
      "dark": "QUARTZ:dark",
      "default": "QUARTZ:torch"
    }
  }
}
```

**Note**: Magma and Quartz both use `*` - need logic to randomly select between them

---

### Phase 3: Advanced Features (Future)

**Door States**:
```json
{
  "doorLocked": {
    "char": "+",
    "spriteName": "CLOSED",
    "state": "locked",
    "tint": "#FFD700"
  },
  "doorSecret": {
    "char": "#",
    "spriteName": "GRANITE",
    "state": "secret"
  },
  "doorBroken": {
    "char": "'",
    "spriteName": "BROKEN",
    "state": "broken"
  }
}
```

**Trap Variants**:
```json
{
  "trapBear": {
    "char": "^",
    "spriteName": "trap:bear"
  },
  "trapDart": {
    "char": "^",
    "spriteName": "trap:dart"
  }
}
```

---

## Benefits of Data-Driven Approach

### ✅ Maintainability
- All sprite mappings in JSON, not scattered in code
- Easy to add new terrain types
- No code changes to update sprites

### ✅ Lighting Variants
- Support for 4 lighting conditions built-in
- Easy to implement "dark" (explored) tiles
- Future: permanently lit rooms

### ✅ Validation
- Pre-flight validation catches missing sprites
- Clear error messages for unmapped terrain
- `validate-assets.js` can check terrain-sprites.json

### ✅ Consistency
- Same pattern as monsters (spriteName field)
- Same pattern as items (when implemented)
- Uniform data structure across all entities

---

## Migration Strategy

### Step 1: Create terrain-sprites.json
Start with 6 core terrain types (floor, wall, door open/closed, stairs up/down)

### Step 2: Create TerrainSpriteService
Load JSON, provide lookup methods with lighting support

### Step 3: Update AssetLoaderService
Remove CHAR_TO_ANGBAND, delegate to TerrainSpriteService with fallback

### Step 4: Update CanvasGameRenderer
Pass lighting condition based on visibility state

### Step 5: Validation
Update `validate-assets.js` to validate terrain-sprites.json

### Step 6: Testing
Visual regression test - ensure all terrain renders correctly

---

## Lighting Variant Usage Strategy

**Current State** (Phase 1 MVP):
- Use `torch` variant for all visible tiles
- Use opacity for explored tiles (keep current approach)
- Ignore `lit` and `los` variants initially

**Future Enhancement** (Phase 2):
- Use `dark` variant for explored tiles instead of opacity
- Implement `lit` for permanently lit rooms
- Use `los` for edge-of-vision tiles

**Pseudocode**:
```typescript
function getTerrainSprite(char: string, tile: Tile, inFOV: boolean) {
  let lighting: 'torch' | 'lit' | 'dark' = 'torch'

  if (!inFOV && tile.explored) {
    lighting = 'dark'  // Explored but not visible
  } else if (tile.permanentlyLit) {
    lighting = 'lit'   // Lit room (future)
  } else if (inFOV) {
    lighting = 'torch' // In FOV, default
  }

  return terrainSpriteService.getSpriteName(char, lighting)
}
```

---

## Summary Table

| Terrain Type | Char | spriteName | Lighting Variants | Priority | Current Support |
|-------------|------|------------|------------------|----------|----------------|
| Floor | `.` | `FLOOR` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Wall | `#` | `GRANITE` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Closed Door | `+` | `CLOSED` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Open Door | `'` | `OPEN` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Stairs Up | `<` | `LESS` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Stairs Down | `>` | `MORE` | ✅ 4 variants | ⭐⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Rubble | `%` | `RUBBLE` | ✅ 4 variants | ⭐⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Magma | `*` | `MAGMA` | ✅ 4 variants | ⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Quartz | `*` | `QUARTZ` | ✅ 4 variants | ⭐ | ✅ Yes (CHAR_TO_ANGBAND) |
| Trap | `^` | `trap` | ❌ None | ⭐ | ✅ Yes (CHAR_TO_ANGBAND) |

**Key Insight**: All 10 terrain types have lighting variants and are already supported! This is perfect for data-driven implementation.

---

## Next Steps

1. ✅ **Complete sprite analysis** (this document)
2. ✅ **Complete item sprite analysis** (docs/sprite-mapping-options-items.md)
3. **Begin Phase 1 Implementation**:
   - Create `/public/data/terrain-sprites.json`
   - Create `TerrainSpriteService`
   - Update `AssetLoaderService` to use TerrainSpriteService
   - Update `CanvasGameRenderer` to pass lighting conditions
   - Update `validate-assets.js` to validate terrain sprites
4. **Test thoroughly**:
   - All terrain renders correctly
   - Lighting variants work (if implemented)
   - No performance degradation
5. **Move to Phase 2**: Items implementation

---

**Last Updated**: 2025-10-10
**Status**: Analysis Complete - Ready for Implementation
