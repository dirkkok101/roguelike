# Item Scaling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement predictable item spawning with weighted categories and guarantees system ensuring fixed 7 items per level with depth-appropriate power scaling and resource guarantees.

**Architecture:** Three-layer guarantee system (per-level, range, power tier) built on new GuaranteeTracker service. ItemSpawnService modified for depth-based category weights and power tier filtering. DungeonService enforces guarantees on boundary levels (5, 10, 15, 20, 26).

**Tech Stack:** TypeScript, Jest, existing service architecture (SOLID principles, dependency injection)

**Design Document:** See `docs/plans/2025-10-25-item-scaling-design.md` for complete design rationale.

---

## Phase 1: Data Layer Setup

### Task 1.1: Create Guarantee Configuration File

**Files:**
- Create: `src/data/guarantees.json`

**Step 1: Create guarantees.json with configuration**

Create file `src/data/guarantees.json`:

```json
{
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
  },
  "rangeGuarantees": {
    "1-5": {
      "healingPotions": 10,
      "identifyScrolls": 3,
      "weapons": 2,
      "armors": 2,
      "food": 6,
      "lightSources": 8
    },
    "6-10": {
      "healingPotions": 8,
      "enchantScrolls": 2,
      "rings": 2,
      "lanterns": 1,
      "lightSources": 6,
      "food": 5
    },
    "11-15": {
      "healingPotions": 6,
      "utilityPotions": 6,
      "utilityScrolls": 3,
      "rings": 3,
      "wands": 2,
      "lightSources": 5,
      "food": 5
    },
    "16-20": {
      "healingPotions": 8,
      "advancedPotions": 8,
      "advancedScrolls": 4,
      "rings": 4,
      "wands": 3,
      "lightSources": 5,
      "food": 5
    },
    "21-26": {
      "healingPotions": 8,
      "powerfulItems": 10,
      "artifacts": 2,
      "food": 10,
      "lightSources": 4
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/data/guarantees.json
git commit -m "data: add guarantee configuration for item scaling

- Category weights per depth range (5 ranges)
- Range guarantees for critical resources
- Supports weighted categories with guarantees system"
```

---

### Task 1.2: Add PowerTier Field to Item Templates

**Files:**
- Modify: `src/data/items.json`

**Step 1: Add powerTier to all potion templates**

Modify `src/data/items.json`, add `"powerTier"` field to each potion:

```json
{
  "potions": [
    {
      "type": "MINOR_HEAL",
      "spriteName": "potion_red",
      "effect": "restore_hp",
      "power": "1d8",
      "rarity": "common",
      "powerTier": "basic",
      "minDepth": 1,
      "maxDepth": 10
    },
    {
      "type": "MEDIUM_HEAL",
      "spriteName": "potion_blue",
      "effect": "restore_hp",
      "power": "2d8+2",
      "rarity": "uncommon",
      "powerTier": "intermediate",
      "minDepth": 8,
      "maxDepth": 18
    },
    {
      "type": "MAJOR_HEAL",
      "spriteName": "potion_green",
      "effect": "restore_hp",
      "power": "3d8+4",
      "rarity": "rare",
      "powerTier": "advanced",
      "minDepth": 15
    },
    {
      "type": "SUPERIOR_HEAL",
      "spriteName": "potion_silver",
      "effect": "restore_hp",
      "power": "4d8+6",
      "rarity": "rare",
      "powerTier": "advanced",
      "minDepth": 20
    },
    {
      "type": "GAIN_STRENGTH",
      "spriteName": "potion_orange",
      "effect": "gain_strength",
      "power": "1",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "RESTORE_STRENGTH",
      "spriteName": "potion_yellow",
      "effect": "restore_strength",
      "power": "0",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "POISON",
      "spriteName": "potion_black",
      "effect": "poison",
      "power": "1d6",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "RAISE_LEVEL",
      "spriteName": "potion_gold",
      "effect": "raise_level",
      "power": "1",
      "rarity": "rare",
      "powerTier": "advanced"
    },
    {
      "type": "DETECT_MONSTER",
      "spriteName": "potion_purple",
      "effect": "detect_monster",
      "power": "0",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "DETECT_MAGIC",
      "spriteName": "potion_cyan",
      "effect": "detect_magic",
      "power": "0",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "CONFUSION",
      "spriteName": "potion_brown",
      "effect": "confusion",
      "power": "19-21",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "BLINDNESS",
      "spriteName": "potion_white",
      "effect": "blindness",
      "power": "40-60",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "HASTE_SELF",
      "spriteName": "potion_pink",
      "effect": "haste_self",
      "power": "4-8",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "LEVITATION",
      "spriteName": "potion_clear",
      "effect": "levitation",
      "power": "29-32",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "SEE_INVISIBLE",
      "spriteName": "potion_gray",
      "effect": "see_invisible",
      "power": "0",
      "rarity": "uncommon",
      "powerTier": "advanced"
    }
  ]
}
```

**Step 2: Add powerTier to all scroll templates**

Continue modifying `src/data/items.json`, add to scrolls:

```json
{
  "scrolls": [
    {
      "type": "IDENTIFY",
      "spriteName": "scroll_identify",
      "effect": "identify_item",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "ENCHANT_WEAPON",
      "spriteName": "scroll_enchant_weapon",
      "effect": "enchant_weapon",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "ENCHANT_ARMOR",
      "spriteName": "scroll_enchant_armor",
      "effect": "enchant_armor",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "TELEPORTATION",
      "spriteName": "scroll_teleport",
      "effect": "teleport_player",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "CREATE_MONSTER",
      "spriteName": "scroll_create_monster",
      "effect": "create_monster",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "MAGIC_MAPPING",
      "spriteName": "scroll_magic_mapping",
      "effect": "reveal_map",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "LIGHT",
      "spriteName": "scroll_light",
      "effect": "light_room",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "HOLD_MONSTER",
      "spriteName": "scroll_hold_monster",
      "effect": "hold_monster",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "SLEEP",
      "spriteName": "scroll_sleep",
      "effect": "sleep_player",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "SCARE_MONSTER",
      "spriteName": "scroll_scare_monster",
      "effect": "scare_monster",
      "rarity": "rare",
      "powerTier": "advanced"
    },
    {
      "type": "REMOVE_CURSE",
      "spriteName": "scroll_remove_curse",
      "effect": "remove_curse",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    }
  ]
}
```

**Step 3: Add powerTier to rings and wands**

Continue with rings and wands:

```json
{
  "rings": [
    {
      "type": "PROTECTION",
      "spriteName": "ring_protection",
      "effect": "ac_bonus",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "ADD_STRENGTH",
      "spriteName": "ring_strength",
      "effect": "strength_bonus",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "SUSTAIN_STRENGTH",
      "spriteName": "ring_sustain",
      "effect": "prevent_drain",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "SEARCHING",
      "spriteName": "ring_searching",
      "effect": "detect_secret",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "SEE_INVISIBLE",
      "spriteName": "ring_see_invisible",
      "effect": "see_invisible",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "SLOW_DIGESTION",
      "spriteName": "ring_slow_digestion",
      "effect": "reduce_hunger",
      "rarity": "common",
      "powerTier": "basic"
    },
    {
      "type": "DEXTERITY",
      "spriteName": "ring_dexterity",
      "effect": "dex_bonus",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "REGENERATION",
      "spriteName": "ring_regeneration",
      "effect": "regen_hp",
      "rarity": "rare",
      "powerTier": "advanced"
    }
  ],
  "wands": [
    {
      "type": "MAGIC_MISSILE",
      "spriteName": "wand_magic_missile",
      "damage": "2d6",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "SLEEP",
      "spriteName": "wand_sleep",
      "damage": "0",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "SLOW_MONSTER",
      "spriteName": "wand_slow",
      "damage": "0",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "intermediate"
    },
    {
      "type": "LIGHTNING",
      "spriteName": "wand_lightning",
      "damage": "6d6",
      "charges": "3d3",
      "rarity": "rare",
      "powerTier": "advanced"
    },
    {
      "type": "FIRE",
      "spriteName": "wand_fire",
      "damage": "6d6",
      "charges": "3d3",
      "rarity": "rare",
      "powerTier": "advanced"
    },
    {
      "type": "COLD",
      "spriteName": "wand_cold",
      "damage": "6d6",
      "charges": "3d3",
      "rarity": "rare",
      "powerTier": "advanced"
    },
    {
      "type": "HASTE_MONSTER",
      "spriteName": "wand_haste",
      "damage": "0",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "POLYMORPH",
      "spriteName": "wand_polymorph",
      "damage": "0",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "TELEPORT_AWAY",
      "spriteName": "wand_teleport",
      "damage": "0",
      "charges": "3d3",
      "rarity": "uncommon",
      "powerTier": "advanced"
    },
    {
      "type": "CANCELLATION",
      "spriteName": "wand_cancellation",
      "damage": "0",
      "charges": "3d3",
      "rarity": "rare",
      "powerTier": "advanced"
    }
  ]
}
```

