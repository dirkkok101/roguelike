# Scroll Effects Quick Reference

**Version**: 1.0
**Last Updated**: 2025-10-06
**Related**: [Items](./05-items.md) | [ScrollService](../services/ScrollService.md) | [Scroll Plan](../plans/scroll_implementation_plan.md)

---

## Quick Lookup Table

| Scroll | Target | Effect | Duration | Risk | Fizzle Condition |
|--------|--------|--------|----------|------|------------------|
| **Identify** | Item | Reveal item type | Permanent | None | No target item |
| **Enchant Weapon** | Weapon | +1 bonus (max +3) | Permanent | None | Already at +3 |
| **Enchant Armor** | Armor | +1 AC bonus (max +3) | Permanent | None | Already at +3 |
| **Teleportation** | None | Random teleport | Instant | Medium | No walkable tiles |
| **Create Monster** | None | Spawn adjacent monster | Instant | High | No adjacent space |
| **Magic Mapping** | None | Reveal map layout | Permanent | None | Never fizzles |
| **Light** | None | Illuminate room | Permanent | None | Not in room (corridor) |
| **Hold Monster** | Adjacent | Freeze monster | 3-6 turns | None | No adjacent monster |
| **Sleep** | None | Player sleeps (cursed!) | 4-8 turns | **Very High** | Never fizzles |
| **Remove Curse** | None | Uncurse all equipment | Permanent | None | No cursed items |
| **Scare Monster** | None | Drop scroll, monsters flee | 100 turns | None | Never fizzles |

---

## By Use Case

### Combat
- **Hold Monster** - Lock down dangerous enemy before attack (3-6 turns)
- **Scare Monster** - Create safe zone, block corridor (100 turn duration)
- **Teleportation** - Emergency escape from overwhelming threats

### Equipment Enhancement
- **Enchant Weapon** - +1 to-hit and damage (cap at +3)
- **Enchant Armor** - Improve AC by 1 (cap at +3)
- **Remove Curse** - Free cursed equipment

### Exploration
- **Magic Mapping** - Reveal entire level layout (walls, doors, stairs)
- **Light** - Illuminate entire room instantly
- **Identify** - Reveal true nature of unknown items

### Cursed (Dangerous)
- **Sleep** - Self-curse: defenseless for 4-8 turns
- **Create Monster** - Spawn enemy adjacent to player

---

## Risk Categories

### Safe (Green)
✅ **No Risk** - Always beneficial or neutral
- Identify
- Enchant Weapon
- Enchant Armor
- Magic Mapping
- Light (may fizzle, but no harm)
- Remove Curse (may fizzle, but no harm)

### Risky (Yellow)
⚠️ **Situational Risk** - Can backfire in wrong situation
- Teleportation (unpredictable destination)
- Hold Monster (wasted if no monster nearby)

### Dangerous (Red)
🔴 **High Risk** - Direct threat to player
- Sleep (defenseless for 4-8 turns - monsters continue acting!)
- Create Monster (spawns immediate threat)

---

## Targeting Requirements

### Requires Item Selection
- **Identify** → Any item
- **Enchant Weapon** → Any weapon in inventory
- **Enchant Armor** → Any armor in inventory

### Requires Monster Target
- **Hold Monster** → Must select adjacent monster

### No Target Needed
- Teleportation
- Create Monster
- Magic Mapping
- Light
- Sleep
- Remove Curse
- Scare Monster

---

## Consumption Behavior

### Consumed on Read (10 scrolls)
All scrolls are removed from inventory after reading **except**:

### NOT Consumed (1 scroll)
- **Scare Monster** - Must be dropped on ground to take effect
  - Returns `consumed: false` from ScrollService
  - DropCommand places scroll at player position
  - Tracks `droppedAtTurn` for deterioration

---

## Fizzle Mechanics

**Fizzle** = Scroll fails to work (no effect, returns to inventory, no turn consumed)

### Fizzle Conditions

| Scroll | Fizzles When |
|--------|--------------|
| **Identify** | No target item provided |
| **Enchant Weapon** | Weapon already at +3 enchantment |
| **Enchant Armor** | Armor already at +3 enchantment |
| **Teleportation** | No walkable tiles on level (extremely rare) |
| **Create Monster** | No adjacent empty space (surrounded) |
| **Light** | Player in corridor (not room) |
| **Hold Monster** | No adjacent monster |
| **Remove Curse** | No cursed items equipped |

