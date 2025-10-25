# Item Scaling Design: Weighted Categories with Guarantees

**Version**: 1.0
**Date**: 2025-10-25
**Status**: Design Complete - Ready for Implementation
**Related Docs**: [Items](../game-design/05-items.md) | [Architecture](../architecture.md) | [ItemSpawnService](../services/ItemSpawnService.md)

---

## Executive Summary

This design replaces the current random item spawning (5-8 items per level) with a **predictable guarantee system** that ensures:
- **Fixed item counts** (7 items per level = 182 total across 26 levels)
- **Depth-appropriate power levels** (no teleport scrolls on level 1)
- **Smooth resource progression** (healing, food, light scale naturally)
- **Variety between runs** (weighted randomness within guardrails)

**Approach**: Weighted Categories with Guarantees - maintains current weighted random selection but adds guarantee layers to prevent unlucky RNG from blocking critical resources.

---

## Design Philosophy

### Three-Tier Guarantee System

1. **Per-Level Guarantees** - Every level gets baseline items
   - Fixed item count: 7 items per level (consistency)
   - Category weights adjust with depth (more rings/wands late game)
   - Minimum item types per level based on depth range

2. **Range Guarantees** - Multi-level windows ensure resources over depth ranges
   - Depth ranges: 1-5 (early), 6-10 (mid-early), 11-15 (mid), 16-20 (mid-late), 21-26 (late)
   - Track cumulative items across each range
   - Force-spawn deficits on final level of range (5, 10, 15, 20, 26)

3. **Power Tier Gating** - Items restricted by depth appropriateness
   - **Basic tier** (depths 1-8): Healing, identify, basic equipment
   - **Intermediate tier** (depths 9-16): Extra healing, enchant scrolls, protection rings
   - **Advanced tier** (depths 17-26): Haste, teleport, powerful wands, artifacts

### How Guarantees Work

- **GuaranteeTracker** service tracks items spawned during level generation
- On range boundaries (depths 5, 10, 15, 20, 26), check quotas
- If quota not met, force-spawn missing items on boundary level
- Example: Depths 1-5 need 10 healing potions. By depth 4, only 7 spawned → depth 5 forces 3 healing potions

---

## Fixed Item Count Per Level

**Change**: Random 5-8 items → **7 items per level**

**Total Items**: 26 levels × 7 items = **182 items** across full dungeon

**Rationale**:
- Predictable generation (no "unlucky" 5-item level when you need resources)
- Consistent with Rogue's philosophy of deterministic dungeon generation
- Easier to balance guarantees with fixed count

---

## Depth-Based Category Weights

Replace hardcoded weights (12 for most categories, 8 for wands) with **depth-based weight curves**:

| Depth Range    | Potion | Scroll | Ring | Wand | Weapon | Armor | Food | Light |
|----------------|--------|--------|------|------|--------|-------|------|-------|
| **1-5** (Early)    | 20%    | 20%    | 5%   | 5%   | 15%    | 15%   | 12%  | 8%    |
| **6-10** (Mid-early) | 18%    | 18%    | 10%  | 10%  | 12%    | 12%   | 12%  | 8%    |
| **11-15** (Mid)    | 16%    | 16%    | 14%  | 14%  | 10%    | 10%   | 12%  | 8%    |
| **16-20** (Mid-late) | 15%    | 15%    | 16%  | 16%  | 8%     | 8%    | 14%  | 8%    |
| **21-26** (Late)   | 14%    | 14%    | 18%  | 18%  | 6%     | 6%    | 16%  | 8%    |

**Progression Rationale**:
- **Early game**: More weapons/armor (survival gear), fewer rings/wands (limited tactical options)
- **Mid game**: Balanced distribution as player stabilizes
- **Late game**: More rings/wands (tactical depth), less basic equipment (already equipped)
- **Resources**: Gradually increase from 20% → 24% (longer journey needs more fuel/food)
- **Light sources**: Consistent 8% (critical resource, never reduce)

