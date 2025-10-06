# Items

**Version**: 2.1
**Last Updated**: 2025-10-06
**Related Docs**: [Light Sources](./06-light-sources.md) | [Identification](./07-identification.md) | [Hunger](./08-hunger.md) | [Character](./02-character.md)

---

## 1. Item Categories

### Food (`%`)
**Food Rations**:
- **Restores**: 1100-1499 hunger units (randomized)
- **Flavor text**: 30% chance "tastes awful" (still works)
- **Strategy**: Essential for survival, ration carefully

### Weapons (`)`)
**Types**: Mace, Long Sword, Two-handed Sword, etc.

**Properties**:
- **Damage dice** (e.g., Mace = 2d4, Long Sword = 1d12, Two-handed Sword = 3d6)
- **Enchantment**: +1, +2, +3 (to-hit and damage bonuses)
- **Commands**: `w` to wield

**Examples**:
- Mace: 2d4 damage
- Long Sword: 1d12 damage
- Two-handed Sword: 3d6 damage

### Armor (`[`)
**Types**: Leather, Studded Leather, Ring Mail, Chain Mail, Banded Mail, Splint Mail, Plate Mail

**Properties**:
- **Armor Class (AC)** value (lower = better protection)
- **Enchantment**: +1, +2, +3 (improves AC by same amount)
- **Vulnerability**: Rust attacks (Aquator reduces enchantment)
- **Commands**: `W` to wear, `T` to take off

**AC Values**:
- Leather: [8]
- Studded Leather / Ring Mail: [7]
- Chain Mail: [5]
- Banded Mail / Splint Mail: [4]
- Plate Mail: [3]

**Example**: Plate Mail +1 = AC 2 (3 - 1)

### Potions (`!`)
**Nature**: Single-use consumables

**Identification**: **Unidentified** at start (see [Identification](./07-identification.md))
- Appear with random descriptors: "blue potion", "fizzy potion", "dark potion"
- Auto-identified when consumed (learn what blue potion does)
- Same descriptor = same effect throughout game session

**Commands**: `q` to quaff (drink)

---

#### Healing Potions

**Potion of Healing** (Common):
- **Effect**: Restores 1d8 HP
- **Overheal**: If at full HP, grants +1 max HP permanently
- **Message**: "You feel better. (+X HP)"
- **Strategy**: Save for emergencies or use at full HP for stat boost

**Potion of Extra Healing** (Uncommon):
- **Effect**: Restores 2d8+2 HP (3-18 HP)
- **Overheal**: If at full HP, grants +1 max HP permanently
- **Message**: "You feel much better! (+X HP)"
- **Strategy**: Best healing option, use in dire situations

**See**: [Character](./02-character.md) for overheal mechanics (+1 max HP).

---

#### Strength Potions

**Potion of Gain Strength** (Uncommon):
- **Effect**: Permanently increases strength and max strength by 1
- **Message**: "You feel stronger! (Strength: X)"
- **Strategy**: Always beneficial, use immediately when identified

**Potion of Restore Strength** (Common):
- **Effect**: Restores current strength to maximum
- **Use Case**: Counter Rattlesnake drain attacks, curse effects
- **Message**: "Your strength is restored. (Strength: X)"
- **Note**: No effect if strength already at max

---

#### Detection Potions

**Potion of Detect Monsters** (Uncommon):
- **Effect**: Reveals all monsters on current level
- **Duration**: Until level change (stairs)
- **Message**: "You sense X monsters" (or "strange feeling" if none)
- **Strategy**: Scout dangerous levels before exploring

**Potion of Detect Magic** (Uncommon):
- **Effect**: Highlights all magic items (potions, scrolls, rings, wands) on level
- **Duration**: Until level change
- **Message**: "You sense magic" (or "strange feeling" if none)
- **Strategy**: Find valuable loot efficiently

---

#### Buff Potions

**Potion of Haste Self** (Uncommon):
- **Effect**: Grants 2 actions per turn (double speed)
- **Duration**: 4-8 turns
- **Message**: "You feel yourself moving much faster"
- **Strategy**: Combat advantage, escape dangerous situations
- **Note**: Both actions occur before monsters act