### Never Fizzle
- Magic Mapping (always reveals map)
- Sleep (always curses player)
- Scare Monster (always activates)

---

## Message Reference

### Success Messages

| Scroll | Message |
|--------|---------|
| **Identify** | "This is [item name]!" |
| **Enchant Weapon** | "[Weapon] glows brightly! (+[bonus])" |
| **Enchant Armor** | "[Armor] glows with protection! [AC X]" |
| **Teleportation** | "You feel a wrenching sensation!" |
| **Create Monster** | "You hear a faint cry of anguish!" |
| **Magic Mapping** | "The dungeon layout is revealed!" |
| **Light** | "The room floods with light!" |
| **Hold Monster** | "The [monster] freezes in place!" |
| **Sleep** | "You fall into a deep sleep!" |
| **Remove Curse** | "You feel as if somebody is watching over you. Your equipment glows briefly." |
| **Scare Monster** | "You hear a loud roar and the scroll glows with an ominous light! You should drop this on the ground." |

### Fizzle Messages

| Scroll | Fizzle Message |
|--------|----------------|
| **Identify** | "You read [scroll], but nothing happens." (no target) |
| **Enchant Weapon** | "[Weapon] is already at maximum enchantment!" |
| **Enchant Armor** | "[Armor] is already at maximum enchantment!" |
| **Teleportation** | "You read [scroll], but nothing happens." (no tiles) |
| **Create Monster** | "You read [scroll], but nothing happens." (no space) |
| **Light** | "You read [scroll], but you're in a corridor." |
| **Hold Monster** | "You read [scroll], but nothing happens." (no monster) |
| **Remove Curse** | "You read [scroll], but nothing happens." (no cursed items) |

---

## Strategic Tips

### Early Game (Levels 1-3)
1. **Identify unknown items** first (rings, wands most valuable)
2. **Hold unidentified scrolls** until you find good equipment
3. **Don't waste enchantment scrolls** on weak starting gear
4. **Be cautious** reading scrolls in dangerous areas (Sleep risk!)

### Mid Game (Levels 4-7)
1. **Enchant your best weapon** first (usually Two-handed Sword or Long Sword)
2. **Enchant heavy armor** (Plate Mail, Splint Mail)
3. **Use Magic Mapping** on large/confusing levels
4. **Save Teleportation scrolls** for emergency escapes

### Late Game (Levels 8-10)
1. **Maximize equipment** to +3 bonus
2. **Keep Remove Curse** scrolls (high curse rate in deep dungeon)
3. **Use Scare Monster** tactically to create safe zones
4. **Hold Monster** powerful enemies (Dragons, Trolls)

### Survival Tips
- **Never read unidentified scrolls** when:
  - Low on HP (Sleep/Create Monster could be fatal)
  - Surrounded by monsters (Create Monster = death)
  - In trap-heavy area (Sleep + traps = bad time)
- **Always have escape options**:
  - Keep 1-2 Teleportation scrolls
  - Know where stairs are (Magic Mapping helps)
- **Scare Monster is reusable** - place strategically!

---

## Technical Implementation

### ScrollEffectResult Type

```typescript
interface ScrollEffectResult {
  player?: Player      // Updated player state (enchantment, status effects, position)
  state?: GameState    // Updated game state (level modifications)
  message: string      // User-facing message
  identified: boolean  // Was scroll previously unidentified?
  fizzled?: boolean    // Did scroll fail? (no effect, no turn consumed)
  consumed: boolean    // Remove scroll from inventory? (false for SCARE_MONSTER)
}
```

### State Modification Patterns

| Pattern | Scrolls |
|---------|---------|
| **Player Only** | SLEEP (status effect), Enchant Weapon/Armor (inventory) |
| **State Only** | MAGIC_MAPPING (level exploration), CREATE_MONSTER (level monsters) |
| **Both** | TELEPORTATION (player position + FOV update), LIGHT (level explored + FOV) |
| **Neither** | IDENTIFY (identification state only) |

---

## Cross-References

- **[Items Documentation](./05-items.md)** - Complete item system (potions, weapons, armor)
- **[ScrollService](../services/ScrollService.md)** - Detailed algorithms and edge cases
- **[Scroll Implementation Plan](../plans/scroll_implementation_plan.md)** - Development history
- **[Identification System](./07-identification.md)** - How scroll names are revealed

---

## Version History

- **1.0** (2025-10-06) - Initial quick reference created
  - All 11 scroll types documented
  - Use cases and risk categories
  - Strategic tips for each game phase
  - Technical implementation reference
