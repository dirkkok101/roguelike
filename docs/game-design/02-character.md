# Character

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Hunger](./08-hunger.md) | [Combat](./09-combat.md) | [Items](./05-items.md) | [Light Sources](./06-light-sources.md)

---

## 1. Character Class

**Class**: Fighter (single class for v1)

**Role**: Melee combatant with balanced stats and equipment focus

---

## 2. Core Stats

### Hit Points (HP)
- **Current/Maximum** health
- **Death** occurs at 0 HP (permanent)
- **Regeneration**: 1 HP per 10 turns (see Health Regeneration below)
- **Increase**: Level up, healing potions (overheal grants +1 max HP)

### Strength (Str)
- **Current/Maximum** (e.g., 16/16)
- **Affects**: Damage bonus, carry capacity
- **Decrease**: Monster attacks (Rattlesnake), curses
- **Restore**: Potion of Restore Strength, Potion of Gain Strength

### Armor Class (AC)
- **Lower is better** (defensive stat)
- **Base**: 10 (unarmored)
- **Improved by**: Wearing armor, enchanted armor
- **Example**: Plate Mail = AC 3, +1 enchantment = AC 2

### Level (XL)
- **Character progression** level
- **Gain XP** from defeating monsters
- **Level up** increases max HP and effectiveness

### Experience Points (XP)
- **Points toward next level**
- **Gained** by killing monsters
- **Lost** by Wraith attacks (level drain)

### Gold
- **Currency** collected from dungeon
- **Score component** at game end
- **Can be stolen** by Leprechauns

---

## 3. Health Regeneration

**Inspiration**: Original Rogue (1980) allowed natural recovery for tactical "hit-and-run" gameplay. NetHack and Angband refined this with turn-based formulas and resource tradeoffs.

### Natural Regeneration

**Base Rate**: 1 HP per 10 turns

**Requirements**:
- **Hunger > 100** (not starving)
- **No enemy in field of view** (not in combat)

**How It Works**:
- Every 10 turns, gain 1 HP (if conditions met)
- Stops at max HP (no overheal)
- Automatic (no player action required)

**Strategy**: Retreat from combat, break line of sight, let natural healing occur before re-engaging.

### Ring of Regeneration

**Effect**: Doubles regeneration rate to **1 HP per 5 turns**

**Cost**: **+30% hunger consumption rate**

**Acquisition**: Rare ring drop (2-3% spawn rate)

**Tradeoff**: Faster healing vs increased food consumption

**Synergy**: Combine with **Ring of Slow Digestion** to offset hunger penalty

**Inspiration**: NetHack's Ring of Regeneration (+30 nutrition cost) and Angband's regeneration mechanics.

### Rest Command

**Keys**: `5` (numpad) or `.` (period)

**Behavior**: Skip turns until HP is full or interrupted

**Interrupts**:
- Enemy appears in field of view
- Hunger reaches 0 (starving)
- HP reaches max

**UI Feedback**:
- "Resting..." (start)
- "Rested for X turns. (HP: Y/Z)" (complete)
- "You are interrupted!" or "You are starving!" (interrupt)

**Purpose**: Convenience (no need to manually wait), not faster than natural waiting

---

## 4. Healing Sources

### Natural Regeneration
- **Rate**: 1 HP per 10 turns (5 with ring)
- **Cost**: Free (hunger-gated)
- **Use case**: Between combats, safe areas

### Healing Potions
- **Potion of Healing**: 1d8 HP
- **Potion of Extra Healing**: 2d8 HP
- **Cost**: Consumes potion (finite resource)
- **Use case**: Emergency healing, mid-combat

### Max HP Increase (Overheal)
**Inspiration**: Original Rogue (1980) granted +1 max HP when healing at full HP.

**Mechanic**:
- Drink healing potion at full HP
- Overheal amount grants **+1 max HP** permanently
- Heal to new maximum
- Message: "You feel permanently stronger! (Max HP +1)"

**Strategy**: Save potions for strategic max HP increases rather than emergency healing.

### Rest Command
- **Rate**: 1 HP per 10 turns (same as natural)
- **Cost**: Time (hunger depletes)
- **Use case**: Convenience (auto-wait until healed)

---

## 5. Progression

### Leveling Up
- **Gain XP** from defeating monsters
- **Level up** when XP threshold reached
- **Benefits**:
  - Increase max HP
  - Improve stats
  - Better hit chance and damage

### Equipment Upgrades
- **Find** better weapons and armor in dungeon
- **Enchant** equipment with scrolls (+1, +2, +3)
- **Replace** starting gear with superior items

### Light Source Progression
- **Early game (Levels 1-3)**: Manage torches carefully
- **Mid game (Levels 4-7)**: Find lantern, collect oil flasks
- **Late game (Levels 8-10)**: Discover permanent artifact lights

---

## 6. Permadeath

**Inspiration**: Original Rogue (1980) established permadeath as core roguelike principle.

### Death Mechanics

**When HP reaches 0**:
- Game over (no continues, no respawns)
- Death screen displays stats summary
- **Save file deleted** (no second chances)

**No Save Scumming**:
- Save overwritten each turn
- Cannot reload earlier state
- Death is permanent and final

**Purpose**:
- Creates stakes and tension
- Makes victories meaningful
- Encourages careful play
- Teaches through failure

### Save System
- **Manual save**: Press `S` key
- **Auto-save on quit**: Press `Q` key
- **Auto-save every 10 turns**: Background persistence
- **On death**: Save deleted (no resurrection)

---

## 7. Starting Equipment

**Character begins with**:

**Option A** (50% chance):
- 1 lit torch (equipped)
- 2 unlit torches (inventory)

**Option B** (50% chance):
- 1 lantern (equipped)
- 2 oil flasks (inventory)

**Plus**:
- Basic weapon (e.g., Mace 2d4)
- Leather armor (AC 8)
- 2-3 food rations
- Starting gold (10-50)

---

## 8. Victory & Mastery

### Win Condition
**Return to Level 1 with Amulet of Yendor**

### Challenge Modes (Optional)
- **Low-level victory**: Win at Level 5 or below
- **Pacifist run**: Avoid unnecessary combat
- **No-healing run**: Victory without healing potions
- **Artifact hunter**: Find all 3 permanent light sources

---

## Cross-References

- **[Hunger](./08-hunger.md)** - Regeneration hunger gate, ring modifiers
- **[Combat](./09-combat.md)** - HP damage, combat formulas
- **[Items](./05-items.md)** - Ring of Regeneration, healing potions
- **[Light Sources](./06-light-sources.md)** - Starting equipment, progression
- **[Controls](./10-controls.md)** - Rest command (5, .)
- **[Save System](./12-save-system.md)** - Permadeath implementation

---

## Influences

- **Original Rogue (1980)**: Natural regeneration for tactical play, overheal +1 max HP, permadeath
- **NetHack**: Turn-based regeneration formulas, ring hunger penalties (+30 nutrition)
- **Angband**: Ring of Regeneration mechanics, regeneration food costs
