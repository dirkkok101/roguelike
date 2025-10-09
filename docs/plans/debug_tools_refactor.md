# Debug Tools Refactor & Enhancement Plan

**Status**: ✅ Complete
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Systems Advanced - Debug System](../systems-advanced.md#4-debug-system) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Fix incomplete god mode implementation, add user feedback to debug commands, clean up dead code, and enhance debug features to improve development workflow.

### Design Philosophy
- **Developer Experience**: Debug tools should be intuitive with clear feedback
- **Consistency**: All debug features follow same architectural patterns (service logic, command orchestration)
- **Safety**: Production builds automatically disable all debug features
- **Testability**: All debug logic fully unit tested for reliability

### Success Criteria
- [x] God mode properly prevents hunger and light fuel consumption
- [x] All debug commands provide user feedback messages
- [x] Dead code removed (`applyGodModeEffects` unused method)
- [x] Documentation matches implementation (no phantom features)
- [x] Identify All items has keybind (`a` key)
- [x] All tests pass with >80% coverage
- [x] Architecture follows CLAUDE.md principles (logic in services, orchestration in commands)

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Debug System](../systems-advanced.md#4-debug-system) - Current debug features
- [Controls](../game-design/10-controls.md) - Keybinding conventions

### Related Systems
- **DebugService**: Core debug logic (god mode, map reveal, overlays)
- **HungerService**: Must integrate god mode to prevent hunger consumption
- **LightingService**: Must integrate god mode to prevent fuel consumption
- **CombatService**: Already has god mode integration (prevents damage)
- **InputHandler**: Maps debug keybinds to commands

### Investigation Summary

**Issues Found**:

1. **Incomplete God Mode** (HIGH): Only prevents combat damage, doesn't prevent hunger/light consumption as documented
2. **Unused Code** (MEDIUM): `DebugService.applyGodModeEffects()` exists but never called
3. **No User Feedback** (MEDIUM): Overlay toggles (`f`, `p`, `n`) have no confirmation messages
4. **Documentation Mismatch** (LOW): Docs list features that don't exist (teleport, spawn item, infinite light keybinds)
5. **Missing Keybind** (LOW): Identify All method exists but no keybind assigned

**Evidence**:
- `CombatService.ts:78` - God mode check present ✅
- `HungerService` - No god mode check ❌
- `LightingService` - No god mode check ❌
- `DebugService.applyGodModeEffects()` - Defined but unused

---

## 3. Phases & Tasks

### Phase 1: Fix God Mode (Priority: HIGH)

**Objective**: Make god mode work as documented - prevent damage, hunger, and light fuel consumption

#### Task 1.1: Add God Mode to HungerService

**Context**: God mode promises "infinite hunger" but HungerService doesn't check for it, allowing players to starve in god mode

**Files to modify**:
- `src/services/HungerService/HungerService.ts`
- `src/services/HungerService/god-mode-integration.test.ts` (new)

##### Subtasks:
- [ ] Inject DebugService into HungerService constructor
- [ ] Add god mode check in `consumeHunger()` method (return early if god mode active)
- [ ] Add god mode check in `applyStarvationDamage()` method (return early if god mode active)
- [ ] Write unit tests verifying hunger doesn't decrease in god mode
- [ ] Write unit tests verifying no starvation damage in god mode
- [ ] Update `HungerService/index.ts` if needed
- [ ] Git commit: "feat: integrate god mode into HungerService to prevent hunger consumption (Phase 1.1)"

---

#### Task 1.2: Add God Mode to LightingService

**Context**: God mode promises "infinite light" but LightingService doesn't check for it, allowing torches to burn out in god mode

**Files to modify**:
- `src/services/LightingService/LightingService.ts`
- `src/services/LightingService/god-mode-integration.test.ts` (new)

##### Subtasks:
- [ ] Inject DebugService into LightingService constructor
- [ ] Add god mode check in `consumeFuel()` method (return early if god mode active)
- [ ] Add god mode check in fuel warning logic (skip warnings in god mode)
- [ ] Write unit tests verifying fuel doesn't decrease in god mode
- [ ] Write unit tests verifying no fuel warnings in god mode
- [ ] Update `LightingService/index.ts` if needed
- [ ] Git commit: "feat: integrate god mode into LightingService to prevent fuel consumption (Phase 1.2)"

---

#### Task 1.3: Update Service Initialization

**Context**: HungerService and LightingService need DebugService dependency injected

**Files to modify**:
- `src/main.ts` (service initialization)
- `src/states/PlayingState/PlayingState.ts` (service dependencies)
- Any integration tests that instantiate these services

##### Subtasks:
- [ ] Add DebugService to HungerService constructor calls in main.ts
- [ ] Add DebugService to LightingService constructor calls in main.ts
- [ ] Update integration tests to inject DebugService
- [ ] Verify all services initialize correctly
- [ ] Git commit: "refactor: inject DebugService into Hunger/LightingService (Phase 1.3)"

---

#### Task 1.4: Remove Unused Code

**Context**: `DebugService.applyGodModeEffects()` was intended for this but never integrated, now redundant

**Files to modify**:
- `src/services/DebugService/DebugService.ts`
- `src/services/DebugService/god-mode.test.ts`

##### Subtasks:
- [ ] Remove `applyGodModeEffects()` method from DebugService
- [ ] Remove tests for `applyGodModeEffects()` (keep god mode toggle tests)
- [ ] Verify no other files reference this method (grep check)
- [ ] Git commit: "refactor: remove unused applyGodModeEffects method (Phase 1.4)"

---

### Phase 2: Add User Feedback (Priority: MEDIUM)

**Objective**: Provide clear confirmation messages when toggling debug overlays

#### Task 2.1: Add Messages to Overlay Toggle Commands

**Context**: Users press `f`, `p`, `n` and don't know if it worked - no visual feedback

**Files to modify**:
- `src/services/DebugService/DebugService.ts`
- `src/commands/ToggleFOVDebugCommand/ToggleFOVDebugCommand.ts`
- `src/commands/TogglePathDebugCommand/TogglePathDebugCommand.ts`
- `src/commands/ToggleAIDebugCommand/ToggleAIDebugCommand.ts`
- Test files for each command

##### Subtasks:
- [ ] Modify `toggleFOVDebug()` to add "FOV overlay enabled/disabled" message
- [ ] Modify `togglePathDebug()` to add "Path overlay enabled/disabled" message
- [ ] Modify `toggleAIDebug()` to add "AI overlay enabled/disabled" message
- [ ] Update tests to verify messages appear
- [ ] Git commit: "feat: add confirmation messages to debug overlay toggles (Phase 2.1)"

---

### Phase 3: Add Identify All Keybind (Priority: LOW)

**Objective**: Make the existing `identifyAll()` method accessible via keybind

#### Task 3.1: Create Identify All Command

**Context**: `DebugService.identifyAll()` exists but has no command or keybind

**Files to create**:
- `src/commands/IdentifyAllItemsCommand/IdentifyAllItemsCommand.ts`
- `src/commands/IdentifyAllItemsCommand/IdentifyAllItemsCommand.test.ts`
- `src/commands/IdentifyAllItemsCommand/index.ts`
- `docs/commands/debug-identify.md`

##### Subtasks:
- [ ] Create IdentifyAllItemsCommand class (orchestrates DebugService only)
- [ ] Write unit tests for command
- [ ] Create barrel export
- [ ] Add `a` keybind in InputHandler.ts (debug mode only)
- [ ] Create command documentation
- [ ] Git commit: "feat: add identify all items debug command with 'a' keybind (Phase 3.1)"

---

### Phase 4: Documentation Updates (Priority: LOW)

**Objective**: Ensure all documentation matches actual implementation

#### Task 4.1: Update Systems Documentation

**Context**: systems-advanced.md lists phantom features (teleport, spawn item, infinite light keybinds)

**Files to modify**:
- `docs/systems-advanced.md`
- `docs/services/DebugService.md`
- `CLAUDE.md`

##### Subtasks:
- [ ] Update debug commands table in systems-advanced.md (remove `t`, `i`, `l` keybinds, add `m`, `M`, `K`, `n`, `a`)
- [ ] Update DebugService.md to match actual methods
- [ ] Update CLAUDE.md debug tools section with correct keybinds
- [ ] Add note about god mode preventing hunger/light consumption
- [ ] Git commit: "docs: update debug tools documentation to match implementation (Phase 4.1)"

---

#### Task 4.2: Create Debug Commands Index

**Context**: Debug commands (`m`, `M`, `K`) exist but aren't documented

**Files to create/modify**:
- `docs/commands/debug-spawn.md` (already exists, verify accuracy)
- `docs/commands/debug-wake.md` (already exists, verify accuracy)
- `docs/commands/debug-kill.md` (already exists, verify accuracy)
- `docs/commands/debug-ai.md` (already exists, verify accuracy)
- `docs/commands/debug-path.md` (already exists, verify accuracy)
- `docs/commands/README.md` (add debug section)

##### Subtasks:
- [ ] Verify all existing debug command docs match implementation
- [ ] Add debug commands section to commands/README.md
- [ ] Link all debug command docs
- [ ] Git commit: "docs: add debug commands to command index (Phase 4.2)"

---

## 4. Technical Design

### Data Structures

No new data structures needed. Using existing:

```typescript
interface DebugState {
  godMode: boolean              // Already exists
  mapRevealed: boolean          // Already exists
  debugConsoleVisible: boolean  // Already exists
  fovOverlay: boolean           // Already exists
  pathOverlay: boolean          // Already exists
  aiOverlay: boolean            // Already exists
}
```

### Service Architecture

**Modified Services**:
- **DebugService**: Add messages to overlay toggles, remove unused method
- **HungerService**: Add god mode check in consumeHunger() and applyStarvationDamage()
- **LightingService**: Add god mode check in consumeFuel()

**New Commands**:
- **IdentifyAllItemsCommand**: Orchestrates DebugService.identifyAll()

**Service Dependencies**:
```
HungerService
  └─ depends on → DebugService (new dependency)

LightingService
  └─ depends on → DebugService (new dependency)

DebugService
  └─ depends on → MessageService (existing)
```

### God Mode Integration Pattern

**Pattern**: Services check god mode before modifying resources

```typescript
// HungerService example
consumeHunger(player: Player, state: GameState): Player {
  // Early exit if god mode
  if (this.debugService?.isGodModeActive(state)) {
    return player
  }

  // Normal hunger consumption logic
  return {
    ...player,
    hunger: player.hunger - HUNGER_RATE
  }
}
```

**Why this pattern?**:
- Centralized god mode check (DRY principle)
- Services remain testable (inject mock DebugService)
- Optional dependency (works if debugService not provided)
- Follows existing CombatService pattern (line 78)

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- Services: >90% (including god mode branches)
- Commands: >80%
- Overall: >80%

**New Test Files**:
- `HungerService/god-mode-integration.test.ts` - Hunger doesn't consume in god mode
- `LightingService/god-mode-integration.test.ts` - Fuel doesn't consume in god mode
- `DebugService/overlay-messages.test.ts` - Overlay toggles show messages
- `IdentifyAllItemsCommand/IdentifyAllItemsCommand.test.ts` - Command orchestration

### Test Scenarios

**Scenario 1: God Mode Prevents Hunger**
- Given: Player in god mode with 500 hunger
- When: `consumeHunger()` called
- Then: Hunger remains 500 (unchanged)

**Scenario 2: God Mode Prevents Fuel Consumption**
- Given: Player in god mode with torch (fuel: 250)
- When: `consumeFuel()` called
- Then: Fuel remains 250 (unchanged)

**Scenario 3: Overlay Toggle Shows Message**
- Given: FOV overlay disabled
- When: `toggleFOVDebug()` called
- Then: Message "FOV overlay enabled" added to state

**Scenario 4: Normal Mode Hunger Consumption**
- Given: Player NOT in god mode with 500 hunger
- When: `consumeHunger()` called
- Then: Hunger decreases normally

---

## 6. Integration Points

### Commands

**New Commands**:
- **IdentifyAllItemsCommand**: Reveals all item types, triggered by `a` key in debug mode

**Modified Commands**:
- **ToggleFOVDebugCommand**: Now adds message to state
- **TogglePathDebugCommand**: Now adds message to state
- **ToggleAIDebugCommand**: Now adds message to state

### UI Changes

**Renderer Updates**:
- No changes needed (messages already render via MessageService)

**Input Handling**:
- Add `a` key mapping in InputHandler.ts (debug mode only)
- Keybind: `case 'a': if (debugService.isEnabled()) return new IdentifyAllItemsCommand(...)`

### State Updates

No GameState changes needed - using existing structures.

**Service Constructor Changes**:
```typescript
// Before
constructor(private message: MessageService) {}

// After (HungerService, LightingService)
constructor(
  private message: MessageService,
  private debugService?: DebugService  // Optional dependency
) {}
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create plan: `docs/plans/debug_tools_refactor.md` (this file)
- [ ] Update `docs/systems-advanced.md` - Fix debug commands table
- [ ] Update `docs/services/DebugService.md` - Update god mode effects
- [ ] Update `docs/services/HungerService.md` - Add god mode integration
- [ ] Update `docs/services/LightingService.md` - Add god mode integration
- [ ] Create `docs/commands/debug-identify.md` - Document identify all command
- [ ] Update `docs/commands/README.md` - Add debug commands section
- [ ] Update `CLAUDE.md` - Fix debug tools quick reference

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Circular Dependencies**
- **Problem**: DebugService depends on MessageService, services might create circular deps
- **Mitigation**: DebugService is optional dependency (works if undefined), breaks cycle

**Issue 2: Test Failures in Existing Code**
- **Problem**: Existing tests might not expect DebugService parameter
- **Mitigation**: Make DebugService optional (`?`), all existing tests still pass

**Issue 3: Performance Impact**
- **Problem**: God mode checks on every hunger/fuel tick
- **Mitigation**: Simple boolean check is negligible (~1-2ns), early exit prevents waste

### Breaking Changes

None - all changes are backwards compatible:
- Optional DebugService parameter (existing code works)
- New commands don't affect existing commands
- God mode is opt-in feature

### Performance Considerations

**God Mode Checks**: O(1) boolean lookup, negligible performance impact
**Fuel/Hunger Consumption**: Early exit in god mode actually improves performance (skips calculations)

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (all required services already exist)
- **Blocks**: None (debug features don't block game features)

### Estimated Timeline
- Phase 1: 2-3 hours (god mode integration + tests)
- Phase 2: 1 hour (add messages to overlays)
- Phase 3: 1 hour (identify all command + keybind)
- Phase 4: 1 hour (documentation updates)
- **Total**: 5-6 hours

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Manual testing:
  - [ ] God mode prevents hunger consumption (checked via debug console)
  - [ ] God mode prevents fuel consumption (torch doesn't burn out)
  - [ ] God mode prevents damage (already works, verify still works)
  - [ ] Overlay toggles show messages (`f`, `p`, `n` keys)
  - [ ] Identify all works (`a` key in debug mode)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated and accurate
- [ ] Production build has debug disabled (verify in dist bundle)

### Follow-Up Tasks
- [ ] Consider adding spawn item debug command (if needed for testing)
- [ ] Consider adding teleport debug command (if needed for level testing)
- [ ] Add debug overlay visual improvements (colors, better rendering)

---

**Last Updated**: 2025-10-09
**Status**: ✅ Complete
