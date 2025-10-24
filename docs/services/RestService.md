# RestService

**Location**: `src/services/RestService/RestService.ts`
**Dependencies**: RegenerationService, HungerService, LightingService, FOVService
**Test Coverage**: Rest loop, interrupts, starvation death

---

## Purpose

Manages multi-turn resting until HP full or interrupted. Handles hunger ticking, regeneration, fuel consumption, FOV updates, and enemy detection during rest.

---

## Public API

### rest(state: GameState): RestResult

Rests until HP full or interrupted.

**Returns**:
```typescript
interface RestResult {
  state: GameState
  turnsRested: number
  interrupted: boolean
  interruptReason: string
  hpGained: number
  died: boolean
  deathCause?: string
}
```

**Interruption Conditions**:
- HP reaches maximum
- Enemy appears in FOV
- Hunger reaches 0 (starving)
- Death from starvation
- Safety limit (1000 turns)

**Example**:
```typescript
const restService = new RestService(regenService, hungerService, lightingService, fovService)

const result = restService.rest(gameState)
// result: { turnsRested: 50, hpGained: 25, interrupted: false, ... }

if (result.died) {
  handleDeath(result.deathCause)
} else if (result.interrupted) {
  showMessage(result.interruptReason)
}
```

---

## Related Services

- [RegenerationService](./RegenerationService.md) - Ticks regen each turn
- [HungerService](./HungerService.md) - Ticks hunger each turn
- [LightingService](./LightingService.md) - Ticks fuel each turn
- [FOVService](./FOVService.md) - Updates FOV for enemy detection