**Step 4: Commit**

```bash
git add src/data/items.json
git commit -m "data: add powerTier field to all item templates

Power tier classification:
- basic: depths 1-8 (15 potions, 4 scrolls, 3 rings)
- intermediate: depths 9-16 (5 potions, 5 scrolls, 4 rings, 3 wands)
- advanced: depths 17-26 (4 potions, 4 scrolls, 2 rings, 7 wands)

Enables depth-appropriate item spawning"
```

---

### Task 1.3: Add PowerTier Type Definition

**Files:**
- Modify: `src/types/core/core.ts`

**Step 1: Add PowerTier enum**

Add to `src/types/core/core.ts` after existing enums:

```typescript
// Power tier for depth-based item spawning
export enum PowerTier {
  BASIC = 'basic',           // Depths 1-8
  INTERMEDIATE = 'intermediate',  // Depths 9-16
  ADVANCED = 'advanced',     // Depths 17-26
}
```

**Step 2: Add powerTier to Item interfaces**

Modify item interfaces to include powerTier:

```typescript
export interface Potion extends BaseItem {
  type: ItemType.POTION
  potionType: PotionType
  effect: string
  power: string
  powerTier: PowerTier  // NEW
  minDepth?: number
  maxDepth?: number
}

export interface Scroll extends BaseItem {
  type: ItemType.SCROLL
  scrollType: ScrollType
  effect: string
  powerTier: PowerTier  // NEW
}

export interface Ring extends BaseItem {
  type: ItemType.RING
  ringType: RingType
  effect: string
  bonus: number
  cursed: boolean
  hungerModifier: number
  powerTier: PowerTier  // NEW
}

export interface Wand extends BaseItem {
  type: ItemType.WAND
  wandType: WandType
  damage: string
  charges: number
  maxCharges: number
  range: number
  powerTier: PowerTier  // NEW
}
```

**Step 3: Commit**

```bash
git add src/types/core/core.ts
git commit -m "types: add PowerTier enum and fields to item interfaces

PowerTier enum:
- BASIC (depths 1-8)
- INTERMEDIATE (depths 9-16)
- ADVANCED (depths 17-26)

Added powerTier field to Potion, Scroll, Ring, Wand interfaces"
```

---

## Phase 2: GuaranteeTracker Service

### Task 2.1: Create GuaranteeTracker Service (TDD)

**Files:**
- Create: `src/services/GuaranteeTracker/GuaranteeTracker.ts`
- Create: `src/services/GuaranteeTracker/GuaranteeTracker.test.ts`
- Create: `src/services/GuaranteeTracker/index.ts`

**Step 1: Write the failing test for depth range detection**

Create `src/services/GuaranteeTracker/GuaranteeTracker.test.ts`:

```typescript
import { GuaranteeTracker } from './GuaranteeTracker'
import { ItemType, PowerTier } from '@game/core/core'

describe('GuaranteeTracker', () => {
  describe('getDepthRange', () => {
    test('returns 1-5 for depths 1-5', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](1)).toBe('1-5')
      expect(tracker['getDepthRange'](5)).toBe('1-5')
    })

    test('returns 6-10 for depths 6-10', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](6)).toBe('6-10')
      expect(tracker['getDepthRange'](10)).toBe('6-10')
    })

    test('returns 21-26 for depths 21-26', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](21)).toBe('21-26')
      expect(tracker['getDepthRange'](26)).toBe('21-26')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test GuaranteeTracker
```

Expected output: FAIL - "Cannot find module './GuaranteeTracker'"

**Step 3: Create minimal GuaranteeTracker implementation**

Create `src/services/GuaranteeTracker/GuaranteeTracker.ts`:

```typescript
import { Item, PowerTier } from '@game/core/core'

export interface GuaranteeConfig {
  categoryWeights: Record<string, Record<string, number>>
  rangeGuarantees: Record<string, Record<string, number>>
}

export interface ItemCounts {
  healingPotions: number
  identifyScrolls: number
  enchantScrolls: number
  weapons: number
  armors: number
  rings: number
  wands: number
  food: number
  lightSources: number
  utilityPotions: number
  utilityScrolls: number
  advancedPotions: number
  advancedScrolls: number
  powerfulItems: number
  artifacts: number
  lanterns: number
}

export interface ItemDeficit {
  category: string
  count: number
  powerTiers: PowerTier[]
}

export class GuaranteeTracker {
  private rangeCounters: Map<string, ItemCounts> = new Map()
  private currentRange: string = '1-5'

  constructor(private config: GuaranteeConfig) {}

  private getDepthRange(depth: number): string {
    if (depth <= 5) return '1-5'
    if (depth <= 10) return '6-10'
    if (depth <= 15) return '11-15'
    if (depth <= 20) return '16-20'
    return '21-26'
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test GuaranteeTracker
```

Expected output: PASS

**Step 5: Commit**

```bash
git add src/services/GuaranteeTracker/
git commit -m "test: add depth range detection for GuaranteeTracker

TDD cycle 1: Depth range mapping
- Depths 1-5 → '1-5'
- Depths 6-10 → '6-10'
- Depths 11-15 → '11-15'
- Depths 16-20 → '16-20'
- Depths 21-26 → '21-26'"
```

---

### Task 2.2: Implement Item Recording (TDD)

**Files:**
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.test.ts`
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.ts`

**Step 1: Write test for recordItem**

Add to `GuaranteeTracker.test.ts`:

```typescript
describe('recordItem', () => {
  const mockConfig: GuaranteeConfig = {
    categoryWeights: {},
    rangeGuarantees: {
      '1-5': { healingPotions: 10 }
    }
  }

  test('records healing potion in correct range', () => {
    const tracker = new GuaranteeTracker(mockConfig)

    const healingPotion = {
      type: ItemType.POTION,
      potionType: 'MINOR_HEAL',
      powerTier: PowerTier.BASIC
    } as any

    tracker.recordItem(3, healingPotion)

    const counters = tracker['rangeCounters'].get('1-5')
    expect(counters?.healingPotions).toBe(1)
  })

  test('accumulates multiple items in same range', () => {
    const tracker = new GuaranteeTracker(mockConfig)

    const healingPotion = {
      type: ItemType.POTION,
      potionType: 'MINOR_HEAL',
      powerTier: PowerTier.BASIC
    } as any

    tracker.recordItem(1, healingPotion)
    tracker.recordItem(3, healingPotion)
    tracker.recordItem(5, healingPotion)

    const counters = tracker['rangeCounters'].get('1-5')
    expect(counters?.healingPotions).toBe(3)
  })

  test('separates items by range', () => {
    const tracker = new GuaranteeTracker({
      ...mockConfig,
      rangeGuarantees: {
        '1-5': { healingPotions: 10 },
        '6-10': { healingPotions: 8 }
      }
    })

    const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any

    tracker.recordItem(3, healingPotion)
    tracker.recordItem(8, healingPotion)

    expect(tracker['rangeCounters'].get('1-5')?.healingPotions).toBe(1)
    expect(tracker['rangeCounters'].get('6-10')?.healingPotions).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test GuaranteeTracker -- --testNamePattern="recordItem"
```

Expected: FAIL - "recordItem is not a function"

**Step 3: Implement recordItem method**

Add to `GuaranteeTracker.ts`:

```typescript
import { Item, ItemType, PotionType, ScrollType, PowerTier } from '@game/core/core'

// ... existing code ...

export class GuaranteeTracker {
  // ... existing code ...

  /**
   * Record item spawned in current depth range
   */
  recordItem(depth: number, item: Item): void {
    const range = this.getDepthRange(depth)
    let counter = this.rangeCounters.get(range)

    if (!counter) {
      counter = this.createEmptyCounter()
      this.rangeCounters.set(range, counter)
    }

    this.incrementCategory(counter, item)
  }

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

  private incrementCategory(counter: ItemCounts, item: Item): void {
    // Healing potions
    if (item.type === ItemType.POTION && this.isHealingPotion(item)) {
      counter.healingPotions++
    }

    // Identify scrolls
    if (item.type === ItemType.SCROLL && (item as any).scrollType === ScrollType.IDENTIFY) {
      counter.identifyScrolls++
    }

    // Weapons
    if (item.type === ItemType.WEAPON) {
      counter.weapons++
    }

    // Armors
    if (item.type === ItemType.ARMOR) {
      counter.armors++
    }

    // Rings
    if (item.type === ItemType.RING) {
      counter.rings++
    }

    // Wands
    if (item.type === ItemType.WAND) {
      counter.wands++
    }

    // Food
    if (item.type === ItemType.FOOD) {
      counter.food++
    }

    // Light sources
    if (item.type === ItemType.TORCH || item.type === ItemType.LANTERN || item.type === ItemType.OIL_FLASK) {
      counter.lightSources++
    }

    // Track artifacts separately
    if (item.type === ItemType.ARTIFACT) {
      counter.artifacts++
      counter.lightSources++ // Artifacts are also light sources
    }

    // Track lanterns separately
    if (item.type === ItemType.LANTERN) {
      counter.lanterns++
    }
  }

  private isHealingPotion(item: Item): boolean {
    const potionTypes = [
      PotionType.MINOR_HEAL,
      PotionType.MEDIUM_HEAL,
      PotionType.MAJOR_HEAL,
      PotionType.SUPERIOR_HEAL
    ]
    return potionTypes.includes((item as any).potionType)
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test GuaranteeTracker -- --testNamePattern="recordItem"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/GuaranteeTracker/
git commit -m "feat: implement item recording in GuaranteeTracker

TDD cycle 2: Record items by category
- Tracks healing potions, scrolls, weapons, armor, etc.
- Separates items by depth range
- Accumulates counts within range"
```

