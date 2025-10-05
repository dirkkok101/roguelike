# ASCII Roguelike - Claude Code Reference

**Project**: Web-based ASCII roguelike inspired by 1980 Rogue  
**Stack**: TypeScript + Vite + Jest (no framework)  
**Current Phase**: Phase 1 - Foundation & Core Loop (5/16 tasks complete)

---

## Workflow Rules (Critical)

1. **Always write descriptive git commit messages** when creating new commits
   - Describe what was changed and why
   - Reference task numbers or features when applicable
   - Example: "feat: implement LightingService fuel consumption with warnings"

2. **Follow plan.md religiously**:
   - Complete each task in order
   - Update plan.md checkboxes as you complete tasks
   - Create a git commit after each completed task or logical unit of work
   - Keep plan.md as source of truth for project status

---

## Quick Links

- **[Development Plan](./plan.md)** - Current tasks and phases
- **[Game Design](./game-design.md)** - What we're building
- **[Architecture](./architecture.md)** - How it's structured
- **[Core Systems](./systems-core.md)** - Lighting, FOV, rendering
- **[Advanced Systems](./systems-advanced.md)** - AI, pathfinding, generation
- **[Testing Strategy](./testing-strategy.md)** - Test organization

---

## Project Overview

Classic roguelike with:
- **10 procedurally generated dungeon levels**
- **26 monsters** (A-Z) with varied AI behaviors
- **Light management system** (torches, lanterns, artifacts)
- **Field of view** based on light radius (1-3 tiles)
- **Turn-based combat** with hunger and permadeath
- **Three-state visibility** (visible/explored/unexplored)

**Win condition**: Retrieve Amulet of Yendor from Level 10, return to Level 1.

---

## Architecture Patterns

### Layered Architecture

```
UI Layer (DOM only, no game logic)
    ↓
Command Layer (orchestrates services)
    ↓
Service Layer (all game logic)
    ↓
Data Layer (immutable state, JSON config)
```

**Critical Rules**:
- UI has ZERO game logic - only renders state
- Commands orchestrate, never implement logic
- All logic lives in services
- State is immutable - return new objects

---

## File Organization

### Folder Structure

```
src/
├── services/ServiceName/
│   ├── ServiceName.ts          # Implementation
│   ├── scenario-name.test.ts   # Scenario-based tests
│   └── index.ts                # Barrel export
├── commands/CommandName/
│   └── (same pattern)
├── types/
└── data/
```

**Key Points**:
- Each service/command in own folder
- Tests colocated with source
- Scenario-based test naming (e.g., `fuel-consumption.test.ts`)
- Always create `index.ts` barrel exports

### Import Pattern

```typescript
// ✅ Use barrel exports with path aliases
import { FOVService } from '@services/FOVService'
import { MoveCommand } from '@commands/MoveCommand'
import { GameState, Player, Monster } from '@game/core/core'

// ❌ Don't import directly
import { FOVService } from '@services/FOVService/FOVService'
import { GameState } from '../types/core/core'  // Use @game instead
```

