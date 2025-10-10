# Data-Driven Sprite Mapping Implementation Plan

**Goal**: Extend the spriteName approach from monsters to all renderable entities (items, terrain, doors, traps)

**Status**: Planning Phase
**Created**: 2025-10-10

---

## Current State Analysis

### ✅ Completed: Monsters
- **Data**: `monsters.json` has `spriteName` field
- **Type**: `Monster` and `MonsterTemplate` interfaces have `spriteName: string`
- **Service**: `MonsterSpawnService` validates and passes `spriteName`
- **Renderer**: `CanvasGameRenderer` uses `monster.spriteName` for lookup
- **Validation**: `validate-assets.js` validates all 26 monster sprites
- **Result**: 26/26 monsters mapped with exact matches

### ⚠️ To Implement: Items
**Current Approach**:
- Items use first character of name for sprite lookup (e.g., "Healing" → "H")
- Generic character-based sprites: `!` (potion), `?` (scroll), `=` (ring), etc.
- No explicit sprite mappings in items.json

**Data Files**:
- `/public/data/items.json` - weapons, armor, potions, scrolls, rings, wands, food
- Multiple item categories with different structures

**Challenges**:
1. Multiple item types with different structures
2. Need to support both generic sprites (all potions → "potion") and specific sprites (individual weapons)
3. Unidentified items should use generic/descriptor sprites
4. Items can be equipped, dropped, in inventory (different rendering contexts)

### ⚠️ To Implement: Map Tiles
**Current Approach**:
- Hardcoded `CHAR_TO_ANGBAND` constant in `AssetLoaderService.ts`
- Maps characters to Angband feature names: `.` → `['FLOOR']`, `#` → `['GRANITE', 'PERM']`

**Challenges**:
1. Tiles are generated procedurally, not loaded from JSON
2. Different tile types: WALL, FLOOR, CORRIDOR, DOOR, TRAP
3. Doors have multiple states: OPEN, CLOSED, LOCKED, BROKEN, SECRET, ARCHWAY
4. Some tiles need variants (lit/unlit, torch/los conditions)
5. No centralized data file for tile definitions

---

## Proposed Solution: 3-Phase Implementation

### Phase 1: Terrain Tiles (Simplest)
**Goal**: Move `CHAR_TO_ANGBAND` to data-driven configuration

#### 1.1: Create Terrain Configuration File
**File**: `/public/data/terrain-sprites.json`

```json
{
  "floor": {
    "char": ".",
    "spriteName": "FLOOR",
    "description": "Stone floor",
    "variants": {
      "torch": "FLOOR:torch",
      "lit": "FLOOR:lit",
      "los": "FLOOR:los",
      "default": "FLOOR"
    }
  },
  "wall": {
    "char": "#",
    "spriteName": "GRANITE",
    "description": "Granite wall",
    "variants": ["GRANITE", "PERM"]
  },
  "corridor": {
    "char": "#",
    "spriteName": "GRANITE",
    "description": "Corridor wall"
  },
  "doorOpen": {
    "char": "'",
    "spriteName": "OPEN",
    "description": "Open door"
  },
  "doorClosed": {
    "char": "+",
    "spriteName": "CLOSED",
    "description": "Closed door"
  },
  "stairsUp": {
    "char": "<",
    "spriteName": "LESS",
    "description": "Stairs up"
  },
  "stairsDown": {
    "char": ">",
    "spriteName": "MORE",
    "description": "Stairs down"
  },
  "trap": {
    "char": "^",
    "spriteName": "trap",
    "description": "Trap"
  },
  "rubble": {
    "char": "%",
    "spriteName": "RUBBLE",
    "description": "Rubble"
  },
  "player": {
    "char": "@",
    "spriteName": "<player>",
    "description": "Player character"
  },
  "gold": {
    "char": "$",
    "spriteName": "gold",
    "description": "Gold pile"
  }
}
```

#### 1.2: Create TerrainSpriteService
**Purpose**: Load and manage terrain sprite mappings

```typescript
export class TerrainSpriteService {
  private spriteMap: Map<string, TerrainSpriteConfig> = new Map()

  async loadTerrainSprites(): Promise<void>
  getSpriteName(char: string): string | null
  getSpriteNameWithVariant(char: string, condition: string): string | null
}
```

#### 1.3: Update AssetLoaderService
- Remove hardcoded `CHAR_TO_ANGBAND`
- Delegate terrain lookups to `TerrainSpriteService`
- Keep fallback logic for backwards compatibility

#### 1.4: Update CanvasGameRenderer
- Use `TerrainSpriteService` for terrain sprite lookups
- Pass lighting condition to get appropriate variant

**Validation**:
- Update `validate-assets.js` to load and validate terrain-sprites.json
- Ensure all terrain characters have sprite mappings

---

### Phase 2: Items (Medium Complexity)
**Goal**: Add sprite mappings to items.json with support for generic and specific sprites

#### 2.1: Update Item Data Structure
**Option A: Generic Sprites Only** (Simplest, recommended for MVP)

Keep current approach but make it explicit:

```json
{
  "potions": [
    {
      "name": "Healing",
      "spriteName": "potion",  // Generic sprite for all potions
      "power": "2d4",
      ...
    }
  ],
  "weapons": [
    {
      "name": "Mace",
      "spriteName": "Mace",  // Specific sprite if available
      "damage": "2d4",
      ...
    }
  ]
}
```

**Option B: Per-Category Sprite Config** (More flexible)

```json
{
  "potions": {
    "genericSprite": "potion",
    "useGenericForUnidentified": true,
    "items": [
      {
        "name": "Healing",
        "specificSprite": null,  // Use generic
        ...
      }
    ]
  }
}
```

**Option C: Hybrid with Fallback** (Most control)

```json
{
  "weapons": [
    {
      "name": "Long Sword",
      "spriteName": "Long sword",  // Try this first
      "genericSprite": "sword",     // Fallback if specific not found
      "char": ")",                  // Last resort
      ...
    }
  ]
}
```

**Recommended**: Start with **Option A** - add `spriteName` field to each item.

#### 2.2: Update Item Type Definitions

Add `spriteName` to item interfaces:

```typescript
export interface Weapon extends Item {
  spriteName: string  // NEW
  damage: string
  bonus: number
  cursed?: boolean
}

export interface Potion extends Item {
  spriteName: string  // NEW
  potionType: PotionType
  effect: string
  power: string
  descriptorName: string
}
```

#### 2.3: Update ItemDataLoader
**Service**: `src/data/ItemDataLoader.ts`

- Load items.json
- Validate `spriteName` field exists for all items
- Provide fallback logic if needed

#### 2.4: Update Item Rendering
**Renderer**: `CanvasGameRenderer.renderEntities()`

Currently:
```typescript
this.renderEntity(state, level, item.position, item.name[0] || '?', 'item', renderConfig)
```

Change to:
```typescript
const sprite = this.getItemSpriteName(item)
this.renderEntity(state, level, item.position, sprite, 'item', renderConfig)
```

#### 2.5: Create Item Sprite Mapping Analysis
**Script**: Update `validate-assets.js`

1. Analyze Gervais tileset for weapon/armor/item sprites
2. Create mapping recommendations like we did for monsters
3. Document in `docs/sprite-mapping-options-items.md`

**Known Item Sprites in Gervais**:
```
Weapons: sword, mace, dagger, bow, etc.
Armor: chain mail, plate mail, etc.
Generic: potion, scroll, ring, wand, staff
```

#### 2.6: Validation
- Update `validate-assets.js` to validate all item sprites
- Report missing sprites for each item category
- Provide fallback recommendations

---

### Phase 3: Special Cases (Complex)
**Goal**: Handle edge cases and advanced scenarios

#### 3.1: Door States
Doors have multiple states that need different sprites:

```json
// In terrain-sprites.json
{
  "doors": {
    "open": {
      "char": "'",
      "spriteName": "OPEN"
    },
    "closed": {
      "char": "+",
      "spriteName": "CLOSED"
    },
    "locked": {
      "char": "+",
      "spriteName": "CLOSED",
      "tint": "#FFD700"  // Optional: gold tint for locked
    },
    "broken": {
      "char": "'",
      "spriteName": "OPEN",
      "tint": "#8B4513"  // Optional: brown tint for broken
    },
    "secret": {
      "char": "#",
      "spriteName": "GRANITE"  // Looks like wall until discovered
    }
  }
}
```

**Update Door Rendering**:
```typescript
getDoorSpriteName(door: Door): string {
  switch (door.state) {
    case DoorState.OPEN: return terrainSprites.doors.open.spriteName
    case DoorState.CLOSED: return terrainSprites.doors.closed.spriteName
    case DoorState.LOCKED: return terrainSprites.doors.locked.spriteName
    // etc.
  }
}
```

#### 3.2: Trap Types
Different trap types could have different sprites:

```json
{
  "traps": {
    "bear": {
      "char": "^",
      "spriteName": "trap:bear"
    },
    "dart": {
      "char": "^",
      "spriteName": "trap:dart"
    },
    "generic": {
      "char": "^",
      "spriteName": "trap"
    }
  }
}
```

#### 3.3: Item Identification State
Items should use different sprites when unidentified:

```typescript
getItemSpriteName(item: Item, identified: boolean): string {
  if (!identified && item.descriptorName) {
    // Use generic sprite for unidentified items
    return getGenericSpriteForType(item.type)
  }
  return item.spriteName
}
```

#### 3.4: Lighting Variants
Floor tiles look different based on lighting:

```typescript
getFloorSpriteName(lighting: 'torch' | 'lit' | 'dark'): string {
  return terrainSprites.floor.variants[lighting] || terrainSprites.floor.spriteName
}
```

---

## Implementation Order

### Recommended Sequence

**Week 1: Terrain Tiles** (2-3 hours)
1. Create `terrain-sprites.json`
2. Create `TerrainSpriteService`
3. Update `AssetLoaderService` to delegate terrain lookups
4. Update `validate-assets.js` for terrain validation
5. Test and validate all terrain renders correctly