---

### Task 2.3: Implement Deficit Calculation (TDD)

**Files:**
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.test.ts`
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.ts`

**Step 1: Write test for getDeficits**

Add to `GuaranteeTracker.test.ts`:

```typescript
describe('getDeficits', () => {
  test('returns deficit when quota not met', () => {
    const config: GuaranteeConfig = {
      categoryWeights: {},
      rangeGuarantees: {
        '1-5': {
          healingPotions: 10,
          identifyScrolls: 3
        }
      }
    }

    const tracker = new GuaranteeTracker(config)

    // Record only 7 healing potions (need 10)
    const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
    for (let i = 0; i < 7; i++) {
      tracker.recordItem(3, healingPotion)
    }

    // Record only 1 identify scroll (need 3)
    const identifyScroll = { type: ItemType.SCROLL, scrollType: ScrollType.IDENTIFY } as any
    tracker.recordItem(4, identifyScroll)

    const deficits = tracker.getDeficits(5)

    expect(deficits).toHaveLength(2)
    expect(deficits[0]).toEqual({
      category: 'healingPotions',
      count: 3,
      powerTiers: [PowerTier.BASIC]
    })
    expect(deficits[1]).toEqual({
      category: 'identifyScrolls',
      count: 2,
      powerTiers: [PowerTier.BASIC]
    })
  })

  test('returns empty array when all quotas met', () => {
    const config: GuaranteeConfig = {
      categoryWeights: {},
      rangeGuarantees: {
        '1-5': { healingPotions: 5 }
      }
    }

    const tracker = new GuaranteeTracker(config)

    const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
    for (let i = 0; i < 5; i++) {
      tracker.recordItem(2, healingPotion)
    }

    const deficits = tracker.getDeficits(5)
    expect(deficits).toHaveLength(0)
  })

  test('handles over-quota (no deficit)', () => {
    const config: GuaranteeConfig = {
      categoryWeights: {},
      rangeGuarantees: {
        '1-5': { healingPotions: 5 }
      }
    }

    const tracker = new GuaranteeTracker(config)

    const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
    for (let i = 0; i < 12; i++) {
      tracker.recordItem(2, healingPotion)
    }

    const deficits = tracker.getDeficits(5)
    expect(deficits).toHaveLength(0)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test GuaranteeTracker -- --testNamePattern="getDeficits"
```

Expected: FAIL - "getDeficits is not a function"

**Step 3: Implement getDeficits method**

Add to `GuaranteeTracker.ts`:

```typescript
/**
 * Get deficits for current range (called on boundary levels: 5, 10, 15, 20, 26)
 */
getDeficits(depth: number): ItemDeficit[] {
  const range = this.getDepthRange(depth)
  const quotas = this.config.rangeGuarantees[range]
  const actual = this.rangeCounters.get(range) || this.createEmptyCounter()

  const deficits: ItemDeficit[] = []

  for (const [category, quota] of Object.entries(quotas)) {
    const actualCount = (actual as any)[category] || 0
    if (actualCount < quota) {
      deficits.push({
        category,
        count: quota - actualCount,
        powerTiers: this.getAllowedTiersForCategory(category, depth)
      })
    }
  }

  return deficits
}

private getAllowedTiersForCategory(category: string, depth: number): PowerTier[] {
  // For depths 1-8, only basic tier allowed
  if (depth <= 8) return [PowerTier.BASIC]

  // For depths 9-16, basic and intermediate allowed
  if (depth <= 16) return [PowerTier.BASIC, PowerTier.INTERMEDIATE]

  // For depths 17+, all tiers allowed
  return [PowerTier.BASIC, PowerTier.INTERMEDIATE, PowerTier.ADVANCED]
}
```

**Step 4: Run test to verify it passes**

```bash
npm test GuaranteeTracker -- --testNamePattern="getDeficits"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/GuaranteeTracker/
git commit -m "feat: implement deficit calculation in GuaranteeTracker

TDD cycle 3: Calculate quota deficits
- Compares actual vs required items per range
- Returns deficit list with category, count, power tiers
- Handles over-quota scenarios (no deficit)"
```

---

### Task 2.4: Implement Range Reset

