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
5. **Targeting modal appears** (NEW)
6. Player selects target monster (Tab/Shift+Tab to cycle, * for nearest)
7. Player confirms target (Enter) or cancels (ESC)
8. Wand effect activates on selected target
9. Wand charge decrements (-1)
10. If charges reach 0, wand becomes "empty" (cannot use)
11. Turn increments

### Charge System
- **Initial charges**: Random (3-10 charges when found)
- **Per use**: -1 charge
- **Empty wand**: Still in inventory but unusable (shows "empty")
- **No recharging**: Empty wands cannot be refilled (drop or keep for identification)

---

## Targeting System

### Overview
All wands now require targeting a monster before use. The targeting system provides:
- **Visual Feedback**: Shows selected target with stats (HP, distance)
- **Smart Defaults**: Auto-selects nearest valid monster
- **Keyboard Navigation**: Tab/Shift+Tab to cycle, * for nearest
- **Validation**: Range and line-of-sight checks before execution

### Controls
| Key | Action |
|-----|--------|
| **Tab** | Cycle to next target |
| **Shift+Tab** | Cycle to previous target |
| **\*** | Select nearest valid target |
| **Enter** | Confirm target and zap |
| **ESC** | Cancel targeting |

### Targeting Rules
1. **Line of Sight**: Monster must be visible (in FOV)
2. **Range Limit**: Distance ≤ wand range (varies by wand type)
3. **Existence**: Monster must still be alive
4. **Valid Target**: Must pass all validation checks

### Range by Wand Type
| Wand Type | Range (tiles) | Category |
|-----------|---------------|----------|
| Lightning, Fire, Cold | 8 | Long range beam |
| Magic Missile, Teleport Away | 7 | Standard attack |
| Sleep, Slow Monster, Cancellation | 6 | Moderate utility |
| Haste Monster, Polymorph | 5 | Close range utility |

**Distance Calculation**: Manhattan distance (|x2-x1| + |y2-y1|)

### Targeting Validation
The command performs multiple validation checks:

```
1. Target exists? → "Target no longer exists."
2. Target visible? → "Target no longer visible."
3. Target in range? → "Target out of range. (Range: X)"
4. Wand has charges? → "The wand has no charges left."
```

**Defense in depth**: Validation occurs at UI, command, and service layers.

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
| **No target selected** | "No target selected." | No |
| **Target doesn't exist** | "Target no longer exists." | No |
| **Target not visible** | "Target no longer visible." | No |
| **Target out of range** | "Target out of range. (Range: X)" | No |
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
- **TargetingService**: Target validation, range checks, LOS validation (NEW)
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

6. **Target Selection**: All wands require targeting a visible monster within range (NEW)

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
    ├── Validate target monster ID provided (NEW)
    │   └─ If not provided:
    │       └── Message: "No target selected." (no turn)
    │
    ├── Validate target exists in current level (NEW)
    │   └─ If not found:
    │       └── Message: "Target no longer exists." (no turn)
    │
    ├── Validate target in FOV (line of sight) (NEW)
    │   └─ If not visible:
    │       └── Message: "Target no longer visible." (no turn)
    │
    ├── Validate target in range (Manhattan distance) (NEW)
    │   └─ If distance > wand.range:
    │       └── Message: "Target out of range. (Range: X)" (no turn)
    │
    ├── WandService.applyWand(player, wand, state, targetMonsterId)
    │   ├── Check charges
    │   │   └─ If charges = 0:
    │   │       └── Message: "The wand has no charges left." (no turn)
    │   │
    │   ├── Apply wand effect based on wandType
    │   │   ├─ LIGHTNING: Beam damage 6d6 (range 8)
    │   │   ├─ FIRE: Beam damage 6d6 (range 8)
    │   │   ├─ COLD: Beam damage 6d6 (range 8)
    │   │   ├─ MAGIC_MISSILE: Direct damage 2d6 (range 7)
    │   │   ├─ TELEPORT_AWAY: Teleport target away (range 7)
    │   │   └─ ... (other wand types)
    │   │
    │   ├── Decrement charges (charges - 1)
    │   ├── Mark wand type as identified
    │   └── Return { player, wand, message, state }
    │
    ├── Update wand in inventory (remove old, add updated)
    ├── Add effect message to log
    └── Increment turn
```

---

## Examples

### Example 1: Targeting and Zapping (NEW)
```
Player with Wand of Lightning (5 charges, identified, range 8)
3 visible monsters: Orc (3 tiles away), Kobold (5 tiles), Troll (7 tiles)
Player presses: z → (selects Lightning Wand)
→ Targeting modal appears
→ Auto-selects nearest: Orc (3 tiles, in range, valid)
Player presses: Tab
→ Cycles to: Kobold (5 tiles, in range, valid)
Player presses: Tab
→ Cycles to: Troll (7 tiles, in range, valid)
Player presses: *
→ Jumps back to nearest: Orc
Player presses: Enter
→ Targeting confirmed
→ "You zap a Wand of Lightning."
→ "The bolt strikes the Orc for 22 damage!"
→ Orc killed
→ Wand charges: 5 → 4
→ Turn: 100 → 101
```

### Example 2: Out of Range
```
Player with Wand of Polymorph (3 charges, range 5)
Monster visible: Dragon (8 tiles away)
Player presses: z → (selects Polymorph Wand)
→ Targeting modal shows: Dragon (8 tiles, OUT OF RANGE, invalid)
→ Visual feedback shows red/invalid state
Player presses: Enter
→ "Target out of range. (Range: 5)"
→ No turn consumed
→ (Move closer and try again)
```

### Example 3: Zap Lightning Wand (Classic)
```
Player with Wand of Lightning (5 charges, identified)
Monster nearby (2 tiles)
Player presses: z → (selects Lightning Wand)
→ Targeting modal auto-selects nearest monster
Player presses: Enter
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
- **Lightning/Fire/Cold**: Use on tough monsters (Dragons, Trolls) - **8 tile range**
- **Magic Missile**: General purpose damage - **7 tile range**
- **Death**: Save for bosses (low charges, high risk/reward)

**Utility Wands:**
- **Slow Monster**: Use on fast enemies (Kestrels, Bats) - **6 tile range**
- **Teleport**: Emergency escape (zap monster away) - **7 tile range**
- **Polymorph**: Risky but fun - **5 tile range** (close!)

**Targeting Tactics (NEW):**
- **Range Awareness**: Check wand range before engaging (beam wands: 8, utility: 5-6)
- **Nearest First**: Auto-target (Enter) is usually correct
- **Cycle to Priority**: Tab to skip weak monsters, target threats
- **Position Matters**: Move closer if target out of range (better than wasting turn)
- **Escape Tool**: Teleport Away on adjacent monster for instant distance

**When NOT to Zap:**
- Weak monsters (save charges for harder fights)
- Unknown wands at critical moments (could be Haste Monster!)
- Last charge unless desperate (wand becomes useless)
- Monsters out of range (move closer first)

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
