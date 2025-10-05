# Move Command

**Keybinding**: `↑` `↓` `←` `→` (Arrow keys)
**Consumes Turn**: Yes
**Implementation**: `src/commands/MoveCommand/MoveCommand.ts`

---

## Purpose

Moves the player one tile in the specified direction. This is the primary navigation command in the roguelike.

---

## Behavior

### Normal Movement
When the target tile is walkable (floor):
1. Player moves to new position
2. Hunger ticks (1 turn closer to starvation)
3. Light fuel ticks (torch/lantern consumes 1 fuel)
4. FOV recalculates based on new position
5. Exploration updates (new tiles marked as explored)
6. Auto-notifications generated (monsters/items in view)
7. Turn increments (monsters get to act)

### Bump-to-Attack
If target tile has a monster:
- Delegates to [AttackCommand](./attack.md)
- Combat occurs instead of movement
- **No hunger/fuel tick** (attack is separate action)

### Door Interaction
If target tile has a door:

| Door State | Behavior |
|------------|----------|
| **Locked** | Blocked, shows "The door is locked." (no turn) |
| **Secret (undiscovered)** | Blocked, shows "You can't go that way." (no turn) |
| **Secret (discovered)** | Opens door, then moves through (turn consumed) |
| **Closed** | Opens door, then moves through (turn consumed) |
| **Open/Broken/Archway** | Moves through normally |

### Wall Collision
If target tile is a wall:
- Blocked, shows "You can't go that way."
- **No turn consumed**

---

## Turn Side Effects

When movement succeeds (consumes turn):

| System | Effect | Details |
|--------|--------|---------|
| **Hunger** | Ticks -1 | Warnings at 300/150/20/10 turns remaining |
| **Light Fuel** | Ticks -1 | Warnings at 50/10/0 fuel remaining |
| **FOV** | Recalculates | Based on light radius (1-3 tiles) |
| **Exploration** | Updates | New visible tiles marked as explored |
| **Monsters** | Act | All monsters execute their turns |
| **Notifications** | Generated | Auto-messages for nearby monsters/items |

---

## Services Used

- **MovementService**: Direction calculation, obstacle detection, player positioning
- **LightingService**: Fuel consumption, light radius calculation
- **FOVService**: Field-of-view computation, exploration tracking
- **HungerService**: Hunger tick, starvation checks
- **MessageService**: Message log updates
- **DoorService**: Door state checks, door opening
- **CombatService**: Monster detection (delegates to AttackCommand)
- **NotificationService**: Auto-notification generation
- **TurnService**: Turn increment

---

## Special Rules

1. **Starvation Death**: If hunger reaches 0 during movement:
   - Player dies immediately
   - Death message added: "You died of starvation!"
   - Game over (`isGameOver: true`)

2. **Door Auto-Open**: Discovered secret doors and closed doors automatically open when walked through (costs turn)

3. **No Diagonal Movement**: Only cardinal directions (up/down/left/right)

4. **FOV-Based Exploration**: Only visible tiles are marked as explored (fog of war)

---

## Code Flow

```
MoveCommand.execute()
├── Calculate target position
├── Detect obstacle (MovementService)
│
├─ ROUTE 1: Monster
│   └── Delegate to AttackCommand (early return)
│
├─ ROUTE 2: Door
│   ├── Locked → Message (no turn)
│   ├── Secret (undiscovered) → Message (no turn)
│   └── Closed/Secret (discovered) → Open + performMovement()
│
├─ ROUTE 3: Wall
│   └── Message (no turn)
│
└─ ROUTE 4: Clear
    └── performMovement()
        ├── Move player
        ├── Tick hunger (check death)
        ├── Tick fuel
        ├── Update FOV + exploration
        ├── Generate notifications
        └── Increment turn
```

---

## Examples

### Example 1: Normal Movement
```
Player at (5, 5), presses ↑
→ Moves to (5, 4)
→ Hunger: 800 → 799
→ Torch fuel: 450 → 449
→ FOV recalculated
→ Turn: 100 → 101
```

### Example 2: Bump-to-Attack
```
Player at (5, 5), Orc at (5, 4)
Player presses ↑
→ AttackCommand executes (see attack.md)
→ No hunger/fuel tick
```

### Example 3: Door Auto-Open
```
Player at (5, 5), closed door at (5, 4)
Player presses ↑
→ Door opens ("You open the door.")
→ Player moves to (5, 4)
→ Hunger/fuel tick, turn increments
```

### Example 4: Locked Door
```
Player at (5, 5), locked door at (5, 4)
Player presses ↑
→ Blocked ("The door is locked.")
→ No turn consumed
```

---

## Related Commands

- [Attack](./attack.md) - Triggered by bump-to-attack
- [Open Door](./open-door.md) - Manually open doors (when not moving through)
- [Stairs](./stairs.md) - Level traversal (uses `<` `>` keys)

---

**Architecture**: Command orchestrates MovementService, LightingService, FOVService, HungerService, DoorService, NotificationService, TurnService. Zero logic in command itself.
