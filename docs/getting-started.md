# Getting Started

**Welcome!** This guide will get you from zero to productive in **30 minutes**.

**Audience**: New developers joining the project
**Prerequisites**: TypeScript experience, basic roguelike familiarity, Git/Node.js installed
**Related Docs**: [Documentation Hub](./README.md) | [CLAUDE.md](../CLAUDE.md) | [Contributing](./contributing.md)

---

## 30-Minute Quick Start

### Step 1: Clone and Run (5 minutes)

```bash
# Clone repository
git clone https://github.com/dirkkok101/roguelike.git
cd roguelike

# Install dependencies
npm install

# Run development server
npm run dev
# → Opens http://localhost:5173

# Run tests (in another terminal)
npm test
```

**What you should see**:
- ASCII dungeon grid with player (@) at center
- Torch providing 2-tile light radius
- Monsters visible within FOV
- Message log at bottom

**Try these controls**:
- Arrow keys to move
- `i` for inventory
- `?` for help
- `~` for debug console (god mode, reveal map)

---

### Step 2: Understand Architecture (10 minutes)

**Core Principle**: Layered architecture with strict separation of concerns

```
UI Layer      → Render state + capture input (ZERO logic)
Command Layer → Orchestrate services (ZERO implementation)
Service Layer → ALL game logic (pure functions)
Data Layer    → Immutable state (no mutations)
```

**Read these sections** in [Architecture](./architecture.md):
1. **Architecture Layers** (lines 27-86) - Understanding layer responsibilities
2. **Service Layer Details** (lines 127-651) - How services work
3. **Command Layer Details** (lines 708-740) - How commands orchestrate

**Key Concepts**:
- **Immutability**: State updates return NEW objects (spread operator)
- **Dependency Injection**: Services injected via constructor (testable)
- **SOLID Principles**: Single Responsibility, DRY, etc.

**Quick validation**: Can you explain in 1 sentence what each layer does?

---

### Step 3: Read Real Example (10 minutes)

**Example: MoveCommand** (showcases orchestration pattern)

