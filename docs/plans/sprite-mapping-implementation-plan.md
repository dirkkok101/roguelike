# Data-Driven Sprite Mapping Implementation Plan

**Goal**: Extend the spriteName approach from monsters to all renderable entities (items, terrain, doors, traps)

**Status**: Analysis Complete - Ready for Implementation
**Created**: 2025-10-10
**Updated**: 2025-10-10 (sprite analysis complete)

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
- `/public/data/items.json` - 65 items across 9 categories
- Multiple item categories with different structures

**Sprite Analysis Results** (see `docs/sprite-mapping-options-items.md`):
- ✅ **27/65 items (42%)** have exact sprite matches
- ✅ **Weapons**: 8/8 (100%) - All have exact sprites (Mace → `Mace`, Long Sword → `Long Sword`, etc.)
- ✅ **Armor**: 7/7 (100%) - All have good matches (Leather Armor → `Hard Leather Armour`, Chain Mail → `Chain Mail`, etc.)
- ✅ **Light Sources**: 4/4 (100%) - All exact (Torch → `Wooden Torch`, Lantern → `Lantern`, Phial → `Phial`, Star → `Star`)
- ✅ **Food**: 1/1 (100%) - Food Ration → `Ration of Food`
- ✅ **Consumables**: 1/1 (100%) - Oil Flask → `Flask of oil`
- ⚠️ **Scrolls**: 6/11 (55%) - Partial (IDENTIFY → `Identify Rune`, ENCHANT_WEAPON → `Enchant Weapon To-Hit`, etc.)
- ⚠️ **Potions**: 0/13 (0%) - Need generic `potion` sprite
- ⚠️ **Rings**: 0/10 (0%) - Need generic `Ring` sprite (0x85:0x95)
- ⚠️ **Wands**: 0/10 (0%) - Need generic wand sprite

**Implementation Strategy**:
1. **Phase 2a**: Add spriteName to 21 items with exact matches (high value, low effort)
2. **Phase 2b**: Add generic sprites for potions/rings/wands (38 items)
3. **Phase 2c**: Map 6 scrolls to specific Angband sprites, use generic for remaining 5

### ⚠️ To Implement: Map Tiles
**Current Approach**:
- Hardcoded `CHAR_TO_ANGBAND` constant in `AssetLoaderService.ts`
- Maps characters to Angband feature names: `.` → `['FLOOR']`, `#` → `['GRANITE', 'PERM']`

**Sprite Analysis Results** (see `docs/sprite-mapping-options-terrain.md`):
- ✅ **10/10 terrain types (100%)** have sprites with full lighting support
- ✅ **All terrain has 4 lighting variants**: torch, lit, los, dark (69+ total feature entries)
- ✅ **Core Terrain (Phase 1)**: Floor, Wall, Doors (closed/open), Stairs (up/down) - all ready
- ✅ **Secondary Terrain (Phase 2)**: Rubble, Magma, Quartz, Trap - all ready
- ✅ **Bonus**: BROKEN door sprite available, Store sprites available (7 shop types for future)

**Terrain Sprite Mappings**:
| Char | Name | spriteName | Lighting Variants | Available |
|------|------|------------|-------------------|-----------|
| `.` | Floor | `FLOOR` | torch/lit/los/dark | ✅ Yes |
| `#` | Wall | `GRANITE` | torch/lit/los/dark | ✅ Yes |
| `+` | Closed Door | `CLOSED` | torch/lit/los/dark | ✅ Yes |
| `'` | Open Door | `OPEN` | torch/lit/los/dark | ✅ Yes |
| `<` | Stairs Up | `LESS` | torch/lit/los/dark | ✅ Yes |
| `>` | Stairs Down | `MORE` | torch/lit/los/dark | ✅ Yes |
| `%` | Rubble | `RUBBLE` | torch/lit/los/dark | ✅ Yes |
| `^` | Trap | `trap` | None (item sprite) | ✅ Yes |
| `*` | Magma/Quartz | `MAGMA`/`QUARTZ` | torch/lit/los/dark | ✅ Yes |

