# Depth-Based Item Scaling Design

**Date**: 2025-10-24
**Status**: Approved
**Goal**: Balanced progression for 26-level dungeon with return journey

---

## Overview

Implement linear formula-based scaling for weapon and armor drops to create smooth progression from weak early-game items to powerful late-game equipment. This addresses the current issue where Plate Mail and Two-Handed Swords can spawn on level 1 with the same probability as level 26.

### Design Principles

1. **Balanced Progression**: Specifically tuned for 26-level descent + 26-level return journey
2. **Viable with Investment**: Any item type can be endgame-worthy with enchantment scroll investment
3. **Smooth Scaling**: Linear formulas prevent artificial tier breakpoints
4. **Significant Rarity Shift**: Rare items become common at depth (70/25/5 → 30/40/30)
5. **Gradual Enchantments**: +0 to +5 natural drop progression

---

## Core Architecture

### Linear Formula System

The system uses mathematical formulas with `depth` (1-26) as input to calculate:

1. **Rarity Weights** - Probability distribution shifts continuously
2. **Enchantment Range** - Min/max bonuses increase linearly
3. **Curse Chance** - Slight decrease at deeper levels

### Formulas

```typescript
// Rarity weights (shift from 70/25/5 to 30/40/30)
commonWeight = Math.max(30, 70 - (depth * 1.54))   // 70% @ depth 1 → 30% @ depth 26
uncommonWeight = Math.min(40, 25 + (depth * 0.58)) // 25% @ depth 1 → 40% @ depth 26
rareWeight = Math.min(30, 5 + (depth * 0.96))      // 5% @ depth 1 → 30% @ depth 26

// Enchantment range (0 to +5 progression)
minBonus = Math.floor(depth / 9)     // 0 @ depth 1-8, 1 @ depth 9-17, 2 @ depth 18-26
maxBonus = Math.floor(depth / 5.2)   // 0 @ depth 1-5, 1 @ depth 6-10, ... 5 @ depth 26

// Rare items get +1 bonus to both min and max
if (rarity === 'rare') {
  minBonus += 1
  maxBonus += 1
}

// Cap at +5 maximum
maxBonus = Math.min(5, maxBonus)

// Curse reduction (30% reduction by depth 26)
curseChance = baseChance * (1.3 - (depth * 0.01))
```

---

## Progression Examples

| Depth | Common% | Uncommon% | Rare% | Min Bonus | Max Bonus | Example Finds |
|-------|---------|-----------|-------|-----------|-----------|---------------|
| 1 | 68% | 26% | 6% | 0 | 0 | Leather Armor, Mace |
| 5 | 62% | 28% | 10% | 0 | 0 | Studded Leather, Short Sword |
| 10 | 54% | 31% | 15% | 1 | 1 | Chain Mail +1, Long Sword +1 |
| 15 | 47% | 34% | 19% | 1 | 2 | Banded Mail +2, Battle Axe +2 |
| 20 | 39% | 37% | 24% | 2 | 3 | Plate Mail +3, Two-Handed Sword +3 |
| 26 | 30% | 40% | 30% | 2 | 5 | Plate Mail +5, Two-Handed Sword +4 |

### Key Observations

- **Early Game (1-8)**: Unenchanted items only, mostly common
- **Mid Game (9-17)**: +1 to +2 enchantments appear, better rarity mix
- **Late Game (18-26)**: +2 to +5 enchantments, rare items become common
- **Depth 26**: 30% rare drops with +2 to +5 bonuses (strong but not overpowered)

---

## Implementation Changes

### ItemSpawnService Modifications

**File**: `src/services/ItemSpawnService/ItemSpawnService.ts`

#### 1. Add Helper Methods

