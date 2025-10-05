# Kill All Monsters (Debug Command)

**Keybinding**: `K` (Shift+K) (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/KillAllMonstersCommand/KillAllMonstersCommand.ts`

---

## Purpose

**Development tool** - Instantly removes all monsters from the current level. Useful for clearing levels during testing.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Kill All
1. Player presses `K`
2. All monsters on current level removed (set `level.monsters = []`)
3. **No XP awarded** (debug shortcut, not real kills)
4. **No loot dropped** (monsters just vanish)
5. **No turn consumed** (instant effect)

---

## Effects

| System | Effect |
|--------|--------|
| **Monsters** | All removed from level |
| **XP** | NOT awarded (debug kill) |
| **Loot** | NOT dropped |
| **Turn** | Not incremented |
| **Message Log** | No messages (silent operation) |

---

## Usage

```
Level 5 with 8 monsters (Trolls, Orcs, Zombies)
Player presses: K
→ level.monsters: [8 monsters] → []
→ Level now empty (no monsters)
→ No XP gained
→ Safe to explore
```

---

## Testing Use Cases

1. **Exploration Testing**: Clear level to test navigation without combat
2. **Item Testing**: Find items without monster interference
3. **Level Generation**: Verify level layout without monsters blocking view
4. **Performance**: Test game without monster AI overhead
5. **Quest Testing**: Reach stairs/Amulet without fighting

---

## Comparison: Debug Kill vs Real Kill

| Aspect | Debug Kill (K) | Real Kill (Combat) |
|--------|----------------|---------------------|
| **Monsters** | All removed | One at a time |
| **XP** | None awarded | XP per kill |
| **Loot** | None dropped | Monsters drop items (future) |
| **Turns** | Instant (0 turns) | Many turns (combat) |
| **Use case** | Testing | Gameplay |

---

## Safety

**⚠️ Cheating!** This command is a cheat tool:
- Bypasses combat entirely
- No XP gain (won't level up)
- Only for testing, not real play

**Recommendation**: Use for testing dungeon generation, not for "winning" the game!

---

## Services Used

- **DebugService**: Monster removal logic (sets `level.monsters = []`)

---

## Related Debug Commands

- [Spawn Monster](./debug-spawn.md) - Add monsters (opposite of kill)
- [Wake Monsters](./debug-wake.md) - Wake all monsters (make them aggressive)
- [God Mode](./debug-godmode.md) - Invincibility (survive monsters)
- [Reveal Map](./debug-reveal.md) - Reveal level (see all monsters)
- [AI Overlay](./debug-ai.md) - Visualize monster states

---

**Note**: This is a **debug tool only**. Use for testing level generation and navigation, not for actual gameplay!
