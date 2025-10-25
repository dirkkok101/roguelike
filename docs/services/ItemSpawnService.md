# ItemSpawnService

**Location**: `src/services/ItemSpawnService/ItemSpawnService.ts`
**Dependencies**: IRandomService, ItemData (data loader), GuaranteeConfig
**Test Coverage**: Item spawning, rarity, cursed items, enchantments, category weights, power tier filtering

---

## Purpose

Generates items for dungeon levels with depth-based category weighting, power tier filtering, and guarantee enforcement. Caches templates for 10x performance improvement (50μs → 5μs per spawn).

**Key Features**:
- **Fixed 7 items per level** for predictable progression
- **Depth-based category weights** from `data/guarantees.json`
- **Power tier filtering** (Basic → Intermediate → Advanced scaling)
- **Guarantee enforcement** via `forceSpawnForGuarantees()` on boundary levels

---

## Public API

### spawnItems(rooms, count, tiles, monsters, depth, tracker?): Item[]

Spawns random items appropriate for dungeon level using depth-based category weights.

**Parameters**:
- `rooms` - Room array for item placement
- `count` - Number of items to spawn (fixed at 7 for all levels)
- `tiles` - Level tile grid for walkability checks
- `monsters` - Monster array (avoid overlapping positions)
- `depth` - Dungeon level (1-26, affects category weights and power tiers)
- `tracker` - Optional GuaranteeTracker for recording spawned items

**Returns**: Array of spawned items with positions

**Item Count**: Fixed at **7 items per level** (35 per range) for predictable progression

**Category Selection**: Weighted by depth range from `data/guarantees.json`:

#### Depth 1-5 (Early Survival)
```typescript
{
  "potion": 20,    // Healing focus
  "scroll": 20,    // Identification
  "ring": 5,       // Rare utility
  "wand": 5,       // Rare utility
  "weapon": 15,    // Combat upgrades
  "armor": 15,     // Defense upgrades
  "food": 12,      // Hunger management
  "light": 8       // Vision maintenance
}
```

#### Depth 6-10 (Mid-Early)
```typescript
{
  "potion": 18,    // Still important
  "scroll": 18,    // Enchantments appear
  "ring": 10,      // More utility
  "wand": 10,      // More utility
  "weapon": 12,    // Less common
  "armor": 12,     // Less common
  "food": 12,      // Continued need
  "light": 8       // Lanterns available
}
```

#### Depth 11-15 (Mid-Game)
```typescript
{
  "potion": 16,    // Utility potions
  "scroll": 16,    // Utility scrolls
  "ring": 14,      // Utility focus
  "wand": 14,      // Utility focus
  "weapon": 10,    // Equipment less common
  "armor": 10,     // Equipment less common
  "food": 12,      // Steady supply
  "light": 8       // Continued need
}
```

#### Depth 16-20 (Mid-Late)
```typescript
{
  "potion": 15,    // Advanced potions
  "scroll": 15,    // Advanced scrolls
  "ring": 16,      // Powerful utility
  "wand": 16,      // Powerful utility
  "weapon": 8,     // Rare upgrades
  "armor": 8,      // Rare upgrades
  "food": 14,      // Increased need
  "light": 8       // Stable supply
}
```

#### Depth 21-26 (Late Game)
```typescript
{
  "potion": 14,    // Powerful consumables
  "scroll": 14,    // Powerful consumables
  "ring": 18,      // Dominant utility
  "wand": 18,      // Dominant utility
  "weapon": 6,     // Very rare
  "armor": 6,      // Very rare
  "food": 16,      // Critical resource
  "light": 8       // Stable supply
}
```

**Rarity Selection** (depth-scaled, 70/25/5 → 30/40/30):
- **Common**: 70% (depth 1) → 30% (depth 26)
- **Uncommon**: 25% (depth 1) → 40% (depth 26)
- **Rare**: 5% (depth 1) → 30% (depth 26)

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

