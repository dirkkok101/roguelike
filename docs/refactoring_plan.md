# Refactoring Plan: Architecture Consistency

**Version**: 1.2
**Created**: 2025-10-04
**Updated**: 2025-10-04 (Added parallel agent strategy, verified current state: 10 agents needed)
**Context**: Based on architectural review, focusing on organizational improvements while continuing Phase 5 (Inventory) development. Missing services (HungerService, LevelingService) will be implemented as part of Phase 6 per the development plan.

---

## Scope

**What's included:**
- ✅ Folder structure reorganization
- ✅ Import pattern standardization
- ✅ Code organization improvements

**What's excluded:**
- ❌ HungerService implementation (Phase 6: Hunger & Progression)
- ❌ LevelingService implementation (Phase 6: Hunger & Progression)
- ❌ New feature development

---

## Refactoring Tasks

### Task 1: Reorganize Command Files into Folders
**Priority**: HIGH
**Effort**: 2-3 hours
**Impact**: Consistency with architecture spec, enables scenario-based testing

#### Commands to reorganize (9 total):

**Already in folders (skip these):**
- ✅ MoveCommand/ - Already properly structured
- ✅ UseItemCommand/ - Recently completed (has index.ts, tests)

1. **AttackCommand**
   ```
   Before: src/commands/AttackCommand.ts + AttackCommand.test.ts
   After:  src/commands/AttackCommand/
           ├── AttackCommand.ts
           ├── AttackCommand.test.ts (or split into scenarios)
           └── index.ts
   ```

2. **CloseDoorCommand**
   ```
   src/commands/CloseDoorCommand/
   ├── CloseDoorCommand.ts
   ├── door-states.test.ts
   └── index.ts
   ```

3. **DropCommand**
   ```
   src/commands/DropCommand/
   ├── DropCommand.ts
   ├── DropCommand.test.ts
   └── index.ts
   ```

4. **EquipCommand**
   ```
   src/commands/EquipCommand/
   ├── EquipCommand.ts
   ├── EquipCommand.test.ts
   └── index.ts
   ```

5. **OpenDoorCommand**
   ```
   src/commands/OpenDoorCommand/
   ├── OpenDoorCommand.ts
   ├── OpenDoorCommand.test.ts
   └── index.ts
   ```

6. **PickUpCommand**
   ```
   src/commands/PickUpCommand/
   ├── PickUpCommand.ts
   ├── PickUpCommand.test.ts
   └── index.ts
   ```

7. **SearchCommand**
   ```
   src/commands/SearchCommand/
   ├── SearchCommand.ts
   ├── SearchCommand.test.ts
   └── index.ts
   ```

8. **MoveStairsCommand**
   ```
   src/commands/MoveStairsCommand/
   ├── MoveStairsCommand.ts
   ├── MoveStairsCommand.test.ts
   └── index.ts
   ```

9. **UnequipCommand**
   ```
   src/commands/UnequipCommand/
   ├── UnequipCommand.ts
   ├── UnequipCommand.test.ts
   └── index.ts
   ```

**Process for each command:**
1. Create folder: `mkdir src/commands/CommandName`
2. Move files: `mv CommandName.ts CommandName.test.ts CommandName/`
3. Create barrel export: `echo "export { CommandName } from './CommandName'" > CommandName/index.ts`
4. Update any imports in UI/main files
5. Run tests to verify: `npm test CommandName`
6. Git commit: `refactor(commands): move CommandName to folder structure`

**Benefits:**
- Consistent with MoveCommand (only command currently following pattern)
- Easier to add scenario-based tests later
- Matches architecture.md specification

---

### Task 2: Move DungeonService to Folder Structure
**Priority**: HIGH
**Effort**: 1 hour
**Impact**: Consistency, enables scenario-based test splitting

#### Current state:
```
src/services/
├── DungeonService.ts (29,656 bytes - large!)
└── DungeonService.test.ts (8,083 bytes)
```

#### Target state:
```
src/services/DungeonService/
├── DungeonService.ts
├── DungeonService.test.ts (keep as-is for now)
└── index.ts
```

**Future enhancement** (optional, can defer):
Split DungeonService.test.ts into scenarios:
- `room-placement.test.ts`
- `mst-connectivity.test.ts`
- `corridor-generation.test.ts`
- `door-placement.test.ts`
- `trap-placement.test.ts`
- `monster-spawning.test.ts`
- `item-spawning.test.ts`

**Process:**
1. `mkdir src/services/DungeonService`
2. `mv src/services/DungeonService.ts src/services/DungeonService/`
3. `mv src/services/DungeonService.test.ts src/services/DungeonService/`
4. Create `index.ts`: `export { DungeonService } from './DungeonService'`
5. Update imports in files that use DungeonService
6. Run tests: `npm test DungeonService`
7. Git commit: `refactor(services): move DungeonService to folder structure`

