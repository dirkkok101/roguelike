# Debug Console (Debug Command)

**Keybinding**: `~` (tilde) (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.ts`

---

## Purpose

**Development tool** - Toggles visibility of the debug console overlay. Shows internal game state for debugging.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Toggle On
- Debug console appears (overlay on game screen)
- Shows real-time game state information
- Updates each turn

### Toggle Off
- Debug console hides
- Game screen returns to normal

---

## Console Information

The debug console displays:

| Section | Information |
|---------|-------------|
| **Player** | HP, position, strength, level, XP |
| **Hunger** | Current food units, hunger status |
| **Light** | Light source type, fuel, radius |
| **Level** | Current depth, monster count, item count |
| **Turn** | Turn number |
| **Flags** | godMode, hasAmulet, isGameOver |
| **FOV** | Visible cells count |
| **Debug** | Active debug overlays (FOV, Path, AI) |

---

## Usage

```
Player presses: ~
→ state.showDebugConsole: false → true
→ Debug console appears (top-left overlay)

Player presses: ~ (again)
→ state.showDebugConsole: true → false
→ Debug console hides
```

---

## Example Console Output

```
═══════════════════════════════
 DEBUG CONSOLE
═══════════════════════════════
 Player: HP 25/25 | Pos (10,5)
 Strength: 16 | Level: 3 | XP: 45/60
 Hunger: 800 units | Status: OK
 Light: Lantern | Fuel: 450/500 | Radius: 2
 Level: 5 | Monsters: 8 | Items: 12
 Turn: 234
 God Mode: ON | Amulet: NO
 FOV Cells: 12
 Debug Overlays: FOV=ON, Path=OFF, AI=OFF
═══════════════════════════════
```

---

## Testing Use Cases

1. **State Inspection**: Monitor player stats in real-time
2. **Fuel Tracking**: Watch light fuel deplete during movement
3. **Hunger Debugging**: Verify hunger system working correctly
4. **Monster Count**: Track monsters spawned/killed
5. **Flag Verification**: Check godMode, hasAmulet states

---

## Services Used

- **DebugService**: Console toggle, state retrieval

---

## Related Debug Commands

- [God Mode](./debug-godmode.md) - Invincibility (shown in console)
- [Reveal Map](./debug-reveal.md) - Reveal level
- [FOV Overlay](./debug-fov.md) - FOV visualization
- [Path Overlay](./debug-path.md) - Pathfinding visualization
- [AI Overlay](./debug-ai.md) - AI state visualization

---

**Note**: This is a **debug tool only**. Use for development and testing, not normal gameplay.
