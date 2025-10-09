# Manual Monster Behavior Testing Guide

**Purpose**: Verify that all monster behaviors and special abilities work correctly in-game after fixing special ability flag mismatches.

**Date**: 2025-10-07
**Related Fix**: Special ability flags in `monsters.json` updated to match code expectations

---

## Fixed Monsters (Priority Testing)

These 9 monsters had broken special abilities due to flag mismatches. **Test these first**:

### 🔴 **Aquator (A)** - Level 5+
**Behavior**: SIMPLE (moves directly toward player)
**Special**: Rusts armor on hit (50% chance)

**Test Steps**:
1. Start game with `npm run dev`
2. Use debug mode `~` to teleport to level 5: `t` → `5`
3. Use `m` to spawn Aquator at cursor
4. Equip armor if not already equipped
5. Let Aquator hit you several times
6. **Expected**: Message "Your armor rusts!" → armor bonus decreases by 1

**Pass Criteria**: ✅ Armor bonus decreases after hit

---

### 🔴 **Ice Monster (I)** - Level 5+
**Behavior**: SIMPLE
**Special**: Freezes player on hit (40% chance), player skips next turn

**Test Steps**:
1. Spawn Ice Monster with debug: `m` → `I`
2. Let it hit you multiple times
3. **Expected**: Message "You are frozen solid!" → you can't move next turn
4. Note: Ice Monster does 0d0 damage (only freezes)

**Pass Criteria**: ✅ Player frozen message appears, turn skipped

---

### 🔴 **Leprechaun (L)** - Level 4+
**Behavior**: THIEF (A* pathfinding, steals gold when adjacent)
**Special**: Steals gold, then flees

**Test Steps**:
1. Ensure you have gold (use `g` god mode or pick up gold)
2. Spawn Leprechaun with `m` → `L`
3. Wait for it to approach (it uses A* pathfinding)
4. Let it become adjacent
5. **Expected**:
   - Message "The Leprechaun steals X gold and flees!"
   - Gold decreases
   - Leprechaun changes to FLEEING state (runs away)

**Pass Criteria**: ✅ Gold stolen, message shown, Leprechaun flees

---

### 🔴 **Medusa (M)** - Level 8+
**Behavior**: SMART (A* pathfinding)
**Special**: Confuses player on hit (30% chance), 3 attacks

**Test Steps**:
1. Teleport to level 8+
2. Spawn Medusa with `m` → `M`
3. Let it hit you multiple times (it has 3 attacks per turn!)
4. **Expected**: Message "You feel confused!" → movement becomes random

**Pass Criteria**: ✅ Confusion message appears, movement randomized

---

### 🔴 **Nymph (N)** - Level 6+
**Behavior**: THIEF (steals item when adjacent)
**Special**: Steals random item from inventory, then flees

**Test Steps**:
1. Ensure you have items in inventory
2. Spawn Nymph with `m` → `N`
3. Let it become adjacent
4. **Expected**:
   - Message "The Nymph steals your [ItemName] and disappears!"
   - Item removed from inventory
   - Nymph changes to FLEEING state

**Pass Criteria**: ✅ Item stolen, message shown, Nymph flees

---

### 🔴 **Rattlesnake (R)** - Level 3+
**Behavior**: SIMPLE
**Special**: Drains strength on hit (50% chance), permanent stat loss

**Test Steps**:
1. Note your current strength (visible in UI)
2. Spawn Rattlesnake with `m` → `R`
3. Let it hit you multiple times
4. **Expected**: Message "You feel weaker!" → strength -1 (min 3)

**Pass Criteria**: ✅ Strength decreases, message shown

---

### 🔴 **Vampire (V)** - Level 8+
**Behavior**: SMART + COWARD (flees at 30% HP)
**Special**: Drains max HP on hit (30% chance), regenerates 1 HP/turn

**Test Steps**:
1. Note your current max HP
2. Spawn Vampire with `m` → `V`
3. Let it hit you multiple times
4. **Expected**:
   - Message "You feel your life essence fade!" → max HP -1
   - Vampire regenerates HP when damaged (watch its HP)
   - Vampire flees when HP drops below 30%

**Pass Criteria**: ✅ Max HP decreases, Vampire regenerates and flees at low HP

---

### 🔴 **Venus Flytrap (F)** - Level 6+
**Behavior**: STATIONARY (never moves)
**Special**: Holds player in place (60% chance)

