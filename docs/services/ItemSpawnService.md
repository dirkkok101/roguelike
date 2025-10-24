# ItemSpawnService

**Location**: `src/services/ItemSpawnService/ItemSpawnService.ts`
**Dependencies**: IRandomService, ItemData (data loader)
**Test Coverage**: Item spawning, rarity, cursed items, enchantments

---

## Purpose

Generates items for dungeon levels with rarity-based selection, cursed items, and enchantments. Caches templates for 10x performance improvement (50μs → 5μs per spawn).

---

## Public API

### spawnItems(rooms, count, tiles, monsters, depth): Item[]

Spawns random items appropriate for dungeon level using rarity weights.

**Parameters**:
- `rooms` - Room array for item placement
- `count` - Number of items to spawn
- `tiles` - Level tile grid for walkability checks
- `monsters` - Monster array (avoid overlapping positions)
- `depth` - Dungeon level (1-26, affects spawn weights)

**Returns**: Array of spawned items with positions

**Rarity Selection** (weighted random):
- **Common** (60%): Basic weapons, armor, potions, scrolls
- **Uncommon** (30%): Enhanced equipment, useful consumables
- **Rare** (10%): Powerful rings, wands, enchanted gear

**Item Category Weights** (26-level balanced):
```typescript
Base categories: 12 each (weapon, armor, potion, scroll, ring), 8 (wand)
Food: 10% + 1% per 5 levels (10-15% across depths)
Torch: 7% (consistent across all depths)
Lantern: 0% (depth ≤3), 8% (depth 4-7), 12% (depth 8+)
Oil Flask: 5% (consistent across all depths)
```

**Curse System**:
```typescript
Curse Chance (risk/reward balance):
- Common: 5%
- Uncommon: 8%
- Rare: 12%

Enchantment Bonuses:
- Cursed: -1 to -3 (negative bonus)
- Rare: +1 to +2 (positive bonus)
- Common/Uncommon: 0 (no enchantment)
```

**Special Rules**:
- Ring of Teleportation: **Always cursed** (Rogue tradition)
- Artifacts: 0.5% chance on levels 8+ (permanent light, radius 3)
- Starting equipment: Never cursed, no enchantment
- Negative bonuses hidden until curse discovered

**Example**:
```typescript
const itemSpawnService = new ItemSpawnService(randomService, itemData)

// Spawn 10 items on level 5
const items = itemSpawnService.spawnItems(rooms, 10, tiles, monsters, 5)

// Example item generated:
// {
//   name: "Long Sword +2",
//   type: ItemType.WEAPON,
//   damage: "1d8",
//   bonus: 2,
//   cursed: false,
//   position: { x: 15, y: 8 }
// }
```

---

### Helper Methods (Debug Spawning)

The service provides creation methods for specific item types:

**Item Creation**:
- `createPotion(potionType, position)` - Specific potion type
- `createScroll(scrollType, position)` - Specific scroll type
- `createRing(ringType, position)` - Specific ring (always uncursed +1)
- `createWand(wandType, position)` - Specific wand with charges
- `createFood(position)` - Random food item
- `createTorch(position)` - Standard torch (650 fuel)
- `createLantern(position)` - Lantern (750 fuel, 1500 max)
- `createOilFlask(position)` - Oil flask (600 fuel)
- `createStartingLeatherArmor(position)` - Starting equipment
- `createAmulet(position)` - Amulet of Yendor (quest item)

**Usage**: Primarily used by DebugService for manual item spawning.

---

## Integration Notes

### Dungeon Generation

```typescript
// In DungeonService.generateLevel()
const itemCount = calculateItemCount(depth)  // 5-15 items per level
const items = itemSpawnService.spawnItems(
  rooms,
  itemCount,
  level.tiles,
  level.monsters,
  depth
)

level.items = items
```

### Performance Optimization

**Template Caching**: All item templates loaded once in constructor
- **Before**: ~50μs per spawn (recreating templates)
- **After**: ~5μs per spawn (cached lookup)
- **Improvement**: 10x faster for repeated spawns

```typescript
// Templates cached at construction
constructor(random: IRandomService, itemData: ItemData) {
  this.potionTemplates = this.loadPotionTemplates()  // Called once
  this.scrollTemplates = this.loadScrollTemplates()
  // ... all templates loaded once
}
```

### Depth-Based Spawn Balancing

**Food Progression** (hunger management for 26 levels):
```
Level 1-4:  10% spawn rate
Level 5-9:  11% spawn rate
Level 10-14: 12% spawn rate
Level 15-19: 13% spawn rate
Level 20-24: 14% spawn rate
Level 25-26: 15% spawn rate
```

**Lantern Availability** (light source progression):
```
Level 1-3:  0% (torches only)
Level 4-7:  8% (lanterns appear)
Level 8-26: 12% (lanterns common)
```

**Artifact Spawning** (legendary items):
```
Level 1-7: 0% chance
Level 8+:  0.5% chance when spawning torches
```

---

## Testing

**Test Files**:
- `ItemSpawnService.test.ts` - Rarity selection, curse generation, enchantments

**Coverage**: Comprehensive (rarity weights, curse chances, enchantment bonuses, template caching)

---

## Technical Details

### Item Types Supported

**12 Item Types**:
- Weapon, Armor, Potion, Scroll, Ring, Wand, Food, Torch, Lantern, Artifact, OilFlask, Amulet

**Data Source**: `src/data/items.json` (loaded via ItemData)

**Template Structure**:
```typescript
// Example: Weapon template
{
  name: "Long Sword",
  spriteName: "weapon/long_sword",
  damage: "1d8",
  rarity: "common"
}

// Example: Potion template
{
  type: PotionType.HEALING,
  spriteName: "potion/red",
  effect: "Heal HP",
  power: "2d8+2",
  rarity: "common"
}
```

### Wand Ranges

Wand effective range based on type:
```typescript
Lightning/Fire/Cold: 8 tiles (long-range beams)
Magic Missile/Teleport Away: 7 tiles
Sleep/Slow Monster/Cancellation: 6 tiles
Haste Monster/Polymorph: 5 tiles (close-range)
```

### Identification System

**Unidentified Items** (discovery mechanic):
- Potions: Show descriptor name ("red potion", "blue potion")
- Scrolls: Show label name ("ZELGO MER", "FOOBIE BLETCH")
- Rings: Show material name ("gold ring", "silver ring")
- Wands: Show wood name ("oak wand", "maple wand")

**Identified by**: IdentificationService (via scrolls, use, or identification)

---

## Related Services

- [DungeonService](./DungeonService.md) - Uses to populate levels with items
- [IdentificationService](./IdentificationService.md) - Reveals true item names
- [CurseService](./CurseService.md) - Handles cursed equipment
