# FOV Debug Overlay (Debug Command)

**Keybinding**: `f` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/ToggleFOVDebugCommand/ToggleFOVDebugCommand.ts`

---

## Purpose

**Development tool** - Toggles visual overlay showing Field of View (FOV) calculation. Displays visible tiles in distinct color.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Toggle On
- FOV overlay appears
- Visible tiles highlighted (e.g., yellow tint)
- Updates each turn as player moves
- Clearly shows light radius coverage

### Toggle Off
- FOV overlay disappears
- Normal rendering resumes

---

## Visual Effect

**Normal Rendering:**
```
###########
#.........#
#....@....#  @ = player, normal colors
#.........#
###########
```

**FOV Overlay ON:**
```
###########
#░░░░░░░░░#  ░ = visible tiles (highlighted)
#░░░░@░░░░#  @ = player, visible area tinted
#░░░░░░░░░#
###########
```

---

## What It Shows

| Color/Tint | Meaning |
|------------|---------|
| **Yellow tint** | Tile is in FOV (visible this turn) |
| **Normal** | Tile NOT in FOV (out of range or blocked) |

**FOV Factors:**
- **Light radius**: 1 (torch), 2 (lantern), 3 (artifact)
- **Line of sight**: Walls, closed doors block FOV
- **Distance**: Tiles beyond light radius not visible

---

## Usage

```
Player with lantern (radius 2) in room
Player presses: f
→ state.showFOVDebug: false → true
→ FOV overlay appears
→ Tiles within 2 tiles of player highlighted
→ Walls/doors block FOV (shadowcasting)

Player moves
→ FOV recalculates
→ Overlay updates (follows player)
```

---

## Testing Use Cases

1. **FOV Algorithm**: Verify shadowcasting working correctly
2. **Light Radius**: Test torch (1), lantern (2), artifact (3) ranges
3. **Line of Sight**: Verify walls/doors block vision
4. **Corner Cases**: Test FOV around corners, in corridors
5. **Performance**: Monitor FOV recalculation speed

---

## FOV Calculation

**Algorithm**: Recursive Shadowcasting (8 octants)

**Steps**:
1. Start at player position
2. Cast rays in 8 directions (N, NE, E, SE, S, SW, W, NW)
3. Mark tiles within light radius as visible
4. Stop rays at walls/closed doors (shadowcasting)
5. Return set of visible cell positions

---

## Services Used

- **DebugService**: FOV debug overlay toggle
- **FOVService**: FOV calculation (visualized by overlay)

---

## Related Debug Commands

- [Path Overlay](./debug-path.md) - Show monster pathfinding
- [AI Overlay](./debug-ai.md) - Show monster AI states
- [Debug Console](./debug-console.md) - Show FOV cell count
- [Reveal Map](./debug-reveal.md) - Reveal entire level (separate from FOV)

---

**Note**: This is a **debug tool only**. Use to verify FOV calculation during development.