**Example - Depth 1 (7 items with early weights)**:
- 1-2 potions (20% = 1.4 items avg)
- 1-2 scrolls (20% = 1.4 items avg)
- 0-1 ring (5% = 0.35 items avg)
- 1 weapon (15% = 1.05 items avg)
- 1 armor (15% = 1.05 items avg)
- 1 food (12% = 0.84 items avg)
- 0-1 light source (8% = 0.56 items avg)

Weights create natural variety while maintaining expected distributions.

---

## Per-Level Guarantees

Minimum items per level based on depth range:

### Depths 1-5 (Early Survival):
- **At least 1 healing potion** per level
- **At least 1 scroll** per level (identify priority)
- **At least 1 food OR light source** per level (resource security)

### Depths 6-15 (Midgame Stabilization):
- **At least 1 potion** per level (healing or utility)
- **At least 1 scroll** per level
- **At least 1 food** per 2 levels (50% chance each level)

### Depths 16-26 (Late Game Power):
- **At least 1 ring OR wand** per level (tactical options)
- **At least 1 utility item** (potion/scroll) per level
- **At least 1 food** per level (hunger increases with rings equipped)

**Enforcement**: Checked during item spawning for each level. If minimum not met after weighted selection, force-spawn missing category.

---

## Range Guarantees

Cumulative quotas tracked across depth windows:

### Depths 1-5 (35 items total: 5 levels × 7 items):
- **10+ total healing potions** (survival critical)
- **3+ Scroll of Identify** (learn items early)
- **2+ weapons, 2+ armors** (upgrade options)
- **6+ food rations** (hunger security)

### Depths 6-10 (35 items total):
- **8+ healing potions** (sustain through mid-game)
- **2+ enchant scrolls** (weapon/armor upgrades)
- **2+ rings** (first meaningful rings)
- **1+ lantern** (light upgrade path)

### Depths 11-15 (35 items total):
- **6+ utility potions** (detect, haste, levitation)
- **3+ utility scrolls** (teleport, mapping)
- **3+ rings** (build variety)
- **2+ wands** (ranged tactical options)

### Depths 16-20 (35 items total):
- **8+ advanced potions** (gain level, extra healing)
- **4+ advanced scrolls** (scare monster, hold monster)
- **4+ rings** (late-game builds)
- **3+ wands** (tactical depth)

### Depths 21-26 (42 items total: 6 levels × 7 items):
- **10+ powerful items** (any category, high power tier)
- **2+ artifacts** (permanent light sources - fuel anxiety ends)
- **10+ food** (final push needs resources)

**Enforcement Mechanism**:

During `DungeonService.generateAllLevels()`:
1. **GuaranteeTracker** records items spawned in current depth range
2. On last level of range (5, 10, 15, 20, 26), check quotas
3. If quota not met, force-spawn missing items on that level
4. Example: Depth 5 check → only 8/10 healing potions → force-spawn 2 more Minor Healing potions

This ensures **no unlucky RNG** prevents critical item access.

---

## Power Tier Gating

Organize items into three clear power tiers to prevent inappropriate items at wrong depths:

### BASIC TIER (Depths 1-8):

**Potions**:
- Minor Healing (1d8 HP)
- Restore Strength
- Poison (cursed)

**Scrolls**:
- Identify
- Light
- Scroll of Sleep (cursed)
- Create Monster (cursed)

**Rings**:
- Slow Digestion
- Searching
- Protection +1 only

**Wands**:
- None (wands start at depth 6+ via category weights, depth 9+ for tier access)

**Equipment**:
- Basic weapons: Mace, Short Sword
- Light armor: Leather, Studded Leather, Ring Mail

---

### INTERMEDIATE TIER (Depths 9-16):

**Potions**:
- Medium Healing (2d8+2 HP)
- Detect Monster
- Detect Magic
- Confusion (cursed)
- Blindness (cursed)

