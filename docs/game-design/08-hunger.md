# Hunger System

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Items](./05-items.md)

---

## 1. Overview

**Purpose**: Resource management mechanic that creates tension and strategic decisions.

**Inspiration**: **Original Rogue (1980)** - Established hunger as core roguelike resource. **NetHack** and **Angband** refined with ring modifiers and regeneration costs.

---

## 2. Hunger Units

### Starting Values

**Initial Hunger**: 1300 food units

**Maximum Capacity**: 2000 units (cannot exceed)

**Food Ration Restoration**: 1100-1499 units (randomized)
- Average: ~1300 units (one full refill)
- Variance creates uncertainty

---

## 3. Hunger Depletion

### Base Depletion Rate

**Normal**: 1 unit per turn

**All actions consume hunger**:
- Moving
- Attacking
- Resting
- Waiting

---

### Ring Modifiers

**Ring of Regeneration**: **+30% hunger consumption**
- Example: 1 → 1.3 units per turn
- Tradeoff for faster healing (1 HP per 5 turns)

**Ring of Slow Digestion**: **-50% hunger consumption**
- Example: 1 → 0.5 units per turn
- Highly valuable for extended exploration

**Multiple Rings**: Effects stack
- Regeneration + another hunger ring = +60% total
- Slow Digestion + Regeneration = roughly normal rate

**Inspiration**: **NetHack** - Ring of Regeneration +30 nutrition cost. **Angband** - Regeneration food penalties.

---

## 4. Hunger States

| Food Units | State | Display | Effect |
|------------|-------|---------|--------|
| **301+** | Normal | - | No penalties |
| **150-300** | Hungry | "You are getting hungry" (yellow) | Warning only |
| **1-149** | Weak | "You are weak from hunger!" (red) | **-1 to hit and damage** |
| **0** | Starving | "You are fainting!" (flashing red) | **Take 1 HP damage per turn** |

---

## 5. State Effects

### Normal (301+ units)
- Full combat effectiveness
- Health regeneration active (if > 100 units)
- No penalties

### Hungry (150-300 units)
- **Warning message** displayed
- No mechanical penalties yet
- **Signal to eat soon**

### Weak (1-149 units)
- **Combat penalties**: -1 to hit, -1 damage
- Health regeneration blocked (< 100 threshold)
- Significantly weaker in fights

### Starving (0 units)
- **Take 1 HP damage per turn** (ongoing)
- Death spiral if no food available
- **Critical emergency**

**Important**: Health regeneration requires hunger > 100 (see [Character](./02-character.md#health-regeneration))

---

## 6. Food Management Strategy

### Early Game (Levels 1-3)
- **Start with 2-3 rations**
- Eat at ~300 hunger (before penalties)
- Prioritize finding more food

### Mid Game (Levels 4-7)
- **Build food stockpile** (5+ rations)
- Balance exploration time vs food consumption
- Rings create hunger pressure

### Late Game (Levels 8-10)
- **Ration carefully** for final push
- Ring of Slow Digestion highly valuable
- Food scarcity increases

---

## 7. Ring Hunger Trade-offs

### Ring of Regeneration
**Benefit**: 1 HP per 5 turns (doubles regeneration rate)
**Cost**: +30% hunger consumption
**Worth it?** If you have food surplus or Slow Digestion ring

### Ring of Slow Digestion
**Benefit**: -50% hunger consumption (makes food last twice as long)
**Cost**: None
**Worth it?** Almost always (extremely valuable)

### Synergy: Regeneration + Slow Digestion
**Result**: Fast healing with manageable hunger cost
**Strategy**: Ideal endgame combo

---

## 8. Strategic Decisions

### When to Eat?

**Safe Threshold**: Eat at ~300-400 hunger
- Avoids combat penalties
- Maintains regeneration capability

**Emergency Only**: Eat at <150 hunger
- Risky (combat penalties active)
- Wastes hunger capacity (can't refill past 2000)

### Risk vs Reward

**Explore Longer** (burn more hunger):
- More loot found
- Higher food consumption
- Risk running out

**Rush to Stairs** (conserve hunger):
- Less loot
- Conserve food
- Safer but poorer

---

## 9. Flavor Text

**30% Chance**: "This food tastes awful!"
- No mechanical difference
- Still restores hunger normally
- Flavor only (adds personality)

**Inspiration**: **Original Rogue** included flavor text for food consumption.

---

## Cross-References

- **[Character](./02-character.md)** - Health regeneration hunger gate (>100 units), Ring of Regeneration
- **[Items](./05-items.md)** - Food rations, Ring of Slow Digestion, Ring of Regeneration
- **[Combat](./09-combat.md)** - Weak state combat penalties

---

## Influences

- **Original Rogue (1980)**: Hunger system basics, food rations, states
- **NetHack**: Ring hunger modifiers (+30 nutrition for regeneration), precise hunger thresholds
- **Angband**: Regeneration food costs, hunger management as strategic resource
