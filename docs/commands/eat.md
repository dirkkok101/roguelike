# Eat Command

**Keybinding**: `e`
**Consumes Turn**: Yes
**Implementation**: `src/commands/EatCommand/EatCommand.ts`

---

## Purpose

Consumes a food ration from inventory to restore hunger. Essential for survival - you starve without food!

---

## Behavior

### Normal Eating
1. Finds first food ration in inventory
2. Removes food from inventory
3. Restores hunger (adds food units)
4. Displays result messages
5. Turn increments

### Hunger Restoration
- **Food restores**: 900 food units
- **Max capacity**: 1800 units
- **Overeating**: If eating would exceed max, capped at 1800 (no waste)

---

## Messages

| Result | Message |
|--------|---------|
| **Normal** | "You eat the food ration. You feel satisfied." |
| **Still hungry** | "You eat the food ration. You're still hungry." |
| **Overeating** | "You eat the food ration. You feel bloated." |

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **No food** | "You have no food to eat." | No |

---

## Turn Side Effects

**Only if eating succeeds:**

| System | Effect | Details |
|--------|--------|---------|
| **Turn** | Increments | Eating takes time |
| **Monsters** | Get to act | Risky during combat |
| **Hunger** | Restores +900 | Delays starvation |
| **Fuel** | **NOT consumed** | No movement |

---

## Services Used

- **InventoryService**: Find food, remove from inventory
- **HungerService**: Hunger restoration logic, message generation
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **Auto-Find Food**: Automatically finds first food ration in inventory (no manual selection)

2. **Consumed on Use**: Food ration disappears after eating (single-use item)

3. **Hunger Cap**: Cannot exceed 1800 food units (overeating capped)

4. **Starvation Prevention**: Eat when hunger drops below 300 units (game warns at 300/150/20/10)

5. **Future: Food Types**: Currently only one food type (rations). Future may add fruits, meat, etc.

---

## Code Flow

```
EatCommand.execute()
├── Find food in inventory (InventoryService)
│
├─ No food found:
│   └── Message: "You have no food to eat." (no turn)
│
└─ Food found:
    ├── Remove food from inventory
    ├── HungerService.consumeFood(player)
    │   ├── Calculate new hunger (current + 900, max 1800)
    │   ├── Determine message based on hunger level
    │   └── Return { player, messages }
    │
    ├── Add messages to log
    └── Increment turn
```

---

## Examples

### Example 1: Normal Eating
```
Player with hunger: 500 units
Food rations in inventory: 3
Player presses: e
→ "You eat the food ration. You feel satisfied."
→ Hunger: 500 → 1400
→ Food count: 3 → 2
→ Turn: 100 → 101
```

### Example 2: Still Hungry
```
Player with hunger: 100 units (starving!)
Food rations: 1
Player presses: e
→ "You eat the food ration. You're still hungry."
→ Hunger: 100 → 1000
→ Food count: 1 → 0 (out of food!)
→ Turn: 100 → 101
```

### Example 3: Overeating
```
Player with hunger: 1500 units
Food rations: 2
Player presses: e
→ "You eat the food ration. You feel bloated."
→ Hunger: 1500 → 1800 (capped, 600 units wasted)
→ Food count: 2 → 1
→ Turn: 100 → 101
```

### Example 4: No Food
```
Player with 0 food rations
Player presses: e
→ "You have no food to eat."
→ No turn consumed
```

---

## Hunger System

### Hunger Levels

| Food Units | Status | Warning |
|------------|--------|---------|
| **1800** | Full | "You feel bloated." |
| **900-1800** | Satisfied | "You feel satisfied." |
| **300-899** | Hungry | "You are getting hungry." (warning) |
| **150-299** | Very Hungry | "You are very hungry!" (warning) |
| **20-149** | Starving | "You are starving!" (critical) |
| **10-19** | Near Death | "You are about to die of starvation!" (critical) |
| **0** | Death | "You died of starvation!" (game over) |

### Hunger Tick Rate
- **1 unit per turn** (when moving)
- **0 units per turn** (for non-movement actions like eating, opening doors)

### Starvation Death
When hunger reaches 0:
- Player dies immediately
- Message: "You died of starvation!"
- Game over

---

## Tactical Considerations

**When to Eat:**
- Hunger drops below 300 (game warns you)
- Before long exploration (want buffer)
- After combat (safe time to spend turn)
- When in safe room (no monster threats)

**When NOT to Eat:**
- Hunger above 900 (risk wasting food)
- During active combat (monsters get free hits)
- When low on food rations (conserve for emergency)

**Food Management:**
- Carry 5-10 rations minimum
- Eat before hunger gets critical
- Ration carefully in deep dungeon (food is scarce)

---

## Food Sources

Food can be found:
- **Floor items**: Random dungeon spawns
- **Monster drops**: Future feature (some monsters drop food)
- **Shops**: Future feature (buy rations)

**Scarcity**: Food is relatively rare - manage carefully!

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up food rations
- [Drop](./drop.md) - Drop food (not recommended!)
- [Quaff](./quaff.md) - Drink potions (some heal, not hunger)

---

**Architecture**: Command orchestrates InventoryService (find food, remove), HungerService (hunger restoration, message logic), MessageService (messages), TurnService (turn increment). All hunger logic lives in HungerService.
