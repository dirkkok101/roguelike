# Save System

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Controls](./10-controls.md)

---

## 1. LocalStorage Strategy

### Storage Location

**Browser LocalStorage**: Client-side persistence

**Key Format**: `roguelike_save_${gameId}`

**Data Format**: JSON-serialized GameState

**See**: [Architecture - GameState](../architecture.md#gamestate) for complete structure

---

## 2. Save Triggers

### Manual Save

**Command**: Press `S` key

**Action**:
- Serialize current GameState to JSON
- Write to LocalStorage
- Show confirmation: "Game saved."

**Use case**: Save before quitting, before risky action

---

### Auto-Save on Quit

**Command**: Press `Q` key

**Action**:
1. Prompt: "Save before quitting? (y/n)"
2. If yes: Auto-save, then quit
3. If no: Quit without saving (risky!)

**Purpose**: Prevents accidental loss of progress

---

### Auto-Save Every N Turns

**Trigger**: Every 10 turns (configurable)

**Action**: Silent background save (no message)

**Purpose**:
- Prevent loss from browser crash
- Reduce manual save burden
- No interruption to gameplay

---

## 3. Load Process

### On Game Start

**Check for existing save**:
1. Look for LocalStorage key
2. If found: Show "Continue" option on main menu
3. If not found: Show "New Game" only

### Loading Saved Game

**Action**:
1. Deserialize JSON from LocalStorage
2. Reconstruct full GameState
3. Resume at exact saved position
4. Message: "Game loaded. Welcome back!"

**State Includes**:
- Player position, stats, inventory, equipment
- All dungeon levels (terrain, monsters, items)
- Turn count, message history
- Seed (for reproducibility)

---

## 4. Permadeath Implementation

**Inspiration**: **Original Rogue (1980)** - Save deletion on death prevents save scumming.

### On Player Death

**Sequence**:
1. Player HP reaches 0
2. Display death screen with stats summary
3. **Delete save from LocalStorage** (permanent)
4. Offer "New Game" option

**Message**: "You died! Your adventure has ended."

**No continues, no respawns, no second chances**

---

### No Save Scumming

**Save overwritten each action/turn**:
- Cannot reload earlier state
- Every decision is permanent
- Death is final

**Design Goal**: Stakes and consequences create tension

---

## 5. Save Data Structure

### GameState Contents

```
{
  player: { ... }          // Position, stats, inventory, equipment
  levels: [ ... ]          // All 10 dungeon levels
  currentLevel: 1          // Active level number
  turnCount: 42            // Total turns elapsed
  messages: [ ... ]        // Message history
  seed: "abc123def"        // RNG seed
  gameId: "unique-id"      // Save file identifier
}
```

**See**: [Architecture](../architecture.md#data-structures) for complete type definitions

---

## 6. Edge Cases

### Browser Storage Limits

**LocalStorage limit**: ~5-10MB (varies by browser)

**Mitigation**:
- Compact JSON (no formatting)
- Single save slot (overwrite old)
- Compress if needed (future)

### Multiple Tabs/Windows

**Risk**: Conflicting saves from multiple tabs

**Mitigation** (Phase 3+):
- Detect multiple tabs
- Warn user: "Game already open in another tab"
- Lock save file

### Browser Crash

**Risk**: Unsaved progress lost

**Mitigation**:
- Auto-save every 10 turns
- Minimal progress loss (max 10 turns)

---

## 7. Security & Privacy

### Client-Side Only

**No server**: All saves local to browser

**Privacy**: No data leaves user's machine

**Portability**: Cannot transfer saves between browsers/devices (v1)

### Save File Tampering

**Risk**: Players could edit LocalStorage JSON

**Mitigation** (future):
- Checksum validation
- Encrypt save data
- Detect tampering

**Current**: Trust-based (single-player game)

---

## 8. Future Enhancements

**See**: [Future Enhancements](./14-future.md)

- **Cloud saves**: Sync across devices
- **Multiple save slots**: 3-5 parallel games
- **Replay system**: Save/share game seeds
- **Export/Import**: Transfer saves between browsers
- **Compress saves**: Reduce storage footprint

---

## Cross-References

- **[Character](./02-character.md)** - Permadeath mechanics
- **[Controls](./10-controls.md)** - Save/quit commands (S, Q)
- **[Architecture](../architecture.md#gamestate)** - GameState structure

---

## Influences

- **Original Rogue (1980)**: Permadeath, save deletion on death
- Web LocalStorage patterns (client-side persistence)
