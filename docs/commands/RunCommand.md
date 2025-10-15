# RunCommand

Initiates continuous automatic movement in one direction until disturbed.

## Purpose

Allows fast travel through corridors using Shift+Arrow keys. Movement continues automatically until the player encounters danger, choices, or safety thresholds.

## Usage

**Input**: Shift + Arrow Key (or Shift + hjkl)

**Example**:
- Shift+ArrowRight → Run east until disturbed
- Shift+k → Run north until disturbed

## Implementation

### Initialization
1. Check for blocking status effects (confused, blind, paralyzed)
2. Capture starting FOV monsters (for change detection)
3. Create RunState with direction, starting position, starting FOV, HP
4. Set `player.isRunning = true` and `player.runState`

### Continuation (via MoveCommand)
Each move step:
1. Execute normal movement
2. If `runState` exists, call DisturbanceService
3. If disturbed: clear runState, set isRunning=false, show message
4. If not disturbed: continue running in same direction

## Disturbance Conditions

### Safety Critical (Priority 1)
- HP below 30% → "Your health is low!"
- Hunger below 300 → "You are very hungry!"
- Status effect (confused, blind, paralyzed, held)

### Combat Threats (Priority 2)
- New monster appears in FOV → "[Monster] appears!"
- Player takes damage → "You have been hit!"

### Navigation (Priority 3)
- Corridor branches (3+ walkable directions) → "The corridor branches."
- Door adjacent → "You reach a door."

## Dependencies

- **DisturbanceService**: Checks stopping conditions
- **MoveCommand**: Executes movement and checks disturbances
- **MessageService**: Adds stop/warning messages
- **FOVService**: Determines visible monsters (via GameState.visibleCells)

## Testing

See:
- `src/commands/RunCommand/RunCommand.test.ts` - Unit tests
- `src/commands/RunCommand/integration.test.ts` - Full run cycles
- `src/services/DisturbanceService/disturbance-checks.test.ts` - Stopping logic

## Architecture Notes

- **Stateless Commands**: RunCommand only initiates. MoveCommand handles continuation.
- **Priority System**: Safety > Combat > Navigation ensures player safety
- **Immutability**: RunState is recreated on each update (HP tracking)
- **Energy System**: Each run step consumes normal movement energy (fair turn processing)