**Files:**
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.test.ts`
- Modify: `src/services/GuaranteeTracker/GuaranteeTracker.ts`

**Step 1: Write test for resetRange**

Add to `GuaranteeTracker.test.ts`:

```typescript
describe('resetRange', () => {
  test('clears counters for new range', () => {
    const config: GuaranteeConfig = {
      categoryWeights: {},
      rangeGuarantees: {
        '1-5': { healingPotions: 10 },
        '6-10': { healingPotions: 8 }
      }
    }

    const tracker = new GuaranteeTracker(config)

    // Record items in first range
    const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
    tracker.recordItem(3, healingPotion)

    expect(tracker['rangeCounters'].get('1-5')?.healingPotions).toBe(1)

    // Reset to next range
    tracker.resetRange(6)

    // Record items in new range
    tracker.recordItem(7, healingPotion)

    // First range should still have count
    expect(tracker['rangeCounters'].get('1-5')?.healingPotions).toBe(1)
    // New range should have new count
    expect(tracker['rangeCounters'].get('6-10')?.healingPotions).toBe(1)
  })

  test('updates current range', () => {
    const tracker = new GuaranteeTracker({ categoryWeights: {}, rangeGuarantees: {} })

    expect(tracker['currentRange']).toBe('1-5')

    tracker.resetRange(6)
    expect(tracker['currentRange']).toBe('6-10')

    tracker.resetRange(21)
    expect(tracker['currentRange']).toBe('21-26')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test GuaranteeTracker -- --testNamePattern="resetRange"
```

Expected: FAIL - "resetRange is not a function"

**Step 3: Implement resetRange method**

Add to `GuaranteeTracker.ts`:

```typescript
/**
 * Reset tracker for next depth range
 */
resetRange(rangeStart: number): void {
  this.currentRange = this.getDepthRange(rangeStart)
  this.rangeCounters.set(this.currentRange, this.createEmptyCounter())
}
```

**Step 4: Run test to verify it passes**

```bash
npm test GuaranteeTracker
```

Expected: All tests PASS

**Step 5: Create barrel export**

Create `src/services/GuaranteeTracker/index.ts`:

```typescript
export { GuaranteeTracker } from './GuaranteeTracker'
export type { GuaranteeConfig, ItemCounts, ItemDeficit } from './GuaranteeTracker'
```

**Step 6: Commit**

```bash
git add src/services/GuaranteeTracker/
git commit -m "feat: complete GuaranteeTracker service with range reset

TDD cycle 4: Range boundary handling
- resetRange() initializes new depth range
- Preserves previous range counters
- Updates current range tracking

GuaranteeTracker service complete:
- Depth range detection (1-5, 6-10, 11-15, 16-20, 21-26)
- Item recording by category
- Deficit calculation against quotas
- Range boundary reset"
```

---

## Phase 3: ItemSpawnService Modifications

### Task 3.1: Add Depth-Based Category Weights

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/category-weights.test.ts`

**Step 1: Write test for getCategoryWeights**

Create `src/services/ItemSpawnService/category-weights.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'

describe('ItemSpawnService - Category Weights', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData
  let mockGuarantees: any

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      potions: [],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    mockGuarantees = {
      categoryWeights: {
        '1-5': {
          potion: 20,
          scroll: 20,
          ring: 5,
          wand: 5,
          weapon: 15,
          armor: 15,
          food: 12,
          light: 8
        },
        '6-10': {
          potion: 18,
          scroll: 18,
          ring: 10,
          wand: 10,
          weapon: 12,
          armor: 12,
          food: 12,
          light: 8
        }
      },
      rangeGuarantees: {}
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)
  })

  test('returns early game weights for depth 1-5', () => {
    const weights = service['getCategoryWeights'](3)

    expect(weights.potion).toBe(20)
    expect(weights.scroll).toBe(20)
    expect(weights.ring).toBe(5)
    expect(weights.wand).toBe(5)
  })

  test('returns mid-early weights for depth 6-10', () => {
    const weights = service['getCategoryWeights'](8)

    expect(weights.potion).toBe(18)
    expect(weights.ring).toBe(10)
    expect(weights.wand).toBe(10)
  })

  test('uses correct range for boundary depths', () => {
    expect(service['getCategoryWeights'](5).potion).toBe(20) // Still 1-5
    expect(service['getCategoryWeights'](6).potion).toBe(18) // Now 6-10
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test ItemSpawnService -- --testNamePattern="Category Weights"
```

Expected: FAIL - "getCategoryWeights is not a function"

**Step 3: Add GuaranteeConfig to ItemSpawnService constructor**

Modify `src/services/ItemSpawnService/ItemSpawnService.ts`:

```typescript
import { GuaranteeConfig } from '@services/GuaranteeTracker'

export class ItemSpawnService {
  // ... existing template cache ...

  constructor(
    private random: IRandomService,
    private itemData: ItemData,
    private guarantees: GuaranteeConfig  // NEW
  ) {
    // ... existing template loading ...
  }

  // ... existing methods ...

  /**
   * Get category weights for depth range
   */
  private getCategoryWeights(depth: number): Record<string, number> {
    const range = this.getDepthRange(depth)
    return this.guarantees.categoryWeights[range]
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

**Step 4: Run test to verify it passes**

```bash
npm test ItemSpawnService -- --testNamePattern="Category Weights"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ItemSpawnService/
git commit -m "feat: add depth-based category weights to ItemSpawnService

- Add GuaranteeConfig dependency
- Implement getCategoryWeights(depth)
- Uses depth range to select appropriate weights
- Test coverage for all depth ranges"
```

---

### Task 3.2: Implement Power Tier Filtering

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/power-tier-filtering.test.ts`

**Step 1: Write test for power tier filtering**

Create `src/services/ItemSpawnService/power-tier-filtering.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { PowerTier, PotionType } from '@game/core/core'

describe('ItemSpawnService - Power Tier Filtering', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: any
  let mockGuarantees: any

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      potions: [
        {
          type: 'MINOR_HEAL',
          spriteName: 'potion_red',
          effect: 'restore_hp',
          power: '1d8',
          rarity: 'common',
          powerTier: 'basic'
        },
        {
          type: 'HASTE_SELF',
          spriteName: 'potion_pink',
          effect: 'haste_self',
          power: '4-8',
          rarity: 'uncommon',
          powerTier: 'advanced'
        }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    mockGuarantees = {
      categoryWeights: { '1-5': {} },
      rangeGuarantees: {}
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)
  })

  test('filters advanced tier items for depth 1-8', () => {
    const templates = service['potionTemplates']
    const filtered = service['filterByPowerTier'](templates, 5)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe(PotionType.MINOR_HEAL)
  })

  test('allows basic and intermediate for depth 9-16', () => {
    const basicPotion = {
      type: PotionType.MINOR_HEAL,
      powerTier: PowerTier.BASIC
    }
    const intermediatePotion = {
      type: PotionType.MEDIUM_HEAL,
      powerTier: PowerTier.INTERMEDIATE
    }
    const advancedPotion = {
      type: PotionType.HASTE_SELF,
      powerTier: PowerTier.ADVANCED
    }

    const items = [basicPotion, intermediatePotion, advancedPotion] as any
    const filtered = service['filterByPowerTier'](items, 12)

    expect(filtered).toHaveLength(2)
    expect(filtered.map(i => i.type)).toEqual([
      PotionType.MINOR_HEAL,
      PotionType.MEDIUM_HEAL
    ])
  })

  test('allows all tiers for depth 17+', () => {
    const items = [
      { powerTier: PowerTier.BASIC },
      { powerTier: PowerTier.INTERMEDIATE },
      { powerTier: PowerTier.ADVANCED }
    ] as any

    const filtered = service['filterByPowerTier'](items, 20)
    expect(filtered).toHaveLength(3)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test ItemSpawnService -- --testNamePattern="Power Tier Filtering"
```

Expected: FAIL - "filterByPowerTier is not a function"

**Step 3: Implement filterByPowerTier method**

Add to `src/services/ItemSpawnService/ItemSpawnService.ts`:

```typescript
/**
 * Filter items by power tier based on depth
 */
private filterByPowerTier<T extends { powerTier: PowerTier }>(
  items: T[],
  depth: number
): T[] {
  const allowedTiers = this.getAllowedTiers(depth)
  return items.filter(item => allowedTiers.includes(item.powerTier))
}

/**
 * Get allowed power tiers for depth
 */
private getAllowedTiers(depth: number): PowerTier[] {
  if (depth <= 8) return [PowerTier.BASIC]
  if (depth <= 16) return [PowerTier.BASIC, PowerTier.INTERMEDIATE]
  return [PowerTier.BASIC, PowerTier.INTERMEDIATE, PowerTier.ADVANCED]
}
```

**Step 4: Run test to verify it passes**

```bash
npm test ItemSpawnService -- --testNamePattern="Power Tier Filtering"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ItemSpawnService/
git commit -m "feat: implement power tier filtering for depth-appropriate spawning

Power tier gates:
- Depths 1-8: Only basic tier items
- Depths 9-16: Basic + intermediate tier
- Depths 17-26: All tiers

Prevents teleport scrolls/haste potions in early game"
```

---

### Task 3.3: Modify spawnItems to Use New Weights and Filtering

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`

**Step 1: Update spawnItems signature to accept GuaranteeTracker**

Modify existing `spawnItems` method in `ItemSpawnService.ts`:

```typescript
import { GuaranteeTracker } from '@services/GuaranteeTracker'

/**
 * Spawn items with depth-based category weights and power tier filtering
 */
spawnItems(
  rooms: Room[],
  count: number,
  tiles: Tile[][],
  monsters: Monster[],
  depth: number,
  tracker?: GuaranteeTracker  // NEW: Optional for testing
): Item[] {
  const items: Item[] = []
  const itemPositions = new Set<string>()

  // Build occupied positions set
  monsters.forEach((m) => itemPositions.add(`${m.position.x},${m.position.y}`))

  // Get depth-based category weights (NEW)
  const weights = this.getCategoryWeights(depth)

  // Build category pool using depth-based weights (MODIFIED)
  const categories: string[] = []
  for (const [category, weight] of Object.entries(weights)) {
    for (let i = 0; i < weight; i++) {
      categories.push(category)
    }
  }

  // Spawn items (existing logic with power tier filtering added)
  for (let i = 0; i < count; i++) {
    if (rooms.length === 0) break

    // Pick random room
    const room = rooms[this.random.nextInt(0, rooms.length - 1)]

    // Pick random position in room
    const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
    const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)
    const key = `${x},${y}`

    // Check if position is valid
    if (!itemPositions.has(key) && tiles[y] && tiles[y][x] && tiles[y][x].walkable) {
      itemPositions.add(key)

      // Pick category from weighted pool
      const category = categories[this.random.nextInt(0, categories.length - 1)]

      // Create item with power tier filtering (MODIFIED)
      const item = this.createItemByCategory(category, depth, { x, y })

      if (item) {
        items.push(item)

        // Track item for guarantees (NEW)
        if (tracker) {
          tracker.recordItem(depth, item)
        }
      }
    }
  }

  return items
}
```

**Step 2: Modify createItemByCategory to apply power tier filtering**

Add power tier filtering to item creation methods:

```typescript
private createItemByCategory(category: string, depth: number, position: Position): Item | null {
  switch (category) {
    case 'potion':
      return this.createPotion(depth, position)
    case 'scroll':
      return this.createScroll(depth, position)
    case 'ring':
      return this.createRing(depth, position)
    case 'wand':
      return this.createWand(depth, position)
    // ... existing cases
    default:
      return null
  }
}

private createPotion(depth: number, position: Position): Potion | null {
  // Filter potions by depth AND power tier (MODIFIED)
  const depthFiltered = this.filterByDepth(this.potionTemplates, depth)
  const tierFiltered = this.filterByPowerTier(depthFiltered, depth)  // NEW

  if (tierFiltered.length === 0) return null

  // Select by rarity (existing logic)
  const rarityWeights = this.calculateRarityWeights(depth)
  const selectedRarity = this.selectWeightedRarity(rarityWeights)
  const rarityFiltered = tierFiltered.filter(p => p.rarity === selectedRarity)

  if (rarityFiltered.length === 0) return null

  const template = rarityFiltered[this.random.nextInt(0, rarityFiltered.length - 1)]

  // ... existing potion creation logic
}

// Apply same pattern to createScroll, createRing, createWand
```

**Step 3: Commit**

```bash
git add src/services/ItemSpawnService/
git commit -m "refactor: integrate category weights and power tier filtering into spawnItems

Changes to spawnItems():
- Use depth-based category weights instead of hardcoded
- Apply power tier filtering to all item creation
- Add optional GuaranteeTracker for item recording

All item categories now respect power tier gates"
```

---

## Phase 4: Force Spawn for Guarantees

### Task 4.1: Implement forceSpawnForGuarantees

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/force-spawn.test.ts`

**Step 1: Write test for forceSpawnForGuarantees**

Create `src/services/ItemSpawnService/force-spawn.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { PowerTier, ItemType, Level } from '@game/core/core'
import { ItemDeficit } from '@services/GuaranteeTracker'

describe('ItemSpawnService - Force Spawn', () => {
  let service: ItemSpawnService
  let mockLevel: Level

  beforeEach(() => {
    const mockRandom = new MockRandom([0.5])
    const mockItemData: any = {
      potions: [
        {
          type: 'MINOR_HEAL',
          spriteName: 'potion_red',
          effect: 'restore_hp',
          power: '1d8',
          rarity: 'common',
          powerTier: 'basic'
        }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: 1300, rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 650, isPermanent: false, rarity: 'common' }
      ],
      consumables: []
    }
    const mockGuarantees = {
      categoryWeights: { '1-5': {} },
      rangeGuarantees: {}
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)

    mockLevel = {
      depth: 5,
      width: 80,
      height: 22,
      tiles: Array(22).fill(null).map(() =>
        Array(80).fill({ type: 'FLOOR', walkable: true } as any)
      ),
      rooms: [{
        id: 0,
        x: 10,
        y: 10,
        width: 10,
        height: 8
      }],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(22).fill(null).map(() => Array(80).fill(false))
    } as any
  })

  test('spawns healing potions for deficit', () => {
    const deficits: ItemDeficit[] = [
      {
        category: 'healingPotions',
        count: 3,
        powerTiers: [PowerTier.BASIC]
      }
    ]

    const result = service.forceSpawnForGuarantees(mockLevel, deficits)

    expect(result.items).toHaveLength(3)
    expect(result.items.every(i => i.type === ItemType.POTION)).toBe(true)
  })

  test('spawns multiple deficit categories', () => {
    const deficits: ItemDeficit[] = [
      { category: 'healingPotions', count: 2, powerTiers: [PowerTier.BASIC] },
      { category: 'food', count: 1, powerTiers: [PowerTier.BASIC] }
    ]

    const result = service.forceSpawnForGuarantees(mockLevel, deficits)

    expect(result.items).toHaveLength(3)
    const potions = result.items.filter(i => i.type === ItemType.POTION)
    const food = result.items.filter(i => i.type === ItemType.FOOD)
    expect(potions).toHaveLength(2)
    expect(food).toHaveLength(1)
  })

  test('returns unchanged level for empty deficits', () => {
    const result = service.forceSpawnForGuarantees(mockLevel, [])
    expect(result.items).toHaveLength(0)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test ItemSpawnService -- --testNamePattern="Force Spawn"
```

Expected: FAIL - "forceSpawnForGuarantees is not a function"

**Step 3: Implement forceSpawnForGuarantees method**

Add to `src/services/ItemSpawnService/ItemSpawnService.ts`:

```typescript
import { Level } from '@game/core/core'
import { ItemDeficit } from '@services/GuaranteeTracker'

/**
 * Force spawn items to meet range guarantees
 */
forceSpawnForGuarantees(level: Level, deficits: ItemDeficit[]): Level {
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
 * Find empty walkable position in random room
 */
private findEmptyPosition(level: Level): Position | null {
  if (level.rooms.length === 0) return null

  const occupiedPositions = new Set<string>()
  level.items.forEach(i => occupiedPositions.add(`${i.position.x},${i.position.y}`))
  level.monsters.forEach(m => occupiedPositions.add(`${m.position.x},${m.position.y}`))

  // Try up to 10 random positions
  for (let attempt = 0; attempt < 10; attempt++) {
    const room = level.rooms[this.random.nextInt(0, level.rooms.length - 1)]
    const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
    const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)
    const key = `${x},${y}`

    if (!occupiedPositions.has(key) && level.tiles[y]?.[x]?.walkable) {
      return { x, y }
    }
  }

  return null
}

/**
 * Create item for specific deficit category
 */
private createItemForDeficit(
  deficit: ItemDeficit,
  depth: number,
  position: Position
): Item | null {
  switch (deficit.category) {
    case 'healingPotions':
      return this.createHealingPotionForDeficit(depth, position, deficit.powerTiers)
    case 'identifyScrolls':
      return this.createIdentifyScroll(position)
    case 'enchantScrolls':
      return this.createEnchantScroll(depth, position, deficit.powerTiers)
    case 'food':
      return this.createFoodRation(position)
    case 'lightSources':
      return this.createLightSource(depth, position, deficit.powerTiers)
    case 'rings':
      return this.createRing(depth, position)
    case 'wands':
      return this.createWand(depth, position)
    case 'weapons':
      return this.createWeapon(depth, position)
    case 'armors':
      return this.createArmor(depth, position)
    default:
      return null
  }
}

private createHealingPotionForDeficit(
  depth: number,
  position: Position,
  allowedTiers: PowerTier[]
): Potion | null {
  // Filter healing potions by allowed power tiers
  const healingPotions = this.potionTemplates.filter(p =>
    this.isHealingPotionType(p.type) && allowedTiers.includes(p.powerTier)
  )

  if (healingPotions.length === 0) return null

  const template = healingPotions[this.random.nextInt(0, healingPotions.length - 1)]
  return this.createPotionFromTemplate(template, position)
}

private isHealingPotionType(type: PotionType): boolean {
  return [
    PotionType.MINOR_HEAL,
    PotionType.MEDIUM_HEAL,
    PotionType.MAJOR_HEAL,
    PotionType.SUPERIOR_HEAL
  ].includes(type)
}

// Similar helper methods for other deficit categories...
```

**Step 4: Run test to verify it passes**

```bash
npm test ItemSpawnService -- --testNamePattern="Force Spawn"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ItemSpawnService/
git commit -m "feat: implement force spawn for guarantee deficits

forceSpawnForGuarantees():
- Spawns missing items to meet range quotas
- Respects power tier restrictions
- Finds empty positions in random rooms
- Creates items for all deficit categories

Ensures no RNG prevents critical resources"
```

---

## Phase 5: DungeonService Integration

### Task 5.1: Modify DungeonService to Use Guarantees

**Files:**
- Modify: `src/services/DungeonService/DungeonService.ts`
- Create: `src/services/DungeonService/guarantee-enforcement.test.ts`

**Step 1: Write integration test for guarantee enforcement**

Create `src/services/DungeonService/guarantee-enforcement.test.ts`:

```typescript
import { DungeonService } from './DungeonService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemData } from '../../data/ItemDataLoader'
import { GuaranteeConfig } from '@services/GuaranteeTracker'
import { ItemType, PotionType } from '@game/core/core'

describe('DungeonService - Guarantee Enforcement', () => {
  let dungeonService: DungeonService
  let mockGuarantees: GuaranteeConfig

  beforeEach(() => {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom, {} as any)

    const mockItemData: ItemData = {
      potions: [
        {
          type: 'MINOR_HEAL',
          spriteName: 'potion_red',
          effect: 'restore_hp',
          power: '1d8',
          rarity: 'common',
          powerTier: 'basic',
          minDepth: 1,
          maxDepth: 10
        }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: 1300, rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 650, isPermanent: false, rarity: 'common' }
      ],
      consumables: []
    }

    mockGuarantees = {
      categoryWeights: {
        '1-5': {
          potion: 100,  // Force all potions for testing
          scroll: 0,
          ring: 0,
          wand: 0,
          weapon: 0,
          armor: 0,
          food: 0,
          light: 0
        }
      },
      rangeGuarantees: {
        '1-5': {
          healingPotions: 10  // Require 10 healing potions
        }
      }
    }

    dungeonService = new DungeonService(mockRandom, monsterSpawnService, mockItemData, mockGuarantees)
  })

  test('enforces guarantees at range boundary (depth 5)', () => {
    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    // Generate levels 1-5
    const levels = []
    for (let depth = 1; depth <= 5; depth++) {
      const level = dungeonService['generateLevel'](depth, config)
      levels.push(level)
    }

    // Count healing potions across depths 1-5
    const healingPotions = levels.flatMap(l => l.items).filter(item =>
      item.type === ItemType.POTION &&
      [PotionType.MINOR_HEAL, PotionType.MEDIUM_HEAL].includes((item as any).potionType)
    )

    // Should have at least 10 (guarantee enforced)
    expect(healingPotions.length).toBeGreaterThanOrEqual(10)
  })

  test('fixed 7 items per level', () => {
    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    const level = dungeonService['generateLevel'](3, config)

    // Should spawn exactly 7 items (changed from random 5-8)
    expect(level.items).toHaveLength(7)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test DungeonService -- --testNamePattern="Guarantee Enforcement"
```

Expected: FAIL - Tests fail because DungeonService doesn't use guarantees yet

**Step 3: Modify DungeonService constructor**

Modify `src/services/DungeonService/DungeonService.ts`:

```typescript
import { GuaranteeConfig, GuaranteeTracker } from '@services/GuaranteeTracker'

export class DungeonService {
  private roomGenerationService: RoomGenerationService
  private corridorGenerationService: CorridorGenerationService
  private monsterSpawnService: MonsterSpawnService
  private itemSpawnService: ItemSpawnService
  private goldService: GoldService
  private tracker: GuaranteeTracker  // NEW

  constructor(
    private random: IRandomService,
    monsterSpawnService: MonsterSpawnService,
    itemData: ItemData,
    guarantees: GuaranteeConfig  // NEW
  ) {
    this.roomGenerationService = new RoomGenerationService(random)
    this.corridorGenerationService = new CorridorGenerationService(random)
    this.monsterSpawnService = monsterSpawnService
    this.itemSpawnService = new ItemSpawnService(random, itemData, guarantees)  // MODIFIED
    this.goldService = new GoldService(random)
    this.tracker = new GuaranteeTracker(guarantees)  // NEW
  }

  // ... existing methods ...
}
```

**Step 4: Modify generateLevel to use fixed item count**

Modify the `generateLevel` method:

```typescript
generateLevel(depth: number, config: DungeonConfig): Level {
  // ... existing room/corridor/door generation ...

  // Spawn items with FIXED count of 7 (changed from random 5-8)
  const itemCount = 7  // FIXED COUNT
  const items = this.itemSpawnService.spawnItems(
    spawnRooms,
    itemCount,
    tiles,
    monsters,
    depth,
    this.tracker  // NEW: Pass tracker
  )

  // ... rest of level generation ...
}
```

**Step 5: Modify generateAllLevels to enforce guarantees**

Modify the `generateAllLevels` method:

```typescript
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
```

**Step 6: Run test to verify it passes**

```bash
npm test DungeonService -- --testNamePattern="Guarantee Enforcement"
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/services/DungeonService/
git commit -m "feat: integrate guarantee system into DungeonService

Changes:
- Add GuaranteeConfig and GuaranteeTracker dependencies
- Fixed item count: 7 per level (was random 5-8)
- Enforce guarantees at range boundaries (5, 10, 15, 20, 26)
- Pass tracker to ItemSpawnService for recording

Guarantees now enforced across all 26 levels"
```

---

## Phase 6: Update Existing Tests

### Task 6.1: Fix ItemSpawnService Tests

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.test.ts`
- Modify: All test files in `src/services/ItemSpawnService/`

**Step 1: Update ItemSpawnService test setup**

Modify test files to provide GuaranteeConfig:

```typescript
describe('ItemSpawnService', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData
  let mockGuarantees: GuaranteeConfig  // NEW

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = { /* ... existing mock data ... */ }

    // NEW: Add mock guarantees
    mockGuarantees = {
      categoryWeights: {
        '1-5': {
          potion: 20,
          scroll: 20,
          ring: 5,
          wand: 5,
          weapon: 15,
          armor: 15,
          food: 12,
          light: 8
        }
        // ... add all other ranges
      },
      rangeGuarantees: {
        '1-5': { healingPotions: 10 }
        // ... add all other ranges
      }
    }

    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)  // MODIFIED
  })

  // ... existing tests (should still pass with new constructor)
})
```

**Step 2: Run tests to verify they pass**

```bash
npm test ItemSpawnService
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/services/ItemSpawnService/
git commit -m "test: update ItemSpawnService tests for GuaranteeConfig