**Potion of Levitation** (Uncommon):
- **Effect**: Float over traps (immune to all trap damage)
- **Duration**: 29-32 turns
- **Message**: "You start to float in the air"
- **Strategy**: Navigate trapped corridors safely

**Potion of See Invisible** (Uncommon):
- **Effect**: Reveals invisible monsters (Phantoms)
- **Duration**: Until level change
- **Message**: "This potion tastes like slime mold juice"
- **Strategy**: Essential for Phantom-heavy levels

---

#### Debuff Potions (Curses)

**Potion of Poison** (Common):
- **Effect**: Deals 1d6 HP damage (can kill!)
- **Message**: "You feel sick! (-X HP)"
- **Danger**: Check HP before drinking unidentified potions
- **Death**: If HP reaches 0, game over

**Potion of Confusion** (Uncommon):
- **Effect**: Random movement direction for 19-21 turns
- **Message**: "Wait, what's going on here. Huh? What? Who?"
- **Danger**: Cannot control movement, may walk into monsters/traps
- **Duration**: ~2 minutes of gameplay

**Potion of Blindness** (Uncommon):
- **Effect**: Cannot see anything (FOV = 0) for 40-60 turns
- **Message**: "Oh, bummer! Everything is dark! Help!"
- **Danger**: Screen goes black, must navigate by memory
- **Duration**: ~4-6 minutes of gameplay (reduced from original 807-892 turns)

---

#### Special Potions

**Potion of Raise Level** (Rare):
- **Effect**: Instantly gain 1 experience level
- **Benefits**: Increased max HP, improved combat effectiveness
- **Message**: Level up notification
- **Strategy**: Extremely valuable, can turn tide in tough situations

---

**Total Potion Types**: 11 core potions ✅ **All Implemented**

**Implementation Status**:
- ✅ **Phase 1**: Healing, Extra Healing, Gain Strength, Restore Strength, Poison
- ✅ **Phase 2**: Raise Level, Detect Monsters, Detect Magic
- ✅ **Phase 3**: Confusion, Blindness, Haste Self
- ✅ **Phase 4**: Levitation, See Invisible

**Test Coverage**: 159/159 test suites passing (100%), 1732/1732 tests (100%)

**See**: [Potion Implementation Plan](../plans/potion_implementation_plan.md) for complete design documentation.

### Scrolls (`?`)
**Nature**: Single-use magic items

**Identification**: **Unidentified** at start (e.g., "scroll labeled XYZZY")

**Key Types**:
- **Identify**: Reveals true nature of item
- **Enchant Weapon**: +1 to-hit and damage
- **Enchant Armor**: Improves AC by 1
- **Magic Mapping**: Reveals entire level layout
- **Teleportation**: Random relocation on level
- **Remove Curse**: Frees cursed equipment

**Commands**: `r` to read

### Rings (`=`)
**Nature**: Worn on finger (up to 2 simultaneously)

**Identification**: **Unidentified** at start (e.g., "ruby ring", "wooden ring")

**Hunger Effect**: Most rings **increase hunger rate** (except Slow Digestion)

**Key Types**:

| Ring | Effect | Hunger Modifier |
|------|--------|-----------------|
| **Regeneration** | 1 HP per 5 turns (doubles rate) | **+30%** hunger consumption |
| **Slow Digestion** | Reduces hunger rate | **-50%** hunger consumption |
| **Protection** | Improves AC | +hunger |
| **Add Strength** | Increases strength stat | +hunger |
| **Sustain Strength** | Prevents strength drain | +hunger |
| **Searching** | Auto-detect traps/doors | +hunger |
| **See Invisible** | Reveals invisible monsters | +hunger |
| **Dexterity** | Improves AC and to-hit | +hunger |

**Commands**: `P` to put on, `R` to remove

**Strategy**: Balance benefits vs hunger cost

**Inspiration**:
- **Original Rogue**: Ring system, hunger penalties
- **NetHack**: Ring of Regeneration +30 nutrition cost

**See**: [Hunger](./08-hunger.md) for detailed hunger mechanics.

### Wands/Staffs (`/`)
**Nature**: Limited charges (e.g., 3-7 uses)

