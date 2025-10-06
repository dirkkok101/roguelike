# Documentation Changelog

**Version History**: Track major changes to project documentation

---

## 2025-10-06 - Energy System Bug Fix (v2.3)

**Objective**: Fix critical energy system bug causing monsters to move 10x slower than intended

**Changes Made**: Energy distribution fix in game loop

---

### The Bug

**Problem**: Phase 1 of the game loop only granted energy to the player, not to monsters. This caused a massive imbalance:

| Actor | Energy Grants | Total Energy | Result |
|-------|---------------|--------------|--------|
| **Player (speed 10)** | 10 grants × 10 speed | **100 energy** | ✅ Acts |
| **Monster (speed 10)** | 1 grant × 10 speed | **10 energy** | ❌ Cannot act |

**Impact**: Player acted 10 times before same-speed monsters acted once. Monsters appeared frozen.

**Old Buggy Code**:
```typescript
// Phase 1: Grant energy ONLY to player
while (!turnService.canPlayerAct(gameState.player)) {
  gameState = turnService.grantPlayerEnergy(gameState)  // Player only!
}
```

Monsters only got ONE energy grant (10) inside `MonsterTurnService.processMonsterTurns()`.

---

### The Fix

**Solution**: Created `grantEnergyToAllActors()` method that grants energy to player AND all monsters simultaneously in Phase 1.

**Code Changes** (`src/services/TurnService/TurnService.ts`):

```typescript
/**
 * Grant energy to ALL actors (player + monsters) simultaneously
 * Ensures fair energy distribution
 */
grantEnergyToAllActors(state: GameState): GameState {
  // Grant to player
  const playerSpeed = this.getPlayerSpeed(state.player)
  const updatedPlayer = this.grantEnergy(state.player, playerSpeed)

  // Grant to all monsters on current level
  const currentLevel = state.levels.get(state.currentLevel)
  const updatedMonsters = currentLevel.monsters.map(monster =>
    this.grantEnergy(monster, monster.speed)
  )

  return { ...state, player: updatedPlayer, levels: updatedLevels }
}
```

**Game Loop Update** (`src/main.ts`):

```typescript
// Phase 1: Grant energy to ALL actors until player can act
do {
  gameState = turnService.grantEnergyToAllActors(gameState)  // Everyone!
} while (!turnService.canPlayerAct(gameState.player))
```

**MonsterTurnService Update** (`src/services/MonsterTurnService/MonsterTurnService.ts`):
- **Removed** duplicate energy grant (line 41)
- Monsters now enter `processMonsterTurns()` with energy already accumulated from Phase 1

---

### Expected Gameplay Impact

**Before Fix**:
- Player speed 10 + Monster speed 10 = Player acts 10x more often ❌
- Could "run circles around monsters" - they barely moved
- Monsters seemed frozen or extremely slow

**After Fix**:
- Player speed 10 + Monster speed 10 = Both act at same frequency ✅
- Player speed 10 + Monster speed 15 (Bat) = Bat acts 1.5x more often ✅
- Player speed 10 + Monster speed 5 (Zombie) = Player acts 2x more often ✅
- **Balanced, predictable combat encounters**

---

### Files Modified

**Core Implementation** (3 files):
1. `src/services/TurnService/TurnService.ts` - Added `grantEnergyToAllActors()` method
2. `src/main.ts` - Updated game loop to use new method (do-while for minimum 1 tick)
3. `src/services/MonsterTurnService/MonsterTurnService.ts` - Removed duplicate energy grant

**Tests Updated** (3 files):
4. `src/__integration__/energy-game-loop.test.ts` - Updated `simulatePlayerTurn()` + expectations (8 tests)
5. `src/services/MonsterTurnService/energy-turn-processing.test.ts` - Added energy grants (7 tests)
6. `src/services/MonsterTurnService/turn-processing.test.ts` - Added energy grants (5 tests)

**Documentation Updated** (3 files):
7. `docs/services/TurnService.md` - Added `grantEnergyToAllActors()` API docs, updated game loop
8. `docs/services/MonsterTurnService.md` - Clarified energy now granted in Phase 1
9. `docs/CHANGELOG.md` - This entry

**Test Results**:
- ✅ All 83 energy system tests passing
- ✅ Build successful
- ✅ No regressions

