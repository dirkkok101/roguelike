# Open Door Command

**Keybinding**: `o` + direction (arrow key)
**Consumes Turn**: Yes (if successful)
**Implementation**: `src/commands/OpenDoorCommand/OpenDoorCommand.ts`

---

## Purpose

Manually opens a door in the specified direction. Useful for opening doors without moving through them (e.g., to reveal enemies behind them).

---

## Behavior

### Input Mode
1. Player presses `o`
2. Game enters "open door" mode
3. Player presses direction arrow key
4. Command executes for that direction
5. Returns to normal mode

### Door States

| Door State | Can Open? | Message | Turn? |
|------------|-----------|---------|-------|
| **Open** | No | "There is no door there." | No |
| **Closed** | Yes | "You open the door." | Yes |
| **Locked** | No | "The door is locked." | No |
| **Secret (undiscovered)** | No | "There is no door there." | No |
| **Secret (discovered)** | Yes | "You open the secret door." | Yes |
| **Broken** | No | "There is no door there." | No |
| **Archway** | No | "There is no door there." | No |

### Successful Open
When door is opened:
1. Door state changes to `OPEN`
2. Message added to log
3. Turn increments (costs turn)
4. Level updated in state

---

## Turn Side Effects

**Only if door opens successfully:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |

**Note**: Opening a door consumes a turn but does NOT tick hunger/fuel (you're not moving).

---

## Services Used

- **DoorService**: Door state checks, door opening logic
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Special Rules

1. **No Adjacent Door**: If no door at target position, shows "There is no door there." (no turn)

2. **Locked Doors**: Cannot be opened with this command (need key or lockpick - not yet implemented)

3. **Secret Doors**: Must be discovered first (via SearchCommand) before they can be opened manually

4. **Cancel with Escape**: Pressing `Escape` while in door selection mode cancels the command

---

## Code Flow

```
OpenDoorCommand.execute()
├── Calculate target position (player.position + direction)
├── Find door at target (DoorService)
│
├─ No door found:
│   └── Message: "There is no door there." (no turn)
│
├─ Door found:
│   ├── Validate with DoorService.canOpenDoor()
│   │
│   ├─ Cannot open (locked/already open):
│   │   └── Message (no turn)
│   │
│   └─ Can open:
│       ├── Open door (DoorService)
│       ├── Update level
│       ├── Add message
│       └── Increment turn
```

---

## Examples

### Example 1: Open Closed Door
```
Player at (5, 5)
Closed door at (5, 4)
Player presses: o → ↑
→ "You open the door."
→ Door state: CLOSED → OPEN
→ Turn: 100 → 101
```

### Example 2: Locked Door
```
Player at (5, 5)
Locked door at (5, 4)
Player presses: o → ↑
→ "The door is locked."
→ No turn consumed
```

### Example 3: No Door
```
Player at (5, 5)
Wall at (5, 4) (no door)
Player presses: o → ↑
→ "There is no door there."
→ No turn consumed
```

### Example 4: Already Open
```
Player at (5, 5)
Open door at (5, 4)
Player presses: o → ↑
→ "There is no door there."
→ No turn consumed
```

---

## Comparison: Open vs Move

| Aspect | Open Door (o) | Move (↑) |
|--------|---------------|----------|
| **Opens door** | Yes | Yes (auto) |
| **Moves player** | No | Yes |
| **Consumes turn** | Yes | Yes |
| **Ticks hunger/fuel** | No | Yes |
| **Use case** | Peek without moving | Move through |

---

## Related Commands

- [Move](./move.md) - Auto-opens doors when moving through
- [Close Door](./close-door.md) - Close open doors
- [Search](./search.md) - Discover secret doors

---

**Architecture**: Command orchestrates DoorService (door logic), MessageService (messages), TurnService (turn increment). All door logic lives in DoorService.