**Path Aliases:**
- `@services/*` → `src/services/*`
- `@commands/*` → `src/commands/*`
- `@game/*` → `src/types/*` (Note: `@game` not `@types` - TypeScript reserves `@types` for declaration packages)
- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`

---

## Core Architectural Principles

This project follows **Clean Architecture** and **Functional Programming** principles. Understanding these is critical for maintaining code quality.

---

### SOLID Principles

#### Single Responsibility Principle (SRP)
**Each class/service has ONE reason to change**

- **Services**: One domain concern only
  - ✅ `CombatService`: Combat calculations only
  - ✅ `MovementService`: Position/collision only
  - ❌ Bad: `GameService` doing combat + movement + inventory

- **Commands**: One user action only
  - ✅ `MoveCommand`: Handle movement
  - ✅ `AttackCommand`: Handle attack
  - ❌ Bad: `PlayerActionCommand` handling 10 different actions

**When Violated**: Classes grow to 500+ lines, tests become complex, changes ripple unexpectedly

**Real Example**: TurnService extracted from 26 commands → single source of truth for turn logic

---

#### Open/Closed Principle (OCP)
**Open for extension, closed for modification**

- **Extend via composition**, not editing existing code
- **Strategy Pattern**: Different AI behaviors without modifying MonsterAIService
- **Result Objects**: DoorService returns `{level, message}` - extend by adding fields, not changing signature

**When Violated**: Adding features breaks existing code, tests need updates for unrelated changes

---

#### Liskov Substitution Principle (LSP)
**Subtypes must be substitutable for base types**

- **IRandomService** interface:
  - `SeededRandom`: Production (reproducible dungeons)
  - `MockRandom`: Testing (deterministic results)
  - **Interchangeable** without changing service behavior

**When Violated**: Tests fail when swapping implementations, instanceof checks needed

---

#### Interface Segregation Principle (ISP)
**Clients shouldn't depend on methods they don't use**

- **Focused Interfaces**:
  - `ICommand`: Single `execute()` method
  - `IRandomService`: Only RNG methods
  - ❌ Bad: `IGameService` with 50 methods most clients don't need

**When Violated**: Services import interfaces just to use 1-2 methods, forced to implement unused methods

---

#### Dependency Inversion Principle (DIP)
**Depend on abstractions, not concretions**

- **Inject dependencies** via constructor:
  - Depend on `IRandomService` (interface)
  - NOT on `Math.random()` (concrete global)

- **Testability**: Swap real dependencies for mocks
- **Flexibility**: Change implementations without touching clients

**When Violated**: Services use globals (`Math.random()`, `Date.now()`), testing requires monkey-patching

**Real Example**: All services receive `IRandomService` → 100% testable with `MockRandom`

---

### DRY (Don't Repeat Yourself)

**Principle**: Every piece of knowledge has a single source of truth

**Applied**:
- **TurnService** eliminated 26 copies of `turnCount + 1`
- **LevelService** eliminated level transition logic from 3 commands
- **DoorService** eliminated door opening logic from MoveCommand, OpenDoorCommand

**When Violated**:
- Same code copy-pasted across files
- Bug fixes need to be applied in multiple places
- Logic inconsistencies emerge between duplicates

**Red Flags**:
- Code blocks that look similar but slightly different
- Comments saying "same as X but for Y"
- Multiple methods with similar names (`movePlayer`, `moveMonster`, `moveItem`)

---

### YAGNI (You Aren't Gonna Need It)

**Principle**: Build features when needed, not speculatively

**Applied**:
- **WandService** pending targeting system (Phase 5)
  - Charge management implemented NOW (needed)
  - Wand effects postponed UNTIL targeting exists (speculative)

- **ContextService** planned but not implemented
  - Not needed yet
  - Will build when UI polish phase arrives

**When Violated**:
- 50% of code never used
- Premature abstractions make simple changes hard
- "We might need this later" creates complexity debt

**Red Flags**:
- Code for features not in current phase
- Generic abstractions without 3+ use cases
- Configuration for non-existent features

---

### Immutability Principle

**Principle**: Never mutate state, always return new objects

**Why**:
- **Predictability**: No action-at-a-distance bugs
- **Time-Travel**: Undo/redo becomes trivial
- **Testing**: State before/after comparison
- **Concurrency**: Safe for future async features

**Pattern**: Spread operator creates new objects
```
newState = { ...oldState, field: newValue }
newArray = [...oldArray, newItem]
```

**When Violated**:
- UI doesn't update (stale references)
- Undo/redo breaks
- Subtle bugs from unexpected mutations
- Tests become flaky

**Real Example**: All services return new objects, never mutate parameters

---

### Separation of Concerns

**Principle**: Each layer does one thing, delegates the rest

**Layered Architecture**:
```
UI Layer      → Rendering ONLY (zero logic)
Command Layer → Orchestration ONLY (zero implementation)
Service Layer → Logic ONLY (zero UI/commands)
Data Layer    → State ONLY (zero behavior)
```

**Applied**:
- **UI**: Reads state, renders DOM, captures input
- **Commands**: Call services in order, return new state
- **Services**: Implement game rules, return results
- **Data**: Plain objects/interfaces

**When Violated**:
- UI has `if` statements for game logic
- Commands have loops or calculations
- Services manipulate DOM
- Data has methods

**Real Example**: MoveCommand orchestrates 7 services, contains ZERO logic

---

### Key Patterns Summary

| Principle | What | Why | Red Flag |
|-----------|------|-----|----------|
| **Single Responsibility** | One reason to change | Focused, testable | 500+ line files |
| **Dependency Inversion** | Inject abstractions | Testable, flexible | Globals usage |
| **DRY** | Single source of truth | Consistency, maintainability | Copy-paste code |
| **YAGNI** | Build when needed | Simplicity, focus | Unused features |
| **Immutability** | Return new objects | Predictability, debugging | Mutations |
| **Separation of Concerns** | Layered responsibilities | Modularity, clarity | Logic in wrong layer |

---

**See Also**:
- [ARCHITECTURAL_REVIEW.md](./docs/ARCHITECTURAL_REVIEW.md) - Pre-commit checklist
- Real refactoring examples below (sections 5-8)

---

## Testing Requirements

### Coverage Goals

- **Services**: Aim for 100% coverage (pure logic, fully testable)
- **Commands**: >80% coverage (orchestration, less critical)
- **Overall**: >80% lines, branches, functions

**Why**: Services contain business logic → must be bulletproof

---

### Test Organization

**Principle**: Tests grouped by behavior/scenario, not by method name

- ✅ **Good**: `fuel-consumption.test.ts`, `warning-messages.test.ts`
- ❌ **Bad**: `LightingService.test.ts` (one giant file)

**Pattern**: One test file per scenario/feature
```
LightingService/
├── LightingService.ts
├── fuel-consumption.test.ts      # Fuel tracking behavior
├── warning-messages.test.ts      # Warning generation
├── refill-mechanics.test.ts      # Lantern refilling
└── light-sources.test.ts         # Torch/lantern/artifact creation
```

**See**: [Testing Strategy](./testing-strategy.md) for complete organization

---

### Test Pattern: AAA (Arrange-Act-Assert)

**Structure every test**:
1. **Arrange**: Set up test data
2. **Act**: Call method under test
3. **Assert**: Verify result

**Benefits**:
- Clear test structure
- Easy to understand
- Consistent across codebase

---

### MockRandom: Deterministic Testing

**Principle**: Inject `IRandomService` interface, swap for `MockRandom` in tests

**Why**:
- **Predictable**: Tests don't flake from random values
- **Targeted**: Test specific edge cases (max roll, min roll)
- **Fast**: No retry logic needed

**Pattern**:
```
Create MockRandom with predetermined values
Inject into service constructor
Assert exact expected results
```

**See**: `src/services/RandomService/MockRandom.ts`

---

## Key Systems Reference

### Lighting System

- **Torches**: Radius 2, 500 turns fuel
- **Lanterns**: Radius 2, refillable (500 per oil flask)
- **Artifacts**: Radius 3, permanent (no fuel)
- Fuel depletes 1/turn, warnings at 50/10/0 turns
- Vision radius = light radius

**Service**: `LightingService` ([Core Systems](./systems-core.md#lighting-system))

---

### FOV System

- **Algorithm**: Recursive shadowcasting (8 octants)
- **Radius**: Determined by equipped light source
- **Blocking**: Walls, closed doors, secret doors
- **Memory**: Explored tiles tracked, dimmed when out of FOV

**Service**: `FOVService` ([Core Systems](./systems-core.md#fov-system))

---

### Visibility Rendering

Three states:
1. **Visible** (in FOV) - Full color
2. **Explored** (memory) - Dimmed/grayscale
3. **Unexplored** - Hidden (black)

**Critical**: Monsters ONLY render in visible state.

**Service**: `RenderingService` ([Core Systems](./systems-core.md#visibility-color-system))

---

### Monster AI

7 behaviors:
- **SMART**: A* pathfinding (Dragon, Jabberwock, etc.)
- **SIMPLE**: Greedy movement (Zombie, Troll, etc.)
- **GREEDY**: Prioritizes gold (Orc)
- **ERRATIC**: 50% random (Bat, Kestrel)
- **THIEF**: Steal and flee (Leprechaun, Nymph)
- **STATIONARY**: Don't move (Venus Flytrap)
- **COWARD**: Flee at low HP (Vampire)

**Service**: `MonsterAIService` ([Advanced Systems](./systems-advanced.md#monster-ai))

---

### Dungeon Generation

- **Room + Corridor** approach
- **Minimum Spanning Tree** for connectivity
- **Loops** for alternate paths (30% chance)
- **6 door types**: open, closed, locked, secret, broken, archway
- **Winding corridors** with bends

**Service**: `DungeonService` ([Advanced Systems](./systems-advanced.md#dungeon-generation))

---

## Data Structures

**All type definitions** live in `src/types/core/core.ts`

**Key Structures**:
- **GameState**: Root game state (player, levels, messages, turn count)
- **Player**: Player state (position, stats, inventory, equipment)
- **Level**: Dungeon level (tiles, monsters, items, doors, traps)
- **Monster**: AI-controlled entity (behavior, state, pathfinding)
- **Item Types**: Weapon, Armor, Potion, Scroll, Ring, Wand, Food
- **Equipment**: Worn/wielded items (weapon, armor, rings, light)
- **LightSource**: Torches, lanterns, artifacts (radius, fuel)

**See**:
- Type definitions: `src/types/core/core.ts`
- Detailed specs: [Architecture - Data Structures](./architecture.md#data-structures)

---

## Current Phase 1 Tasks

**Goal**: Basic movement, rendering, lighting working

**Priority Tasks**:
1. ✅ Project setup (Vite + TypeScript + Jest)
2. ⚪ Configure Jest with path aliases
3. ⚪ Core data structures (GameState, Player, Level, LightSource)
4. ⚪ RandomService (IRandomService, SeededRandom, MockRandom)
5. ⚪ LightingService + tests
6. ⚪ FOVService + tests
7. ⚪ RenderingService + tests
8. ⚪ MovementService + tests
9. ⚪ MoveCommand + tests
10. ⚪ Basic UI (dungeon renderer, stats, message log)

**Deliverable**: Move around room, see FOV change, fuel depletes, fog of war works.

See [Plan - Phase 1](./plan.md#phase-1-foundation--core-loop-week-1-2) for details.

---

## Common Pitfalls

### 1. Logic in UI Layer
**Violates**: Separation of Concerns

❌ **Problem**: UI components contain game logic (damage calculation, state mutation)

✅ **Solution**: UI only renders state and captures input → delegates to commands

**Pattern**:
```
Input Event → Create Command → Execute → Render New State
```

**Red Flags**:
- `if/else` logic in UI event handlers
- Direct state mutation from UI
- Calculations in render functions

**See**: UI has ZERO logic rule above

---

### 2. Logic in Command Layer
**Violates**: Single Responsibility, Dependency Inversion

❌ **Problem**: Commands implement game logic (calculations, algorithms, rules)

✅ **Solution**: Commands orchestrate services, each service call is one line

**Pattern**:
```
Command.execute():
  1. Call ServiceA.method()
  2. Call ServiceB.method()
  3. Call ServiceC.method()
  4. Return new state