**Implementation Strategy**:
1. Create `terrain-sprites.json` with 6 core terrain types + lighting variants
2. Create `TerrainSpriteService` with lighting support
3. Remove `CHAR_TO_ANGBAND` hardcoded mapping
4. Update renderer to use lighting variants based on visibility state

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

#### 2.5: Item Sprite Mapping Analysis ✅ COMPLETED
**Analysis Document**: `docs/sprite-mapping-options-items.md`

**Sprite Coverage Analysis**:
- Analyzed 248 object sprites in graf-dvg.prf
- Found 312 flavor variants in flvr-dvg.prf
- Documented exact mappings for 27/65 items (42%)

**Specific Sprite Mappings**:

**Weapons (8/8 exact matches)**:
- Mace → `Mace` (0x8a:0x99)
- Long Sword → `Long Sword` (0x8a:0x8D)
- Short Sword → `Short Sword` (0x8a:0x88)
- Two-Handed Sword → `Zweihander` (0x8a:0x91)
- Dagger → `Dagger` (0x8a:0x83)
- Spear → `Spear` (0x8a:0xA1)
- Battle Axe → `Battle Axe` (0x8a:0xA6)
- Flail → `Flail` (0x8a:0x9E)

**Armor (7/7 good matches)**:
- Leather Armor → `Hard Leather Armour` (0x80:0xAA)
- Studded Leather → `Studded Leather Armour` (0x80:0xAB)
- Ring Mail → `Metal Scale Mail` (0x80:0xAD)
- Chain Mail → `Chain Mail` (0x80:0xAF)
- Banded Mail → `Augmented Chain Mail` (0x80:0xB1)
- Splint Mail → `Partial Plate Armour` (0x80:0xB4)
- Plate Mail → `Full Plate Armour` (0x80:0xB6)

**Light Sources (4/4 exact matches)**:
- Torch → `Wooden Torch` (0x87:0x9A)
- Lantern → `Lantern` (0x87:0x99)
- Phial of Galadriel → `Phial` (0x87:0xB3)
- Star of Elendil → `Star` (0x87:0xB4)

**Food & Consumables (2/2 exact matches)**:
- Food Ration → `Ration of Food` (0x82:0x84)
- Oil Flask → `Flask of oil` (0x87:0x97)

**Scrolls (6/11 specific, 5/11 generic)**:
- IDENTIFY → `Identify Rune` (0x87:0xCD)
- ENCHANT_WEAPON → `Enchant Weapon To-Hit` (0x87:0xCF)
- ENCHANT_ARMOR → `Enchant Armour` (0x87:0xD2)
- MAGIC_MAPPING → `Magic Mapping` (0x87:0xD9)
- TELEPORTATION → `Teleportation` (0x87:0xD6)
- REMOVE_CURSE → `Remove Curse` (0x87:0xF0)
- Others → Generic scroll sprite

**Potions, Rings, Wands (generic sprites)**:
- All 13 potions → Generic `potion` sprite
- All 10 rings → Generic `Ring` sprite (0x85:0x95)
- All 10 wands → Generic wand sprite

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

**✅ COMPLETED: Sprite Analysis** (2-3 hours)
1. ✅ Analyzed all 248 object sprites in graf-dvg.prf
2. ✅ Analyzed all 69 terrain feature sprites
3. ✅ Created `docs/sprite-mapping-options-items.md` (complete item sprite mappings)
4. ✅ Created `docs/sprite-mapping-options-terrain.md` (complete terrain sprite mappings)
5. ✅ Found 27/65 items (42%) with exact matches, 10/10 terrain (100%) with lighting variants

**✅ COMPLETED: Phase 1 - Terrain Tiles** (2-3 hours)
1. ✅ Created `terrain-sprites.json` with 6 core terrain types
   - Floor, Wall, Doors (open/closed), Stairs (up/down)
   - All 4 lighting variants (torch/lit/los/dark) for each
2. ✅ Created `TerrainSpriteService`
   - Loads terrain-sprites.json
   - Provides getSpriteNameWithLighting(char, lighting) method
3. ✅ Updated `AssetLoaderService` to delegate terrain lookups
   - Delegates to TerrainSpriteService for terrain characters
   - Kept CHAR_TO_ANGBAND for items only