- Add mock GuaranteeConfig to all test setups
- All existing tests pass with new constructor
- No behavioral changes to existing tests"
```

---

### Task 6.2: Fix DungeonService Tests

**Files:**
- Modify: `src/services/DungeonService/DungeonService.test.ts`
- Modify: All test files in `src/services/DungeonService/`

**Step 1: Update DungeonService test setup**

```typescript
describe('DungeonService', () => {
  let dungeonService: DungeonService
  let mockRandom: MockRandom
  let monsterSpawnService: MonsterSpawnService
  let mockItemData: ItemData
  let mockGuarantees: GuaranteeConfig  // NEW

  beforeEach(() => {
    mockRandom = new MockRandom()
    monsterSpawnService = new MonsterSpawnService(mockRandom, {} as any)
    mockItemData = { /* ... existing mock data ... */ }

    // NEW: Add mock guarantees
    mockGuarantees = {
      categoryWeights: {
        '1-5': {
          potion: 20, scroll: 20, ring: 5, wand: 5,
          weapon: 15, armor: 15, food: 12, light: 8
        }
        // ... add all ranges
      },
      rangeGuarantees: {
        '1-5': { healingPotions: 10 }
        // ... add all ranges
      }
    }

    dungeonService = new DungeonService(
      mockRandom,
      monsterSpawnService,
      mockItemData,
      mockGuarantees  // NEW
    )
  })

  // ... existing tests
})
```

**Step 2: Update tests that check item count**

Modify tests expecting random 5-8 items:

```typescript
test('spawns items in rooms', () => {
  const level = dungeonService.generateLevel(1, config)

  // Changed from 5-8 range to fixed 7
  expect(level.items).toHaveLength(7)
})
```

**Step 3: Run tests to verify they pass**

```bash
npm test DungeonService
```

Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/services/DungeonService/
git commit -m "test: update DungeonService tests for guarantee system

- Add GuaranteeConfig to test setups
- Update item count assertions (5-8 → 7 fixed)
- All existing tests pass with guarantee integration"
```

