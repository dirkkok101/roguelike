# Monster Spawn Refactor & Balance Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Monsters](../game-design/04-monsters.md) | [Dungeon](../game-design/03-dungeon.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Extract monster spawning logic from DungeonService into a dedicated MonsterSpawnService, implement speed variety to make the energy system work properly, and establish data-driven monster spawning with weighted distribution for proper difficulty progression.

### Design Philosophy
- **Single Responsibility Principle**: DungeonService handles layout/structure, MonsterSpawnService handles monster population
- **Data-Driven Design**: Load monster definitions from JSON (single source of truth), not hardcoded templates
- **Progressive Difficulty**: Spawn count and monster selection scale with dungeon depth (harder as you go deeper)
- **Energy System Integration**: Variable monster speeds (slow/normal/fast) make energy system work as designed

### Success Criteria
- [ ] MonsterSpawnService created with clean architecture (service layer, no logic in commands)
- [ ] Monster data loaded from `monsters.json` (no hardcoded templates)
- [ ] Speed variety implemented (slow Zombies, fast Dragons) - fixes "monsters too slow" issue
- [ ] Spawn count scales with depth: 5 monsters at level 1, 20 at level 10 (was 2-7)
- [ ] Weighted spawning ensures appropriate monsters per level (no Dragons at level 1)
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles (dependency injection, immutability)
- [ ] Documentation updated (service docs, game design docs)

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Monsters - Complete Monster List](../game-design/04-monsters.md#1-complete-monster-list-a-z) - All 26 monster types
- [Monsters - Scaling by Dungeon Level](../game-design/04-monsters.md#6-scaling-by-dungeon-level) - Level distribution (early 1-3, mid 4-7, late 8-10)
- [Dungeon - Level Persistence](../game-design/03-dungeon.md#4-level-persistence) - How levels are generated and saved
- [Combat](../game-design/09-combat.md) - Damage formulas, hit calculations

### Related Systems
- **DungeonService**: Currently owns monster spawning logic (411-543), needs refactoring to delegate to MonsterSpawnService
- **MonsterTurnService**: Consumes `monster.speed` for energy grants, currently all monsters have speed=10 (broken variety)
- **TurnService**: Energy system (Angband-style) expects variable speeds but all monsters hardcoded to speed=10
- **Energy System**: `ENERGY_THRESHOLD=100`, speeds 5/10/15/20 determine how often monsters act

### Research Summary

**Current State Analysis**:
- ❌ DungeonService has 200+ lines of monster spawning code (violates SRP)
- ❌ Monster templates hardcoded in DungeonService.ts:416-477 (6 templates)
- ❌ `monsters.json` exists with 7 monsters but **never loaded** (data architecture ignored)
- ❌ All monsters spawn with `speed: 10` hardcoded (line 536) - no speed variety
- ❌ Spawn count: `depth + 1` capped at 7 (too few monsters for challenge)
- ❌ Dragon defined in JSON but never spawns (level 10 filter not working)
- ❌ No weighted spawning (all monsters equally likely regardless of depth)

**Original Rogue (1980) Patterns**:
- Variable monster counts per level (2-15 monsters)
- Monster difficulty scales with depth (Bats on level 1, Dragons on level 10)
- Some monsters marked "mean" (start awake and aggressive)
- Speed variety not in original (turn-based), but NetHack/Angband added it

**Angband Energy System**:
- Speed determines energy gain: `energy += speed` per tick
- Slow monsters (speed 5): act every 20 ticks
- Normal monsters (speed 10): act every 10 ticks
- Fast monsters (speed 15-20): act every 5-7 ticks
- Our implementation identical, but all monsters speed=10 (broken)

---

## 3. Phases & Tasks

### Phase 1: Create MonsterSpawnService Structure (Priority: HIGH)

**Objective**: Establish service foundation with clean architecture

#### Task 1.1: Create Service Skeleton

**Context**: New service in services layer following project patterns

**Files to create**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- `src/services/MonsterSpawnService/index.ts`

##### Subtasks:
- [ ] Create `MonsterSpawnService/` folder
- [ ] Create `MonsterSpawnService.ts` with class skeleton
- [ ] Add `IRandomService` dependency injection
- [ ] Create public API methods (stubs):
  - `loadMonsterData(): Promise<void>`
  - `spawnMonsters(rooms: Room[], tiles: Tile[][], depth: number): Monster[]`
  - `getSpawnCount(depth: number): number`
- [ ] Create barrel export in `index.ts`
- [ ] Git commit: "feat: create MonsterSpawnService skeleton (Phase 1.1)"

---

#### Task 1.2: Add Type Definitions

**Context**: Define MonsterTemplate interface for JSON data structure

**Files to modify**:
- `src/types/core/core.ts` (add MonsterTemplate interface)

##### Subtasks:
- [ ] Define `MonsterTemplate` interface matching monsters.json structure
- [ ] Add fields: letter, name, hp, ac, damage, xpValue, level, speed, rarity, mean, aiProfile
- [ ] Export interface from core.ts
- [ ] Git commit: "feat: add MonsterTemplate type definition (Phase 1.2)"

---

#### Task 1.3: Create Test File Structure

**Context**: Set up test files for TDD approach

**Files to create**:
- `src/services/MonsterSpawnService/data-loading.test.ts`
- `src/services/MonsterSpawnService/spawn-logic.test.ts`
- `src/services/MonsterSpawnService/weighted-selection.test.ts`
- `src/services/MonsterSpawnService/monster-creation.test.ts`

##### Subtasks:
- [ ] Create 4 test files with skeleton describe blocks
- [ ] Add MockRandom setup
- [ ] Add test helper functions (createTestRoom, createTestTiles)
- [ ] Git commit: "test: create MonsterSpawnService test structure (Phase 1.3)"

---

### Phase 2: Load Monster Data from JSON (Priority: HIGH)

**Objective**: Replace hardcoded templates with data file loading

#### Task 2.1: Implement loadMonsterData()

**Context**: Fetch and parse monsters.json at service initialization

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- `src/services/MonsterSpawnService/data-loading.test.ts`

##### Subtasks:
- [ ] Implement `loadMonsterData()` method using `fetch('/data/monsters.json')`
- [ ] Parse JSON and store in `private monsterTemplates: MonsterTemplate[]`
- [ ] Add error handling for fetch failures
- [ ] Add JSON validation (check required fields)
- [ ] Write tests: successful load, handles missing file, handles malformed JSON, validates structure
- [ ] Git commit: "feat: implement monster data loading from JSON (Phase 2.1)"

---

#### Task 2.2: Add Data Validation

**Context**: Ensure JSON structure is valid before using

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Create `private validateMonsterData(data: any[]): MonsterTemplate[]` method
- [ ] Check required fields exist (letter, name, hp, ac, damage, level, speed)
- [ ] Validate types (speed is number, hp is dice string, etc.)
- [ ] Throw descriptive errors if validation fails
- [ ] Write tests: validates correct data, rejects missing fields, rejects wrong types
- [ ] Git commit: "feat: add monster data validation (Phase 2.2)"

---

#### Task 2.3: Cache Monster Data

**Context**: Store loaded data in service instance for reuse

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Add `private monsterTemplates: MonsterTemplate[] = []` instance variable
- [ ] Store validated data in cache after loading
- [ ] Add `isDataLoaded()` check to prevent duplicate loads
- [ ] Update spawnMonsters() to check cache before using
- [ ] Write tests: caches data after load, doesn't reload if cached, throws if spawn called before load
- [ ] Git commit: "feat: cache loaded monster data (Phase 2.3)"

---

### Phase 3: Implement Spawn Logic (Priority: HIGH)

**Objective**: Move spawning logic from DungeonService to MonsterSpawnService

#### Task 3.1: Implement Spawn Count Formula

**Context**: New formula scales monsters with depth (5 at level 1, 20 at level 10)

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- `src/services/MonsterSpawnService/spawn-logic.test.ts`

##### Subtasks:
- [ ] Implement `getSpawnCount(depth: number): number` method
- [ ] Formula: `Math.min((depth * 2) + 3, 20)`
- [ ] Write tests: level 1 = 5, level 5 = 13, level 10 = 20, never exceeds 20
- [ ] Git commit: "feat: implement progressive spawn count formula (Phase 3.1)"

---

#### Task 3.2: Implement Position Selection

**Context**: Pick random valid positions in rooms for monster spawns

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Create `private selectSpawnPosition(rooms: Room[], tiles: Tile[][], occupied: Set<string>): Position | null`
- [ ] Pick random room, random position in room
- [ ] Check walkable tile, not already occupied
- [ ] Use retry logic (max 10 attempts per spawn)
- [ ] Write tests: selects valid position, avoids occupied, returns null if no space
- [ ] Git commit: "feat: implement spawn position selection (Phase 3.2)"

---

#### Task 3.3: Implement Monster Creation

**Context**: Create Monster instance from MonsterTemplate + position

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- `src/services/MonsterSpawnService/monster-creation.test.ts`

##### Subtasks:
- [ ] Create `private createMonster(template: MonsterTemplate, position: Position, id: string): Monster`
- [ ] Roll HP using RandomService.roll(template.hp)
- [ ] Set all Monster fields from template (ac, damage, xpValue, level, speed, aiProfile)
- [ ] Initialize energy randomly (0-99) for staggered starts
- [ ] Set isAwake based on template.mean field (true if mean, false otherwise)
- [ ] Set state: SLEEPING if not mean, HUNTING if mean
- [ ] Write tests: creates monster with correct stats, rolls HP, applies speed, initializes energy, sets mean flag
- [ ] Git commit: "feat: implement monster creation from template (Phase 3.3)"

---

#### Task 3.4: Implement spawnMonsters() Core Logic

**Context**: Main public method that orchestrates monster spawning

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Implement `spawnMonsters(rooms: Room[], tiles: Tile[][], depth: number): Monster[]`
- [ ] Call `getSpawnCount(depth)` to determine how many
- [ ] Loop: select template, select position, create monster, add to array
- [ ] Track occupied positions to avoid overlaps
- [ ] Return array of created monsters
- [ ] Write tests: spawns correct count, monsters in valid positions, no overlaps
- [ ] Git commit: "feat: implement spawnMonsters core logic (Phase 3.4)"

---

### Phase 4: Weighted Spawning Algorithm (Priority: HIGH)

**Objective**: Ensure appropriate monster difficulty per level (no Dragons at level 1)

#### Task 4.1: Implement Level-Based Filtering

**Context**: Filter monster templates by depth range

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- `src/services/MonsterSpawnService/weighted-selection.test.ts`

##### Subtasks:
- [ ] Create `private filterMonstersByDepth(depth: number): MonsterTemplate[]`
- [ ] Filter templates where `template.level <= depth + 2` (allow slightly harder)
- [ ] Ensure at least 1 template available (fallback to all if depth too low)
- [ ] Write tests: level 1 gets level 1-3, level 5 gets level 1-7, level 10 gets all
- [ ] Git commit: "feat: implement level-based monster filtering (Phase 4.1)"

---

#### Task 4.2: Implement Rarity Weighting

**Context**: Common monsters spawn more often than rare

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Create `private selectWeightedMonster(templates: MonsterTemplate[]): MonsterTemplate`
- [ ] Assign weights: common=50%, uncommon=30%, rare=20%
- [ ] Use RandomService weighted selection
- [ ] Write tests: distribution matches weights over 1000 samples
- [ ] Git commit: "feat: implement rarity-based weighting (Phase 4.2)"

---

#### Task 4.3: Implement Boss Monster Logic

**Context**: Boss monsters (Dragon level 10) only spawn on deep levels

**Files to modify**:
- `src/services/MonsterSpawnService/MonsterSpawnService.ts`

##### Subtasks:
- [ ] Add `isBossMonster(template: MonsterTemplate): boolean` (checks level >= 10)
- [ ] In `selectWeightedMonster`, exclude bosses if `depth < template.level - 1`
- [ ] Write tests: Dragon spawns on level 9-10, never on level 1-8
- [ ] Git commit: "feat: implement boss monster spawn restrictions (Phase 4.3)"

---

#### Task 4.4: Integration Testing for Weighted Spawning

**Context**: Verify spawning distribution is correct

**Files to modify**:
- `src/services/MonsterSpawnService/weighted-selection.test.ts`

##### Subtasks:
- [ ] Test: level 1 spawns 80%+ level 1 monsters
- [ ] Test: level 5 spawns mix of level 1-5
- [ ] Test: level 10 spawns 40%+ level 8-10 monsters
- [ ] Test: Dragon never spawns below level 9
- [ ] Test: rarity distribution (common > uncommon > rare)
- [ ] Git commit: "test: add weighted spawning integration tests (Phase 4.4)"

---

### Phase 5: Update monsters.json (Priority: HIGH)

**Objective**: Add speed, rarity, mean fields to all monsters

#### Task 5.1: Add speed Field

**Context**: Variable speeds make energy system work (slow/normal/fast)

**Files to modify**:
- `public/data/monsters.json`

##### Subtasks:
- [ ] Add `"speed": 5` to Zombie (slow, acts every 20 ticks)
- [ ] Add `"speed": 7` to Troll (slow regenerator)
- [ ] Add `"speed": 10` to Kobold, Snake, Orc (normal)
- [ ] Add `"speed": 15` to Bat (fast flyer)
- [ ] Add `"speed": 18` to Dragon (very fast boss)
- [ ] Git commit: "data: add speed field to all monsters (Phase 5.1)"

---

#### Task 5.2: Add rarity Field

**Context**: Control spawn frequency (common/uncommon/rare)

**Files to modify**:
- `public/data/monsters.json`

##### Subtasks:
- [ ] Add `"rarity": "common"` to Bat, Kobold, Snake, Zombie (50% spawn rate)
- [ ] Add `"rarity": "uncommon"` to Orc, Troll (30% spawn rate)
- [ ] Add `"rarity": "rare"` to Dragon (20% spawn rate, only deep levels)
- [ ] Git commit: "data: add rarity field to all monsters (Phase 5.2)"

---

#### Task 5.3: Add mean Field

**Context**: "Mean" monsters start awake and aggressive

**Files to modify**:
- `public/data/monsters.json`

##### Subtasks:
- [ ] Add `"mean": false` to Bat, Kobold, Snake (50% sleep chance)
- [ ] Add `"mean": true` to Zombie, Orc, Troll, Dragon (always awake, aggressive)
- [ ] Reference game-design/04-monsters.md for which monsters are "mean"
- [ ] Git commit: "data: add mean field to all monsters (Phase 5.3)"

---

#### Task 5.4: Validate JSON Structure

**Context**: Ensure valid JSON after manual edits

##### Subtasks:
- [ ] Run JSON validator (online tool or `node -e "JSON.parse(require('fs').readFileSync('public/data/monsters.json'))"`)
- [ ] Verify all monsters have required fields: speed, rarity, mean
- [ ] Check no syntax errors (trailing commas, quotes)
- [ ] Git commit: "data: validate monsters.json structure (Phase 5.4)"

---

### Phase 6: Refactor DungeonService (Priority: HIGH)

**Objective**: Remove monster spawning from DungeonService, delegate to MonsterSpawnService

#### Task 6.1: Inject MonsterSpawnService

**Context**: Add new service dependency to DungeonService

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts`

##### Subtasks:
- [ ] Add `private monsterSpawnService: MonsterSpawnService` to constructor
- [ ] Update all DungeonService instantiations in main.ts to pass MonsterSpawnService
- [ ] Git commit: "refactor: inject MonsterSpawnService into DungeonService (Phase 6.1)"

---

#### Task 6.2: Replace spawnMonsters() Call

**Context**: Use MonsterSpawnService instead of internal method

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts`

##### Subtasks:
- [ ] In `generateLevel()` method (line 116), replace `this.spawnMonsters(...)` with `this.monsterSpawnService.spawnMonsters(...)`
- [ ] Remove `monsterCount` calculation (now inside service)
- [ ] Pass rooms, tiles, depth to service method
- [ ] Git commit: "refactor: use MonsterSpawnService in generateLevel (Phase 6.2)"

---

#### Task 6.3: Remove Old spawnMonsters() Method

**Context**: Delete hardcoded spawning logic (130 lines)

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts`

##### Subtasks:
- [ ] Delete `spawnMonsters()` method (lines 411-543)
- [ ] Delete hardcoded monster templates array (lines 416-477)
- [ ] Verify no other references to deleted method
- [ ] Git commit: "refactor: remove hardcoded spawnMonsters from DungeonService (Phase 6.3)"

---

#### Task 6.4: Update DungeonService Tests

**Context**: Mock MonsterSpawnService in tests

**Files to modify**:
- `src/services/DungeonService/*.test.ts`

##### Subtasks:
- [ ] Create mock MonsterSpawnService in test setup
- [ ] Mock `spawnMonsters()` to return test monster array
- [ ] Update all DungeonService instantiations to pass mock
- [ ] Verify all DungeonService tests still pass
- [ ] Git commit: "test: update DungeonService tests with MonsterSpawnService mock (Phase 6.4)"

---

### Phase 7: Update All Tests (Priority: HIGH)

**Objective**: Add speed field to all test monsters, ensure 100% test coverage maintained

#### Task 7.1: Add speed to Test Monsters

**Context**: All test files creating monsters need speed field

**Files to modify**:
- All test files with `createTestMonster()` or inline monster objects

##### Subtasks:
- [ ] Search for all test files creating monsters: `grep -r "createTestMonster\|letter: 'M'" src/**/*.test.ts`
- [ ] Add `speed: 10` to all test monster objects (or appropriate speed)
- [ ] Update helper functions like `createTestMonster()` to include speed parameter
- [ ] Run tests, fix any remaining type errors
- [ ] Git commit: "test: add speed field to all test monsters (Phase 7.1)"

---

#### Task 7.2: Add MonsterSpawnService Unit Tests

**Context**: Comprehensive tests for new service

**Files to modify**:
- `src/services/MonsterSpawnService/*.test.ts`

##### Subtasks:
- [ ] Write 20+ unit tests across 4 test files
- [ ] data-loading.test.ts: 5 tests (load success, fail, malformed, validate, cache)
- [ ] spawn-logic.test.ts: 6 tests (spawn count, position, creation, no overlap)
- [ ] weighted-selection.test.ts: 6 tests (level filter, rarity, boss, distribution)
- [ ] monster-creation.test.ts: 5 tests (stats, HP roll, speed, energy, mean)
- [ ] Aim for >90% coverage on MonsterSpawnService
- [ ] Git commit: "test: add comprehensive MonsterSpawnService unit tests (Phase 7.2)"

---

#### Task 7.3: Add Integration Tests

**Context**: Test DungeonService + MonsterSpawnService together

**Files to create**:
- `src/__integration__/monster-spawning.test.ts`

##### Subtasks:
- [ ] Test: generateLevel() creates monsters with correct count (5 at depth 1, 20 at depth 10)
- [ ] Test: monsters spawn in valid positions (inside rooms, walkable tiles)
- [ ] Test: monsters have speed variety (not all 10)
- [ ] Test: level 1 gets easy monsters, level 10 gets Dragons
- [ ] Test: no monster overlaps (unique positions)
- [ ] Git commit: "test: add monster spawning integration tests (Phase 7.3)"

---

#### Task 7.4: Verify Test Coverage

**Context**: Ensure >80% coverage maintained

##### Subtasks:
- [ ] Run `npm run test:coverage`
- [ ] Check MonsterSpawnService coverage (should be >90%)
- [ ] Check DungeonService coverage (should remain >80%)
- [ ] Check overall project coverage (should be >80%)
- [ ] Fix any coverage gaps with additional tests
- [ ] Git commit: "test: verify test coverage after refactor (Phase 7.4)"

---

### Phase 8: Documentation (Priority: MEDIUM)

**Objective**: Document new service and updated game balance

#### Task 8.1: Create MonsterSpawnService.md

**Context**: Full service documentation following project pattern

**Files to create**:
- `docs/services/MonsterSpawnService.md`

##### Subtasks:
- [ ] Create service doc with sections: Purpose, Public API, Design Rationale, Testing, Related Services
- [ ] Document `loadMonsterData()` method
- [ ] Document `spawnMonsters()` method with spawn count formula
- [ ] Document weighted spawning algorithm
- [ ] Add code examples
- [ ] Git commit: "docs: create MonsterSpawnService documentation (Phase 8.1)"

---

#### Task 8.2: Update services/README.md

**Context**: Add MonsterSpawnService to service catalog

**Files to modify**:
- `docs/services/README.md`

##### Subtasks:
- [ ] Add MonsterSpawnService to Quick Reference Table (dependencies: RandomService)
- [ ] Add to "Level Generation" category (alongside DungeonService)
- [ ] Update service count (33 → 34 services)
- [ ] Add to dependency graph
- [ ] Git commit: "docs: add MonsterSpawnService to service catalog (Phase 8.2)"

---

#### Task 8.3: Update game-design/04-monsters.md

**Context**: Add speed table and spawn distribution

**Files to modify**:
- `docs/game-design/04-monsters.md`

##### Subtasks:
- [ ] Add new section: "8. Monster Speeds"
- [ ] Create speed table (Zombie=5, Kobold=10, Bat=15, Dragon=18)
- [ ] Update "6. Scaling by Dungeon Level" with new spawn counts (5-20 monsters)
- [ ] Document weighted spawning (common/uncommon/rare)
- [ ] Git commit: "docs: add monster speed and spawn distribution (Phase 8.3)"

---

#### Task 8.4: Update game-design/03-dungeon.md

**Context**: Document new spawn counts per level

**Files to modify**:
- `docs/game-design/03-dungeon.md`

##### Subtasks:
- [ ] Update "7. Dungeon Progression" section
- [ ] Add spawn count formula: (depth * 2) + 3, max 20
- [ ] Document level 1: 5 monsters, level 5: 13 monsters, level 10: 20 monsters
- [ ] Explain weighted distribution (easy early, hard late)
- [ ] Git commit: "docs: update dungeon spawn counts and progression (Phase 8.4)"

---

## 4. Technical Design

### Data Structures

```typescript
// Monster template from JSON data file
interface MonsterTemplate {
  letter: string            // 'B', 'K', 'S', etc.
  name: string              // "Bat", "Kobold", etc.
  hp: string                // Dice notation "1d8", "2d8", etc.
  ac: number                // Armor class (lower = better)
  damage: string            // Damage dice "1d4", "1d8+1d8", etc.
  xpValue: number           // XP awarded on kill
  level: number             // Dungeon depth (1-10)
  speed: number             // Energy gain rate (5=slow, 10=normal, 15=fast, 18+=very fast)
  rarity: 'common' | 'uncommon' | 'rare'  // Spawn frequency weight
  mean: boolean             // If true, starts awake and aggressive
  aiProfile: {
    behavior: MonsterBehavior  // SIMPLE, SMART, GREEDY, etc.
    intelligence: number       // AI intelligence (1-5)
    aggroRange: number         // Detection range in tiles
    fleeThreshold: number      // HP % to flee (0.0-1.0)
    special: string[]          // Special abilities: "flying", "regeneration", etc.
  }
}

// Monster instance (runtime)
interface Monster {
  id: string
  letter: string
  name: string
  position: Position
  hp: number                // Current HP (rolled from template.hp)
  maxHp: number
  ac: number
  damage: string
  xpValue: number
  level: number
  speed: number             // ← From template, varies by monster type
  energy: number            // Current energy (0-99 at spawn, 100+ to act)
  aiProfile: AIProfile
  isAsleep: boolean
  isAwake: boolean
  state: MonsterState
  visibleCells: Set<string>
  currentPath: Position[] | null
  hasStolen: boolean
  lastKnownPlayerPosition: Position | null
  turnsWithoutSight: number
  isInvisible: boolean
}
```

### Service Architecture

**New Services**:
- **MonsterSpawnService**: Loads monster data from JSON, spawns monsters with weighted selection based on depth and rarity

**Modified Services**:
- **DungeonService**: Delegates monster spawning to MonsterSpawnService (removes 200 lines of spawn logic)

**Service Dependencies**:
```
MonsterSpawnService
  └─ depends on → RandomService (dice rolls, weighted selection)

DungeonService
  ├─ depends on → RoomGenerationService
  ├─ depends on → CorridorGenerationService
  ├─ depends on → MonsterSpawnService (NEW)
  └─ depends on → RandomService

Main.ts
  └─ creates → MonsterSpawnService (load data at startup)
       └─ inject into → DungeonService
```

### Algorithms & Formulas

**Spawn Count Formula**:
```
spawnCount = Math.min((depth * 2) + 3, 20)

Examples:
- Depth 1: (1 * 2) + 3 = 5 monsters
- Depth 5: (5 * 2) + 3 = 13 monsters
- Depth 10: (10 * 2) + 3 = 23 → capped at 20 monsters
```

**Weighted Monster Selection**:
```
Step 1: Filter templates by depth
  - Include monsters where template.level <= depth + 2
  - Ensures player doesn't face overly difficult monsters
  - Example: Depth 3 → monsters level 1-5

Step 2: Exclude boss monsters on shallow levels
  - If template.level >= 10 and depth < 9: exclude
  - Ensures Dragons only spawn deep

Step 3: Apply rarity weights
  - common: 50% spawn chance
  - uncommon: 30% spawn chance
  - rare: 20% spawn chance

Step 4: Random weighted selection
  - Use RandomService.pickWeighted(templates, weights)
  - Returns selected MonsterTemplate
```

**Energy System Integration**:
```
Each turn:
  - Monster gains energy: monster.energy += monster.speed
  - When energy >= 100: monster can act
  - After action: monster.energy -= 100 (carryover persists)

Examples:
  - Zombie (speed 5): acts every 20 ticks (100 / 5)
  - Kobold (speed 10): acts every 10 ticks (100 / 10)
  - Bat (speed 15): acts every 6-7 ticks (100 / 15)
  - Dragon (speed 18): acts every 5-6 ticks (100 / 18)
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- MonsterSpawnService: >90% (pure logic, fully testable)
- DungeonService: >80% (orchestration, mocking spawn service)
- Overall: >80%

**Test Files**:
- `src/services/MonsterSpawnService/data-loading.test.ts` - JSON loading, validation, caching, error handling
- `src/services/MonsterSpawnService/spawn-logic.test.ts` - Spawn count formula, position selection, no overlaps
- `src/services/MonsterSpawnService/weighted-selection.test.ts` - Level filtering, rarity weighting, boss logic, distribution
- `src/services/MonsterSpawnService/monster-creation.test.ts` - Template → Monster conversion, HP rolling, speed/mean application
- `src/__integration__/monster-spawning.test.ts` - DungeonService + MonsterSpawnService integration, full level generation

### Test Scenarios

**Scenario 1: Data Loading**
- Given: `monsters.json` exists with valid data
- When: `loadMonsterData()` is called
- Then: All 7 monsters loaded, cached, validated (speed/rarity/mean fields present)

**Scenario 2: Spawn Count Scaling**
- Given: MonsterSpawnService initialized
- When: `getSpawnCount(1)`, `getSpawnCount(5)`, `getSpawnCount(10)` called
- Then: Returns 5, 13, 20 respectively (progressive difficulty)

**Scenario 3: Weighted Level 1 Spawning**
- Given: Depth = 1, monsters.json loaded
- When: `spawnMonsters(rooms, tiles, 1)` called 100 times
- Then: 80%+ spawns are level 1 monsters (Bat/Kobold/Snake), 20% level 2 (Orc/Zombie), 0% Dragons

**Scenario 4: Boss Monster Restriction**
- Given: Depth = 3, Dragon has level=10
- When: `selectWeightedMonster()` called 1000 times
- Then: Dragon never selected (only spawns depth 9+)

**Scenario 5: Speed Variety**
- Given: Depth = 5, all monsters available
- When: `spawnMonsters()` creates 13 monsters
- Then: Monsters have varied speeds (5, 10, 15), not all speed=10

**Scenario 6: Mean Monster Behavior**
- Given: Zombie has mean=true, Bat has mean=false
- When: `createMonster()` called for each
- Then: Zombie.isAwake=true, Zombie.state=HUNTING; Bat.isAwake=false, Bat.state=SLEEPING

---

## 6. Integration Points

### Commands

**Modified Commands**:
- None directly modified (monster spawning internal to level generation)

**Affected Systems**:
- **DungeonService**: Constructor signature changes (add MonsterSpawnService parameter)
- **Main.ts**: Must create MonsterSpawnService at startup and call `loadMonsterData()`

### UI Changes

**Renderer Updates**:
- No UI changes needed (monster rendering unchanged)
- Speed variety will naturally show in gameplay (fast monsters act more often)

**Input Handling**:
- No new input needed

### State Updates

**Monster Interface Changes**:
```typescript
interface Monster {
  // ... existing fields
  speed: number  // ← Now loaded from data file (was hardcoded 10)
  // All other fields unchanged
}
```

**GameState Changes**:
- No GameState interface changes needed
- Monster spawning internal to level generation

**Startup Changes**:
```typescript
// main.ts - before game initialization
const monsterSpawnService = new MonsterSpawnService(random)
await monsterSpawnService.loadMonsterData() // Load JSON before first level generation

const dungeonService = new DungeonService(
  roomGen,
  corridorGen,
  monsterSpawnService,  // ← NEW parameter
  random
)
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/plans/monster_spawn_refactor_plan.md` - This file
- [ ] Create `docs/services/MonsterSpawnService.md` - Full service documentation
- [ ] Update `docs/services/README.md` - Add MonsterSpawnService to catalog (34 services)
- [ ] Update `docs/game-design/04-monsters.md` - Add speed table, update spawn distribution
- [ ] Update `docs/game-design/03-dungeon.md` - Update spawn counts (5-20 monsters)
- [ ] Update `docs/architecture.md` - Add MonsterSpawnService to architecture diagram (if needed)

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: JSON Loading Async**
- **Problem**: `loadMonsterData()` is async (fetch), game initialization must wait
- **Mitigation**: Call `await monsterSpawnService.loadMonsterData()` in main.ts before game starts, show loading screen if needed

**Issue 2: Breaking All Test Monsters**
- **Problem**: ~50+ test files create monsters, all need `speed` field added
- **Mitigation**: Systematic search/replace with grep, create helper `createTestMonster(speed=10)` function, test early and often

**Issue 3: DungeonService Test Mocking**
- **Problem**: DungeonService tests will break when MonsterSpawnService injected
- **Mitigation**: Create simple mock `{ spawnMonsters: jest.fn(() => []) }`, update tests incrementally

**Issue 4: Balance Too Hard/Easy**
- **Problem**: New spawn counts (5-20) or weighted selection might be unbalanced
- **Mitigation**: Playtest levels 1, 5, 10 after implementation, adjust spawn formula or weights if needed

### Breaking Changes

**Constructor Signatures**:
- `DungeonService` constructor now requires `MonsterSpawnService` parameter
- All instantiations must be updated (main.ts, tests)

**Monster Interface**:
- `Monster.speed` now varies by type (was always 10)
- All test files creating monsters must add `speed` field

**Data File Dependency**:
- `monsters.json` must be present and valid at startup
- Missing file causes game initialization failure (graceful error message needed)

**Migration Steps**:
1. Create MonsterSpawnService
2. Update DungeonService to inject it
3. Update all test files to add `speed` to test monsters
4. Update main.ts to load data at startup
5. Test all 159 test suites pass

### Performance Considerations

**JSON Loading**:
- One-time fetch at startup (~1KB file, negligible)
- Cached in memory for duration of game session

**Weighted Selection**:
- O(n) filter + O(1) weighted random (n = number of monster types, ~7-20)
- Runs once per monster spawn (~5-20 per level generation)
- Total: <1ms per level generation (acceptable)

**No performance concerns expected**

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (can start immediately)
- **Blocks**:
  - Future: Adding remaining 19 monsters to reach 26 total (need spawn service first)
  - Future: Loot table system (similar weighted selection pattern)
  - Future: Special monster events (spawn service handles all monster creation)

### Estimated Timeline
- Phase 1 (Service Structure): 1 hour
- Phase 2 (Load Data): 1.5 hours
- Phase 3 (Spawn Logic): 2 hours
- Phase 4 (Weighted Spawning): 1.5 hours
- Phase 5 (Update JSON): 30 minutes
- Phase 6 (Refactor Dungeon): 1 hour
- Phase 7 (Update Tests): 2 hours
- Phase 8 (Documentation): 1.5 hours
- **Total**: 11 hours

**Estimated over 2-3 coding sessions**

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`) - 159/159 suites
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] MonsterSpawnService coverage >90%
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (4 docs: service, README, monsters, dungeon)
- [ ] Manual testing: Generate levels 1, 5, 10 and verify spawn counts (5, 13, 20)
- [ ] Manual testing: Verify speed variety (Zombie slow, Dragon fast)
- [ ] Manual testing: Verify Dragon only spawns on level 9-10
- [ ] Playtest: Game feels more challenging (more monsters, varied speeds)

### Follow-Up Tasks
- [ ] Add remaining 19 monsters to reach 26 total (Emu, Hobgoblin, Centaur, Griffin, etc.)
- [ ] Implement loot tables (similar weighted selection for item drops)
- [ ] Add special spawn events (treasure room = extra monsters, ambush rooms)
- [ ] Tune balance based on playtesting (adjust spawn formula or weights)
- [ ] Add monster pack spawning (groups of same type, e.g., 3 Orcs together)
- [ ] Add unique monsters (named bosses with special stats)

---

**Last Updated**: 2025-10-06
**Status**: 🚧 In Progress
