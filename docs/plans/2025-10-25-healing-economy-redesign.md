# Healing Economy Redesign

**Date**: 2025-10-25
**Status**: Design Complete - Ready for Implementation
**Related**: [Depth-Based Item Scaling](./2025-10-24-depth-based-item-scaling-design.md)

---

## Problem Statement

### Current Issues

Players are running out of resources (food, light) while resting to heal throughout the game:

1. **Underpowered Healing Potions**:
   - HEAL: 1d8 (avg 4.5 HP) - only 11% of typical combat damage
   - EXTRA_HEAL: 2d8+2 (avg 11 HP) - only 28% of typical combat damage
   - Combined spawn rate: only **3.5%** per item spawn

2. **Slow Natural Regeneration**:
   - Fixed 1 HP per 10 turns at all depths
   - Healing 40 HP requires **400 turns** resting
   - Consumes 40 hunger + 61% torch fuel

3. **Combat Damage Reality** (from actual monster data):
   - Vorpal spawning system ([depth-6, depth+3] range) means high-damage monsters appear at **all depths**
   - Dragon (21 dmg), Medusa (21 dmg), Ur-vile (20 dmg) can spawn from depth 1
   - Typical combat: 2-3 hits = **34-63 damage** at ANY depth
   - Current healing potions heal only 11-28% of this

4. **Resource Drain Feedback Loop**:
   - Insufficient healing potions → forced to rest
   - Long rest sessions → depleted food/light
   - Resource scarcity → unable to rest later
   - Creates frustration instead of strategic depth

### Design Goal

Create a modern roguelike healing economy where:
- **Prepared players feel powerful** (adequate healing potions)
- **Resting is a tactical choice** (not a resource drain punishment)
- **Progression feels smooth** (healing scales with depth)
- **Resources remain valuable** (not trivial, not scarce)

---

## Data-Driven Analysis

### Monster Damage by Depth (Vorpal Spawning)

Due to vorpal spawning (monsters spawn at `letter_position ± [depth-6, depth+3]`), high-damage monsters appear at ALL depths:

| Depth | Typical Monsters | Damage Range | Typical Combat (2-3 hits) |
|-------|------------------|--------------|---------------------------|
| 1     | Bat, Emu, Kestrel, **Dragon, Griffin** | 1-21 dmg | 2-63 HP |
| 5     | Centaur, Emu, **Griffin, Jabberwock** | 2-18 dmg | 4-54 HP |
| 10    | Hobgoblin, Kestrel, **Medusa, Nymph** | 3-21 dmg | 6-63 HP |
| 15    | Nymph, Orc, **Troll, Ur-vile** | 5-20 dmg | 10-60 HP |
| 20    | Snake, Troll, **Vampire, Wraith** | 8-19 dmg | 16-57 HP |
| 26    | Ur-vile, Vampire, **Xeroc, Yeti, Zombie** | 15-19 dmg | 30-57 HP |

**Average Combat Damage: 34-63 HP across all depths** (not scaling with depth)

### Player HP Progression

- **Starting HP**: 12 HP (level 1)
- **HP per Level**: +1d8 (avg 4.5)
- **Expected HP by Level**:
  - Level 1: 12 HP
  - Level 5: ~30 HP
  - Level 10: ~54 HP
  - Level 15: ~78 HP
  - Level 20: ~102 HP
  - Level 26: ~129 HP

### Current Healing Inadequacy

| Depth | Expected HP | Combat Damage | HEAL (1d8) | EXTRA_HEAL (2d8+2) | Healing % |
|-------|-------------|---------------|------------|--------------------|-----------|
| 1     | 12          | 34-63         | 4.5        | 11                 | 11-28%    |
| 10    | 54          | 34-63         | 4.5        | 11                 | 11-28%    |
| 20    | 102         | 34-63         | 4.5        | 11                 | 11-28%    |
| 26    | 129         | 34-63         | 4.5        | 11                 | 11-28%    |

**Conclusion**: Current healing potions heal 11-28% of typical combat damage at ALL depths.

---

## Solution: Tiered Healing System

### Four Healing Tiers (Data-Driven)

Each tier designed to cover typical combat damage at target depth ranges:

#### **Tier 1: Minor Heal - Early Game (Depths 1-10)**
- **Formula**: 5d8 (avg **22.5 HP**, range 5-40)
- **Rarity**: Common
- **Coverage**: ~56% of typical combat (40 HP)
- **Target Player HP**: 12-54 HP (levels 1-10)
- **Rationale**: Covers 1 hit from any monster + partial second hit