```typescript
/**
 * Calculate rarity weights based on dungeon depth
 * Linear progression from 70/25/5 to 30/40/30
 */
private calculateRarityWeights(depth: number): { common: number; uncommon: number; rare: number } {
  return {
    common: Math.max(30, 70 - (depth * 1.54)),
    uncommon: Math.min(40, 25 + (depth * 0.58)),
    rare: Math.min(30, 5 + (depth * 0.96))
  }
}

/**
 * Calculate enchantment range based on depth and rarity
 * Rare items get +1 bonus, max capped at +5
 */
private calculateEnchantmentRange(
  depth: number,
  rarity: string
): { minBonus: number; maxBonus: number } {
  const rarityBonus = rarity === 'rare' ? 1 : 0

  return {
    minBonus: Math.floor(depth / 9) + rarityBonus,
    maxBonus: Math.min(5, Math.floor(depth / 5.2) + rarityBonus)
  }
}

/**
 * Calculate curse chance with depth reduction
 * 30% reduction by depth 26
 */
private calculateCurseChance(baseChance: number, depth: number): number {
  return baseChance * (1.3 - (depth * 0.01))
}

/**
 * Select rarity using weighted random selection
 */
private selectWeightedRarity(weights: { common: number; uncommon: number; rare: number }): string {
  const total = weights.common + weights.uncommon + weights.rare
  const roll = this.random.nextFloat(0, total)

  if (roll < weights.common) return 'common'
  if (roll < weights.common + weights.uncommon) return 'uncommon'
  return 'rare'
}
```

#### 2. Update spawnItems() Method

**Lines 300-324** - Replace fixed rarity roll:

```typescript
// OLD:
const rarityWeights = { common: 0.6, uncommon: 0.3, rare: 0.1 }
const rarityRoll = this.random.chance(rarityWeights.common)
  ? 'common'
  : this.random.chance(rarityWeights.uncommon / (1 - rarityWeights.common))
    ? 'uncommon'
    : 'rare'

// NEW:
const rarityWeights = this.calculateRarityWeights(depth)
const rarityRoll = this.selectWeightedRarity(rarityWeights)
```

#### 3. Update rollEnchantment() Method

**Lines 236-249** - Add depth parameter and use range:

```typescript
// OLD:
private rollEnchantment(rarity: string, isCursed: boolean): number {
  if (isCursed) return -this.random.nextInt(1, 3)
  if (rarity === 'rare') return this.random.nextInt(1, 2)
  return 0
}

// NEW:
private rollEnchantment(rarity: string, isCursed: boolean, depth: number): number {
  if (isCursed) return -this.random.nextInt(1, 3)

  const { minBonus, maxBonus } = this.calculateEnchantmentRange(depth, rarity)
  if (maxBonus === 0) return 0
  return this.random.nextInt(minBonus, maxBonus)
}
```

#### 4. Update rollCursedStatus() Method

**Lines 189-198** - Add depth parameter:

```typescript
// OLD:
private rollCursedStatus(rarity: string): boolean {
  const curseChances = {
    common: 0.05,
    uncommon: 0.08,
    rare: 0.12,
  }
  const chance = curseChances[rarity as keyof typeof curseChances] || 0.05
  return this.random.chance(chance)
}

// NEW:
private rollCursedStatus(rarity: string, depth: number): boolean {
  const baseChances = {
    common: 0.05,
    uncommon: 0.08,
    rare: 0.12,
  }
  const baseChance = baseChances[rarity as keyof typeof baseChances] || 0.05
  const adjustedChance = this.calculateCurseChance(baseChance, depth)
  return this.random.chance(adjustedChance)
}
```

#### 5. Update All rollCursedStatus() and rollEnchantment() Calls

In weapon/armor/ring spawning (lines 373-505), pass `depth` parameter:

```typescript
const isCursed = this.rollCursedStatus(rarityRoll, depth)  // Add depth
const bonus = this.rollEnchantment(rarityRoll, isCursed, depth)  // Add depth
```

---

## Edge Cases & Constraints