**Read**: [Command Patterns - MoveCommand](./commands/patterns.md#movecommand-example)

**What MoveCommand does** (orchestration only, no logic):
1. Calculate new position → `MovementService.applyDirection()`
2. Check obstacle → `MovementService.detectObstacle()`
3. Handle obstacle (door/monster/wall) → Delegate to other services
4. Move player → `MovementService.movePlayer()`
5. Tick hunger → `HungerService.tickHunger()`
6. Tick regeneration → `RegenerationService.tickRegeneration()`
7. Tick light fuel → `LightingService.tickFuel()`
8. Update FOV → `FOVService.computeFOV()`
9. Increment turn → `TurnService.incrementTurn()`

**Notice**:
- ✅ Command is ~30 lines (orchestration only)
- ✅ Each step is ONE service call
- ❌ NO loops, calculations, or business logic

**Example: LightingService** (showcases service implementation)

**Read**: [LightingService Documentation](./services/LightingService.md)

**What LightingService does** (all lighting logic):
- Create light sources (torches, lanterns, artifacts)
- Tick fuel consumption (1 per turn)
- Generate warnings (50/10/0 turns remaining)
- Refill lanterns (oil flasks)
- Calculate light radius (determines FOV)

**Notice**:
- ✅ Pure functions (no side effects)
- ✅ Returns new objects (immutability)
- ✅ Dependency injection (`IRandomService`)
- ✅ Comprehensive tests (>90% coverage)

**Quick validation**: Can you explain why MoveCommand doesn't implement movement logic directly?

---

### Step 4: Make First Change (5 minutes)

**Goal**: Modify torch fuel capacity (practice immutability)

**File**: `src/services/LightingService/LightingService.ts`

**Change this**:
```typescript
createTorch(): Torch {
  return {
    id: `torch-${Date.now()}`,
    name: 'Torch',
    type: ItemType.TORCH,
    identified: true,
    position: { x: 0, y: 0 },
    fuel: 500,        // ← Change to 1000
    maxFuel: 500,     // ← Change to 1000
    radius: 2,
    isPermanent: false,
  }
}
```

**Test your change**:
```bash
# Run tests (should pass)
npm test LightingService

# Start game
npm run dev

# Pick up torch, check fuel (should show 1000)
```

**What you learned**:
- ✅ Services contain all logic (not commands or UI)
- ✅ Immutability pattern (return new objects)
- ✅ Tests validate changes

**Congrats!** You've made your first change. Ready to dive deeper? Continue below.

---

## Deep Dive Learning Path

### Week 1: Core Concepts

#### Day 1: Architecture Foundation
**Goal**: Master layered architecture and SOLID principles

**Read**:
1. [Architecture - Full Document](./architecture.md) (1,224 lines)
   - Focus on: Layered Architecture, SOLID Principles, Data Structures
2. [CLAUDE.md - Common Pitfalls](../CLAUDE.md#common-pitfalls-quick-reference)
   - Understand what NOT to do (logic in UI/commands, mutations)

**Exercise**: Review [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) checklist

---

#### Day 2-3: Service Layer Deep Dive
**Goal**: Understand service implementation patterns

**Read**:
1. [Services Guide - README](./services/README.md) - All 33 services overview
2. [Service Creation Guide](./services/creation-guide.md) - Step-by-step creation
3. [Service Patterns](./services/patterns.md) - Common patterns (Result Objects, Immutability, DI)

**Study these services** (read full docs):
- [FOVService](./services/FOVService.md) - Complex algorithm (shadowcasting)
- [CombatService](./services/CombatService.md) - Randomness with MockRandom
- [TurnService](./services/TurnService.md) - Simple service (great starting point)

**Exercise**: Implement a simple service (e.g., `GreetingService.greet(name)`)

---

#### Day 4-5: Command Layer Deep Dive
**Goal**: Master orchestration pattern

**Read**:
1. [Commands Guide - README](./commands/README.md) - All 40+ commands overview
2. [Command Creation Guide](./commands/creation-guide.md) - Step-by-step creation
3. [Command Patterns](./commands/patterns.md) - Orchestration, delegation, guard clauses

**Study these commands** (read patterns doc):
- MoveCommand - Multi-route orchestration (monster/door/wall/clear)
- PickUpCommand - Simple orchestration with guard clauses
- AttackCommand - Service delegation

**Exercise**: Implement a simple command (e.g., `GreetCommand` using `GreetingService`)

---

#### Day 6-7: Testing Mastery
**Goal**: Write high-quality tests with >80% coverage

**Read**:
1. [Testing Strategy](./testing-strategy.md) - Overall approach and organization
2. [Service Testing Guide](./services/testing-guide.md) - AAA pattern, MockRandom
3. [Command Testing Guide](./commands/testing-guide.md) - Mocking services

**Study real tests**:
- `src/services/FOVService/shadowcasting.test.ts` - Algorithm testing
- `src/services/LightingService/fuel-consumption.test.ts` - Scenario-based tests
- `src/commands/MoveCommand/movement.test.ts` - Command orchestration tests

**Exercise**: Write tests for your `GreetingService` and `GreetCommand` (aim for 100% coverage)

---

### Week 2: Game Systems

#### Day 1-2: Game Design
**Goal**: Understand game mechanics and balance

**Read**:
1. [Game Design Overview](./game-design/README.md) - All mechanics
2. [Character System](./game-design/02-character.md) - Stats, leveling, regeneration
3. [Combat System](./game-design/03-combat.md) - Hit/damage formulas
4. [Monsters](./game-design/04-monsters.md) - All 26 monsters (A-Z)
5. [Items](./game-design/05-items.md) - All item types

**Exercise**: Design a new monster (stats, AI behavior, special abilities)

---

#### Day 3: Core Systems
**Goal**: Master lighting, FOV, and rendering

**Read**:
1. [Core Systems](./systems-core.md) - Lighting, FOV, visibility, rendering
   - Focus on: Lighting System, FOV Shadowcasting, Visibility States

**Study these services**:
- [LightingService](./services/LightingService.md) - Fuel tracking, warnings
- [FOVService](./services/FOVService.md) - Recursive shadowcasting (8 octants)
- [RenderingService](./services/RenderingService.md) - Visibility states, colors

**Exercise**: Modify light radius or fuel consumption rates

---

#### Day 4: Advanced Systems
**Goal**: Understand AI, pathfinding, and dungeon generation

**Read**:
1. [Advanced Systems](./systems-advanced.md) - AI, pathfinding, generation
   - Focus on: Monster AI (7 behaviors), A* Pathfinding, Dungeon Generation

**Study these services**:
- [MonsterAIService](./services/MonsterAIService.md) - AI decision-making
- [PathfindingService](./services/PathfindingService.md) - A* algorithm
- [DungeonService](./services/DungeonService.md) - Procedural generation

**Exercise**: Implement a new AI behavior (e.g., DEFENSIVE - attack then retreat)

---

#### Day 5-7: Build a Feature
**Goal**: Implement a complete feature from scratch

**Choose one**:
1. **New Item**: Ring of Invisibility (grants invisibility for N turns)
2. **New Monster**: Mimic (disguised as item, surprises player)
3. **New Command**: RestCommand (rest until HP full or interrupted)

**Follow this workflow** (see [Contributing Guide](./contributing.md)):
1. Create plan document (`feature_name_plan.md`)
2. Design feature (game design doc update)
3. Implement service (TDD, tests first)
4. Implement command (orchestration only)
5. Run architectural review checklist
6. Achieve >80% coverage
7. Create PR with plan link

---

## Common Questions (FAQ)

### Q: Where should I put game logic?
**A**: Always in **services**. Commands orchestrate, UI renders. Logic = service.

### Q: Why can't I mutate state directly?
**A**: Immutability enables time-travel debugging, undo/redo, and prevents action-at-a-distance bugs.

### Q: How do I test randomness?
**A**: Inject `IRandomService`, use `MockRandom` in tests with predetermined values.

### Q: What if my command has 10+ service calls?
**A**: Probably fine! Commands orchestrate. BUT: if you have loops/calculations, extract to service.

### Q: Where do I find examples?
**A**:
- Services: Read docs in `docs/services/` folder
- Commands: Read patterns in `docs/commands/patterns.md`
- Tests: Look in `src/services/*/` and `src/commands/*/` folders

### Q: How do I run just one test file?
**A**: `npm test ServiceName` (e.g., `npm test FOVService`)

### Q: What's the difference between service and command tests?
**A**:
- Service tests: Test logic directly (AAA pattern, pure functions)
- Command tests: Mock services, test orchestration (verify service calls)

---

## Next Steps

**Now that you're onboarded:**

1. **Read**: [Contributing Guide](./contributing.md) - Formal development workflow
2. **Review**: [Architectural Review Checklist](./ARCHITECTURAL_REVIEW.md) - Pre-commit checks
3. **Explore**: [Documentation Hub](./README.md) - All docs by category
4. **Contribute**: Pick an issue or propose a feature

**Need help?**
- Technical issues: [Troubleshooting Guide](./troubleshooting.md)
- Architecture questions: [CLAUDE.md](../CLAUDE.md)
- Game design questions: [Game Design](./game-design/README.md)

---

**Welcome to the team! Happy coding!** 🎮

---

**Version**: 1.0
**Last Updated**: 2025-10-06
**Maintainer**: Dirk Kok
