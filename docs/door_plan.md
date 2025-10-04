# Door System Implementation Plan

**Version**: 1.0
**Created**: 2025-10-04
**Status**: ✅ Phase 1 Complete (2025-10-04)
**Implementation**: Commit 980519f (door mechanics), f1a12aa (door placement fix)
**Tests**: 787 passing (+18 new tests)
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Systems Advanced](./systems-advanced.md)

---

## Implementation Summary

**Phase 1 Complete** ✅ (All items from Phase 1 successfully implemented):
1. Fixed DungeonService walkability bug (CLOSED/LOCKED → walkable=false)
2. Added auto-open (bump-to-open) behavior in MoveCommand
3. Implemented openDoorAndMoveThrough() with full game loop integration
4. Added 18 comprehensive tests (DungeonService + MoveCommand)
5. All 787 tests passing

**Phase 2 Deferred** (Waiting for Phase 5 - Inventory system):
- KEY ItemType addition
- Key drop system
- Auto-unlock with key
- BashDoorCommand for breaking locks

See commit 980519f for full implementation details.

---

## Executive Summary

### What We're Fixing

Currently, the door system has a critical bug: **CLOSED and LOCKED doors are marked as `walkable=true`**, allowing the player to walk through them without opening. Additionally, there's no auto-open behavior when the player bumps into a CLOSED door - they can only open doors explicitly with the 'o' key.

### Why It's Broken

In `DungeonService.ts:557-577`, the `updateTileForDoor()` method incorrectly sets:
```typescript
case DoorState.CLOSED:
case DoorState.LOCKED:
  tile.char = '+'
  tile.walkable = true  // ❌ WRONG - should be false
  tile.transparent = false
  break
```

This violates the game design where closed/locked doors should block movement (game-design.md:82-83).

### End State

After implementation:
1. ✅ CLOSED/LOCKED doors block movement (`walkable=false`)
2. ✅ Moving into CLOSED door auto-opens it (bump-to-open)
3. ✅ Door tile changes from `+` to `'` when opened
4. ✅ LOCKED doors show "locked" message (key system deferred to Phase 5+)
5. ✅ OpenDoorCommand ('o' key) still works for explicit opening
6. ✅ All tests pass + new tests for auto-open behavior

---

## Current State Analysis

### Door Types (Implemented)

From `src/types/core/core.ts:27-34`:

```typescript
export enum DoorState {
  OPEN = 'OPEN',        // ✅ Works correctly
  CLOSED = 'CLOSED',    // ❌ Bug: walkable=true
  LOCKED = 'LOCKED',    // ❌ Bug: walkable=true
  BROKEN = 'BROKEN',    // ✅ Works correctly
  SECRET = 'SECRET',    // ✅ Works correctly
  ARCHWAY = 'ARCHWAY',  // ✅ Works correctly
}

export interface Door {
  position: Position
  state: DoorState
  discovered: boolean
  orientation: 'horizontal' | 'vertical'
  connectsRooms: [number, number]
}
```

### Door Distribution (from DungeonService)

From `DungeonService.ts:524-533` (`randomDoorType()` method):

| State | Probability | Expected Behavior | Current Bug |
|-------|-------------|-------------------|-------------|
| OPEN | 40% | Walkable, transparent | ✅ Correct |
| CLOSED | 30% | Not walkable, blocks vision | ❌ walkable=true |
| LOCKED | 10% | Not walkable, needs key | ❌ walkable=true |
| SECRET | 10% | Hidden as wall until found | ✅ Correct |
| BROKEN | 5% | Walkable, can't close | ✅ Correct |
| ARCHWAY | 5% | Walkable, no door | ✅ Correct |

### Existing Commands

**OpenDoorCommand** (`src/commands/OpenDoorCommand/OpenDoorCommand.ts`):
- ✅ Exists and works
- ✅ Handles CLOSED → OPEN transition
- ✅ Shows "locked" message for LOCKED doors
- ✅ Has placeholder for key check (line 53-60):
  ```typescript
  case DoorState.LOCKED:
    // Check for key in inventory (Phase 5)
    const lockedMessages = this.messageService.addMessage(
      state.messages,
      'The door is locked. You need a key.',
      'warning',
      state.turnCount
    )
    return { ...state, messages: lockedMessages }
  ```

**CloseDoorCommand** (`src/commands/CloseDoorCommand/CloseDoorCommand.ts`):
- ✅ Exists and works
- ✅ Handles OPEN → CLOSED transition