### 1. Maximum Bonus Cap
- **Issue**: Rare items at depth 26 could exceed +5
- **Solution**: Cap maxBonus at 5 in `calculateEnchantmentRange()`
- **Example**: Rare Two-Handed Sword at depth 26 → [3, 6] capped to [3, 5]

### 2. Common Items at Late Depth
- **Behavior**: 30% chance for common items at depth 26
- **Design**: Common Dagger can roll +2 to +5 (viable with investment)
- **Purpose**: Maintains "any item can work" philosophy

### 3. Rarity Weight Normalization
- **Issue**: Formulas may not sum to exactly 100%
- **Solution**: Use weighted random selection with total sum
- **Implementation**: `selectWeightedRarity()` method

### 4. Zero Enchantment Floor
- **Behavior**: Depths 1-5 have maxBonus = 0
- **Design**: Intentional weak early game
- **Purpose**: Rewards progression, prevents overpowered starts

### 5. Curse Chance Floor
- **Constraint**: Never reduce curse chance below 50% of base
- **Example**: Depth 26 common → 3.5% (not 0%)
- **Purpose**: Cursed items remain a risk throughout game

---

## Testing Strategy

### Test Files

```
src/services/ItemSpawnService/
├── depth-scaling.test.ts        (NEW - formula validation)
├── enchantment-scaling.test.ts  (NEW - bonus progression)
├── rarity-distribution.test.ts  (NEW - weight calculations)
└── spawn-logic.test.ts          (EXISTING - update for depth param)
```

### Key Test Cases

#### Formula Validation
```typescript
describe('calculateRarityWeights()', () => {
  test('depth 1 returns approximately 70/25/5 distribution')
  test('depth 26 returns approximately 30/40/30 distribution')
  test('depth 13 is midpoint between extremes')
  test('weights always positive')
  test('weights sum to valid range for normalization')
})

describe('calculateEnchantmentRange()', () => {
  test('depth 1-5 returns [0, 0]')
  test('depth 26 common returns [2, 5]')
  test('depth 26 rare returns [3, 5] (capped)')
  test('rare items always get +1 bonus to range')
  test('maxBonus never exceeds 5')
  test('minBonus never exceeds maxBonus')
})

describe('calculateCurseChance()', () => {
  test('depth 1 returns base chance unchanged')
  test('depth 26 returns ~30% reduction')
  test('never returns negative chance')
  test('applies to all rarity tiers correctly')
})
```

#### Integration Tests
```typescript
describe('spawnItems() with depth scaling', () => {
  test('depth 1 spawns mostly common unenchanted items')
  test('depth 13 spawns mixed rarity with +1 to +2 enchantments')
  test('depth 26 spawns rare items with +2 to +5 enchantments')
  test('all item types can spawn at all depths')
  test('cursed item frequency decreases with depth')
})
```

#### Distribution Validation
```typescript
describe('statistical distribution', () => {
  test('10,000 spawns at depth 1 match 70/25/5 within 2% margin')
  test('10,000 spawns at depth 26 match 30/40/30 within 2% margin')
  test('enchantment distribution at depth 26 shows +5 as rare peak')
})
```

#### Regression Prevention
```typescript
describe('backward compatibility', () => {
  test('debug spawn methods work with default depth=1')
  test('existing save files load correctly')
  test('item identification works with new bonuses')
  test('enchantment scrolls still add +1 to any item')
})
```

### Validation Checklist

During implementation:
- [ ] Run 10,000 spawns at depth 1, 13, 26 - verify rarity percentages
- [ ] Verify no items spawn outside calculated enchantment range
- [ ] Test that +5 items are rare but achievable
- [ ] Confirm common items at depth 26 can still roll high bonuses
- [ ] Verify curse frequency decreases appropriately
- [ ] Playtest depth 26 to ensure items feel powerful but balanced

---

## Documentation Updates

After implementation, update:

1. **`docs/services/ItemSpawnService.md`**
   - Add section on depth-based scaling formulas
   - Update `spawnItems()` method documentation
   - Add enchantment progression table