```

**Red Flags**:
- Loops (`for`, `forEach`, `map`)
- Calculations (`Math.*`, arithmetic)
- Conditional logic beyond simple routing
- Array/object manipulation

**See**: Sections 5-8 below for real refactoring examples

---

### 3. Non-Deterministic Tests
**Violates**: Dependency Inversion (using concrete `Math.random()`)

❌ **Problem**: Tests use real randomness → flaky, unreliable, hard to debug

✅ **Solution**: Inject `IRandomService`, use `MockRandom` with predetermined values

**Why This Matters**:
- Flaky tests destroy CI/CD confidence
- Can't test specific edge cases (max damage, min damage)
- Debugging random failures wastes hours

**Pattern**:
```
Test Setup:
  Create MockRandom with controlled values
  Inject into service
  Assert exact expected result
```

**See**: MockRandom section above

---

### 4. State Mutation
**Violates**: Immutability Principle

❌ **Problem**: Direct modification of state objects

✅ **Solution**: Return new objects with spread operator

**Why This Matters**:
- React-style frameworks won't detect changes
- Breaks time-travel debugging
- Creates action-at-a-distance bugs
- Makes undo/redo impossible

**Pattern**: Always use spread operator
```
newObject = { ...oldObject, field: newValue }
newArray = [...oldArray, newItem]
```

**Red Flags**:
- Assignment to object properties after creation
- `push()`, `splice()`, direct array index assignment
- `++`, `--` operators on object fields

**See**: Immutability Principle above

---

### 5. Real Example: FOV Exploration Logic Extraction
**Principle Applied**: Single Responsibility Principle

**Commit**: `9be65e6`

**Problem Identified**: MoveCommand contained exploration tracking logic
- `forEach` loop iterating visible cells
- Array manipulation (map, direct index access)
- Business logic (marking tiles as explored)

**Principle Violated**: Commands should orchestrate, not implement

**Conceptual Before**:
```
MoveCommand.execute():
  Calculate new position
  Create explored tile copy
  FOR EACH visible cell:           ← Logic in command!
    Convert position key
    Update explored array           ← Data manipulation!
  Return new state