**MoveCommand** (`src/commands/MoveCommand/MoveCommand.ts`):
- ❌ No door handling currently
- ❌ Just checks `isWalkable()` and shows "can't go that way"
- Needs: Door detection and auto-open logic

---

## Design References

### Game Design Documentation

From `game-design.md:81-84`:

```
| Door (Open)   | `'` | Open doorway               |
| Door (Closed) | `+` | Closed door (blocks vision) |
| Door (Locked) | `+` | Locked door (needs key)    |
| Door (Secret) | `#` | Hidden door (appears as wall) |
```

From `game-design.md:370-371`:

```
| `o` | Open  | Open a closed door  |
| `c` | Close | Close an open door |
```

### Systems Design Documentation

From `systems-advanced.md:358-365` (DungeonConfig):

```typescript
// Door distribution
doorTypes: {
  open: 0.30,      // 30% already open
  closed: 0.40,    // 40% closed (can open)
  locked: 0.10,    // 10% locked (need key)
  broken: 0.05,    // 5% broken (always open, can't close)
  secret: 0.10,    // 10% secret (hidden until searched)
  archway: 0.05,   // 5% archway (no door)
};
```

From `systems-advanced.md:385-392` (Door State Descriptions):

```typescript
enum DoorState {
  OPEN,        // Can walk through, doesn't block vision
  CLOSED,      // Must open (press 'o'), blocks vision
  LOCKED,      // Need key to open, blocks vision
  BROKEN,      // Permanently open, can't close
  SECRET,      // Hidden (appears as wall '#'), found via search
  ARCHWAY,     // No door, just opening
}
```

**Key Point**: "CLOSED - Must open (press 'o'), blocks vision"

### Architecture Documentation

From `architecture.md:502`:

```typescript
export enum DoorState {
  OPEN,
  CLOSED,
  LOCKED,
  // ...
}
```

Note: No KEY item type exists yet in ItemType enum (architecture.md shows WEAPON, ARMOR, POTION, SCROLL, RING, WAND, FOOD, GOLD, AMULET only).

---

## Code References

### 1. DungeonService Door Generation

**File**: `src/services/DungeonService/DungeonService.ts`

**Door Placement** (lines 95-96):
```typescript
// Place doors at room/corridor junctions
const doors = this.placeDoors(rooms, corridors, tiles)
```

**Door Creation** (lines 508-519):
```typescript
private createDoor(position: Position, room: Room): Door {
  const doorType = this.randomDoorType()
  const orientation = this.detectOrientation(position, room)

  return {
    position,
    state: doorType,
    discovered: doorType !== DoorState.SECRET,
    orientation,
    connectsRooms: [room.id, -1], // -1 = corridor
  }
}
```

**Door Type Selection** (lines 524-533):
```typescript
private randomDoorType(): DoorState {
  const roll = this.random.next()

  if (roll < 0.4) return DoorState.OPEN // 40%
  if (roll < 0.7) return DoorState.CLOSED // 30%
  if (roll < 0.8) return DoorState.LOCKED // 10%
  if (roll < 0.9) return DoorState.SECRET // 10%
  if (roll < 0.95) return DoorState.BROKEN // 5%
  return DoorState.ARCHWAY // 5%
}
```

**⚠️ THE BUG** - Tile Update (lines 557-577):
```typescript
private updateTileForDoor(tiles: Tile[][], door: Door): void {
  const tile = tiles[door.position.y][door.position.x]
  if (!tile) return

  // Set tile type to DOOR
  tile.type = TileType.DOOR

  switch (door.state) {
    case DoorState.OPEN:
    case DoorState.BROKEN:
    case DoorState.ARCHWAY:
      tile.char = "'"
      tile.walkable = true
      tile.transparent = true
      break
    case DoorState.CLOSED:
    case DoorState.LOCKED:
      tile.char = '+'
      tile.walkable = true  // ❌ BUG: Should be false!
      tile.transparent = false
      break
    case DoorState.SECRET:
      tile.char = '#'
      tile.walkable = false
      tile.transparent = false
      break
  }
}
```

### 2. OpenDoorCommand Implementation

**File**: `src/commands/OpenDoorCommand/OpenDoorCommand.ts`

**Full Implementation** (lines 1-116):
```typescript
export class OpenDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    // Find door at target position
    const door = level.doors.find(
      (d) => d.position.x === targetPos.x && d.position.y === targetPos.y
    )

    if (!door) {
      const messages = this.messageService.addMessage(
        state.messages,
        'There is no door there.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Handle different door states
    switch (door.state) {
      case DoorState.OPEN:
      case DoorState.BROKEN:
      case DoorState.ARCHWAY:
        const openMessages = this.messageService.addMessage(
          state.messages,
          'That door is already open.',
          'info',
          state.turnCount
        )
        return { ...state, messages: openMessages }

      case DoorState.LOCKED:
        // Check for key in inventory (Phase 5)
        const lockedMessages = this.messageService.addMessage(
          state.messages,
          'The door is locked. You need a key.',
          'warning',
          state.turnCount
        )
        return { ...state, messages: lockedMessages }

      case DoorState.SECRET:
        if (!door.discovered) {
          const secretMessages = this.messageService.addMessage(
            state.messages,
            'There is no door there.',
            'info',
            state.turnCount
          )
          return { ...state, messages: secretMessages }
        }
        // If discovered, treat as closed door
        return this.openDoor(state, door, level)

      case DoorState.CLOSED:
        return this.openDoor(state, door, level)

      default:
        return state
    }
  }

  private openDoor(state: GameState, door: any, level: any): GameState {
    // Update door state
    const updatedDoor = { ...door, state: DoorState.OPEN }
    const updatedDoors = level.doors.map((d: any) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    // Update tile transparency for FOV
    const updatedTiles = level.tiles.map((row: any) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = "'"
    tile.walkable = true
    tile.transparent = true

    const updatedLevel = { ...level, doors: updatedDoors, tiles: updatedTiles }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      'You open the door.',
      'info',
      state.turnCount
    )

    return {
      ...state,
      levels: updatedLevels,
      messages,
      turnCount: state.turnCount + 1,
    }
  }
}
```

**Key Observation**: OpenDoorCommand.openDoor() has the logic we need to reuse for auto-open.

### 3. MoveCommand Current State

**File**: `src/commands/MoveCommand/MoveCommand.ts`

**Walkability Check** (lines 33-42):
```typescript
// 2. Check if walkable
if (!this.movementService.isWalkable(newPosition, level)) {
  const messages = this.messageService.addMessage(
    state.messages,
    "You can't go that way.",
    'info',
    state.turnCount
  )
  return { ...state, messages }
}
```

**Issue**: No door detection before the "can't go that way" message. This is where we need to add auto-open logic.

**Command Structure**:
1. Calculate new position
2. Check if walkable ← **INSERT DOOR LOGIC HERE**
3. Check for monster (combat)
4. Move player
5. Tick hunger (placeholder)
6. Tick light fuel
7. Recompute FOV
8. Update explored tiles
9. Return new state

---

## Implementation Plan: Phase 1 (Immediate)

### Task 1: Fix Door Walkability Flags

**File**: `src/services/DungeonService/DungeonService.ts`
**Lines**: 565-570

**Change**:
```typescript
// BEFORE
case DoorState.CLOSED:
case DoorState.LOCKED:
  tile.char = '+'
  tile.walkable = true  // ❌ BUG
  tile.transparent = false
  break

// AFTER
case DoorState.CLOSED:
case DoorState.LOCKED:
  tile.char = '+'
  tile.walkable = false  // ✅ FIXED
  tile.transparent = false
  break
```

**Rationale**: Closed and locked doors should block movement per design doc (systems-advanced.md:387).

**Impact**: After this change, closed/locked doors will block the player. This is correct behavior - the player should not be able to walk through closed doors.

---

### Task 2: Add Auto-Open Logic to MoveCommand

**File**: `src/commands/MoveCommand/MoveCommand.ts`
**Location**: After line 33 (walkability check)

**Current Code**:
```typescript
// 2. Check if walkable
if (!this.movementService.isWalkable(newPosition, level)) {
  const messages = this.messageService.addMessage(
    state.messages,
    "You can't go that way.",
    'info',
    state.turnCount
  )
  return { ...state, messages }
}
```

**New Code**:
```typescript
// 2. Check if walkable
if (!this.movementService.isWalkable(newPosition, level)) {
  // Check if blocked by a door
  const door = level.doors.find(
    (d) => d.position.x === newPosition.x && d.position.y === newPosition.y
  )

  if (door) {
    // Handle different door states
    if (door.state === DoorState.CLOSED) {
      // Auto-open closed doors (bump-to-open)
      return this.openDoorAndMoveThrough(state, level, door, newPosition)
    }

    if (door.state === DoorState.LOCKED) {
      // Locked door - show message (key system not yet implemented)
      const messages = this.messageService.addMessage(
        state.messages,
        'The door is locked.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    if (door.state === DoorState.SECRET && !door.discovered) {
      // Undiscovered secret door - appears as wall
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }
  }

  // Not a door or other obstacle - regular wall/obstacle message
  const messages = this.messageService.addMessage(
    state.messages,
    "You can't go that way.",
    'info',
    state.turnCount
  )
  return { ...state, messages }
}
```

**Import Addition** (top of file):
```typescript
import { GameState, DoorState } from '@game/core/core'  // Add DoorState
```

---

### Task 3: Implement openDoorAndMoveThrough() Method

**File**: `src/commands/MoveCommand/MoveCommand.ts`
**Location**: Add as private method after execute()

**Implementation**:
```typescript
/**
 * Open a closed door and move the player through it
 */
private openDoorAndMoveThrough(
  state: GameState,
  level: any,
  door: any,
  newPosition: Position
): GameState {
  // 1. Update door state to OPEN
  const updatedDoor = { ...door, state: DoorState.OPEN }
  const updatedDoors = level.doors.map((d: any) =>
    d.position.x === door.position.x && d.position.y === door.position.y
      ? updatedDoor
      : d
  )

  // 2. Update tile to be walkable and transparent
  const updatedTiles = level.tiles.map((row: any) => [...row])
  const tile = updatedTiles[door.position.y][door.position.x]
  tile.char = "'"
  tile.walkable = true
  tile.transparent = true

  // 3. Move player through the now-open door
  const player = this.movementService.movePlayer(state.player, newPosition)

  // 4. Tick light fuel
  let updatedPlayer = player
  if (player.equipment.lightSource) {
    const tickedLight = this.lightingService.tickFuel(
      player.equipment.lightSource
    )
    updatedPlayer = {
      ...player,
      equipment: {
        ...player.equipment,
        lightSource: tickedLight,
      },
    }

    // Check for fuel warning
    const warning = this.lightingService.generateFuelWarning(tickedLight)
    if (warning) {
      const messages = this.messageService.addMessage(
        state.messages,
        warning,
        'warning',
        state.turnCount + 1
      )

      const levelWithDoor = { ...level, doors: updatedDoors, tiles: updatedTiles }
      const levelsWithDoor = new Map(state.levels)
      levelsWithDoor.set(state.currentLevel, levelWithDoor)

      return {
        ...state,
        player: updatedPlayer,
        levels: levelsWithDoor,
        messages,
        turnCount: state.turnCount + 1,
      }
    }
  }

  // 5. Recompute FOV
  const lightRadius = this.lightingService.getLightRadius(
    updatedPlayer.equipment.lightSource
  )
  const visibleCells = this.fovService.computeFOV(
    newPosition,
    lightRadius,
    { ...level, doors: updatedDoors, tiles: updatedTiles }
  )

  // 6. Update explored tiles
  const levelWithDoor = { ...level, doors: updatedDoors, tiles: updatedTiles }
  const updatedLevel = this.fovService.updateExploredTiles(levelWithDoor, visibleCells)

  // 7. Update levels map
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, updatedLevel)

  // 8. Add message
  const messages = this.messageService.addMessage(
    state.messages,
    'You open the door and move through.',
    'info',
    state.turnCount + 1
  )

  return {
    ...state,
    player: updatedPlayer,
    visibleCells,
    levels: updatedLevels,
    messages,
    turnCount: state.turnCount + 1,
  }
}
```

**Rationale**: This method combines door opening with movement, ensuring all side effects (FOV update, fuel consumption, exploration) happen correctly.

**Architecture Compliance**:
- ✅ Command orchestrates services (MovementService, LightingService, FOVService)
- ✅ No game logic in command (only service calls)
- ✅ Immutability maintained (returns new objects)
- See [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for guidelines

---

### Task 4: Add Comprehensive Tests

**File**: `src/commands/MoveCommand/door-interaction.test.ts` (NEW FILE)

**Test Structure**:
```typescript
import { MoveCommand } from './MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { GameState, DoorState, Door } from '@game/core/core'

describe('MoveCommand - Door Interaction', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService

  beforeEach(() => {
    movementService = new MovementService()
    lightingService = new LightingService(new MockRandom())
    fovService = new FOVService()
    messageService = new MessageService()
  })

  describe('Auto-open on movement', () => {
    test('should open CLOSED door and move through it', () => {
      // Setup: Player at (5,5), CLOSED door at (5,6)
      // Action: Move down
      // Assert: Door opens, player moves, tile char changes to "'"
    })

    test('should update door state from CLOSED to OPEN', () => {
      // Verify door.state changes in level.doors array
    })

    test('should update tile walkable and transparent flags', () => {
      // Verify tile.walkable=true, tile.transparent=true after opening
    })

    test('should show "open and move through" message', () => {
      // Verify message added to state.messages
    })

    test('should consume turn when opening and moving', () => {
      // Verify turnCount increments
    })

    test('should update FOV after moving through door', () => {
      // Verify visibleCells updated
    })

    test('should tick light fuel when moving through door', () => {
      // Verify fuel decreases
    })
  })

  describe('LOCKED door handling', () => {
    test('should block movement into LOCKED door', () => {
      // Player should not move, position unchanged
    })

    test('should show "door is locked" message', () => {
      // Verify warning message
    })

    test('should not consume turn when blocked by locked door', () => {
      // turnCount should not increment
    })

    test('should not open LOCKED door without key', () => {
      // Door state remains LOCKED
    })
  })

  describe('OPEN door handling', () => {
    test('should walk through OPEN door normally', () => {
      // No opening needed, just move
    })

    test('should not show door-related message for OPEN door', () => {
      // Regular movement, no "opening" message
    })
  })

  describe('SECRET door handling', () => {
    test('should block movement into undiscovered SECRET door', () => {
      // Appears as wall
    })

    test('should show generic "cant go that way" for undiscovered SECRET', () => {
      // Don't reveal it's a door
    })

    test('should open discovered SECRET door like CLOSED door', () => {
      // If discovered=true, auto-open works
    })
  })

  describe('Edge cases', () => {
    test('should handle door at level boundary', () => {
      // Door at x=0 or y=0
    })

    test('should handle multiple doors in sequence', () => {
      // Open door, move through, encounter another
    })

    test('should preserve other level state when opening door', () => {
      // Monsters, items, etc. unchanged
    })
  })
})
```

**Test Count**: ~15 tests covering all door states and edge cases

---

### Task 5: Add Door Walkability Verification Test

**File**: `src/services/DungeonService/DungeonService.test.ts`
**Location**: In `describe('placeDoors')` block (after line 238)

**Test**:
```typescript
test('should set correct walkable flags for all door states', () => {
  const level = dungeonService.generateLevel(1, defaultConfig)

  expect(level.doors.length).toBeGreaterThan(0)

  for (const door of level.doors) {
    const tile = level.tiles[door.position.y][door.position.x]

    switch (door.state) {
      case 'OPEN':
      case 'BROKEN':
      case 'ARCHWAY':
        expect(tile.walkable).toBe(true)
        expect(tile.transparent).toBe(true)
        expect(tile.char).toBe("'")
        break

      case 'CLOSED':
      case 'LOCKED':
        expect(tile.walkable).toBe(false)  // ✅ Key assertion
        expect(tile.transparent).toBe(false)
        expect(tile.char).toBe('+')
        break

      case 'SECRET':
        expect(tile.walkable).toBe(false)
        expect(tile.transparent).toBe(false)
        expect(tile.char).toBe('#')
        break

      default:
        fail(`Unexpected door state: ${door.state}`)
    }
  }
})
```

**Rationale**: Verifies the walkability fix at the dungeon generation level.

---

## Implementation Plan: Phase 2 (Future - Phase 5+)

### Deferred: Key and Bash System

**When to Implement**: After Phase 5 (Inventory) is complete

**Why Deferred**:
- No KEY item type exists in ItemType enum (src/types/core/core.ts:197-207)
- Item spawning system needs to place keys
- Key drop mechanics from monsters/chests needed
- OpenDoorCommand has placeholder (line 53): `// Check for key in inventory (Phase 5)`

