# ContextService

**Location**: `src/services/ContextService/ContextService.ts`
**Dependencies**: Multiple (analyzes game state)
**Test Coverage**: Command availability, context-aware suggestions

---

## Purpose

Provides **contextual help** and **command suggestions** based on current game state. Helps new players discover available actions.

---

## Public API

### `getAvailableCommands(state: GameState): Command[]`
Returns list of commands available in current context.

**Filters based on**:
- Player state (alive, has items, equipped gear)
- Environment (doors nearby, items on floor, stairs)
- Game state (inventory space, hunger level)

**Usage**: Display help menu showing only relevant commands

---

### `getSuggestions(state: GameState, position: Position): string[]`
Generates context-aware suggestions for player.

**Examples**:
- `"Press 's' to search for secret doors"` (when near walls)
- `"Press ',' to pick up items"` (when standing on items)
- `"Press 'e' to eat food"` (when hungry)
- `"Press 'o' to open the door"` (when next to closed door)

**Usage**: Display in status bar or help panel

---

## Design Rationale

### Why Context-Aware Help?

**New Player Experience**:
- Shows relevant commands (not overwhelming 26-command list)
- Teaches mechanics through suggestions
- Reduces need for external documentation

**Quality of Life**:
- Reminds about available actions
- Highlights important opportunities (secret doors, healing)
- Prevents missed interactions

---

## Future Implementation

**Current Status**: Planned (Phase 7 - UI Polish)

**Planned Features**:
- Tutorial mode with progressive command unlocking
- Hint system for puzzle-like situations
- Action history tracking (suggest repeated actions)
- Smart cooldown (don't spam same suggestion)

---

## Related Services

- **NotificationService** - Alerts about environment (complementary)
- **All Commands** - Provides command metadata for filtering

---

## Implementation Reference

See `src/services/ContextService/ContextService.ts` (pending implementation)