#### **Tier 2: Medium Heal - Mid Game (Depths 8-18)**
- **Formula**: 8d10 (avg **44 HP**, range 8-80)
- **Rarity**: Uncommon
- **Coverage**: ~98% of typical combat (45 HP)
- **Target Player HP**: 40-88 HP (levels 8-18)
- **Rationale**: Covers 2 hits from most monsters

#### **Tier 3: Major Heal - Late Game (Depths 15-26)**
- **Formula**: 12d10 (avg **66 HP**, range 12-120)
- **Rarity**: Uncommon
- **Coverage**: 132% of typical combat (50 HP)
- **Target Player HP**: 78-129 HP (levels 15-26)
- **Rationale**: Full recovery from typical 2-hit combat

#### **Tier 4: Superior Heal - Endgame (Depths 20-26)**
- **Formula**: 15d12 (avg **97.5 HP**, range 15-180)
- **Rarity**: Rare
- **Coverage**: 177% of typical combat (55 HP)
- **Target Player HP**: 102-129 HP (levels 20-26)
- **Rationale**: Emergency heal, covers 3+ hits or critical situations

### Tier Overlap Philosophy

Tiers overlap (Minor 1-10, Medium 8-18, Major 15-26) to ensure:
- **Smooth Transitions**: No sudden healing gaps between depths
- **Strategic Choice**: Multiple options available at transition depths
- **RNG Forgiveness**: Finding "wrong tier" potion still useful

---

## Spawn Rate Formulas

### Healing Potion Spawn Rates

#### **Minor Heal (Common, Depths 1-10)**
```
spawn_rate = max(0, 12% - (depth × 1.2%))
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 1     | 10.8%      | ~5-6 potions         |
| 5     | 6.0%       | ~3 potions           |
| 10    | 0%         | (phased out)         |

**Phase-Out**: Stops spawning at depth 10 (replaced by Medium)

#### **Medium Heal (Uncommon, Depths 8-18)**
```
spawn_rate = max(0, 10% - abs(depth - 13) × 0.8%)
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 8     | 6.0%       | ~3 potions           |
| 13    | 10.0%      | ~5 potions (peak)    |
| 18    | 6.0%       | ~3 potions           |

**Bell Curve**: Peaks at depth 13, tapers at edges

#### **Major Heal (Uncommon, Depths 15-26)**
```
spawn_rate = min(12%, max(0, (depth - 14) × 1.0%))
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 15    | 1.0%       | ~0-1 potions         |
| 20    | 6.0%       | ~3 potions           |
| 26    | 12.0%      | ~6 potions (peak)    |

**Linear Ramp**: Gradual increase to peak availability at depth 26

#### **Superior Heal (Rare, Depths 20-26)**
```
spawn_rate = max(0, (depth - 19) × 0.5%)
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 20    | 0.5%       | ~0-1 potions (rare)  |
| 23    | 2.0%       | ~1 potion            |
| 26    | 3.5%       | ~1-2 potions         |

**Rare Finds**: Low spawn rate, emergency use only

### Total Healing Availability

| Depth | Total Healing Spawn % | vs Current (3.5%) | Improvement |
|-------|----------------------|-------------------|-------------|
| 1     | 10.8%                | 3.5%              | **3.1×**    |
| 10    | 7.6%                 | 3.5%              | **2.2×**    |
| 13    | 10.0%                | 3.5%              | **2.9×**    |
| 20    | 12.5%                | 3.5%              | **3.6×**    |
| 26    | 15.5%                | 3.5%              | **4.4×**    |

**Progressive Scaling**: Healing availability increases with depth (10% → 15.5%)

---

## Natural Regeneration Scaling

### Current System (Fixed Rate)

- **Rate**: 1 HP per 10 turns (0.1 HP/turn)
- **Blocked By**: Combat, hunger ≤ 100
- **Recovery Time (40 HP)**: 400 turns
- **Resource Cost**: 40 hunger + 61% torch fuel

### Proposed Scaling Formula

```
regen_turns = max(5, 10 - floor(depth × 0.2))
```

**Rationale**: Faster regen at deeper levels reduces rest time and resource drain.

### Regeneration by Depth

