# Stairs Command (Level Navigation)

**Keybinding**: `<` (up) / `>` (down)
**Consumes Turn**: Yes
**Implementation**: `src/commands/MoveStairsCommand/MoveStairsCommand.ts`

---

## Purpose

Navigates between dungeon levels. Essential for progressing deeper into the dungeon and returning to the surface with the Amulet of Yendor.

---

## Behavior

### Stairs Down (`>`)
Descends to the next deeper level.

**Requirements:**
- Must be standing on stairs down (`>` tile)
- Cannot exceed max depth (Level 26)

**Effects:**
1. Current level saved in state (preserves monsters, items, exploration)
2. Next level loaded (or generated if first visit)
3. Player spawns at stairs up (opposite end)
4. FOV recalculated for new position
5. Turn increments

### Stairs Up (`<`)
Ascends to the previous shallower level.

**Requirements:**
- Must be standing on stairs up (`<` tile)
- Cannot go above Level 1 (unless you have the Amulet)

**Victory Condition:**
If you ascend from Level 1 **with the Amulet of Yendor**:
- **Victory!** Game won!
- Message: "You have escaped with the Amulet of Yendor! You win!"
- Game over (`hasWon: true`, `isGameOver: true`)

**Without Amulet:**
- Blocked at Level 1
- Message: "You cannot go any higher! You need to find the Amulet first."

---

## Turn Side Effects

| System | Effect | Details |
|--------|--------|---------|
| **Turn** | Increments | Moving between levels costs a turn |
| **Monsters** | Act | On both the old and new levels |
| **Level Generation** | May trigger | If visiting level for first time |
| **FOV** | Recalculates | New position on new level |
| **Exploration** | Updates | New visible tiles marked as explored |
| **Hunger/Fuel** | **NOT consumed** | Stair travel doesn't tick hunger/fuel |

---

## Services Used

- **DungeonService**: Level generation (if first visit)
- **LevelService**: Spawn position calculation
- **FOVService**: FOV calculation, exploration tracking
- **LightingService**: Light radius calculation
- **MessageService**: Message log updates
- **VictoryService**: Victory condition check
- **TurnService**: Turn increment

---

## Level Persistence

**Critical mechanic**: Levels are **persistent**.

When you leave a level:
- Monster positions, HP, states saved
- Item positions saved
- Exploration map saved
- Door states saved

When you return:
- Everything exactly as you left it
- Monsters may have moved (if they were hunting you)
- Items still on ground

**Implementation**: Levels stored in `state.levels` Map (key: level number)

---

## Special Rules

1. **Must Be on Stairs**: Cannot use command unless standing on stairs tile

2. **Max Depth**: Cannot descend below Level 26 (hardcoded limit)

3. **Amulet Required**: Cannot ascend from Level 1 without Amulet

4. **Level Generation**: First visit to a level generates it via DungeonService

5. **Spawn Position**: Always spawn at opposite stairs (down → spawn at up, up → spawn at down)

6. **Victory Check**: Automatically checked after each level change

---

## Code Flow

```
MoveStairsCommand.execute()
├── Get current level
├── Validate player is on stairs
│   ├─ If NOT on stairs:
│   │   └── Message: "There are no stairs here." (no turn)
│   │
│   └─ If on stairs:
│       ├── Calculate new depth (currentLevel ± 1)
│       ├── Check depth limits (1-26)
│       │
│       └── moveToLevel(newDepth, direction)
│           ├── Check if level exists
│           ├─ If NOT exists:
│           │   └── Generate level (DungeonService)
│           │
│           ├── Calculate spawn position (opposite stairs)
│           ├── Update player position
│           ├── Compute FOV (FOVService)
│           ├── Update exploration (FOVService)
│           ├── Add level change message
│           ├── Increment turn (TurnService)
│           │
│           └─ Check victory condition (VictoryService)
│               └─ If player on Level 1 with Amulet:
│                   └── Victory! (hasWon: true)
```

---

## Examples

### Example 1: Descend Normal
```
Player on Level 5, standing on stairs down (>)
Player presses: >
→ "You descend to level 6."
→ Level 6 generates (first visit)
→ Player spawns at stairs up
→ FOV calculated
→ Turn: 100 → 101
```

### Example 2: Ascend Normal
```
Player on Level 6, standing on stairs up (<)
Player presses: <
→ "You climb to level 5."
→ Level 5 loaded from state (monsters/items preserved)
→ Player spawns at stairs down
→ Turn: 101 → 102
```

### Example 3: Victory!
```
Player on Level 1, standing on stairs up
Player has Amulet of Yendor
Player presses: <
→ "You climb to level 0." (briefly)
→ "You have escaped with the Amulet of Yendor! You win!"
→ hasWon: true
→ isGameOver: true
```

### Example 4: Blocked (No Amulet)
```
Player on Level 1, standing on stairs up
Player does NOT have Amulet
Player presses: <
→ "You cannot go any higher! You need to find the Amulet first."
→ No turn consumed
```

### Example 5: Not on Stairs
```
Player on Level 5, standing on floor tile
Player presses: >
→ "There are no stairs down here."
→ No turn consumed
```

### Example 6: Max Depth
```
Player on Level 26, standing on stairs down
Player presses: >
→ "You cannot go any deeper!"
→ No turn consumed
```

---

## Dungeon Structure

The roguelike has **26 levels total**:

| Levels | Difficulty | Notes |
|--------|------------|-------|
| 1-5 | Easy | Weak monsters (E, K, B, S) |
| 6-10 | Medium | Mixed difficulty, **Amulet on 10** |
| 11-15 | Hard | Strong monsters (D, T, V) |
| 16-20 | Very Hard | Boss monsters common |
| 21-26 | Extreme | Hardest content |

**Quest**: Descend to Level 10, retrieve Amulet, return to Level 1.

---

## Related Commands

- [Move](./move.md) - Walk to stairs before using this command
- [Search](./search.md) - Find secret stairs (future feature)

---

**Architecture**: Command orchestrates DungeonService (generation), LevelService (spawn logic), FOVService (visibility), LightingService (light radius), VictoryService (win check), MessageService (messages), TurnService (turn increment). Level persistence handled via `state.levels` Map.