4. ✅ Updated `CanvasGameRenderer` to use lighting
   - Currently uses 'torch' for all visible tiles
5. ✅ Updated `validate-assets.js` for terrain validation
6. ✅ Validated: 6/6 terrain sprites with all 4 lighting variants

**✅ COMPLETED: Phase 2a - Items (Exact Matches)** (2-3 hours)
1. ✅ Added `spriteName` to 21 items with exact matches in `items.json`:
   - 8 weapons (Mace → `Mace`, Long Sword → `Long Sword`, etc.)
   - 7 armor (Leather Armor → `Hard Leather Armour`, etc.)
   - 4 light sources (Torch → `Wooden Torch`, Lantern, Phial, Star)
   - 1 food (Food Ration → `Ration of Food`)
   - 1 consumable (Oil Flask → `Flask of oil`)
2. ✅ Updated item type definitions with spriteName field
3. ✅ Updated `ItemDataLoader` and `ItemSpawnService` to populate spriteName
4. ✅ Updated `CanvasGameRenderer` item rendering to use spriteName
5. ✅ Validated: All 21 items have valid sprite mappings

**Phase 2b: Items - Generic Sprites** (2-3 hours)
1. Add generic `spriteName` to remaining 38 items:
   - 13 potions → `potion`
   - 10 rings → `Ring`
   - 10 wands → `wand`
   - 5 scrolls without specific sprites → `scroll`
2. Map 6 scrolls to specific Angband sprites:
   - IDENTIFY → `Identify Rune`
   - ENCHANT_WEAPON → `Enchant Weapon To-Hit`
   - ENCHANT_ARMOR → `Enchant Armour`
   - MAGIC_MAPPING → `Magic Mapping`
   - TELEPORTATION → `Teleportation`
   - REMOVE_CURSE → `Remove Curse`
3. Update `validate-assets.js` for item validation
4. Test and validate all 65 items render correctly

**Phase 2c: Secondary Terrain** (1 hour, optional)
1. Add rubble, magma, quartz to terrain-sprites.json
2. Test mineral vein rendering

**Phase 3: Special Cases** (1-2 hours, future enhancement)
1. Implement flavor system for unidentified items (312 flavor variants available)
2. Implement door state sprite mapping (BROKEN sprite available)
3. Use 'dark' lighting variant for explored tiles (instead of opacity)
4. Implement permanently lit rooms (use 'lit' variant)

---

## File Changes Summary

### New Files
- ✅ `/docs/sprite-mapping-options-items.md` - Item sprite analysis (COMPLETED)
- ✅ `/docs/sprite-mapping-options-terrain.md` - Terrain sprite analysis (COMPLETED)
- ✅ `/public/data/terrain-sprites.json` - Terrain sprite mappings (COMPLETED)
- ✅ `/src/services/TerrainSpriteService/TerrainSpriteService.ts` - Terrain sprite service (COMPLETED)
- ✅ `/src/services/TerrainSpriteService/index.ts` - Barrel export (COMPLETED)

### Modified Files
- ✅ `/public/data/items.json` - Added spriteName to 21 items (Phase 2a complete, Phase 2b pending)
- ✅ `/src/types/core/core.ts` - Added spriteName to item interfaces (COMPLETED)
- ✅ `/src/data/ItemDataLoader.ts` - Added spriteName validation (COMPLETED)
- ✅ `/src/services/ItemSpawnService/ItemSpawnService.ts` - Updated to use spriteName (COMPLETED)
- ✅ `/src/services/AssetLoaderService/AssetLoaderService.ts` - Delegated terrain to TerrainSpriteService (COMPLETED)
- ✅ `/src/ui/CanvasGameRenderer.ts` - Uses spriteName for items when available (COMPLETED)
- ✅ `/scripts/validate-assets.js` - Validates terrain and items (COMPLETED)

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
- [x] terrain-sprites.json created with all terrain types
- [x] TerrainSpriteService implemented and tested
- [x] validate-assets.js validates all terrain sprites
- [x] All terrain tiles render correctly in-game
- [x] 6/6 core terrain characters mapped with 4 lighting variants each

