# AI Debug Overlay (Debug Command)

**Keybinding**: `n` (debug mode only)
**Consumes Turn**: No
**Implementation**: `src/commands/ToggleAIDebugCommand/ToggleAIDebugCommand.ts`

---

## Purpose

**Development tool** - Toggles visual overlay showing monster AI states. Displays each monster's current behavior state.

**⚠️ Debug only**: Only available when `debugMode: true` in game state.

---

## Behavior

### Toggle On
- AI state overlay appears
- Shows text labels above/near monsters
- Displays AI state (SLEEPING, HUNTING, FLEEING, etc.)
- Updates each turn as monsters change states

### Toggle Off
- AI overlay disappears
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

**AI Overlay ON:**
```
###########
#.........#
#....@..T.#  T [HUNTING] (state label shown)
#.........#
###########
```

---

## AI States

| State | Meaning | Behavior |
|-------|---------|----------|
| **SLEEPING** | Monster unaware | Stationary, no action |
| **HUNTING** | Chasing player | A* pathfind toward player |
| **FLEEING** | Running away | A* pathfind away from player (Coward AI) |
| **WANDERING** | Random movement | Future state (not yet implemented) |
| **STATIONARY** | Never moves | Future state (Venus Flytrap AI) |

---

## Monster AI Profiles

**7 AI Types** (see [Advanced Systems - Monster AI](../../systems-advanced.md#monster-ai)):

| AI Profile | Behavior | Example Monsters |
|------------|----------|------------------|
| **SMART** | A* pathfinding | Dragon, Jabberwock |
| **SIMPLE** | Greedy movement (toward player) | Zombie, Troll |
| **GREEDY** | Prioritizes gold | Orc |
| **ERRATIC** | 50% random movement | Bat, Kestrel |
| **THIEF** | Steal and flee | Leprechaun, Nymph |
| **STATIONARY** | Don't move | Venus Flytrap |
| **COWARD** | Flee at low HP | Vampire |

---

## Usage

```
Level 5 with monsters:
- Troll (SLEEPING)
- Dragon (HUNTING)
- Vampire (FLEEING, low HP)

Player presses: n
→ state.showAIDebug: false → true
→ AI overlay appears
→ Labels show:
  - Troll [SLEEPING]
  - Dragon [HUNTING]
  - Vampire [FLEEING]

Player attacks Troll
→ Troll wakes
→ Label updates: Troll [HUNTING]
```

---

## State Transitions

**Typical Flow**:
1. **SLEEPING** (spawns asleep)
   ↓ (player enters FOV)
2. **HUNTING** (chases player)
   ↓ (Coward AI at low HP)
3. **FLEEING** (runs away)
   ↓ (killed)
4. **DEAD** (removed from level)

---

## Testing Use Cases

1. **AI Behavior**: Verify monsters transition between states
2. **Wake Detection**: Test monster wakes when player enters FOV
3. **Fleeing Logic**: Verify Coward AI flees at low HP
4. **Sleeping Monsters**: Test monsters stay asleep until detected
5. **AI Profiles**: Verify SMART vs SIMPLE vs ERRATIC behavior

---

## Wake Conditions

Monsters wake from SLEEPING when:
- **Player enters monster's FOV** (monster sees player)
- **Player attacks monster** (monster takes damage)
- **Nearby monster wakes** (future - sound propagation)

---

## Services Used

- **DebugService**: AI debug overlay toggle
- **MonsterAIService**: AI state management (visualized by overlay)

---

## Related Debug Commands

- [Path Overlay](./debug-path.md) - Show monster pathfinding (complements AI state)
- [FOV Overlay](./debug-fov.md) - Show field of view (wake detection range)
- [Wake Monsters](./debug-wake.md) - Force all monsters to HUNTING state
- [Spawn Monster](./debug-spawn.md) - Add monsters for AI testing
- [Debug Console](./debug-console.md) - Show monster count

---

**Note**: This is a **debug tool only**. Use to verify monster AI behavior during development.
