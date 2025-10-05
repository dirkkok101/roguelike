# Save Command

**Keybinding**: `S` (Shift+S)
**Consumes Turn**: No
**Implementation**: `src/commands/SaveCommand/SaveCommand.ts`

---

## Purpose

Manually saves the current game state to browser localStorage. Allows you to continue your game later.

---

## Behavior

### Normal Save
1. Player presses `S`
2. Game state serialized to JSON
3. Saved to `localStorage` (key: "roguelike-save")
4. Success message: "Game saved successfully."
5. **No turn consumed** (instant action)

### Auto-Save
The game also auto-saves:
- After each turn (continuous backup)
- Before quitting (via QuitCommand)
- On page unload (browser close)

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Game Over** | (No message, command ignored) | No |
| **Storage Full** | "Failed to save game. Storage may be full." | No |

---

## Turn Side Effects

**Does NOT consume turn:**

| System | Effect |
|--------|--------|
| **Turn** | Not incremented |
| **Monsters** | Do NOT act |
| **Hunger/Fuel** | Not consumed |
| **LocalStorage** | Game state saved |

---

## Services Used

- **LocalStorageService**: Save game serialization, storage management
- **MessageService**: Success/failure messages

---

## What Gets Saved?

The entire `GameState` object:
- **Player**: HP, position, inventory, equipment, stats, hunger, XP
- **Levels**: All visited levels (monsters, items, doors, exploration)
- **Current Level**: Which level you're on
- **Turn Count**: Total turns elapsed
- **Messages**: Message log
- **Seed**: Random seed (for level regeneration)
- **Flags**: hasAmulet, hasWon, isGameOver, debugMode

**Not Saved:**
- UI state (modals, debug overlays)
- Services (recreated on load)

---

## Special Rules

1. **Manual + Auto**: Manual save (`S`) works alongside auto-save (both use same slot)

2. **Single Save Slot**: Only one save per browser (no multiple saves)

3. **Game Over Prevention**: Cannot save if `isGameOver: true` (prevents save-scumming death)

4. **Instant Action**: Saving does not advance game (no turn consumed)

5. **Browser Storage**: Save stored in `localStorage` (persists across browser sessions)

---

## Code Flow

```
SaveCommand.execute()
├── Check if game is over
│   └─ If isGameOver:
│       └── Return state (no save)
│
├── Try save via LocalStorageService
│   ├── LocalStorageService.saveGame(state)
│   │   ├── Serialize state to JSON
│   │   └── Write to localStorage["roguelike-save"]
│   │
│   ├─ If success:
│   │   └── Message: "Game saved successfully."
│   │
│   └─ If error (catch):
│       └── Message: "Failed to save game. Storage may be full."
│
└── Return state (no turn increment)
```

---

## Examples

### Example 1: Normal Save
```
Player on Level 5, healthy
Player presses: S
→ "Game saved successfully."
→ Game state written to localStorage
→ No turn consumed (instant)
```

### Example 2: Save During Combat
```
Player fighting Orc (Orc's turn next)
Player presses: S
→ "Game saved successfully."
→ State saved (including Orc position/HP)
→ No turn consumed
→ Combat continues normally
```

### Example 3: Game Over (Blocked)
```
Player died from starvation (isGameOver: true)
Player presses: S
→ (No message, command ignored)
→ Cannot save after death
```

### Example 4: Storage Full (Rare)
```
Browser localStorage full (quota exceeded)
Player presses: S
→ "Failed to save game. Storage may be full."
→ Save failed
→ (Clear browser data or play without saving)
```

---

## Save File Location

**Browser**: Saves stored in browser's `localStorage`

**Path**: `localStorage["roguelike-save"]`

**Format**: JSON string (serialized GameState)

**Size**: ~100-500 KB (depends on how many levels visited)

**Clearing Save**:
- Browser DevTools → Application → Local Storage → Delete "roguelike-save"
- Or: Start New Game (overwrites save)

---

## Save Scumming Prevention

**Save Scumming** = Save before risky action, reload if it fails

**Prevention Mechanisms:**
1. **Auto-Save**: Game saves after each turn (can't undo actions)
2. **Single Save Slot**: Cannot create multiple backup saves
3. **No Death Save**: Cannot save after game over (prevents "reload from death")

**Philosophy**: Roguelikes embrace permadeath - no take-backs!

---

## Related Commands

- [Quit](./quit.md) - Auto-saves before quitting
- [Move](./move.md) - Auto-saves after each turn

---

**Architecture**: Command orchestrates LocalStorageService (save serialization, storage management), MessageService (messages). No turn increment. Save/load logic isolated in LocalStorageService (testable, reusable).
