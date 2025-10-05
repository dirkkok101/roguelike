# Reveal Map (Debug Command)

**Keybinding**: `v` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/RevealMapCommand/RevealMapCommand.ts`

---

## Purpose

**Development tool** - Reveals the entire current level map. Marks all tiles as explored instantly.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Map Reveal
1. Player presses `v`
2. All tiles on current level marked as `explored: true`
3. Entire level layout visible (rooms, corridors, doors, stairs)
4. **Does NOT reveal monsters** (only map layout)
5. **Does NOT change FOV** (visible tiles still based on light radius)

---

## Effects

| Aspect | Before | After |
|--------|--------|-------|
| **Explored Tiles** | Only visited tiles | All tiles |
| **Map Visibility** | Fog of war (unexplored = black) | Full map visible (dimmed) |
| **Monsters** | Only visible in FOV | Same (not revealed) |
| **FOV** | Normal (1-3 tiles) | Same (not expanded) |

---

## Visual Effect

**Before Reveal:**
```
###########
#.........#  (Only explored area visible)
#....@....#  @ = player, seen tiles only
#.........#
###########
```

**After Reveal:**
```
###########
#.........#########
#....@....#.......#  (Entire level visible)
#.........#...T...#  (T = Troll, only visible if in FOV)
#####################
```

---

## Usage

```
Player on Level 5, only explored starting room
Player presses: v
→ level.explored[all][all] = true
→ Entire level map revealed (dimmed, not in FOV)
→ Player can see:
  - All rooms and corridors
  - Door locations
  - Stairs up/down
  - But NOT monsters (unless in FOV)
```

---

## Testing Use Cases

1. **Dungeon Generation**: Verify level layout (rooms, corridors, doors)
2. **Connectivity**: Check all rooms connected via corridors/doors
3. **Stairs Placement**: Locate stairs up/down visually
4. **Secret Doors**: Find secret doors without searching
5. **Dead Ends**: Identify dead-end corridors

---

## Limitations

**Does NOT reveal:**
- Monsters (still need FOV to see them)
- Items on floor (still need FOV)
- Traps (future feature)

**Why?** Map reveal shows **static level geometry** only, not dynamic entities.

---

## Services Used

- **DebugService**: Map reveal logic (sets `explored` array to all `true`)

---

## Related Debug Commands

- [God Mode](./debug-godmode.md) - Invincibility
- [Debug Console](./debug-console.md) - Toggle debug console
- [FOV Overlay](./debug-fov.md) - Visualize FOV calculation

---

**Note**: This is a **debug tool only**. Equivalent to Scroll of Magic Mapping, but instant and free. Use for testing dungeon generation.