**Power Tier Filtering**: Items filtered by depth to maintain progression curve
- **Depth 1-8**: Only `PowerTier.BASIC` items spawn
- **Depth 9-16**: `PowerTier.BASIC` + `PowerTier.INTERMEDIATE` items spawn
- **Depth 17-26**: All power tiers spawn (BASIC, INTERMEDIATE, ADVANCED)

**Example**:
```typescript
const itemSpawnService = new ItemSpawnService(randomService, itemData, guarantees)
const tracker = new GuaranteeTracker(guarantees)

// Spawn 7 items on level 5 (early game)
const items = itemSpawnService.spawnItems(rooms, 7, tiles, monsters, 5, tracker)

// Example items generated:
// 1. Healing Potion (PowerTier.BASIC) - from 'potion' category (20 weight)
// 2. Identify Scroll (PowerTier.BASIC) - from 'scroll' category (20 weight)
// 3. Long Sword +1 (cursed: false) - from 'weapon' category (15 weight)
// 4. Leather Armor (cursed: false) - from 'armor' category (15 weight)
// 5. Food Ration - from 'food' category (12 weight)
// 6. Torch - from 'light' category (8 weight)
// 7. Ring of Protection +1 - from 'ring' category (5 weight, rare spawn)

// Tracker records all items for deficit calculation on level 5
```

---

### forceSpawnForGuarantees(level, deficits): Level

Force spawns items to meet range guarantee quotas. Called on boundary levels (5, 10, 15, 20, 26) when deficits detected.

**Parameters**:
- `level` - Current level to spawn additional items in
- `deficits` - Array of ItemDeficit objects from GuaranteeTracker

**Returns**: Updated Level with additional items

**Process**:
1. For each deficit category, spawn `count` items
2. Find empty positions in random rooms
3. Create items matching category and allowed power tiers
4. Add items to level's item array

**Example**:
```typescript
// On level 5, tracker detects deficit
const deficits = tracker.getDeficits(5)
// deficits = [
//   { category: 'healingPotions', count: 2, powerTiers: [PowerTier.BASIC] },
//   { category: 'identifyScrolls', count: 1, powerTiers: [PowerTier.BASIC] }
// ]

// Force spawn missing items
const updatedLevel = itemSpawnService.forceSpawnForGuarantees(level, deficits)
// updatedLevel.items now has 3 additional items (2 healing potions, 1 identify scroll)
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

### Dungeon Generation with Guarantees

```typescript
// In DungeonService.generateAllLevels()
const tracker = new GuaranteeTracker(guarantees)
tracker.resetRange(1)  // Initialize for depths 1-5

for (let depth = 1; depth <= 26; depth++) {
  // Generate level with fixed 7 items
  let level = this.generateLevel(depth, config)
  // Items tracked via ItemSpawnService.spawnItems(rooms, 7, tiles, monsters, depth, tracker)

  // On boundary levels (5, 10, 15, 20, 26), enforce guarantees
  const boundaryLevels = [5, 10, 15, 20, 26]
  if (boundaryLevels.includes(depth)) {
    const deficits = tracker.getDeficits(depth)

    if (deficits.length > 0) {
      // Force spawn missing items to meet range guarantees
      level = itemSpawnService.forceSpawnForGuarantees(level, deficits)
    }

    // Reset tracker for next range (except after level 26)
    if (depth < 26) {
      tracker.resetRange(depth + 1)
    }
  }

  levels.push(level)
}
```

### Category Weight System

Items selected using weighted random from depth-appropriate category weights:

```typescript
// In ItemSpawnService.spawnItems()
const weights = this.getCategoryWeights(depth)  // From guarantees.json
const categories: string[] = []

// Build weighted pool
for (const [category, weight] of Object.entries(weights)) {
  for (let j = 0; j < weight; j++) {
    categories.push(category)
  }
}