**Week 2: Items - Data Preparation** (3-4 hours)
1. Analyze Gervais tileset for item sprites
2. Create `docs/sprite-mapping-options-items.md`
3. Add `spriteName` to all items in `items.json`
4. Update item type definitions

**Week 3: Items - Implementation** (2-3 hours)
1. Update `ItemDataLoader` to validate `spriteName`
2. Update `CanvasGameRenderer` item rendering
3. Update `validate-assets.js` for item validation
4. Test and validate all items render correctly

**Week 4: Special Cases** (1-2 hours, optional)
1. Implement door state sprite mapping
2. Implement trap type sprite mapping
3. Implement identification state logic
4. Test edge cases

---

## File Changes Summary

### New Files
- `/public/data/terrain-sprites.json` - Terrain sprite mappings
- `/src/services/TerrainSpriteService/TerrainSpriteService.ts` - Terrain sprite service
- `/src/services/TerrainSpriteService/index.ts` - Barrel export
- `/docs/sprite-mapping-options-items.md` - Item sprite analysis

### Modified Files
- `/public/data/items.json` - Add spriteName to all items
- `/src/types/core/core.ts` - Add spriteName to item interfaces
- `/src/data/ItemDataLoader.ts` - Validate spriteName
- `/src/services/AssetLoaderService/AssetLoaderService.ts` - Delegate terrain to TerrainSpriteService
- `/src/ui/CanvasGameRenderer.ts` - Use spriteName for items
- `/scripts/validate-assets.js` - Validate terrain and items

---

## Benefits

### Maintainability
✅ All sprite mappings in data files, not hardcoded
✅ Easy to update/modify sprite assignments
✅ Centralized configuration for artists/designers
✅ No code changes needed to adjust sprites

### Validation
✅ Pre-flight validation catches missing sprites
✅ Clear error messages for unmapped entities
✅ Automated testing of sprite coverage

### Flexibility
✅ Support for sprite variants (lit/unlit, open/closed)
✅ Support for generic vs specific sprites
✅ Support for identification states
✅ Easy to add new items/tiles without code changes

### Consistency
✅ Same pattern for monsters, items, terrain
✅ Predictable data structure
✅ Uniform sprite lookup logic

---

## Migration Strategy

### Backwards Compatibility
During implementation, keep fallback logic:

```typescript
// In AssetLoaderService.getSprite()
getSprite(char: string): TileCoordinate | null {
  // 1. Try new TerrainSpriteService (Phase 1)
  const terrainSprite = this.terrainSpriteService.getSpriteName(char)
  if (terrainSprite) {
    return this.lookupSprite(terrainSprite)
  }

  // 2. Try old CHAR_TO_ANGBAND (backwards compat)
  const legacyMapping = CHAR_TO_ANGBAND[char]
  if (legacyMapping) {
    return this.lookupSprite(legacyMapping[0])
  }

  // 3. Try monster/item spriteName (already implemented)
  // ...
}
```

### Testing Strategy
1. Run `validate-assets.js` after each phase
2. Visual regression testing: render all entities
3. Compare with previous ASCII/sprite rendering
4. Ensure no sprites missing or broken

---

## Success Criteria

### Phase 1 (Terrain)
- [ ] terrain-sprites.json created with all terrain types
- [ ] TerrainSpriteService implemented and tested
- [ ] validate-assets.js validates all terrain sprites
- [ ] All terrain tiles render correctly in-game
- [ ] 10/10 terrain characters mapped (same as before, but data-driven)

### Phase 2 (Items)
- [ ] items.json updated with spriteName for all items
- [ ] Item interfaces updated with spriteName field
- [ ] ItemDataLoader validates spriteName
- [ ] validate-assets.js validates all item sprites
- [ ] All items render correctly in-game
- [ ] 100% item sprite coverage (or documented fallbacks)

### Phase 3 (Special Cases)
- [ ] Door states use correct sprites
- [ ] Trap types differentiated (if sprites available)
- [ ] Unidentified items use generic sprites
- [ ] Lighting variants work correctly

---

## Open Questions

1. **Item Sprite Granularity**: Should we have specific sprites for every weapon/armor variant, or use generic categories?
   - **Recommendation**: Start with generic (all swords → "sword"), add specific later if desired

2. **Sprite Variants**: How many variants should we support (lit/unlit, damaged, etc.)?
   - **Recommendation**: Start minimal (lit/unlit for floor), expand based on tileset availability

3. **Fallback Strategy**: What should we render if a sprite is missing?
   - **Recommendation**: Use character-based fallback (current behavior) + console warning

4. **Configuration Location**: Should terrain/item configs be separate files or merged?
   - **Recommendation**: Separate files for clarity (terrain-sprites.json, items.json)

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Start Phase 1** - Implement terrain sprite mapping
3. **Validate Phase 1** - Ensure terrain works before moving to items
4. **Iterate** - Apply learnings from Phase 1 to Phase 2

---

**Last Updated**: 2025-10-10
**Status**: Ready for implementation
