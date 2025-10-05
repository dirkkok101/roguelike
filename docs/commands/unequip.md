# Unequip Command

**Keybinding**: `R` (rings only)
**Consumes Turn**: Yes
**Implementation**: `src/commands/UnequipCommand/UnequipCommand.ts`

---

## Purpose

Removes a ring from the player's left or right hand and returns it to inventory. **Only used for rings** - weapons and armor swap automatically when equipping a new one.

---

## Behavior

### Ring Removal
1. Player presses `R`
2. **Auto-selects**: Left ring if equipped, else right ring
3. Checks inventory space
4. Removes ring from equipment slot
5. Adds ring to inventory
6. Message: "You remove {ring} from your {hand} hand."
7. Turn increments

### Slot Priority
- If **left ring** equipped → removes left
- If left empty but **right ring** equipped → removes right
- If **both empty** → shows message (no turn)

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **No ring equipped** | "You are not wearing a ring on your {hand} hand." | No |
| **Inventory full** | "Your pack is full. You cannot unequip that ring." | No |

---

## Turn Side Effects

**Only if unequip succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Equipment** | Ring removed from slot |
| **Inventory** | Ring added to inventory |
| **Stats** | Ring bonuses removed |

---

## Services Used

- **InventoryService**: Ring removal, inventory space check, item addition
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **Rings Only**: Weapons and armor automatically swap when equipping a new one (no manual unequip needed)

2. **Auto-Slot Selection**: Command picks which ring to remove (left preference). Cannot manually choose slot.

3. **Inventory Space Required**: Must have inventory space (26 items max). If full, drop something first.

4. **Future: Cursed Rings**: Cursed rings cannot be removed (require Remove Curse scroll - not yet implemented)

5. **Ring Effects Lost**: Removing ring immediately loses its benefits (e.g., Protection ring = AC drops)

---

## Code Flow

```
UnequipCommand.execute()
├── Determine ring slot (left or right via constructor)
├── Get ring from equipment slot
│
├─ No ring equipped:
│   └── Message: "You are not wearing a ring..." (no turn)
│
├─ Ring equipped:
│   ├── Check inventory space (InventoryService)
│   │
│   ├─ Inventory full:
│   │   └── Message: "Your pack is full..." (no turn)
│   │
│   └─ Space available:
│       ├── Unequip ring (InventoryService)
│       │   ├── Remove from equipment slot
│       │   └── Add to inventory
│       ├── Add removal message
│       └── Increment turn
```

---

## Examples

### Example 1: Unequip Left Ring
```
Player with Ring of Strength on left hand
Inventory: 15/26 items
Player presses: R
→ "You remove Ring of Strength from your left hand."
→ equipment.leftRing: Ring of Strength → null
→ Ring added to inventory (16/26)
→ Strength bonus lost
→ Turn: 100 → 101
```

### Example 2: Unequip Right Ring (Left Empty)
```
Player with Ring of Protection on right hand only
Player presses: R
→ "You remove Ring of Protection from your right hand."
→ equipment.rightRing: Ring of Protection → null
→ AC bonus lost
→ Turn: 101 → 102
```

### Example 3: No Ring Equipped
```
Player with no rings equipped
Player presses: R
→ "You are not wearing a ring on your left hand."
→ No turn consumed
```

### Example 4: Inventory Full (Blocked)
```
Player with Ring of Regeneration on left hand
Inventory: 26/26 items (full)
Player presses: R
→ "Your pack is full. You cannot unequip that ring."
→ Ring remains equipped
→ No turn consumed
→ (Must drop item first with 'd')
```

---

## Why Only Rings?

**Design Question**: Why can't you manually unequip weapons/armor?

**Answer**: Auto-swapping is more user-friendly:
- Equipping new weapon/armor automatically unequips the old one
- Prevents extra steps (unequip → equip)
- Matches classic roguelike conventions

**Rings are different:**
- You have **2 ring slots** (left + right)
- Need to choose which one to remove
- Cannot auto-swap (which slot would it use?)

---

## Unequip vs Equip

| Action | Weapon/Armor | Rings |
|--------|--------------|-------|
| **Equip new** | Auto-swaps old | Fills empty slot |
| **Unequip** | Automatic (on swap) | Manual (`R` key) |
| **Slots** | 1 each | 2 total |

---

## Ring Management Strategy

**Common Workflow:**
1. Find 2 rings, equip both (left + right)
2. Find better ring later
3. Press `R` to unequip worse ring
4. Press `P` to equip new ring

**Pro Tip**: Keep powerful rings equipped (Strength, Protection, Regeneration). Drop weak rings or use for identification testing.

---

## Related Commands

- [Equip](./equip.md) - Equip rings (and weapons/armor)
- [Drop](./drop.md) - Drop items from inventory

---

**Architecture**: Command orchestrates InventoryService (ring removal, inventory management), MessageService (messages), TurnService (turn increment). Slot selection logic (left preference) in command is acceptable (simple UI logic).
