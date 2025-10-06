# Targeting System Implementation Plan

**Status**: 🚧 Not Started
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Game Design](../game-design/README.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Implement a comprehensive targeting system for ranged interactions (wands, future bows/spells) that supports direction-based targeting, monster cycling, and line-of-sight validation, following classic roguelike conventions while adding modern UX improvements.

### Design Philosophy
- **Classic Roguelike Conventions**: Follow Rogue/Angband/NetHack patterns (direction keys, monster cycling)
- **Modern UX Enhancements**: Visual feedback, smart defaults, range indicators
- **Reusability**: Design for wands NOW, but architect for future bows/spells/thrown items
- **Deterministic Logic**: All targeting logic in services (UI only renders)
- **Immutability**: Return new state objects, never mutate

### Success Criteria
- [ ] Players can select targets using direction keys (vi-keys or arrows)
- [ ] Players can cycle through visible monsters with dedicated key (Tab or 'v')
- [ ] Players can auto-target nearest monster with dedicated key ('\*' or 't')
- [ ] Wand zapping requires valid target in FOV and range
- [ ] Visual feedback shows current target with highlighting
- [ ] Line-of-sight validation prevents targeting through walls
- [ ] Range checking prevents targeting beyond wand range
- [ ] System is extensible for future ranged weapons (bows, spells)
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles
- [ ] Documentation updated

---

## 2. Context & Related Documentation

### Current Implementation Analysis

**Current State** (as of 2025-10-06):
- ✅ WandService fully implements wand effects (damage, status, polymorph, etc.)
- ✅ WandService accepts `targetMonsterId?: string` parameter
- ❌ ZapWandCommand does NOT pass target monster ID (always undefined)
- ❌ No UI for target selection (InputHandler line 401 creates ZapWandCommand without target)
- ❌ No direction-based targeting
- ❌ No monster cycling
- ❌ No line-of-sight validation for targeting
- ❌ No range checking for targeting

**Code References**:
- `src/commands/ZapWandCommand/ZapWandCommand.ts:19,52` - Accepts `targetItemId` but never receives it
- `src/services/WandService/WandService.ts:49` - Accepts `targetMonsterId` parameter
- `src/ui/InputHandler.ts:401` - Creates ZapWandCommand without target

### Relevant Game Design Docs
- [WandService Documentation](../services/WandService.md) - Wand mechanics and effects
- [Core Systems - FOV](../systems-core.md#fov-system) - Field of view for visibility
- [Commands Reference](../commands/README.md) - Command architecture patterns

### Related Systems
- **FOVService**: Provides visible monster detection (already implemented)
- **WandService**: Consumes target monster ID (already implemented)
- **MovementService**: Position/direction utilities (already implemented)
- **RenderingService**: Visual feedback for targeting (needs extension)
- **InputHandler**: Keyboard input for target selection (needs new mode)
- **ModalController**: UI for target selection overlay (needs new modal)

### Research Summary - Classic Roguelikes

**Rogue (1980)**:
- Press 'z' to zap wand
- System prompts: "In which direction?"
- Player enters direction using arrow/vi keys (h, j, k, l, y, u, b, n)
- Simple directional targeting only

**Angband (1990s)**:
- Press 'a' to aim wand
- Multiple targeting modes:
  - `t` or `5` - Use current target
  - `*` - Select new target (cycle through visible monsters)
  - `'` (apostrophe) - Auto-target nearest monster
  - Direction keys - Manual direction selection
- Smart target memory (remembers last target)
- Visual highlighting of selected target

**NetHack (1987)**:
- Similar to Rogue for directional targeting
- Prompts for direction after zap command
- Some wands auto-target (e.g., striking asks "at whom?")
- Ray wands shoot in straight lines until hitting obstacle

**Modern Roguelikes** (Brogue, DCSS, ToME):
- Visual targeting cursor with keyboard navigation
- Tab or 'v' to cycle through monsters
- Enter/Space to confirm target
- ESC to cancel targeting
- Color-coded validity (red = out of range, green = valid)
- Show expected damage/effects before confirming
- Particle effects for projectiles

**Best Practices Synthesis**:
1. **Direction-based** for ray wands (fire, lightning, cold)
2. **Monster cycling** for targeted wands (striking, slow, polymorph)
3. **Visual feedback** for modern UX (cursor, range indicators)
4. **Smart defaults** (nearest monster, last target)
5. **Escape hatch** (ESC to cancel targeting)

---

## 3. Phases & Tasks

### Phase 1: Core Targeting Service (Priority: HIGH)

**Objective**: Create TargetingService with core targeting logic (monster selection, direction selection, validation)

#### Task 1.1: Create TargetingService Data Structures

**Context**: Define interfaces for targeting modes, results, and validation

**Files to create/modify**:
- `src/types/core/core.ts` - Add targeting types
- `src/services/TargetingService/TargetingService.ts` - Service skeleton
- `src/services/TargetingService/index.ts` - Barrel export

##### Subtasks:
- [ ] Define `TargetingMode` enum (DIRECTION, MONSTER, POSITION)
- [ ] Define `TargetingRequest` interface (mode, maxRange, requiresLOS, validationFn)
- [ ] Define `TargetingResult` interface (success, targetMonsterId?, direction?, position?, message?)
- [ ] Define `TargetValidation` interface (isValid, reason?)
- [ ] Create TargetingService class with constructor (FOVService, MovementService)
- [ ] Create barrel export in `index.ts`
- [ ] Update `tsconfig.json` path aliases if needed
- [ ] Git commit: "feat: add TargetingService data structures (Phase 1.1)"

---

#### Task 1.2: Implement Monster Targeting Logic

**Context**: Core logic for finding, sorting, and validating monster targets

**Files to create/modify**:
- `src/services/TargetingService/TargetingService.ts`
- `src/services/TargetingService/monster-targeting.test.ts`

##### Subtasks:
- [ ] Implement `getVisibleMonsters(player, level, fovCells): Monster[]`
  - Filter level.monsters by FOV visibility
  - Sort by distance from player (closest first)
  - Return sorted array
- [ ] Implement `getNextTarget(currentTargetId, visibleMonsters, direction): Monster | null`
  - If direction = 'next', cycle to next monster in array
  - If direction = 'prev', cycle to previous monster
  - If direction = 'nearest', return first monster (already sorted)
  - Handle wrap-around (last → first, first → last)
- [ ] Implement `isValidMonsterTarget(monster, player, level, maxRange, requiresLOS): TargetValidation`
  - Check monster is in FOV (if requiresLOS)
  - Check distance <= maxRange
  - Return { isValid: boolean, reason?: string }
- [ ] Write unit tests (>90% coverage):
  - Visible monsters filtering (monster in FOV vs out of FOV)
  - Distance sorting (closest first)
  - Cycling logic (next, prev, nearest)
  - Validation (range, LOS, edge cases)
- [ ] Git commit: "feat: implement monster targeting logic in TargetingService (Phase 1.2)"

---

#### Task 1.3: Implement Direction Targeting Logic

**Context**: Logic for directional targeting (rays, projectiles)

**Files to create/modify**:
- `src/services/TargetingService/TargetingService.ts`
- `src/services/TargetingService/direction-targeting.test.ts`

##### Subtasks:
- [ ] Implement `getDirectionVector(direction): { dx: number, dy: number } | null`
  - Map vi-keys (h, j, k, l, y, u, b, n) to direction vectors
  - Map arrow keys (ArrowUp, ArrowDown, etc.) to direction vectors
  - Return null for invalid direction
- [ ] Implement `castRay(origin, direction, maxRange, level): Position[]`
  - Use Bresenham's line algorithm
  - Stop at walls (check `level.tiles[y][x].walkable`)
  - Stop at maxRange
  - Return array of positions in ray path
- [ ] Implement `findFirstMonsterInRay(rayPath, level): Monster | null`
  - Iterate through ray positions
  - Return first monster at any position
  - Return null if no monster found
- [ ] Write unit tests (>90% coverage):
  - Direction vector mapping (all 8 directions)
  - Ray casting (straight lines, diagonals)
  - Wall blocking (ray stops at wall)
  - Monster detection in ray
  - Edge cases (range limit, empty level)
- [ ] Git commit: "feat: implement direction targeting logic in TargetingService (Phase 1.3)"

---

#### Task 1.4: Implement Main Targeting Interface

**Context**: High-level targeting methods that orchestrate monster/direction targeting

**Files to create/modify**:
- `src/services/TargetingService/TargetingService.ts`
- `src/services/TargetingService/targeting-integration.test.ts`

##### Subtasks:
- [ ] Implement `selectTarget(request: TargetingRequest, state: GameState): TargetingResult`
  - Route to monster targeting or direction targeting based on request.mode
  - Validate target using validation function
  - Return TargetingResult with success/failure
- [ ] Implement helper: `getTargetingCandidates(request, state): Monster[] | Position[]`
  - For MONSTER mode: return visible monsters
  - For DIRECTION mode: return ray positions
  - For POSITION mode: return walkable tiles in range
- [ ] Write integration tests:
  - Full monster targeting flow (select → validate → result)
  - Full direction targeting flow (direction → ray → monster → result)
  - Invalid targets (out of range, no LOS, no monsters)
  - Edge cases (empty level, player surrounded)
- [ ] Git commit: "feat: implement main targeting interface in TargetingService (Phase 1.4)"

---

### Phase 2: Targeting UI Layer (Priority: HIGH)

**Objective**: Create UI components for target selection (modal overlay, cursor rendering, keyboard handling)

#### Task 2.1: Create TargetingModal UI Component

**Context**: Modal overlay for target selection with visual cursor and instructions

**Files to create/modify**:
- `src/ui/TargetingModal.ts`
- `src/ui/TargetingModal.css`
- `src/ui/ModalController.ts` (add showTargeting method)

##### Subtasks:
- [ ] Create TargetingModal class with constructor (accepts TargetingRequest)
- [ ] Implement `show(state: GameState, onConfirm: (result) => void, onCancel: () => void)`
- [ ] Render targeting overlay:
  - Dim background (semi-transparent black)
  - Show instructions ("Tab: next, Shift+Tab: prev, *: nearest, Enter: confirm, ESC: cancel")
  - Show current target info (name, HP, distance)
  - Show range indicator (color-coded: green = in range, red = out of range)
- [ ] Implement keyboard event handling:
  - Tab - cycle to next monster
  - Shift+Tab - cycle to previous monster
  - \* - select nearest monster
  - Direction keys - move cursor (if DIRECTION mode)
  - Enter - confirm target
  - ESC - cancel targeting
- [ ] Add CSS styling (overlay, instructions, target info)
- [ ] Integrate with ModalController:
  - Add `showTargeting(request, state, onConfirm, onCancel)` method
  - Handle modal lifecycle (show → interact → confirm/cancel → hide)
- [ ] Git commit: "feat: create TargetingModal UI component (Phase 2.1)"

---

#### Task 2.2: Implement Target Cursor Rendering

**Context**: Visual feedback for current target (highlight monster, show cursor)

**Files to create/modify**:
- `src/ui/GameRenderer.ts`
- `src/types/core/core.ts` (add TargetingState to GameState?)

##### Subtasks:
- [ ] Add `targetingState?: TargetingState` to GameState interface
  - `currentTargetId?: string` - Currently selected monster
  - `mode: TargetingMode` - Current targeting mode
  - `validTargets: string[]` - List of valid target IDs
- [ ] Update GameRenderer to render targeting overlay:
  - Highlight current target monster (different color, e.g., yellow background)
  - Render cursor at target position (if DIRECTION mode)
  - Render range circle (if maxRange specified)
  - Render ray path (if DIRECTION mode, show line to target)
- [ ] Implement `renderTargetHighlight(ctx, monster, isValid)`
  - Draw rectangle around monster
  - Use color coding (green = valid, red = invalid)
- [ ] Implement `renderRayPath(ctx, rayPath)`
  - Draw line from player to target
  - Use faded color for path visualization
- [ ] Git commit: "feat: implement target cursor rendering in GameRenderer (Phase 2.2)"

---

#### Task 2.3: Integrate Targeting into InputHandler

**Context**: Add targeting mode to InputHandler, handle keyboard input during targeting

**Files to create/modify**:
- `src/ui/InputHandler.ts`
- `src/ui/InputHandler.test.ts` (if not exists, create it)

##### Subtasks:
- [ ] Add 'targeting' to `InputMode` type
- [ ] Add `currentTargetingRequest?: TargetingRequest` field to InputHandler
- [ ] Add `currentTargetIndex: number` field (for cycling)
- [ ] Modify 'z' (zap wand) key handler:
  - Show item selection modal (already exists)
  - After wand selected, create TargetingRequest
  - Set mode to 'targeting'
  - Show TargetingModal
- [ ] Implement targeting mode keyboard handling:
  - Tab → call `targetingService.getNextTarget('next')`
  - Shift+Tab → call `targetingService.getNextTarget('prev')`
  - \* → call `targetingService.getNextTarget('nearest')`
  - Enter → confirm target, create ZapWandCommand with targetMonsterId
  - ESC → cancel targeting, return to normal mode
- [ ] Update `handleKeyDown` to route to targeting handler when in targeting mode
- [ ] Git commit: "feat: integrate targeting mode into InputHandler (Phase 2.3)"

---

### Phase 3: ZapWandCommand Integration (Priority: HIGH)

**Objective**: Update ZapWandCommand to use targeting system, add validation

#### Task 3.1: Update ZapWandCommand to Accept Target

**Context**: ZapWandCommand already has `targetItemId` parameter but never receives it

**Files to create/modify**:
- `src/commands/ZapWandCommand/ZapWandCommand.ts`
- `src/commands/ZapWandCommand/targeting.test.ts` (create new test file)

##### Subtasks:
- [ ] Rename `targetItemId` to `targetMonsterId` (semantic clarity)
- [ ] Add validation before calling wandService:
  - Check targetMonsterId is provided
  - Check monster exists in current level
  - Check monster is in player's FOV
  - Return early with error message if invalid
- [ ] Update error messages:
  - "No target selected." - if targetMonsterId is undefined
  - "Target no longer visible." - if monster not in FOV
  - "Target out of range." - if distance > wand range
- [ ] Write unit tests:
  - Successful zap with valid target
  - Error: no target provided
  - Error: target not in FOV
  - Error: target out of range
  - Integration with TargetingService
- [ ] Git commit: "feat: update ZapWandCommand to validate targeting (Phase 3.1)"

---

#### Task 3.2: Add Wand Range to Wand Type Definitions

**Context**: Wands need range limits (e.g., striking = 5, fire ray = 8)

**Files to create/modify**:
- `src/types/core/core.ts` - Add `range` to Wand interface
- `src/services/DungeonService/DungeonService.ts` - Set range on wand creation
- `src/services/TargetingService/TargetingService.ts` - Use wand.range for validation

##### Subtasks:
- [ ] Add `range: number` field to `Wand` interface
- [ ] Define default ranges per WandType:
  - STRIKING, SLOW_MONSTER, HASTE_MONSTER, POLYMORPH, CANCELLATION, SLEEP: range = 5
  - MAGIC_MISSILE: range = 8 (never misses, longer range)
  - TELEPORT_AWAY: range = 6
  - FIRE, COLD, LIGHTNING: range = 8 (ray wands have longer range)
- [ ] Update DungeonService wand spawning to set range
- [ ] Update WandService to check range before applying effect
- [ ] Write unit tests:
  - Wands created with correct range
  - TargetingService respects wand range
  - Out-of-range targets rejected
- [ ] Git commit: "feat: add range property to wands (Phase 3.2)"

---

#### Task 3.3: End-to-End Targeting Flow Testing

**Context**: Integration test for full targeting flow (press 'z' → select wand → target monster → zap)

**Files to create/modify**:
- `src/__integration__/wand-targeting.test.ts` (create new integration test)

##### Subtasks:
- [ ] Create integration test setup:
  - Create player with wand
  - Create level with monster in FOV
  - Initialize all services
- [ ] Test full flow:
  1. Press 'z' key
  2. Select wand from inventory
  3. TargetingModal appears
  4. Cycle through targets with Tab
  5. Confirm target with Enter
  6. ZapWandCommand executes with targetMonsterId
  7. Monster takes damage / receives status effect
  8. Wand charges decrement
  9. Message appears
- [ ] Test error cases:
  - Cancel targeting with ESC
  - No monsters visible
  - Target out of range
  - Wand has no charges
- [ ] Git commit: "test: add end-to-end targeting integration test (Phase 3.3)"

---

### Phase 4: Documentation & Polish (Priority: MEDIUM)

**Objective**: Update documentation, add helpful error messages, polish UX

#### Task 4.1: Create TargetingService Documentation

**Context**: Document targeting service following service documentation template

**Files to create/modify**:
- `docs/services/TargetingService.md`
- `docs/services/README.md` (add TargetingService to table)

##### Subtasks:
- [ ] Create `docs/services/TargetingService.md`:
  - Purpose section
  - Public API reference (all methods)
  - Targeting modes (MONSTER, DIRECTION, POSITION)
  - Validation logic
  - Usage examples
  - Integration with commands
  - Testing section
- [ ] Update `docs/services/README.md`:
  - Add TargetingService to quick reference table
  - Add to "Core Game Logic" category
  - Update service count
- [ ] Git commit: "docs: add TargetingService documentation (Phase 4.1)"

---

#### Task 4.2: Update Command Documentation

**Context**: Update zap command docs to reflect targeting system

**Files to create/modify**:
- `docs/commands/zap.md` (create new file)
- `docs/commands/README.md` (add zap command)

##### Subtasks:
- [ ] Create `docs/commands/zap.md`:
  - Command description
  - Keyboard shortcut ('z')
  - Targeting flow (select wand → target monster → confirm)
  - Targeting keys (Tab, \*, Enter, ESC)
  - Range and LOS restrictions
  - Error messages
  - Examples
- [ ] Update `docs/commands/README.md`:
  - Add Zap to Consumables section
  - Add targeting keys to quick reference
- [ ] Git commit: "docs: add zap command documentation (Phase 4.2)"

---

#### Task 4.3: Add Helpful Error Messages and Tooltips

**Context**: Improve UX with clear error messages and targeting instructions

**Files to create/modify**:
- `src/services/TargetingService/TargetingService.ts`
- `src/ui/TargetingModal.ts`

##### Subtasks:
- [ ] Add descriptive error messages in TargetingService:
  - "No monsters in range." (instead of generic "No target")
  - "That monster is too far away. (Range: {wand.range})"
  - "You cannot see that monster." (LOS blocked)
  - "You must select a target." (no target selected)
- [ ] Add helpful instructions in TargetingModal:
  - Show wand name in header ("Targeting: Wand of Striking")
  - Show wand range ("Range: 5 tiles")
  - Show current target distance ("Kobold - 3 tiles away")
  - Color-code validity (green text = valid, red text = invalid)
- [ ] Add auto-target on open:
  - If only one monster visible, auto-select it
  - If multiple monsters, auto-select nearest
  - Player can still cycle/change if desired
- [ ] Git commit: "feat: add helpful error messages and targeting tooltips (Phase 4.3)"

---

### Phase 5: Future Extensions (Priority: LOW)

**Objective**: Design for future ranged weapons (bows, thrown items, spells)

#### Task 5.1: Extensibility Analysis

**Context**: Analyze what changes needed for bows, spells, thrown items

**Files to create/modify**:
- `docs/plans/targeting_extensions.md` (future plan)

##### Subtasks:
- [ ] Document bow targeting requirements:
  - Requires ammunition (arrows)
  - Damage based on bow + arrow + dexterity
  - Arc trajectory vs straight line?
  - Distance affects accuracy (closer = more accurate)
- [ ] Document spell targeting requirements:
  - Different targeting modes per spell (beam, cone, area, single target)
  - Mana cost vs wand charges
  - Spell level affects range/power
- [ ] Document thrown item targeting:
  - Projectile arc (parabolic trajectory)
  - Can throw any item (potions, daggers, etc.)
  - Accuracy based on dexterity
  - Items land on ground if miss
- [ ] Identify TargetingService extensions needed:
  - Area-of-effect targeting (circle, cone, line)
  - Trajectory calculation (arc vs beam)
  - Multi-target selection (fireball hits multiple monsters)
- [ ] Git commit: "docs: create targeting extensions plan for future ranged weapons (Phase 5.1)"

---

## 4. Technical Design

### Data Structures

```typescript
// ============================================================================
// TARGETING TYPES
// ============================================================================

export enum TargetingMode {
  MONSTER = 'MONSTER',       // Target specific monster (wands, spells)
  DIRECTION = 'DIRECTION',   // Target direction for ray (fire, lightning)
  POSITION = 'POSITION',     // Target ground position (teleport, area spells)
}

export interface TargetingRequest {
  mode: TargetingMode
  maxRange: number                    // Maximum targeting range (from wand/weapon)
  requiresLOS: boolean                // Must target be in line of sight?
  allowSelf?: boolean                 // Can target self? (healing potions)
  validationFn?: (target: any) => TargetValidation  // Custom validation
}

export interface TargetingResult {
  success: boolean
  targetMonsterId?: string            // For MONSTER mode
  direction?: Direction               // For DIRECTION mode
  position?: Position                 // For POSITION mode
  message?: string                    // Error message if !success
}

export interface TargetValidation {
  isValid: boolean
  reason?: string                     // Why invalid? (for error messages)
}

export interface TargetingState {
  active: boolean
  mode: TargetingMode
  currentTargetId?: string            // Currently selected monster
  currentTargetIndex: number          // Index in visibleMonsters array
  visibleMonsters: Monster[]          // All visible monsters (sorted by distance)
  validTargets: Set<string>           // Monster IDs that are valid targets
  maxRange: number
  cursorPosition?: Position           // For DIRECTION/POSITION modes
}

// Add to Wand interface
export interface Wand {
  // ... existing fields
  range: number                       // NEW: Maximum targeting range
}

// Add to GameState (optional, for rendering)
export interface GameState {
  // ... existing fields
  targeting?: TargetingState          // NEW: Active targeting state
}
```

### Service Architecture

**New Services**:
- **TargetingService**:
  - Responsibilities: Target selection, validation, monster cycling, ray casting
  - Key Methods:
    - `getVisibleMonsters(player, level, fovCells): Monster[]`
    - `getNextTarget(currentTargetId, visibleMonsters, direction): Monster | null`
    - `isValidMonsterTarget(monster, player, level, maxRange, requiresLOS): TargetValidation`
    - `castRay(origin, direction, maxRange, level): Position[]`
    - `findFirstMonsterInRay(rayPath, level): Monster | null`
    - `selectTarget(request, state): TargetingResult`

**Modified Services**:
- **WandService**: No changes needed (already accepts targetMonsterId)
- **RenderingService**: Add target highlighting, ray path rendering

**Modified Commands**:
- **ZapWandCommand**: Add target validation, pass targetMonsterId from targeting flow

**New UI Components**:
- **TargetingModal**: Modal overlay for target selection UI
- **ModalController**: Add `showTargeting()` method

**Service Dependencies**:
```
TargetingService
  ├─ depends on → FOVService (get visible monsters)
  └─ depends on → MovementService (position utilities)

ZapWandCommand
  ├─ depends on → TargetingService (validate target)
  ├─ depends on → WandService (apply wand effect)
  └─ depends on → InventoryService (update wand charges)

InputHandler
  └─ depends on → TargetingService (get targets for UI)
```

### Algorithms & Formulas

**Monster Sorting by Distance**:
```typescript
// Manhattan distance (L1 norm) - classic roguelike standard
function distance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// Sort monsters by distance from player (closest first)
visibleMonsters.sort((a, b) => {
  const distA = distance(player.position, a.position)
  const distB = distance(player.position, b.position)
  return distA - distB
})
```

**Bresenham's Line Algorithm** (Ray Casting):
```typescript
// Classic algorithm for drawing straight lines on a grid
// Used for: fire rays, lightning bolts, line-of-sight checks
function castRay(x0: number, y0: number, dx: number, dy: number, maxRange: number): Position[] {
  const path: Position[] = []
  let x = x0
  let y = y0

  // Bresenham's algorithm
  const steps = Math.max(Math.abs(dx), Math.abs(dy))
  const xStep = dx / steps
  const yStep = dy / steps

  for (let i = 0; i <= steps && i < maxRange; i++) {
    const pos = { x: Math.round(x), y: Math.round(y) }
    path.push(pos)

    // Stop at walls
    if (!level.tiles[pos.y][pos.x].walkable) break

    x += xStep
    y += yStep
  }

  return path
}
```

**Target Cycling**:
```typescript
function getNextTarget(currentIndex: number, monsters: Monster[], direction: 'next' | 'prev'): number {
  if (monsters.length === 0) return -1

  if (direction === 'next') {
    return (currentIndex + 1) % monsters.length  // Wrap around to start
  } else {
    return (currentIndex - 1 + monsters.length) % monsters.length  // Wrap around to end
  }
}
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- TargetingService: >90%
- ZapWandCommand: >85%
- Integration tests: 100% critical paths

**Test Files**:
- `monster-targeting.test.ts` - Monster filtering, sorting, cycling
- `direction-targeting.test.ts` - Ray casting, direction vectors
- `targeting-validation.test.ts` - Range checks, LOS validation
- `targeting-integration.test.ts` - Full targeting flow
- `zap-command-targeting.test.ts` - ZapWandCommand with targeting
- `wand-targeting.test.ts` - End-to-end integration test

### Test Scenarios

**Scenario 1: Target Nearest Monster**
- Given: Player with wand, 3 monsters visible at distances 5, 3, 7
- When: Player presses '\*' to auto-target nearest
- Then: Monster at distance 3 is selected

**Scenario 2: Cycle Through Targets**
- Given: Player with wand, 3 monsters visible
- When: Player presses Tab 3 times
- Then: Cycles through all 3 monsters and wraps to first

**Scenario 3: Out of Range Rejection**
- Given: Player with wand (range 5), monster at distance 8
- When: Player attempts to zap monster
- Then: Error "Target too far away. (Range: 5)"

**Scenario 4: Line of Sight Blocked**
- Given: Player with wand, monster behind wall (not in FOV)
- When: Player attempts to target monster
- Then: Monster not in targeting list (invisible)

**Scenario 5: Ray Casting Stops at Wall**
- Given: Player zaps fire wand in direction of wall
- When: Ray is cast
- Then: Ray stops at wall tile, doesn't continue through

**Scenario 6: Cancel Targeting**
- Given: Player in targeting mode
- When: Player presses ESC
- Then: Targeting cancelled, return to normal mode, no turn consumed

**Scenario 7: No Monsters Visible**
- Given: Player with wand, no monsters in FOV
- When: Player attempts to zap wand
- Then: Error "No monsters in range."

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **ZapWandCommand**:
  - Accept `targetMonsterId: string` parameter (already has it, just needs wiring)
  - Validate target before calling WandService
  - Return early with error if target invalid

**Future Commands** (not in this plan):
- **ShootBowCommand**: Will use TargetingService for arrow targeting
- **CastSpellCommand**: Will use TargetingService for spell targeting
- **ThrowItemCommand**: Will use TargetingService for thrown items

### UI Changes

**TargetingModal** (new):
- Overlay modal for target selection
- Keyboard navigation (Tab, \*, arrows, Enter, ESC)
- Visual target info (name, distance, HP)
- Instructions panel

**GameRenderer Updates**:
- Render target highlighting (yellow rectangle around selected monster)
- Render range circle (optional visual aid)
- Render ray path (for DIRECTION mode, show line from player to cursor)

**InputHandler Updates**:
- Add 'targeting' mode
- Route keyboard input to targeting handler when in targeting mode
- Create TargetingRequest and show TargetingModal after wand selection

### State Updates

**GameState Changes**:
```typescript
interface GameState {
  // ... existing fields
  targeting?: TargetingState  // Optional targeting state (active when targeting)
}
```

**Wand Changes**:
```typescript
interface Wand {
  // ... existing fields
  range: number  // NEW: Maximum targeting range
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Create `docs/services/TargetingService.md` - Full service documentation
- [ ] Update `docs/services/README.md` - Add TargetingService to table
- [ ] Create `docs/commands/zap.md` - Zap wand command documentation
- [ ] Update `docs/commands/README.md` - Add zap command to table
- [ ] Update `docs/systems-core.md` - Add Targeting System section
- [ ] Update `CLAUDE.md` - Add TargetingService to architecture overview

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: UI Complexity**
- **Problem**: Targeting modal adds UI complexity, may conflict with existing modals
- **Mitigation**:
  - Use ModalController to manage modal lifecycle
  - Ensure only one modal active at a time
  - ESC key always cancels (consistent UX)

**Issue 2: Performance (Ray Casting)**
- **Problem**: Bresenham's algorithm may be slow for large ranges
- **Mitigation**:
  - Max range is typically 8 tiles (small)
  - Algorithm is O(n) where n = range (very fast)
  - Cache ray paths if performance issue observed

**Issue 3: Direction Key Conflicts**
- **Problem**: Direction keys (arrows, vi-keys) used for movement and targeting
- **Mitigation**:
  - Use modal mode (targeting mode locks out normal movement)
  - Clear visual feedback (modal overlay, instructions)
  - ESC to exit targeting mode

**Issue 4: FOV Edge Cases**
- **Problem**: Monster visible but behind glass/water (partially blocking terrain)
- **Mitigation**:
  - Use existing FOVService logic (if FOV sees it, it's targetable)
  - Future: Add partial cover system (Phase 6+)

### Breaking Changes

**None** - This is a new feature, not a refactor:
- WandService already accepts `targetMonsterId` (no API change)
- ZapWandCommand already has `targetItemId` parameter (just rename to `targetMonsterId`)
- No existing targeting system to break

### Performance Considerations

**Targeting Performance**:
- Monster filtering: O(n) where n = monsters on level (typically <20)
- Distance sorting: O(n log n) (negligible for <20 monsters)
- Ray casting: O(r) where r = range (typically 5-8)
- Overall: Non-issue, all operations very fast

**Rendering Performance**:
- Target highlighting: 1 extra rectangle per frame (negligible)
- Ray path rendering: Max 8 line segments (negligible)

---

## 9. Timeline & Dependencies

### Dependencies

**Blocked by**: None (all dependencies already implemented)
- ✅ FOVService (for visible monster detection)
- ✅ WandService (for wand effects)
- ✅ MovementService (for position utilities)
- ✅ ModalController (for modal management)

**Blocks**:
- Future: Bow/Arrow system (will reuse TargetingService)
- Future: Spell system (will reuse TargetingService)
- Future: Thrown items (will reuse TargetingService)

### Estimated Timeline

- Phase 1 (Core Targeting Service): 6-8 hours
  - Task 1.1: 1-2 hours (data structures)
  - Task 1.2: 2-3 hours (monster targeting)
  - Task 1.3: 2-3 hours (direction targeting)
  - Task 1.4: 1 hour (main interface)
- Phase 2 (Targeting UI): 4-6 hours
  - Task 2.1: 2-3 hours (TargetingModal)
  - Task 2.2: 1-2 hours (cursor rendering)
  - Task 2.3: 1-2 hours (InputHandler integration)
- Phase 3 (ZapWandCommand Integration): 2-3 hours
  - Task 3.1: 1 hour (update ZapWandCommand)
  - Task 3.2: 1 hour (add wand ranges)
  - Task 3.3: 1-2 hours (integration tests)
- Phase 4 (Documentation): 2-3 hours
  - Task 4.1: 1 hour (service docs)
  - Task 4.2: 30 min (command docs)
  - Task 4.3: 1 hour (error messages)
- Phase 5 (Future Extensions): 1-2 hours
  - Task 5.1: 1-2 hours (analysis and planning)

**Total**: 15-22 hours

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (services, commands, systems)
- [ ] Manual testing completed:
  - [ ] Zap wand with monster targeting
  - [ ] Cycle through multiple targets
  - [ ] Cancel targeting with ESC
  - [ ] Out of range rejection
  - [ ] No monsters visible error
  - [ ] Ray wand (fire, lightning) direction targeting

### Follow-Up Tasks
- [ ] Add particle effects for projectiles (visual polish)
- [ ] Add damage preview in targeting UI ("Will deal ~15 damage")
- [ ] Add "smart targeting" (remember last target between turns)
- [ ] Implement area-of-effect targeting (for future fireball spell)
- [ ] Implement cone targeting (for future breath weapons)
- [ ] Implement trajectory visualization (for future thrown items)

---

## Appendix: Reference Implementation Examples

### Example: Full Targeting Flow (User Perspective)

1. Player presses `z` (zap wand)
2. Inventory modal appears: "Zap which wand?"
3. Player selects "Wand of Striking" (a)
4. Targeting modal appears:
   ```
   ╔════════════════════════════════════════╗
   ║ Targeting: Wand of Striking (Range: 5) ║
   ╠════════════════════════════════════════╣
   ║ Target: Kobold (3 tiles away)          ║
   ║ HP: 8/8                                ║
   ║                                        ║
   ║ Tab: Next   Shift+Tab: Prev            ║
   ║ *: Nearest  Enter: Confirm  ESC: Cancel║
   ╚════════════════════════════════════════╝
   ```
5. Player presses Tab to cycle to Goblin
6. Player presses Enter to confirm
7. Targeting modal closes
8. Wand effect applies to Goblin
9. Message: "You zap Wand of Striking. Goblin is struck! (12 damage)"

### Example: TargetingService Usage in ZapWandCommand

```typescript
// In ZapWandCommand.execute()

// 1. Create targeting request
const request: TargetingRequest = {
  mode: TargetingMode.MONSTER,
  maxRange: wand.range,
  requiresLOS: true,
}

// 2. Validate target (passed from UI)
const validation = this.targetingService.isValidMonsterTarget(
  targetMonster,
  state.player,
  currentLevel,
  wand.range,
  true  // requiresLOS
)

if (!validation.isValid) {
  return {
    ...state,
    messages: this.messageService.addMessage(
      state.messages,
      validation.reason || 'Invalid target.',
      'warning'
    )
  }
}

// 3. Apply wand effect (existing code)
const result = this.wandService.applyWand(player, wand, state, targetMonster.id)

// ... rest of command
```

### Example: Monster Cycling in TargetingModal

```typescript
// In TargetingModal keyboard handler

case 'Tab':
  event.preventDefault()
  const direction = event.shiftKey ? 'prev' : 'next'

  // Get visible monsters from TargetingService
  const visibleMonsters = this.targetingService.getVisibleMonsters(
    state.player,
    currentLevel,
    fovCells
  )

  // Get next target
  const nextMonster = this.targetingService.getNextTarget(
    this.currentTargetId,
    visibleMonsters,
    direction
  )

  if (nextMonster) {
    this.currentTargetId = nextMonster.id
    this.updateTargetDisplay(nextMonster)  // Update UI
  }
  break
```

---

**Last Updated**: 2025-10-06
**Status**: 🚧 Ready for Implementation