### Key System Design (Future)

**Step 1: Add KEY ItemType**

File: `src/types/core/core.ts`

```typescript
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  POTION = 'POTION',
  SCROLL = 'SCROLL',
  RING = 'RING',
  WAND = 'WAND',
  FOOD = 'FOOD',
  GOLD = 'GOLD',
  AMULET = 'AMULET',
  KEY = 'KEY',  // ← NEW
}

export interface Key extends Item {
  type: ItemType.KEY
  keyType: 'generic' | 'specific'  // Generic works on all locks
  doorId?: string  // For specific keys
}
```

**Step 2: Key Drop System**

Add to monster loot tables:
- 5% chance to drop key on death
- Keys placed in treasure chests
- 1-2 keys per level minimum

**Step 3: Update OpenDoorCommand**

```typescript
case DoorState.LOCKED:
  // Check for key in inventory
  const hasKey = state.player.inventory.some(
    (item) => item.type === ItemType.KEY &&
    (item.keyType === 'generic' || item.doorId === door.id)
  )

  if (hasKey) {
    // Consume key (optional - or keys are reusable?)
    return this.openDoor(state, door, level)
  } else {
    // Offer bash option (see next section)
    const messages = this.messageService.addMessage(
      state.messages,
      'The door is locked. Try bashing it? (b)',
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }
```