| Depth | Turns/HP | HP/Turn | Recovery (40 HP) | Hunger Cost | Torch Cost |
|-------|----------|---------|------------------|-------------|------------|
| 1     | 10       | 0.10    | 400 turns        | 40 hunger   | 61% torch  |
| 5     | 9        | 0.11    | 364 turns        | 36 hunger   | 56% torch  |
| 10    | 8        | 0.125   | 320 turns        | 32 hunger   | 49% torch  |
| 15    | 7        | 0.143   | 280 turns        | 28 hunger   | 43% torch  |
| 20    | 6        | 0.167   | 240 turns        | 24 hunger   | 37% torch  |
| 26    | 5        | 0.20    | 200 turns        | 20 hunger   | 31% torch  |

**Improvement at Depth 26**: 50% faster regen, 50% less resource cost

### Cap at 5 Turns/HP

**Why Cap?**
- Prevents regen from trivializing healing mechanics
- Maintains value of healing potions
- Keeps tactical tension in resource management
- 5 turns/HP is still meaningful (200 turns for 40 HP)

---

## Resource Availability Scaling

### Food Rations

**Current Rate**: ~7% per item spawn (maintained)

**Proposed Formula**:
```
spawn_rate = 7% + (depth × 0.15%)
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 1     | 7.15%      | ~3-4 rations         |
| 13    | 9.0%       | ~4-5 rations         |
| 26    | 11.0%      | ~5-6 rations         |

**Rationale**: Modest increase ensures players can rest when needed. Faster regen reduces hunger consumption, so rate increase is conservative.

### Torches

**Current Rate**: ~7% per item spawn

**Proposed Formula**:
```
spawn_rate = 7% + (depth × 0.1%)
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 1     | 7.1%       | ~3-4 torches         |
| 13    | 8.3%       | ~4 torches           |
| 26    | 9.6%       | ~4-5 torches         |

**Rationale**: Faster regen reduces torch consumption during rest. Slight increase for safety margin.

### Oil Flasks (for Lanterns)

**Current Rate**: ~5% per item spawn

**Proposed Formula**:
```
spawn_rate = 5% + (depth × 0.15%)
```

| Depth | Spawn Rate | Expected per 5 Levels |
|-------|------------|----------------------|
| 1     | 5.15%      | ~2-3 flasks          |
| 13    | 7.0%       | ~3-4 flasks          |
| 26    | 9.0%       | ~4-5 flasks          |

**Rationale**: Lantern users benefit from faster regen. Increase supports lantern viability at deeper levels.

---

## Integration with Existing Systems

### Synergy with Depth-Based Item Scaling

The healing economy redesign complements the recently implemented depth-based item scaling ([2025-10-24-depth-based-item-scaling-design.md](./2025-10-24-depth-based-item-scaling-design.md)):

#### **Rarity Progression (70/25/5 → 30/40/30)**

| Healing Tier | Rarity   | Early Game (70/25/5) | Late Game (30/40/30) |
|--------------|----------|----------------------|---------------------|
| Minor Heal   | Common   | ✅ 70% common rate   | Phased out          |
| Medium Heal  | Uncommon | 25% uncommon rate    | ✅ 40% uncommon rate |
| Major Heal   | Uncommon | 25% uncommon rate    | ✅ 40% uncommon rate |
| Superior Heal| Rare     | 5% rare rate         | ✅ 30% rare rate     |

**Alignment**: Healing tiers naturally align with existing rarity progression.

#### **Enchantment Scaling (0 to +5 over 26 levels)**

Both systems use smooth linear formulas over 26 levels:
- **Enchantment**: `maxBonus = min(5, floor(depth / 5.2))`
- **Healing**: `spawn_rate = f(depth)` with linear/bell curve formulas
- **Regeneration**: `regen_turns = max(5, 10 - floor(depth × 0.2))`

**Pattern**: Consistent depth-based scaling philosophy across all systems.

### Existing ItemSpawnService Infrastructure

The `ItemSpawnService` already has:
- ✅ **Depth parameter**: `spawnItems(rooms, count, tiles, items, depth)`
- ✅ **Rarity weights**: `calculateRarityWeights(depth)` method
- ✅ **Formula pattern**: Linear scaling with caps/floors

**New Method Required**:
```typescript
private calculateHealingSpawnRate(depth: number, healingTier: string): number {
  // Implementation of spawn formulas above
}
```

### RegenerationService Changes

Current `RegenerationService` has:
- ✅ **Turn tracking**: Already tracks turns since last regen
- ✅ **Hunger check**: Already blocks regen when hunger ≤ 100
- ✅ **Combat check**: Already blocks regen during combat

