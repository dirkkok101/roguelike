# Pick Up Command

**Keybinding**: `,` (comma)
**Consumes Turn**: Yes
**Implementation**: `src/commands/PickUpCommand/PickUpCommand.ts`

---

## Purpose

Picks up an item from the dungeon floor at the player's current position and adds it to inventory.

---

## Behavior

### Normal Pickup
1. Finds item at player's position
2. Checks inventory space (26 slots max)
3. Adds item to inventory
4. Removes item from level floor
5. Displays pickup message
6. Turn increments

### Special Case: Amulet of Yendor
When picking up the Amulet:
1. Normal pickup occurs
2. `state.hasAmulet` flag set to `true`
3. **Extra message**: "You have retrieved the Amulet of Yendor! Return to Level 1 to win!"

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **No item at position** | "There is nothing here to pick up." | No |
| **Inventory full** | "Your pack is full. You cannot carry any more items." | No |

---

## Turn Side Effects

**Only if pickup succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Inventory** | Item added (max 26 slots) |
| **Level** | Item removed from floor |

---

## Services Used

- **InventoryService**: Inventory space checks, item addition
- **IdentificationService**: Display name generation (identified vs unidentified)
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **Inventory Limit**: 26 slots (A-Z) - inspired by 1980 Rogue

2. **Amulet Detection**: Automatically sets `hasAmulet` flag (required for victory)

3. **Item Identification**: Displays identified name if known, otherwise generic name (e.g., "a blue potion")

4. **Position Property**: Items on floor have `position` property, in inventory they don't

5. **Cannot Drop Amulet**: Once picked up, Amulet cannot be dropped (see DropCommand)

---

## Code Flow

```
PickUpCommand.execute()
├── Get current level
├── Find item at player.position
│
├─ No item found:
│   └── Message: "There is nothing here to pick up." (no turn)
│
├─ Item found:
│   ├── Check inventory space (InventoryService)
│   │
│   ├─ Inventory full:
│   │   └── Message: "Your pack is full..." (no turn)
│   │
│   └─ Space available:
│       ├── Add item to inventory (removes position property)
│       ├── Remove item from level.items
│       ├── Update level in state
│       │
│       ├─ If item is Amulet:
│       │   ├── Set state.hasAmulet = true
│       │   └── Add victory hint message
│       │
│       ├── Add pickup message (with display name)
│       └── Increment turn
```

---

## Examples

### Example 1: Normal Pickup
```
Player at (10, 10)
Longsword at (10, 10)
Player presses: ,
→ "You pick up a longsword."
→ Longsword added to inventory
→ Longsword removed from level
→ Turn: 100 → 101
```

### Example 2: Amulet Pickup
```
Player at (15, 15) on Level 10
Amulet of Yendor at (15, 15)
Player presses: ,
→ "You pick up the Amulet of Yendor."
→ "You have retrieved the Amulet of Yendor! Return to Level 1 to win!"
→ Amulet added to inventory
→ state.hasAmulet: false → true
→ Turn: 500 → 501
```

### Example 3: Nothing to Pick Up
```
Player at (10, 10)
No item at (10, 10)
Player presses: ,
→ "There is nothing here to pick up."
→ No turn consumed
```

### Example 4: Inventory Full
```
Player at (10, 10) with 26 items in inventory
Gold at (10, 10)
Player presses: ,
→ "Your pack is full. You cannot carry any more items."
→ Gold remains on floor
→ No turn consumed
→ (Must drop item first with 'd')
```

### Example 5: Unidentified Item
```
Player at (10, 10)
Potion of Healing at (10, 10) (not yet identified)
Player presses: ,
→ "You pick up a blue potion."
→ (Generic name shown until identified)
```

---

## Item Types

Items that can be picked up:

| Category | Examples |
|----------|----------|
| **Weapons** | Mace, Longsword, Bow |
| **Armor** | Leather Armor, Chain Mail, Plate Mail |
| **Potions** | Healing, Strength, Poison (13 types) |
| **Scrolls** | Identify, Enchant Armor, Teleport (13 types) |
| **Wands** | Lightning, Fire, Cold (10 types) |
| **Rings** | Protection, Strength, Regeneration (14 types) |
| **Food** | Rations |
| **Gold** | Gold piles (auto-added to gold counter in future) |
| **Light** | Torches, Lanterns |
| **Oil Flasks** | For refilling lanterns |
| **Amulet** | Amulet of Yendor (win condition) |

---

## Inventory Management

**Capacity**: 26 slots (A-Z)

**When Full**:
1. Drop unwanted items with [Drop Command](./drop.md)
2. Use consumables (potions, scrolls, food)
3. Leave items on floor (they persist when you return)

---

## Related Commands

- [Drop](./drop.md) - Drop items from inventory
- [Equip](./equip.md) - Equip weapons/armor/rings
- [Eat](./eat.md) - Consume food
- [Quaff](./quaff.md) - Drink potions
- [Read](./read.md) - Read scrolls

---

**Architecture**: Command orchestrates InventoryService (inventory management), IdentificationService (display names), MessageService (messages), TurnService (turn increment). Amulet detection in command is acceptable (special quest item).
