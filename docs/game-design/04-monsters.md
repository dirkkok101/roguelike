# Monsters

**Version**: 2.1
**Last Updated**: 2025-10-06
**Related Docs**: [Combat](./09-combat.md) | [Dungeon](./03-dungeon.md) | [Character](./02-character.md) | [MonsterSpawnService](../services/MonsterSpawnService.md)

---

## 1. Complete Monster List (A-Z)

**Inspiration**: **Original Rogue (1980)** - All 26 monsters represented by capital letters A-Z, each with unique stats and abilities.

| Letter | Name | HP | AC | Damage | AI | Special Abilities |
|--------|------|----|----|--------|-----|-------------------|
| **A** | Aquator | 5d8 | 2 | 0d0 | SIMPLE | Rusts armor on hit |
| **B** | Bat | 1d8 | 3 | 1d2 | ERRATIC | Flying, erratic movement |
| **C** | Centaur | 4d8 | 4 | 1d2/1d5/1d5 | SMART | Multiple attacks |
| **D** | Dragon | 10d8 | -1 | 1d8/1d8/3d10 | SMART | Flame breath (6d6 ranged) |
| **E** | Emu | 1d8 | 7 | 1d2 | SIMPLE | Mean (aggressive) |
| **F** | Venus Flytrap | 8d8 | 3 | Special | STATIONARY | Holds player in place |
| **G** | Griffin | 13d8 | 2 | 4d3/3d5 | SMART | **Regenerates HP**, flying, mean |
| **H** | Hobgoblin | 1d8 | 5 | 1d8 | SIMPLE | Mean |
| **I** | Ice Monster | 1d8 | 9 | 0d0 | SIMPLE | Freezes player (skip turn) |
| **J** | Jabberwock | 15d8 | 6 | 2d12/2d4 | SMART | High damage, boss-tier |
| **K** | Kestrel | 1d8 | 7 | 1d4 | ERRATIC | Mean, flying |
| **L** | Leprechaun | 3d8 | 8 | 1d1 | THIEF | Steals gold, flees after |
| **M** | Medusa | 8d8 | 2 | 3d4/3d4/2d5 | SMART | Confuses player |
| **N** | Nymph | 3d8 | 9 | 0d0 | THIEF | Steals magic item, teleports |
| **O** | Orc | 1d8 | 6 | 1d8 | GREEDY | Runs toward gold piles |
| **P** | Phantom | 8d8 | 3 | 4d4 | SMART | Invisible |
| **Q** | Quagga | 3d8 | 3 | 1d5/1d5 | SIMPLE | Mean |
| **R** | Rattlesnake | 2d8 | 3 | 1d6 | SIMPLE | Reduces strength on hit |
| **S** | Snake | 1d8 | 5 | 1d3 | SIMPLE | Mean |
| **T** | Troll | 6d8 | 4 | 1d8/1d8/2d6 | SIMPLE | **Regenerates HP**, mean |
| **U** | Ur-vile | 7d8 | -2 | 1d9/1d9/2d9 | SMART | Mean, tough AC |
| **V** | Vampire | 8d8 | 1 | 1d10 | SMART + COWARD | **Regenerates**, drains max HP, flees at low HP |
| **W** | Wraith | 5d8 | 4 | 1d6 | SMART | Drains experience points |
| **X** | Xeroc | 7d8 | 7 | 4d4 | SIMPLE | None |
| **Y** | Yeti | 4d8 | 6 | 1d6/1d6 | SIMPLE | Two attacks |
| **Z** | Zombie | 2d8 | 8 | 1d8 | SIMPLE | Mean, slow |

---

## 2. AI Behavior Types

**Inspiration**: **NetHack** - Enhanced AI behaviors beyond simple pathfinding. **Original Rogue** had simpler AI, modern implementations add tactical depth.

### SMART
- **Full A* pathfinding** (optimal path around obstacles)
- **Tactical positioning** (avoid disadvantageous positions)
- **Examples**: Dragon, Jabberwock, Centaur, Griffin, Medusa, Phantom, Ur-vile, Vampire, Wraith