**Step 4: Update MoveCommand Auto-Open**

```typescript
if (door.state === DoorState.LOCKED) {
  // Check for key in inventory
  const hasKey = state.player.inventory.some(
    (item) => item.type === ItemType.KEY
  )

  if (hasKey) {
    // Auto-unlock and move through
    return this.unlockDoorAndMoveThrough(state, level, door, newPosition)
  } else {
    // No key - show locked message
    const messages = this.messageService.addMessage(
      state.messages,
      'The door is locked. You need a key.',
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }
}
```

### Bash System Design (Future)

**Requirements**:
- Player can attempt to bash locked doors
- Success based on strength or weapon type
- Axe gives bonus, high strength (≥18) improves chance

**BashDoorCommand** (new command):

```typescript
export class BashDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private combatService: CombatService,  // For strength checks
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    const door = level.doors.find(
      (d) => d.position.x === targetPos.x && d.position.y === targetPos.y
    )

    if (!door || door.state !== DoorState.LOCKED) {
      // Can only bash locked doors
      const messages = this.messageService.addMessage(
        state.messages,
        'There is no locked door to bash.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Calculate success chance
    const weapon = state.player.equipment.weapon
    const strength = state.player.strength

    let bashChance = 0.3  // 30% base

    if (strength >= 18) bashChance += 0.3  // +30% for high strength
    if (weapon?.name.includes('Axe')) bashChance += 0.4  // +40% for axe

    const success = this.random.chance(bashChance)

    if (success) {
      // Break the door open (BROKEN state = can't close again)
      const updatedDoor = { ...door, state: DoorState.BROKEN }
      const updatedDoors = level.doors.map((d) =>
        d.position.x === door.position.x && d.position.y === door.position.y
          ? updatedDoor
          : d
      )

      // Update tile
      const updatedTiles = level.tiles.map((row) => [...row])
      const tile = updatedTiles[door.position.y][door.position.x]
      tile.char = "'"
      tile.walkable = true
      tile.transparent = true

      const updatedLevel = { ...level, doors: updatedDoors, tiles: updatedTiles }
      const updatedLevels = new Map(state.levels)
      updatedLevels.set(state.currentLevel, updatedLevel)

      const messages = this.messageService.addMessage(
        state.messages,
        'You bash the door open!',
        'success',
        state.turnCount
      )

      return {
        ...state,
        levels: updatedLevels,
        messages,
        turnCount: state.turnCount + 1,
      }
    } else {
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't force the door open.",
        'warning',
        state.turnCount
      )

      return {
        ...state,
        messages,
        turnCount: state.turnCount + 1,
      }
    }
  }
}
```