```

**Conceptual After**:
```
MoveCommand.execute():
  Calculate new position
  Update explored via service       ← One line orchestration
  Return new state
```

**Extraction**:
- Moved logic to `FOVService.updateExploredTiles()`
- Command reduced from 11 lines to 1
- Logic now testable in isolation

**Why This Matters**:
- **Single Responsibility**: FOVService owns all FOV/exploration logic
- **Testability**: Can test exploration without command overhead
- **Reusability**: Other commands can now call same method

**See**: `src/services/FOVService/exploration-tracking.test.ts`

### 6. Real Example: TurnService Standardization (Fixed in commit 1902d9c)

**The Problem**: Multiple commands duplicated turn increment logic with inconsistent patterns:

```typescript
// ❌ Bad - Duplicated in each command
// In MoveCommand.ts
return {
  ...state,
  turnCount: state.turnCount + 1,
}

// In AttackCommand.ts
return {
  ...state,
  turnCount: state.turnCount + 1,
}

// In PickUpCommand.ts
return {
  ...state,
  turnCount: state.turnCount + 1,
}
```

**Red Flags Detected**:
- Logic duplication across commands
- Arithmetic operations in commands
- Future complexity (turn-based effects, monster turns, etc.)

**The Fix**: Create TurnService to centralize turn management:

```typescript
// ✅ Good - Standardized across all commands
return this.turnService.incrementTurn(state)
```

**TurnService handles all turn logic**:
```typescript
// In TurnService.ts
incrementTurn(state: GameState): GameState {
  return {
    ...state,
    turnCount: state.turnCount + 1,
    // Future: trigger turn-based effects, status decay, etc.
  }
}
```

**Benefits**:
- Eliminates duplication across 26 commands
- Single source of truth for turn mechanics
- Easy to add turn-based effects later (poison damage, status decay, monster regeneration)
- Testable in isolation

**Lesson**: When you see the same pattern repeated in multiple commands, extract to a service!

### 7. Real Example: LevelService Extraction (Fixed in commit 77490bf)

**The Problem**: MoveStairsCommand contained level transition logic:

```typescript
// ❌ Bad - Logic in Command (MoveStairsCommand.ts)
execute(state: GameState): GameState {
  const direction = this.direction // 'up' or 'down'
  const newLevel = direction === 'up'
    ? state.currentLevel - 1
    : state.currentLevel + 1

  // Validation logic
  if (newLevel < 1 || newLevel > 10) {
    return state // Can't go beyond dungeon bounds
  }

  // Victory check logic
  if (state.hasAmulet && newLevel === 0) {
    return { ...state, isVictory: true }
  }

  // Level loading/creation logic
  let targetLevel = state.levels.get(newLevel)
  if (!targetLevel) {
    targetLevel = this.dungeonService.generateLevel(newLevel, state.seed)
  }

  // Position calculation logic
  const newPosition = direction === 'up'
    ? targetLevel.stairsDown
    : targetLevel.stairsUp

  // ... more logic
}
```

**Red Flags Detected**:
- Conditional logic (level bounds, victory condition)
- Calculations (level arithmetic)
- Multiple responsibilities (validation, generation, positioning)
- 40+ lines in command

**The Fix**: Extract all logic to LevelService:

```typescript
// ✅ Good - Orchestration Only (MoveStairsCommand.ts)
execute(state: GameState): GameState {
  const result = this.levelService.transitionLevel(
    state,
    this.direction,
    this.dungeonService
  )

  if (!result.success) {
    return state // LevelService determined transition invalid
  }

  return this.turnService.incrementTurn({
    ...state,
    ...result.updates // New level, position, victory state
  })
}
```

**LevelService handles transition logic**:
```typescript
// In LevelService.ts
transitionLevel(state: GameState, direction: 'up' | 'down', dungeonService: DungeonService) {
  const newLevel = this.calculateTargetLevel(state.currentLevel, direction)

  if (!this.isValidLevel(newLevel)) {
    return { success: false }
  }

  if (this.checkVictory(state, newLevel)) {
    return { success: true, updates: { isVictory: true } }
  }

  const targetLevel = this.getOrGenerateLevel(state.levels, newLevel, state.seed, dungeonService)
  const newPosition = this.getSpawnPosition(targetLevel, direction)

  return {
    success: true,
    updates: {
      currentLevel: newLevel,
      levels: state.levels.set(newLevel, targetLevel),
      player: { ...state.player, position: newPosition }
    }
  }
}
```

**Benefits**:
- Command reduced from 40+ lines to 10
- All level transition logic in one place
- Testable without full game state
- Reusable for teleportation, pit falls, etc.

**Lesson**: If a command has multiple responsibilities, extract each domain into its own service!

### 8. Real Example: DoorService Result Objects (Fixed in commit 17e57b9)

**The Problem**: MoveCommand handled door opening with mixed responsibilities:

```typescript
// ❌ Bad - Door logic in MoveCommand
if (obstacle.type === 'door' && obstacle.data.state === DoorState.CLOSED) {
  // Find door in level.doors array
  const doorIndex = level.doors.findIndex(d =>
    d.position.x === obstacle.data.position.x &&
    d.position.y === obstacle.data.position.y
  )

  // Mutate door state
  const updatedDoors = [...level.doors]
  updatedDoors[doorIndex] = { ...updatedDoors[doorIndex], state: DoorState.OPEN }

  // Generate message
  const message = obstacle.data.wasSecret
    ? "You discover and open a secret door!"
    : "You open the door."

  // Update level
  const updatedLevel = { ...level, doors: updatedDoors }
  const updatedLevels = new Map(state.levels).set(state.currentLevel, updatedLevel)

  // Add message and continue with movement
  const messages = this.messageService.addMessage(state.messages, message, 'info')
  return this.performMovement({ ...state, levels: updatedLevels, messages }, newPosition, updatedLevel)
}
```

**Red Flags Detected**:
- Array search (`findIndex`)
- Array manipulation (`[...]`, index assignment)
- Conditional logic for message generation
- Multiple responsibilities (find, update, message, coordinate movement)

**The Fix**: DoorService returns result objects with updated level and message:

```typescript
// ✅ Good - Orchestration Only
if (obstacle.type === 'door' &&
    (obstacle.data.state === DoorState.CLOSED || obstacle.data.wasSecret)) {
  const result = this.doorService.openDoorWithResult(level, obstacle.data)

  const stateWithOpenDoor = {
    ...state,
    levels: new Map(state.levels).set(state.currentLevel, result.level),
  }

  const messages = this.messageService.addMessage(
    stateWithOpenDoor.messages,
    result.message,
    'info',
    state.turnCount + 1
  )

  return this.performMovement({ ...stateWithOpenDoor, messages }, newPosition, result.level)
}
```

**DoorService returns structured results**:
```typescript
// In DoorService.ts
interface DoorOpenResult {
  level: Level      // Updated level with door state changed
  message: string   // User-facing message
}

