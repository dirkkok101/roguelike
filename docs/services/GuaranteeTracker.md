# GuaranteeTracker

**Location**: `src/services/GuaranteeTracker/GuaranteeTracker.ts`
**Dependencies**: GuaranteeConfig (from `data/guarantees.json`)
**Test Coverage**: Item tracking, deficit calculation, range transitions

---

## Purpose

Tracks item spawns across depth ranges and calculates deficits for quota enforcement. Ensures predictable item availability by monitoring category counts and identifying shortfalls on boundary levels.

---

## Public API

### Item Tracking

#### `recordItem(depth: number, item: Item): void`
Records item spawned in current depth range.

**Parameters**:
- `depth` - Dungeon level where item spawned (1-26)
- `item` - Item instance to track

**Tracked Categories**:
- `healingPotions` - Healing potions (MINOR_HEAL, MEDIUM_HEAL, MAJOR_HEAL, SUPERIOR_HEAL)
- `identifyScrolls` - Identify scrolls
- `enchantScrolls` - Enchant armor/weapon scrolls
- `weapons` - All weapon types
- `armors` - All armor types
- `rings` - All ring types
- `wands` - All wand types
- `food` - Food rations
- `lightSources` - Torches, lanterns, oil flasks, artifacts
- `lanterns` - Lanterns specifically (subset of lightSources)
- `artifacts` - Permanent light artifacts (subset of lightSources)
- `utilityPotions` - Non-healing potions
- `utilityScrolls` - Non-enchant/identify scrolls
- `advancedPotions` - High-tier potions
- `advancedScrolls` - High-tier scrolls
- `powerfulItems` - High-power tier items

**Example**:
```typescript
const tracker = new GuaranteeTracker(guarantees)

// Record items as they spawn
const healingPotion = createPotion(PotionType.MEDIUM_HEAL, position)
tracker.recordItem(depth, healingPotion)  // Increments healingPotions counter
```

---

### Deficit Calculation

#### `getDeficits(depth: number): ItemDeficit[]`
Calculates quota deficits for range ending at depth. Called on boundary levels (5, 10, 15, 20, 26).

**Parameters**:
- `depth` - Current boundary level (5, 10, 15, 20, or 26)

**Returns**: Array of `ItemDeficit` objects
```typescript
interface ItemDeficit {
  category: string          // Category name (e.g., "healingPotions")
  count: number             // Number of items to spawn to meet quota
  powerTiers: PowerTier[]   // Allowed power tiers for spawned items
}
```

**Deficit Calculation**:
```typescript
deficit = quota - actualCount
```

**Example**:
```typescript
// On level 5 (boundary level for 1-5 range)
const deficits = tracker.getDeficits(5)
// Returns: [
//   { category: 'healingPotions', count: 2, powerTiers: [PowerTier.BASIC] },
//   { category: 'identifyScrolls', count: 1, powerTiers: [PowerTier.BASIC] }
// ]
```

---

### Range Management

#### `resetRange(rangeStart: number): void`
Initializes tracking for next depth range.

**Parameters**:
- `rangeStart` - First depth of new range (1, 6, 11, 16, or 21)

**When to Call**: After enforcing guarantees on boundary level

**Example**:
```typescript
// After enforcing guarantees on level 5
tracker.resetRange(6)  // Initialize tracking for 6-10 range
```

---

## Depth Ranges

The tracker divides the 26-level dungeon into 5 depth ranges:

| Range | Depths | Emphasis |
|-------|--------|----------|
| **1-5** | 1-5 | Early survival (healing, identify, weapons, armor, light) |
| **6-10** | 6-10 | Mid-early progression (healing, enchants, rings, lanterns) |
| **11-15** | 11-15 | Mid-game balance (utility potions/scrolls, wands) |
| **16-20** | 16-20 | Mid-late power (advanced items, more food) |
| **21-26** | 21-26 | Late-game resources (powerful items, heavy food) |

---

## Guarantee Quotas

**Example Quotas** (from `data/guarantees.json`):

### Range 1-5 (Early Survival)
```typescript
{
  "healingPotions": 10,    // 2 per level average
  "identifyScrolls": 3,    // Essential for early equipment
  "weapons": 2,            // Upgrade opportunities
  "armors": 2,             // Defense options
  "food": 6,               // Hunger management
  "lightSources": 8        // Vision radius maintenance
}
```

### Range 6-10 (Progression)
```typescript
{
  "healingPotions": 8,     // Still critical
  "enchantScrolls": 2,     // Equipment enhancement
  "rings": 2,              // Utility options
  "lanterns": 1,           // Light upgrade
  "lightSources": 6,       // Continued support
  "food": 5                // Ongoing need
}
```

---

## Power Tier Filtering

