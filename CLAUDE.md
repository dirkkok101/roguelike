# ASCII Roguelike - Claude Code Reference

**Project**: Web-based roguelike inspired by 1980 Rogue with sprite-based rendering
**Stack**: TypeScript + Vite + Jest + Canvas 2D (AngbandTK tileset)
**Current Implementation**: 26-level authentic Rogue implementation complete

---

## Workflow Rules (Critical)

1. **Always write descriptive git commit messages** when creating new commits
   - Describe what was changed and why
   - Reference task numbers or features when applicable
   - Example: "feat: implement LightingService fuel consumption with warnings"
2. **Always create a detailed plan and store it in a feature_name_plan.md file**
   - The plan should have objectives
   - The plan should have phases, tasks and sub-tasks
   - The plan should reference relevant documentation for context
   - Complete each phase, task and sub-task in order
   - Mark each task as complete
   - Create a git commit after each task is completed

---

## Quick Links

**Getting Started:**
- **[Documentation Hub](./docs/README.md)** - All documentation organized by topic
- **[Getting Started Guide](./docs/getting-started.md)** - New developer onboarding
- **[Contributing Guide](./docs/contributing.md)** - Development workflow and best practices

**Game Design:**
- **[Game Design](./docs/game-design/README.md)** - What we're building
- **[Current Plan](./docs/plan.md)** - Development roadmap

**Technical Architecture:**
- **[Architecture](./docs/architecture.md)** - How it's structured (SOLID principles, layers)
- **[Core Systems](./docs/systems-core.md)** - Lighting, FOV, rendering
- **[Advanced Systems](./docs/systems-advanced.md)** - AI, pathfinding, generation
- **[Testing Strategy](./docs/testing-strategy.md)** - Test organization

**Debugging & Replay:**
- **[Replay System](./docs/replay-system.md)** - Event sourcing debug workflow, deterministic replay

**Implementation Guides:**
- **[Services Guide](./docs/services/README.md)** - All 35 services reference
- **[Commands Guide](./docs/commands/README.md)** - All 40+ commands reference
- **[Architectural Review](./docs/ARCHITECTURAL_REVIEW.md)** - Pre-commit checklist

**Troubleshooting:**
- **[Troubleshooting Guide](./docs/troubleshooting.md)** - Common issues and solutions

---

## Project Overview

Classic roguelike with modern sprite rendering:
- **26 procedurally generated dungeon levels** (authentic 1980 Rogue depth)
- **26 monsters** (A-Z) with varied AI behaviors
- **Vorpal spawning system** ([depth-6, depth+3] range for authentic difficulty curve)
- **Sprite-based graphics** (AngbandTK Gervais 32×32 tileset)
- **Light management system** (torches, lanterns, artifacts)
- **Field of view** based on light radius (1-3 tiles)
- **Turn-based combat** with hunger and permadeath
- **Three-state visibility** (visible/explored/unexplored with opacity)
- **Amulet quest** with return journey and monster respawning

**Win condition**: Retrieve Amulet of Yendor from Level 26, return to Level 1.
**Journey**: 52 total levels (26 down + 26 up with Amulet)

---

## Architecture Patterns (Quick Reference)

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

**See**: [Architecture Doc](./docs/architecture.md) for detailed layer specifications

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