### Phase 2a (Items - Exact Matches)
- [x] items.json updated with spriteName for 21 items with exact matches
- [x] Item interfaces updated with spriteName field
- [x] ItemDataLoader validates spriteName
- [x] ItemSpawnService populates spriteName
- [x] CanvasGameRenderer uses spriteName when available
- [x] validate-assets.js validates item sprites
- [x] 21/65 items (32%) with exact sprite matches

### Phase 2b (Items - Generic Sprites)
- [ ] items.json updated with spriteName for remaining 44 items
- [ ] All items use either specific or generic sprites
- [ ] 100% item sprite coverage (65/65 items)

### Phase 3 (Special Cases)
- [ ] Door states use correct sprites
- [ ] Trap types differentiated (if sprites available)
- [ ] Unidentified items use generic sprites
- [ ] Lighting variants work correctly

---

## Questions Answered by Sprite Analysis

1. **✅ Item Sprite Granularity**: Should we have specific sprites for every weapon/armor variant, or use generic categories?
   - **Answer**: We have BOTH! 27/65 items (42%) have exact matches, use specific sprites
   - **Strategy**: Phase 2a implements 21 items with exact matches, Phase 2b uses generic for remaining 38

2. **✅ Sprite Variants**: How many variants should we support (lit/unlit, damaged, etc.)?
   - **Answer**: ALL terrain has 4 lighting variants (torch/lit/los/dark) - 100% coverage!
   - **Strategy**: Implement lighting variants in Phase 1, use 'torch' for visible, 'dark' for explored

3. **✅ Fallback Strategy**: What should we render if a sprite is missing?
   - **Answer**: Very few missing! Only 38/65 items need generic sprites (potions/rings/wands)
   - **Strategy**: Use character-based fallback (current behavior) + console warning for any missing

4. **✅ Configuration Location**: Should terrain/item configs be separate files or merged?
   - **Answer**: Separate files - terrain-sprites.json for terrain, items.json for items
   - **Rationale**: Clear separation of concerns, easier to maintain

5. **✅ Flavor System**: Should we implement flavor variants for unidentified items?
   - **Answer**: 312 flavor variants available in flvr-dvg.prf, implement in Phase 3 (future)
   - **Strategy**: Start with generic sprites (Phase 2b), add flavor system later for polish

---

## Next Steps

1. ✅ **Sprite Analysis Complete** - Analyzed all 248 item sprites and 69 terrain features
2. ✅ **Documentation Complete** - Created sprite-mapping-options-items.md and sprite-mapping-options-terrain.md
3. **Ready to Start Phase 1** - Implement terrain sprite mapping (2-3 hours)
   - Create terrain-sprites.json with 6 core terrain types
   - Implement TerrainSpriteService with lighting support
   - Remove CHAR_TO_ANGBAND hardcoded mapping
4. **Then Phase 2a** - Implement 21 items with exact sprite matches (2-3 hours)
5. **Then Phase 2b** - Implement generic sprites for remaining 38 items (2-3 hours)
6. **Optional Phase 3** - Flavor system and lighting enhancements (future)

---

## Summary of Findings

**Sprite Coverage**:
- ✅ **Monsters**: 26/26 (100%) - COMPLETED
- ✅ **Terrain**: 10/10 (100%) with 4 lighting variants each - READY
- ✅ **Items**: 27/65 (42%) exact matches, 38/65 (58%) generic - READY

**Total Renderable Entities**: 101 entities analyzed
- **100% Ready**: 63 entities (monsters + terrain + exact match items)
- **Generic Sprites**: 38 entities (potions/rings/wands/some scrolls)

**Implementation Effort**:
- Phase 1 (Terrain): ~2-3 hours
- Phase 2a (Items - Exact): ~2-3 hours
- Phase 2b (Items - Generic): ~2-3 hours
- **Total**: ~6-9 hours for complete data-driven sprite system

---

**Last Updated**: 2025-10-10 (sprite analysis complete)
**Status**: Analysis Complete - Ready for Phase 1 Implementation