**Wire up**: `b` key for bash command

---

## Testing Requirements

### Unit Tests

**DungeonService** (`DungeonService.test.ts`):
- ✅ Existing: 18 tests passing
- ➕ New: 1 test for walkable flags (Task 5)
- **Total**: 19 tests

**MoveCommand** (`door-interaction.test.ts` - NEW):
- ➕ Auto-open tests: 7 tests
- ➕ Locked door tests: 4 tests
- ➕ Other door states: 3 tests
- ➕ Edge cases: 3 tests
- **Total**: 17 new tests

**OpenDoorCommand** (`OpenDoorCommand.test.ts`):
- ✅ Existing tests should still pass (no changes to OpenDoorCommand)

**CloseDoorCommand** (`CloseDoorCommand.test.ts`):
- ✅ Existing tests should still pass

### Integration Tests

**Manual Test Checklist**:

1. **CLOSED Door Behavior**:
   - [ ] Start game with new dungeon
   - [ ] Find a CLOSED door ('+' symbol)
   - [ ] Attempt to walk into it
   - [ ] Verify: Door opens, char changes to "'", player moves through
   - [ ] Verify: Message shows "You open the door and move through"

2. **LOCKED Door Behavior**:
   - [ ] Find a LOCKED door ('+' symbol, less common)
   - [ ] Attempt to walk into it
   - [ ] Verify: Player blocked, message shows "door is locked"
   - [ ] Press 'o' in door direction
   - [ ] Verify: Message shows "need a key"

