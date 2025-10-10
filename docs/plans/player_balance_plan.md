# Player Balance & Combat Mechanics Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-10
**Last Updated**: 2025-10-10
**Owner**: Dirk Kok
**Related Docs**: [Game Design](../game-design/README.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md) | [CombatService](../services/CombatService.md)

---

## 1. Objectives

### Primary Goal
Align player statistics and combat mechanics with the original 1980 Rogue to ensure authentic gameplay balance, focusing on proper AC values, strength bonus implementation, and hit/damage calculations.

### Design Philosophy
- **Authenticity First**: Match original Rogue (1980) mechanics exactly where documented
- **Backward Compatibility**: Preserve existing save games where possible
- **Testability**: Ensure all changes are fully tested with deterministic tests
- **Gradual Migration**: Fix core mechanics first, then add enhancements

### Success Criteria
- [ ] Player starts with AC 10 (unarmored) or AC 8 (with starting leather armor)
- [ ] Strength provides correct to-hit bonuses (+0 at Str 16, +1 at Str 17+)
- [ ] Strength provides correct damage bonuses (+1 at Str 16, +2 at Str 18)
- [ ] Combat hit formula matches original: `1d20 + level + str_to_hit_bonus >= (10 + defender_AC)`
- [ ] Exceptional strength (18/XX) implemented for 1% starting chance
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles
- [ ] Documentation updated with formulas and tables

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Original Rogue FAQ (GameFAQs)](https://gamefaqs.gamespot.com/pc/580055-rogue-1983/faqs/9646) - Strength mechanics, AC formulas
- [Rogue Manual (Epyx)](https://britzl.github.io/roguearchive/files/misc/EpyxRogueDOSManual/manual.htm) - Armor types, stats
- [Data Driven Gamer - Rogue Mechanics](https://datadrivengamer.blogspot.com/2019/05/identifying-mechanics-of-rogue.html) - Hit calculation formulas

### Related Systems
- **CombatService**: Core combat calculations (hit/damage formulas)
- **LevelingService**: HP gain on level-up (already correct with 1d8)
- **Player Initialization**: Starting stats in `main.ts`
- **Armor System**: AC values in `items.json` (already correct)
- **RingService**: Strength bonuses from Ring of Add Strength

### Research Summary

**Original Rogue (1980) Mechanics**:

**Starting Stats**:
- HP: 12
- Strength: 16 (1% chance of 18 with exceptional bonus)
- AC: 10 (unarmored) or 8 (with starting leather armor)
- Display shows AC 6, which uses formula: `AC_display = 11 - AC_actual`

**Strength To-Hit Bonuses**:
| Strength | To-Hit Bonus |
|----------|--------------|
| ≤6 | -1 |
| 7-16 | +0 |
| 17-18 | +1 |
| 18/51-18/100 | +2 |
| 18/100 | +3 |

**Strength Damage Bonuses**:
| Strength | Damage Bonus |
|----------|--------------|
| ≤6 | -1 |
| 7-15 | +0 |
| 16-17 | +1 |
| 18 | +2 |
| 18/01-18/50 | +3 |
| 18/51-18/75 | +4 |
| 18/76-18/90 | +5 |
| 18/91-18/100 | +6 |
| 19-21 | +3 |
| 22-30 | +5 |
| 31 | +6 |

**Hit Formula**:
```
roll = 1d20
to_hit = roll + attacker_level + strength_to_hit_bonus
defense_target = 10 + defender_AC
success = to_hit >= defense_target
```

**Current Implementation Issues**:
1. Player starts with AC 4 (should be 10 or 8)
2. Strength added directly to hit calculation as level (+16 instead of +0)
3. Strength provides no damage bonus (should be +1 at Str 16)
4. No exceptional strength (18/XX) mechanics

---

## 3. Phases & Tasks

### Phase 1: Core Type System & Strength Mechanics (Priority: HIGH)

**Objective**: Add exceptional strength support to type system and implement strength bonus calculation methods

#### Task 1.1: Add Exceptional Strength to Player Type

**Context**: Need to support 18/XX strength format (18 base + percentile bonus) for proper strength mechanics

**Files to create/modify**:
- `src/types/core/core.ts`

##### Subtasks:
- [x] Add `strengthPercentile?: number` field to `Player` interface (0-100, only used when strength is 18)
- [x] Update player initialization in `main.ts` to set `strengthPercentile: undefined` (will add random chance later)
- [x] Ensure immutability preserved in all player updates
- [x] Git commit: "feat: add exceptional strength percentile to Player type (Phase 1.1)"

---

#### Task 1.2: Create Strength Bonus Calculation Service

**Context**: Extract strength bonus logic into dedicated, testable service methods

**Files to create/modify**:
- `src/services/CombatService/CombatService.ts`
- `src/services/CombatService/strength-bonuses.test.ts`

##### Subtasks:
- [x] Add private method `getStrengthToHitBonus(strength: number, percentile?: number): number`
  - Returns +0 for Str 7-16
  - Returns +1 for Str 17-18
  - Returns +2 for Str 18/51-100
  - Returns +3 for Str 18/100
  - Returns -1 for Str ≤6
- [x] Add private method `getStrengthDamageBonus(strength: number, percentile?: number): number`
  - Implement full damage bonus table (see Research Summary above)
- [x] Write comprehensive tests for all strength ranges
- [x] Test edge cases: Str 6, 7, 15, 16, 17, 18, 18/01, 18/50, 18/51, 18/100
- [x] Git commit: "feat: implement strength to-hit and damage bonus calculations (Phase 1.2)"

---

### Phase 2: Fix Combat Formulas (Priority: HIGH)

**Objective**: Correct hit and damage calculations to match original Rogue mechanics

#### Task 2.1: Fix Player Attack Hit Calculation

**Context**: Currently adds full strength value to hit roll, should only add to-hit bonus (+0/+1/+2/+3)

**Files to create/modify**:
- `src/services/CombatService/CombatService.ts`
- `src/services/CombatService/hit-calculation.test.ts`

##### Subtasks:
- [x] Update `playerAttack()` method:
  ```typescript
  // OLD:
  const hit = this.calculateHit(
    player.level + effectiveStrength,  // WRONG
    monster.ac
  )

  // NEW:
  const toHitBonus = this.getStrengthToHitBonus(
    effectiveStrength,
    player.strengthPercentile
  )
  const hit = this.calculateHit(
    player.level + toHitBonus,  // CORRECT
    monster.ac
  )
  ```
- [x] Update all hit calculation tests to reflect new bonuses
- [x] Add test: Str 16 player should have same to-hit as Str 10 player (both +0)
- [x] Add test: Str 17 player should have +1 to-hit bonus
- [x] Add test: Str 18/100 player should have +3 to-hit bonus
- [x] Git commit: "fix: correct player attack to-hit calculation to use strength bonus (Phase 2.1)"

---

#### Task 2.2: Add Strength Damage Bonus to Player Attacks

**Context**: Currently no strength damage bonus applied, should add +1 at Str 16, +2 at Str 18, etc.

**Files to create/modify**:
- `src/services/CombatService/CombatService.ts`
- `src/services/CombatService/damage.test.ts`

##### Subtasks:
- [x] Update `calculatePlayerDamage()` method to accept player parameter
- [x] Add strength damage bonus to final damage calculation:
  ```typescript
  private calculatePlayerDamage(player: Player, weapon: Weapon | null): number {
    const strengthBonus = this.ringService.getStrengthBonus(player)
    const effectiveStrength = player.strength + strengthBonus

    let baseDamage: number
    if (weapon) {
      baseDamage = this.random.roll(weapon.damage) + weapon.bonus
    } else {
      baseDamage = this.random.roll('1d4')  // Unarmed
    }

    const strDamageBonus = this.getStrengthDamageBonus(
      effectiveStrength,
      player.strengthPercentile
    )

    return baseDamage + strDamageBonus
  }
  ```
- [x] Update `playerAttack()` to pass player to `calculatePlayerDamage()`
- [x] Add test: Str 16 player deals +1 damage
- [x] Add test: Str 18 player deals +2 damage
- [x] Add test: Str 18/100 player deals +6 damage
- [x] Add test: Str 6 player deals -1 damage (minimum 0)
- [x] Git commit: "feat: add strength damage bonus to player attacks (Phase 2.2)"

---

### Phase 3: Fix Starting Player Stats (Priority: HIGH)

**Objective**: Correct player starting AC and add optional starting equipment

#### Task 3.1: Fix Starting AC to Match Original

**Context**: Player starts with AC 4 (equivalent to Banded Mail), should start with AC 10 (unarmored)

**Files to create/modify**:
- `src/main.ts` (lines 198-218, 318-340)

##### Subtasks:
- [x] Change starting AC from `4` to `10` in `createInitialState()`
- [x] Change starting AC from `4` to `10` in `replaySeed()`
- [x] Update all tests that create players to use AC 10 as default
- [x] Git commit: "fix: correct starting player AC to 10 (unarmored, matching original Rogue) (Phase 3.1)"

---

#### Task 3.2: Add Starting Leather Armor to Inventory

**Context**: Original Rogue starts with leather armor equipped (AC 8). We start unarmored but should provide starting armor.

**Files to create/modify**:
- `src/main.ts`
- `src/services/ItemSpawnService/ItemSpawnService.ts`

##### Subtasks:
- [x] Add method to `ItemSpawnService`: `createStartingLeatherArmor(position: Position): Armor`
- [x] In `createInitialState()`, create starting leather armor
- [x] Add leather armor to player's starting inventory
- [x] Optionally: Auto-equip leather armor (changes AC from 10 → 8)
- [x] Update welcome message: "You are equipped with leather armor and a torch."
- [x] Git commit: "feat: add starting leather armor to player inventory (Phase 3.2)"

---

### Phase 4: Exceptional Strength Implementation (Priority: MEDIUM)

**Objective**: Add 1% chance to start with Str 18 + percentile bonus

#### Task 4.1: Add Exceptional Strength Roll to Character Creation

**Context**: Original Rogue has 1% chance to start with 18 strength + 1d100 percentile bonus

**Files to create/modify**:
- `src/main.ts`
- `src/services/CombatService/strength-bonuses.test.ts`

##### Subtasks:
- [ ] In `createInitialState()`, add strength roll logic:
  ```typescript
  // 1% chance for exceptional strength
  const exceptionalRoll = gameRandom.nextInt(1, 100)
  let startingStrength = 16
  let strengthPercentile: number | undefined = undefined

  if (exceptionalRoll === 1) {  // 1% chance
    startingStrength = 18
    strengthPercentile = gameRandom.nextInt(1, 100)  // 1d100
  }

  const player = {
    // ...
    strength: startingStrength,
    maxStrength: startingStrength,
    strengthPercentile,
    // ...
  }
  ```
- [ ] Repeat for `replaySeed()` function
- [ ] Add message when exceptional strength is rolled: "You feel unusually strong! (Str 18/XX)"
- [ ] Add test: Verify percentile only set when strength is 18
- [ ] Add test: Verify strength bonuses work correctly with percentile
- [ ] Git commit: "feat: add 1% chance for exceptional starting strength (18/XX) (Phase 4.1)"

---

#### Task 4.2: Display Exceptional Strength in UI

**Context**: Need to show "18/75" format instead of just "18" when percentile exists

**Files to create/modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Update strength display logic:
  ```typescript
  const strengthDisplay = player.strengthPercentile
    ? `${player.strength}/${player.strengthPercentile.toString().padStart(2, '0')}`
    : player.strength.toString()
  ```
- [ ] Update max strength display similarly
- [ ] Test: Display shows "18/75" for Str 18 with percentile 75
- [ ] Test: Display shows "16" for normal strength
- [ ] Git commit: "feat: display exceptional strength in 18/XX format (Phase 4.2)"

---

### Phase 5: Potion of Gain Strength Updates (Priority: MEDIUM)

**Objective**: Update Gain Strength potion to handle exceptional strength correctly

#### Task 5.1: Update Potion of Gain Strength Logic

**Context**: Potion should increase percentile if at Str 18, otherwise increase strength normally

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts`
- `src/services/PotionService/gain-strength.test.ts`

##### Subtasks:
- [ ] Update `applyGainStrength()` method:
  ```typescript
  // If strength is 18, increase percentile
  if (player.strength === 18) {
    const currentPercentile = player.strengthPercentile || 0
    const newPercentile = Math.min(100, currentPercentile + 10)  // +10 per potion
    return {
      ...player,
      strengthPercentile: newPercentile,
      maxStrength: 18,  // Keep at 18
    }
  } else {
    // Normal strength increase
    const newStr = Math.min(31, player.strength + 1)
    return {
      ...player,
      strength: newStr,
      maxStrength: Math.max(newStr, player.maxStrength),
    }
  }
  ```
- [ ] Add tests for percentile increase at Str 18
- [ ] Add test: Potion at Str 18/90 → Str 18/100
- [ ] Add test: Potion at Str 18/100 has no effect (capped)
- [ ] Add test: Potion at Str 17 → Str 18 (with percentile = undefined initially)
- [ ] Git commit: "feat: update Gain Strength potion to handle exceptional strength (Phase 5.1)"

---

### Phase 6: Restore Strength Logic Updates (Priority: MEDIUM)

**Objective**: Ensure strength drain/restore handles percentile correctly

#### Task 6.1: Update Strength Drain to Reduce Percentile

**Context**: When strength is drained at Str 18, should reduce percentile before reducing base strength

**Files to create/modify**:
- `src/services/SpecialAbilityService/SpecialAbilityService.ts`
- `src/services/PotionService/PotionService.ts`
- `src/services/SpecialAbilityService/strength-drain.test.ts`

##### Subtasks:
- [ ] Update `drainStrength()` method:
  ```typescript
  if (player.strength === 18 && player.strengthPercentile) {
    // Reduce percentile first
    const newPercentile = Math.max(1, player.strengthPercentile - 10)
    return {
      ...player,
      strengthPercentile: newPercentile,
    }
  } else if (player.strength === 18) {
    // Drop to 17 from base 18
    return {
      ...player,
      strength: 17,
      strengthPercentile: undefined,
    }
  } else {
    // Normal strength reduction
    return {
      ...player,
      strength: Math.max(3, player.strength - 1),
    }
  }
  ```
- [ ] Update `applyRestoreStrength()` in PotionService to restore percentile
- [ ] Add test: Drain at 18/50 → 18/40
- [ ] Add test: Drain at 18 (no percentile) → 17
- [ ] Add test: Restore strength restores both value and percentile
- [ ] Git commit: "feat: update strength drain/restore to handle exceptional strength (Phase 6.1)"

---

## 4. Technical Design

### Data Structures

```typescript
// Updated Player interface
export interface Player {
  // ... existing fields
  strength: number                // Base strength (3-31)
  maxStrength: number             // Maximum strength attained
  strengthPercentile?: number     // Exceptional strength (1-100, only when strength=18)
  // ... rest of fields
}
```

### Service Architecture

**Modified Services**:
- **CombatService**: Add strength bonus calculation methods, fix hit/damage formulas
- **PotionService**: Update Gain Strength and Restore Strength potions
- **SpecialAbilityService**: Update strength drain logic
- **ItemSpawnService**: Add method to create starting leather armor

**Service Dependencies**:
```
CombatService
  ├─ depends on → RandomService
  ├─ depends on → RingService (for strength from rings)
  └─ depends on → HungerService (for hunger penalties)

PotionService
  └─ uses → Player.strengthPercentile

SpecialAbilityService
  └─ uses → Player.strengthPercentile
```

### Algorithms & Formulas

**Strength To-Hit Bonus Calculation**:
```typescript
getStrengthToHitBonus(str: number, percentile?: number): number {
  if (str <= 6) return -1
  if (str < 17) return 0
  if (str === 17 || (str === 18 && !percentile)) return +1
  if (str === 18 && percentile) {
    if (percentile === 100) return +3
    if (percentile >= 51) return +2
    return +1
  }
  return +1  // Str 19+
}
```

**Strength Damage Bonus Calculation**:
```typescript
getStrengthDamageBonus(str: number, percentile?: number): number {
  if (str <= 6) return -1
  if (str < 16) return 0
  if (str === 16 || str === 17) return +1
  if (str === 18) {
    if (!percentile) return +2
    if (percentile >= 91) return +6
    if (percentile >= 76) return +5
    if (percentile >= 51) return +4
    return +3
  }
  if (str >= 22 && str <= 30) return +5
  if (str === 31) return +6
  if (str >= 19 && str <= 21) return +3
  return 0
}
```

**Hit Calculation Formula**:
```
1d20 + attacker_level + strength_to_hit_bonus >= (10 + defender_AC)
```

**Damage Calculation Formula**:
```
weapon_damage + weapon_bonus + strength_damage_bonus + hunger_penalty
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- CombatService: >95% (critical combat logic)
- PotionService: >90%
- Overall: >80%

**Test Files**:
- `strength-bonuses.test.ts` - All strength bonus calculations
- `hit-calculation.test.ts` - Updated hit formulas (update existing tests)
- `damage.test.ts` - Damage with strength bonuses (update existing tests)
- `gain-strength.test.ts` - Potion behavior with exceptional strength
- `strength-drain.test.ts` - Drain/restore with exceptional strength

### Test Scenarios

**Scenario 1: Normal Strength Player (Str 16)**
- Given: Player with Str 16, no percentile
- When: Player attacks monster
- Then: +0 to-hit bonus, +1 damage bonus

**Scenario 2: High Strength Player (Str 18)**
- Given: Player with Str 18, no percentile
- When: Player attacks monster
- Then: +1 to-hit bonus, +2 damage bonus

**Scenario 3: Exceptional Strength Player (Str 18/75)**
- Given: Player with Str 18, percentile 75
- When: Player attacks monster
- Then: +2 to-hit bonus, +5 damage bonus

**Scenario 4: Maximum Exceptional Strength (Str 18/100)**
- Given: Player with Str 18, percentile 100
- When: Player attacks monster
- Then: +3 to-hit bonus, +6 damage bonus

**Scenario 5: Weak Strength (Str 6)**
- Given: Player with Str 6
- When: Player attacks monster
- Then: -1 to-hit penalty, -1 damage penalty

**Scenario 6: Gain Strength at 18/90**
- Given: Player with Str 18/90
- When: Drink Potion of Gain Strength
- Then: Str becomes 18/100

**Scenario 7: Strength Drain at 18/50**
- Given: Player with Str 18/50
- When: Hit by strength-draining attack
- Then: Str becomes 18/40

**Scenario 8: Starting Character Creation**
- Given: New game started
- When: 1% exceptional strength roll succeeds
- Then: Player starts with Str 18/XX (1-100)

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **AttackCommand**: No changes needed (delegates to CombatService)
- **DrinkPotionCommand**: No changes needed (delegates to PotionService)

### UI Changes

**Renderer Updates**:
- Update strength display to show "18/75" format when percentile exists
- Update status bar strength display
- Update inventory/character sheet strength display

**Input Handling**:
- No new input handling needed

### State Updates

**GameState Changes**:
No changes to GameState interface.

**Player Changes**:
```typescript
interface Player {
  // ... existing fields
  strengthPercentile?: number  // ← NEW: Optional percentile for Str 18
}
```

**Backward Compatibility**:
- Existing saves without `strengthPercentile` will load correctly (undefined = no exceptional strength)
- TypeScript's optional field `?` ensures no breaking changes

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Create `docs/services/CombatService.md` - Document strength bonus calculations
- [ ] Update `docs/game-design/02-character.md` - Add exceptional strength mechanics
- [ ] Update `docs/systems-core.md` - Document combat formulas with strength bonuses
- [ ] Update `CLAUDE.md` - Add reference to original Rogue combat mechanics
- [ ] Create `docs/formulas/strength-bonuses.md` - Complete strength bonus tables

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Save Game Compatibility**
- **Problem**: Existing saves have AC 4 and incorrect strength bonuses applied
- **Mitigation**:
  - Optional field `strengthPercentile` is backward compatible
  - AC change is instant (no migration needed)
  - Combat becomes slightly harder (AC 10 vs AC 4), but player was overpowered before
  - Consider showing one-time message: "Combat balance updated to match original Rogue"

**Issue 2: Gameplay Difficulty Spike**
- **Problem**: Players will hit less often (no more +16 from strength) and take more damage (worse AC)
- **Mitigation**:
  - This is actually the correct balance from original Rogue
  - Game was too easy before (player was effectively 16 levels higher in to-hit)
  - Communicate changes in patch notes
  - Monitor feedback, but stay true to original mechanics

**Issue 3: Strength Ring Stacking**
- **Problem**: Two Rings of Add Strength could grant Str 22, which has different bonuses
- **Mitigation**:
  - Already handled by RingService calculating effective strength
  - Just need to ensure percentile logic handles Str > 18 correctly
  - Test: Two +3 rings on Str 18/50 player → effective Str 24 → +5 damage

### Breaking Changes
- **Player starting AC**: 4 → 10 (major nerf, but correct)
- **Strength to-hit bonus**: +16 → +0 for Str 16 (major nerf, but correct)
- **Strength damage bonus**: +0 → +1 for Str 16 (minor buff to compensate)
- **Overall**: Net nerf to player power, but aligns with original Rogue balance

### Performance Considerations
- Strength bonus calculations are simple arithmetic (O(1))
- No performance impact expected
- Percentile field adds 8 bytes to Player object (negligible)

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (can start immediately)
- **Blocks**: None (this is a balance fix, not a feature dependency)

### Estimated Timeline
- Phase 1 (Type System): 1-2 hours
- Phase 2 (Combat Formulas): 2-3 hours
- Phase 3 (Starting Stats): 1 hour
- Phase 4 (Exceptional Strength): 2-3 hours
- Phase 5 (Potion Updates): 1-2 hours
- Phase 6 (Drain/Restore): 1-2 hours
- **Total**: 8-13 hours (1-2 days of focused work)

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated
- [ ] Manual testing: Create new character, verify AC 10 start
- [ ] Manual testing: Attack monsters, verify hit rates feel reasonable
- [ ] Manual testing: Roll for exceptional strength multiple times (may need debug mode)
- [ ] Manual testing: Test Potion of Gain Strength at various strength levels
- [ ] Manual testing: Test strength drain/restore with exceptional strength

### Follow-Up Tasks
- [ ] Consider adding debug command to set specific strength (e.g., `s 18/75`)
- [ ] Add achievement for starting with exceptional strength (18/XX)
- [ ] Add achievement for reaching 18/100 strength
- [ ] Consider adding visual indicator when exceptional strength is active (golden "S" icon?)
- [ ] Update leaderboard to show starting/ending strength with percentile
- [ ] Add tooltip explaining strength bonuses in character sheet

---

**Last Updated**: 2025-10-10
**Status**: 🚧 In Progress