---

### Task 3: Fix Import Patterns
**Priority**: MEDIUM
**Effort**: 2-3 hours
**Impact**: Code consistency, easier refactoring

#### Issues found:
1. **AttackCommand.ts** - Uses relative paths
2. **TrapService.ts** - Uses relative paths
3. Any other files with `../types/` or `../services/` imports

#### Standard patterns (per CLAUDE.md):
```typescript
// ✅ CORRECT - Use path aliases
import { GameState, Monster } from '@game/core/core'
import { CombatService } from '@services/CombatService'
import { MovementService } from '@services/MovementService'

// ❌ INCORRECT - Relative paths
import { GameState } from '../types/core/core'
import { CombatService } from '../services/CombatService'
```

#### Process:
1. **Find violations:**
   ```bash
   grep -r "from '\.\./types" src/commands/ src/services/
   grep -r "from '\.\./services" src/commands/
   ```

2. **Create sed script or manual replacement:**
   ```bash
   # Example replacements:
   '../types/core/core' → '@game/core/core'
   '../services/XService' → '@services/XService'
   './ICommand' → Keep as-is (same-folder imports are OK)
   ```

3. **Files to fix** (from architectural review):
   - src/commands/AttackCommand.ts
   - src/services/TrapService/TrapService.ts
   - (Any others found by grep)

4. **Verify:**
   ```bash
   npm run type-check
   npm test
   ```

5. Git commit: `refactor: standardize imports to use path aliases`

---

### Task 4: Extract Exploration Logic from MoveCommand (Optional)
**Priority**: LOW
**Effort**: 1 hour
**Impact**: Minor - separates command orchestration from logic

#### Current issue:
MoveCommand.ts:184-189 contains logic for updating explored tiles:
```typescript
visibleCells.forEach((key) => {
  const pos = this.fovService.keyToPos(key)
  if (updatedLevel.explored[pos.y]) {
    updatedLevel.explored[pos.y][pos.x] = true  // ⚠️ Logic in command
  }
})
```

#### Proposed solution:
Add method to FOVService:
```typescript
// In FOVService
updateExploredTiles(level: Level, visibleCells: Set<string>): Level {
  const updatedExplored = level.explored.map(row => [...row])

  visibleCells.forEach(key => {
    const pos = this.keyToPos(key)
    if (updatedExplored[pos.y]) {
      updatedExplored[pos.y][pos.x] = true
    }
  })

  return { ...level, explored: updatedExplored }
}
```

#### MoveCommand becomes:
```typescript
// In MoveCommand
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
```

**Process:**
1. Add `updateExploredTiles()` method to FOVService
2. Write tests: `src/services/FOVService/exploration-tracking.test.ts`
3. Update MoveCommand to use new method
4. Update MoveCommand tests to verify behavior
5. Git commit: `refactor: extract exploration tracking to FOVService`

**Note**: This is LOW priority - defer if time-constrained.

---

## Parallelization Strategy: Using Agents

**Key Insight**: Tasks 1 and 2 are completely independent and can be executed in parallel using Claude Code agents for maximum efficiency.

### Agent-Based Execution Plan

#### Phase 1: Parallel Agent Execution (High Priority)

Launch **10 agents in parallel** in a single message:

1. **Agent 1**: Move `AttackCommand` to folder structure
2. **Agent 2**: Move `CloseDoorCommand` to folder structure
3. **Agent 3**: Move `DropCommand` to folder structure
4. **Agent 4**: Move `EquipCommand` to folder structure
5. **Agent 5**: Move `OpenDoorCommand` to folder structure
6. **Agent 6**: Move `PickUpCommand` to folder structure
7. **Agent 7**: Move `SearchCommand` to folder structure
8. **Agent 8**: Move `MoveStairsCommand` to folder structure
9. **Agent 9**: Move `UnequipCommand` to folder structure
10. **Agent 10**: Move `DungeonService` to folder structure

**Note**: MoveCommand and UseItemCommand are already in proper folder structure and can be skipped.

**Each agent's task:**
```markdown
Your task is to refactor [CommandName/ServiceName] into folder structure:

1. Create folder: src/commands/[CommandName]/ (or src/services/[ServiceName]/)
2. Move [CommandName].ts into the new folder
3. Move [CommandName].test.ts into the new folder
4. Create index.ts with barrel export: export { [CommandName] } from './[CommandName]'
5. Run tests to verify: npm test [CommandName]
6. Report success or any issues encountered
```