3. **Explicit Open Command**:
   - [ ] Stand next to CLOSED door
   - [ ] Press 'o' + direction
   - [ ] Verify: Door opens without moving through it

4. **FOV Update**:
   - [ ] Open door into dark room
   - [ ] Verify: FOV expands through open doorway
   - [ ] Verify: CLOSED door blocks vision before opening

5. **Multiple Doors**:
   - [ ] Walk through sequence of doors
   - [ ] Verify: Each opens correctly

6. **Edge Cases**:
   - [ ] Door at map edge
   - [ ] Door with monster on other side
   - [ ] SECRET door (should act as wall until discovered)

### Test Coverage Goals

- **DungeonService**: >90% (currently ~95%)
- **MoveCommand**: >85% (adding door tests)
- **OpenDoorCommand**: Maintain current >90%

**Expected Test Totals**:
- Before: 769 tests passing
- After: 769 + 17 + 1 = **787 tests**

---

## Success Criteria

### Functional Requirements

✅ **Must Work**:
1. CLOSED doors have `walkable=false` in dungeon generation
2. LOCKED doors have `walkable=false` in dungeon generation
3. Moving into CLOSED door auto-opens it and moves player through
4. Moving into LOCKED door shows "locked" message and blocks movement
5. Door tile char changes from '+' to "'" when opened
6. Door state changes from CLOSED to OPEN in level.doors array
7. Tile walkable flag changes from false to true when opened
8. FOV updates correctly after opening door (transparency change)
9. OpenDoorCommand ('o' key) still works for explicit opening
10. CloseDoorCommand ('c' key) still works

