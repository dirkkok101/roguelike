# Spawn Monster (Debug Command)

**Keybinding**: `m` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/SpawnMonsterCommand/SpawnMonsterCommand.ts`

---

## Purpose

**Development tool** - Spawns a specific monster at or near the player's position for testing combat and AI.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Monster Spawning
1. Player presses `m`
2. (Currently hardcoded to spawn 'T' - Troll)
3. Monster spawns at player position or nearest empty tile
4. Monster state: `SLEEPING` (default spawn state)

**Future**: Modal selection for monster letter (A-Z)

---

## Spawn Location

**Priority**:
1. **Player position** (if empty)
2. **Adjacent tile** (if player position occupied)
3. **Nearby tile** (within 3 tiles, first empty)

**If no empty tiles found**: Spawn fails silently (no message)

---

## Usage

```
Player at (10, 10)
Player presses: m
→ Troll spawns at (10, 10) or nearby
→ Troll state: SLEEPING
→ Troll HP: 75/75
→ Troll awake if player moves (enters FOV)
```

---

## Monster Letters (A-Z)

| Letter | Monster | Difficulty |
|--------|---------|------------|
| **A** | Aquator | Medium |
| **B** | Bat | Easy |
| **C** | Centaur | Medium |
| **D** | Dragon | Boss |
| **E** | Emu | Easy |
| **... (22 more)** | ... | ... |
| **T** | Troll | Hard |
| **Z** | Zombie | Medium |

**Current Implementation**: Spawns 'T' (Troll) only. Letter selection planned for future.

---

## Testing Use Cases

1. **Combat Testing**: Spawn monsters to test combat mechanics
2. **AI Testing**: Verify monster pathfinding and behavior
3. **XP Testing**: Kill monsters to test leveling system
4. **Monster Variety**: Test different monster types (future)
5. **Difficulty Balancing**: Spawn tough monsters to test player survival

---

## Spawn Limitations

**Cannot spawn:**
- If no empty tiles nearby (spawn fails)
- On walls, doors, or occupied tiles
- Beyond map boundaries

**Spawn State:**
- Always spawns as `SLEEPING` (not hunting)
- Wakes when player enters its FOV
- Has full HP (not damaged)

---

## Services Used

- **DebugService**: Monster spawning logic, position calculation

---

## Related Debug Commands

- [Wake Monsters](./debug-wake.md) - Wake all sleeping monsters
- [Kill Monsters](./debug-kill.md) - Remove all monsters from level
- [God Mode](./debug-godmode.md) - Invincibility for safe testing
- [AI Overlay](./debug-ai.md) - Visualize monster AI states

---

**Note**: This is a **debug tool only**. Use for testing combat and monster AI systems.
