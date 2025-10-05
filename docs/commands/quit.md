# Quit Command

**Keybinding**: `Q` (Shift+Q)
**Consumes Turn**: No
**Implementation**: `src/commands/QuitCommand/QuitCommand.ts`

---

## Purpose

Saves the current game and quits to the main menu. Safe way to exit the game mid-session.

---

## Behavior

### Normal Quit
1. Player presses `Q`
2. Game state auto-saved to localStorage
3. Page reloads (returns to main menu)
4. Game can be resumed via "Continue" button

### Game Over Quit
If player is dead (`isGameOver: true`):
1. No save occurs (permadeath - save already deleted)
2. Page reloads
3. "Continue" button disabled (must start new game)

---

## Turn Side Effects

**Does NOT consume turn:**

| System | Effect |
|--------|--------|
| **Turn** | Not incremented |
| **Monsters** | Do NOT act |
| **Hunger/Fuel** | Not consumed |
| **Auto-Save** | Triggered (unless game over) |
| **Page** | Reloads to main menu |

---

## Services Used

- **LocalStorageService**: Auto-save before quitting

---

## Special Rules

1. **Auto-Save**: Always saves before quitting (no need to manually save)

2. **No Confirmation**: Quit is instant (no "Are you sure?" prompt - already auto-saved)

3. **Game Over Skip**: If dead, skips save (permadeath already deleted save file)

4. **Page Reload**: Uses `window.location.reload()` to return to main menu

5. **Progress Preserved**: Everything saved (monsters, items, exploration)

---

## Code Flow

```
QuitCommand.execute()
├── Check if game is over
│   └─ If isGameOver:
│       └── Skip save (game already over)
│
├─ If not game over:
│   ├── Try auto-save via LocalStorageService
│   │   ├── LocalStorageService.saveGame(state)
│   │   │   ├── Serialize state to JSON
│   │   │   └── Write to localStorage["roguelike-save"]
│   │   │
│   │   ├─ If success:
│   │   │   └── console.log("Auto-saved before quit")
│   │   │
│   │   └─ If error:
│   │       └── console.error("Auto-save failed:", error)
│   │
│   └── Reload page (window.location.reload())
│
└── (Never returns - page reloads)
```

---

## Examples

### Example 1: Normal Quit
```
Player on Level 5, HP: 20/25
Player presses: Q
→ Game state auto-saved
→ Page reloads → Main menu appears
→ "Continue" button available
→ Click "Continue" → Resume at Level 5, HP 20/25
```

### Example 2: Quit After Death
```
Player dies from starvation (isGameOver: true)
Player presses: Q
→ No save (permadeath)
→ Page reloads → Main menu
→ "Continue" button grayed out (no save found)
→ Must start New Game
```

### Example 3: Quit During Combat
```
Player fighting Dragon
Dragon has 50 HP, Player has 15 HP
Player presses: Q
→ Game state saved (Dragon position/HP preserved)
→ Page reloads
→ Click "Continue"
→ Resume in same combat state (Dragon still there!)
```

---

## Main Menu Flow

After quitting:

**Main Menu Options:**
- **Continue** - Resume saved game (if save exists)
- **New Game** - Start fresh (overwrites save)
- **Settings** - Adjust game settings (future)

**Resume Behavior:**
- Loads `GameState` from localStorage
- Recreates services
- Restores exact game state (position, monsters, items)

---

## Quit vs Save

| Aspect | Quit (Q) | Save (S) |
|--------|----------|----------|
| **Auto-saves** | Yes | No (manual) |
| **Returns to menu** | Yes | No |
| **Consumes turn** | No | No |
| **Use case** | Exit game | Backup progress |

**Typical Workflow:**
1. Play game
2. Press `S` periodically (manual backups - optional)
3. Press `Q` when done (auto-saves + quits)
4. Later: Click "Continue" (resume)

---

## Save Deletion (Permadeath)

When player dies:
1. Game over message displayed
2. Save file deleted (permadeath)
3. Pressing `Q` reloads to main menu
4. "Continue" button disabled (no save)
5. Must start New Game

**Why?** Roguelike tradition - death is permanent!

---

## Related Commands

- [Save](./save.md) - Manual save (without quitting)

---

**Architecture**: Command orchestrates LocalStorageService (auto-save). Uses `window.location.reload()` for quit (returns to main menu). Game over check prevents save after death (permadeath enforcement).