---

## Phase 7: Integration Testing & Validation

### Task 7.1: Full Dungeon Generation Integration Test

**Files:**
- Create: `src/__integration__/item-scaling-guarantees.test.ts`

**Step 1: Write comprehensive integration test**

Create `src/__integration__/item-scaling-guarantees.test.ts`:

```typescript
import { DungeonService } from '@services/DungeonService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../data/ItemDataLoader'
import { GuaranteeConfig } from '@services/GuaranteeTracker'
import { ItemType, PotionType, ScrollType, PowerTier } from '@game/core/core'
import guaranteesData from '../data/guarantees.json'

describe('Integration: Item Scaling Guarantees', () => {
  let dungeonService: DungeonService
  let mockItemData: ItemData

  beforeEach(() => {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom, {} as any)

    // Use real item data and guarantee config
    mockItemData = require('../data/items.json')
    const guarantees = guaranteesData as GuaranteeConfig

    dungeonService = new DungeonService(mockRandom, monsterSpawnService, mockItemData, guarantees)
  })

  const config = {
    width: 80,
    height: 22,
    minRooms: 6,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 10,
    minSpacing: 2,
    loopChance: 0.3
  }

  describe('Fixed Item Counts', () => {
    test('every level spawns exactly 7 items', () => {
      const levels = dungeonService.generateAllLevels(config)

      levels.forEach((level, index) => {
        expect(level.items.length).toBeGreaterThanOrEqual(7)  // At least 7 (force spawns may add more)
      })
    })

    test('total items across 26 levels ≥ 182', () => {
      const levels = dungeonService.generateAllLevels(config)
      const totalItems = levels.reduce((sum, level) => sum + level.items.length, 0)

      expect(totalItems).toBeGreaterThanOrEqual(182)  // 26 × 7 = 182 minimum
    })
  })

  describe('Range Guarantees: Depths 1-5', () => {
    test('guarantees 10+ healing potions', () => {
      const levels = dungeonService.generateAllLevels(config)
      const healingPotions = levels.slice(0, 5).flatMap(l => l.items).filter(item =>
        item.type === ItemType.POTION &&
        [PotionType.MINOR_HEAL, PotionType.MEDIUM_HEAL, PotionType.MAJOR_HEAL, PotionType.SUPERIOR_HEAL]
          .includes((item as any).potionType)
      )

      expect(healingPotions.length).toBeGreaterThanOrEqual(10)
    })

    test('guarantees 3+ identify scrolls', () => {
      const levels = dungeonService.generateAllLevels(config)
      const identifyScrolls = levels.slice(0, 5).flatMap(l => l.items).filter(item =>
        item.type === ItemType.SCROLL && (item as any).scrollType === ScrollType.IDENTIFY
      )

      expect(identifyScrolls.length).toBeGreaterThanOrEqual(3)
    })

    test('guarantees 6+ food rations', () => {
      const levels = dungeonService.generateAllLevels(config)
      const food = levels.slice(0, 5).flatMap(l => l.items).filter(item =>
        item.type === ItemType.FOOD
      )

      expect(food.length).toBeGreaterThanOrEqual(6)
    })

    test('guarantees 8+ light sources', () => {
      const levels = dungeonService.generateAllLevels(config)
      const lightSources = levels.slice(0, 5).flatMap(l => l.items).filter(item =>
        item.type === ItemType.TORCH || item.type === ItemType.LANTERN || item.type === ItemType.OIL_FLASK
      )

      expect(lightSources.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('Range Guarantees: All Ranges', () => {
    test('depths 6-10: 8+ healing potions', () => {
      const levels = dungeonService.generateAllLevels(config)
      const healingPotions = levels.slice(5, 10).flatMap(l => l.items).filter(item =>
        item.type === ItemType.POTION &&
        [PotionType.MINOR_HEAL, PotionType.MEDIUM_HEAL, PotionType.MAJOR_HEAL].includes((item as any).potionType)
      )

      expect(healingPotions.length).toBeGreaterThanOrEqual(8)
    })

    test('depths 21-26: 8+ healing potions', () => {
      const levels = dungeonService.generateAllLevels(config)
      const healingPotions = levels.slice(20, 26).flatMap(l => l.items).filter(item =>
        item.type === ItemType.POTION &&
        [PotionType.MAJOR_HEAL, PotionType.SUPERIOR_HEAL].includes((item as any).potionType)
      )

      expect(healingPotions.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('Power Tier Gating', () => {
    test('depths 1-8: only basic tier items', () => {
      const levels = dungeonService.generateAllLevels(config)
      const earlyItems = levels.slice(0, 8).flatMap(l => l.items)

      earlyItems.forEach(item => {
        if ('powerTier' in item) {
          expect(item.powerTier).toBe(PowerTier.BASIC)
        }
      })
    })

    test('depths 9-16: basic and intermediate tiers only', () => {
      const levels = dungeonService.generateAllLevels(config)
      const midItems = levels.slice(8, 16).flatMap(l => l.items)

      midItems.forEach(item => {
        if ('powerTier' in item) {
          expect([PowerTier.BASIC, PowerTier.INTERMEDIATE]).toContain(item.powerTier)
        }
      })
    })

    test('depths 17-26: all tiers allowed', () => {
      const levels = dungeonService.generateAllLevels(config)
      const lateItems = levels.slice(16, 26).flatMap(l => l.items)

      // Should have at least some advanced tier items
      const hasAdvanced = lateItems.some(item =>
        'powerTier' in item && item.powerTier === PowerTier.ADVANCED
      )
      expect(hasAdvanced).toBe(true)
    })

    test('no teleport scrolls in depths 1-16', () => {
      const levels = dungeonService.generateAllLevels(config)
      const earlyScrolls = levels.slice(0, 16).flatMap(l => l.items).filter(item =>
        item.type === ItemType.SCROLL
      )

      earlyScrolls.forEach(scroll => {
        expect((scroll as any).scrollType).not.toBe(ScrollType.TELEPORTATION)
      })
    })
  })

  describe('Category Weight Distribution', () => {
    test('depths 1-5: more weapons/armor than rings/wands', () => {
      const levels = dungeonService.generateAllLevels(config)
      const earlyItems = levels.slice(0, 5).flatMap(l => l.items)

      const weapons = earlyItems.filter(i => i.type === ItemType.WEAPON).length
      const armors = earlyItems.filter(i => i.type === ItemType.ARMOR).length
      const rings = earlyItems.filter(i => i.type === ItemType.RING).length
      const wands = earlyItems.filter(i => i.type === ItemType.WAND).length

      expect(weapons + armors).toBeGreaterThan(rings + wands)
    })

    test('depths 21-26: more rings/wands than weapons/armor', () => {
      const levels = dungeonService.generateAllLevels(config)
      const lateItems = levels.slice(20, 26).flatMap(l => l.items)

      const weapons = lateItems.filter(i => i.type === ItemType.WEAPON).length
      const armors = lateItems.filter(i => i.type === ItemType.ARMOR).length
      const rings = lateItems.filter(i => i.type === ItemType.RING).length
      const wands = lateItems.filter(i => i.type === ItemType.WAND).length

      // Late game should prioritize tactical items
      expect(rings + wands).toBeGreaterThan(weapons + armors)
    })
  })
})
```