**Benefits of parallel agents:**
- ✅ **True concurrency**: All 10 refactorings happen simultaneously
- ✅ **Intelligent error handling**: Each agent can adapt to unexpected file states
- ✅ **Independent verification**: Each agent runs tests for its component
- ✅ **Clear reporting**: Get 10 separate completion reports
- ✅ **Time savings**: ~60-70% faster than sequential execution

**How to launch parallel agents:**
Simply send a single message requesting: "Please run agents in parallel for the following refactoring tasks..." followed by the 10 task descriptions. Claude Code will launch all agents simultaneously in one operation.

#### Phase 2: Sequential Import Fixes (Medium Priority)

**After all agents complete**, fix import patterns:
- **Must be sequential** because it depends on final file locations from Phase 1
- Can be done by a single agent or manually
- Uses grep to find violations, then systematically fixes them

#### Phase 3: Optional Extraction (Low Priority)

Extract exploration logic (Task 4):
- **Independent task**: Can run anytime, even in parallel with Phase 1
- Lower priority, can be deferred

### Dependencies Diagram

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: PARALLEL (10 agents simultaneously)           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AttackCmd    │  │ CloseDoorCmd │  │ DropCmd      │  │
│  │ Agent 1      │  │ Agent 2      │  │ Agent 3      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ EquipCmd     │  │ OpenDoorCmd  │  │ PickUpCmd    │  │
│  │ Agent 4      │  │ Agent 5      │  │ Agent 6      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SearchCmd    │  │ MoveStairs   │  │ UnequipCmd   │  │
│  │ Agent 7      │  │ Agent 8      │  │ Agent 9      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐                                       │
│  │ DungeonSvc   │   (MoveCmd ✅, UseItemCmd ✅ done)   │
│  │ Agent 10     │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
                            ↓
                  (Wait for all to complete)
                            ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: SEQUENTIAL (depends on Phase 1)               │
├─────────────────────────────────────────────────────────┤
│  Fix import patterns (single agent or manual)           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: OPTIONAL (independent, can run anytime)       │
├─────────────────────────────────────────────────────────┤
│  Extract exploration logic to FOVService                │
└─────────────────────────────────────────────────────────┘
```

---

## Refactoring Order

### Phase 1: Parallel Agent Execution (High Priority) - 1-1.5 hours
**Launch 10 agents in parallel:**
- 9 command folder migrations (AttackCommand, CloseDoorCommand, DropCommand, EquipCommand, OpenDoorCommand, PickUpCommand, SearchCommand, MoveStairsCommand, UnequipCommand)
- 1 service folder migration (DungeonService)

**Note**: MoveCommand and UseItemCommand are already in proper folder structure.

**How to execute:**
Create a single message requesting parallel agent execution for all 10 refactorings.

### Phase 2: Sequential Import Fixes (Medium Priority) - 2-3 hours
**After Phase 1 completes:**
- Fix all import patterns to use path aliases
- Must be sequential (depends on knowing final file locations)
- Can use single agent or manual fixes

### Phase 3: Optional Extraction (Low Priority) - 1 hour
**Can run anytime:**
- Extract exploration logic to FOVService
- Independent of other tasks
- Can defer if time-constrained

---

## Testing Strategy

After each refactoring task:
1. **Type check**: `npm run type-check`
2. **Run affected tests**: `npm test <ComponentName>`
3. **Run full test suite**: `npm test`
4. **Verify coverage unchanged**: `npm run test:coverage`

---

## Git Workflow

### Option 1: Commit After Each Phase (Recommended for Parallel Execution)

```bash
# After Phase 1 (parallel agents) completes:
git add src/commands/ src/services/DungeonService/
git commit -m "refactor: reorganize commands and DungeonService into folders

- Move 9 commands to individual folders with barrel exports
  - AttackCommand, CloseDoorCommand, DropCommand, EquipCommand
  - OpenDoorCommand, PickUpCommand, SearchCommand, MoveStairsCommand
  - UnequipCommand
- Move DungeonService to folder structure with barrel export
- Each folder includes source, tests, and index.ts
- All tests passing after reorganization
- MoveCommand and UseItemCommand already in proper structure

Executed via 10 parallel agents for efficiency."

# After Phase 2 (import fixes) completes:
git commit -m "refactor: standardize imports to use path aliases

