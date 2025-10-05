# Close Door Command

**Keybinding**: `c` + direction (arrow key)
**Consumes Turn**: Yes (if successful)
**Implementation**: `src/commands/CloseDoorCommand/CloseDoorCommand.ts`

---

## Purpose

Closes an open door in the specified direction. Useful for creating barriers between you and pursuing monsters.

---

## Behavior

### Input Mode
1. Player presses `c`
2. Game enters "close door" mode
3. Player presses direction arrow key
4. Command executes for that direction
5. Returns to normal mode

### Door States

| Door State | Can Close? | Message | Turn? |
|------------|------------|---------|-------|
| **Open** | Yes* | "You close the door." | Yes |
| **Closed** | No | "There is no door there." | No |
| **Locked** | No | "There is no door there." | No |
| **Broken** | No | "The door is broken and cannot be closed." | No |
| **Archway** | No | "There is no door there." | No |
| **Secret** | No | "There is no door there." | No |

**\* Conditions for closing open doors:**
- Door must be OPEN state
- **No monster** in the doorway (blocks closing)
- **No player** in the doorway (prevents blocking self)

### Successful Close
When door is closed:
1. Door state changes to `CLOSED`
2. Message: "You close the door."
3. Turn increments
4. Level updated in state

### Blocked by Monster
If monster occupies doorway:
- Message: "There is a monster in the doorway!"
- No turn consumed

---

## Turn Side Effects

**Only if door closes successfully:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |

**Note**: Closing a door consumes a turn but does NOT tick hunger/fuel.

---

## Services Used

- **DoorService**: Door state checks, closing logic, monster detection
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **Monster Blocking**: Cannot close door if monster is standing in doorway (prevents cheesing)

2. **Broken Doors**: Cannot be closed (they're broken!)

3. **Tactical Use**: Close doors behind you to slow pursuing monsters (they must open or break down the door)

4. **Cancel with Escape**: Pressing `Escape` while in door selection mode cancels command

---

## Code Flow

```
CloseDoorCommand.execute()
├── Calculate target position (player.position + direction)
├── Find door at target (DoorService)
│
├─ No door found:
│   └── Message: "There is no door there." (no turn)
│
├─ Door found:
│   ├── Validate with DoorService.canCloseDoor()
│   │   ├── Check door state (must be OPEN)
│   │   ├── Check for monster in doorway
│   │   └── Check for player in doorway
│   │
│   ├─ Cannot close:
│   │   └── Message with reason (no turn)
│   │
│   └─ Can close:
│       ├── Close door (DoorService)
│       ├── Update level
│       ├── Add message
│       └── Increment turn
```

---

## Examples

### Example 1: Close Open Door
```
Player at (5, 5)
Open door at (5, 4)
Player presses: c → ↑
→ "You close the door."
→ Door state: OPEN → CLOSED
→ Turn: 100 → 101
```

### Example 2: Monster in Doorway
```
Player at (5, 5)
Open door at (5, 4) with Orc standing in it
Player presses: c → ↑
→ "There is a monster in the doorway!"
→ No turn consumed
```

### Example 3: Broken Door
```
Player at (5, 5)
Broken door at (5, 4)
Player presses: c → ↑
→ "The door is broken and cannot be closed."
→ No turn consumed
```

### Example 4: Already Closed
```
Player at (5, 5)
Closed door at (5, 4)
Player presses: c → ↑
→ "There is no door there."
→ No turn consumed
```

---

## Tactical Use

Closing doors is a key defensive tactic:

1. **Fleeing**: Close doors behind you to slow pursuers
2. **Healing**: Close door, eat food, drink potions in safety
3. **Ranged Combat**: Close door, use wand through wall (future feature)
4. **Monster AI**: Some monsters won't open doors (future)

---

## Related Commands

- [Open Door](./open-door.md) - Open closed doors
- [Move](./move.md) - Auto-opens doors when moving through
- [Search](./search.md) - Discover secret doors

---

**Architecture**: Command orchestrates DoorService (door logic, monster detection), MessageService (messages), TurnService (turn increment). All door logic lives in DoorService.