**Scrolls**:
- Enchant Weapon
- Enchant Armor
- Magic Mapping
- Remove Curse

**Rings**:
- Protection (any bonus)
- Add Strength
- Sustain Strength
- Dexterity

**Wands**:
- Magic Missile (reliable damage)
- Sleep
- Slow Monster

**Equipment**:
- Intermediate weapons: Long Sword, Battle Axe
- Medium armor: Chain Mail, Banded Mail
- Lanterns (light upgrade)

---

### ADVANCED TIER (Depths 17-26):

**Potions**:
- Major Healing (3d8+4 HP)
- Superior Healing (4d8+6 HP)
- Raise Level
- Haste Self
- Levitation
- See Invisible

**Scrolls**:
- Teleportation
- Hold Monster
- Scare Monster (rare)

**Rings**:
- Regeneration
- See Invisible
- Teleportation (cursed)

**Wands**:
- Lightning (6d6 damage)
- Fire (6d6 damage)
- Cold (6d6 damage)
- Haste Monster
- Polymorph
- Teleport Away
- Cancellation

**Equipment**:
- Powerful weapons: Two-handed Sword, Claymore
- Heavy armor: Splint Mail, Plate Mail
- Artifacts: Phial of Galadriel, Star of Elendil (permanent light)

---

### Transition Zones (Tier Overlap):

To create smooth progression, tiers overlap at boundaries:

- **Depths 6-8**: Basic tier items + early intermediate (detect potions, enchant scrolls start appearing via weighted chance)
- **Depths 14-17**: Intermediate + early advanced (first powerful wands, haste potions via weighted chance)

**Implementation**:
- Each item template gets `powerTier: 'basic' | 'intermediate' | 'advanced'` field
- `ItemSpawnService.filterByPowerTier()` filters available items by depth's allowed tiers
- Example: Depth 5 → only 'basic' tier allowed → no teleport scrolls possible

**Allowed Tiers by Depth**:
- Depths 1-8: `['basic']`
- Depths 9-16: `['basic', 'intermediate']`
- Depths 17-26: `['basic', 'intermediate', 'advanced']`

---

## Resource Economy

Critical resources (healing, food, light) require careful balancing across 26-level journey.

### Healing Potion Economy

**Total Healing Potions**: ~50 potions across 26 levels (27% of 182 items)

**Distribution by Tier**:

| Tier | HP Restored | Depths | Count | Spawn Strategy |
|------|-------------|--------|-------|----------------|
| **Minor Heal** | 1d8 | 1-10 | 15 potions | 60% rate depths 1-5, 40% rate depths 6-8, 0% after depth 10 |
| **Medium Heal** | 2d8+2 | 8-18 | 18 potions | Bell curve peaking at depth 13, overlaps Minor (8-10) and Major (16-18) |
| **Major Heal** | 3d8+4 | 15-26 | 14 potions | Linear ramp from depth 15, primary late-game healing |
| **Superior Heal** | 4d8+6 | 20-26 | 3 potions | Rare emergency heals, boss encounter insurance |

**Guarantee Enforcement (Range Guarantees)**:
- Depths 1-5: Minimum **10 healing potions** (any tier valid for range)
- Depths 6-10: Minimum **8 healing potions**
- Depths 11-15: Minimum **6 healing potions**
- Depths 16-20: Minimum **8 healing potions** (monster damage scales up)
- Depths 21-26: Minimum **8 healing potions** (final push to Amulet)

**Total Guaranteed**: 40 healing potions minimum (80% of expected 50)

---

### Food Economy

**Journey Duration**: 26 levels × 500 turns avg/level = **13,000 turns**

**Hunger Consumption**:
- Base: 1 unit/turn = 13,000 food needed
- With rings (50% penalty): up to 19,500 food needed (2 rings equipped)

**Starting Food**: 1,300 units

**Food Rations**: 1,100-1,499 units each (avg 1,300 units)

**Required Food Rations**: 10-15 rations for full journey (13,000-19,500 food)