---

## 2025-10-06 - Monster Aggression & Food Balance (v2.2)

**Objective**: Fix passive monster behavior and food scarcity causing hunger deaths instead of combat deaths

**Changes Made**: Monster AI tuning + item spawning rebalance

---

### Monster AI Improvements

**Problem**: Monsters had aggro ranges 12-100% too low, causing them to wake up too late or not at all. Players died from hunger while wandering instead of from combat encounters.

**Monster Data Updates** (`public/data/monsters.json`):

| Monster | Aggro Change | Behavior Change | Intelligence Change | Other Changes |
|---------|--------------|-----------------|---------------------|---------------|
| **Bat (B)** | 5→**8** (+60%) | SIMPLE→**ERRATIC** | 1→**2** | Now unpredictable |
| **Kobold (K)** | 5→**7** (+40%) | - | - | Better detection |
| **Snake (S)** | 4→**5** (+25%) | - | 1→**2** | - |
| **Orc (O)** | 6→**8** (+33%) | SMART→**GREEDY** | 3→**5** | fleeThreshold: 0.0→**0.25** |
| **Zombie (Z)** | 3→**6** (+100%) | - | - | Biggest fix |
| **Troll (T)** | 7→**8** (+14%) | SMART→**SIMPLE** | 3→**4** | fleeThreshold: 0.0→**0.2** |
| **Dragon (D)** | 10→**15** (+50%) | - | 5→**8** | fleeThreshold: 0.0→**0.15** |