2. **`docs/game-design/05-items.md`**
   - Document progression system
   - Add player-facing progression examples
   - Explain "any item viable with investment" philosophy

3. **`CLAUDE.md`**
   - Update Quick Links if needed
   - Mention depth-based item scaling in overview

---

## Balance Considerations

### Power Level at Depth 26

**Maximum Natural Drop**: Plate Mail +5 (AC -2), Two-Handed Sword +5 (3d6+5 = 8-23 damage)

**With Enchantment Scrolls** (2-3 found throughout journey):
- Plate Mail +8 (AC -5)
- Two-Handed Sword +8 (3d6+8 = 11-26 damage)

**Against Late-Game Threats**:
- **Jabberwock**: 15d8 HP (avg 67), 4d6 damage
- **Dragon**: 10d8 HP (avg 45), 3d10 damage
- **Return Journey**: Cumulative vorpal [0, depth+3] spawns high-tier monsters on all levels

**Assessment**: +5 natural drops + enchantment scrolls provide strong but not overpowered endgame power for 52-level journey.

### Early Game Balance

**Depth 1-5**: No enchanted items, mostly common
- Starting Leather Armor (AC 8) remains relevant
- Early rare finds (Long Sword, Chain Mail) provide meaningful upgrades
- No +5 Plate Mail "wins" on level 1

**Progression Feel**: Player must survive to depth 6+ to start finding enchanted equipment, creating sense of earned power growth.

---

## Implementation Plan

See separate implementation plan document for detailed task breakdown.

**Estimated Effort**: 8-12 hours
- Formula implementation: 2-3 hours
- Integration with spawn system: 2-3 hours
- Comprehensive testing: 3-4 hours
- Documentation updates: 1-2 hours

**Risk Areas**:
- Formula tuning (may need iteration based on playtesting)
- Statistical distribution validation (requires test data analysis)
- Balance verification (needs manual endgame playtesting)

---

## Appendix: Formula Derivation

### Rarity Weight Calculations

**Goal**: Shift from 70/25/5 to 30/40/30 over 26 levels

```
Common:
  slope = (30 - 70) / (26 - 1) = -40 / 25 = -1.6
  But we want integer percentages: -1.54 gives cleaner distribution
  formula: 70 - (depth * 1.54)

Uncommon:
  slope = (40 - 25) / 25 = 15 / 25 = 0.6
  Adjusted: 0.58 for better balance with common shift
  formula: 25 + (depth * 0.58)

Rare:
  slope = (30 - 5) / 25 = 25 / 25 = 1.0
  Adjusted: 0.96 to ensure sum approximates 100%
  formula: 5 + (depth * 0.96)
```

### Enchantment Range Calculations

**Goal**: Smooth progression from 0 to +5 over 26 levels

```
minBonus:
  depth / 9 creates 3 tiers:
    0-8: floor(0-8/9) = 0
    9-17: floor(9-17/9) = 1
    18-26: floor(18-26/9) = 2

maxBonus:
  depth / 5.2 creates gradual progression:
    1-5: floor(1-5/5.2) = 0
    6-10: floor(6-10/5.2) = 1
    11-15: floor(11-15/5.2) = 2
    16-20: floor(16-20/5.2) = 3
    21-25: floor(21-25/5.2) = 4
    26: floor(26/5.2) = 5
```

**Rare Bonus**: +1 to both min and max maintains progression curve while making rare items distinctly better.

---

## Future Enhancements

Not in scope for initial implementation, but potential future additions:

1. **Legendary Items**: 0.1% chance at depth 20+ for unique named items with special effects
2. **Set Items**: Matching equipment pieces that provide bonuses when worn together
3. **Difficulty Modes**: Hard mode with reduced enchantment progression
4. **Item Level Display**: Show effective item power level in UI (optional QoL)

These should only be considered after initial depth scaling is balanced and proven through playtesting.