**Spawn Rate**: 12-16% scaling with depth
- Depths 1-5: 12% spawn weight
- Depths 21-26: 16% spawn weight

**Expected Spawns**: ~25 food rations across 26 levels (safety buffer above 10-15 required)

**Guarantee Enforcement (Range Guarantees)**:
- Depths 1-5: Minimum **6 food rations**
- Depths 6-10: Minimum **5 food rations**
- Depths 11-15: Minimum **5 food rations**
- Depths 16-20: Minimum **5 food rations**
- Depths 21-26: Minimum **6 food rations**

**Total Guaranteed**: 27 food rations (comfortable margin above 10-15 required)

---

### Light Source Economy

**Critical Importance**: Vision radius = 0 without light source (player blind)

**Fuel Consumption**: 26 levels × 500 turns avg = **13,000 turns** of fuel needed

**Light Source Types**:
- **Torches**: 650 fuel each → 20 torches needed for full journey
- **Lanterns**: Refillable, 750 starting + 600/oil flask

**Starting Equipment** (random):
- Option A: 1 torch (650 fuel) + 2 spare torches in inventory
- Option B: 1 lantern (750 fuel) + 2 oil flasks (1,200 fuel) in inventory

**Light Source Spawn Rates** (8% total):
- **Torches**: 4% all depths → 7.3 torches expected over 26 levels
- **Oil flasks**: 3% all depths → 5.5 flasks expected over 26 levels
- **Lanterns**: 1% depths 6+ → 2.1 lanterns expected over 20 levels
- **Artifacts**: <0.5% depths 18+ → 0-1 permanent light expected

**Expected Total Fuel** (worst case - all torches):
- Starting: ~1,950 fuel (3 torches)
- Found: ~6,500 fuel (10 torches + 3,300 oil from flasks)
- **Total: ~8,450 fuel (65% of needed 13,000)**

**Guarantee Enforcement (Range Guarantees)**:
- Depths 1-5: Minimum **8 light sources** (torches/oil/lanterns)
- Depths 6-10: Minimum **6 light sources**
- Depths 11-15: Minimum **5 light sources**
- Depths 16-20: Minimum **5 light sources**
- Depths 21-26: Minimum **4 light sources** + 1 artifact spawn chance

**Total Guaranteed**: 28+ light sources (provides ~85%+ fuel coverage)

**Artifact Solution**: Once artifact found (depths 18+), fuel management ends permanently. This creates **strategic progression milestone** where resource anxiety ends.

---

## Implementation Architecture

### Data Structure Changes

#### 1. Item Templates Enhancement (items.json)

Add `powerTier` field to all item templates:

```json
{
  "type": "HEAL",
  "spriteName": "potion_red",
  "effect": "restore_hp",
  "power": "1d8",
  "rarity": "common",
  "powerTier": "basic",           // NEW: 'basic' | 'intermediate' | 'advanced'
  "minDepth": 1,                   // EXISTING (keep for backwards compatibility)
  "maxDepth": 10                   // EXISTING (keep for backwards compatibility)
}
```

**Migration**: Add `powerTier` to all 13 potions, 11 scrolls, 8 rings, 10 wands in items.json.

---

#### 2. Guarantee Configuration (new file: data/guarantees.json)

Create new configuration file for guarantee system:

```json
{
  "perLevelGuarantees": {
    "1-5": {
      "healingPotion": 1,
      "scroll": 1,
      "foodOrLight": 1
    },
    "6-15": {
      "potion": 1,
      "scroll": 1
    },
    "16-26": {
      "ringOrWand": 1,
      "utilityItem": 1,
      "food": 1
    }
  },
  "rangeGuarantees": {
    "1-5": {
      "healingPotions": 10,
      "identifyScrolls": 3,
      "weapons": 2,
      "armor": 2,
      "food": 6,
      "lightSources": 8
    },
    "6-10": {
      "healingPotions": 8,
      "enchantScrolls": 2,
      "rings": 2,
      "lanterns": 1,
      "lightSources": 6
    },
    "11-15": {
      "healingPotions": 6,
      "utilityPotions": 6,
      "utilityScrolls": 3,
      "rings": 3,
      "wands": 2,
      "lightSources": 5
    },
    "16-20": {
      "healingPotions": 8,
      "advancedPotions": 8,
      "advancedScrolls": 4,
      "rings": 4,
      "wands": 3,
      "lightSources": 5
    },
    "21-26": {
      "healingPotions": 8,
      "powerfulItems": 10,
      "artifacts": 2,
      "food": 10,
      "lightSources": 4
    }
  },
  "categoryWeights": {
    "1-5": {
      "potion": 20,
      "scroll": 20,
      "ring": 5,
      "wand": 5,
      "weapon": 15,
      "armor": 15,
      "food": 12,
      "light": 8
    },
    "6-10": {
      "potion": 18,
      "scroll": 18,
      "ring": 10,
      "wand": 10,
      "weapon": 12,
      "armor": 12,
      "food": 12,
      "light": 8
    },
    "11-15": {
      "potion": 16,
      "scroll": 16,
      "ring": 14,
      "wand": 14,
      "weapon": 10,
      "armor": 10,
      "food": 12,
      "light": 8
    },
    "16-20": {
      "potion": 15,
      "scroll": 15,
      "ring": 16,
      "wand": 16,
      "weapon": 8,
      "armor": 8,
      "food": 14,
      "light": 8
    },
    "21-26": {
      "potion": 14,
      "scroll": 14,
      "ring": 18,
      "wand": 18,
      "weapon": 6,
      "armor": 6,
      "food": 16,
      "light": 8
    }
  }
}
```

---

### Service Architecture

#### New Service: GuaranteeTracker

```typescript
interface ItemCounts {
  healingPotions: number
  identifyScrolls: number
  weapons: number
  armor: number
  food: number
  lightSources: number
  // ... etc for all guarantee categories
}

interface ItemDeficit {
  category: string          // 'healingPotion', 'scroll', etc.
  count: number             // Number of items to force-spawn
  powerTier: PowerTier[]    // Allowed power tiers for this deficit
}

class GuaranteeTracker {
  private rangeCounters: Map<string, ItemCounts>
  private currentRange: string  // '1-5', '6-10', etc.

  constructor(private guarantees: GuaranteeConfig) {}

  /**
   * Record item spawned in current depth range
   */
  recordItem(depth: number, item: Item): void {
    const range = this.getDepthRange(depth)
    const counter = this.rangeCounters.get(range) || this.createEmptyCounter()

    // Increment appropriate category counter
    this.incrementCategory(counter, item)

    this.rangeCounters.set(range, counter)
  }

  /**
   * Get deficits for current range (called on boundary levels: 5, 10, 15, 20, 26)
   */
  getDeficits(depth: number): ItemDeficit[] {
    const range = this.getDepthRange(depth)
    const quotas = this.guarantees.rangeGuarantees[range]
    const actual = this.rangeCounters.get(range) || this.createEmptyCounter()

    const deficits: ItemDeficit[] = []

    for (const [category, quota] of Object.entries(quotas)) {
      const actualCount = actual[category] || 0
      if (actualCount < quota) {
        deficits.push({
          category,
          count: quota - actualCount,
          powerTier: this.getAllowedTiersForCategory(category, depth)
        })
      }
    }

    return deficits
  }

  /**
   * Reset tracker for next depth range
   */
  resetRange(rangeStart: number): void {
    this.currentRange = this.getDepthRange(rangeStart)
    this.rangeCounters.set(this.currentRange, this.createEmptyCounter())
  }

  private getDepthRange(depth: number): string {
    if (depth <= 5) return '1-5'
    if (depth <= 10) return '6-10'
    if (depth <= 15) return '11-15'
    if (depth <= 20) return '16-20'
    return '21-26'
  }
}
```

---