### SIMPLE
- **Greedy movement** toward player (direct approach, basic obstacle avoidance)
- **Most common** behavior
- **Examples**: Aquator, Emu, Hobgoblin, Ice Monster, Quagga, Rattlesnake, Snake, Troll, Xeroc, Yeti, Zombie

### GREEDY
- **Prioritizes gold** over player
- **Runs toward gold piles** on floor
- **Only attacks** if player blocks path to gold
- **Example**: Orc

### ERRATIC
- **100% random movement** (never seeks player)
- **Completely unpredictable** - no player tracking
- **Flying** creatures (can cross certain terrain)
- **Examples**: Bat, Kestrel
- **Authentic Rogue**: Matches 1980 Rogue where Bats "always moved as if confused"

### THIEF
- **Steals item/gold** when adjacent to player
- **Immediately teleports** to random location after stealing
- **Then flees on foot** if encountered again
- **Examples**: Leprechaun (gold), Nymph (magic items)
- **Authentic Rogue**: Matches 1980 Rogue where thieves "vanished" after stealing

### STATIONARY
- **Does not move** from spawn position
- **Waits** for player to approach
- **Example**: Venus Flytrap

### COWARD
- **Flees when HP < threshold** (typically 25% max HP)
- **Example**: Vampire (flees at low HP, regenerates, returns)