const category = this.random.pickRandom(categories)  // e.g., 'potion'
```

**Example for Depth 1-5**:
- Pool has 20 'potion', 20 'scroll', 15 'weapon', 15 'armor', 12 'food', 8 'light', 5 'ring', 5 'wand'
- Total pool size: 100
- Each pick has 20% chance for potion, 12% for food, 5% for ring, etc.

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

### Depth-Based Category Evolution

**Early Game (1-5)**: Survival focus
- High potion/scroll weights (20 each) for healing and identification
- High weapon/armor weights (15 each) for combat effectiveness
- Light sources (8 weight) critical for FOV
- Rings/wands rare (5 weight) - utility items less important

**Mid-Early (6-10)**: Progression phase
- Potions/scrolls still important (18 each) - enchants appear
- Rings/wands more common (10 each) - utility becomes valuable
- Weapons/armor less common (12 each) - basic equipment covered
- Lanterns become available (within light category)

**Mid-Game (11-15)**: Utility focus
- Balanced potions/scrolls (16 each) - utility types dominate
- High rings/wands (14 each) - utility items shine
- Lower weapons/armor (10 each) - upgrades less critical
- Food stable (12 weight) - hunger ongoing concern

**Mid-Late (16-20)**: Advanced items
- Advanced potions/scrolls (15 each) - powerful consumables
- Dominant rings/wands (16 each) - build-defining utility
- Rare weapons/armor (8 each) - late-game upgrades
- Increased food (14 weight) - deeper runs need more resources

**Late Game (21-26)**: Endgame resources
- Powerful potions/scrolls (14 each) - critical consumables
- Dominant rings/wands (18 each) - maximum utility
- Very rare weapons/armor (6 each) - already well-equipped
- High food (16 weight) - hunger becomes dangerous threat

### Power Tier Progression

**Depth 1-8** (Basic Only):
- Only PowerTier.BASIC items spawn
- Minor Heal, Identify, Protection +1, etc.
- Prevents overpowered early items

**Depth 9-16** (Basic + Intermediate):
- PowerTier.INTERMEDIATE items unlock
- Medium Heal, Enchant Armor, Protection +2, etc.
- Moderate power increase

**Depth 17-26** (All Tiers):
- PowerTier.ADVANCED items spawn
- Superior Heal, Raise Level, Protection +3, etc.
- Full power range available

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

- [GuaranteeTracker](./GuaranteeTracker.md) - Tracks item spawns, calculates deficits for guarantee enforcement
- [DungeonService](./DungeonService.md) - Manages tracker lifecycle, enforces guarantees on boundary levels
- [IdentificationService](./IdentificationService.md) - Reveals true item names
- [CurseService](./CurseService.md) - Handles cursed equipment

---

## Design Rationale

### Why Fixed 7 Items Per Level?

**Problem**: Variable item counts (5-15 per level) caused inconsistent progression and made balancing impossible.

**Solution**: Fixed 7 items per level (35 per range) provides:
- Predictable resource availability
- Consistent pacing across all runs
- Reliable quota enforcement (known denominator)
- Easier balancing (fixed sample size)

### Why Depth-Based Category Weights?

**Problem**: Uniform category weights across all depths resulted in:
- Too many weapons/armor late game (already equipped)
- Too few consumables late game (needed for difficult encounters)
- Poor utility item distribution (rings/wands equally rare at all depths)

**Solution**: Depth-based weights shift focus as game progresses:
- **Early**: Survival items (healing, light, basic equipment)
- **Mid**: Utility items (rings, wands, utility consumables)
- **Late**: Endgame resources (food, powerful consumables, dominant utility)

### Why Power Tier Filtering?

**Problem**: Without filtering, powerful items could spawn early (Superior Heal on level 2) breaking progression.

**Solution**: Power tiers gate item strength by depth:
- **Depth 1-8**: Basic only (gentle learning curve)
- **Depth 9-16**: Basic + Intermediate (power ramp)
- **Depth 17-26**: All tiers (full challenge)

Ensures difficulty curve matches item power curve.

### Why Range-Based Guarantees?

**Problem**: Random spawning could result in critical item droughts (e.g., no healing for 10 levels).

**Solution**: Range-based quotas (tracked via GuaranteeTracker) ensure:
- Minimum resource availability per 5-level range
- Deficits corrected on boundary levels (5, 10, 15, 20, 26)
- Natural randomness within ranges preserved
- Predictable enforcement points for testing
