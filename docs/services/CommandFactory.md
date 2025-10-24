# CommandFactory

**Location**: `src/services/CommandFactory/CommandFactory.ts`
**Dependencies**: All service dependencies (20+), all replayable commands
**Test Coverage**: None (integration-tested via ReplayDebuggerService)

---

## Purpose

Reconstructs command instances from CommandEvent records during replay. Injects all necessary service dependencies for each command type to enable deterministic replay.

---

## Public API

### Command Reconstruction

#### `createFromEvent(event: CommandEvent): ICommand`
Creates command instance from event record.

**Parameters**:
- `event` - Command event from replay log

**Returns**:
```typescript
ICommand  // Reconstructed command instance ready to execute
```

**Rules**:
- Injects all required service dependencies
- Extracts command parameters from event payload
- Throws if command type not supported

**Supported Commands**:
- **Movement**: MOVE, RUN
- **Combat**: ATTACK
- **Exploration**: REST, SEARCH
- **Items**: PICKUP, DROP, EQUIP, UNEQUIP, QUAFF, READ, ZAP, EAT, TAKE_OFF, REFILL_LANTERN
- **Doors**: OPEN, CLOSE
- **Navigation**: DESCEND, ASCEND

**Not Supported** (system commands):
- SAVE, QUIT (require UI callbacks)
- Debug commands (not gameplay)
- AI commands (generated during replay)

**Example**:
```typescript
const factory = new CommandFactory(
  recorder, randomService, messageService, /* ... all services */
)

// Reconstruct command from event
const event: CommandEvent = {
  turnNumber: 42,
  timestamp: 1234567890,
  commandType: COMMAND_TYPES.MOVE,
  actorType: 'player',
  payload: { direction: { dx: 1, dy: 0 } },
  rngState: '...'
}

const command = factory.createFromEvent(event)
const newState = command.execute(state)
```

---

## Integration Notes

**Used By**:
- ReplayDebuggerService (reconstruct commands during replay)

**Usage Pattern**:
```typescript
const factory = new CommandFactory(
  // Inject ALL services used by any command
  recorder, randomService, messageService, turnService,
  movementService, lightingService, fovService,
  combatService, hungerService, inventoryService,
  /* ... and 10+ more services */
)

// During replay
for (const event of replayData.commands) {
  const command = factory.createFromEvent(event)
  state = command.execute(state)
}
```

---

## Testing

**Test Files**: None (tested via integration)

**Coverage**: Implicitly tested via ReplayDebuggerService tests

**Note**: Could benefit from unit tests covering:
- All supported command types
- Unsupported command error handling
- Parameter extraction from payload

---

## Related Services

- [ReplayDebuggerService](./ReplayDebuggerService.md) - Uses factory to reconstruct commands
- [CommandRecorderService](./CommandRecorderService.md) - Records events that factory reconstructs
- All command classes (MoveCommand, AttackCommand, etc.)

---

## Technical Details

**Command Type Registry**:
```typescript
// From COMMAND_TYPES constant
MOVE, RUN, ATTACK, REST, SEARCH,
PICKUP, DROP, EQUIP, UNEQUIP,
QUAFF, READ, ZAP, EAT, TAKE_OFF,
OPEN, CLOSE, REFILL_LANTERN,
DESCEND, ASCEND
```

**Service Dependencies** (20+ services):
- Core: recorder, randomService, messageService, turnService, notificationService
- Movement: movementService, lightingService, fovService, searchService
- Combat: combatService, levelingService, hungerService, regenerationService
- Items: inventoryService, potionService, scrollService, wandService, identificationService, curseService
- Environment: doorService, goldService, monsterAIService, disturbanceService, restService, stairsNavigationService, victoryService, levelService
- Status: statusEffectService, targetingService

**Command Construction Example**:
```typescript
// MoveCommand
case COMMAND_TYPES.MOVE:
  return new MoveCommand(
    event.payload.direction,
    recorder, randomService, messageService, turnService,
    movementService, combatService, lightingService, fovService,
    hungerService, levelingService, regenerationService, notificationService,
    goldService, monsterAIService, disturbanceService
  )

// PickUpCommand
case COMMAND_TYPES.PICKUP:
  return new PickUpCommand(
    event.payload.itemIndex,
    recorder, randomService, messageService,
    inventoryService, turnService, curseService
  )
```

**Payload Extraction**:
- Each command type has specific payload structure
- Factory extracts parameters and passes to constructor
- Example payloads:
  - MOVE: `{ direction: { dx, dy } }`
  - ATTACK: `{ target: Position }`
  - PICKUP: `{ itemIndex: number }`
  - QUAFF: `{ itemIndex: number }`

**Error Handling**:
```typescript
default:
  throw new Error(`Unsupported command type for replay: ${event.commandType}`)
```

**Design Pattern**: Factory pattern
- Encapsulates complex object creation
- Centralizes service injection logic
- Makes replay system extensible

**Future Enhancements**:
- Support for AI commands (MONSTER_MOVE, MONSTER_ATTACK)
- Support for system commands (with UI callback mocking)
- Plugin system for custom commands

**Browser Compatibility**:
- Pure JavaScript, no browser APIs
- Works in all environments (browser, Node, tests)