**See**: [Advanced Systems](../systems-advanced.md#monster-ai) for technical implementation details.

---

## 3. Special Abilities

### Regeneration
**Monsters**: Troll, Griffin, Vampire

**Mechanic**:
- **Regenerate 1 HP per turn** when below max HP
- Makes prolonged combat dangerous
- **Strategy**: High burst damage to kill before regeneration accumulates

**Inspiration**: **Original Rogue** - Trolls and Vampires regenerated, creating challenging fights.

### Rust Armor
**Monster**: Aquator

**Mechanic**:
- On hit, **reduces armor enchantment** by 1 (e.g., +1 armor becomes +0, then unenchanted)
- Can make armor **cursed** (negative AC penalty)
- **Strategy**: Avoid close combat, use ranged attacks if available

### Steal & Teleport
**Monsters**: Leprechaun (gold), Nymph (magic item)

**Mechanic**:
1. **Approaches** using intelligent pathfinding (A*)
2. **Steals item/gold** when adjacent to player
3. **Immediately teleports** to random walkable location
4. **Flees on foot** if encountered again

**Authentic Rogue**: In 1980 Rogue, Leprechauns and Nymphs were stationary and would "vanish" after stealing, simulated here by teleportation.

**Recovery**: Extremely difficult to chase down after teleport

**Strategy**:
- Keep distance, kill before they reach you
- Protect valuable items
- High priority targets in group encounters

### Drain Stats/XP
**Monsters**: Wraith (XP), Rattlesnake (Strength), Vampire (max HP)

**Mechanic**:
- **Permanent stat reduction** on hit (until restored by potion)
- **XP drain** can de-level player
- **Max HP drain** reduces maximum hit points
- **Strategy**: Extreme caution, use healing potions proactively

### Freeze Player
**Monster**: Ice Monster

**Mechanic**:
- On hit, **player skips next turn** (paralyzed)
- Monster gets free attack
- **Strategy**: Avoid if possible, ensure high HP before engaging

### Confuse Player
**Monster**: Medusa

**Mechanic**:
- Movement randomized for several turns
- Makes tactical positioning impossible
- **Strategy**: Clear area of other threats before engaging

### Flame Breath
**Monster**: Dragon

**Mechanic**:
- **Ranged attack** (6d6 damage) at distance
- **Melee attacks** (1d8/1d8/3d10) at close range
- Extremely dangerous
- **Strategy**: High AC, healing potions, tactical retreat

---

## 3.1 Special Ability Flags Reference

**Technical**: Special abilities are configured in `public/data/monsters.json` using the `special` array in each monster's `aiProfile`.

**Flag Naming Convention**: All special ability flags use present-tense verb forms with underscores for compound names.

| Flag Name | Monster(s) | Trigger | Effect |
|-----------|------------|---------|--------|
| `rusts_armor` | Aquator | On hit (50%) | Reduces armor bonus by 1 |
| `freezes` | Ice Monster | On hit (40%) | Player skips next turn |
| `confuses` | Medusa | On hit (30%) | Player movement randomized 3-5 turns |
| `drains_strength` | Rattlesnake | On hit (50%) | Strength -1 (min 3) |
| `drains_xp` | Wraith | On hit (40%) | XP -10 to -50 |
| `drains_max_hp` | Vampire | On hit (30%) | Max HP -1 (min 1) |
| `holds` | Venus Flytrap | On hit (60%) | Player held 1-2 turns |
| `steals` | Leprechaun, Nymph | Adjacent | Steals gold/item, then flees |
| `regeneration` | Troll, Griffin, Vampire | Per turn | Heal 1 HP when below max |
| `breath_weapon` | Dragon | Combat (40%) | 6d6 fire damage ranged |
| `flying` | Bat, Kestrel, Griffin | Passive | Erratic movement, can cross terrain |
| `invisible` | Phantom | Passive | Hidden until revealed |
| `mean` | Various (12 monsters) | Passive | 67% chase chance per turn (authentic Rogue ISMEAN flag) |

**Example Configuration**:
```json
{
  "letter": "A",
  "name": "Aquator",
  "aiProfile": {
    "behavior": "SIMPLE",
    "special": ["rusts_armor"]
  }
}
```

**Implementation**: See `src/services/SpecialAbilityService/SpecialAbilityService.ts` for ability logic.

---

## 3.2 Validating Special Ability Flags

**When adding a new special ability**:

1. **Add flag to valid list**: Update `validSpecialFlags` array in:
   - `src/services/MonsterSpawnService/monster-data-validation.test.ts` (line 12)
   - `scripts/validate-monster-data.cjs` (line 26)

2. **Implement logic**: Add check in `SpecialAbilityService.applyOnHitAbilities()` or relevant service

3. **Add tests**: Create test file in `src/services/SpecialAbilityService/`

4. **Update documentation**: Add row to table above (section 3.1)

5. **Validate**: Run `npm run validate:data` to check all monsters

**How to verify a special ability works**:

1. **Unit Test**: `npm test SpecialAbilityService` should pass
2. **Integration Test**: `npm test monster-data-validation` should pass
3. **Data Validation**: `npm run validate:data` should pass with no errors
4. **Manual Test**: Follow `docs/MANUAL_MONSTER_TESTING.md` for the specific monster

**Common Mistakes**:
- ❌ Using past tense: `"drained_strength"` (wrong)
- ✅ Using present tense: `"drains_strength"` (correct)
- ❌ Using spaces: `"drains strength"` (wrong)
- ✅ Using underscores: `"drains_strength"` (correct)
- ❌ Typos in flags: `"rusts_armour"` instead of `"rusts_armor"` (wrong)

**Automated Validation**:
- ✅ Validation runs automatically before tests (`npm test`)
- ✅ Validation script: `npm run validate:data`
- ✅ Integration test: `npm test monster-data-validation`

**Validation Catches**:
- Invalid flag names (typos)
- Missing required fields
- Invalid behavior types
- Out-of-range stats (HP, speed, level, etc.)
- Duplicate letters or flags
- Past-tense verb naming (common error)

---

## 4. Monster Behavior

### Sleep & Waking

**Asleep** (default):
- Most monsters start asleep
- Do not move or attack
- **Wake up** when player within aggro range (authentic Rogue mechanic)

**Aggro Ranges** (based on authentic 1980 Rogue values):
- **SIMPLE monsters** (low intelligence): 3-5 tiles
- **SMART monsters** (high intelligence): 6-8 tiles (better awareness)
- **ERRATIC monsters** (Bat, Kestrel): 0 tiles (never wake from proximity, always random movement)
- **Boss monsters** (Dragon, Jabberwock, Griffin): 8-10 tiles (high awareness)

**Awake**:
- Follow AI behavior pattern
- Attack when adjacent
- Pursue player based on AI type

---

### Running Detection

**Mechanic**: Player running increases monster detection range

**Effect**:
- **Effective aggro range = base aggro range × 1.5** when player is running
- Example: Orc (aggro range 5) detects player at 8 tiles when running (5 × 1.5 = 7.5, rounded to 8)

**Authentic Rogue**: Matches original Rogue where running made more noise and woke monsters earlier

**Strategy**:
- **Walk** when sneaking past sleeping monsters (normal detection range)
- **Run** when escaping or exploring cleared areas (faster movement, higher risk)
- **Ring of Stealth** prevents wake-ups even when running (powerful combination)

**Implementation**: `Player.isRunning` flag tracked by MoveCommand, checked in MonsterAIService wake logic

---

### Door Slam Wake Mechanic

**Mechanic**: Leaving a doorway and immediately returning wakes monsters in connected rooms

**Pattern Detection**:
- Track last 3 player positions
- Detect: position N-2 == position N (returned to same tile within 2 moves)
- Check: Is position a doorway?
- Effect: Wake all sleeping monsters in rooms connected by that door

**Authentic Rogue**: In original 1980 Rogue, slamming doors (leaving and re-entering) created noise that woke monsters

**Tactical Use**:
- **Intentional wake**: Player can choose to wake monsters by door slamming
- **Controlled engagement**: Wake specific room's monsters without wandering into room
- **Message**: "Your loud entrance wakes the monsters!" (warning type)

**Example**:
```
Turn N-2: Player at door position (5,5)
Turn N-1: Player moves left to (4,5)
Turn N:   Player moves right back to door (5,5)
Result:   Door slam detected! Monsters in connected rooms wake up.
```

**Strategy**:
- Avoid accidental backtracking through doorways
- Use intentionally to pull sleeping monsters toward doorway
- Combines with ranged attacks for tactical advantage

**Implementation**: `GameState.positionHistory` tracks positions, MoveCommand detects pattern, MonsterAIService wakes room monsters

---

### Wandering Monster Spawns

**Mechanic**: Monsters spawn randomly as player stays on level (authentic Rogue time pressure)

**Spawn Formula**:
```
Base chance = 0.5% per turn (1 in 200)
Increment = +0.01% per turn since last spawn
Maximum = 5% per turn (cap)
Limit = 5 wanderers per level maximum
```

**Spawn Rules**:
- **Cannot spawn in player's room** (authentic Rogue rule, prevents cheap deaths)
- Spawn in walkable tiles (corridors or other rooms)
- Spawn awake in WANDERING state (not sleeping)
- Level-appropriate selection (same as initial spawns)

**Progression Example**:
| Turns Since Spawn | Chance | Average Wait |
|-------------------|--------|--------------|
| 0 | 0.5% | 200 turns |
| 100 | 1.5% | 67 turns |
| 200 | 2.5% | 40 turns |
| 300 | 3.5% | 29 turns |
| 450+ | 5.0% (cap) | 20 turns |

**Authentic Rogue**: Original 1980 Rogue spawned wandering monsters at ~1% per turn, adding time pressure

**Strategy**:
- **Clear levels quickly** to minimize wanderer spawns
- **Don't camp indefinitely** - spawn chance increases over time
- **5 wanderer limit** prevents level overcrowding
- **Rest in cleared rooms** when safe (fewer wanderers early on)

**Notification**: "You hear a faint noise in the distance..." (atmospheric message when wanderer spawns)

**Implementation**: WanderingMonsterService handles spawn logic, TurnService calls after monster turns

**See**: [WanderingMonsterService](../services/WanderingMonsterService.md) for technical details

---

### Mean Monsters (ISMEAN Flag)
**Special Behavior**: **67% chance per turn to pursue** player (authentic Rogue ISMEAN flag)

**Complete List** (12 monsters):
- Dragon (D), Emu (E), Griffin (G), Hobgoblin (H)
- Jabberwock (J), Kestrel (K), Orc (O), Quagga (Q)
- Snake (S), Troll (T), Ur-vile (U), Zombie (Z)

**Chase Mechanic**:
- Each turn, MEAN monster rolls against 67% chance
- **Success** (67%): Monster pursues player
- **Failure** (33%): Monster waits/stands still
- **Always attacks** when adjacent (no roll needed)

**Authentic Rogue Behavior**: In original 1980 Rogue, the ISMEAN flag gave monsters exactly 67% chance to chase per turn, creating the same tactical feel where aggressive monsters occasionally hesitate.

**Strategy**:
- MEAN monsters are less relentless than 100% pursuers
- Use waiting turns to heal or reposition
- Still dangerous due to multiple attempts per encounter

---

## 5. Flying Monsters

**Examples**: Bat, Kestrel, Griffin

**Abilities**:
- Can cross certain terrain types (Phase 4+ implementation)
- Erratic movement patterns (Bat, Kestrel)
- Difficult to predict

---

## 6. Scaling by Dungeon Level

### Early Levels (1-3)
**Common**: Bat (B), Snake (S), Hobgoblin (H), Emu (E)
**Difficulty**: Low threat, learn monster behaviors

### Mid Levels (4-7)
**Common**: Orc (O), Centaur (C), Leprechaun (L), Troll (T), Yeti (Y), Quagga (Q)
**Difficulty**: Moderate threat, special abilities emerge

### Late Levels (8-10)
**Common**: Dragon (D), Griffin (G), Jabberwock (J), Vampire (V), Wraith (W), Ur-vile (U), Phantom (P), Medusa (M)
**Difficulty**: High threat, regeneration + drain abilities

**Scaling Algorithm**: Higher levels have weighted spawn tables favoring tougher monsters.

---

## 7. Combat Strategy Tips

**Regenerators** (Troll, Griffin, Vampire):
- Burst damage critical
- Don't let fight drag out
- Healing potions for extended combat

**Drainers** (Wraith, Rattlesnake, Vampire):
- Avoid if under-equipped
- Restore potions essential
- High priority targets

**Thieves** (Leprechaun, Nymph):
- Kill at range if possible
- Protect valuable items
- Chase if stolen item is critical

**Smart AI** (Dragon, Jabberwock, Medusa, etc.):
- Expect optimal pathing
- Use terrain to advantage
- Tactical retreats viable

---

## 8. Monster Speeds

**New in Version 2.1**: Variable monster speeds for the energy system

**Why Speed Matters**:
The energy system determines action frequency. Every game tick, monsters gain energy equal to their speed:
```
monster.energy += monster.speed
if (monster.energy >= 100) {
  monster.takeTurn()
  monster.energy -= 100
}
```

**Before Refactor**: All monsters had hardcoded `speed = 10`, making the energy system ineffective.

**After Refactor**: Monsters have variable speeds from data files (`monsters.json`), creating tactical variety.

---

### Speed Categories

| Speed | Category | Actions Per Turn Cycle | Monsters |
|-------|----------|------------------------|----------|
| **5** | Slow | ~1 action per 20 turns | Zombie |
| **7** | Slow-Normal | ~1 action per 15 turns | Troll |
| **10** | Normal (Baseline) | 1 action per 10 turns | Kobold, Orc, Hobgoblin, Emu, Snake, Quagga, Yeti, Xeroc, Leprechaun, Nymph, Aquator, Ice Monster, Rattlesnake, Venus Flytrap |
| **12** | Fast | ~1 action per 8 turns | Centaur, Medusa, Wraith |
| **15** | Very Fast | ~1 action per 7 turns | Bat, Kestrel, Ur-vile, Vampire, Phantom |
| **18** | Ultra Fast | ~1 action per 5-6 turns | Dragon, Griffin, Jabberwock |

---

### Speed Table (All Monsters)

| Monster | Speed | Rationale |
|---------|-------|-----------|
| Aquator (A) | 10 | Normal speed, armor-rusting creature |
| Bat (B) | 15 | Very fast, flying, erratic movement |
| Centaur (C) | 12 | Fast, multiple attacks |
| **Dragon (D)** | **18** | **Ultra fast boss**, flying, flame breath |
| Emu (E) | 10 | Normal speed, mean |
| Venus Flytrap (F) | 10 | Stationary (doesn't chase), normal attack speed |
| **Griffin (G)** | **18** | **Ultra fast**, regenerates, flying, boss-tier |
| Hobgoblin (H) | 10 | Normal speed, mean |
| Ice Monster (I) | 10 | Normal speed, freezes player |
| **Jabberwock (J)** | **18** | **Ultra fast boss**, high damage |
| Kestrel (K) | 15 | Very fast, flying, erratic |
| Leprechaun (L) | 10 | Normal speed, thief |
| Medusa (M) | 12 | Fast, confuses player, multiple attacks |
| Nymph (N) | 10 | Normal speed, thief, teleports |
| Orc (O) | 10 | Normal speed, greedy |
| Phantom (P) | 15 | Very fast, invisible |
| Quagga (Q) | 10 | Normal speed, mean |
| Rattlesnake (R) | 10 | Normal speed, reduces strength |
| Snake (S) | 10 | Normal speed, mean |
| Troll (T) | 7 | Slow-normal, regenerates (compensates for speed) |
| Ur-vile (U) | 15 | Very fast, tough AC, mean |
| Vampire (V) | 15 | Very fast, regenerates, drains HP, coward |
| Wraith (W) | 12 | Fast, drains XP |
| Xeroc (X) | 10 | Normal speed, no special abilities |
| Yeti (Y) | 10 | Normal speed, two attacks |
| **Zombie (Z)** | **5** | **Slow**, mean, undead |

---

### Design Rationale

**Boss Monsters (Speed 18)**:
- Dragon, Griffin, Jabberwock are endgame threats
- Ultra fast speed makes them dangerous even with fewer spawns
- Compensates for high XP value (players avoid fighting)

**Flying Monsters (Speed 12-15)**:
- Bat, Kestrel, Griffin: Flying creatures are naturally faster
- Can cross difficult terrain (future enhancement)

**Regenerators (Speed 7-10)**:
- Troll (7): Slow speed balances regeneration advantage
- Griffin (18): Speed + regeneration = boss tier
- Vampire (15): Fast but flees when low HP (balanced)

**Thieves (Speed 10)**:
- Leprechaun, Nymph: Normal speed for hit-and-run tactics
- Don't need speed advantage (teleportation/fleeing compensates)

**Zombies (Speed 5)**:
- Classic slow zombie trope
- Dangerous in groups despite slow speed
- Players can outrun easily (tactical choice)

---

### Tactical Implications

**Fast Monsters (15-18 speed)**:
- Act nearly twice as often as player (player speed ~10)
- **Can't outrun** - must fight or use corridors tactically
- **High priority targets** in group fights
- Examples: Dragon breath weapon hits more frequently

**Slow Monsters (5-7 speed)**:
- Act less frequently than player
- **Easy to kite** (hit and retreat)
- **Dangerous in numbers** (blocking escape routes)
- Examples: Zombie hordes corner players

**Regenerators + Speed**:
- Slow regenerators (Troll) give time to burst down
- Fast regenerators (Griffin, Vampire) require immediate action
- Extended combat favors regenerators regardless of speed

---

### Implementation

**Data File**: `public/data/monsters.json`
```json
{
  "letter": "D",
  "name": "Dragon",
  "speed": 18,
  ...
}
```

**Service**: [MonsterSpawnService](../services/MonsterSpawnService.md) loads speeds from JSON

**Energy System**: [TurnService](../services/TurnService.md) grants energy based on speed

**See**: [Monster Spawn Refactor Plan](../plans/monster_spawn_refactor_plan.md) for implementation details

---

## Cross-References

- **[Combat](./09-combat.md)** - Damage formulas, hit calculations
- **[Dungeon](./03-dungeon.md)** - Monster spawning, level scaling
- **[Character](./02-character.md)** - Stat draining effects
- **[Advanced Systems](../systems-advanced.md#monster-ai)** - AI implementation

---

## Influences

- **Original Rogue (1980)**: All 26 monsters, special abilities (rust, drain, regeneration)
- **NetHack**: Enhanced AI behaviors, special ability refinements