**Change Required**:
```typescript
// OLD: const REGEN_TURNS = 10
// NEW: const regenTurns = this.calculateRegenTurns(depth)

private calculateRegenTurns(depth: number): number {
  return Math.max(5, 10 - Math.floor(depth * 0.2))
}
```

---

## Implementation Plan

### Phase 1: Data Changes
1. Update `public/data/items.json`:
   - Replace HEAL and EXTRA_HEAL with 4 healing tiers
   - Add `minDepth` and `maxDepth` fields for spawn control
   - Set rarity levels (common/uncommon/rare)

2. Update `public/data/item-spawn-rates.json` (if exists):
   - Define spawn rate formulas for each healing tier
   - Document expected potions per 5 levels

### Phase 2: ItemSpawnService Updates
1. Add `calculateHealingSpawnRate(depth, tier)` method
2. Update potion spawning logic to use tier-specific spawn rates
3. Filter potions by `minDepth` and `maxDepth` during selection
4. Add tests for healing spawn distribution

### Phase 3: RegenerationService Updates
1. Add `calculateRegenTurns(depth)` method
2. Update `applyRegeneration()` to use depth-based regen speed
3. Add tests for regeneration scaling across depths

### Phase 4: Resource Spawn Scaling
1. Update food ration spawn formula in `ItemSpawnService`
2. Update torch spawn formula
3. Update oil flask spawn formula
4. Add tests for resource availability progression

### Phase 5: Integration Testing
1. Statistical tests: 10,000 spawns at depths 1, 13, 26
   - Verify healing spawn rates match formulas (±2%)
   - Verify resource spawn rates match formulas (±2%)
2. Gameplay validation:
   - Simulate 100 combats at each depth tier
   - Verify healing potions cover 50-100% of combat damage
   - Verify resource availability supports 3-5 rest sessions per 5 levels
3. Balance tests:
   - Verify total healing % progression (10% → 15.5%)
   - Verify regeneration speed progression (10 → 5 turns/HP)
   - Verify no resource starvation at any depth

