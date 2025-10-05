# TrapService

**Location**: `src/services/TrapService/TrapService.ts`
**Dependencies**: RandomService
**Test Coverage**: All 5 trap types, trigger chance, status effects

---

## Purpose

Implements **trap effects** and **trigger logic**. Handles 5 trap types with damage, status effects, and special mechanics (teleport, fall-through pits).

---

## Public API

### Trap Triggering

#### `triggerTrap(trap: Trap, player: Player, state: GameState): TrapEffect`
Triggers trap and applies effects to player.

**Returns**:
```typescript
interface TrapEffect {
  damage: number           // HP damage dealt
  statusEffect?: string    // Status effect applied
  message: string          // Effect description
}
```

**Side Effects**: Marks trap as `triggered = true` and `discovered = true`

**Example**:
```typescript
const effect = service.triggerTrap(bearTrap, player, state)
// effect.damage: 3 (1d4 roll)
// effect.statusEffect: 'held'
// effect.message: "A bear trap snaps shut on your leg! You take 3 damage."
```

---

#### `shouldTriggerTrap(trap: Trap): boolean`
Checks if trap should trigger when stepped on.

**Logic**:
- **Already triggered**: Never triggers again (100% safe)
- **Undiscovered**: Always triggers (100% chance)
- **Discovered**: 10% chance to trigger (can be avoided)

**Example**:
```typescript
// Undiscovered trap
const shouldTrigger = service.shouldTriggerTrap({ discovered: false, triggered: false })
// Returns: true (100% chance)

// Discovered trap
const shouldTrigger = service.shouldTriggerTrap({ discovered: true, triggered: false })
// Returns: true or false (10% chance)
```

---

## Trap Types

### BEAR - Bear Trap

```typescript
private bearTrap(player: Player): TrapEffect
```

**Damage**: `1d4` (1-4 HP)

**Status Effect**: `'held'` (cannot move for 1-2 turns)

**Message**: `"A bear trap snaps shut on your leg! You take X damage."`

**Mechanics**: Trap clamps onto leg, holding player in place temporarily

---

### DART - Dart Trap

```typescript
private dartTrap(player: Player): TrapEffect
```

**Damage**: `1d6` (1-6 HP)

**Poison Chance**: 30%

**Status Effect**: `'poisoned'` (if poison triggers)

**Messages**:
- Poisoned: `"A poisoned dart hits you! You take X damage and feel sick."`
- Normal: `"A dart hits you for X damage."`

**Mechanics**: Spring-loaded dart launcher, may be poisoned

---

### TELEPORT - Teleport Trap

```typescript
private teleportTrap(player: Player, state: GameState): TrapEffect
```

**Damage**: 0 (no damage)

**Status Effect**: `'teleport'` (random teleport)

**Message**: `"You feel a sudden lurch and find yourself elsewhere!"`

**Mechanics**: Teleports player to random floor tile on current level

**Use Case**: Can teleport player out of danger (or into it!)

---

### SLEEP - Sleep Gas Trap

```typescript
private sleepTrap(player: Player): TrapEffect
```

**Damage**: 0 (no damage)

**Status Effect**: `'asleep'` (skip 2-4 turns)

**Message**: `"A gas fills the air and you feel drowsy..."`

**Mechanics**: Releases sleeping gas, player unconscious while monsters act

**Danger**: Monsters can attack defenseless player

---

### PIT - Pit Trap

```typescript
private pitTrap(player: Player): TrapEffect
```

**Damage**: `2d6` (2-12 HP)

**Fall-Through Chance**: 20% (descends to next level)

**Status Effect**: `'fall_through'` (if fall-through triggers)

**Messages**:
- Fall-through: `"You fall into a pit and plummet to the level below! You take X damage."`
- Normal: `"You fall into a pit and take X damage."`

**Mechanics**: Player falls into pit, may break through floor to next level

**Special**: Only trap that can change player's current level

---

## Trigger Mechanics

### Undiscovered Traps

**Trigger Chance**: 100%

**Reasoning**: Player doesn't know trap is there, can't avoid it.

**Discovery**: Triggering marks trap as `discovered = true`

---

### Discovered Traps

**Trigger Chance**: 10%

**Reasoning**: Player knows trap location, can try to step carefully.

**Success**: 90% chance to avoid trap when discovered.

**Use Case**: Encourages searching before exploring.

---

### Triggered Traps

**Trigger Chance**: 0% (never trigger again)

**Reasoning**: Trap is already sprung, no longer functional.

**Visual**: Triggered traps still visible on map (warning to other players).

---

## Status Effects

**Note**: Status effect system not fully implemented (Phase 3).

**Current**: Returns effect name as string, command must handle application.

**Future**: Status effects will be tracked with duration, auto-decrement each turn.

| Status Effect | Duration | Effect |
|---------------|----------|--------|
| **held** | 1-2 turns | Cannot move |
| **poisoned** | 5-10 turns | -1 HP per turn |
| **asleep** | 2-4 turns | Skip turns (monsters act) |
| **teleport** | Instant | Random teleport |
| **fall_through** | Instant | Descend to next level |

---

## Trap Discovery

**SearchCommand**: Calls `SearchService.searchForSecrets()` to discover traps.

**Discovery Chance**: 50% base + (5% × player level)

**Discovered Trap**:
- `trap.discovered = true`
- Visible on map (character: `^`)
- 10% trigger chance instead of 100%

---

## Usage in Commands

### MoveCommand (Trap Trigger)