Power tiers scale with depth to ensure appropriate item difficulty:

**Depth 1-8** (Early Game):
- Only `PowerTier.BASIC` items allowed

**Depth 9-16** (Mid Game):
- `PowerTier.BASIC` + `PowerTier.INTERMEDIATE` allowed

**Depth 17-26** (Late Game):
- `PowerTier.BASIC` + `PowerTier.INTERMEDIATE` + `PowerTier.ADVANCED` allowed

**Implementation**:
```typescript
private getAllowedTiersForCategory(category: string, depth: number): PowerTier[] {
  if (depth <= 8) return [PowerTier.BASIC]
  if (depth <= 16) return [PowerTier.BASIC, PowerTier.INTERMEDIATE]
  return [PowerTier.BASIC, PowerTier.INTERMEDIATE, PowerTier.ADVANCED]
}
```

---

## Implementation Details

### Internal State

```typescript
class GuaranteeTracker {
  private rangeCounters: Map<string, ItemCounts>  // Tracks counts per range
  private currentRange: string                     // Current range key ('1-5', etc)

  constructor(private config: GuaranteeConfig)
}
```

### Counter Initialization

All counters start at 0 for each range:
```typescript
private createEmptyCounter(): ItemCounts {
  return {
    healingPotions: 0,
    identifyScrolls: 0,
    enchantScrolls: 0,
    weapons: 0,
    armors: 0,
    rings: 0,
    wands: 0,
    food: 0,
    lightSources: 0,
    utilityPotions: 0,
    utilityScrolls: 0,
    advancedPotions: 0,
    advancedScrolls: 0,
    powerfulItems: 0,
    artifacts: 0,
    lanterns: 0
  }
}
```

---

## Usage in DungeonService

### Generation Loop with Guarantee Enforcement

```typescript
// Initialize tracker for first depth range
this.tracker.resetRange(1)

for (let depth = 1; depth <= 26; depth++) {
  // Generate level with fixed 7 items
  let level = this.generateLevel(depth, config)

  // Items already tracked via ItemSpawnService.spawnItems()

  // On boundary levels (5, 10, 15, 20, 26), enforce guarantees
  const boundaryLevels = [5, 10, 15, 20, 26]
  if (boundaryLevels.includes(depth)) {
    // Check if we met quotas for this range
    const deficits = this.tracker.getDeficits(depth)

    if (deficits.length > 0) {
      // Force spawn missing items to meet range guarantees
      level = this.itemSpawnService.forceSpawnForGuarantees(level, deficits)
    }

    // Reset tracker for next range (except after level 26)
    if (depth < 26) {
      this.tracker.resetRange(depth + 1)
    }
  }

  levels.push(level)
}
```

---

## Testing

**Test Files**:
- `GuaranteeTracker.test.ts` - Item tracking, deficit calculation, range transitions

**Example Test**:
```typescript
describe('GuaranteeTracker - Deficit Calculation', () => {
  test('calculates deficit for missing healing potions', () => {
    const tracker = new GuaranteeTracker(guarantees)

    // Spawn 8 healing potions in range 1-5 (quota is 10)
    for (let i = 0; i < 8; i++) {
      const potion = createPotion(PotionType.MEDIUM_HEAL, position)
      tracker.recordItem(3, potion)
    }

    // Check deficits on boundary level 5
    const deficits = tracker.getDeficits(5)

    expect(deficits).toContainEqual({
      category: 'healingPotions',
      count: 2,  // 10 quota - 8 actual
      powerTiers: [PowerTier.BASIC]
    })
  })
})
```

---

## Related Services

- [ItemSpawnService](./ItemSpawnService.md) - Calls `recordItem()` during spawn, uses `getDeficits()` for force spawning
- [DungeonService](./DungeonService.md) - Manages tracker lifecycle, enforces guarantees on boundary levels

---

## Design Rationale

### Why Range-Based Guarantees?

**Problem**: Purely random item spawning can result in unlucky droughts (e.g., 10 levels without healing potions).

**Solution**: Range-based quotas ensure predictable resource availability:
- Early game: Guaranteed healing and light
- Mid game: Guaranteed progression items (rings, enchants)
- Late game: Guaranteed survival resources (food, powerful items)

### Why Boundary Enforcement?

**Approach**: Check quotas only on boundary levels (5, 10, 15, 20, 26) instead of every level.

**Benefits**:
- Allows natural randomness within ranges
- Corrects deficits before range ends
- Predictable enforcement points for testing

### Why Power Tier Filtering?

**Approach**: Restrict item power tiers based on depth when enforcing deficits.

**Benefits**:
- Prevents overpowered early items (no ADVANCED potions on level 5)
- Maintains progression curve
- Ensures deficits filled with appropriate-difficulty items
