# Search Command

**Keybinding**: `s`
**Consumes Turn**: Yes
**Implementation**: `src/commands/SearchCommand/SearchCommand.ts`

---

## Purpose

Searches adjacent tiles for hidden secrets: **secret doors** and **traps** (future). Essential for discovering hidden passages and alternate routes.

---

## Behavior

### Search Area
Searches all **8 adjacent tiles** (including diagonals):
```
███
█@█  @ = player
███  █ = searched tiles
```

### Discovery Chance
- **Base chance**: 50% per secret door/trap
- **Randomized**: Uses RandomService for deterministic testing
- **Per-tile**: Each adjacent tile rolled separately

### Outcomes

| Result | Message | Turn? |
|--------|---------|-------|
| **Secret found** | "You discover a secret door!" | Yes |
| **Nothing found** | "You search but find nothing." | Yes |
| **Already found** | "You search but find nothing." | Yes |

### Secret Door Discovery
When secret door is discovered:
1. Door's `discovered` property set to `true`
2. Door becomes visible on map (appears as `+`)
3. Door can now be opened (via `o` or moving into it)
4. Success message displayed

---

## Turn Side Effects

**Always consumes turn** (regardless of success):

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |

**Note**: Searching is risky - you spend a turn but might find nothing, giving monsters a chance to approach.

---

## Services Used

- **SearchService**: Secret detection, discovery chance calculation
- **DoorService**: Door discovery logic
- **MessageService**: Message log updates
- **TurnService**: Turn increment
- **RandomService**: Random chance rolls

---

## Special Rules

1. **Already Discovered**: Once a secret door is found, it stays discovered forever (persisted in level state)

2. **50% Chance**: Not guaranteed - you might need multiple searches in same area

3. **No Double-Discover**: Searching again near discovered secret yields "You search but find nothing."

4. **Future: Traps**: System designed to also discover traps (not yet implemented)

5. **Future: Perception**: High perception stat could increase discovery chance (not yet implemented)

---

## Code Flow

```
SearchCommand.execute()
├── SearchService.searchForSecrets(player, position, level)
│   ├── Get adjacent tiles (8 directions)
│   ├── For each tile:
│   │   ├── Check for secret door
│   │   └── If found and not discovered:
│   │       └── 50% chance to discover (RandomService)
│   │
│   └── Return { found, message, updatedLevel }
│
├── Update level in state
├── Add message (success or failure)
└── Increment turn
```

---

## Examples

### Example 1: Discover Secret Door
```
Player at (10, 10)
Secret door at (10, 9) - undiscovered
Player presses: s
→ RandomService returns: 0.3 (< 0.5, success!)
→ "You discover a secret door!"
→ Door.discovered: false → true
→ Door visible on map
→ Turn: 100 → 101
```

### Example 2: Nothing Found
```
Player at (10, 10)
No secrets nearby
Player presses: s
→ "You search but find nothing."
→ Turn: 100 → 101 (wasted turn)
```

### Example 3: Failed Search (Secret Nearby)
```
Player at (10, 10)
Secret door at (10, 9) - undiscovered
Player presses: s
→ RandomService returns: 0.7 (> 0.5, failed!)
→ "You search but find nothing."
→ Secret remains hidden
→ Turn: 100 → 101
Player presses: s (again)
→ RandomService returns: 0.2 (< 0.5, success!)
→ "You discover a secret door!"
```

### Example 4: Already Discovered
```
Player at (10, 10)
Secret door at (10, 9) - already discovered
Player presses: s
→ "You search but find nothing."
→ Turn: 100 → 101
```

---

## Tactical Use

Searching is a trade-off:
- **Risk**: Wastes turn, allowing monsters to approach
- **Reward**: Discover shortcuts, alternate routes, treasure rooms

**When to search:**
- Dead-end corridors (likely secret door)
- Suspiciously empty rooms (secret exit)
- When you have distance from monsters (safe to spend turn)
- When you've cleared level (search thoroughly for secrets)

**When NOT to search:**
- Monsters actively chasing you
- Low on health/food/light
- Open areas (secrets usually in dead ends)

---

## Secret Door Mechanics

Secret doors in the dungeon:
- **Placement**: Generated during dungeon creation (DungeonService)
- **Frequency**: ~10% of dead-end corridors have secret doors
- **Purpose**: Connect to hidden rooms, shortcuts, treasure vaults
- **Persistence**: Once discovered, stays discovered (saved in level state)

---

## Related Commands

- [Open Door](./open-door.md) - Open discovered secret doors
- [Move](./move.md) - Auto-opens discovered secret doors when moving through
- [Close Door](./close-door.md) - Close secret doors (after discovery)

---

**Architecture**: Command orchestrates SearchService (discovery logic, randomization), DoorService (door manipulation), MessageService (messages), TurnService (turn increment). All search logic lives in SearchService.
