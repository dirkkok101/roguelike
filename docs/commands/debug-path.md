# Path Debug Overlay (Debug Command)

**Keybinding**: `p` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/TogglePathDebugCommand/TogglePathDebugCommand.ts`

---

## Purpose

**Development tool** - Toggles visual overlay showing monster pathfinding paths. Displays A* paths from monsters to player.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Toggle On
- Pathfinding overlay appears
- Shows lines/dots from hunting monsters to player
- Updates each turn as monsters move
- Different colors for different monsters

### Toggle Off
- Pathfinding overlay disappears
- Normal rendering resumes

---

## Visual Effect

**Normal Rendering:**
```
###########
#.........#
#....@..T.#  @ = player, T = Troll
#.........#
###########
```

**Path Overlay ON:**
```
###########
#.........#
#....@··T.#  ·· = pathfinding path (Troll → Player)
#.........#
###########
```

---

## What It Shows

| Visual | Meaning |
|--------|---------|
| **Dots/Line** | A* path from monster to player |
| **Color-coded** | Different monsters = different colors |
| **No path** | Monster not hunting (sleeping/fleeing) |

**Pathfinding Info:**
- **Algorithm**: A* (A-star)
- **Heuristic**: Manhattan distance
- **Obstacles**: Walls, closed doors (monsters can open doors)
- **Updates**: Recalculated each turn (dynamic)

---

## Usage

```
Level 5 with 3 hunting monsters (Troll, Orc, Zombie)
Player presses: p
→ state.showPathDebug: false → true
→ Path overlay appears
→ See 3 paths (T → @, O → @, Z → @)
→ Paths update each turn as monsters move

Player moves to new room
→ Paths recalculate
→ Monsters reroute (A* finds new path)
```

---

## Testing Use Cases

1. **Pathfinding Verification**: Verify A* algorithm working
2. **Obstacle Avoidance**: Test monsters path around walls
3. **Performance**: Monitor pathfinding calculation speed
4. **AI Debugging**: See why monster can't reach player
5. **Door Handling**: Verify monsters open doors in path

---

## Pathfinding Details

**A\* Algorithm**:
- **Open List**: Tiles to explore (priority queue)
- **Closed List**: Tiles already explored
- **Heuristic**: Manhattan distance (|x1-x2| + |y1-y2|)
- **Cost**: G (distance from start) + H (heuristic to goal)

**Obstacles**:
- **Walls**: Impassable (path around)
- **Closed Doors**: Passable (monster can open)
- **Locked Doors**: Impassable (no key yet)
- **Other Monsters**: Passable (monsters can swap)

---

## Monster AI States

**When Paths Show**:
- `HUNTING` - Monster actively pathfinding to player
- `FLEEING` - Monster pathfinding AWAY from player (Coward AI)

**When Paths Don't Show**:
- `SLEEPING` - Monster not moving (no path needed)
- `WANDERING` - Random movement (no A* needed) - future

---

## Services Used

- **DebugService**: Path debug overlay toggle
- **MonsterAIService**: Pathfinding calculation (visualized by overlay)
- **PathfindingService**: A* algorithm implementation

---

## Related Debug Commands

- [FOV Overlay](./debug-fov.md) - Show field of view
- [AI Overlay](./debug-ai.md) - Show monster AI states
- [Wake Monsters](./debug-wake.md) - Force monsters to hunt (generate paths)
- [Debug Console](./debug-console.md) - Show monster count
- [Spawn Monster](./debug-spawn.md) - Add monsters for path testing

---

**Note**: This is a **debug tool only**. Use to verify monster pathfinding during development.
