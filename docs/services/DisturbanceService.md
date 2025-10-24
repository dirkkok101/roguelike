# DisturbanceService

**Location**: `src/services/DisturbanceService/DisturbanceService.ts`
**Dependencies**: None
**Test Coverage**: Safety checks, combat threats, corridor navigation

---

## Purpose

Detects conditions that should stop player running. Checks safety (HP/hunger/light/status), combat threats (new monsters, damage), and navigation (corridor turns, junctions).

---

## Public API

### checkDisturbance(state: GameState, runState: RunState): DisturbanceResult

Checks if running should stop due to environmental changes.

**Priority**: Safety > Combat > Navigation

**Returns**:
```typescript
interface DisturbanceResult {
  disturbed: boolean       // Stop running?
  reason?: string          // User-facing message
  newDirection?: Direction // Auto-turn for corridors
}
```

**Safety Checks** (highest priority):
- HP below 30%: "Your health is low!"
- Hunger below 300: "You are very hungry!"
- No light source: "You have no light!"
- Status effects (confused, blind, paralyzed, held)

**Combat Threat Checks**:
- New monster in FOV: "Monster appears!"
- Player damaged (HP decreased): "You have been hit!"

**Navigation Checks** (corridor-only):
- Door directly ahead: "You reach a door."
- Corridor turn (one perpendicular option): Auto-turn with `newDirection`
- Corridor junction (multiple options): "The corridor branches."

**Room Behavior**: Navigation checks skipped in rooms (open floors expected).

---

## Integration Notes

**Corridor Auto-Turn**:
```typescript
const result = disturbanceService.checkDisturbance(state, runState)

if (result.newDirection) {
  // Automatically turn in corridor
  runState.direction = result.newDirection
}

if (result.disturbed) {
  // Stop running
  if (result.reason) {
    addMessage(state, result.reason)
  }
  return { ...state, isRunning: false }
}
```

**RunState Requirements**:
```typescript
interface RunState {
  direction: Direction
  startingFOV: Set<string>  // Monster IDs
  previousHP: number
}
```

---

## Related Services

- [FOVService](./FOVService.md) - Provides `visibleCells` for threat detection
