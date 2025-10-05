# TurnService

**Location**: `src/services/TurnService/TurnService.ts`
**Dependencies**: None
**Test Coverage**: Turn increment, turn retrieval

---

## Purpose

Centralized **turn counter management** for the turn-based game loop. Standardizes turn increment across all 26 commands, replacing inline `turnCount + 1` arithmetic.

---

## Public API

### `incrementTurn(state: GameState): GameState`
Increments turn counter by 1 (immutable).

**Usage**:
```typescript
return this.turnService.incrementTurn(state)
```

**Before (deprecated pattern)**:
```typescript
return { ...state, turnCount: state.turnCount + 1 }
```

**See**: [claude.md - TurnService Standardization](../claude.md#6-real-example-turnservice-standardization-fixed-in-commit-1902d9c)

---

### `getCurrentTurn(state: GameState): number`
Retrieves current turn count.

**Usage**:
```typescript
const turn = this.turnService.getCurrentTurn(state)
```

---

## Design Rationale

### Why Centralize Turn Logic?

**Problem**: 26 commands duplicated `turnCount + 1` arithmetic

**Solution**: Single service method standardizes pattern

**Benefits**:
- Eliminates duplication
- Single source of truth
- Easy to extend (future: turn-based effects, status decay)
- No arithmetic in commands (architectural compliance)

**Future Extensions** (Phase 3):
- Trigger turn-based effects (poison damage, regeneration)
- Status effect duration decrement
- Monster turn scheduling
- Time-based events (hunger tick, fuel consumption)

---

## Usage Pattern

**Standard Command Pattern**:
```typescript
// All commands end with:
return this.turnService.incrementTurn({
  ...state,
  player: updatedPlayer,
  // ... other updates
})
```

**Commands That Use TurnService**:
- MoveCommand, AttackCommand, PickUpCommand, DropCommand
- UseItemCommand, EquipCommand, UnequipCommand
- SearchCommand, OpenDoorCommand, CloseDoorCommand
- All 26 commands (100% adoption)

---

## Related Services

- **All Commands** - Use `incrementTurn()` at end of execution
- **MessageService** - Uses turn number for message timestamping
- **MonsterTurnService** - Coordinates monster turns with player turns (future)

---

## Implementation Reference

See `src/services/TurnService/TurnService.ts` (23 lines total)