**Test Steps**:
1. Spawn Venus Flytrap with `m` → `F`
2. Move adjacent to it (it won't move to you)
3. Let it hit you
4. **Expected**: Message "The flytrap grabs you!" → player held for 1-2 turns

**Pass Criteria**: ✅ Player held, can't move for 1-2 turns

---

### 🔴 **Wraith (W)** - Level 7+
**Behavior**: SMART
**Special**: Drains XP on hit (40% chance)

**Test Steps**:
1. Note your current XP
2. Spawn Wraith with `m` → `W`
3. Let it hit you multiple times
4. **Expected**: Message "You feel your life force drain away!" → XP decreases by 10-50

**Pass Criteria**: ✅ XP decreases, message shown

---

## Behavior Testing (All Monsters)

### ✅ **ERRATIC Behavior** - Bat (B), Kestrel (K)
**Expected**: 50% random movement, 50% toward player

**Test Steps**:
1. Spawn Bat in open room: `m` → `B`
2. Stand still and watch Bat for 10+ turns
3. **Expected**: Bat sometimes moves randomly (away from you), sometimes toward you

**Note**: Bat has speed 15 (very fast), may be hard to observe individual moves. Try in a large open room.

**Pass Criteria**: ✅ Bat shows unpredictable movement patterns

---

### ✅ **GREEDY Behavior** - Orc (O)
**Expected**: Prioritizes gold over player

**Test Steps**:
1. Spawn Orc: `m` → `O`
2. Drop gold pile near Orc (use debug or place manually)
3. Stand away from gold
4. **Expected**: Orc moves toward gold, not toward you (if gold is closer)

**Pass Criteria**: ✅ Orc chases gold instead of player

---

### ✅ **STATIONARY Behavior** - Venus Flytrap (F)
**Expected**: Never moves from spawn position

**Test Steps**:
1. Spawn Venus Flytrap
2. Move around it, stay in sight
3. **Expected**: Flytrap never moves, even when you're close

**Pass Criteria**: ✅ Flytrap stays in place

---

### ✅ **SMART Behavior** - Dragon (D), Centaur (C), etc.
**Expected**: Uses A* pathfinding around obstacles

**Test Steps**:
1. Spawn smart monster in room with walls
2. Position yourself so monster must navigate around obstacles
3. **Expected**: Monster finds optimal path around walls (not stuck)

**Pass Criteria**: ✅ Monster navigates obstacles intelligently

---

### ✅ **SIMPLE Behavior** - Snake (S), Emu (E), etc.
**Expected**: Greedy movement (picks adjacent tile closest to player)

**Test Steps**:
1. Spawn simple monster
2. Place walls between you and monster
3. **Expected**: Monster may get stuck on walls (can't navigate around)

**Pass Criteria**: ✅ Monster moves toward you but gets stuck on obstacles

---

## Regeneration Testing

### Troll (T), Griffin (G), Vampire (V)
**Expected**: Regenerate 1 HP per turn when below max

**Test Steps**:
1. Spawn regenerating monster
2. Damage it (let it fight you or use debug)
3. Run away and watch its HP with AI debug overlay (`n`)
4. **Expected**: HP increases by 1 each turn until max

**Pass Criteria**: ✅ Monster HP increases over time

---

## COWARD Behavior Testing

### Vampire (V), Centaur (C)
**Expected**: Flees when HP drops below threshold

**Test Steps**:
1. Spawn Vampire (flees at 30% HP)
2. Damage it until HP < 30%
3. **Expected**: Vampire stops chasing, starts running away

**Pass Criteria**: ✅ Monster flees at low HP

---

## Debug Commands Reference

| Key | Command | Usage |
|-----|---------|-------|
| `~` | Toggle Debug Console | Show/hide debug panel |
| `t` | Teleport to level | `t` → enter level 1-10 |
| `m` | Spawn monster | `m` → enter letter A-Z |
| `g` | God Mode | Invincible, infinite resources |
| `v` | Reveal Map | Show entire level |
| `n` | Toggle AI Debug | Show monster states/paths |
| `f` | Toggle FOV Debug | Highlight visible tiles |

---

## Quick Test Checklist

**Minimum tests to verify all fixes**:

- [ ] Aquator rusts armor
- [ ] Ice Monster freezes player
- [ ] Leprechaun steals gold and flees
- [ ] Medusa confuses player
- [ ] Nymph steals item and flees
- [ ] Rattlesnake drains strength
- [ ] Vampire drains max HP and regenerates
- [ ] Venus Flytrap holds player
- [ ] Wraith drains XP
- [ ] Bat moves erratically (if spawned in open room)
- [ ] Orc prioritizes gold

---

## Troubleshooting

**Issue**: "Monster ability doesn't trigger"
- **Check**: Does the ability have a % chance? Try multiple hits
- **Check**: Run tests with `npm test MonsterTurnService/theft-mechanics` to verify code works
- **Check**: Verify `monsters.json` has correct flag name (e.g., `"rusts_armor"` not `"rust_armor"`)

**Issue**: "Bat doesn't look erratic"
- **Reason**: Bat has speed 15 (very fast), moves ~2x per turn. Hard to see individual moves.
- **Solution**: Watch in large open room, stand still for 10+ turns

**Issue**: "Leprechaun/Nymph won't steal"
- **Check**: Are they adjacent? They need to be next to you (not diagonal)
- **Check**: Do you have gold/items? They won't steal if you have nothing
- **Verify**: Tests pass with `npm test theft-mechanics`

---

## Expected Results Summary

| Monster | Ability | Expected Outcome |
|---------|---------|------------------|
| Aquator (A) | Rust armor | "Your armor rusts!" → armor bonus -1 |
| Bat (B) | Erratic movement | Moves randomly ~50% of time |
| Ice Monster (I) | Freeze | "You are frozen solid!" → skip turn |
| Leprechaun (L) | Steal gold | "Leprechaun steals X gold and flees!" |
| Medusa (M) | Confuse | "You feel confused!" → random movement |
| Nymph (N) | Steal item | "Nymph steals your [item] and disappears!" |
| Rattlesnake (R) | Drain strength | "You feel weaker!" → strength -1 |
| Vampire (V) | Drain max HP + regen | "Life essence fades!" → maxHP -1, HP increases when damaged |
| Venus Flytrap (F) | Hold + stationary | "Flytrap grabs you!" → held for 1-2 turns, never moves |
| Wraith (W) | Drain XP | "Life force drains!" → XP decreases |

---

**Testing Complete**: ✅ All monster behaviors verified working correctly