#### Modified Service: ItemSpawnService

```typescript
class ItemSpawnService {
  constructor(
    private random: IRandomService,
    private itemData: ItemData,
    private guarantees: GuaranteeConfig,      // NEW
    private tracker?: GuaranteeTracker        // NEW (optional for testing)
  ) {
    // ... existing template loading
  }

  /**
   * Spawn items with depth-based category weights (MODIFIED)
   */
  spawnItems(
    rooms: Room[],
    count: number,              // Will always be 7 from DungeonService
    tiles: Tile[][],
    monsters: Monster[],
    depth: number
  ): Item[] {
    const items: Item[] = []
    const itemPositions = new Set<string>()

    // Get depth-based category weights (NEW)
    const weights = this.getCategoryWeights(depth)

    // Build category pool using depth-based weights
    const categories: string[] = []
    for (const [category, weight] of Object.entries(weights)) {
      for (let i = 0; i < weight; i++) {
        categories.push(category)
      }
    }

    // Spawn items (existing logic with power tier filtering)
    for (let i = 0; i < count; i++) {
      // ... existing position selection logic

      const category = categories[this.random.nextInt(0, categories.length - 1)]
      const item = this.createItemByCategory(category, depth)

      if (item) {
        items.push(item)
        itemPositions.add(key)

        // Track item for guarantees (NEW)
        if (this.tracker) {
          this.tracker.recordItem(depth, item)
        }
      }
    }

    return items
  }

  /**
   * Get category weights for depth range (NEW)
   */
  private getCategoryWeights(depth: number): Record<string, number> {
    const range = this.getDepthRange(depth)
    return this.guarantees.categoryWeights[range]
  }

  /**
   * Filter items by power tier based on depth (NEW)
   */
  private filterByPowerTier(items: Item[], depth: number): Item[] {
    const allowedTiers = this.getAllowedTiers(depth)
    return items.filter(item =>
      allowedTiers.includes(item.powerTier)
    )
  }

  /**
   * Get allowed power tiers for depth (NEW)
   */
  private getAllowedTiers(depth: number): PowerTier[] {
    if (depth <= 8) return ['basic']
    if (depth <= 16) return ['basic', 'intermediate']
    return ['basic', 'intermediate', 'advanced']
  }

  /**
   * Force spawn items to meet range guarantees (NEW)
   */
  forceSpawnForGuarantees(
    level: Level,
    deficits: ItemDeficit[]
  ): Level {
    const newItems = [...level.items]

    for (const deficit of deficits) {
      for (let i = 0; i < deficit.count; i++) {
        // Find empty position in a random room
        const position = this.findEmptyPosition(level)
        if (!position) continue

        // Create item of required category and power tier
        const item = this.createItemForDeficit(deficit, level.depth, position)
        if (item) {
          newItems.push(item)
        }
      }
    }

    return {
      ...level,
      items: newItems
    }
  }

  /**
   * Create item for specific deficit category (NEW)
   */
  private createItemForDeficit(
    deficit: ItemDeficit,
    depth: number,
    position: Position
  ): Item | null {
    // Map deficit category to item type
    switch (deficit.category) {
      case 'healingPotions':
        return this.createHealingPotion(depth, position, deficit.powerTier)
      case 'identifyScrolls':
        return this.createIdentifyScroll(position)
      case 'food':
        return this.createFoodRation(position)
      case 'lightSources':
        return this.createLightSource(depth, position)
      // ... etc for all categories
      default:
        return null
    }
  }
}
```

---

#### Modified Service: DungeonService