- Replace relative imports (../types/, ../services/) with path aliases
- Use @game/core/core for type imports
- Use @services/* for service imports
- All imports now follow CLAUDE.md conventions"

# After Phase 3 (optional) if executed:
git commit -m "refactor: extract exploration tracking to FOVService

- Move explored tile updates from MoveCommand to FOVService
- Add updateExploredTiles() method to FOVService
- Improves separation of concerns (orchestration vs logic)
- All tests updated and passing"
```

### Option 2: Single Commit After All Phases

```bash
git checkout -b refactor/architecture-consistency

# ... wait for all phases to complete

git add -A
git commit -m "refactor: reorganize commands and services for consistency

Phase 1 (Parallel):
- Move 9 commands to folder structure with barrel exports
- Move DungeonService to folder structure
- Each folder includes source, tests, and index.ts
- MoveCommand and UseItemCommand already in proper structure

Phase 2 (Sequential):
- Standardize all imports to use path aliases (@game, @services)
- Eliminate all relative imports (../types/, ../services/)

Phase 3 (Optional):
- Extract exploration logic to FOVService
- Add updateExploredTiles() method

Addresses architectural review recommendations.
Executed via 10 parallel agents for maximum efficiency."
```

### Coordination Strategy

**After parallel agents complete:**
1. Review each agent's report for success/failures
2. Verify all 10 folders created correctly (9 commands + 1 service)
3. Run full test suite: `npm test`
4. Run type check: `npm run type-check`
5. If all passing, proceed to commit
6. If issues found, fix individually before committing

---

## Success Criteria

✅ **Refactoring complete when:**
- All 9 commands in individual folders with `index.ts` barrel exports
  - AttackCommand, CloseDoorCommand, DropCommand, EquipCommand, OpenDoorCommand, PickUpCommand, SearchCommand, MoveStairsCommand, UnequipCommand
  - Plus MoveCommand and UseItemCommand (already done)
- DungeonService in folder with `index.ts` barrel export
- Zero relative imports to `../types/` or `../services/`
- All path aliases using `@game/*` and `@services/*`
- All tests still passing (100% pass rate)
- Test coverage unchanged or improved
- TypeScript compilation successful with no errors

---

## Completion Tracking

### Commands (9 total needed + 2 already done)
- ✅ MoveCommand - Already in folder structure
- ✅ UseItemCommand - Already in folder structure
- [ ] AttackCommand - Needs migration
- [ ] CloseDoorCommand - Needs migration
- [ ] DropCommand - Needs migration
- [ ] EquipCommand - Needs migration
- [ ] OpenDoorCommand - Needs migration
- [ ] PickUpCommand - Needs migration
- [ ] SearchCommand - Needs migration
- ✅ **MoveStairsCommand - COMPLETED (2025-10-04)**
- [ ] UnequipCommand - Needs migration

### Services (1 total)
- [ ] DungeonService - Needs migration

### Progress
**Commands**: 3/11 complete (27%)
**Services**: 0/1 complete (0%)
**Overall**: 3/12 complete (25%)

---

## Estimated Timeline

### Sequential Execution (Original)
**Total effort**: 6-8 hours
- Commands reorganization: 2-3 hours
- DungeonService reorganization: 1 hour
- Import pattern fixes: 2-3 hours
- Testing and verification: 1 hour
- (Optional) Exploration logic: 1 hour

### Parallel Execution with Agents (Recommended)
**Total effort**: 3.5-5 hours (~40-50% time savings)

**Breakdown:**
- **Phase 1** (Parallel): 1-1.5 hours
  - Launch 10 agents simultaneously (9 commands + 1 service)
  - Each agent moves files, creates barrel exports, runs tests
  - Wait for all agents to complete
- **Phase 2** (Sequential): 2-3 hours
  - Fix import patterns (depends on Phase 1 completion)
  - Verify all tests passing
- **Phase 3** (Optional): 1 hour
  - Extract exploration logic (can run anytime)

**Suggested schedule:**
- **Day 1 Morning**: Launch Phase 1 (9 parallel agents)
- **Day 1 Afternoon**: Phase 2 (import fixes) after agents complete
- **Day 2** (Optional): Phase 3 (exploration extraction) + final verification

---

## Post-Refactoring

After refactoring is complete:

1. **Update docs/plan.md** to note refactoring completion
2. **Continue with Phase 5** (Inventory) implementation
3. **Implement missing services in Phase 6**:
   - HungerService (per plan.md:675-686)
   - LevelingService (per plan.md:721-731)

---

## Notes

- This refactoring does NOT change any game logic
- This refactoring does NOT implement new features
- All tests must continue to pass
- This prepares the codebase for cleaner Phase 5 and Phase 6 implementation
- Missing services (Hunger, Leveling) are intentionally excluded - they're part of Phase 6 work per the development plan

---

## References

- [Architecture](./architecture.md) - Technical architecture specification
- [Plan](./plan.md) - Development roadmap
- [CLAUDE.md](../CLAUDE.md) - Project coding conventions