**See**: [Architecture - File Organization](./docs/architecture.md#test-organization-strategy)

---

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
- `@game/*` → `src/types/*` (Note: `@game` not `@types`)
- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`

---

## Core Architectural Principles

This project follows **Clean Architecture** and **Functional Programming** principles.

**Key Principles:**
- **SOLID** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY** - Don't Repeat Yourself (single source of truth)
- **YAGNI** - You Aren't Gonna Need It (build when needed)
- **Immutability** - Never mutate state (return new objects)
- **Separation of Concerns** - Each layer has one responsibility

**Detailed explanations**: [Architecture - SOLID Principles](./docs/architecture.md#solid-principles)
**Real-world examples**: [Architectural Review](./docs/ARCHITECTURAL_REVIEW.md)

---

## Testing Requirements

### Coverage Goals

- **Services**: Aim for 100% coverage (pure logic, fully testable)
- **Commands**: >80% coverage (orchestration, less critical)
- **Overall**: >80% lines, branches, functions

### Test Organization

**Principle**: Tests grouped by behavior/scenario, not by method name

- ✅ **Good**: `fuel-consumption.test.ts`, `warning-messages.test.ts`
- ❌ **Bad**: `LightingService.test.ts` (one giant file)

**Pattern**: One test file per scenario/feature

**See**: [Testing Strategy](./docs/testing-strategy.md) for complete organization

---

### Test Pattern: AAA (Arrange-Act-Assert)

**Structure every test**:
1. **Arrange**: Set up test data
2. **Act**: Call method under test
3. **Assert**: Verify result

**See**: [Testing Guide](./docs/services/testing-guide.md) for detailed patterns

---

### MockRandom: Deterministic Testing

**Principle**: Inject `IRandomService` interface, swap for `MockRandom` in tests

**Why**:
- **Predictable**: Tests don't flake from random values
- **Targeted**: Test specific edge cases (max roll, min roll)
- **Fast**: No retry logic needed

**See**: `src/services/RandomService/MockRandom.ts`

---

## Key Systems Reference

### Lighting System
- **Torches**: Radius 2, 650 turns fuel
- **Lanterns**: Radius 2, refillable (750 starting, 1500 max capacity, 600 per oil flask)
- **Artifacts**: Radius 3, permanent (no fuel)

**Rebalanced for 26-level journey** (52 total levels with return)

**Details**: [Core Systems - Lighting](./docs/systems-core.md#lighting-system)

---

### FOV System
- **Algorithm**: Recursive shadowcasting (8 octants)
- **Radius**: Determined by equipped light source
- **Memory**: Explored tiles tracked, dimmed when out of FOV

**Details**: [Core Systems - FOV](./docs/systems-core.md#fov-system)

---

### Visibility Rendering

Three states with sprite opacity:
1. **Visible** (in FOV) - Full opacity (1.0), full color
2. **Explored** (memory) - 50% opacity (0.5), dimmed
3. **Unexplored** - Hidden (not rendered)

**Critical**: Monsters ONLY render in visible state.

**Details**: [Core Systems - Visibility](./docs/systems-core.md#visibility-color-system)

---

### Sprite Rendering System

Hardware-accelerated canvas rendering with sprites:
- **Tileset**: AngbandTK Gervais 32×32 (single PNG atlas + .prf mappings)
- **Canvas**: 2560×704px (80×22 tiles @ 32px per tile)
- **Rendering**: GPU-accelerated via Canvas 2D API
- **Effects**: Color tinting for monster threat levels, opacity for visibility states
- **Performance**: 200-300 FPS on modern hardware (target: 60 FPS)

**Key Components**:
- **AssetLoaderService**: Loads PNG sprite sheets, parses Angband .prf files
- **CanvasGameRenderer**: Renders game state to canvas using sprites
- **RenderingService**: Determines visibility states (unchanged from ASCII)

**Details**: [Core Systems - Sprite Rendering](./docs/systems-core.md#sprite-rendering-system)

---

### Monster AI

7 behaviors: SMART, SIMPLE, GREEDY, ERRATIC, THIEF, STATIONARY, COWARD

**Wake Mechanics** (authentic 1980 Rogue):
- **Aggro ranges**: 3-5 (simple), 6-8 (smart), 8-10 (boss) tiles
- **Running detection**: Effective range × 1.5 when player running
- **Door slam wake**: Returning to doorway wakes connected room monsters
- **Wandering spawns**: Progressive spawn chance (0.5% base, max 5 per level)
- **Monster sightings**: "You see a Dragon!" messages
- **Wake-up messages**: "The Orc wakes up!" notifications

**Details**: [Advanced Systems - Monster AI](./docs/systems-advanced.md#monster-ai)
**Services**: [MonsterAIService](./docs/services/MonsterAIService.md) | [WanderingMonsterService](./docs/services/WanderingMonsterService.md) | [NotificationService](./docs/services/NotificationService.md)

---

### Dungeon Generation

- **Room + Corridor** approach
- **Minimum Spanning Tree** for connectivity
- **Loops** for alternate paths (30% chance)

**Details**: [Advanced Systems - Dungeon Generation](./docs/systems-advanced.md#dungeon-generation)

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

**See**: [Architecture - Data Structures](./docs/architecture.md#data-structures)

---

## Save & Replay Storage (Quick Reference)

**Architecture**: Unified storage - replay data embedded in save files

### Storage Format

Save files (IndexedDB 'saves' store) contain:
- **gameState**: Compressed game state (serialized via Web Workers)
- **replayData**: Embedded replay information
  - `initialState`: Game state at turn 0
  - `seed`: RNG seed for deterministic replay
  - `commands`: Full command history from turn 0
- **metadata**: Character name, turn count, level, timestamp
- **version**: Save format version (current: 6)

### Key Services

- **GameStorageService**: Handles save/load operations, embeds replay data automatically
- **CommandRecorderService**: Records commands during gameplay, provides in-memory command log
- **ReplayDebuggerService**: Loads and reconstructs game states from embedded replay data
- **IndexedDBService**: Database operations (DB version 2, single 'saves' store)

### Benefits

1. **Unified storage**: No separate 'replays' store - replay data travels with saves
2. **Automatic persistence**: Saving game automatically saves full replay history
3. **Turn-accurate loading**: Loading a save at turn N preserves replay from turn 0
4. **Dual access**: Current session uses in-memory data, historical games use IndexedDB
5. **Simplified cleanup**: Deleting a save automatically deletes its replay data

**Details**: [Replay System](./docs/replay-system.md)

---

## State Management (Quick Reference)

**Pattern**: Pushdown Automaton (State Stack)

### State Stack Basics

The game uses a **state stack** to manage screens, dialogs, and modals:

```
Stack (top = active):
┌─────────────────┐
│ Item Selection  │ ← Handles input
├─────────────────┤
│ Inventory       │ ← Paused, visible (transparent)
├─────────────────┤
│ Playing         │ ← Paused, not visible
└─────────────────┘
```

**Operations**:
- **Push** = Open new state (menu, dialog)
- **Pop** = Close current, restore previous
- **Replace** = Transition between major states

### Quick Examples

**Open Modal**:
```typescript
stateManager.pushState(new InventoryState(...))
```

**Close Modal (ESC)**:
```typescript
stateManager.popState()
```

**Start New Game**:
```typescript
stateManager.replaceState(new PlayingState(...))
```

**Return to Main Menu**:
```typescript
stateManager.clearStack()
stateManager.pushState(new MainMenuState(...))
```

### Creating New States

**Extend BaseState**:
```typescript
export class MyState extends BaseState {
  // Must implement
  update(deltaTime: number) { }
  render() { }
  handleInput(input: Input) { }

  // Optional overrides
  isPaused() { return true }      // Pause lower states?
  isTransparent() { return true }  // Show background?
  enter() { /* Setup */ }
  exit() { /* Cleanup */ }
}
```

**State Types**:
- **PlayingState**: Main gameplay (opaque, not paused)
- **MainMenuState**: Title screen (opaque, paused)
- **DeathScreenState**: Game over (opaque, paused)
- **InventoryState**: Inventory display (transparent, paused)
- **ItemSelectionState**: Item prompts (transparent, paused)
- **TargetSelectionState**: Cursor targeting (transparent, paused)

### Common Patterns

**Modal Dialog**:
```typescript
stateManager.pushState(new ModalState(() => {
  stateManager.popState() // Close on ESC
}))
```

**Two-Step Selection** (Item → Target):
```typescript
stateManager.pushState(new ItemSelectionState(
  "Zap which wand?",
  filter,
  (wand) => {
    stateManager.pushState(new TargetSelectionState(
      range,
      (pos) => {
        wandService.zap(gameState, wand, pos)
        stateManager.popState() // Close targeting
        stateManager.popState() // Close item selection
      },
      () => stateManager.popState() // Cancel
    ))
  },
  () => stateManager.popState() // Cancel
))
```

**Details**: [GameStateManager Service](./docs/services/GameStateManager.md)

---

## Common Pitfalls (Quick Reference)

### 1. Logic in UI Layer
**Violates**: Separation of Concerns

✅ **Solution**: UI only renders state and captures input → delegates to commands

**Details**: [ARCHITECTURAL_REVIEW.md - UI Layer](./docs/ARCHITECTURAL_REVIEW.md#for-ui-layer)

---

### 2. Logic in Command Layer
**Violates**: Single Responsibility, Dependency Inversion

✅ **Solution**: Commands orchestrate services, each service call is one line

**Red Flags**:
- Loops (`for`, `forEach`, `map`)
- Calculations (`Math.*`, arithmetic)
- Conditional logic beyond simple routing
- Array/object manipulation

**Details**: [ARCHITECTURAL_REVIEW.md - Commands](./docs/ARCHITECTURAL_REVIEW.md#for-commands)

---

### 3. Non-Deterministic Tests
**Violates**: Dependency Inversion (using concrete `Math.random()`)

✅ **Solution**: Inject `IRandomService`, use `MockRandom` with predetermined values

**Details**: [Architecture - Testing Best Practices](./docs/architecture.md#testing-best-practices)

---

### 4. State Mutation
**Violates**: Immutability Principle

✅ **Solution**: Return new objects with spread operator

**Pattern**: Always use spread operator
```typescript
newObject = { ...oldObject, field: newValue }
newArray = [...oldArray, newItem]
```

**Details**: [Architecture - Immutability](./docs/architecture.md#testing-best-practices)

---

### 5. Non-Deterministic Replay
**Violates**: Dependency Inversion (using `Math.random()` or timing)

✅ **Solution**:
- Always use `IRandomService` (never `Math.random()`)
- Capture RNG state **before** command execution
- No `Date.now()` in game logic (use turn counter instead)
- No browser API randomness

**Red Flags**:
- `Math.random()` anywhere in game logic
- `Date.now()` for gameplay decisions
- `crypto.getRandomValues()` for game randomness
- Uncontrolled iteration order (Set/Map)

**Pattern**: Inject RandomService
```typescript
// ✅ Good - Deterministic
constructor(private randomService: IRandomService) {}
const damage = this.randomService.nextInt(1, 10)

// ❌ Bad - Non-deterministic
const damage = Math.floor(Math.random() * 10)
```

**Details**: [Replay System - Determinism Requirements](./docs/replay-system.md#determinism-requirements)

---

### How to Detect Logic in Commands

**🚨 Red Flags**:

| Pattern | Example | Why It's Bad | Fix |
|---------|---------|--------------|-----|
| Loops | `forEach`, `for`, `while`, `map` | Business logic iteration | Extract to service method |
| Array manipulation | `push`, `splice`, `[index]` | Data structure logic | Extract to service method |
| Calculations | `Math.floor`, `+`, `-`, `*`, `/` | Business rule calculations | Extract to service method |
| String manipulation | `split`, `join`, `replace` | Data transformation logic | Extract to service method |
| Complex conditionals | Nested `if/else`, `switch` | Business rule decisions | Extract to service method |

**✅ Acceptable in Commands**:

| Pattern | Example | Why It's OK |
|---------|---------|-------------|
| Simple routing | `if (monster) attack() else move()` | Routing to different services |
| Guard clauses | `if (!walkable) return state` | Early exit orchestration |
| Service calls | `this.service.method()` | Core purpose of commands |
| State spreading | `{ ...state, player: {...} }` | Immutable state updates |

**Quick Test**: "Can I explain what this command does in 3 sentences without mentioning implementation details?"
- ✅ Yes → Probably good orchestration
- ❌ No → Contains too much logic

**See**: [ARCHITECTURAL_REVIEW.md](./docs/ARCHITECTURAL_REVIEW.md) for complete checklist and refactoring examples

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

1. **Check the plan**: [plan.md](./docs/plan.md) - identify next task in current phase
2. **Read relevant specs**:
   - [Game Design](./docs/game-design/README.md) - gameplay mechanics and rules
   - [Architecture](./docs/architecture.md) - technical patterns and services
   - [Core Systems](./docs/systems-core.md) - lighting, FOV, rendering
   - [Advanced Systems](./docs/systems-advanced.md) - AI, pathfinding, generation
   - [Testing Strategy](./docs/testing-strategy.md) - test organization and conventions
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

## Rendering Modes

The game supports two rendering modes that can be toggled at runtime:

### Sprite Mode (Default)
- Modern graphical rendering using AngbandTK Gervais 32×32 tileset
- Hardware-accelerated Canvas 2D rendering
- Full color sprites with opacity-based visibility
- Target: 200-300 FPS performance

### ASCII Mode (Classic)
- Traditional text-based rendering (`<pre>` element with colored spans)
- Better accessibility for screen readers
- Lower resource usage for older devices
- Classic roguelike aesthetic

### Toggle Controls
- **`Shift+T`** - Toggle between Sprite and ASCII rendering modes
- Preference saved automatically to localStorage
- Instant switch (no page reload required)
- Visual feedback: overlay notification + game log message

**Implementation Details**: [Core Systems - Sprite Rendering](./docs/systems-core.md#sprite-rendering-system)

---

## Debug Tools

Debug mode enabled in development (press **`~`** to open debug console):

**Core Debug:**
- **`~`** - Toggle debug console
- **`g`** - God mode (invincible, infinite hunger/light)
- **`v`** - Reveal entire map
- **`a`** - Identify all items

**Monster Debug:**
- **`m`** - Spawn test monster
- **`M`** - Wake all sleeping monsters
- **`K`** - Kill all monsters

**Item Debug:**
- **`I`** - Spawn item

**Visual Debug Overlays:**
- **`f`** - Toggle FOV overlay
- **`p`** - Toggle pathfinding overlay
- **`n`** - Toggle AI overlay
- **`x`** - Toggle FOV mode (radius/realistic)

**Replay Debug:**
- **`L`** - Launch replay debugger (visual UI)
- **`C`** - Choose replay from list
- **`E`** - Export/download current replay

**Replay Debugger UI:**
- Control panel with transport controls and timeline scrubber
- State inspector panel with player/level state
- Keyboard shortcuts: Space (forward), Shift+Space (back), j (jump), Esc (exit)

See [Advanced Systems - Debug System](./docs/systems-advanced.md#debug-system)

---

## Questions?

1. Check **[Documentation Hub](./docs/README.md)** for topic index
2. Check **[Troubleshooting Guide](./docs/troubleshooting.md)** for common issues
3. Review **[Getting Started](./docs/getting-started.md)** for onboarding
4. Check **[Contributing Guide](./docs/contributing.md)** for workflow
5. Look at existing similar service for patterns
6. Update this file if you discover important patterns

---

**Last Updated**: 2025-10-19 (Unified save/replay storage architecture)
**Developer**: Dirk Kok
**Repository**: https://github.com/dirkkok101/roguelike

**Note**: Game supports dual rendering modes (Sprite + ASCII). Toggle with `Shift+T` key during gameplay. Preference persists to localStorage.

**Recent Major Updates**:
- **2025-10-19**: Unified save/replay storage - replay data now embedded in save files (SAVE_VERSION 6, DB_VERSION 2)
- **2025-10-11**: Extended dungeon from 10 to 26 levels with authentic 1980 Rogue vorpal spawning system, Amulet of Yendor quest, and return journey with monster respawning
