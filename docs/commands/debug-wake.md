# Wake All Monsters (Debug Command)

**Keybinding**: `M` (Shift+M) (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/WakeAllMonstersCommand/WakeAllMonstersCommand.ts`

---

## Purpose

**Development tool** - Wakes all sleeping monsters on the current level instantly. Forces them into `HUNTING` state.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

**⚠️ Conflict**: In normal gameplay, `M` shows message history. This command only works in debug mode.

---

## Behavior

### Wake All
1. Player presses `M` (in debug mode)
2. All monsters on current level set to `HUNTING` state
3. Monsters immediately start pathfinding toward player
4. **No turn consumed** (instant effect)

---

## Monster State Changes

| Before | After |
|--------|-------|
| `SLEEPING` | `HUNTING` |
| `WANDERING` | `HUNTING` (future state) |
| `HUNTING` | `HUNTING` (no change) |
| `FLEEING` | `HUNTING` (stops fleeing) |

---

## Effects

| Aspect | Before | After |
|--------|--------|-------|
| **Monster State** | SLEEPING (inactive) | HUNTING (chasing player) |
| **Pathfinding** | None | A* pathfinding toward player |
| **Movement** | Stationary | Moving toward player each turn |
| **Aggression** | Passive | Aggressive |

---

## Usage

```
Level 5 with 8 sleeping monsters
Player in starting room
Player presses: M
→ All 8 monsters set to HUNTING
→ Monsters begin pathfinding toward player
→ (Dangerous! Use God Mode for safety)
```

---

## Testing Use Cases

1. **AI Testing**: Test monster pathfinding and group behavior
2. **Combat Testing**: Test fighting multiple monsters simultaneously
3. **Performance**: Test game performance with many active monsters
4. **Pathfinding**: Verify A* pathfinding works across entire level
5. **Fleeing Behavior**: Test Coward AI monsters fleeing (future)

---

## Safety Warning

**⚠️ Dangerous!** Waking all monsters creates mass combat scenario:
- 8+ monsters hunting player simultaneously
- Player can be overwhelmed quickly
- **Recommendation**: Use [God Mode](./debug-godmode.md) first!

---

## Services Used

- **DebugService**: Monster state manipulation (sets all `state: HUNTING`)

---

## Related Debug Commands

- [Spawn Monster](./debug-spawn.md) - Add more monsters for testing
- [Kill Monsters](./debug-kill.md) - Remove all monsters (undo wake)
- [God Mode](./debug-godmode.md) - Invincibility (recommended before waking)
- [AI Overlay](./debug-ai.md) - Visualize monster states (verify wake worked)
- [Path Overlay](./debug-path.md) - Show pathfinding paths

---

**Note**: This is a **debug tool only**. Use carefully - waking all monsters creates dangerous situations!