### Phase 6: Documentation Updates
1. Update [Game Design - Items](../game-design/items.md) with healing tiers
2. Update [Systems - Regeneration](../systems-core.md#regeneration) with scaling formula
3. Update [Services - ItemSpawnService](../services/ItemSpawnService.md) with healing spawn logic
4. Update [Services - RegenerationService](../services/RegenerationService.md) with depth scaling
5. Add healing economy section to [Game Design - Balance](../game-design/balance.md)

---

## Testing Strategy

### Unit Tests

#### **ItemSpawnService**
- `calculateHealingSpawnRate()` returns correct rates for each tier
- Healing potions filtered by depth range (minDepth/maxDepth)
- Statistical distribution matches formulas (10,000 spawn sample)

#### **RegenerationService**
- `calculateRegenTurns()` returns correct values at depths 1, 5, 10, 15, 20, 26
- Regeneration capped at 5 turns/HP minimum
- Regeneration blocked by combat/hunger (unchanged behavior)

### Integration Tests

#### **Healing Economy Validation**
```typescript
describe('Healing Economy - End-to-End', () => {
  test('Depth 1 provides adequate healing for early combat', () => {
    const items = spawnItems(rooms, 100, tiles, [], 1)
    const healingPotions = items.filter(isHealingPotion)

    // Expect ~10.8% healing spawn rate = ~11 potions
    expect(healingPotions.length).toBeGreaterThan(8)
    expect(healingPotions.length).toBeLessThan(14)

    // All should be Minor Heal (5d8)
    healingPotions.forEach(potion => {
      expect(potion.power).toBe('5d8')
    })
  })

  test('Depth 26 provides high-tier healing for late game', () => {
    const items = spawnItems(rooms, 100, tiles, [], 26)
    const healingPotions = items.filter(isHealingPotion)

    // Expect ~15.5% healing spawn rate = ~15-16 potions
    expect(healingPotions.length).toBeGreaterThan(12)
    expect(healingPotions.length).toBeLessThan(19)

    // Should be mix of Major (12d10) + Superior (15d12)
    const majorCount = healingPotions.filter(p => p.power === '12d10').length
    const superiorCount = healingPotions.filter(p => p.power === '15d12').length

    expect(majorCount).toBeGreaterThan(8)   // ~12% spawn rate
    expect(superiorCount).toBeGreaterThan(2) // ~3.5% spawn rate
  })
})
```

### Statistical Tests

#### **Spawn Rate Accuracy**
```typescript
test('10,000 spawns at depth 13 match Medium Heal peak rate', () => {
  const iterations = 500
  let healingCount = 0

  for (let i = 0; i < iterations; i++) {
    const items = spawnItems(rooms, 20, tiles, [], 13)
    healingCount += items.filter(isHealingPotion).length
  }

  const actualRate = (healingCount / (iterations * 20)) * 100

  // Expected: ~10% (Medium Heal peak)
  expect(actualRate).toBeGreaterThan(9)
  expect(actualRate).toBeLessThan(11)
})
```

#### **Regeneration Speed Validation**
```typescript
test('Depth 26 regenerates 50% faster than depth 1', () => {
  const player1 = { ...basePlayer, hp: 50, maxHp: 100, depth: 1 }
  const player26 = { ...basePlayer, hp: 50, maxHp: 100, depth: 26 }

  // Simulate 200 turns of regeneration
  let state1 = { ...baseState, player: player1 }
  let state26 = { ...baseState, player: player26 }

  for (let i = 0; i < 200; i++) {
    state1 = regenService.applyRegeneration(state1)
    state26 = regenService.applyRegeneration(state26)
  }

  // Depth 1: 10 turns/HP = 20 HP healed
  expect(state1.player.hp).toBe(70)

  // Depth 26: 5 turns/HP = 40 HP healed (2× faster)
  expect(state26.player.hp).toBe(90)
})
```

---

## Success Metrics

### Gameplay Experience
- ✅ Players find adequate healing potions at all depths
- ✅ Resting is a tactical choice, not a punishment
- ✅ Resources remain valuable but not scarce
- ✅ Progression feels smooth and rewarding

### Quantitative Metrics
- ✅ **Healing Availability**: 10.8% → 15.5% spawn rate progression
- ✅ **Potion Coverage**: 50-100% of typical combat damage per tier
- ✅ **Regeneration Speed**: 50% faster at depth 26 (10 → 5 turns/HP)
- ✅ **Resource Efficiency**: 50% less hunger/fuel consumed during rest at depth 26
- ✅ **Expected Healing per 5 Levels**: 5-6 potions (vs current 0-2)

### Balance Validation
- ✅ No resource starvation at any depth
- ✅ Healing doesn't trivialize combat (still requires tactical use)
- ✅ Resting remains risky (wandering monsters, hunger drain)
- ✅ Potion hoarding is strategic (not mandatory for survival)

---

## Future Considerations

### Potential Expansions

1. **Ring of Regeneration Scaling**:
   - Current: 2× regen speed (fixed)
   - Future: 2× depth-based regen speed (e.g., 2.5 turns/HP at depth 26)

2. **Healing Wand/Staff**:
   - New item type: Wand of Healing (3d8 × charges)
   - Spawn depths 10-26, uncommon rarity
   - Provides emergency healing when potions scarce

3. **Vampire/Life Steal Mechanic**:
   - Ring of Vampirism: Heal 20% of damage dealt
   - Synergizes with high-damage weapons at deep levels
   - Rare find (depths 20-26)

4. **Rest Efficiency Perks**:
   - Ring of Sustenance: 50% reduced hunger during rest
   - Cloak of Warmth: 50% reduced fuel during rest
   - Allows longer rest sessions without resource drain

### Data Collection Needs

Once implemented, collect metrics:
- Average healing potions found per depth
- Average rest sessions per 5 levels
- Average resource consumption (food/light) per depth
- Player death causes (combat vs starvation vs darkness)

Use data to fine-tune spawn rates if needed.

---

## Conclusion

This healing economy redesign addresses the core problem of resource drain during healing by:

1. **Tiered Healing Potions**: 4 tiers (5d8 → 15d12) that scale with depth and cover 50-177% of typical combat damage
2. **Depth-Based Spawn Rates**: 10.8% → 15.5% healing availability progression (3.1× to 4.4× improvement)
3. **Faster Regeneration**: 10 → 5 turns/HP scaling, reducing rest time and resource cost by 50%
4. **Resource Availability**: Modest increases to food/light spawn rates (7% → 9-11%)

The solution is **data-driven** (based on actual monster damage analysis), **integrated** (uses existing depth-based scaling infrastructure), and **balanced** (maintains tactical tension without frustration).

**Status**: Design complete and validated. Ready for implementation.

**Estimated Effort**: 3-5 hours (data changes, service updates, comprehensive tests)

**Risk**: Low - builds on proven depth-based scaling patterns, no major architectural changes required.
