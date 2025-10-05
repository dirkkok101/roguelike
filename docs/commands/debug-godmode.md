# God Mode (Debug Command)

**Keybinding**: `g` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/ToggleGodModeCommand/ToggleGodModeCommand.ts`

---

## Purpose

**Development tool** - Toggles invincibility mode for testing. Makes player immune to damage, hunger, and fuel consumption.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Toggle On
- Player becomes invincible
- **No damage** from monsters
- **Infinite hunger** (never starves)
- **Infinite light fuel** (torches/lanterns never run out)
- Message: "God mode enabled" (debug console)

### Toggle Off
- Returns to normal gameplay
- Takes damage normally
- Hunger/fuel resume consumption
- Message: "God mode disabled" (debug console)

---

## Effects

| System | God Mode On | Normal |
|--------|-------------|--------|
| **Damage** | Immune (HP never decreases) | Normal combat |
| **Hunger** | Never decreases | Ticks down each turn |
| **Light Fuel** | Never decreases | Ticks down each turn |
| **Starvation** | Cannot die | Dies at 0 hunger |
| **Combat Death** | Cannot die | Dies at 0 HP |

---

## Usage

```
Player presses: g
→ state.godMode: false → true
→ "God mode enabled" (console)
→ Player now invincible

Player presses: g (again)
→ state.godMode: true → false
→ "God mode disabled" (console)
→ Normal gameplay resumes
```

---

## Testing Use Cases

1. **Exploration**: Explore deep dungeon without combat risk
2. **Level Testing**: Test dungeon generation without dying
3. **Monster Testing**: Test monster AI without threat
4. **Quest Testing**: Verify Amulet pickup/victory without grinding
5. **Bug Reproduction**: Isolate bugs without permadeath

---

## Services Used

- **DebugService**: God mode toggle, state management

---

## Related Debug Commands

- [Debug Console](./debug-console.md) - Toggle debug console (shows god mode status)
- [Reveal Map](./debug-reveal.md) - Reveal entire level
- [Kill Monsters](./debug-kill.md) - Remove all monsters

---

**Note**: This is a **debug tool only**. Not available in normal gameplay. Use for testing, not for actual play!
