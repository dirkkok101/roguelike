# Monsters

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Combat](./09-combat.md) | [Dungeon](./03-dungeon.md) | [Character](./02-character.md)

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
- **50% random movement**, 50% toward player
- **Unpredictable** and difficult to anticipate
- **Flying** creatures (can cross certain terrain)
- **Examples**: Bat, Kestrel

### THIEF
- **Steals item/gold** then flees
- **Teleports or runs away** after theft
- **Examples**: Leprechaun (gold), Nymph (magic items)

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

### Steal & Flee
**Monsters**: Leprechaun (gold), Nymph (magic item)

**Mechanic**:
- **Steals item/gold** on successful hit
- **Teleports or flees** immediately after
- Difficult to recover stolen items
- **Strategy**: Keep distance, kill before they reach you

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

## 4. Monster Behavior

### Sleep & Waking

**Asleep** (default):
- Most monsters start asleep
- Do not move or attack
- **Wake up** when player within detection range (typically 3 tiles)

**Awake**:
- Follow AI behavior pattern
- Attack when adjacent
- Pursue player based on AI type

### Mean Monsters
**Always start awake and aggressive**

**Examples**: Emu, Hobgoblin, Kestrel, Quagga, Snake, Troll, Ur-vile, Zombie

**Strategy**: Expect immediate combat, prepare defenses

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

## Cross-References

- **[Combat](./09-combat.md)** - Damage formulas, hit calculations
- **[Dungeon](./03-dungeon.md)** - Monster spawning, level scaling
- **[Character](./02-character.md)** - Stat draining effects
- **[Advanced Systems](../systems-advanced.md#monster-ai)** - AI implementation

---

## Influences

- **Original Rogue (1980)**: All 26 monsters, special abilities (rust, drain, regeneration)
- **NetHack**: Enhanced AI behaviors, special ability refinements