✅ **Must Not Break**:
1. All existing 769 tests pass
2. Movement through OPEN doors works normally
3. Movement through BROKEN/ARCHWAY doors works normally
4. SECRET door mechanics unchanged
5. Monster combat after opening door works
6. Light fuel consumption works during door movement
7. Exploration tracking works after opening door

### Performance Requirements

- Door check must be fast (<1ms per movement)
- No noticeable lag when opening doors
- FOV recalculation after door opening should be same speed as normal movement

### UX Requirements

- **Clear feedback**: Message clearly states door was opened
- **Intuitive behavior**: Bump-to-open matches player expectation
- **Visual change**: Door symbol changes from '+' to "'" immediately
- **Consistent**: All CLOSED doors behave the same way

### Code Quality Requirements

- **Architecture compliance**: Follow [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md)
- **Immutability**: All state updates return new objects
- **No logic in commands**: openDoorAndMoveThrough() orchestrates services only
- **Service delegation**: Use MovementService, FOVService, LightingService
- **Test coverage**: >80% for new code
- **No TypeScript errors**: Full type-check passes

---

## Architecture Compliance Checklist

Reference: [docs/ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md)

### Command Layer ✅

**MoveCommand.openDoorAndMoveThrough()**:
- ✅ Orchestrates services (MovementService, LightingService, FOVService)
- ✅ No loops (service calls only)
- ✅ No calculations (services handle logic)
- ✅ Returns new GameState (immutability)
- ✅ Reads like recipe: "Open door → Move player → Tick fuel → Update FOV"

### Service Layer ✅

**No new services needed** - reuse existing:
- ✅ MovementService.movePlayer()
- ✅ LightingService.tickFuel()
- ✅ FOVService.computeFOV()
- ✅ FOVService.updateExploredTiles()
- ✅ MessageService.addMessage()

**DungeonService fix**:
- ✅ Simple flag change (walkable=false)
- ✅ Maintains immutability

### Data Layer ✅

**State Updates**:
- ✅ Door state: CLOSED → OPEN (immutable door object)
- ✅ Tile update: walkable/transparent flags (immutable tile array)
- ✅ Level update: new Level object with updated doors/tiles
- ✅ GameState update: new Map with updated level

**No mutations**: All updates use spread operators `{...}` and `.map()`

---

## Related Work & Patterns to Follow

### Recent Similar Refactorings

**1. Door Placement Fix** (commit f1a12aa - 2025-10-04):
- Fixed door positions from floor tiles to wall tiles
- Pattern: Identified bug in DungeonService → Added test → Fixed → Verified
- **Follow this pattern**: Test-driven fix with clear before/after

**2. Exploration Tracking Extraction** (commit 9be65e6 - 2025-10-04):
- Extracted logic from MoveCommand to FOVService
- Added FOVService.updateExploredTiles()
- Pattern: Command orchestration, service contains logic
- **Follow this pattern**: Keep door logic in services where possible