```typescript
execute(state: GameState): GameState {
  // Player moves to position
  const newPos = { x: player.position.x + dx, y: player.position.y + dy }

  // Check for trap at new position
  const trap = level.traps.find(t =>
    t.position.x === newPos.x && t.position.y === newPos.y
  )

  if (trap && this.trapService.shouldTriggerTrap(trap)) {
    // Trigger trap
    const effect = this.trapService.triggerTrap(trap, player, state)

    // Apply damage
    const updatedPlayer = {
      ...player,
      hp: Math.max(0, player.hp - effect.damage),
      position: newPos,
    }

    // Apply status effect (future: status effect system)
    if (effect.statusEffect === 'fall_through') {
      // Handle level change
      return this.handleFallThrough(updatedPlayer, state)
    }

    // Add message
    const messages = this.messageService.addMessage(
      state.messages,
      effect.message,
      'danger'
    )

    return { ...state, player: updatedPlayer, messages }
  }

  // No trap or didn't trigger
  return { ...state, player: { ...player, position: newPos } }
}
```

---

## Immutability

**Trap Mutation Exception**: Traps are mutated (`trap.triggered = true`, `trap.discovered = true`).

**Why?** Traps are part of level data, updated in place.

**All other objects** (Player, GameState) are immutable.

```typescript
triggerTrap(trap: Trap, player: Player, state: GameState): TrapEffect {
  // Mutate trap (part of level)
  trap.triggered = true
  trap.discovered = true

  // Return new effect object (immutable)
  return {
    damage,
    statusEffect,
    message,
  }
}
```

---

## Testing

**Test Files**:
- `bear-trap.test.ts` - Damage and held effect
- `dart-trap.test.ts` - Damage and poison chance
- `teleport-trap.test.ts` - Teleportation effect
- `sleep-trap.test.ts` - Sleep effect
- `pit-trap.test.ts` - Damage and fall-through chance
- `trigger-chance.test.ts` - Discovered vs undiscovered logic

**Example Test**:
```typescript
describe('TrapService - Bear Trap', () => {
  test('deals 1d4 damage and applies held status', () => {
    mockRandom.setRoll(3)  // 1d4 roll
    const trap = createTrap(TrapType.BEAR, { x: 5, y: 5 })

    const effect = service.triggerTrap(trap, player, state)

    expect(effect.damage).toBe(3)
    expect(effect.statusEffect).toBe('held')
    expect(effect.message).toContain('bear trap')
    expect(trap.triggered).toBe(true)
    expect(trap.discovered).toBe(true)
  })
})

describe('TrapService - Trigger Logic', () => {
  test('undiscovered trap always triggers', () => {
    const trap = createTrap(TrapType.DART, { x: 5, y: 5 }, { discovered: false })

    const shouldTrigger = service.shouldTriggerTrap(trap)

    expect(shouldTrigger).toBe(true)
  })

  test('discovered trap has 10% trigger chance', () => {
    const trap = createTrap(TrapType.DART, { x: 5, y: 5 }, { discovered: true })
    mockRandom.setChance(false)  // 90% chance to avoid

    const shouldTrigger = service.shouldTriggerTrap(trap)

    expect(shouldTrigger).toBe(false)
  })

  test('triggered trap never triggers again', () => {
    const trap = createTrap(TrapType.DART, { x: 5, y: 5 }, { triggered: true })

    const shouldTrigger = service.shouldTriggerTrap(trap)

    expect(shouldTrigger).toBe(false)
  })
})
```

---

## Related Services

- **SearchService** - Discovers traps (sets `trap.discovered = true`)
- **MessageService** - Displays trap trigger messages
- **RandomService** - Rolls damage, poison chance, fall-through chance
- **MoveCommand** - Checks for traps when player moves

---

## Design Rationale

### Why 10% Trigger Chance When Discovered?

**Risk/Reward** - Searching reveals traps, but doesn't make them 100% safe.

**Realism** - Knowing trap location doesn't guarantee avoiding it.

**Balance** - Prevents player from walking over discovered traps freely.

---

### Why One-Time Traps?

**Resource Management** - Trap locations become safe after triggering.

**Simplicity** - No trap reset mechanics needed.

**Original Rogue** - Traps triggered once, then remained visible as warning.

---

### Why Pit Fall-Through?

**Level Skipping** - Provides alternate (dangerous) way to descend.

**Risk/Reward** - Take damage to skip level.

**Speedrun Strategy** - Intentional fall-through can save time.

---

## Trap Summary Table

| Trap Type | Damage | Status Effect | Special |
|-----------|--------|---------------|---------|
| **BEAR** | 1d4 | Held (1-2 turns) | Cannot move |
| **DART** | 1d6 | Poisoned (30% chance) | -1 HP/turn |
| **TELEPORT** | 0 | Teleport | Random location |
| **SLEEP** | 0 | Asleep (2-4 turns) | Monsters act freely |
| **PIT** | 2d6 | Fall-through (20% chance) | Descend to next level |

---

## Future Enhancements

**Status Effect System** (Phase 3):
- Track effect duration
- Auto-decrement each turn
- Multiple effects stacking
- Effect icons in UI

**Additional Trap Types**:
- **ARROW**: Rapid-fire darts (3d6 damage)
- **RUST**: Rusts armor on trigger
- **ALARM**: Wakes all monsters on level
- **PARALYSIS**: Cannot act for 5-10 turns
- **LEVEL_DRAIN**: Lose 1 XP level

**Trap Disarming** (Phase 6):
- Thief-like character can disarm traps
- Success chance based on level/dexterity
- Failure triggers trap
