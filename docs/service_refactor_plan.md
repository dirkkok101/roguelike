# Service Refactoring Plan

**Status**: 📋 Planning Complete - Ready for Implementation
**Last Updated**: 2025-10-05
**Estimated Duration**: 3-4 weeks

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
3. [Current State Analysis](#current-state-analysis)
4. [Refactoring Phases](#refactoring-phases)
5. [Implementation Guidelines](#implementation-guidelines)
6. [Success Metrics](#success-metrics)
7. [Reference Examples](#reference-examples)

---

## Executive Summary

### Goals
Transform our service architecture to be more **composable**, **maintainable**, and **testable** by:
1. Improving service return types to encapsulate complete results
2. Splitting large multi-domain services into focused domain services
3. Cleaning up command orchestration logic
4. Removing architectural violations and code smells

### Current State (Lines of Code)
```
Commands Total:        1,850 LOC (23 commands)
Services Total:        5,800 LOC (24 services)

Largest Command:       MoveCommand (292 lines) ⚠️
Largest Service:       DungeonService (1,076 lines)
Problem Service:       ItemEffectService (402 lines) ❌ Mixed domains
```

### Target State
```
Commands Average:      ~50-80 lines per command
Services Average:      ~100-200 lines per service
Service Cohesion:      One domain per service ✅
Optional Dependencies: 0 (all required and explicit)
```

### Philosophy
- **YAGNI**: No interfaces unless we need polymorphism (currently: 2 interfaces only)
- **Commands Orchestrate**: Commands compose service calls into workflows
- **Services Own Domains**: Each service owns complete domain logic
- **Complete Results**: Services return everything needed, not partial data

---

## Architectural Principles

### 1. Command Pattern (Orchestration Layer)

**Commands Should:**
✅ Route to specialized services based on game state
✅ Call multiple services to compose behavior
✅ Assemble final state from service results
✅ Handle control flow (if/else routing)
✅ Aggregate messages and effects

**Commands Should NOT:**
❌ Implement algorithms or calculations
❌ Contain loops for data processing
❌ Have methods longer than ~80 lines
❌ Duplicate logic between methods
❌ Manually track service state (old/new comparisons)

**Example - Good Orchestration:**
```typescript
execute(state: GameState): GameState {
  // 1. Route based on obstacle
  const obstacle = this.detectObstacle(position, level)
  if (obstacle.type === 'monster') {
    return new AttackCommand(...).execute(state)
  }

  // 2. Perform movement
  let player = this.movementService.movePlayer(player, position)

  // 3. Apply turn effects (each service returns complete result)
  const hungerResult = this.hungerService.tickHunger(player)
  player = hungerResult.player
  messages.push(...hungerResult.messages)
  if (hungerResult.death) {
    return this.createDeathState(state, hungerResult.death)
  }

  // 4. Assemble final state
  return { ...state, player, messages, turnCount: state.turnCount + 1 }
}
```

### 2. Service Pattern (Domain Logic Layer)

**Services Should:**
✅ Own complete domain (all potion logic in PotionService)
✅ Return complete results (player + messages + side-effects)
✅ Be immutable (return new objects, never mutate)
✅ Be focused (100-200 lines, single responsibility)
✅ Have clear, testable methods

**Services Should NOT:**
❌ Mix unrelated domains (ItemEffectService mixing potions + scrolls + wands)
❌ Force callers to make multiple calls to get complete info
❌ Return partial data requiring manual state checking
❌ Access other services' private fields (encapsulation violation)

**Example - Complete Result Pattern:**
```typescript
interface HungerTickResult {
  player: Player
  messages: string[]
  death?: { cause: string }
}

class HungerService {
  tickHunger(player: Player): HungerTickResult {
    const oldState = this.getHungerState(player.hunger)
    const updatedPlayer = { ...player, hunger: player.hunger - 1 }
    const newState = this.getHungerState(updatedPlayer.hunger)

    const messages: string[] = []
    let death = undefined

    // Auto-generate warning if state changed
    if (this.stateWorsened(oldState, newState)) {
      messages.push(this.getWarningMessage(newState))
    }

    // Apply starvation damage
    if (newState === HungerState.STARVING) {
      updatedPlayer.hp -= 1
      messages.push('You are fainting from hunger!')
      if (updatedPlayer.hp <= 0) {
        death = { cause: 'Died of starvation' }
      }
    }

    return { player: updatedPlayer, messages, death }
  }
}
```

### 3. Service Granularity Rules

**When to Split a Service:**
- Service handles multiple unrelated domains (ItemEffectService)
- Service exceeds ~300 lines and has clear sub-domains
- Service has multiple switch statements for different categories
- Service name is too generic ("ItemEffectService", "UtilityService")

**When to Keep Together:**
- Related variations of same domain (PotionService handles ALL potion types)
- Coordinator + specialists pattern (DungeonService coordinates sub-services)
- Service is large but cohesive (MonsterAIService with 7 AI behaviors is OK)

**Domain-Based Services (What We Want):**
```
✅ PotionService    - All potion logic
✅ ScrollService    - All scroll logic
✅ WandService      - All wand logic
✅ HungerService    - Hunger + food consumption
✅ DoorService      - All door operations
✅ CombatService    - Combat calculations only
```

### 4. Interfaces - Only When Needed

**DO create interfaces for:**
- Multiple implementations exist (IRandomService: SeededRandom, MockRandom)
- Strategy pattern (future: IItemEffect implementations)
- Plugin architecture
- Polymorphic behavior required

**DON'T create interfaces for:**
- Services with only one implementation
- "Just in case" abstraction
- Every service "because SOLID says so"

**Current Interfaces (Correct!):**
```typescript
✅ ICommand         - 23 implementations
✅ IRandomService   - 2 implementations (SeededRandom, MockRandom)
```

---

## Current State Analysis

### ✅ What's Working Well

**1. MoveCommand Improvements (292 lines, down from 410)**
```typescript
src/commands/MoveCommand/MoveCommand.ts:32-123

✅ Clean routing with detectObstacle()
✅ Delegates to AttackCommand for combat
✅ Uses DoorService for door operations
✅ Clear control flow (4 routes)
✅ No duplicate openDoorAndMoveThrough() method anymore
```

**2. Excellent Service Examples**
```typescript
DoorService (163 lines)        - Perfect SRP, clear methods
MovementService (86 lines)     - Focused, single domain
MessageService (91 lines)      - Clean API, batch helpers
InventoryService (195 lines)   - Well-organized equipment logic
HungerService (177 lines)      - Good domain ownership
LightingService (131 lines)    - Clean light source logic
```

**3. Architectural Patterns**
```typescript
✅ Immutability throughout (return new objects)
✅ Dependency injection (constructor injection)
✅ Command pattern (23 commands implement ICommand)
✅ Service layer separation (logic in services, not UI)
```

### ⚠️ What Needs Improvement

**1. MoveCommand.performMovement() - Still Too Long (125 lines)**
```typescript
src/commands/MoveCommand/MoveCommand.ts:166-290

Problem: Manual state checking for hunger/fuel
Current:
  const oldHungerState = this.hungerService.getHungerState(player.hunger)
  player = this.hungerService.tickHunger(player)
  const newHungerState = this.hungerService.getHungerState(player.hunger)
  const warning = this.hungerService.generateHungerWarning(oldState, newState)
  if (warning) { messages.push(warning) }
  if (newHungerState === STARVING) {
    player = this.hungerService.applyStarvationDamage(player)
    // ... 15 more lines of manual logic
  }

Solution: Service returns complete result
  const hungerResult = this.hungerService.tickHunger(player)
  player = hungerResult.player
  messages.push(...hungerResult.messages)
  if (hungerResult.death) { return createDeathState(...) }
```

**2. ItemEffectService - Mixed Domains (402 lines)**
```typescript
src/services/ItemEffectService/ItemEffectService.ts

❌ Handles 5 unrelated item types:
  - applyPotionEffect()  (~95 lines)  - 5 potion types
  - applyScrollEffect()  (~133 lines) - 3 scroll types
  - applyWandEffect()    (~30 lines)  - placeholder
  - consumeFood()        (~18 lines)  - food consumption
  - refillLantern()      (~58 lines)  - lantern refill

Solution: Split into domain services
  → PotionService
  → ScrollService
  → WandService
  → Food logic → HungerService.consumeFood()
  → Lantern refill → LightingService.refillLantern()
```

**3. DungeonService - Large But Splittable (1,076 lines)**
```typescript
src/services/DungeonService/DungeonService.ts

⚠️ Complex dungeon generation in one service
  - Room generation
  - Corridor generation (MST + loops)
  - Door placement (6 types)
  - Monster placement
  - Item placement
  - Stair placement

Solution: Coordinator + specialists
  → RoomGenerationService
  → CorridorGenerationService
  → DoorGenerationService
  → MonsterPlacementService
  → ItemPlacementService
  → StairPlacementService
  → DungeonService (coordinator only, ~150 lines)
```

**4. Optional Dependencies (Unclear Contracts)**
```typescript
src/commands/MoveCommand/MoveCommand.ts:28-29

❌ Optional services:
  private hungerService?: HungerService
  private notificationService?: NotificationService

Problem: Unclear when these are needed, defensive checks everywhere
Solution: Make dependencies explicit and required
```

**5. MonsterTurnService - Encapsulation Violation**
```typescript
src/services/MonsterTurnService/MonsterTurnService.ts:273,284

❌ Accessing private field with bracket notation:
  this.combatService['random'].nextInt(10, 50)

Solution: Inject own RandomService dependency
```

---

## Refactoring Phases

### Phase 1: Service Result Types (Week 1)
**Goal**: Services return complete results, commands stop manual state checking

#### 1.1 HungerService - Complete Result Type
**Priority**: P0 - Critical
**Estimated Time**: 2-3 hours
**Files**:
- `src/services/HungerService/HungerService.ts`
- `src/services/HungerService/hunger-tick-result.test.ts` (new)
- `src/commands/MoveCommand/MoveCommand.ts`

**Task**: ☑ Create HungerTickResult interface and update tickHunger()

**Current Implementation** (lines 27-44):
```typescript
tickHunger(player: Player): Player {
  // Just returns updated player
  const newHunger = Math.max(0, player.hunger - rate)
  return { ...player, hunger: newHunger }
}
```

**Target Implementation**:
```typescript
export interface HungerTickResult {
  player: Player
  messages: string[]
  death?: {
    cause: string
  }
}

tickHunger(player: Player): HungerTickResult {
  // 1. Calculate old/new states internally
  const oldState = this.getHungerState(player.hunger)
  const rate = this.calculateHungerRate([...])
  const newHunger = Math.max(0, player.hunger - rate)
  const updatedPlayer = { ...player, hunger: newHunger }
  const newState = this.getHungerState(newHunger)

  // 2. Build messages array
  const messages: string[] = []
  const warning = this.generateHungerWarning(oldState, newState)
  if (warning) messages.push(warning)

  // 3. Apply starvation damage
  let finalPlayer = updatedPlayer
  let death = undefined

  if (newState === HungerState.STARVING) {
    finalPlayer = this.applyStarvationDamage(finalPlayer)
    messages.push('You are fainting from hunger!')

    if (finalPlayer.hp <= 0) {
      death = { cause: 'Died of starvation' }
    }
  }

  return { player: finalPlayer, messages, death }
}
```

**Subtasks**:
- ☑ Define `HungerTickResult` interface
- ☑ Update `tickHunger()` to return complete result
- ☑ Add test: `hunger-tick-result.test.ts` (test all scenarios)
- ☑ Update `MoveCommand.performMovement()` to use new result type
- ☑ Delete old manual state checking code from MoveCommand (30 lines removed)
- ☑ Run tests: `npm test HungerService && npm test MoveCommand`

**Acceptance Criteria**:
- ✓ HungerService returns player + messages + death in one call
- ✓ Command code reduced by ~30 lines
- ✓ No manual hunger state checking in MoveCommand
- ✓ All hunger tests passing

---

#### 1.2 LightingService - Complete Result Type
**Priority**: P0 - Critical
**Estimated Time**: 2-3 hours
**Files**:
- `src/services/LightingService/LightingService.ts`
- `src/services/LightingService/fuel-tick-result.test.ts` (new)
- `src/commands/MoveCommand/MoveCommand.ts`

**Task**: ☑ Create FuelTickResult and update tickFuel()

**Current Implementation** (lines 16-29):
```typescript
tickFuel(lightSource: LightSource): LightSource {
  if (lightSource.isPermanent) return lightSource
  if (lightSource.fuel === undefined || lightSource.fuel <= 0) return lightSource
  return { ...lightSource, fuel: lightSource.fuel - 1 }
}

// Separate method command must call
generateFuelWarning(lightSource: LightSource): string | null {
  // Returns warning or null
}
```

**Target Implementation**:
```typescript
export interface FuelTickResult {
  player: Player  // With updated light source
  messages: string[]
}

tickFuel(player: Player): FuelTickResult {
  const messages: string[] = []

  // No light source equipped
  if (!player.equipment.lightSource) {
    return { player, messages }
  }

  const light = player.equipment.lightSource

  // Permanent light (artifact)
  if (light.isPermanent) {
    return { player, messages }
  }

  // Already out of fuel
  if (light.fuel === undefined || light.fuel <= 0) {
    return { player, messages }
  }

  // Tick fuel
  const tickedLight = { ...light, fuel: light.fuel - 1 }
  const updatedPlayer = {
    ...player,
    equipment: { ...player.equipment, lightSource: tickedLight }
  }

  // Generate warning if needed
  const warning = this.generateFuelWarning(tickedLight)
  if (warning) messages.push(warning)

  return { player: updatedPlayer, messages }
}
```

**Subtasks**:
- ☑ Define `FuelTickResult` interface
- ☑ Update `tickFuel(player: Player)` signature and implementation
- ☑ Add test: `fuel-tick-result.test.ts`
- ☑ Update `MoveCommand.performMovement()` to use new result
- ☑ Delete manual fuel checking code from MoveCommand (25 lines removed)
- ☑ Run tests: `npm test LightingService && npm test MoveCommand`

**Acceptance Criteria**:
- ✓ LightingService returns player + messages in one call
- ✓ Command code reduced by ~25 lines
- ✓ No manual fuel warning checking in MoveCommand
- ✓ All lighting tests passing

---

#### 1.3 FOVService - Combined FOV + Exploration Update
**Priority**: P1 - High
**Estimated Time**: 1-2 hours
**Files**:
- `src/services/FOVService/FOVService.ts`
- `src/services/FOVService/fov-exploration-combined.test.ts` (new)
- `src/commands/MoveCommand/MoveCommand.ts`

**Task**: ☐ Add updateFOVAndExploration() method

**Current Implementation** (MoveCommand lines 241-248):
```typescript
// Two separate service calls
const visibleCells = this.fovService.computeFOV(position, lightRadius, level)
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
```

**Target Implementation**:
```typescript
export interface FOVUpdateResult {
  visibleCells: Set<string>
  level: Level  // With explored tiles updated
}

class FOVService {
  updateFOVAndExploration(
    position: Position,
    lightRadius: number,
    level: Level
  ): FOVUpdateResult {
    const visibleCells = this.computeFOV(position, lightRadius, level)
    const updatedLevel = this.updateExploredTiles(level, visibleCells)
    return { visibleCells, level: updatedLevel }
  }
}
```

**Subtasks**:
- ☐ Define `FOVUpdateResult` interface
- ☐ Add `updateFOVAndExploration()` method to FOVService
- ☐ Add test: `fov-exploration-combined.test.ts`
- ☐ Update MoveCommand to use combined method (2 lines → 1 line)
- ☐ Keep `computeFOV()` and `updateExploredTiles()` public (used elsewhere)
- ☐ Run tests: `npm test FOVService && npm test MoveCommand`

**Acceptance Criteria**:
- ✓ Single method returns both FOV and updated level
- ✓ Existing methods remain available for other use cases
- ✓ MoveCommand simplified
- ✓ All FOV tests passing

---

#### 1.4 Create TurnService - Simple Turn Counter
**Priority**: P1 - High
**Estimated Time**: 1 hour
**Files**:
- `src/services/TurnService/TurnService.ts` (new)
- `src/services/TurnService/index.ts` (new)
- `src/services/TurnService/turn-service.test.ts` (new)
- All commands that increment turnCount

**Task**: ☐ Create simple TurnService.incrementTurn()

**Target Implementation**:
```typescript
// src/services/TurnService/TurnService.ts
export class TurnService {
  incrementTurn(state: GameState): GameState {
    return { ...state, turnCount: state.turnCount + 1 }
  }

  getCurrentTurn(state: GameState): number {
    return state.turnCount
  }
}
```

**Subtasks**:
- ☐ Create TurnService with `incrementTurn()` method
- ☐ Add simple tests (increment, get current turn)
- ☐ Update ALL commands to use TurnService instead of manual increment
- ☐ Search codebase: `grep -r "turnCount: state.turnCount + 1" src/commands/`
- ☐ Replace ~15 occurrences across commands
- ☐ Run full test suite: `npm test`

**Acceptance Criteria**:
- ✓ TurnService created and tested
- ✓ All commands use TurnService
- ✓ No manual `turnCount + 1` in commands
- ✓ All tests passing

---

#### 1.5 Update MoveCommand with New Result Types
**Priority**: P0 - Critical
**Estimated Time**: 2-3 hours
**Files**:
- `src/commands/MoveCommand/MoveCommand.ts`

**Task**: ☐ Refactor performMovement() to use new service result types

**Before** (lines 166-290, 125 lines):
```typescript
private performMovement(...): GameState {
  // 1. Move
  let player = this.movementService.movePlayer(state.player, position)

  // 2. Hunger (30 lines of manual logic)
  let hungerMessages: string[] = []
  if (this.hungerService) {
    const oldHungerState = this.hungerService.getHungerState(player.hunger)
    player = this.hungerService.tickHunger(player)
    const newHungerState = this.hungerService.getHungerState(player.hunger)
    const hungerWarning = this.hungerService.generateHungerWarning(old, new)
    if (hungerWarning) hungerMessages.push(hungerWarning)
    if (newHungerState === STARVING) {
      player = this.hungerService.applyStarvationDamage(player)
      hungerMessages.push('You are fainting from hunger!')
      if (player.hp <= 0) {
        // 15 lines of death handling
      }
    }
  }

  // 3. Fuel (25 lines of manual logic)
  let updatedPlayer = player
  if (player.equipment.lightSource) {
    const tickedLight = this.lightingService.tickFuel(...)
    updatedPlayer = { ...player, equipment: { ...player.equipment, lightSource: tickedLight }}
    const warning = this.lightingService.generateFuelWarning(tickedLight)
    if (warning) {
      // 10 lines of warning handling
    }
  }

  // 4. FOV (2 calls)
  const lightRadius = this.lightingService.getLightRadius(...)
  const visibleCells = this.fovService.computeFOV(...)
  const updatedLevel = this.fovService.updateExploredTiles(...)

  // 5. Notifications
  // 6. Message aggregation (forEach loops)
  // 7. Manual turn increment
}
```

**After** (~60 lines):
```typescript
private performMovement(state: GameState, position: Position, level: Level): GameState {
  let messages: string[] = []

  // 1. Move player
  let player = this.movementService.movePlayer(state.player, position)

  // 2. Tick hunger
  const hungerResult = this.hungerService.tickHunger(player)
  player = hungerResult.player
  messages.push(...hungerResult.messages)
  if (hungerResult.death) {
    return this.createDeathState(state, player, hungerResult.death.cause, messages)
  }

  // 3. Tick fuel
  const fuelResult = this.lightingService.tickFuel(player)
  player = fuelResult.player
  messages.push(...fuelResult.messages)

  // 4. Update FOV and exploration
  const lightRadius = this.lightingService.getLightRadius(player.equipment.lightSource)
  const fovResult = this.fovService.updateFOVAndExploration(position, lightRadius, level)

  // 5. Generate notifications
  const notifications = this.notificationService.generateNotifications(
    state,
    position,
    fovResult.visibleCells
  )
  messages.push(...notifications)

  // 6. Build final state
  const updatedLevels = new Map(state.levels).set(state.currentLevel, fovResult.level)
  let finalState = this.messageService.addMessages(state, messages, state.turnCount + 1)
  finalState = this.turnService.incrementTurn(finalState)

  return {
    ...finalState,
    player,
    levels: updatedLevels,
    visibleCells: fovResult.visibleCells
  }
}

private createDeathState(
  state: GameState,
  player: Player,
  cause: string,
  messages: string[]
): GameState {
  let finalState = this.messageService.addMessages(state, messages, state.turnCount + 1)
  finalState = this.turnService.incrementTurn(finalState)
  return {
    ...finalState,
    player,
    isGameOver: true,
    deathCause: cause
  }
}
```

**Subtasks**:
- ☐ Refactor `performMovement()` using new result types
- ☐ Extract `createDeathState()` helper method
- ☐ Remove all manual state checking (60+ lines removed)
- ☐ Update all MoveCommand tests
- ☐ Verify movement still works in game
- ☐ Run full command test suite

**Acceptance Criteria**:
- ✓ MoveCommand.performMovement() reduced from 125 → ~60 lines
- ✓ Clear orchestration, no manual state checking
- ✓ All MoveCommand tests passing
- ✓ Manual game testing confirms movement works

**Phase 1 Completion Checklist**:
- ☐ All 5 tasks complete
- ☐ MoveCommand reduced by ~65 lines total
- ☐ Services return complete results
- ☐ All tests passing
- ☐ Git commit: "feat: add complete result types to services (Phase 1)"

---

### Phase 2: Item Service Split (Week 2)
**Goal**: Split ItemEffectService into domain-focused services

#### 2.1 Create PotionService
**Priority**: P1 - High
**Estimated Time**: 3-4 hours
**Files**:
- `src/services/PotionService/PotionService.ts` (new)
- `src/services/PotionService/index.ts` (new)
- `src/services/PotionService/heal-potions.test.ts` (new)
- `src/services/PotionService/strength-potions.test.ts` (new)
- `src/services/PotionService/poison-potion.test.ts` (new)
- `src/commands/UseItemCommand/UseItemCommand.ts`

**Task**: ☐ Extract all potion logic from ItemEffectService

**Implementation**:
```typescript
// src/services/PotionService/PotionService.ts
export interface PotionEffectResult {
  player: Player
  message: string
  identified: boolean
  death?: boolean
}

export class PotionService {
  constructor(
    private random: IRandomService,
    private identificationService: IdentificationService
  ) {}

  /**
   * Apply potion effect and return complete result
   */
  applyPotion(player: Player, potion: Potion, state: GameState): PotionEffectResult {
    // Identify potion by use
    const identified = !this.identificationService.isIdentified(potion, state)
    const newState = this.identificationService.identifyByUse(potion, state)
    const displayName = this.identificationService.getDisplayName(potion, newState)

    // Apply effect based on type
    let updatedPlayer = player
    let message = ''
    let death = false

    switch (potion.potionType) {
      case PotionType.HEAL:
        const result = this.applyHealPotion(player, potion)
        updatedPlayer = result.player
        message = `You feel better. (+${result.healAmount} HP)`
        break

      case PotionType.EXTRA_HEAL:
        const result2 = this.applyExtraHealPotion(player, potion)
        updatedPlayer = result2.player
        message = `You feel much better! (+${result2.healAmount} HP)`
        break

      case PotionType.GAIN_STRENGTH:
        updatedPlayer = this.applyGainStrength(player)
        message = `You feel stronger! (Strength: ${updatedPlayer.strength})`
        break

      case PotionType.RESTORE_STRENGTH:
        updatedPlayer = this.applyRestoreStrength(player)
        message = `Your strength is restored. (Strength: ${updatedPlayer.strength})`
        break

      case PotionType.POISON:
        const poisonResult = this.applyPoison(player, potion)
        updatedPlayer = poisonResult.player
        message = `You feel sick! (-${poisonResult.damage} HP)`
        death = updatedPlayer.hp <= 0
        break

      default:
        message = `You quaff ${displayName}. (Effect not implemented)`
    }

    return { player: updatedPlayer, message, identified, death }
  }

  private applyHealPotion(player: Player, potion: Potion): { player: Player; healAmount: number } {
    const healAmount = this.random.roll(potion.power)
    const newHp = Math.min(player.hp + healAmount, player.maxHp)
    const actualHeal = newHp - player.hp
    return {
      player: { ...player, hp: newHp },
      healAmount: actualHeal
    }
  }

  // ... other private methods for each potion type
}
```

**Subtasks**:
- ☐ Create PotionService with all potion logic from ItemEffectService
- ☐ Extract 5 potion types: HEAL, EXTRA_HEAL, GAIN_STRENGTH, RESTORE_STRENGTH, POISON
- ☐ Write tests for each potion type (5 test files)
- ☐ Update UseItemCommand to use PotionService
- ☐ Remove potion logic from ItemEffectService (95 lines removed)
- ☐ Run tests: `npm test PotionService && npm test UseItemCommand`

**Acceptance Criteria**:
- ✓ PotionService owns all potion logic
- ✓ 100% test coverage for all potion types
- ✓ UseItemCommand routes potion items to PotionService
- ✓ All tests passing

---

#### 2.2 Create ScrollService
**Priority**: P1 - High
**Estimated Time**: 3-4 hours
**Files**:
- `src/services/ScrollService/ScrollService.ts` (new)
- `src/services/ScrollService/index.ts` (new)
- `src/services/ScrollService/identify-scroll.test.ts` (new)
- `src/services/ScrollService/enchant-scrolls.test.ts` (new)
- `src/commands/UseItemCommand/UseItemCommand.ts`

**Task**: ☐ Extract all scroll logic from ItemEffectService

**Implementation**:
```typescript
export interface ScrollEffectResult {
  player: Player
  message: string
  identified: boolean
}

export class ScrollService {
  constructor(
    private identificationService: IdentificationService,
    private inventoryService: InventoryService
  ) {}

  applyScroll(
    player: Player,
    scroll: Scroll,
    state: GameState,
    targetItemId?: string
  ): ScrollEffectResult {
    // Identify scroll by use
    const identified = !this.identificationService.isIdentified(scroll, state)
    const newState = this.identificationService.identifyByUse(scroll, state)
    const displayName = this.identificationService.getDisplayName(scroll, newState)

    let updatedPlayer = player
    let message = ''

    switch (scroll.scrollType) {
      case ScrollType.IDENTIFY:
        const result = this.applyIdentify(player, targetItemId, state)
        updatedPlayer = result.player
        message = result.message
        break

      case ScrollType.ENCHANT_WEAPON:
        const weaponResult = this.applyEnchantWeapon(player, targetItemId)
        updatedPlayer = weaponResult.player
        message = weaponResult.message
        break

      case ScrollType.ENCHANT_ARMOR:
        const armorResult = this.applyEnchantArmor(player, targetItemId)
        updatedPlayer = armorResult.player
        message = armorResult.message
        break

      default:
        message = `You read ${displayName}. (Effect not implemented)`
    }

    return { player: updatedPlayer, message, identified }
  }

  private applyIdentify(
    player: Player,
    targetItemId: string | undefined,
    state: GameState
  ): { player: Player; message: string } {
    if (!targetItemId) {
      return { player, message: 'You read the scroll, but nothing happens.' }
    }

    const targetItem = this.inventoryService.findItem(player, targetItemId)
    if (!targetItem) {
      return { player, message: 'You read the scroll, but the item is gone.' }
    }

    const newState = this.identificationService.identifyItem(targetItem, state)
    const itemName = this.identificationService.getDisplayName(targetItem, newState)

    return { player, message: `This is ${itemName}!` }
  }

  // ... other private methods for scroll types
}
```

**Subtasks**:
- ☐ Create ScrollService with all scroll logic
- ☐ Extract 3 scroll types: IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR
- ☐ Write tests for each scroll type
- ☐ Update UseItemCommand to use ScrollService
- ☐ Remove scroll logic from ItemEffectService (133 lines removed)
- ☐ Run tests: `npm test ScrollService && npm test UseItemCommand`

**Acceptance Criteria**:
- ✓ ScrollService owns all scroll logic
- ✓ Tests cover all scroll types
- ✓ UseItemCommand routes scroll items to ScrollService
- ✓ All tests passing

---

#### 2.3 Create WandService
**Priority**: P2 - Medium
**Estimated Time**: 2 hours
**Files**:
- `src/services/WandService/WandService.ts` (new)
- `src/services/WandService/index.ts` (new)
- `src/services/WandService/wand-charges.test.ts` (new)
- `src/commands/UseItemCommand/UseItemCommand.ts`

**Task**: ☐ Extract wand logic from ItemEffectService

**Implementation**:
```typescript
export interface WandEffectResult {
  player: Player
  wand: Wand  // Updated wand with decremented charges
  message: string
  identified: boolean
}

export class WandService {
  constructor(
    private identificationService: IdentificationService,
    private inventoryService: InventoryService
  ) {}

  applyWand(
    player: Player,
    wand: Wand,
    state: GameState,
    targetMonsterId?: string
  ): WandEffectResult {
    // Check charges
    if (wand.currentCharges === 0) {
      return {
        player,
        wand,
        message: 'The wand has no charges.',
        identified: false
      }
    }

    // Identify wand by use
    const identified = !this.identificationService.isIdentified(wand, state)
    const newState = this.identificationService.identifyByUse(wand, state)
    const displayName = this.identificationService.getDisplayName(wand, newState)

    // Decrement charges
    const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }

    // TODO: Implement wand effects (targeting system needed)
    const message = `You zap ${displayName}. (Effect not yet implemented)`

    return { player, wand: updatedWand, message, identified }
  }
}
```

**Subtasks**:
- ☐ Create WandService with placeholder wand logic
- ☐ Handle charge depletion
- ☐ Write tests for charge system
- ☐ Update UseItemCommand to use WandService
- ☐ Remove wand logic from ItemEffectService (30 lines removed)
- ☐ Run tests: `npm test WandService && npm test UseItemCommand`

**Acceptance Criteria**:
- ✓ WandService handles wand usage and charges
- ✓ Tests cover charge system
- ✓ UseItemCommand routes wand items to WandService
- ✓ Ready for future wand effect implementation

---

#### 2.4 Move Food Logic to HungerService
**Priority**: P1 - High
**Estimated Time**: 1-2 hours
**Files**:
- `src/services/HungerService/HungerService.ts`
- `src/services/HungerService/food-consumption.test.ts` (new)
- `src/commands/UseItemCommand/UseItemCommand.ts`
- `src/commands/EatCommand/EatCommand.ts`

**Task**: ☐ Move consumeFood() from ItemEffectService to HungerService

**Current** (ItemEffectService lines 318-338):
```typescript
consumeFood(state: GameState, food: Food): EffectResult {
  const newHunger = state.player.hunger + food.nutrition
  // ... 18 lines
}
```

**Target** (HungerService):
```typescript
interface FoodConsumptionResult {
  player: Player
  message: string
}

class HungerService {
  // Existing methods...

  consumeFood(player: Player, food: Food): FoodConsumptionResult {
    const newHunger = Math.min(2000, player.hunger + food.nutrition)
    const updatedPlayer = { ...player, hunger: newHunger }

    let message = `You eat ${food.name}. (+${food.nutrition} hunger)`
    if (newHunger === 2000) {
      message += ' You are completely full.'
    }

    return { player: updatedPlayer, message }
  }
}
```

**Subtasks**:
- ☐ Add `consumeFood()` method to HungerService
- ☐ Write tests for food consumption
- ☐ Update EatCommand to use HungerService.consumeFood()
- ☐ Update UseItemCommand (if it handles food)
- ☐ Remove consumeFood() from ItemEffectService
- ☐ Run tests: `npm test HungerService && npm test EatCommand`

**Acceptance Criteria**:
- ✓ Food consumption logic in HungerService
- ✓ EatCommand uses HungerService
- ✓ Tests confirm food restores hunger
- ✓ All tests passing

---

#### 2.5 Move Lantern Refill to LightingService
**Priority**: P1 - High
**Estimated Time**: 1-2 hours
**Files**:
- `src/services/LightingService/LightingService.ts`
- `src/services/LightingService/lantern-refill.test.ts` (exists, update)
- `src/commands/UseItemCommand/UseItemCommand.ts`

**Task**: ☐ Move refillLantern() from ItemEffectService to LightingService

**Current** (ItemEffectService lines 343-401):
```typescript
refillLantern(state: GameState, oilFlask: OilFlask): EffectResult {
  // 58 lines checking player, lantern, refilling
}
```

**Target** (LightingService already has refillLantern at line 34):
```typescript
// LightingService.ts already has this method!
refillLantern(lantern: LightSource, oilAmount: number = 500): LightSource {
  // Existing implementation
}
```

**NEW: Add higher-level method:**
```typescript
interface LanternRefillResult {
  player: Player
  message: string
  success: boolean
}

class LightingService {
  // Existing refillLantern() stays as is

  refillPlayerLantern(player: Player, oilAmount: number = 500): LanternRefillResult {
    // Check if lantern equipped
    const lantern = player.equipment.lightSource
    if (!lantern) {
      return {
        player,
        message: 'You do not have a lantern equipped.',
        success: false
      }
    }

    // Check if it's a lantern
    if (lantern.type !== 'lantern') {
      return {
        player,
        message: 'You can only refill lanterns, not other light sources.',
        success: false
      }
    }

    // Check if already full
    if (lantern.fuel !== undefined && lantern.fuel >= (lantern.maxFuel || 1000)) {
      return {
        player,
        message: 'Your lantern is already full.',
        success: false
      }
    }

    // Refill
    const refilledLantern = this.refillLantern(lantern, oilAmount)
    const fuelAdded = refilledLantern.fuel! - lantern.fuel!
    const updatedPlayer = {
      ...player,
      equipment: { ...player.equipment, lightSource: refilledLantern }
    }

    return {
      player: updatedPlayer,
      message: `You refill your lantern. (+${fuelAdded} fuel, ${refilledLantern.fuel}/${refilledLantern.maxFuel} total)`,
      success: true
    }
  }
}
```

**Subtasks**:
- ☐ Add `refillPlayerLantern()` method to LightingService
- ☐ Update UseItemCommand to use LightingService.refillPlayerLantern()
- ☐ Update existing lantern-refill tests
- ☐ Remove refillLantern() from ItemEffectService (58 lines removed)
- ☐ Run tests: `npm test LightingService && npm test UseItemCommand`

**Acceptance Criteria**:
- ✓ Lantern refill logic in LightingService
- ✓ UseItemCommand uses LightingService
- ✓ All lantern refill tests passing

---

#### 2.6 Delete ItemEffectService
**Priority**: P0 - Critical
**Estimated Time**: 1 hour
**Files**:
- `src/services/ItemEffectService/` (delete entire folder)
- `src/commands/UseItemCommand/UseItemCommand.ts`
- All files importing ItemEffectService

**Task**: ☐ Remove ItemEffectService entirely

**Before** (UseItemCommand):
```typescript
constructor(
  private itemEffectService: ItemEffectService,
  // ...
)

execute(state: GameState): GameState {
  switch (this.action) {
    case 'quaff':
      result = this.itemEffectService.applyPotionEffect(state, item)
      break
    case 'read':
      result = this.itemEffectService.applyScrollEffect(state, item, targetId)
      break
    // ...
  }
}
```

**After** (UseItemCommand):
```typescript
constructor(
  private potionService: PotionService,
  private scrollService: ScrollService,
  private wandService: WandService,
  private inventoryService: InventoryService,
  private messageService: MessageService
)

execute(state: GameState): GameState {
  const item = this.inventoryService.findItem(state.player, this.itemId)
  if (!item) {
    return this.messageService.addMessage(state, 'You do not have that item.')
  }

  let result: { player: Player; message: string; death?: boolean }

  switch (this.action) {
    case 'quaff':
      if (item.type !== ItemType.POTION) {
        return this.messageService.addMessage(state, 'You cannot drink that.')
      }
      result = this.potionService.applyPotion(state.player, item as Potion, state)
      break

    case 'read':
      if (item.type !== ItemType.SCROLL) {
        return this.messageService.addMessage(state, 'You cannot read that.')
      }
      result = this.scrollService.applyScroll(state.player, item as Scroll, state, this.targetItemId)
      break

    case 'zap':
      if (item.type !== ItemType.WAND) {
        return this.messageService.addMessage(state, 'You cannot zap that.')
      }
      const wandResult = this.wandService.applyWand(state.player, item as Wand, state, this.targetItemId)
      result = { player: wandResult.player, message: wandResult.message }
      // Update wand in inventory with new charges
      state.player = this.inventoryService.removeItem(wandResult.player, item.id)
      state.player = this.inventoryService.addItem(state.player, wandResult.wand)
      break

    case 'eat':
      // Food handled by HungerService via EatCommand
      return this.messageService.addMessage(state, 'Use the eat command.')

    case 'refill':
      // Lantern refill handled by LightingService
      const refillResult = this.lightingService.refillPlayerLantern(state.player, 500)
      result = { player: refillResult.player, message: refillResult.message }
      break
  }

  // Remove consumed item from inventory
  const updatedPlayer = this.inventoryService.removeItem(result.player, this.itemId)

  // Add message and increment turn
  let finalState = this.messageService.addMessage(state, result.message)
  finalState = this.turnService.incrementTurn(finalState)

  return {
    ...finalState,
    player: updatedPlayer,
    isGameOver: result.death || false
  }
}
```

**Subtasks**:
- ☐ Update UseItemCommand to use new services
- ☐ Search for all ItemEffectService imports: `grep -r "ItemEffectService" src/`
- ☐ Update all imports to use new services
- ☐ Delete `src/services/ItemEffectService/` folder entirely
- ☐ Run full test suite: `npm test`
- ☐ Manual testing: quaff potion, read scroll, zap wand, eat food, refill lantern

**Acceptance Criteria**:
- ✓ ItemEffectService deleted
- ✓ UseItemCommand uses domain services
- ✓ All item types still work in game
- ✓ All tests passing

**Phase 2 Completion Checklist**:
- ☐ All 6 tasks complete
- ☐ 5 new services created (Potion, Scroll, Wand, + moves to Hunger/Lighting)
- ☐ ItemEffectService deleted (402 lines removed, replaced with ~300 lines across 5 services)
- ☐ Each service focused on single domain
- ☐ All tests passing
- ☐ Git commit: "feat: split ItemEffectService into domain services (Phase 2)"

---

### Phase 3: Dungeon Generation Split (Week 3)
**Goal**: Split DungeonService into coordinator + specialist services

**Note**: DungeonService is 1,076 lines but cohesive. This phase is lower priority.

#### 3.1 Create RoomGenerationService
**Priority**: P2 - Medium
**Estimated Time**: 3-4 hours
**Files**:
- `src/services/RoomGenerationService/RoomGenerationService.ts` (new)
- `src/services/RoomGenerationService/index.ts` (new)
- `src/services/RoomGenerationService/room-generation.test.ts` (new)
- `src/services/DungeonService/DungeonService.ts`

**Task**: ☐ Extract room generation logic from DungeonService

**Target Implementation**:
```typescript
export interface Room {
  x: number
  y: number
  width: number
  height: number
}

export class RoomGenerationService {
  constructor(private random: IRandomService) {}

  /**
   * Generate random non-overlapping rooms
   */
  generateRooms(
    levelWidth: number,
    levelHeight: number,
    roomCount: number
  ): Room[] {
    const rooms: Room[] = []
    const maxAttempts = roomCount * 10
    let attempts = 0

    while (rooms.length < roomCount && attempts < maxAttempts) {
      const room = this.generateRandomRoom(levelWidth, levelHeight)

      if (!this.overlapsAnyRoom(room, rooms)) {
        rooms.push(room)
      }
      attempts++
    }

    return rooms
  }

  private generateRandomRoom(levelWidth: number, levelHeight: number): Room {
    const minRoomSize = 4
    const maxRoomSize = 10

    const width = this.random.nextInt(minRoomSize, maxRoomSize)
    const height = this.random.nextInt(minRoomSize, maxRoomSize)
    const x = this.random.nextInt(1, levelWidth - width - 1)
    const y = this.random.nextInt(1, levelHeight - height - 1)

    return { x, y, width, height }
  }

  private overlapsAnyRoom(room: Room, rooms: Room[]): boolean {
    // Check overlap logic
    return rooms.some(r => this.roomsOverlap(room, r))
  }

  private roomsOverlap(a: Room, b: Room): boolean {
    // Overlap detection (with 1-tile padding)
    return !(
      a.x + a.width + 1 < b.x ||
      b.x + b.width + 1 < a.x ||
      a.y + a.height + 1 < b.y ||
      b.y + b.height + 1 < a.y
    )
  }
}
```

**Subtasks**:
- ☐ Create RoomGenerationService
- ☐ Extract room generation logic from DungeonService
- ☐ Write comprehensive tests (overlap, bounds, count)
- ☐ Update DungeonService to use RoomGenerationService
- ☐ Run tests: `npm test RoomGenerationService && npm test DungeonService`

**Acceptance Criteria**:
- ✓ RoomGenerationService handles all room logic
- ✓ Tests cover room generation scenarios
- ✓ DungeonService uses RoomGenerationService
- ✓ Dungeon generation still works

---

#### 3.2 Create CorridorGenerationService
**Priority**: P2 - Medium
**Estimated Time**: 4-5 hours
**Files**:
- `src/services/CorridorGenerationService/CorridorGenerationService.ts` (new)
- `src/services/CorridorGenerationService/index.ts` (new)
- `src/services/CorridorGenerationService/mst-algorithm.test.ts` (new)
- `src/services/CorridorGenerationService/loop-adding.test.ts` (new)
- `src/services/DungeonService/DungeonService.ts`

**Task**: ☐ Extract corridor generation (MST + loops)

**Implementation**:
```typescript
export interface Corridor {
  from: Position
  to: Position
  waypoints: Position[]  // For L-shaped corridors
}

export class CorridorGenerationService {
  constructor(private random: IRandomService) {}

  /**
   * Connect rooms using Minimum Spanning Tree
   */
  connectRooms(rooms: Room[]): Corridor[] {
    // Kruskal's MST algorithm
    const edges = this.generateAllEdges(rooms)
    const sortedEdges = edges.sort((a, b) => a.weight - b.weight)
    const corridors: Corridor[] = []
    const unionFind = new UnionFind(rooms.length)

    for (const edge of sortedEdges) {
      if (unionFind.union(edge.from, edge.to)) {
        corridors.push(this.createCorridor(
          this.getRoomCenter(rooms[edge.from]),
          this.getRoomCenter(rooms[edge.to])
        ))
      }
    }

    return corridors
  }

  /**
   * Add loops for alternate paths (30% chance per room pair)
   */
  addLoops(rooms: Room[], existingCorridors: Corridor[]): Corridor[] {
    const additionalCorridors: Corridor[] = []
    const connectedPairs = new Set(
      existingCorridors.map(c => `${c.from.x},${c.from.y}-${c.to.x},${c.to.y}`)
    )

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const pairKey = `${rooms[i].x},${rooms[i].y}-${rooms[j].x},${rooms[j].y}`

        if (!connectedPairs.has(pairKey) && this.random.nextInt(1, 100) <= 30) {
          additionalCorridors.push(this.createCorridor(
            this.getRoomCenter(rooms[i]),
            this.getRoomCenter(rooms[j])
          ))
        }
      }
    }

    return [...existingCorridors, ...additionalCorridors]
  }

  private createCorridor(from: Position, to: Position): Corridor {
    // L-shaped corridor with waypoint
    const waypoint = this.random.nextInt(0, 1) === 0
      ? { x: from.x, y: to.y }
      : { x: to.x, y: from.y }

    return { from, to, waypoints: [waypoint] }
  }

  private getRoomCenter(room: Room): Position {
    return {
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2)
    }
  }
}
```

**Subtasks**:
- ☐ Create CorridorGenerationService
- ☐ Implement MST algorithm (Kruskal's)
- ☐ Implement loop adding (30% chance)
- ☐ Write tests for MST and loops
- ☐ Update DungeonService to use CorridorGenerationService
- ☐ Run tests

**Acceptance Criteria**:
- ✓ Corridors connect all rooms (MST)
- ✓ Loops added for alternate paths
- ✓ Tests verify connectivity
- ✓ Dungeon generation works

---

#### 3.3-3.6 Additional Dungeon Services (Optional)

**These can be deferred to later phases if needed:**

- ☐ **DoorGenerationService** - Door placement logic (6 door types)
- ☐ **MonsterPlacementService** - Monster spawning by depth
- ☐ **ItemPlacementService** - Item spawning by depth
- ☐ **StairPlacementService** - Stair placement logic

**Rationale for deferral**: DungeonService is large but cohesive. Splitting rooms/corridors (3.1, 3.2) provides the most value. The remaining splits can wait until there's a clear need (e.g., special level types, vault generation).

**Phase 3 Completion Checklist**:
- ☐ Tasks 3.1 and 3.2 complete (minimum)
- ☐ DungeonService reduced by ~300 lines
- ☐ Room and corridor generation extracted
- ☐ All dungeon generation tests passing
- ☐ Git commit: "feat: extract room and corridor generation services (Phase 3)"

---

### Phase 4: Cleanup & Polish (Week 3-4)
**Goal**: Remove architectural violations and optional dependencies

#### 4.1 Remove Optional Dependencies from MoveCommand
**Priority**: P1 - High
**Estimated Time**: 1-2 hours
**Files**:
- `src/commands/MoveCommand/MoveCommand.ts`
- Main game initialization (wherever MoveCommand is created)

**Task**: ☐ Make all MoveCommand dependencies required

**Current** (lines 28-29):
```typescript
constructor(
  private direction: 'up' | 'down' | 'left' | 'right',
  private movementService: MovementService,
  private lightingService: LightingService,
  private fovService: FOVService,
  private messageService: MessageService,
  private combatService: CombatService,
  private levelingService: LevelingService,
  private doorService: DoorService,
  private hungerService?: HungerService,           // ❌ Optional
  private notificationService?: NotificationService // ❌ Optional
) {}
```

**Target**:
```typescript
constructor(
  private direction: 'up' | 'down' | 'left' | 'right',
  private movementService: MovementService,
  private lightingService: LightingService,
  private fovService: FOVService,
  private messageService: MessageService,
  private combatService: CombatService,
  private levelingService: LevelingService,
  private doorService: DoorService,
  private hungerService: HungerService,             // ✅ Required
  private notificationService: NotificationService, // ✅ Required
  private turnService: TurnService                  // ✅ New dependency
) {}
```

**Subtasks**:
- ☐ Remove `?` from hungerService and notificationService
- ☐ Remove defensive `if (this.hungerService)` checks (Phase 1 should have removed most)
- ☐ Add turnService dependency
- ☐ Update all places where MoveCommand is instantiated
- ☐ Run tests: `npm test MoveCommand`

**Acceptance Criteria**:
- ✓ No optional dependencies in MoveCommand
- ✓ All services explicitly required
- ✓ No null checks for required services
- ✓ All tests passing

---

#### 4.2 Fix MonsterTurnService Encapsulation Violation
**Priority**: P1 - High
**Estimated Time**: 1 hour
**Files**:
- `src/services/MonsterTurnService/MonsterTurnService.ts`

**Task**: ☐ Inject RandomService instead of accessing CombatService private field

**Current** (lines 273, 284):
```typescript
// ❌ Accessing private field with bracket notation
const stolenGold = Math.min(
  player.gold,
  this.combatService['random'].nextInt(10, 50)
)
```

**Target**:
```typescript
class MonsterTurnService {
  constructor(
    private random: IRandomService,  // ✅ Own dependency
    private aiService: MonsterAIService,
    private combatService: CombatService,
    private abilityService: SpecialAbilityService,
    private messageService: MessageService
  ) {}

  private handleTheft(monster: Monster, state: GameState): GameState {
    // Use own random service
    const stolenGold = Math.min(
      player.gold,
      this.random.nextInt(10, 50)  // ✅ Using own dependency
    )
    // ...
  }
}
```

**Subtasks**:
- ☐ Add `random: IRandomService` to MonsterTurnService constructor
- ☐ Replace `this.combatService['random']` with `this.random`
- ☐ Search for other bracket notation violations: `grep -r "\['[a-z]" src/services/`
- ☐ Update service initialization
- ☐ Run tests: `npm test MonsterTurnService`

**Acceptance Criteria**:
- ✓ MonsterTurnService has own RandomService
- ✓ No bracket notation for private field access
- ✓ All tests passing
- ✓ No other encapsulation violations found

---

#### 4.3 Verify CombatService.executeBumpAttack Removal
**Priority**: P1 - High
**Estimated Time**: 30 minutes
**Files**:
- `src/services/CombatService/CombatService.ts`

**Task**: ☐ Confirm executeBumpAttack was removed (appears to be done)

**Checklist**:
- ☐ Search CombatService for `executeBumpAttack`
- ☐ If found, remove it (should already be gone)
- ☐ Verify AttackCommand handles all combat orchestration
- ☐ Verify MoveCommand delegates to AttackCommand (already does at line 47)
- ☐ CombatService should only have:
  - `playerAttack()` - calculation
  - `monsterAttack()` - calculation
  - `applyDamageToPlayer()` - damage application
  - `applyDamageToMonster()` - damage application
  - `calculateXP()` - XP calculation
  - Private helper methods

**Acceptance Criteria**:
- ✓ No `executeBumpAttack` method in CombatService
- ✓ CombatService contains only calculation methods
- ✓ No orchestration logic (state updates, messages) in CombatService

---

#### 4.4 Search for Other Optional Dependencies
**Priority**: P2 - Medium
**Estimated Time**: 2-3 hours
**Files**: All commands

**Task**: ☐ Find and remove all optional service dependencies

**Search Strategy**:
```bash
# Find optional dependencies
grep -r "private.*Service?" src/commands/

# Review each one - are they really optional?
# If yes: make required
# If no: remove or provide default
```

**Subtasks**:
- ☐ Search all commands for optional dependencies
- ☐ Review each case - should it be required?
- ☐ Make required or provide sensible default
- ☐ Update tests
- ☐ Run full test suite

**Acceptance Criteria**:
- ✓ Optional dependencies reduced to 0 or near-0
- ✓ All required services explicitly injected
- ✓ Clear contracts for all commands

---

#### 4.5 Add MessageService.addMessages() Helper (If Not Present)
**Priority**: P2 - Medium
**Estimated Time**: 30 minutes
**Files**:
- `src/services/MessageService/MessageService.ts`

**Task**: ☐ Verify MessageService.addMessages() exists

**Current** (MessageService.ts lines 47-59):
```typescript
✅ Already exists!
addMessages(
  messages: Message[],
  newMessages: Array<{ text: string; type: Message['type']; importance?: number }>,
  turn: number
): Message[] {
  let result = messages
  for (const msg of newMessages) {
    result = this.addMessage(result, msg.text, msg.type, turn, msg.importance)
  }
  return result
}
```

**Checklist**:
- ☐ Confirm MessageService.addMessages() exists ✅
- ☐ Update commands to use batch helper where applicable
- ☐ Search for forEach loops adding messages: `grep -r "forEach.*addMessage" src/commands/`

**Acceptance Criteria**:
- ✓ Batch message helper exists
- ✓ Commands use it where appropriate

**Phase 4 Completion Checklist**:
- ☐ All optional dependencies removed or justified
- ☐ Encapsulation violations fixed
- ☐ CombatService verified clean
- ☐ All commands have clear contracts
- ☐ All tests passing
- ☐ Git commit: "refactor: remove optional dependencies and fix violations (Phase 4)"

---

## Implementation Guidelines

### Code Style

**Service Return Types**:
```typescript
// Always use descriptive result interfaces
interface ServiceResult {
  updatedEntity: Entity  // The modified entity
  messages: string[]     // Messages to display
  sideEffects?: {        // Optional side effects
    death?: { cause: string }
    levelUp?: { newLevel: number }
  }
}
```

**Service Method Naming**:
```typescript
// Good - verb + noun
applyPotionEffect()
tickHunger()
generateRooms()
connectRooms()

// Bad - too generic
process()
handle()
doStuff()
```

**Command Orchestration**:
```typescript
// Good - clear steps
execute(state: GameState): GameState {
  // 1. Validate
  const obstacle = this.detectObstacle(position, level)

  // 2. Route
  if (obstacle.type === 'monster') {
    return new AttackCommand(...).execute(state)
  }

  // 3. Execute
  const result = this.service.doThing(state)

  // 4. Assemble
  return { ...state, ...result }
}

// Bad - implementing logic
execute(state: GameState): GameState {
  // 50 lines of calculations, loops, conditionals
}
```

### Testing Requirements

**Each service must have**:
- Unit tests for all public methods
- Edge case coverage (empty, null, boundaries)
- Integration tests where services interact
- >80% coverage (aim for 100% on services)

**Test file naming**:
```
ServiceName/
  ServiceName.ts
  scenario-name.test.ts      # Good - describes what's tested
  method-name.test.ts        # OK - describes method
  ServiceName.test.ts        # Acceptable for small services
```

**Test structure (AAA pattern)**:
```typescript
describe('HungerService - Tick with Starvation', () => {
  test('applies starvation damage when hunger is 0', () => {
    // Arrange
    const mockRandom = new MockRandom([])
    const service = new HungerService(mockRandom)
    const player: Player = { ...testPlayer, hunger: 0, hp: 10 }

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hp).toBe(9)
    expect(result.messages).toContain('You are fainting from hunger!')
    expect(result.death).toBeUndefined()
  })

  test('returns death when starvation kills player', () => {
    // Arrange
    const player: Player = { ...testPlayer, hunger: 0, hp: 1 }

    // Act
    const result = service.tickHunger(player)

    // Assert
    expect(result.player.hp).toBe(0)
    expect(result.death).toEqual({ cause: 'Died of starvation' })
  })
})
```

### Git Commit Strategy

**After each phase**:
```bash
# Run tests
npm test

# Check coverage
npm run test:coverage

# Commit with descriptive message
git add .
git commit -m "feat: add complete result types to services (Phase 1)

- HungerService returns complete result (player, messages, death)
- LightingService returns complete result (player, messages)
- FOVService combines FOV + exploration
- TurnService added for turn management
- MoveCommand reduced from 292 → 225 lines

Tests: All passing, coverage >85%"

# Update plan.md to mark phase complete
```

**Commit message format**:
```
<type>: <short description> (<phase>)

<detailed changes>
- Change 1
- Change 2
- Change 3

<metrics>
Tests: <status>
Coverage: <percentage>
Files changed: <count>
```

---

## Success Metrics

### Quantitative Metrics

| Metric | Before | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Target |
|--------|--------|---------|---------|---------|---------|--------|
| MoveCommand LOC | 292 | 225 | 225 | 225 | 225 | ~200 |
| Average Command LOC | 80 | 75 | 75 | 75 | 70 | 50-80 |
| ItemEffectService LOC | 402 | 402 | 0 | 0 | 0 | N/A |
| Service Count | 24 | 25 | 29 | 32 | 32 | ~30 |
| Optional Dependencies | 12 | 12 | 12 | 12 | 0 | 0 |
| Services >300 LOC | 4 | 4 | 3 | 2 | 2 | <3 |
| Test Coverage | 82% | 85% | 87% | 88% | 90% | >85% |

### Qualitative Metrics

**Phase 1 Success**:
- ✓ Services return complete results
- ✓ Commands have no manual state checking
- ✓ Clear orchestration in commands

**Phase 2 Success**:
- ✓ Each service owns one domain
- ✓ No mixed-domain services
- ✓ Item logic properly separated

**Phase 3 Success**:
- ✓ Dungeon generation modular
- ✓ Room/corridor logic reusable
- ✓ DungeonService is coordinator

**Phase 4 Success**:
- ✓ No optional dependencies
- ✓ No encapsulation violations
- ✓ Clean service contracts

---

## Reference Examples

### Good Command Example: OpenDoorCommand

```typescript
// src/commands/OpenDoorCommand/OpenDoorCommand.ts (60 lines)
export class OpenDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private messageService: MessageService,
    private doorService: DoorService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    // Find door
    const door = this.doorService.getDoorAt(level, targetPos)

    // Validate
    const validation = this.doorService.canOpenDoor(door)
    if (!validation.canOpen) {
      const messages = this.messageService.addMessage(
        state.messages,
        validation.reason!,
        validation.reason?.includes('locked') ? 'warning' : 'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Open door
    const updatedLevel = this.doorService.openDoor(level, door!)
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

**Why this is excellent**:
- ✅ 60 lines - perfect size
- ✅ Clear steps: find door → validate → open → assemble state
- ✅ All logic in DoorService
- ✅ Command just orchestrates
- ✅ No conditionals implementing business rules
- ✅ Easy to read and test

### Good Service Example: DoorService

```typescript
// src/services/DoorService/DoorService.ts (163 lines)
export class DoorService {
  openDoor(level: Level, door: Door): Level {
    const updatedDoor = { ...door, state: DoorState.OPEN }
    const updatedDoors = level.doors.map((d) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = "'"
    tile.walkable = true
    tile.transparent = true

    return { ...level, doors: updatedDoors, tiles: updatedTiles }
  }

  canOpenDoor(door: Door | null): { canOpen: boolean; reason?: string } {
    if (!door) {
      return { canOpen: false, reason: 'There is no door there.' }
    }

    switch (door.state) {
      case DoorState.OPEN:
      case DoorState.BROKEN:
      case DoorState.ARCHWAY:
        return { canOpen: false, reason: 'That door is already open.' }

      case DoorState.LOCKED:
        return { canOpen: false, reason: 'The door is locked. You need a key.' }

      case DoorState.SECRET:
        if (!door.discovered) {
          return { canOpen: false, reason: 'There is no door there.' }
        }
        return { canOpen: true }

      case DoorState.CLOSED:
        return { canOpen: true }

      default:
        return { canOpen: false, reason: 'Cannot open this door.' }
    }
  }

  // ... other methods: closeDoor, revealSecretDoor, getDoorAt, canCloseDoor
}
```

**Why this is excellent**:
- ✅ Complete domain ownership (all door operations)
- ✅ Immutable (returns new level)
- ✅ Clear, focused methods
- ✅ Validation separated from execution
- ✅ Well-tested (100% coverage)

---

## Tracking Progress

### Daily Checklist

At the end of each work session:
- ☐ Mark completed tasks in this document
- ☐ Run tests: `npm test`
- ☐ Check coverage: `npm run test:coverage`
- ☐ Commit if phase/task complete
- ☐ Update metrics table
- ☐ Note any blockers or questions

### Weekly Review

At the end of each week:
- ☐ Review completed phase
- ☐ Update success metrics
- ☐ Verify all tests passing
- ☐ Manual game testing
- ☐ Plan next week's tasks

### Phase Completion

When completing a phase:
- ☐ All tasks in phase checked off
- ☐ All tests passing
- ☐ Coverage target met
- ☐ Git commit with phase summary
- ☐ Update plan.md
- ☐ Manual gameplay verification

---

## Questions & Decisions Log

**Q: Should we keep HungerService.feed() or move to FoodService?**
A: Keep in HungerService. Food is just nutrition delivery. Hunger is the domain.

**Q: Should TurnService be more complex (track turn history, etc.)?**
A: No. Keep it simple. Just increment/get. YAGNI.

**Q: What if a service needs state updates across multiple entities?**
A: Return a comprehensive result object with all updates. Let command assemble final state.

**Q: Do we need interfaces for every service?**
A: No! Only when we have multiple implementations. Currently just ICommand and IRandomService.

**Q: Should we split DebugService (445 lines)?**
A: Later. It's large but cohesive. Not a priority.

---

## Final Notes

This refactoring plan represents ~3-4 weeks of focused work. The phases are ordered by:
1. **Impact** - What gives us the most value
2. **Risk** - What's safest to do first
3. **Dependencies** - What unblocks other work

**Phase 1** is critical - it unlocks cleaner commands throughout the codebase.
**Phase 2** provides clear domain separation for item logic.
**Phase 3** is optional polish for dungeon generation.
**Phase 4** cleans up remaining architectural debt.

We can adjust the plan as we go, but the general direction is solid:
- **Commands orchestrate**
- **Services own domains**
- **Complete results eliminate manual checking**
- **YAGNI - no interfaces unless needed**

---

**Document Status**: ✅ Complete and Ready for Implementation
**Next Step**: Begin Phase 1, Task 1.1 (HungerService Result Type)

---

*Last updated: 2025-10-05*
*Maintained by: Development Team*
*Related Documents: architecture.md, ARCHITECTURAL_REVIEW.md, testing-strategy.md*
