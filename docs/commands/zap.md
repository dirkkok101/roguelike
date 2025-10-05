# Zap Wand Command

**Keybinding**: `z` + wand selection
**Consumes Turn**: Yes
**Implementation**: `src/commands/ZapWandCommand/ZapWandCommand.ts`

---

## Purpose

Uses a magical wand from inventory to cast powerful spells. Unlike scrolls, wands have **limited charges** and can be used multiple times.

---

## Behavior

### Input Mode
1. Player presses `z`
2. Inventory modal shows wands only
3. Prompt: "Zap which wand?"
4. Player selects wand
5. Wand effect activates
6. Wand charge decrements (-1)
7. If charges reach 0, wand becomes "empty" (cannot use)
8. Turn increments

### Charge System
- **Initial charges**: Random (3-10 charges when found)
- **Per use**: -1 charge
- **Empty wand**: Still in inventory but unusable (shows "empty")
- **No recharging**: Empty wands cannot be refilled (drop or keep for identification)

---

## Wand Types

### Offensive Wands
| Wand | Effect | Charges |
|------|--------|---------|
| **Lightning** | Damage in line (4d6) | 3-10 |
| **Fire** | Damage + burn effect (3d6) | 3-10 |
| **Cold** | Damage + slow effect (2d6) | 3-10 |
| **Death** | Instant kill (50% chance) | 1-3 |
| **Striking** | Direct damage (2d8) | 5-10 |

### Utility Wands
| Wand | Effect | Charges |
|------|--------|---------|
| **Slow Monster** | Reduce monster speed | 5-10 |
| **Haste Monster** | Increase monster speed (oops!) | 5-10 |
| **Polymorph** | Transform monster randomly | 3-8 |
| **Teleport** | Teleport monster away | 5-10 |
| **Invisibility** | Make self invisible | 3-8 |

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Not in inventory** | "You do not have that item." | No |
| **Not a wand** | "You cannot zap that." | No |
| **No charges** | "The wand has no charges left." | No |

---

## Turn Side Effects

**Only if wand has charges:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Wand Charges** | Decrements -1 |
| **Effect** | Applied immediately (damage, slow, etc.) |

---

## Services Used

- **InventoryService**: Find wand, update charges
- **WandService**: Wand effect application, charge management
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Identification System

**Unidentified Wands:**
- Wands start unidentified (shown as material: "an oak wand")
- Must zap or use Identify scroll to learn true type
- Once identified, all wands of that type become known

**Charge Mystery:**
- Cannot see charges until identified
- Empty wands reveal themselves when zapped (no effect message)

---

## Special Rules

1. **Limited Use**: Unlike scrolls, wands can be used multiple times (until empty)

2. **Charge Depletion**: Each use consumes 1 charge (no way to know remaining until identified)

3. **Empty Wands**: Still occupy inventory slot but cannot be used (consider dropping)

4. **No Recharging**: Once empty, wands are useless (no Recharge Wand scroll in this version)

5. **Identification Persistence**: Identified wands stay identified even when empty

6. **Target Selection**: Future feature - some wands require direction/monster target (not yet implemented)

---

## Code Flow

```
ZapWandCommand.execute()
├── Find item in inventory (by itemId)
│
├─ Item not found:
│   └── Message: "You do not have that item." (no turn)
│
├─ Item not a wand:
│   └── Message: "You cannot zap that." (no turn)
│
└─ Valid wand:
    ├── WandService.applyWand(player, wand, state, targetItemId)
    │   ├── Check charges
    │   │   └─ If charges = 0:
    │   │       └── Message: "The wand has no charges left." (no turn)
    │   │
    │   ├── Apply wand effect based on wandType
    │   │   ├─ LIGHTNING: Line damage 4d6
    │   │   ├─ FIRE: Area damage 3d6 + burn
    │   │   ├─ COLD: Damage 2d6 + slow
    │   │   ├─ TELEPORT: Teleport target away
    │   │   └─ ... (other wand types)
    │   │
    │   ├── Decrement charges (charges - 1)
    │   ├── Mark wand type as identified
    │   └── Return { player, wand, message }
    │
    ├── Update wand in inventory (remove old, add updated)
    ├── Add effect message to log
    └── Increment turn
```

---

## Examples

### Example 1: Zap Lightning Wand
```
Player with Wand of Lightning (5 charges, identified)
Monster nearby
Player presses: z → (selects Lightning Wand)
→ "You zap a Wand of Lightning."
→ "The bolt strikes the Orc for 18 damage!"
→ Orc killed
→ Wand charges: 5 → 4
→ Turn: 100 → 101
```

### Example 2: Zap Unknown Wand (Fire!)
```
Player with "an oak wand" (unidentified, 3 charges)
Player presses: z → (selects oak wand)
→ "You zap a Wand of Fire."
→ "Flames engulf the Zombie for 12 damage!"
→ Wand identified as "Fire"
→ Charges: 3 → 2
→ Turn: 100 → 101
```

### Example 3: Empty Wand
```
Player with Wand of Lightning (0 charges)
Player presses: z → (selects Lightning Wand)
→ "The wand has no charges left."
→ No turn consumed
→ (Should drop wand to free inventory slot)
```

### Example 4: Last Charge
```
Player with Wand of Death (1 charge)
Player presses: z → (selects Death Wand)
→ "You zap a Wand of Death."
→ "The Dragon dies instantly!" (lucky!)
→ Wand charges: 1 → 0 (now empty)
→ Turn: 100 → 101
```

---

## Tactical Use

**Offensive Wands:**
- **Lightning/Fire/Cold**: Use on tough monsters (Dragons, Trolls)
- **Death**: Save for bosses (low charges, high risk/reward)
- **Striking**: General purpose damage

**Utility Wands:**
- **Slow Monster**: Use on fast enemies (Kestrels, Bats)
- **Teleport**: Emergency escape (zap monster away)
- **Invisibility**: Sneak past monster groups

**When NOT to Zap:**
- Weak monsters (save charges for harder fights)
- Unknown wands at critical moments (could be Haste Monster!)
- Last charge unless desperate (wand becomes useless)

**Charge Management:**
- Identify wands ASAP (know charge count)
- Track uses (count down charges mentally)
- Drop empty wands (free inventory space)

---

## Wand vs Scroll

| Aspect | Wands | Scrolls |
|--------|-------|---------|
| **Uses** | Multiple (3-10 charges) | Single use |
| **Identification** | Oak, maple, etc. | Scroll titles |
| **Empty state** | Becomes useless | N/A (consumed) |
| **Power** | Combat-focused | Utility-focused |
| **Rarity** | Rare | Common |

---

## Wand Management

**Priority Ranking** (keep these):
1. Lightning/Fire (high damage, multi-use)
2. Death (instant kill, save for bosses)
3. Teleport (emergency escape)
4. Slow Monster (crowd control)

**Drop These:**
- Empty wands (no charges left)
- Haste Monster (helps enemies!)
- Duplicate wands (keep best)

**Identification Priority:**
1. Use Identify scroll on unknown wands (safe)
2. If desperate, zap in safe area (risky but identifies)

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up wands
- [Drop](./drop.md) - Drop empty wands
- [Read](./read.md) - Use Identify scroll on wands

---

**Architecture**: Command orchestrates InventoryService (find/update wand), WandService (effect application, charge management), MessageService (messages), TurnService (turn increment). All wand effect logic lives in WandService. Charge updates handled by removing old wand and adding updated one (immutability pattern).