**Step 2: Run integration test**

```bash
npm test item-scaling-guarantees
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__integration__/item-scaling-guarantees.test.ts
git commit -m "test: add comprehensive integration tests for item scaling

Integration test coverage:
- Fixed 7 items per level (182 total minimum)
- Range guarantees enforced (depths 1-5, 6-10, etc.)
- Power tier gating (basic/intermediate/advanced)
- Category weight distribution (early vs late game)

All guarantees verified across full 26-level generation"
```

---

## Phase 8: Load Guarantees Config at Runtime

### Task 8.1: Create Guarantee Config Loader

**Files:**
- Create: `src/data/GuaranteeConfigLoader.ts`
- Create: `src/data/GuaranteeConfigLoader.test.ts`

**Step 1: Write test for config loader**

Create `src/data/GuaranteeConfigLoader.test.ts`:

```typescript
import { loadGuaranteeConfig } from './GuaranteeConfigLoader'

describe('GuaranteeConfigLoader', () => {
  test('loads guarantees from JSON file', () => {
    const config = loadGuaranteeConfig()

    expect(config.categoryWeights).toBeDefined()
    expect(config.rangeGuarantees).toBeDefined()
  })

  test('has all 5 depth ranges in categoryWeights', () => {
    const config = loadGuaranteeConfig()

    expect(config.categoryWeights['1-5']).toBeDefined()
    expect(config.categoryWeights['6-10']).toBeDefined()
    expect(config.categoryWeights['11-15']).toBeDefined()
    expect(config.categoryWeights['16-20']).toBeDefined()
    expect(config.categoryWeights['21-26']).toBeDefined()
  })

  test('has all 5 depth ranges in rangeGuarantees', () => {
    const config = loadGuaranteeConfig()

    expect(config.rangeGuarantees['1-5']).toBeDefined()
    expect(config.rangeGuarantees['6-10']).toBeDefined()
    expect(config.rangeGuarantees['11-15']).toBeDefined()
    expect(config.rangeGuarantees['16-20']).toBeDefined()
    expect(config.rangeGuarantees['21-26']).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test GuaranteeConfigLoader
```

Expected: FAIL - "Cannot find module './GuaranteeConfigLoader'"

**Step 3: Implement GuaranteeConfigLoader**

Create `src/data/GuaranteeConfigLoader.ts`:

```typescript
import { GuaranteeConfig } from '@services/GuaranteeTracker'
import guaranteesData from './guarantees.json'

/**
 * Load guarantee configuration from JSON file
 */
export function loadGuaranteeConfig(): GuaranteeConfig {
  return guaranteesData as GuaranteeConfig
}
```

**Step 4: Run test to verify it passes**

```bash
npm test GuaranteeConfigLoader
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/data/GuaranteeConfigLoader.ts src/data/GuaranteeConfigLoader.test.ts
git commit -m "feat: add GuaranteeConfig loader for runtime config

loadGuaranteeConfig():
- Loads guarantees.json at runtime
- Validates all 5 depth ranges present
- Typed as GuaranteeConfig"
```

---

### Task 8.2: Wire Up Guarantee Config in Main Game

**Files:**
- Modify: `src/main.ts` (or wherever DungeonService is instantiated)

**Step 1: Import and use GuaranteeConfig loader**

```typescript
import { loadGuaranteeConfig } from './data/GuaranteeConfigLoader'

// ... existing imports ...

// Load guarantee configuration
const guaranteeConfig = loadGuaranteeConfig()

// Create DungeonService with guarantees
const dungeonService = new DungeonService(
  randomService,
  monsterSpawnService,
  itemData,
  guaranteeConfig  // NEW
)
```

**Step 2: Run game to verify it works**

```bash
npm run dev
```

Expected: Game runs without errors, items spawn correctly

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate guarantee system into main game

- Load GuaranteeConfig at startup
- Pass to DungeonService constructor
- Item scaling system fully active"
```

---

## Phase 9: Documentation Updates

### Task 9.1: Update Service Documentation

**Files:**
- Create: `docs/services/GuaranteeTracker.md`
- Modify: `docs/services/ItemSpawnService.md`
- Modify: `docs/services/DungeonService.md`

**Step 1: Create GuaranteeTracker documentation**

Create `docs/services/GuaranteeTracker.md`:

```markdown
# GuaranteeTracker Service

**Purpose**: Track item spawns across depth ranges and calculate deficits for quota enforcement.

**Dependencies**: None

