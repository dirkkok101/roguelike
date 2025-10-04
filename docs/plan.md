# Development Plan: ASCII Roguelike

**Version**: 2.1
**Last Updated**: 2025-10-04 (Phase 6 Progress Update)
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md)

---

## Overview

This plan outlines the 8-phase development roadmap for the ASCII Roguelike. Each phase builds on the previous, with clear deliverables and success criteria.

**Estimated Timeline**: 11 weeks total (assumes single developer, ~20-30 hours/week)

**Current Status**: Phases 1-6 complete (100%), Phase 7 (Win Condition & Polish) not started

### Recent Architectural Improvements (2025-10-04)

✅ **Completed comprehensive debug system (Phase 1 now 100% complete):**
- Implemented DebugService with 14 methods (686 lines)
- Created 9 debug commands with 100% test coverage
- Built DebugConsole UI component (224 lines) with real-time stats display
- Built DebugOverlays renderer (155 lines) for visual debugging
- Integrated god mode into CombatService to prevent damage in debug mode
- Added 7 comprehensive test files (56 tests, all passing)
- Wired 9 debug key bindings into InputHandler (~, g, v, m, M, K, f, p, n)
- **Test Results**: 1025 total tests passing (56 new debug tests added)

✅ **Completed comprehensive architectural refactoring:**
- Reorganized 9 commands + DungeonService into folder structure with barrel exports
- Standardized all imports to use path aliases (@game/*, @services/*, @commands/*)
- Extracted exploration tracking logic from MoveCommand to FOVService
- Improved architecture compliance: commands orchestrate, services contain logic

✅ **Completed door system implementation:**
- Fixed door placement bug: doors now on wall tiles (not floor tiles) - commit f1a12aa
- Fixed walkability bug: CLOSED/LOCKED doors now correctly block movement
- Implemented auto-open (bump-to-open) behavior for CLOSED doors - commit 980519f
- LOCKED doors block movement until key system (deferred to Phase 5+)
- Added 18 comprehensive door tests (door-interaction.test.ts + DungeonService tests)
- All tests passing: 66/66 suites, 787/787 tests

**Impact**: Better separation of concerns, improved maintainability, architecture now fully compliant with design guidelines. Door mechanics now match game design specification.

✅ **Phase 6 Complete (Hunger & Progression) - 100% Complete:**
- ✅ Implemented HungerService with 7 methods (44 tests passing)
  - Hunger depletion with ring modifiers (SLOW_DIGESTION reduces hunger rate)
  - 4 hunger states: NORMAL, HUNGRY, WEAK, STARVING
  - Combat penalties (-1 to hit, -1 damage when weak/starving)
  - Starvation damage (1 HP/turn at 0 hunger)
  - Hunger warning messages on state transitions
- ✅ Implemented EatCommand (10 tests passing)
  - Consumes food rations, restores 1100-1499 hunger (random)
  - 30% chance "tastes awful" flavor message
  - Integrates with InventoryService
- ✅ Integrated hunger into MoveCommand
  - Hunger ticks each turn
  - Warnings display automatically
  - Starvation damage applied
- ✅ Integrated hunger penalties into CombatService (6 tests passing)
  - Optional HungerService dependency (backward compatible)
  - Penalties applied to player attacks when weak/starving
- ✅ Implemented LevelingService with 5 methods (47 tests passing)
  - XP curve: [0, 10, 30, 60, 100, 150, 210, 280, 360, 450]
  - Level-up mechanics: +1d8 max HP, full heal, XP carry-over
  - 3 comprehensive test files (xp-calculation, level-up, xp-curve)
- ✅ Integrated LevelingService into AttackCommand
  - XP awarded on monster kills
  - Level-up detection and application
  - Level-up messages displayed
- ✅ UI Updates Complete
  - Hunger state display with visual bar
  - XP progress display with visual bar
  - 'e' key wired to EatCommand

**Test Results**: 905 total tests passing (47 new LevelingService tests added)

---

## Phase 1: Foundation & Core Loop (Week 1-2)

**Goal**: Get basic movement, rendering, and lighting working

**Status**: 🟢 Complete (16/16 complete - 100%)

### Tasks

#### Project Setup
- [x] Project setup (Vite + TypeScript + Jest)
- [x] Configure Jest with path aliases
- [x] Create tsconfig.json with strict mode
- [x] Set up folder structure (src/, data/, tests/)
- [x] Create barrel exports (index.ts files)

**Reference**: [Architecture - Technology Stack](./architecture.md#technology-stack)

#### Core Data Structures
- [x] GameState interface
- [x] Player interface
- [x] Position type
- [x] Level interface
- [x] LightSource interface
- [x] Tile interface and TileType enum

**Reference**: [Architecture - Data Structures](./architecture.md#data-structures)

#### RandomService
- [x] Create IRandomService interface
- [x] Implement SeededRandom class
- [x] Implement MockRandom class for testing
- [x] Write unit tests
  - [x] Seeded determinism tests
  - [x] Mock value queue tests
  - [x] Dice roll parsing tests

**Reference**: [Architecture - RandomService](./architecture.md#randomservice)  
**Testing**: [Testing Strategy - RandomService](./testing-strategy.md)

#### Basic UI Layer
- [x] Create index.html with layout
- [x] Style with CSS (colors, fonts, layout)
- [x] Implement dungeon grid renderer (DOM manipulation)
- [x] Implement stats panel renderer
- [x] Implement message log renderer
- [x] Keyboard input handler
- [x] Input → Command conversion

**Reference**: [Game Design - UI/UX Design](./game-design.md#uiux-design)

#### LightingService
- [x] Implement LightingService class
  - [x] tickFuel() method
  - [x] refillLantern() method
  - [x] getLightRadius() method
  - [x] isFuelLow() method
  - [x] generateFuelWarning() method
  - [x] equipLightSource() method
- [x] Write unit tests
  - [x] fuel-consumption.test.ts
  - [x] light-sources.test.ts
  - [x] refill.test.ts
  - [x] warnings.test.ts (covered in fuel-consumption)

**Reference**: [Core Systems - Lighting System](./systems-core.md#lighting-system)

#### FOVService
- [x] Implement FOVService class
  - [x] computeFOV() method (shadowcasting)
  - [x] isInFOV() method
  - [x] isBlocking() method
  - [x] castLight() private method (octant processing)
- [x] Write unit tests
  - [x] shadowcasting.test.ts
  - [x] blocking.test.ts
  - [x] radius.test.ts
  - [x] octants.test.ts (covered in shadowcasting)

**Reference**: [Core Systems - FOV System](./systems-core.md#fov-system)

#### RenderingService
- [x] Implement RenderingService class
  - [x] getVisibilityState() method
  - [x] shouldRenderEntity() method
  - [x] getColorForTile() method
  - [x] getColorForEntity() method
  - [x] getCSSClass() method
- [x] Write unit tests
  - [x] visibility-states.test.ts
  - [x] entity-rendering.test.ts (entity filtering)
  - [x] colors.test.ts (color selection)
  - [x] fog-of-war.test.ts (covered in visibility-states)

**Reference**: [Core Systems - Visibility & Color System](./systems-core.md#visibility-color-system)

#### MovementService
- [x] Implement MovementService class
  - [x] canMoveTo() method
  - [x] moveEntity() method
  - [x] getEntityAt() method
  - [x] isWalkable() method
  - [x] getAdjacentPositions() method
- [x] Write unit tests
  - [x] position-calculation.test.ts (movement)
  - [x] entity-detection.test.ts (collision)
  - [x] bounds-validation.test.ts (walkable)

**Reference**: [Architecture - MovementService](./architecture.md#movementservice)

#### MoveCommand
- [x] Implement MoveCommand class
  - [x] execute() method (orchestrate movement + FOV update)
- [x] Write unit tests
  - [x] movement.test.ts
  - [x] collision.test.ts
  - [x] fov-updates.test.ts
  - [x] fuel-consumption.test.ts (integrated in movement)

**Reference**: [Architecture - Command Layer](./architecture.md#command-layer-details)

#### Simple Test Level
- [x] Create manual level generation (single room) - DungeonService does full procedural generation
- [x] Place player at starting position
- [x] Place walls, floors, corridors
- [x] Implement Level.explored array tracking
- [x] Update explored tiles on FOV change

#### Rendering Implementation
- [x] Render player (`@`) on floor (`.`)
- [x] Implement three-state rendering (visible/explored/unexplored)
- [x] Add color palette CSS classes for visibility states
- [x] Render walls, floors, corridors with correct colors
- [x] Test fog of war (explored areas dimmed, unexplored hidden)

**Reference**: [Core Systems - Visibility System](./systems-core.md#visibility-color-system)

#### DebugService (Comprehensive - Complete 2025-10-04)
- [x] Implement DebugService class (686 lines, 14 methods)
  - [x] toggleGodMode() method
  - [x] revealMap() method
  - [x] spawnMonster() method
  - [x] wakeAllMonsters() method
  - [x] killAllMonsters() method
  - [x] identifyAll() method
  - [x] toggleFOVDebug() method
  - [x] togglePathDebug() method
  - [x] toggleAIDebug() method
  - [x] toggleDebugConsole() method
  - [x] getDebugState(), setDebugFlag(), isEnabled() utilities
- [x] Create debug console UI (DebugConsole.ts - 224 lines)
  - [x] Real-time stats display (seed, turn, level, position, HP, inventory, monsters)
  - [x] Debug flag status indicators
- [x] Create debug overlay renderer (DebugOverlays.ts - 155 lines)
  - [x] Canvas-based rendering for AI state, pathfinding, FOV
- [x] Implement 9 debug commands with tests (100% coverage)
  - [x] ToggleGodModeCommand
  - [x] RevealMapCommand
  - [x] ToggleDebugConsoleCommand
  - [x] SpawnMonsterCommand
  - [x] WakeAllMonstersCommand
  - [x] KillAllMonstersCommand
  - [x] ToggleFOVDebugCommand
  - [x] TogglePathDebugCommand
  - [x] ToggleAIDebugCommand
- [x] Wire up debug key bindings (9 keys: ~, g, v, m, M, K, f, p, n)
- [x] Integrate god mode into CombatService
- [x] Write comprehensive tests (7 test files, 56 tests, 100% coverage)
  - [x] god-mode.test.ts
  - [x] map-reveal.test.ts
  - [x] monster-spawning.test.ts
  - [x] monster-control.test.ts
  - [x] identify-all.test.ts
  - [x] overlay-toggles.test.ts
  - [x] debug-state.test.ts

**Note**: Implemented comprehensive debug system beyond original scope (teleportTo deferred)

**Reference**: [Advanced Systems - Debug System](./systems-advanced.md#debug-system)

---

### Deliverable

✅ **Phase 1 Complete When:**
- Can move player around a room using arrow keys
- See FOV change based on light source radius
- Observe fog of war (explored areas dimmed, unexplored hidden)
- Light fuel depletes with warnings
- All Phase 1 tests passing (>80% coverage)

---

## Phase 2: Combat & Monsters (Week 3)

**Goal**: Implement combat system with monsters and basic AI

**Status**: 🟢 Mostly Complete (11/12 complete - 92%)

### Tasks

#### Data Loading
- [x] Create /data/monsters.json
  - [x] Add all 26 monsters with stats
  - [x] Include AI profiles
  - [x] Set spawn levels
- [x] Create JSON loader utility
- [x] Load monster data at game start

**Reference**: [Architecture - Data Files](./architecture.md#data-files)
**Monster List**: [Game Design - Monsters](./game-design.md#monsters)

#### Monster Data Structure
- [x] Create Monster interface
- [x] Create MonsterAIProfile interface
- [x] Create MonsterState enum
- [x] Create MonsterFlag enum

**Reference**: [Architecture - Monster](./architecture.md#monster)

#### CombatService
- [x] Implement CombatService class
  - [x] calculateHit() method
  - [x] calculateDamage() method
  - [x] applyDamage() method
  - [x] resolveAttack() method (playerAttack/monsterAttack)
  - [x] checkDeath() method (calculateXP)
- [x] Write unit tests
  - [x] hit-calculation.test.ts
  - [x] damage.test.ts
  - [x] death.test.ts (covered in damage tests)

**Reference**: [Architecture - CombatService](./architecture.md#combatservice)
**Combat Rules**: [Game Design - Combat System](./game-design.md#combat-system)

#### AttackCommand
- [x] Implement AttackCommand class
  - [x] execute() method (orchestrate combat)
- [x] Write unit tests
  - [x] AttackCommand.test.ts (melee + death handling)

#### MonsterAIService (Basic Behaviors)
- [x] Implement MonsterAIService class
  - [x] decideAction() method
  - [x] simpleBehavior() method (greedy movement)
  - [x] smartBehavior() method (A* pathfinding)
  - [x] canSeePlayer() method
- [x] Write unit tests (9 test files!)
  - [x] behavior-simple.test.ts
  - [x] behavior-smart.test.ts (A* pathfinding)
  - [x] behavior-erratic.test.ts
  - [x] behavior-greedy.test.ts
  - [x] behavior-thief.test.ts
  - [x] behavior-coward.test.ts
  - [x] behavior-stationary.test.ts
  - [x] state-transitions.test.ts
  - [x] fov-and-awareness.test.ts

**Reference**: [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai)

#### PathfindingService
- [x] Implement PathfindingService class
  - [x] findPath() method (A* algorithm)
  - [x] getNextStep() method
  - [x] isWalkable() method
  - [x] heuristic() method (Manhattan distance)
  - [x] getNeighbors() method
- [x] Write unit tests
  - [x] astar-algorithm.test.ts
  - [x] path-optimization.test.ts (obstacle avoidance + no-path)

**Reference**: [Advanced Systems - Pathfinding](./systems-advanced.md#pathfinding)

#### Monster Spawning
- [x] Implement spawnMonsters() in DungeonService
- [x] Use spawn levels from monsters.json
- [x] Set initial sleep state
- [x] Place monsters in rooms (not corridors)

#### Monster Rendering
- [x] Render monsters (A-Z letters)
- [x] Apply monster colors by threat level
- [x] Only render monsters in FOV
- [x] Hide sleeping monsters until woken

#### MessageService
- [x] Implement MessageService class
  - [x] addMessage() method
  - [x] addMessages() method
  - [x] getRecentMessages() method
  - [x] clearLog() method
- [x] Write unit tests
  - [x] message-management.test.ts (add messages)
  - [x] message-retrieval.test.ts (recent messages)
  - [x] max-capacity.test.ts

**Reference**: [Architecture - MessageService](./architecture.md#messageservice)

#### Combat Flow
- [x] Integrate AttackCommand into input handler
- [x] Move into monster → trigger attack
- [x] Display combat messages in log
- [x] Handle player death → game over screen
- [x] Handle monster death → remove from level

---

### Deliverable

✅ **Phase 2 Complete When:**
- Can fight monsters with basic AI (SIMPLE, SMART)
- See combat messages in log
- Monsters use A* pathfinding intelligently
- All Phase 2 tests passing (>80% coverage)

---

## Phase 3: Advanced Dungeon Generation (Week 4)

**Goal**: Full procedural dungeon generation with rooms, corridors, doors

**Status**: 🟢 Complete (13/13 complete - 100%)

### Tasks

#### DungeonService Core
- [x] Implement DungeonService class
  - [x] generateLevel() method (main orchestrator)
  - [x] createEmptyLevel() method
  - [x] buildRoomGraph() method
- [x] Load config.json for dungeon parameters (config passed in constructor)

**Reference**: [Advanced Systems - Dungeon Generation](./systems-advanced.md#dungeon-generation)

#### Room Generation
- [x] Implement placeRooms() method
  - [x] Random room sizes
  - [x] Overlap prevention with buffer
  - [x] Placement attempts logic
- [x] Implement carveRoom() method
- [x] Write unit tests (covered in DungeonService integration)

#### Corridor Connection
- [x] Implement connectRooms() method
  - [x] L-shaped corridor logic
  - [x] Random horizontal/vertical first
- [x] Implement carveCorridor() method
  - [x] Winding/bending logic
- [x] Write unit tests (covered in DungeonService integration)

#### Minimum Spanning Tree
- [x] Implement minimumSpanningTree() method (Prim's algorithm)
- [x] Write unit tests (covered in DungeonService integration)

#### Loop Generation
- [x] Implement addLoops() method
- [x] Write unit tests (covered in DungeonService integration)

#### Door System
- [x] Create DoorState enum
- [x] Create Door interface
- [x] Implement placeDoors() method
  - [x] Random door type selection
  - [x] Door orientation detection
- [x] Implement door rendering (all 6 types)
- [x] Write unit tests
  - [x] OpenDoorCommand.test.ts
  - [x] CloseDoorCommand.test.ts
  - [x] SearchCommand.test.ts (secret doors)

**Reference**: [Architecture - Door](./architecture.md#door)

#### Connectivity Verification
- [x] Implement isFullyConnected() method (floodfill)
- [x] Implement ensureConnectivity() method (emergency corridors)
- [x] Write unit tests (covered in DungeonService integration)

#### Stairs Placement
- [x] Implement placeStairs() method
  - [x] Stairs up (if not level 1)
  - [x] Stairs down (if not level 10)
  - [x] Place in opposite corners of level
- [x] Render stairs (`<` and `>`)

#### Multi-Level Support
- [x] Store levels in GameState.levels Map
- [x] Generate level on first visit
- [x] Persist level state when leaving
- [x] Load level state when returning

**Reference**: [Architecture - GameState](./architecture.md#gamestate)

#### Stairs Navigation
- [x] Implement MoveStairsCommand
  - [x] Change currentLevel
  - [x] Load/generate target level
  - [x] Place player on opposite stairs
- [x] Wire up `>` and `<` keys (MoveStairsCommand.test.ts)

#### Seed Determinism
- [x] Ensure same seed = same dungeon
- [x] Write unit tests (covered in RandomService seeded.test.ts)

---

### Deliverable

✅ **Phase 3 Complete When:**
- Can explore procedurally generated multi-level dungeon
- All 6 door types present and working
- Rooms connected with winding corridors
- Loops create alternate paths
- Stairs work to navigate levels
- Full connectivity verified
- Same seed produces same dungeon
- All Phase 3 tests passing (>80% coverage)

---

## Phase 4: Complete AI Behaviors (Week 5)

**Goal**: Implement all monster AI behaviors

**Status**: 🟢 Mostly Complete (9/10 complete - 90%)

### Tasks

#### ERRATIC Behavior
- [x] Implement erraticBehavior() method
  - [x] 50% random movement
  - [x] 50% toward player
- [x] Apply to Bat, Kestrel
- [x] Write unit tests
  - [x] behavior-erratic.test.ts

#### GREEDY Behavior
- [x] Implement greedyBehavior() method
  - [x] Find nearest gold
  - [x] Choose gold vs player based on distance
- [x] Implement findNearestGold() utility
- [x] Apply to Orc
- [x] Write unit tests
  - [x] behavior-greedy.test.ts

#### THIEF Behavior
- [x] Implement thiefBehavior() method
  - [x] Approach player
  - [x] Steal gold/item on contact
  - [x] Flee after stealing
- [x] Set hasStolen flag
- [x] Apply to Leprechaun, Nymph
- [x] Write unit tests
  - [x] behavior-thief.test.ts
  - [x] MonsterTurnService/theft-mechanics.test.ts

#### STATIONARY Behavior
- [x] Implement stationaryBehavior() method
  - [x] Return wait action
- [x] Apply to Venus Flytrap
- [x] Write unit tests
  - [x] behavior-stationary.test.ts

#### COWARD Behavior
- [x] Implement flee() method
  - [x] Use A* to find path away from player
  - [x] Pick direction that maximizes distance
- [x] Add flee threshold check in decideAction()
- [x] Apply to Vampire
- [x] Write unit tests
  - [x] behavior-coward.test.ts

#### Monster FOV
- [x] Compute FOV for awake monsters
- [x] Store in Monster.visibleCells
- [x] Use for player detection
- [x] Write unit tests
  - [x] fov-and-awareness.test.ts

#### Wake-Up Logic
- [x] Check if player in monster's FOV
- [x] Check if player adjacent
- [x] Transition SLEEPING → HUNTING
- [x] MEAN flag → always start HUNTING
- [x] Write unit tests (covered in fov-and-awareness.test.ts)

#### AI State Transitions
- [x] Implement state machine logic
- [x] SLEEPING ↔ HUNTING
- [x] HUNTING ↔ FLEEING
- [x] Write unit tests
  - [x] state-transitions.test.ts

**Reference**: [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai)

---

### Bonus Implementations (Beyond Phase 4 Scope)

#### MonsterTurnService
- [x] Complete turn processing orchestration (3 test files)
  - [x] turn-processing.test.ts
  - [x] combat-execution.test.ts
  - [x] theft-mechanics.test.ts

#### SpecialAbilityService
- [x] All special monster abilities (6 test files)
  - [x] breath-weapon.test.ts (dragons)
  - [x] multiple-attacks.test.ts (multi-hit monsters)
  - [x] regeneration.test.ts (trolls)
  - [x] drain-abilities.test.ts (vampires, wraiths)
  - [x] debuff-abilities.test.ts (medusa, rust monster)
  - [x] ability-orchestration.test.ts

#### TrapService
- [x] Trap system implementation (2 test files)
  - [x] trap-detection.test.ts
  - [x] trap-effects.test.ts

---

### Deliverable

✅ **Phase 4 Complete When:**
- All 7 AI behaviors implemented and working
- Monsters exhibit varied, intelligent behaviors
- State transitions work correctly
- Wake-up logic functional
- All Phase 4 tests passing (>80% coverage)

---

## Phase 5: Items & Inventory (Week 6-7)

**Goal**: Full item system with inventory management

**Status**: 🟢 Complete (16/16 complete - 100%)

### Tasks

#### Data Loading
- [x] Create /data/items.json
  - [x] Weapons with damage dice
  - [x] Armor with AC values
  - [x] Light sources (torches, lanterns, artifacts, oil)
  - [x] Potions with effects
  - [x] Scrolls with effects
  - [x] Rings with effects
  - [x] Wands with effects
  - [x] Food
- [x] Load item data at game start (ItemDataLoader utility)

**Reference**: [Architecture - items.json](./architecture.md#itemsjson)
**Item List**: [Game Design - Items](./game-design.md#items-equipment)

#### Item Data Structures
- [x] Create Item base interface (already exists)
- [x] Create Weapon interface (already exists)
- [x] Create Armor interface (already exists)
- [x] Create Potion interface
- [x] Create Scroll interface
- [x] Create Ring interface (enhanced)
- [x] Create Wand interface
- [x] Create Food interface
- [x] Create LightSource interface (already exists)
- [x] Create OilFlask interface

#### InventoryService
- [x] Implement InventoryService class
  - [x] addItem() method
  - [x] removeItem() method
  - [x] equipWeapon() method
  - [x] equipArmor() method
  - [x] equipRing() method
  - [x] unequipRing() method
  - [x] canCarry() method (26-item limit)
  - [x] findItem(), findItemByType() methods
  - [x] getEquippedItems(), isEquipped() methods
  - [x] getInventoryCount(), getAvailableSlots() methods
- [x] Write unit tests
  - [x] inventory-management.test.ts
  - [x] equip-unequip.test.ts
  - [x] carry-capacity.test.ts

**Note**: Light sources managed by LightingService, not through inventory

**Reference**: [Architecture - InventoryService](./architecture.md#inventoryservice)

#### IdentificationService
- [x] Implement IdentificationService class
  - [x] generateItemNames() method (seeded random)
  - [x] identifyItem() method
  - [x] isIdentified() method
  - [x] getDisplayName() method
  - [x] getItemTypeKey() method
  - [x] identifyByUse() method
- [x] Write unit tests
  - [x] name-generation.test.ts
  - [x] identification.test.ts
  - [x] persistence.test.ts
- [x] Extend GameState with itemNameMap and identifiedItems

**Reference**: [Architecture - IdentificationService](./architecture.md#identificationservice)  
**Identification System**: [Game Design - Item Identification](./game-design.md#item-identification)

#### Item Spawning
- [x] Implement spawnItems() in DungeonService
- [x] Use rarity weights (common 60%, uncommon 30%, rare 10%)
- [x] Place items in rooms (3-6 per level)
- [x] Avoid monster and occupied positions
- [x] Item categories: weapons, armor, potions, scrolls, rings, food
- [x] Render items with correct symbols and colors (GameRenderer)

#### Item Commands
- [x] Implement PickUpCommand (14 tests)
- [x] Implement DropCommand (13 tests)
- [x] Implement EquipCommand for weapons/armor/rings (15 tests)
- [x] Implement UnequipCommand for rings (13 tests)
- [x] Implement UseItemCommand (q, r, z, e) (24 tests)
- [x] Wire up command keys (InputHandler - all 11 keys: , i d q r z e w W P R)

#### Inventory UI
- [x] Create inventory screen modal (ModalController)
- [x] List all items with letters (a-z)
- [x] Show equipped items
- [x] Show unidentified names
- [x] Handle item selection
- [x] Wire up `i` key

#### Item Effects
- [x] Implement healing potion effect (HEAL, EXTRA_HEAL)
- [x] Implement strength potion effects (GAIN_STRENGTH, RESTORE_STRENGTH, POISON)
- [x] Implement identify scroll effect
- [x] Implement enchant scroll effects (ENCHANT_WEAPON, ENCHANT_ARMOR)
- [x] Implement ring passive effects (ADD_STRENGTH, PROTECTION, DEXTERITY)
- [ ] Implement wand effects (deferred to Phase 7 - requires targeting system)
- [x] Write unit tests
  - [x] scroll-effects.test.ts (11 tests for identify/enchant scrolls)
  - [x] UseItemCommand.test.ts (potion effects covered)
  - [x] equipment-bonuses.test.ts (ring effects covered)

#### Lantern Refill
- [x] Implement refill mechanic (UseItemCommand with oil flask)
- [x] Check lantern is equipped
- [x] Add 500 fuel
- [x] Cap at maxFuel
- [x] Remove oil flask from inventory
- [x] Write unit tests
  - [x] lantern-refill.test.ts (9 tests)

**Reference**: [Core Systems - Lighting System](./systems-core.md#lighting-system)

#### Combat Integration
- [x] Use equipped weapon for damage calculation
- [x] Use equipped armor for AC
- [x] Apply ring effects to combat stats (ADD_STRENGTH, PROTECTION, DEXTERITY)
- [x] Write unit tests
  - [x] equipment-bonuses.test.ts (12 tests)

---

### Deliverable

✅ **Phase 5 Complete When:**
- Can pick up, carry, equip, and use all item types ✅
- Light sources (torches, lanterns, oil flasks, artifacts) work correctly ✅
- Lantern refill mechanic functional ✅
- Inventory UI functional ✅
- Item identification system working ✅
- All item effects implemented ✅ (wands deferred to Phase 7)
- All Phase 5 tests passing (>80% coverage) ✅ **798 tests passing, 96.27% coverage on UseItemCommand**

**Phase 5B Complete (2025-10-04):**
- Items now load from items.json (data-driven system)
- Identify scroll identifies unidentified items
- Enchant Weapon/Armor scrolls increase bonus (+1, max +3)
- All scroll effects work on equipped items
- Nested modal pattern for item selection
- 11 new scroll effect tests added
- Full immutability and architecture compliance maintained

---

## Phase 6: Hunger & Progression (Week 8)

**Goal**: Hunger system and character leveling

**Status**: 🟢 Complete (9/9 complete - 100%)

**Last Updated**: 2025-10-04 (Completed)

### Tasks

#### HungerService
- [x] Implement HungerService class
  - [x] tickHunger() method
  - [x] feed() method
  - [x] getHungerState() method
  - [x] applyHungerEffects() method
  - [x] calculateHungerRate() method
  - [x] applyStarvationDamage() method
  - [x] generateHungerWarning() method
- [x] Write unit tests (44 tests, all passing)
  - [x] hunger-depletion.test.ts (13 tests)
  - [x] hunger-states.test.ts (9 tests)
  - [x] hunger-effects.test.ts (16 tests)
  - [x] ring-modifiers.test.ts (7 tests)

**Reference**: [Architecture - HungerService](./architecture.md#hungerservice)
**Hunger Mechanics**: [Game Design - Hunger System](./game-design.md#hunger-system)

#### Food Consumption
- [x] Implement EatCommand
  - [x] Consume food ration
  - [x] Restore hunger units (random 1100-1499)
  - [x] Remove food from inventory
  - [x] 30% chance "tastes awful" message
- [x] Wire up `e` key (in InputHandler - complete)
- [x] Write unit tests (10 tests, all passing)
  - [x] eat-command.test.ts

#### Hunger State Messages
- [x] Add hunger warnings to message log
  - [x] "You are getting hungry" (warning)
  - [x] "You are weak from hunger!" (warning)
  - [x] "You are fainting!" (critical)
- [x] Integrated into MoveCommand (hunger ticks each turn)
- [x] Display current hunger state in UI (GameRenderer - complete with visual bar)

#### Hunger Combat Effects
- [x] Apply combat penalties when weak
  - [x] -1 to hit
  - [x] -1 to damage
- [x] Integrated into CombatService.playerAttack()
- [x] Write unit tests (6 tests, all passing)
  - [x] hunger-penalties.test.ts

#### Starvation Damage
- [x] Take 1 HP damage per turn at 0 food
- [x] Applied in MoveCommand via HungerService.applyStarvationDamage()
- [x] Write unit tests
  - [x] starvation.test.ts (covered in hunger-effects.test.ts)

#### LevelingService
- [x] Implement LevelingService class
  - [x] addExperience() method
  - [x] checkLevelUp() method
  - [x] levelUp() method
  - [x] getXPForNextLevel() method
  - [x] calculateXPReward() method
- [x] Write unit tests (complete - 47 tests passing)
  - [x] xp-calculation.test.ts
  - [x] level-up.test.ts
  - [x] xp-curve.test.ts

**Reference**: [Architecture - LevelingService](./architecture.md#levelingservice)

#### XP Rewards
- [x] Grant XP on monster death (AttackCommand integration complete)
- [x] Use monster xpValue from data (CombatService.calculateXP exists)
- [x] Integration tests (complete)

#### Level-Up Mechanics
- [x] Increase max HP (+1d8)
- [x] Full heal on level-up
- [x] XP carry-over to next level
- [x] Display level-up message (AttackCommand complete)
- [x] Update stats display (GameRenderer complete)

#### XP Progress Display
- [x] Show current XP / next level XP in UI (GameRenderer complete)
- [x] Visual progress bar (GameRenderer complete)

---

### Deliverable

✅ **Phase 6 Complete:**
- ✅ Hunger system fully functional
- ✅ Food consumption works
- ✅ Hunger states and effects working
- ✅ Starvation causes death
- ✅ Character leveling works
- ✅ XP grants on kills
- ✅ All Phase 6 tests passing (905 total, >80% coverage)
- ✅ Hunger and XP progress bars in UI
- ✅ Level-up messages and mechanics complete

---

## Phase 7: Win Condition & Polish (Week 9)

**Goal**: Complete game loop with Amulet of Yendor

**Status**: ⚪ Not Started (0/11 complete)

### Tasks

#### Amulet of Yendor
- [ ] Create Amulet item
- [ ] Spawn on Level 10
- [ ] Cannot be dropped once picked up
- [ ] Set hasAmulet flag in GameState

**Reference**: [Game Design - Items](./game-design.md#items-equipment)

#### Victory Condition
- [ ] Check if player on Level 1 with amulet
- [ ] Trigger victory screen
- [ ] Write unit tests
  - [ ] victory-condition.test.ts

#### Victory Screen
- [ ] Create victory screen UI
- [ ] Display final stats (level, gold, kills, turns)
- [ ] Show congratulations message
- [ ] Offer "New Game" option

#### Death Screen
- [ ] Create death screen UI (needs verification)
- [ ] Display final stats (level, gold, kills, turns)
- [ ] Show cause of death
- [ ] Offer "New Game" option

#### LocalStorageService
- [ ] Implement LocalStorageService class
  - [ ] saveGame() method
  - [ ] loadGame() method
  - [ ] deleteSave() method
  - [ ] hasSave() method
- [ ] Write unit tests
  - [ ] save-load.test.ts
  - [ ] persistence.test.ts

**Reference**: [Architecture - Technology Stack](./architecture.md#technology-stack)

#### SaveCommand
- [ ] Implement SaveCommand
  - [ ] Serialize GameState to JSON
  - [ ] Save to LocalStorage
  - [ ] Show "Game saved" message
- [ ] Wire up `S` key
- [ ] Write unit tests
  - [ ] save-command.test.ts

#### Auto-Save
- [ ] Auto-save on quit (Q key)
- [ ] Auto-save every 10 turns (configurable)
- [ ] Write unit tests
  - [ ] auto-save.test.ts

#### Load Game
- [ ] Check for save on game start
- [ ] Show "Continue" option on main menu
- [ ] Deserialize GameState from JSON
- [ ] Resume game
- [ ] Write unit tests
  - [ ] load-game.test.ts

#### Permadeath
- [ ] Delete save on player death
- [ ] Verify save is deleted
- [ ] Write unit tests
  - [ ] permadeath.test.ts

**Reference**: [Game Design - Permadeath](./game-design.md#character)

#### Main Menu
- [ ] Create main menu UI
  - [ ] New Game option
  - [ ] Continue option (if save exists)
  - [ ] Help option
  - [ ] Debug mode option
- [ ] Wire up menu navigation

**Reference**: [Game Design - Screens](./game-design.md#screens-modals)

#### Help Screen
- [ ] Create help screen UI
- [ ] List all controls
- [ ] Explain game rules
- [ ] Show item symbols
- [ ] Wire up `H` key from menu

#### UI Polish
- [ ] Finalize color palette
- [ ] Adjust spacing and padding
- [ ] Add light fuel indicator
- [ ] Add hunger indicator
- [ ] Improve message log styling
- [ ] Add subtle animations (pulse, flicker)

**Reference**: [Game Design - Visual Design](./game-design.md#visual-design-philosophy)

---

### Deliverable

✅ **Phase 7 Complete When:**
- Full game loop playable start to finish
- Can retrieve Amulet and win
- Player death triggers game over screen
- Save/load system working
- Permadeath implemented
- Main menu and help screen functional
- UI polished and visually appealing
- All Phase 7 tests passing (>80% coverage)

---

## Phase 8: Testing, Balance & Bug Fixes (Week 10-11)

**Goal**: Achieve >80% test coverage, balance difficulty

**Status**: ⚪ Not Started (0/10 complete)

### Tasks

#### Unit Test Coverage
- [ ] Audit test coverage report
- [ ] Write missing service tests
- [ ] Write missing command tests
- [ ] Achieve >80% line coverage
- [ ] Achieve >80% branch coverage
- [ ] Achieve >80% function coverage

**Reference**: [Testing Strategy](./testing-strategy.md)

#### Integration Tests
- [ ] Full game playthrough test (Level 1 → 10 → 1)
- [ ] Combat flow integration test
- [ ] Hunger system integration test
- [ ] Lighting system integration test
- [ ] Inventory system integration test
- [ ] Save/load integration test

#### Playtesting
- [ ] Internal playthrough (complete game)
- [ ] Document bugs and balance issues
- [ ] Test all commands and features
- [ ] Test edge cases (starvation, light running out, etc.)

#### Monster Balance
- [ ] Tune monster HP scaling per level
- [ ] Tune monster damage scaling per level
- [ ] Adjust monster spawn rates
- [ ] Verify boss monsters are challenging
- [ ] Test all special abilities

**Reference**: [Game Design - Monsters](./game-design.md#monsters)

#### Item Balance
- [ ] Adjust item drop rates
- [ ] Tune light source spawn rates
- [ ] Tune artifact rarity
- [ ] Verify oil flask availability
- [ ] Test potion/scroll effects

#### Hunger Balance
- [ ] Tune hunger depletion rate
- [ ] Adjust food spawn rate
- [ ] Test ring hunger modifiers
- [ ] Verify starvation timing

#### Light Balance
- [ ] Tune fuel consumption rate
- [ ] Adjust torch spawn rate
- [ ] Adjust lantern spawn rate
- [ ] Adjust artifact spawn rate
- [ ] Test light management difficulty

#### XP Balance
- [ ] Tune XP curve
- [ ] Adjust monster XP rewards
- [ ] Verify leveling pace
- [ ] Test endgame character power

#### Door Distribution
- [ ] Verify door type distribution
- [ ] Test secret door discovery rate
- [ ] Adjust locked door frequency

#### Bug Fixes
- [ ] Fix all critical bugs (crashes, softlocks)
- [ ] Fix high-priority bugs (gameplay issues)
- [ ] Fix medium-priority bugs (UX issues)
- [ ] Document known low-priority bugs

#### Performance Optimization
- [ ] Profile rendering performance
- [ ] Optimize FOV calculation if needed
- [ ] Optimize pathfinding if needed
- [ ] Ensure 60fps rendering
- [ ] Ensure <100ms input response

#### Documentation
- [ ] Add code comments to complex algorithms
- [ ] Update README with game instructions
- [ ] Document development setup
- [ ] Create CONTRIBUTING.md

#### Debug Tools Polish
- [ ] Test all debug commands
- [ ] Verify debug overlays work
- [ ] Add additional debug utilities if needed

**Reference**: [Advanced Systems - Debug System](./systems-advanced.md#debug-system)

---

### Deliverable

✅ **Phase 8 Complete When:**
- >80% test coverage achieved
- All integration tests passing
- Game is balanced and fun to play
- No game-breaking bugs
- Performance meets targets (60fps, <100ms input)
- Code is documented
- Ready for release

---

## UI/UX Enhancement (Completed 2025-10-04)

**Goal**: Modernize interface with context-aware features and improved usability

**Status**: 🟢 Complete (100%)

### Overview

A comprehensive 5-phase enhancement to the game's user interface and experience, implementing modern roguelike UX patterns while maintaining ASCII aesthetic.

### Implemented Features

#### Phase A: Foundation Services (Complete)
- [x] **ContextService** - Context analysis service
  - Analyzes player surroundings (items, doors, monsters, stairs)
  - Determines available actions based on context
  - Generates primary hints and warnings
  - Categorizes actions (primary/secondary)
- [x] **NotificationService** - Auto-notification system
  - Displays brief status notifications (2-second duration)
  - Handles level-up, stat changes, important events
  - Non-intrusive flash at bottom of screen

**Tests**: 100% coverage (context-analysis.test.ts, notifications.test.ts)

#### Phase B: UI Components (Complete)
- [x] **ContextualCommandBar** - Dynamic command bar
  - Shows context-aware commands based on player position
  - Displays primary hints (item here, door nearby)
  - Shows warnings (inventory full, low health, hunger)
  - Color-coded actions (green=primary, blue=secondary)
  - Full-width layout spanning browser width
- [x] **MessageHistoryModal** - Full message history viewer
  - Press `Ctrl+M` to view all messages
  - Infinite scrollback with turn numbers
  - Color-coded by message type
  - Search and filter capabilities
- [x] **HelpModal** - Quick help reference
  - Press `?` for context-sensitive help
  - Shows all keybindings organized by category
  - Movement, combat, inventory, debug sections

#### Phase C: Message System Enhancement (Complete)
- [x] **Message Grouping** - Smart message consolidation
  - Identical consecutive messages grouped with counts
  - Example: "You miss. (x3)" instead of 3 separate messages
  - Reduces spam, improves readability
  - Preserves turn numbers and message types
- [x] **Message Importance** - Priority-based display
  - Messages tagged with importance levels (1-5)
  - Critical messages prioritized in display
  - Future: basis for smart filtering

**Tests**: 100% coverage (message-grouping.test.ts, message-importance.test.ts)

#### Phase D: Integration & Keybindings (Complete)
- [x] Wire ContextService into GameRenderer
- [x] Wire NotificationService into commands
- [x] Add keybindings (Ctrl+M for history, ? for help)
- [x] Integrate contextual command bar into layout
- [x] Add auto-notifications for level-up, stat changes
- [x] Update InputHandler with new modals

#### Phase E: Layout & Polish (Complete)
- [x] **CSS Grid Enhancement** - 3-row layout
  - Changed from 2-row to 3-row grid
  - Explicit positioning for command bar (grid-row: 3)
  - Full-width spanning (grid-column: 1 / -1)
  - Responsive design for narrow screens (< 1024px)
- [x] **Separation of Concerns** - Move styles from JS to CSS
  - Removed inline layout styles from ContextualCommandBar
  - CSS handles all layout and spacing
  - Better maintainability and consistency
- [x] **Message Log Expansion** - 8 lines instead of 5
  - More context visible at once
  - Better for message grouping display
  - Improved readability

**Git Commits**:
- f39ea50 - Fix NotificationService import
- d09fc8f - Implement full-width contextual command bar layout

### Technical Highlights

**Architecture**:
- Services contain all logic (ContextService, NotificationService)
- UI components are pure renderers (ContextualCommandBar, modals)
- Commands orchestrate service calls
- Immutable state updates throughout

**Testing**:
- 10 test files, 100% coverage
- Scenario-based test organization
- Edge cases covered (max capacity, message grouping)

**UX Improvements**:
- Context-aware interface reduces cognitive load
- Message grouping reduces spam
- Auto-notifications highlight important events
- Full message history prevents lost information
- Quick help reduces learning curve

### Documentation Updated

- [x] Updated game-design.md layout diagram (8 messages, contextual bar)
- [x] Added "Enhanced UI Features" section to game-design.md
- [x] Documented all new keybindings and features
- [x] Added this UI/UX Enhancement section to plan.md
- [x] Deleted ui_design_plan.md (content incorporated)
- [x] Deleted debug_tools_plan.md (content incorporated in Phase 1)

**Reference**: [Game Design - UI/UX Design](./game-design.md#uiux-design)

---

## Notes & Decisions

### Phase 1
- Decided to implement lighting + FOV + rendering together for cohesive testing
- Three-state visibility system more complex than expected but necessary for good UX

### Future Phases
- Notes to be added as development progresses