openDoorWithResult(level: Level, door: Door): DoorOpenResult {
  const updatedDoors = level.doors.map(d =>
    d.position.x === door.position.x && d.position.y === door.position.y
      ? { ...d, state: DoorState.OPEN }
      : d
  )

  const message = door.discovered && door.state === DoorState.SECRET
    ? "You discover and open a secret door!"
    : "You open the door."

  return {
    level: { ...level, doors: updatedDoors },
    message,
  }
}
```

**Benefits**:
- Command reduced from 20 lines to 7
- Door logic centralized in DoorService
- Result object pattern provides type-safe returns
- Message generation logic testable in isolation
- Pattern reusable for traps, chests, etc.

**Lesson**: When services need to return multiple related values, use result objects for type-safe, structured returns!

### How to Detect Logic in Commands (Quick Reference)

**🚨 Red Flags** - If you see these in a command file, review carefully:

| Pattern | Example | Why It's Bad | Fix |
|---------|---------|--------------|-----|
| Loops | `forEach`, `for`, `while`, `map` | Business logic iteration | Extract to service method |
| Array manipulation | `push`, `splice`, `[index]` | Data structure logic | Extract to service method |
| Calculations | `Math.floor`, `+`, `-`, `*`, `/` | Business rule calculations | Extract to service method |
| String manipulation | `split`, `join`, `replace` | Data transformation logic | Extract to service method |
| Complex conditionals | Nested `if/else`, `switch` | Business rule decisions | Extract to service method |
| Object iteration | `Object.keys`, `Object.entries` | Data structure traversal | Extract to service method |

**✅ Acceptable in Commands** - These are fine for orchestration:

| Pattern | Example | Why It's OK |
|---------|---------|-------------|
| Simple routing | `if (monster) attack() else move()` | Routing to different services |
| Guard clauses | `if (!walkable) return state` | Early exit orchestration |
| Service calls | `this.service.method()` | Core purpose of commands |
| State spreading | `{ ...state, player: {...} }` | Immutable state updates |

**Quick Test**: "Can I explain what this command does in 3 sentences without mentioning implementation details?"
- ✅ Yes → Probably good orchestration
- ❌ No → Contains too much logic

**See** [docs/ARCHITECTURAL_REVIEW.md](./docs/ARCHITECTURAL_REVIEW.md) **for complete checklist and examples.**

---

## Running the Project

```bash
# Development
npm run dev          # Start dev server

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Build
npm run build        # Production build
npm run preview      # Preview build