**Identification**: **Unidentified** at start

**Key Types**:
- **Lightning**: Ranged electric damage
- **Fire**: Ranged fire damage
- **Cold**: Ranged cold damage
- **Magic Missile**: Reliable ranged damage
- **Sleep**: Puts monsters to sleep
- **Haste Monster**: Makes monster faster (dangerous!)
- **Slow Monster**: Makes monster slower (tactical)
- **Polymorph**: Changes monster type randomly

**Commands**: `z` to zap

**Note**: Targeting system (Phase 5+ implementation)

### Gold (`$`)
**Purpose**: Score component, collected throughout dungeon

**Properties**:
- Adds to final score
- Can be stolen by Leprechauns
- Attracts Orcs (GREEDY AI)

**Commands**: `,` to pick up (auto-collect)

### Amulet of Yendor (`&`)
**Location**: Found on Level 10

**Purpose**: **Win condition** - must return to surface with it

**Properties**:
- Cannot be dropped once picked up
- Weighs nothing
- Glows with mystical light

---

## 2. Equipment System

### Weapon Slot
- **Current**: Wielded weapon (affects damage)
- **Default**: Bare hands (minimal damage)
- **Change**: `w` command

### Armor Slot
- **Current**: Worn armor (affects AC)
- **Default**: None (AC 10)
- **Change**: `W` to wear, `T` to take off

### Ring Slots (2)
- **Left Ring**: First ring equipped
- **Right Ring**: Second ring equipped
- **Both active** simultaneously
- **Hunger stacks**: Wearing 2 hunger rings doubles penalty
- **Change**: `P` to put on, `R` to remove

### Light Source Slot
- **Current**: Equipped torch, lantern, or artifact
- **Default**: None (vision radius 0 - darkness!)
- **See**: [Light Sources](./06-light-sources.md) for complete mechanics

---

## 3. Inventory Management

### Capacity
- **26 item slots** (a-z letter assignments)
- **Weight limit** based on strength
- **Over-encumbered**: Movement penalties (Phase 4+)

### Commands
- `i` - View inventory
- `d` - Drop item
- `,` - Pick up item at current position

### Item Stacking
- **Gold**: Stacks automatically
- **Food, potions, scrolls**: Each occupies one slot
- **Light sources**: Multiple torches/oil flasks stack

---

## 4. Item Discovery

### Finding Items
- **Floor spawns**: Randomly placed in rooms and corridors
- **Monster drops**: Some monsters drop equipment on death
- **Treasure rooms**: Higher concentration (rare)

### Identification
- Items start **unidentified** (potions, scrolls, rings, wands)
- **Revelation methods**:
  1. Use the item (risky!)
  2. Scroll of Identify
  3. Trial and error across games

**See**: [Identification](./07-identification.md) for complete system.

---

## 5. Enchantment & Curses

### Enchanted Items
**Positive Enchantments** (+1, +2, +3):
- Weapons: Bonus to-hit and damage
- Armor: Improves AC by enchantment value
- Rings: Enhanced effects

**Finding**: Random spawns, Enchant scrolls

### Cursed Items
**Negative Enchantments** (-1, -2, -3):
- Weapons: Penalty to-hit and damage
- Armor: Worsens AC
- **Cannot remove** without Scroll of Remove Curse

**Identification**: Often appear as unidentified or neutral until worn

---

## Cross-References

- **[Light Sources](./06-light-sources.md)** - Torches, lanterns, artifacts (critical system)
- **[Identification](./07-identification.md)** - Unidentified item discovery
- **[Hunger](./08-hunger.md)** - Ring hunger modifiers, food mechanics
- **[Character](./02-character.md)** - Equipment slots, regeneration (rings), overheal
- **[Combat](./09-combat.md)** - Weapon damage, armor AC
- **[Monsters](./04-monsters.md)** - Item drops, special attacks (rust)

---

## Influences

- **Original Rogue (1980)**: All item categories, enchantment system, identification mystery
- **NetHack**: Ring hunger penalties (+30 nutrition for regeneration), enhanced ring variety
- **Angband**: Light source variety (torches, lanterns, artifacts)
