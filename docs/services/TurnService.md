# TurnService

**Location**: `src/services/TurnService/TurnService.ts`
**Dependencies**: StatusEffectService
**Test Coverage**: Turn increment, status effect ticking, energy system integration

---

## Purpose

Centralized **turn management system** that handles:
1. Turn counter incrementing
2. Status effect duration ticking
3. Energy-based action system (player and monsters)
4. Turn-based game loop coordination

---

## Public API

### Turn Management

#### `incrementTurn(state: GameState): GameState`
Increments turn counter and ticks all status effects.

**Process**:
1. Increment turnCount by 1
2. Tick player status effects (reduce duration by 1)
3. Remove expired effects
4. Return new game state

**Usage**:
```typescript
// In commands
return this.turnService.incrementTurn(state)
```

**Example**:
```typescript
// Before: turnCount: 100, player has CONFUSED (5 turns remaining)
const newState = turnService.incrementTurn(state)
// After: turnCount: 101, player has CONFUSED (4 turns remaining)
```

---

#### `getCurrentTurn(state: GameState): number`
Retrieves current turn count.

**Usage**:
```typescript
const turn = this.turnService.getCurrentTurn(state)
```

---

### Energy System (Angband-style)

#### `grantEnergyToAllActors(state: GameState): GameState`
**PRIMARY METHOD** - Grants energy to ALL actors (player + monsters) simultaneously.

**Why This Matters**: Ensures fair energy distribution. All actors accumulate energy at the same rate based on their speed values.

**Energy Grants**:
- **Player**: 10 energy/tick (normal) or 20 energy/tick (hasted)
- **Monsters**: `monster.speed` energy/tick (varies by monster type)

**Usage**:
```typescript
// Main game loop - grant energy to ALL actors until player can act
do {
  state = turnService.grantEnergyToAllActors(state)
} while (!turnService.canPlayerAct(state.player))
```

**Example**:
- Player speed 10, Monster speed 10: Both accumulate at same rate
- Player speed 10, Monster speed 15 (Bat): Monster acts 1.5x more often
- Player speed 10, Monster speed 5 (Zombie): Player acts 2x more often

---

#### `grantPlayerEnergy(state: GameState): GameState`
**LEGACY METHOD** - Grants energy to player only (use `grantEnergyToAllActors` instead).

Kept for backward compatibility with individual tests.

**Energy Grant**:
- Base: 10 energy per tick (normal speed)
- HASTED: 20 energy per tick (double speed)

---

#### `consumePlayerEnergy(player: Player): Player`
Consumes energy after player action.

**Default Cost**: 100 energy (standard action)

**Usage**:
```typescript
// After executing command
const updatedPlayer = turnService.consumePlayerEnergy(state.player)
```

---

#### `canPlayerAct(player: Player): boolean`
Checks if player has enough energy to act.

**Threshold**: 100 energy required

**Usage**:
```typescript
if (turnService.canPlayerAct(player)) {
  // Process command
}
```

---

#### `grantEnergy(entity: Player | Monster, amount: number): Player | Monster`
Generic energy grant for any entity.

**Usage**:
```typescript
// Grant monster energy based on speed
const updatedMonster = turnService.grantEnergy(monster, monster.speed)
```

---

## Design Rationale

### Why Centralize Turn Logic?

**Problem**: 26 commands duplicated `turnCount + 1` arithmetic

**Solution**: Single service method standardizes pattern

**Benefits**:
- Eliminates duplication
- Single source of truth
- Automatic status effect ticking
- No arithmetic in commands (architectural compliance)

### Why Energy System?

**Problem**: Original turn-based system couldn't support variable speeds

**Solution**: Angband-style energy system

**Benefits**:
- **Variable Speed**: Monsters can act at different rates (speed 5 = slow, 10 = normal, 20 = fast)
- **Haste Support**: Player with HASTED status gains energy twice as fast
- **Flexible Actions**: Future support for actions costing different energy amounts
- **Smooth Gameplay**: Natural turn progression without rigid "one action per turn" constraint

**Implementation**:
- Entities accumulate energy each turn
- Actions cost 100 energy
- Speed determines energy gain rate (speed 10 = 100 energy/turn)
- When energy >= 100, entity can act

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
- **StatusEffectService** - Ticks status effects via `tickStatusEffects()`
- **MonsterTurnService** - Uses energy system for monster turn processing
- **PotionService** - HASTE_SELF potion doubles energy gain
- **MovementService** - All movement consumes 100 energy
- **MessageService** - Uses turn number for message timestamping
- **Main Game Loop** - Manages energy grant/consume cycle

---

## Game Loop Integration

```typescript
// Main game loop (main.ts - CURRENT IMPLEMENTATION)
function handlePlayerAction(command: Command, state: GameState): GameState {
  // Phase 1: Grant energy to ALL actors until player can act
  // Use do-while to ensure at least one tick (prevents monsters falling behind)
  do {
    state = turnService.grantEnergyToAllActors(state)
  } while (!turnService.canPlayerAct(state.player))

  // Phase 2: Execute command
  state = command.execute(state)

  // Phase 3: Consume player energy
  state = {
    ...state,
    player: turnService.consumePlayerEnergy(state.player)
  }

  // Phase 4: Process monsters (if player exhausted energy)
  // Monsters already have energy from Phase 1
  if (!turnService.canPlayerAct(state.player)) {
    state = monsterTurnService.processMonsterTurns(state)
  }

  return state
}
```

---

## Implementation Details

**Status Effect Integration**:
```typescript
incrementTurn(state: GameState): GameState {
  // Tick status effects
  const updatedPlayer = this.statusEffectService.tickStatusEffects(state.player)

  return {
    ...state,
    player: updatedPlayer,
    turnCount: state.turnCount + 1,
  }
}
```

**Energy System**:
```typescript
grantPlayerEnergy(state: GameState): GameState {
  const hasHaste = state.player.statusEffects.some(e => e.type === 'HASTED')
  const energyGain = hasHaste ? 200 : 100 // Double speed when hasted

  return {
    ...state,
    player: {
      ...state.player,
      energy: state.player.energy + energyGain
    }
  }
}
```

---

## See Also

- [StatusEffectService](./StatusEffectService.md) - Status effect management
- [MonsterTurnService](./MonsterTurnService.md) - Monster AI and turn processing
- [PotionService](./PotionService.md) - HASTE_SELF potion implementation
- [Energy System Plan](../plans/potion_implementation_plan.md) - Complete energy system design