**3. Import Standardization** (commit 36707e3 - 2025-10-04):
- Use path aliases: `@game/core/core`, `@services/*`
- Pattern: Clean imports, barrel exports
- **Follow this pattern**: Use path aliases in new code

### Code Reuse Opportunities

**OpenDoorCommand.openDoor()** (lines 83-114):
- Already has door opening logic
- Updates door state, tile, levels map
- Adds message
- **Consider**: Extract to DoorService if we add more door commands

**MoveCommand existing structure**:
- FOV update (lines 169-177)
- Fuel tick (lines 138-167)
- Exploration update (line 180)
- **Reuse**: Same pattern in openDoorAndMoveThrough()

---

## Implementation Timeline

### Phase 1: Immediate (Today)

**Estimated Time**: 1.5-2 hours

1. **Fix walkability flags** (10 min)
   - Edit DungeonService.ts line 568
   - Simple one-line change

2. **Add door walkability test** (15 min)
   - Add test to DungeonService.test.ts
   - Verify all door states

3. **Add auto-open to MoveCommand** (30 min)
   - Edit walkability check
   - Add door detection logic
   - Import DoorState

4. **Implement openDoorAndMoveThrough()** (30 min)
   - Add private method
   - Handle door opening + movement
   - Reuse FOV/fuel logic

5. **Create door-interaction.test.ts** (30 min)
   - 15-17 tests covering all scenarios
   - Use existing test patterns

6. **Run tests and verify** (15 min)
   - `npm test DungeonService`
   - `npm test MoveCommand`
   - `npm test` (full suite)
   - Manual testing

7. **Git commit** (5 min)
   - Descriptive commit message
   - Reference issue/design docs

### Phase 2: Future (Phase 5+)

**Estimated Time**: 2-3 hours (when implementing)

1. **Add KEY ItemType** (30 min)
   - Update type definitions
   - Add Key interface

2. **Key drop system** (1 hour)
   - Add to monster loot tables
   - Place in chests
   - Spawn logic

3. **Update OpenDoorCommand** (30 min)
   - Key inventory check
   - Consume or track keys

4. **Update MoveCommand** (30 min)
   - Auto-unlock with key
   - Unlock + move through

5. **Bash system** (1 hour)
   - Create BashDoorCommand
   - Strength/weapon checks
   - BROKEN state handling

6. **Tests for key/bash** (1 hour)
   - Key usage tests
   - Bash success/failure tests
   - Edge cases

---

## Appendix: Quick Reference

### Door States Summary

| State | Char | Walkable | Transparent | Current Bug | Auto-Open? |
|-------|------|----------|-------------|-------------|------------|
| OPEN | ' | true | true | ✅ | N/A (already open) |
| CLOSED | + | **false** | false | ❌ walkable=true | ✅ Yes |
| LOCKED | + | **false** | false | ❌ walkable=true | ❌ No (needs key) |
| BROKEN | ' | true | true | ✅ | N/A (always open) |
| SECRET | # | false | false | ✅ | ❌ No (must discover) |
| ARCHWAY | ' | true | true | ✅ | N/A (no door) |

### Files to Modify (Phase 1)

1. `src/services/DungeonService/DungeonService.ts` - Line 568 (walkable fix)
2. `src/commands/MoveCommand/MoveCommand.ts` - Lines 33-42 (auto-open logic)
3. `src/commands/MoveCommand/MoveCommand.ts` - Add openDoorAndMoveThrough() method
4. `src/commands/MoveCommand/door-interaction.test.ts` - NEW FILE (17 tests)
5. `src/services/DungeonService/DungeonService.test.ts` - Add 1 test (line ~240)

### Test Commands

```bash
# Test door generation
npm test DungeonService

# Test door interaction
npm test MoveCommand

# Full test suite
npm test

# Type check
npx tsc --noEmit
```

### Key Documentation References

- **Game Design**: `docs/game-design.md:81-84` (door symbols)
- **Systems**: `docs/systems-advanced.md:358-365` (door probabilities)
- **Systems**: `docs/systems-advanced.md:385-392` (door state definitions)
- **Architecture**: `docs/ARCHITECTURAL_REVIEW.md` (code quality guidelines)
- **Recent Fix**: Commit f1a12aa (door placement fix - follow this pattern)
- **Recent Refactor**: Commit 9be65e6 (exploration extraction - follow this pattern)

---

**End of Document**

This plan provides comprehensive context for implementing the door system correctly. All code references, design decisions, and implementation details are included for high-quality implementation.
