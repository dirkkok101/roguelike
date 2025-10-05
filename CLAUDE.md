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

## Coding Conventions

### 1. Dependency Injection

Always inject dependencies (especially RandomService):

```typescript
// ✅ Good
class CombatService {
  constructor(private random: IRandomService) {}
}

// ❌ Bad
class CombatService {
  calculateDamage() {
    return Math.random() * 10  // Not testable!
  }
}
```

### 2. Immutability

State updates must return new objects:

```typescript
// ✅ Good
tickFuel(light: LightSource): LightSource {
  return { ...light, fuel: light.fuel - 1 }
}

// ❌ Bad
tickFuel(light: LightSource): LightSource {
  light.fuel -= 1  // Mutation!
  return light
}
```

### 3. Command Pattern

Commands orchestrate services, contain NO logic:

```typescript
class MoveCommand implements ICommand {
  constructor(
    private movement: MovementService,
    private lighting: LightingService,
    private fov: FOVService
  ) {}
  
  execute(state: GameState): GameState {
    // 1. Move player (MovementService)
    // 2. Tick fuel (LightingService)
    // 3. Recompute FOV (FOVService)
    // 4. Return new state
  }
}
```

---

## Testing Requirements

### Coverage Goals

- **>80% coverage** required (lines, branches, functions)
- Services: aim for 100%
- Commands: >80%

### Test Naming

```typescript
// ✅ Good - scenario-based
describe('LightingService - Fuel Consumption', () => {
  test('reduces fuel by 1 each tick')
  test('warns at 50 turns remaining')
})

// ❌ Bad - implementation-focused
describe('LightingService', () => {
  test('tickFuel')
})
```

### Test Pattern (AAA)

```typescript
test('reduces fuel by 1 each tick', () => {
  // Arrange
  const torch = service.createTorch()
  
  // Act
  const ticked = service.tickFuel(torch)
  
  // Assert
  expect(ticked.fuel).toBe(499)
})
```

### Use MockRandom

```typescript
test('damage calculation', () => {
  const mockRandom = new MockRandom([8])  // Deterministic
  const service = new CombatService(mockRandom)
  
  expect(service.calculateDamage('1d8')).toBe(8)
})
```

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

## Data Structures (Key Ones)

```typescript
interface GameState {
  player: Player
  currentLevel: number
  levels: Map<number, Level>  // Persisted levels
  messageLog: string[]
  turnCount: number
  seed: string
  // ... more
}

interface Player {
  position: Position
  hp: number
  maxHp: number
  strength: number
  level: number
  xp: number
  gold: number
  armorClass: number
  inventory: Item[]
  equipped: Equipment
  foodUnits: number
  lightSource: LightSource | null
  visibleCells: Set<Position>
  // ... more
}

interface LightSource {
  type: 'torch' | 'lantern' | 'artifact'
  radius: number  // 1-3
  isPermanent: boolean
  fuel?: number
  maxFuel?: number
  name: string
}

interface Monster {
  letter: string  // 'A'-'Z'
  name: string
  position: Position
  hp: number
  aiProfile: MonsterAIProfile
  state: MonsterState  // SLEEPING, HUNTING, FLEEING
  visibleCells: Set<Position>
  currentPath: Position[] | null
  // ... more
}
```

Full specs: [Architecture - Data Structures](./architecture.md#data-structures)

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

### 1. Don't Put Logic in UI
```typescript
// ❌ Bad
button.onclick = () => {
  player.hp -= damage  // Logic in UI!
}

// ✅ Good
button.onclick = () => {
  const command = new AttackCommand(services)
  const newState = command.execute(state)
  render(newState)
}
```

### 2. Don't Put Logic in Commands
```typescript
// ❌ Bad
execute(state: GameState) {
  const damage = Math.floor(Math.random() * 10)  // Logic!
  return { ...state, player: { ...state.player, hp: hp - damage }}
}

// ✅ Good
execute(state: GameState) {
  const damage = this.combatService.calculateDamage(attacker, weapon)
  return this.combatService.applyDamage(state, damage)
}
```

### 3. Always Test with MockRandom
```typescript
// ❌ Bad - flaky test
test('damage varies', () => {
  const damage = service.calculateDamage('1d8')
  expect(damage).toBeGreaterThan(0)  // Could randomly fail!
})

// ✅ Good - deterministic
test('rolls specified die', () => {
  const mock = new MockRandom([8])
  const service = new CombatService(mock)
  expect(service.calculateDamage('1d8')).toBe(8)
})
```

### 4. Don't Mutate State
```typescript
// ❌ Bad
function movePlayer(state: GameState, pos: Position) {
  state.player.position = pos  // Mutation!
  return state
}

// ✅ Good
function movePlayer(state: GameState, pos: Position) {
  return {
    ...state,
    player: { ...state.player, position: pos }
  }
}
```

### 5. Real Example: MoveCommand Exploration Logic (Fixed in commit 9be65e6)

**The Problem**: We found logic in MoveCommand that iterated through visible cells and marked tiles as explored:

```typescript
// ❌ Bad - Logic in Command (MoveCommand.ts lines 179-189)
const updatedLevel = {
  ...level,
  explored: level.explored.map((row) => [...row]),
}
visibleCells.forEach((key) => {
  const pos = this.fovService.keyToPos(key)
  if (updatedLevel.explored[pos.y]) {
    updatedLevel.explored[pos.y][pos.x] = true  // Logic in command!
  }
})
```

**Red Flags Detected**:
- `forEach` loop in command
- Array manipulation (`map`, direct array access)
- Game logic (marking tiles as explored)

**The Fix**: Extract to FOVService method, command becomes one line:

```typescript
// ✅ Good - Orchestration Only
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
```

**FOVService gains the method**:
```typescript
// In FOVService.ts
updateExploredTiles(level: Level, visibleCells: Set<string>): Level {
  const updatedExplored = level.explored.map((row) => [...row])

  visibleCells.forEach((key) => {
    const pos = this.keyToPos(key)
    if (updatedExplored[pos.y] && updatedExplored[pos.y][pos.x] !== undefined) {
      updatedExplored[pos.y][pos.x] = true
    }
  })

  return { ...level, explored: updatedExplored }
}
```

**Benefits**:
- Command reduced from 11 lines to 1
- Logic testable in isolation (exploration-tracking.test.ts)
- Method reusable across codebase
- Follows architecture: commands orchestrate, services contain logic

**Lesson**: If you see loops, conditionals, or data manipulation in a command, extract to a service!

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