# Type checking
npm run type-check   # TypeScript validation
```

---

## When Working on a Task

**Follow this workflow** (see [Workflow Rules](#workflow-rules-critical) above):

1. **Check the plan**: [plan.md](./plan.md) - identify next task in current phase
2. **Read relevant specs**: 
   - [Game Design](./game-design.md) - gameplay mechanics and rules
   - [Architecture](./architecture.md) - technical patterns and services
   - [Core Systems](./systems-core.md) - lighting, FOV, rendering
   - [Advanced Systems](./systems-advanced.md) - AI, pathfinding, generation
   - [Testing Strategy](./testing-strategy.md) - test organization and conventions
3. **Create folder structure**: `ServiceName/` with `.ts` + `.test.ts` + `index.ts`
4. **Write tests first** (TDD when possible)
5. **Implement with dependency injection**
6. **Ensure immutability** (return new objects, never mutate)
7. **Verify architecture** ([docs/ARCHITECTURAL_REVIEW.md](./docs/ARCHITECTURAL_REVIEW.md)):
   - Commands orchestrate only (no loops, calculations, or logic)
   - Services contain all logic
   - No mutations (return new objects)
8. **Run tests**: `npm test ServiceName`
9. **Check coverage**: Aim for >80%
10. **Update plan.md**: Mark task checkbox as complete `[x]`
11. **Git commit**: Write descriptive commit message describing what was done
    - Example: `feat: implement LightingService with fuel tracking and warnings`
    - Example: `test: add FOVService shadowcasting algorithm tests`
    - Example: `refactor: extract corridor generation into separate method`

---

## Debug Tools

Debug mode enabled in development:
- **`~`** - Toggle debug console
- **`g`** - God mode (invincible)
- **`v`** - Reveal entire map
- **`f`** - Toggle FOV overlay
- **`p`** - Toggle pathfinding overlay

See [Advanced Systems - Debug System](./systems-advanced.md#debug-system)

---

## Questions?

1. Check relevant doc (Game Design, Architecture, Systems)
2. Review [Testing Strategy](./testing-strategy.md) for conventions
3. Look at existing similar service for patterns
4. Update this file if you discover important patterns

---

## Project Status

**Phase**: 1 of 8 (Foundation)  
**Progress**: 5/16 tasks (31%)  
**Next Milestone**: Basic movement + lighting + FOV working  
**Target**: End of Week 2

---

**Last Updated**: 2025-10-03  
**Developer**: Dirk Kok  
**Repository**: https://github.com/dirkkok101/roguelike