```typescript
class DungeonService {
  private tracker: GuaranteeTracker  // NEW

  constructor(
    private random: IRandomService,
    monsterSpawnService: MonsterSpawnService,
    itemData: ItemData,
    guarantees: GuaranteeConfig        // NEW
  ) {
    this.tracker = new GuaranteeTracker(guarantees)
    this.itemSpawnService = new ItemSpawnService(
      random,
      itemData,
      guarantees,
      this.tracker                      // NEW: inject tracker
    )
    // ... existing service initialization
  }

  /**
   * Generate all 26 dungeon levels with guarantee enforcement (MODIFIED)
   */
  generateAllLevels(config: DungeonConfig): Level[] {
    const levels: Level[] = []
    this.tracker.resetRange(1)  // Initialize first range (1-5)

    for (let depth = 1; depth <= 26; depth++) {
      // Generate level normally with FIXED 7 items
      let level = this.generateLevel(depth, config)

      // Items already tracked via ItemSpawnService.spawnItems()

      // On range boundaries (5, 10, 15, 20, 26), enforce guarantees
      if ([5, 10, 15, 20, 26].includes(depth)) {
        const deficits = this.tracker.getDeficits(depth)

        if (deficits.length > 0) {
          // Force spawn missing items to meet quotas
          level = this.itemSpawnService.forceSpawnForGuarantees(level, deficits)
        }

        // Reset tracker for next range
        if (depth < 26) {
          this.tracker.resetRange(depth + 1)
        }
      }

      levels.push(level)
    }

    return levels
  }

  /**
   * Generate single level (MODIFIED - fixed item count)
   */
  generateLevel(depth: number, config: DungeonConfig): Level {
    // ... existing room/corridor/door generation

    // Spawn items with FIXED count of 7 (changed from random 5-8)
    const itemCount = 7  // FIXED COUNT
    const items = this.itemSpawnService.spawnItems(
      spawnRooms,
      itemCount,
      tiles,
      monsters,
      depth
    )

    // ... rest of level generation
  }
}
```

---

## Enforcement Example

**Scenario**: End of depth range 1-5 (depth 5 generation)

```typescript
// During generation of depths 1-5:
// Depth 1: 2 healing potions spawned
// Depth 2: 3 healing potions spawned
// Depth 3: 1 healing potion spawned
// Depth 4: 2 healing potions spawned
// Total so far: 8 healing potions

// Depth 5 generation:
const level = dungeonService.generateLevel(5, config)
// Depth 5 normally spawns 1 healing potion
// Total now: 9 healing potions

// Guarantee check (on boundary level 5):
const deficits = tracker.getDeficits(5)
// Returns: [{ category: 'healingPotions', count: 1, powerTier: ['basic'] }]
// (Quota is 10, only 9 spawned)

// Force spawn deficit:
level = itemSpawnService.forceSpawnForGuarantees(level, deficits)
// Adds 1 Minor Healing potion to random room on depth 5

// Final result: 10 healing potions in depths 1-5 (quota met)
```

---

## Migration Path

### Phase 1: Data Layer
1. Add `powerTier` field to all items in `data/items.json`
2. Create `data/guarantees.json` with all configurations
3. Add loader for guarantees.json (`GuaranteeConfigLoader`)

### Phase 2: Tracker Service
1. Implement `GuaranteeTracker` service
2. Write unit tests for tracking and deficit calculation
3. Test range boundary detection (5, 10, 15, 20, 26)

### Phase 3: ItemSpawnService Modifications
1. Add depth-based category weight selection
2. Implement power tier filtering
3. Implement `forceSpawnForGuarantees()` method
4. Inject GuaranteeTracker (optional dependency for testing)
5. Update tests for new behaviors

### Phase 4: DungeonService Integration
1. Change item count from random 5-8 → fixed 7
2. Inject GuaranteeConfig and GuaranteeTracker
3. Add guarantee enforcement on boundary levels
4. Update dungeon generation tests

### Phase 5: Validation
1. Generate 100 full dungeons (26 levels each)
2. Verify all range guarantees met 100% of time
3. Verify category weight distributions match expected percentages
4. Verify no power tier violations (no teleport on depth 1, etc.)
5. Statistical analysis: mean/stddev of item counts per category

---

## Testing Strategy

### Unit Tests

**GuaranteeTracker**:
- Test item recording across ranges
- Test deficit calculation at boundaries
- Test range reset logic
- Edge case: empty range (no items spawned)

