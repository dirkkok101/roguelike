# Refill Lantern Command

**Keybinding**: `F` + oil flask selection
**Consumes Turn**: Yes
**Implementation**: `src/commands/RefillLanternCommand/RefillLanternCommand.ts`

---

## Purpose

Refills an equipped lantern using an oil flask from inventory. Essential for maintaining light in the deep dungeon.

---

## Behavior

### Input Mode
1. Player presses `F`
2. Inventory modal shows oil flasks only
3. Prompt: "Use which oil flask?"
4. Player selects oil flask
5. Lantern refill attempt occurs
6. If successful:
   - Lantern fuel restored (+500 units)
   - Oil flask removed from inventory
7. Turn increments

### Refill Logic
- **Oil flask capacity**: 500 fuel units
- **Lantern max fuel**: 500 units
- **Overfill**: If current fuel + 500 > max, capped at 500 (no waste)

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Not in inventory** | "You do not have that item." | No |
| **Not oil flask** | "You cannot use that to refill a lantern." | No |
| **No lantern equipped** | "You do not have a lantern to refill." | No |
| **Lantern already full** | "Your lantern is already full." | No |

---

## Turn Side Effects

**Only if refill succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Lantern Fuel** | Restored (+500, max 500) |
| **Oil Flask** | Removed from inventory |

---

## Services Used

- **InventoryService**: Find oil flask, remove from inventory
- **LightingService**: Lantern refill logic, fuel management
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Light Sources

### Torch
- **Radius**: 1 tile
- **Fuel**: 500 turns
- **Refillable**: No (consumed when empty)

### Lantern
- **Radius**: 2 tiles
- **Fuel**: 500 turns (initially)
- **Refillable**: Yes (with oil flasks)

### Artifact
- **Radius**: 3 tiles
- **Fuel**: Infinite (never runs out)
- **Refillable**: N/A (permanent light)

**Note**: Lanterns are superior to torches because they can be refilled!

---

## Special Rules

1. **Lantern Only**: Can only refill lanterns (not torches or artifacts)

2. **Must Be Equipped**: Lantern must be in `equipment.lightSource` slot (not inventory)

3. **Oil Flask Consumed**: Oil flask disappears after use (single-use item)

4. **Max Fuel Cap**: Cannot exceed 500 fuel (overfill is wasted)

5. **Partial Refill**: If lantern has 400 fuel, adding 500 → caps at 500 (100 wasted)

---

## Code Flow

```
RefillLanternCommand.execute()
├── Find item in inventory (by itemId)
│
├─ Item not found:
│   └── Message: "You do not have that item." (no turn)
│
├─ Item not oil flask:
│   └── Message: "You cannot use that to refill..." (no turn)
│
└─ Valid oil flask:
    ├── LightingService.refillPlayerLantern(player, fuelAmount)
    │   ├── Check if lantern equipped
    │   │   └─ If no lantern:
    │   │       └── Return { success: false, message: "..." }
    │   │
    │   ├── Check if already full
    │   │   └─ If fuel = maxFuel:
    │   │       └── Return { success: false, message: "..." }
    │   │
    │   └── Refill lantern
    │       ├── Calculate new fuel (current + 500, max 500)
    │       ├── Update lantern fuel
    │       └── Return { success: true, player, message }
    │
    ├─ If success:
    │   └── Remove oil flask from inventory
    │
    ├── Add message (success or failure)
    └─ If success:
        └── Increment turn
```

---

## Examples

### Example 1: Normal Refill
```
Player with lantern equipped (fuel: 200/500)
Oil flask in inventory
Player presses: F → (selects oil flask)
→ "You refill your lantern."
→ Lantern fuel: 200 → 500 (full)
→ Oil flask removed from inventory
→ Turn: 100 → 101
```

### Example 2: Already Full
```
Player with lantern equipped (fuel: 500/500)
Oil flask in inventory
Player presses: F → (selects oil flask)
→ "Your lantern is already full."
→ Oil flask remains in inventory
→ No turn consumed
```

### Example 3: No Lantern Equipped
```
Player with torch equipped (not lantern)
Oil flask in inventory
Player presses: F → (selects oil flask)
→ "You do not have a lantern to refill."
→ Oil flask remains
→ No turn consumed
```

### Example 4: Partial Overfill (Waste)
```
Player with lantern (fuel: 400/500)
Oil flask provides +500 fuel
Player presses: F → (selects oil flask)
→ "You refill your lantern."
→ Lantern fuel: 400 → 500 (100 fuel wasted)
→ Oil flask consumed
→ Turn: 100 → 101
```

---

## Fuel Management Strategy

### When to Refill
- **Fuel below 100**: Refill soon (lantern warning at 50)
- **Before deep dungeon dive**: Refill before descending to new level
- **After finding oil flask**: Use immediately if low on fuel

### When NOT to Refill
- **Fuel above 400**: Wait until lower (risk wasting oil)
- **No lantern equipped**: Cannot refill torch or artifact
- **During combat**: Spend turn attacking instead (refill after fight)

### Oil Flask Conservation
- Carry 2-3 oil flasks minimum
- Refill at ~100 fuel (avoids waste)
- Don't refill at full capacity (wastes oil)

---

## Light Progression

**Typical progression:**
1. **Level 1-3**: Start with torch (radius 1)
2. **Level 4-6**: Find lantern (radius 2, refillable)
3. **Level 7-10**: Collect oil flasks, refill as needed
4. **Level 10+**: Find artifact light source (radius 3, infinite fuel) - rare!

**Why Lanterns Matter:**
- Larger FOV (2 tiles vs 1 for torch)
- Refillable (torches consumed when empty)
- Mid-game essential (until you find artifact)

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up oil flasks
- [Drop](./drop.md) - Drop unwanted oil flasks
- [Equip](./equip.md) - Equip lantern (via pickup mechanism)
- [Move](./move.md) - Fuel consumption occurs during movement

---

**Architecture**: Command orchestrates InventoryService (find/remove oil flask), LightingService (refill logic, fuel management), MessageService (messages), TurnService (turn increment). All lighting logic lives in LightingService.