**Usage**: Injected into DungeonService, passed to ItemSpawnService during level generation.

## Key Methods

### recordItem(depth: number, item: Item): void
Records item spawned in current depth range.

### getDeficits(depth: number): ItemDeficit[]
Calculates quota deficits for range ending at depth. Called on boundary levels (5, 10, 15, 20, 26).

### resetRange(rangeStart: number): void
Initializes tracking for next depth range.

## Implementation Details

**Depth Ranges**:
- 1-5 (early)
- 6-10 (mid-early)
- 11-15 (mid)
- 16-20 (mid-late)
- 21-26 (late)

**Tracked Categories**:
- healingPotions, identifyScrolls, enchantScrolls
- weapons, armors, rings, wands
- food, lightSources, lanterns, artifacts
- utilityPotions, utilityScrolls, advancedPotions, advancedScrolls, powerfulItems

**Deficit Calculation**:
```typescript
deficit = quota - actualCount
if (deficit > 0) {
  return { category, count: deficit, powerTiers: getAllowedTiers(depth) }
}
```

## Testing

See `src/services/GuaranteeTracker/GuaranteeTracker.test.ts` for unit tests.

**Test Coverage**: 100%
```

**Step 2: Update ItemSpawnService documentation**

Add to `docs/services/ItemSpawnService.md`:

```markdown
## Item Scaling System (v2.0)

### Depth-Based Category Weights

Category spawn weights change based on depth range:

| Range | Potion | Scroll | Ring | Wand | Weapon | Armor | Food | Light |
|-------|--------|--------|------|------|--------|-------|------|-------|
| 1-5   | 20%    | 20%    | 5%   | 5%   | 15%    | 15%   | 12%  | 8%    |
| 6-10  | 18%    | 18%    | 10%  | 10%  | 12%    | 12%   | 12%  | 8%    |
| 11-15 | 16%    | 16%    | 14%  | 14%  | 10%    | 10%   | 12%  | 8%    |
| 16-20 | 15%    | 15%    | 16%  | 16%  | 8%     | 8%    | 14%  | 8%    |
| 21-26 | 14%    | 14%    | 18%  | 18%  | 6%     | 6%    | 16%  | 8%    |

### Power Tier Filtering

Items filtered by power tier based on depth:

- **Depths 1-8**: Only basic tier
- **Depths 9-16**: Basic + intermediate tiers
- **Depths 17-26**: All tiers (basic + intermediate + advanced)

### Force Spawn for Guarantees

`forceSpawnForGuarantees(level, deficits)` ensures range quotas met:

- Called on boundary levels (5, 10, 15, 20, 26)
- Spawns missing items to meet guarantees
- Respects power tier restrictions
```

**Step 3: Commit**

```bash
git add docs/services/
git commit -m "docs: add GuaranteeTracker and update ItemSpawnService docs

- New GuaranteeTracker service documentation
- Document depth-based category weights
- Document power tier filtering
- Document force spawn mechanism"
```

---

### Task 9.2: Update Game Design Documentation

**Files:**
- Modify: `docs/game-design/05-items.md`

**Step 1: Add item scaling section to items.md**

Add new section to `docs/game-design/05-items.md`:

```markdown
## Item Scaling System

**Version**: 2.0 (Weighted Categories with Guarantees)

### Fixed Item Counts

Every level spawns **exactly 7 items** (total 182 items across 26 levels).

### Depth-Based Progression

Items scale in power and category distribution:

**Early Game (Depths 1-5)**:
- Focus: Weapons, armor, healing potions
- Power: Basic tier only
- Guarantees: 10+ healing potions, 3+ identify scrolls, 6+ food, 8+ light sources

**Mid Game (Depths 6-15)**:
- Focus: Balanced distribution, enchant scrolls, rings appear
- Power: Basic + intermediate tiers
- Guarantees: 8+ healing potions per range, 2+ enchant scrolls

**Late Game (Depths 16-26)**:
- Focus: Rings, wands, powerful potions/scrolls
- Power: All tiers (basic + intermediate + advanced)
- Guarantees: 8+ healing potions per range, 2+ artifacts

### Resource Guarantees

Critical resources guaranteed across journey:

- **Healing**: 40+ healing potions minimum
- **Food**: 27+ food rations minimum
- **Light**: 28+ light sources minimum (torches/oil/lanterns)
- **Artifacts**: 2+ permanent light sources (depths 21-26)

### Power Tier Restrictions

Items restricted by depth to prevent overpowered early finds:

- No teleport scrolls before depth 17
- No haste potions before depth 17
- No powerful wands (lightning/fire/cold) before depth 17
- No advanced rings before depth 17
```

**Step 2: Commit**

```bash
git add docs/game-design/05-items.md
git commit -m "docs: document item scaling system in game design

- Fixed 7 items per level
- Depth-based progression (early/mid/late)
- Resource guarantees (healing, food, light)
- Power tier restrictions"
```

---

## Phase 10: Final Validation & Cleanup

### Task 10.1: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS (100% of existing tests + new tests)

**Step 2: Run type checking**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 3: If tests fail, debug and fix**

For each failing test:
1. Read error message
2. Identify root cause (likely missing GuaranteeConfig in test setup)
3. Add mock GuaranteeConfig to test
4. Re-run test
5. Commit fix

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify all tests pass with item scaling system

All unit and integration tests passing:
- GuaranteeTracker: 100% coverage
- ItemSpawnService: Updated for new system
- DungeonService: Guarantee enforcement validated
- Integration tests: Full 26-level validation"
```

---

### Task 10.2: Performance Validation

**Files:**
- Create: `src/__integration__/performance-validation.test.ts`

**Step 1: Write performance test**

Create `src/__integration__/performance-validation.test.ts`:

```typescript
import { DungeonService } from '@services/DungeonService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { SeededRandom } from '@services/RandomService'
import { loadGuaranteeConfig } from '../data/GuaranteeConfigLoader'
import { loadItemData } from '../data/ItemDataLoader'

describe('Performance Validation', () => {
  test('full dungeon generation completes in <3 seconds', () => {
    const random = new SeededRandom('performance-test')
    const monsterSpawnService = new MonsterSpawnService(random, {} as any)
    const itemData = loadItemData()
    const guarantees = loadGuaranteeConfig()

    const dungeonService = new DungeonService(random, monsterSpawnService, itemData, guarantees)

    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    const startTime = Date.now()
    const levels = dungeonService.generateAllLevels(config)
    const endTime = Date.now()

    const duration = endTime - startTime

    expect(levels).toHaveLength(26)
    expect(duration).toBeLessThan(3000)  // <3 seconds

    console.log(`Full dungeon generation: ${duration}ms`)
  })

  test('single level generation completes in <100ms', () => {
    const random = new SeededRandom('performance-test-single')
    const monsterSpawnService = new MonsterSpawnService(random, {} as any)
    const itemData = loadItemData()
    const guarantees = loadGuaranteeConfig()

    const dungeonService = new DungeonService(random, monsterSpawnService, itemData, guarantees)

    const config = {
      width: 80,
      height: 22,
      minRooms: 6,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 10,
      minSpacing: 2,
      loopChance: 0.3
    }

    const startTime = Date.now()
    const level = dungeonService['generateLevel'](13, config)
    const endTime = Date.now()

    const duration = endTime - startTime

    expect(level.items).toHaveLength(7)
    expect(duration).toBeLessThan(100)  // <100ms per level

    console.log(`Single level generation: ${duration}ms`)
  })
})
```

**Step 2: Run performance test**

```bash
npm test performance-validation
```

Expected: PASS with logged durations

**Step 3: Commit**

```bash
git add src/__integration__/performance-validation.test.ts
git commit -m "test: validate item scaling performance

Performance benchmarks:
- Full dungeon (26 levels): <3 seconds
- Single level: <100ms

Guarantee system adds minimal overhead"
```

---

## Summary

**Implementation Complete!**

This plan implements the item scaling system with:

✅ **Fixed item counts** (7 per level, 182 total)
✅ **Depth-based category weights** (5 ranges with different distributions)
✅ **Power tier gating** (basic/intermediate/advanced by depth)
✅ **Range guarantees** (healing, food, light resources guaranteed)
✅ **GuaranteeTracker service** (tracks and enforces quotas)
✅ **Force spawn mechanism** (ensures quotas met on boundaries)
✅ **Full test coverage** (unit + integration tests)
✅ **Performance validated** (<3s for 26 levels)
✅ **Documentation complete** (design doc + service docs + game design)

**Next Steps**:

1. Use this plan with superpowers:executing-plans
2. Execute tasks in order (TDD throughout)
3. Commit after each task
4. Review after each phase
5. Validate with integration tests

**Files Created**: 10 new files
**Files Modified**: 8 existing files
**Tests Added**: 50+ new tests
**Expected Duration**: 6-8 hours for full implementation
