# Identification System

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Items](./05-items.md)

---

## 1. Overview

**Purpose**: Mimic the mystery and discovery of the original Rogue - players must learn item effects through experimentation or identification scrolls.

**Inspiration**: **Original Rogue (1980)** - Established the unidentified item system as a core roguelike mechanic, creating tension through uncertainty.

---

## 2. Unidentified Items

### Which Items Start Unidentified?

**Unidentified Categories**:
- **Potions** (`!`) - Unknown liquid effects
- **Scrolls** (`?`) - Unknown magical text
- **Rings** (`=`) - Unknown passive effects
- **Wands/Staffs** (`/`) - Unknown magical charges

**Identified Categories** (always known):
- Weapons (`)`) - Visible damage dice
- Armor (`[`) - Visible AC value
- Food (`%`) - Obvious food rations
- Gold (`$`) - Currency
- Light sources (`~`, `(`) - Torch, lantern, artifacts
- Amulet (`&`) - Unmistakable Amulet of Yendor

---

## 3. Random Descriptive Names

### Per-Playthrough Randomization

**Each game instance generates random descriptive names for unidentified items**

**Why?** Knowledge from previous games doesn't carry over - creates fresh discovery each playthrough.

**Example**: "blue potion" might be Healing in one game, Poison in another.

---

## 4. Descriptive Name Examples

### Potions

**Color-based**:
- "blue potion"
- "red potion"
- "green potion"
- "yellow potion"
- "clear potion"

**Appearance-based**:
- "fizzy potion"
- "dark potion"
- "cloudy potion"
- "glowing potion"
- "bubbling potion"

---

### Scrolls

**Label-based** (nonsense words):
- "scroll labeled XYZZY"
- "scroll labeled ELBERETH"
- "scroll labeled NR 9"
- "scroll labeled FOOBAR"
- "scroll labeled HACKEM MUCHE"

**Inspiration**: **Original Rogue** used random label generation for scrolls.

---

### Rings

**Material-based**:
- "ruby ring"
- "sapphire ring"
- "emerald ring"
- "diamond ring"
- "iron ring"
- "wooden ring"
- "ivory ring"
- "copper ring"

---

### Wands/Staffs

**Wood type or material**:
- "oak wand"
- "pine staff"
- "metal wand"
- "crystal wand"
- "bone staff"

---

## 5. Identification Methods

### Method 1: Use the Item (Risky!)

**How**: Drink potion, read scroll, wear ring, zap wand

**Risk**: Unknown effects could be harmful
- **Potion of Poison**: Reduces strength
- **Scroll of Teleportation**: Random relocation (dangerous in combat)
- **Cursed Ring**: Cannot remove without Remove Curse scroll
- **Wand of Haste Monster**: Makes enemy faster (very bad!)

**Reward**: Learn effect immediately, item identified

**Strategy**: Use in safe situations (full HP, no monsters nearby)

---

### Method 2: Scroll of Identify

**How**: Read Scroll of Identify, select item to identify

**Risk**: None (safe identification)

**Cost**: Consumes scroll (finite resource)

**Strategy**: Save for valuable/dangerous items (rings, unknown potions when low HP)

---

### Method 3: Trial and Error Across Games

**How**: Test items in expendable runs, build knowledge base

**Risk**: Death is learning tool (permadeath roguelike tradition)

**Reward**: Eventual mastery through experience

**Note**: Descriptive names randomized per game, so this helps learn item *types*, not specific descriptors.

---

## 6. Persistence Within Game

**Once an item type is identified, all similar items are revealed**

**Example**:
1. Drink "blue potion", discover it's Healing
2. All other "blue potions" in THIS game now show as "Potion of Healing"
3. Next playthrough: "blue potion" might be something else entirely

**Applies to**: All unidentified categories (potions, scrolls, rings, wands)

---

## 7. Strategic Decisions

### What to Identify First?

**High Priority**:
- **Rings** (might be cursed, affects hunger rate)
- **Unknown potions when low HP** (could be poison)
- **Wands** (some wands dangerous to player)

**Low Priority**:
- **Scrolls** (mostly non-harmful, can test freely)
- **Potions when safe** (full HP, no threats)

---

### When to Risk Using Unidentified Items?

**Safe to Risk**:
- Full HP (can survive poison)
- No monsters nearby (can handle teleportation)
- Abundant healing potions (can recover from bad effects)

**Avoid Risking**:
- Low HP (poison could kill)
- Mid-combat (confusion/teleport deadly)
- Critical equipment slot (cursed ring can't be removed)

---

## 8. Mystery & Discovery

**Design Goal**: Create "aha!" moments of discovery

**Player Experience**:
- **Tension**: "Is this potion helpful or harmful?"
- **Experimentation**: "Let me try this in a safe area..."
- **Learning**: "Ah, fizzy potions are Confusion in this game!"
- **Mastery**: "I've identified all potion types this run!"

**Roguelike Tradition**: Uncertainty creates memorable stories ("I drank a poison potion at 2 HP and died!")

---

## Cross-References

- **[Items](./05-items.md)** - Complete item catalog with effects
- **[Character](./02-character.md)** - Effects of potions/rings on stats

---

## Influences

- **Original Rogue (1980)**: Unidentified item system, random descriptive names, Scroll of Identify
- **NetHack**: Enhanced identification system, wider variety of descriptors
- **Angband**: Expanded item knowledge progression