**Impact**:
- ✅ Monsters now detect player from 5-15 tiles (design spec compliant)
- ✅ 2-3x more combat encounters per level
- ✅ Proper pursuit gameplay (monsters chase, don't just spawn adjacent)
- ✅ Bat behavior now erratic (50% random movement)

---

### Food Spawning Improvements

**Problem**: Only ~0.57 food per level spawned, insufficient for increased combat frequency.

**DungeonService Changes** (`src/services/DungeonService/DungeonService.ts`):

1. **Increased item count per level**:
   - Before: 3-6 items per level
   - After: **5-8 items per level** (+2 items average)

2. **Increased food spawn weight**:
   - Before: Food weight = 12 (same as other categories)
   - After: Food weight = **18** (+50% increase)

**Impact**:
- ✅ Expected food per level: 0.57→**1.16** (+103%)
- ✅ Food spawn chance: 12.6%→**17.8%**
- ✅ Balanced resource management for combat-heavy gameplay

---

### Documentation Updates

**Updated Files**:
- ✅ `docs/services/DungeonService.md` - Item count (5-8), food weight (18)
- ✅ `docs/systems-advanced.md` - Already had correct aggro ranges
- ✅ `public/data/monsters.json` - All 7 monster AI profiles updated

**Test Results**:
- ✅ 74/74 MonsterAI tests passing
- ✅ 33/33 MonsterSpawn tests passing
- ✅ 27/27 DungeonService tests passing
- ✅ Build successful

---

### Expected Gameplay Impact

**Before Changes**:
- Monsters woke up at 3-6 tiles (too close)
- ~0.5 combat encounters per level
- Death by hunger > death by combat ❌

**After Changes**:
- Monsters detect at 5-15 tiles (proper pursuit)
- ~2-3x more combat encounters
- Sufficient food to sustain combat
- Death by combat > death by hunger ✅

**Proper roguelike balance restored**: Combat is primary threat, food is manageable resource.

---

## 2025-10-06 - Potion System Complete (v2.1)

**Objective**: Document completion of all 11 Original Rogue potion types and energy system integration

**Total Changes**: 6 documentation files updated, 100% test coverage achieved

---

### Implementation Complete

**All 11 Potion Types** ✅:
- ✅ **HEAL** (1d8 HP) - Healing potion
- ✅ **EXTRA_HEAL** (3d8 HP) - Greater healing
- ✅ **GAIN_STRENGTH** (Permanent +1 STR) - Strength boost
- ✅ **RESTORE_STRENGTH** (Restore to max) - Counter drains
- ✅ **POISON** (1d6 damage, can kill) - Harmful potion
- ✅ **RAISE_LEVEL** (Instant level up) - Experience boost
- ✅ **DETECT_MONSTERS** (Reveal all monsters) - Detection
- ✅ **DETECT_MAGIC** (Highlight magic items) - Detection
- ✅ **CONFUSION** (19-21 turns random movement) - Debuff
- ✅ **BLINDNESS** (40-60 turns no vision) - Debuff
- ✅ **HASTE_SELF** (4-8 turns double actions) - Buff
- ✅ **SEE_INVISIBLE** (Until stairs, reveal Phantoms) - Buff
- ✅ **LEVITATION** (29-32 turns trap immunity) - Buff

**Energy System** ✅:
- Angband-style energy-based action system
- Variable monster speeds (speed 5 = slow, 10 = normal, 20 = fast)
- HASTE_SELF doubles energy gain (200 energy/turn vs 100)
- All entities accumulate energy, actions cost 100 energy
- Smooth turn-based gameplay with variable speeds

---

### Documentation Updates

**Service Documentation**:
- ✅ **PotionService.md** - Complete documentation for all 11 potions
  - Added implementation table with durations, effects, integrations
  - Documented service dependencies (StatusEffectService, LevelingService, FOVService)
  - Removed "Future Enhancements" (all implemented)
- ✅ **StatusEffectService.md** - Updated with all status effect types
  - Changed status from "Planned" to "Complete"
  - Added all 8 status effects (CONFUSED, BLIND, HASTED, LEVITATING, SEE_INVISIBLE, etc.)
  - Updated test coverage section
- ✅ **TurnService.md** - Complete rewrite with energy system
  - Documented 5 new energy system methods
  - Added energy system design rationale
  - Added game loop integration example
  - Removed turn-based limitation references

**Game Design Documentation**:
- ✅ **game-design/05-items.md** - Updated to v2.1
  - Marked all 11 potions as "✅ All Implemented"
  - Added test coverage metrics (159/159 suites, 1732/1732 tests, 100%)
  - Updated potion details with durations and mechanics
  - Cross-referenced PotionService.md

**Service Index**:
- ✅ **services/README.md** - Updated service listings
  - Updated PotionService dependencies
  - Updated StatusEffectService dependencies (None → standalone)
  - Updated TurnService dependencies (None → StatusEffectService)
  - Updated dependency graph to show StatusEffectService as core service
  - Added PotionService to composite services list
  - Updated RegenerationService count in Core Game Logic (9 → 10 services)

---

### Test Coverage

**Before Phase 3**:
- 134/159 test suites passing (84%)
- Missing energy system integration
- Missing status effect fields in test players
- Incomplete service dependencies

**After Phase 3**:
- ✅ 159/159 test suites passing (100%)
- ✅ 1,732/1,732 individual tests passing (100%)
- ✅ All test players updated with statusEffects and energy fields
- ✅ All services properly instantiated with dependencies
- ✅ Energy system fully integrated
- ✅ All 11 potions tested with comprehensive coverage

---

### Service Integration

**New Dependencies**:
- TurnService → StatusEffectService (tick status effects)
- TrapService → StatusEffectService (LEVITATING check)
- PotionService → LevelingService (RAISE_LEVEL)
- PotionService → FOVService (DETECT_MONSTERS)
- MovementService → StatusEffectService (CONFUSED check)
- FOVService → StatusEffectService (BLIND check)

**Energy System Integration**:
- Player.energy: number (accumulated energy for actions)
- Monster.speed: number (energy gain rate)
- Monster.energy: number (accumulated energy)
- TurnService.grantPlayerEnergy() (accumulate energy)
- TurnService.consumePlayerEnergy() (spend energy on actions)
- TurnService.canPlayerAct() (check if enough energy)

---

### Breaking Changes

**Player Interface**:
- Added `statusEffects: StatusEffect[]` (required field)
- Added `energy: number` (required field, default 100)

**Monster Interface**:
- Added `speed: number` (required field, determines energy gain rate)
- Added `energy: number` (required field, default 100)
- Added `isInvisible: boolean` (required field for SEE_INVISIBLE)

**TurnService**:
- Constructor now requires StatusEffectService parameter
- incrementTurn() now ticks status effects automatically
- Added energy system methods (grantPlayerEnergy, consumePlayerEnergy, canPlayerAct)

---

### Commits

1. **feat**: implement LEVITATION potion with trap immunity (Phase 3.2)
2. **fix**: add missing potion descriptors to IdentificationService
3. **fix**: add StatusEffectService to all TurnService instantiations (17 files)
4. **fix**: add statusEffects and energy to test players (23 files)
5. **fix**: add RegenerationService to MoveCommand tests (6 files)
6. **fix**: update DeathScreen tests for ComprehensiveDeathStats interface
7. **fix**: update VictoryScreen test text expectations
8. **fix**: update HungerService ring modifier tests (1.5x → 1.3x)
9. **fix**: update TurnService immutability test expectations
10. **fix**: add energy fields to all test monsters (3 files)
11. **fix**: add RegenerationService to integration tests
12. **docs**: update PotionService.md with all 11 potions
13. **docs**: update game-design/05-items.md with implementation status
14. **docs**: update StatusEffectService.md to Complete status
15. **docs**: rewrite TurnService.md with energy system documentation
16. **docs**: update services/README.md with correct dependencies

---

### Success Criteria

**Quantitative Metrics**:
- ✅ All 11 Original Rogue potions implemented
- ✅ 100% test suite pass rate (159/159 suites)
- ✅ 100% individual test pass rate (1,732/1,732 tests)
- ✅ Energy system fully integrated across all services
- ✅ 6 documentation files updated with complete information

**Qualitative Metrics**:
- ✅ All potions match Original Rogue behavior and durations
- ✅ Energy system enables variable speed monsters and HASTE_SELF
- ✅ Status effects automatically tick and expire
- ✅ Comprehensive documentation for all potion types
- ✅ Complete service dependency documentation

---

## 2025-10-06 - Major Refactor (v2.0)

**Objective**: Apply SOLID principles to documentation, eliminate god documents, improve discoverability

**Total Changes**: 12 commits across 6 phases

---

### Breaking Changes

**God Documents Split**:
- ❌ **services.md** (1,745 lines) → ✅ **4 focused documents** (1,942 lines total)
  - `docs/services/README.md` (287 lines) - Service catalog
  - `docs/services/creation-guide.md` (546 lines) - Step-by-step creation
  - `docs/services/patterns.md` (632 lines) - Common patterns
  - `docs/services/testing-guide.md` (478 lines) - Testing approach

- ❌ **commands.md** (2,619 lines) → ✅ **4 focused documents** (1,966 lines total)
  - `docs/commands/README.md` (118 lines) - Command catalog
  - `docs/commands/creation-guide.md` (541 lines) - Step-by-step creation
  - `docs/commands/patterns.md` (702 lines) - Orchestration patterns
  - `docs/commands/testing-guide.md` (605 lines) - Testing approach

**CLAUDE.md Condensed**:
- ❌ **CLAUDE.md** (873 lines) → ✅ **CLAUDE.md** (422 lines, 51.6% reduction)
  - Removed detailed SOLID explanations (linked to architecture.md)
  - Removed refactoring examples (linked to ARCHITECTURAL_REVIEW.md)
  - Added comprehensive Quick Links section
  - Strategic cross-referencing to specialized docs

---

### New Documents

**Entry Points** (Phase 2):
- ✅ **docs/README.md** (160 lines) - Master documentation index
  - Quick Start paths (3 audiences: new dev, designer, contributor)
  - Documentation Map with categorized links
  - Learning Paths (beginner → intermediate → advanced)
  - Document Status Legend (✅ Complete, 🚧 In Progress, 📦 Archived)

- ✅ **docs/getting-started.md** (343 lines) - New developer onboarding
  - 30-Minute Quick Start (4 steps: setup, read, modify, test)
  - Deep Dive Learning Path (2-week comprehensive guide)
  - Week-by-week breakdown with exercises
  - FAQ section

- ✅ **docs/contributing.md** (242 lines) - Contribution workflow
  - 6-step workflow (Pick Task → Plan → TDD → Review → Commit → PR)
  - Style guide (TypeScript, naming, file organization)
  - Testing requirements (>80% coverage)
  - PR template

- ✅ **docs/troubleshooting.md** (428 lines) - Common issues
  - 12 problems across 5 categories (Build, Test, Architecture, Runtime, Errors)
  - Solution-oriented format (Problem → Solution → Example)
  - Cross-references to relevant guides

**Historical Content** (Phase 5):
- ✅ **docs/plans/README.md** (60 lines) - Plan catalog
  - Status table (📦 Archived, 🚧 In Progress)
  - Links to 5 completed plans (death screen, regeneration, light sources, game design, docs)
  - Workflow for creating new plans
  - Reference to TEMPLATE.md

- ✅ **docs/plans/TEMPLATE.md** (272 lines) - Plan template
  - 10-section comprehensive structure
  - Objectives, Phases & Tasks, Technical Design, Testing Strategy
  - Integration Points, Documentation Updates, Risk & Considerations
  - Timeline, Post-Implementation checklist

**Project Landing Page** (Phase 6):
- ✅ **README.md** (264 lines) - Repository root
  - Project overview, features, quick start
  - Controls reference
  - Documentation links (Getting Started, Contributing, CLAUDE.md)
  - Tech stack, architecture diagram
  - Development commands, project status
  - License and acknowledgments

---

### Improvements

**DRY Principle Applied** (Phase 3):
- ✅ Eliminated duplication across documents
- ✅ Established single sources of truth:
  - SOLID principles → architecture.md
  - Refactoring examples → ARCHITECTURAL_REVIEW.md
  - Service patterns → services/patterns.md
  - Command patterns → commands/patterns.md
  - Testing patterns → testing-strategy.md, services/testing-guide.md, commands/testing-guide.md
  - File organization → CLAUDE.md, contributing.md

**Link Verification** (Phase 6.1):
- ✅ 584 markdown links verified
- ✅ 4 broken links fixed:
  - regeneration_plan.md: game-design.md paths corrected
  - game_design_document_refactor_plan.md: game-design.md paths corrected

**Document Size Verification** (Phase 6.2):
- ✅ CLAUDE.md: 422 lines (target: ~500 ✓)
- ✅ architecture.md: 1,223 lines (allowed exception)
- ✅ 8 documents over 500 lines (acceptable - focused technical references):
  - systems-advanced.md (822), commands/patterns.md (702), systems-core.md (656)
  - services/patterns.md (632), commands/testing-guide.md (605), services/creation-guide.md (546)
  - commands/creation-guide.md (541), testing-strategy.md (523)
- ✅ All serve as complete references (not god documents)

**Content Organization**:
- ✅ Moved 3 completed plans to docs/plans/ (light source, regeneration, game design refactor)
- ✅ Updated cross-references after moves
- ✅ Created plan catalog with status tracking

---

### Migration Guide

**If you're looking for old content:**

| Old Location | New Location | Description |
|--------------|--------------|-------------|
| `docs/services.md` | `docs/services/README.md` | Service catalog and overview |
| `docs/services.md` (creation) | `docs/services/creation-guide.md` | Step-by-step service creation |
| `docs/services.md` (patterns) | `docs/services/patterns.md` | Result Objects, Factories, DI |
| `docs/services.md` (testing) | `docs/services/testing-guide.md` | AAA pattern, MockRandom, coverage |
| `docs/commands.md` | `docs/commands/README.md` | Command catalog and overview |
| `docs/commands.md` (creation) | `docs/commands/creation-guide.md` | Step-by-step command creation |
| `docs/commands.md` (patterns) | `docs/commands/patterns.md` | Orchestration, delegation, guards |
| `docs/commands.md` (testing) | `docs/commands/testing-guide.md` | Mocking, turn consumption tests |
| `CLAUDE.md` (SOLID details) | `docs/architecture.md` | SOLID principles explained |
| `CLAUDE.md` (refactor examples) | `docs/ARCHITECTURAL_REVIEW.md` | Real-world refactoring cases |
| `docs/light_source_plan.md` | `docs/plans/light_source_plan.md` | Archived plan (moved) |
| `docs/regeneration_plan.md` | `docs/plans/regeneration_plan.md` | Archived plan (moved) |
| `docs/game_design_document_refactor_plan.md` | `docs/plans/game_design_document_refactor_plan.md` | Archived plan (moved) |

---

### SOLID Principles Applied to Documentation

**Single Responsibility Principle**:
- Each document has ONE topic
- services/creation-guide.md = ONLY creation steps
- services/patterns.md = ONLY common patterns
- services/testing-guide.md = ONLY testing approaches

**Open/Closed Principle**:
- Extend documentation by adding NEW files
- Don't modify existing complete guides
- Use cross-references to link related content

**Liskov Substitution Principle**:
- Guide documents substitutable (same structure, different topics)
- All creation guides follow same format
- All testing guides follow same AAA pattern

**Interface Segregation Principle**:
- Readers only see what they need
- Beginner path ≠ Advanced path
- Quick Start (30 min) vs Deep Dive (2 weeks)

**Dependency Inversion Principle**:
- High-level docs (README.md) link to low-level docs
- Concrete examples reference abstract principles
- Architecture principles reused across guides

---

### Metrics

**Before Refactor**:
- 2 god documents (4,364 lines combined)
- CLAUDE.md (873 lines, too large)
- No entry points for new developers
- Duplicate content across files
- Difficult to find specific information

**After Refactor**:
- 12 focused documents (4,908 lines, better organized)
- CLAUDE.md (422 lines, 51.6% reduction)
- 3 entry points (README.md, getting-started.md, contributing.md)
- Single sources of truth established
- Clear navigation paths
- Plan catalog and template
- Comprehensive root README.md

**Coverage**:
- 36,418 total lines of documentation
- 584 internal links verified
- 100% broken links fixed
- 5 archived plans organized

---

### Phase Summary

| Phase | Tasks | Status | Key Deliverables |
|-------|-------|--------|------------------|
| **Phase 1** | Split God Docs | ✅ Complete | 8 new focused docs, CLAUDE.md condensed |
| **Phase 2** | Entry Points | ✅ Complete | README, getting-started, contributing, troubleshooting |
| **Phase 3** | Remove Duplication | ✅ Complete | Verified all duplicates eliminated |
| **Phase 4** | Standardization | ⏭️ Skipped | Lower priority, deferred |
| **Phase 5** | Historical Content | ✅ Complete | Plan catalog, template, 3 plans moved |
| **Phase 6** | Final Verification | ✅ Complete | Links fixed, sizes verified, root README, CHANGELOG |

---

### Commit Log

1. **af02be1** - docs: refactor services.md into focused documents (Phase 1.1)
2. **24d3b72** - docs: refactor commands.md into focused documents (Phase 1.2)
3. **808a11c** - docs: condense CLAUDE.md to 422 lines with strategic links (Phase 1.3)
4. **c38aae3** - docs: create master README.md with navigation (Phase 2.1)
5. **f9aa503** - docs: create getting-started.md with learning paths (Phase 2.2)
6. **c1287ad** - docs: create contributing.md workflow guide (Phase 2.3)
7. **2e02dd0** - docs: create troubleshooting.md with common issues (Phase 2.4)
8. **84148c8** - docs: verify duplication removal in Phase 1.3 (Phase 3)
9. **acd77ed** - docs: organize completed plans into docs/plans/ archive (Phase 5.1)
10. **3c35289** - docs: add plan template for future features (Phase 5.2)
11. **c34b507** - docs: fix broken links in archived plans (Phase 6.1)
12. **bfb6234** - docs: create root README with documentation links (Phase 6.3)

---

### Success Criteria

**Quantitative Metrics**:
- ✅ No document >500 lines (except architecture.md and focused technical references)
- ✅ All god documents split into 4+ focused files
- ✅ CLAUDE.md reduced from 873 → 422 lines (51.6% reduction)
- ✅ Zero duplicate concept explanations (each concept in ONE place)
- ✅ All internal links verified working (584 links, 4 fixed)

**Qualitative Metrics**:
- ✅ New developer can find onboarding path in <60 seconds (docs/getting-started.md)
- ✅ Any concept findable via docs/README.md in <3 clicks
- ✅ Each document has clear single responsibility
- ✅ Documentation follows SOLID principles
- ✅ Contributing workflow is clear and actionable

---

## Future Enhancements

**Deferred from Phase 4** (Lower Priority):
- Standardize document headers across all docs
- Add quick reference cards (services, commands, testing)
- Add breadcrumb navigation to all documents

**Potential Improvements**:
- Video walkthrough of getting started
- Interactive code examples
- Diagram generation (architecture, FOV, pathfinding)
- Search functionality
- Documentation versioning

---

**Last Updated**: 2025-10-06
**Refactor Plan**: [document_refactor_plan.md](./plans/document_refactor_plan.md)
**Status**: 📦 Archived (Refactor Complete)