**ItemSpawnService**:
- Test depth-based category weight selection
- Test power tier filtering (depths 1-8, 9-16, 17-26)
- Test force spawn logic for each deficit category
- Test integration with GuaranteeTracker

**DungeonService**:
- Test fixed item count (7 per level)
- Test guarantee enforcement on boundaries
- Test range reset between boundaries

### Integration Tests

**Full Dungeon Generation**:
```typescript
test('guarantees enforced across all 26 levels', () => {
  const levels = dungeonService.generateAllLevels(config)

  // Verify depths 1-5 guarantees
  const healingPotions1to5 = countItemsInRange(levels, 1, 5, 'healingPotion')
  expect(healingPotions1to5).toBeGreaterThanOrEqual(10)

  // Verify depths 6-10 guarantees
  const enchantScrolls6to10 = countItemsInRange(levels, 6, 10, 'enchantScroll')
  expect(enchantScrolls6to10).toBeGreaterThanOrEqual(2)

  // ... verify all range guarantees
})

test('no power tier violations', () => {
  const levels = dungeonService.generateAllLevels(config)

  // Depths 1-8: only basic tier
  const earlyItems = levels.slice(0, 8).flatMap(l => l.items)
  expect(earlyItems.every(i => i.powerTier === 'basic')).toBe(true)

  // Depths 17+: advanced tier allowed
  const lateItems = levels.slice(16).flatMap(l => l.items)
  const hasAdvanced = lateItems.some(i => i.powerTier === 'advanced')
  expect(hasAdvanced).toBe(true)
})
```

### Statistical Validation

```typescript
test('category weights match expected distribution', () => {
  const runs = 100
  const stats = { potion: 0, scroll: 0, ring: 0, /* ... */ }

  for (let i = 0; i < runs; i++) {
    const levels = dungeonService.generateAllLevels(config)
    const depth1to5Items = levels.slice(0, 5).flatMap(l => l.items)

    depth1to5Items.forEach(item => {
      stats[item.category]++
    })
  }

  // Depths 1-5: 35 items × 100 runs = 3500 items
  // Expected: 20% potions = 700 ± 50 (statistical variance)
  expect(stats.potion).toBeGreaterThanOrEqual(650)
  expect(stats.potion).toBeLessThanOrEqual(750)

  // ... verify all categories
})
```

---

## Success Criteria

### Functional Requirements
- ✅ All 26 levels spawn exactly 7 items each (182 total)
- ✅ All range guarantees met 100% of the time
- ✅ No power tier violations (wrong tier items at wrong depths)
- ✅ Category weights match expected distribution (±10% variance)

### Player Experience
- ✅ Players always find minimum healing potions (no death from lack of healing)
- ✅ Food/light never runs out before finding more (no resource starvation)
- ✅ Early game feels different from late game (basic → intermediate → advanced progression)
- ✅ Runs feel varied (weighted randomness creates different item mixes)

### Performance
- ✅ Level generation time unchanged (<100ms per level)
- ✅ Full dungeon generation <3 seconds (26 levels)

---

## Future Enhancements (Post-v1)

1. **Dynamic Difficulty Scaling**: Adjust guarantees based on player performance
2. **Item Set Bonuses**: Guarantee complementary items (wand + charges, armor + enchant scroll)
3. **Cursed Item Balancing**: Reduce curse rate in early game, increase in late game
4. **Artifact Placement**: Guarantee artifact on specific depths (18, 22, 26)
5. **Player Feedback Integration**: Adjust guarantees based on player survey data

---

## References

- **Original Rogue (1980)**: Deterministic level generation philosophy
- **NetHack**: Item rarity tiers and depth restrictions
- **Angband**: Resource economy balancing (food, light, healing)
- **Current Implementation**: [ItemSpawnService](../../src/services/ItemSpawnService/ItemSpawnService.ts)

---

**End of Design Document**
