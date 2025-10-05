# Drop Command

**Keybinding**: `d` + item selection
**Consumes Turn**: Yes
**Implementation**: `src/commands/DropCommand/DropCommand.ts`

---

## Purpose

Drops an item from inventory onto the dungeon floor at the player's current position.

---

## Behavior

### Input Mode
1. Player presses `d`
2. Inventory modal appears with "Drop which item?" prompt
3. Player selects item (letter key A-Z)
4. Item drops to floor
5. Turn increments

### Normal Drop
1. Checks if item is equipped (must unequip first)
2. Removes item from inventory
3. Adds `position` property (player's position)
4. Adds item to level's floor items
5. Displays drop message
6. Turn increments

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Item equipped** | "You must unequip {item} before dropping it." | No |
| **Item not in inventory** | "You do not have that item." | No |
| **Amulet of Yendor** | "The Amulet of Yendor cannot be dropped!" | No |

---

## Turn Side Effects

**Only if drop succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Inventory** | Item removed |
| **Level** | Item added to floor at player position |

---

## Services Used

- **InventoryService**: Inventory checks, equipped item detection, item removal
- **IdentificationService**: Display name generation
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **Cannot Drop Equipped Items**: Must unequip first (via UnequipCommand or by equipping another item)

2. **Cannot Drop Amulet**: The Amulet of Yendor is quest-critical and **cannot be dropped** (prevents softlock)

3. **Items Persist**: Dropped items remain on the floor forever (or until picked up by monster - future feature)

4. **Multiple Items Same Tile**: Can drop multiple items on same tile (they stack)

5. **Identification State Preserved**: Identified items stay identified when dropped and picked up again

---

## Code Flow

```
DropCommand.execute()
├── Check if item is equipped
│   └─ If equipped:
│       └── Message: "You must unequip..." (no turn)
│
├── Find item in inventory
│   └─ If not found:
│       └── Message: "You do not have that item." (no turn)
│
├── Check if Amulet
│   └─ If Amulet:
│       └── Message: "The Amulet cannot be dropped!" (no turn)
│
└─ Can drop:
    ├── Remove item from inventory
    ├── Add position property (player.position)
    ├── Add item to level.items
    ├── Update level in state
    ├── Add drop message (with display name)
    └── Increment turn
```

---

## Examples

### Example 1: Normal Drop
```
Player at (10, 10) with Mace in inventory
Player presses: d → (selects Mace)
→ "You drop a mace."
→ Mace removed from inventory
→ Mace added to floor at (10, 10)
→ Turn: 100 → 101
```

### Example 2: Drop Equipped Item (Blocked)
```
Player with Longsword equipped (in equipment.weapon)
Player presses: d → (selects Longsword)
→ "You must unequip longsword before dropping it."
→ Item remains equipped
→ No turn consumed
```

### Example 3: Amulet Drop (Blocked)
```
Player with Amulet of Yendor in inventory
Player presses: d → (selects Amulet)
→ "The Amulet of Yendor cannot be dropped!"
→ Amulet remains in inventory
→ No turn consumed
```

### Example 4: Drop Unidentified Potion
```
Player with unidentified red potion
Player presses: d → (selects potion)
→ "You drop a red potion."
→ Potion dropped to floor
→ (Still unidentified)
```

### Example 5: Drop Item, Pick Up Later
```
Level 5, Room A, position (10, 10)
Player drops Plate Mail at (10, 10)
Player descends to Level 6, explores
Player returns to Level 5
Plate Mail still at (10, 10) (level persistence)
Player presses: ,
→ "You pick up plate mail."
```

---

## Why Can't You Drop the Amulet?

The Amulet of Yendor is the **win condition** item. Preventing drops ensures:
1. **No Softlock**: Can't accidentally leave Amulet unreachable
2. **Quest Clarity**: Amulet stays with you once obtained
3. **Roguelike Tradition**: Matches 1980 Rogue behavior

**Work-around**: None needed - Amulet is quest item, not burden (weighs nothing)

---

## Inventory Management Strategy

**When to Drop:**
- Inventory full, need to pick up better item
- Carrying cursed item (drop after uncursing)
- Stockpiling items in safe room for later

**What to Drop:**
- Duplicate weapons (keep best)
- Unidentified scrolls (if you have too many)
- Extra torches (if you have lantern)
- Weak armor (if you found better)

**What NEVER to Drop:**
- Amulet of Yendor (game won't let you)
- Food rations (risk starvation)
- Healing potions (keep 2-3 minimum)
- Escape scrolls (teleport, magic mapping)

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up items from floor
- [Unequip](./unequip.md) - Unequip items before dropping
- [Equip](./equip.md) - Equipping replaces current item (auto-unequips)

---

**Architecture**: Command orchestrates InventoryService (inventory management, equipment checks), IdentificationService (display names), MessageService (messages), TurnService (turn increment). Amulet restriction in command is acceptable (quest-critical logic).
