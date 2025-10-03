# Development Plan: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md)

---

## Overview

This plan outlines the 8-phase development roadmap for the ASCII Roguelike. Each phase builds on the previous, with clear deliverables and success criteria.

**Estimated Timeline**: 11 weeks total (assumes single developer, ~20-30 hours/week)

**Current Status**: Phase 1 in progress

---

## Phase 1: Foundation & Core Loop (Week 1-2)

**Goal**: Get basic movement, rendering, and lighting working

**Status**: 🟡 In Progress (5/16 complete)

### Tasks

#### Project Setup
- [x] Project setup (Vite + TypeScript + Jest)
- [ ] Configure Jest with path aliases
- [ ] Create tsconfig.json with strict mode
- [ ] Set up folder structure (src/, data/, tests/)
- [ ] Create barrel exports (index.ts files)

**Reference**: [Architecture - Technology Stack](./architecture.md#technology-stack)

#### Core Data Structures
- [ ] GameState interface
- [ ] Player interface
- [ ] Position type
- [ ] Level interface
- [ ] LightSource interface
- [ ] Tile interface and TileType enum

**Reference**: [Architecture - Data Structures](./architecture.md#data-structures)

#### RandomService
- [ ] Create IRandomService interface
- [ ] Implement SeededRandom class
- [ ] Implement MockRandom class for testing
- [ ] Write unit tests
  - [ ] Seeded determinism tests
  - [ ] Mock value queue tests
  - [ ] Dice roll parsing tests

**Reference**: [Architecture - RandomService](./architecture.md#randomservice)  
**Testing**: [Testing Strategy - RandomService](./testing-strategy.md)

#### Basic UI Layer
- [ ] Create index.html with layout
- [ ] Style with CSS (colors, fonts, layout)
- [ ] Implement dungeon grid renderer (DOM manipulation)
- [ ] Implement stats panel renderer
- [ ] Implement message log renderer
- [ ] Keyboard input handler
- [ ] Input → Command conversion

**Reference**: [Game Design - UI/UX Design](./game-design.md#uiux-design)

#### LightingService
- [ ] Implement LightingService class
  - [ ] tickFuel() method
  - [ ] refillLantern() method
  - [ ] getLightRadius() method
  - [ ] isFuelLow() method
  - [ ] generateFuelWarning() method
  - [ ] equipLightSource() method
- [ ] Write unit tests
  - [ ] fuel-consumption.test.ts
  - [ ] light-sources.test.ts
  - [ ] refill.test.ts
  - [ ] warnings.test.ts

**Reference**: [Core Systems - Lighting System](./systems-core.md#lighting-system)

#### FOVService
- [ ] Implement FOVService class
  - [ ] computeFOV() method (shadowcasting)
  - [ ] isInFOV() method
  - [ ] isBlocking() method
  - [ ] castLight() private method (octant processing)
- [ ] Write unit tests
  - [ ] shadowcasting.test.ts
  - [ ] blocking.test.ts
  - [ ] radius.test.ts
  - [ ] octants.test.ts

**Reference**: [Core Systems - FOV System](./systems-core.md#fov-system)

#### RenderingService
- [ ] Implement RenderingService class
  - [ ] getVisibilityState() method
  - [ ] shouldRenderEntity() method
  - [ ] getColorForTile() method
  - [ ] getColorForEntity() method
  - [ ] getCSSClass() method
- [ ] Write unit tests
  - [ ] visibility-states.test.ts
  - [ ] entity-filtering.test.ts
  - [ ] color-selection.test.ts
  - [ ] fog-of-war.test.ts

**Reference**: [Core Systems - Visibility & Color System](./systems-core.md#visibility-color-system)

#### MovementService
- [ ] Implement MovementService class
  - [ ] canMoveTo() method
  - [ ] moveEntity() method
  - [ ] getEntityAt() method
  - [ ] isWalkable() method
  - [ ] getAdjacentPositions() method
- [ ] Write unit tests
  - [ ] movement.test.ts
  - [ ] collision.test.ts
  - [ ] walkable.test.ts

**Reference**: [Architecture - MovementService](./architecture.md#movementservice)

#### MoveCommand
- [ ] Implement MoveCommand class
  - [ ] execute() method (orchestrate movement + FOV update)
- [ ] Write unit tests
  - [ ] movement.test.ts
  - [ ] collision.test.ts
  - [ ] fov-updates.test.ts
  - [ ] fuel-consumption.test.ts

**Reference**: [Architecture - Command Layer](./architecture.md#command-layer-details)

#### Simple Test Level
- [ ] Create manual level generation (single room)
- [ ] Place player at starting position
- [ ] Place walls, floors, corridors
- [ ] Implement Level.explored array tracking
- [ ] Update explored tiles on FOV change

#### Rendering Implementation
- [ ] Render player (`@`) on floor (`.`)
- [ ] Implement three-state rendering (visible/explored/unexplored)
- [ ] Add color palette CSS classes for visibility states
- [ ] Render walls, floors, corridors with correct colors
- [ ] Test fog of war (explored areas dimmed, unexplored hidden)

**Reference**: [Core Systems - Visibility System](./systems-core.md#visibility-color-system)

#### DebugService (Basic)
- [ ] Implement DebugService class
  - [ ] toggleGodMode() method
  - [ ] revealMap() method
  - [ ] teleportTo() method
  - [ ] showSeed() method
- [ ] Create debug console UI
- [ ] Wire up debug key bindings (~, g, v, t)

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

**Status**: ⚪ Not Started (0/12 complete)

### Tasks

#### Data Loading
- [ ] Create /data/monsters.json
  - [ ] Add all 26 monsters with stats
  - [ ] Include AI profiles
  - [ ] Set spawn levels
- [ ] Create JSON loader utility
- [ ] Load monster data at game start

**Reference**: [Architecture - Data Files](./architecture.md#data-files)  
**Monster List**: [Game Design - Monsters](./game-design.md#monsters)

#### Monster Data Structure
- [ ] Create Monster interface
- [ ] Create MonsterAIProfile interface
- [ ] Create MonsterState enum
- [ ] Create MonsterFlag enum

**Reference**: [Architecture - Monster](./architecture.md#monster)

#### CombatService
- [ ] Implement CombatService class
  - [ ] calculateHit() method
  - [ ] calculateDamage() method
  - [ ] applyDamage() method
  - [ ] resolveAttack() method
  - [ ] checkDeath() method
- [ ] Write unit tests
  - [ ] hit-calculation.test.ts
  - [ ] damage.test.ts
  - [ ] death.test.ts

**Reference**: [Architecture - CombatService](./architecture.md#combatservice)  
**Combat Rules**: [Game Design - Combat System](./game-design.md#combat-system)

#### AttackCommand
- [ ] Implement AttackCommand class
  - [ ] execute() method (orchestrate combat)
- [ ] Write unit tests
  - [ ] melee.test.ts
  - [ ] death-handling.test.ts

#### MonsterAIService (Basic Behaviors)
- [ ] Implement MonsterAIService class
  - [ ] decideAction() method
  - [ ] simpleBehavior() method (greedy movement)
  - [ ] smartBehavior() method (A* pathfinding)
  - [ ] canSeePlayer() method
- [ ] Write unit tests
  - [ ] simple-behavior.test.ts
  - [ ] smart-behavior.test.ts

**Reference**: [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai)

#### PathfindingService
- [ ] Implement PathfindingService class
  - [ ] findPath() method (A* algorithm)
  - [ ] getNextStep() method
  - [ ] isWalkable() method
  - [ ] heuristic() method (Manhattan distance)
  - [ ] getNeighbors() method
- [ ] Write unit tests
  - [ ] astar-algorithm.test.ts
  - [ ] obstacle-avoidance.test.ts
  - [ ] no-path.test.ts

**Reference**: [Advanced Systems - Pathfinding](./systems-advanced.md#pathfinding)

#### Monster Spawning
- [ ] Implement spawnMonsters() in DungeonService
- [ ] Use spawn levels from monsters.json
- [ ] Set initial sleep state
- [ ] Place monsters in rooms (not corridors)

#### Monster Rendering
- [ ] Render monsters (A-Z letters)
- [ ] Apply monster colors by threat level
- [ ] Only render monsters in FOV
- [ ] Hide sleeping monsters until woken

#### MessageService
- [ ] Implement MessageService class
  - [ ] addMessage() method
  - [ ] addMessages() method
  - [ ] getRecentMessages() method
  - [ ] clearLog() method
- [ ] Write unit tests
  - [ ] add-message.test.ts
  - [ ] recent-messages.test.ts

**Reference**: [Architecture - MessageService](./architecture.md#messageservice)

#### Combat Flow
- [ ] Integrate AttackCommand into input handler
- [ ] Move into monster → trigger attack
- [ ] Display combat messages in log
- [ ] Handle player death → game over screen
- [ ] Handle monster death → remove from level

#### Death Screen
- [ ] Create death screen UI
- [ ] Display final stats (level, gold, kills, turns)
- [ ] Show cause of death
- [ ] Offer "New Game" option

---

### Deliverable

✅ **Phase 2 Complete When:**
- Can fight monsters with basic AI (SIMPLE, SMART)
- See combat messages in log
- Monsters use A* pathfinding intelligently
- Player death triggers game over screen
- All Phase 2 tests passing (>80% coverage)

---

## Phase 3: Advanced Dungeon Generation (Week 4)

**Goal**: Full procedural dungeon generation with rooms, corridors, doors

**Status**: ⚪ Not Started (0/11 complete)

### Tasks

#### DungeonService Core
- [ ] Implement DungeonService class
  - [ ] generateLevel() method (main orchestrator)
  - [ ] createEmptyLevel() method
  - [ ] buildRoomGraph() method
- [ ] Load config.json for dungeon parameters

**Reference**: [Advanced Systems - Dungeon Generation](./systems-advanced.md#dungeon-generation)

#### Room Generation
- [ ] Implement placeRooms() method
  - [ ] Random room sizes
  - [ ] Overlap prevention with buffer
  - [ ] Placement attempts logic
- [ ] Implement carveRoom() method
- [ ] Write unit tests
  - [ ] room-generation.test.ts
  - [ ] overlap-prevention.test.ts

#### Corridor Connection
- [ ] Implement connectRooms() method
  - [ ] L-shaped corridor logic
  - [ ] Random horizontal/vertical first
- [ ] Implement carveCorridor() method
  - [ ] Winding/bending logic
- [ ] Write unit tests
  - [ ] corridor-connection.test.ts
  - [ ] winding.test.ts

#### Minimum Spanning Tree
- [ ] Implement minimumSpanningTree() method (Prim's algorithm)
- [ ] Write unit tests
  - [ ] mst-connectivity.test.ts
  - [ ] all-rooms-connected.test.ts

#### Loop Generation
- [ ] Implement addLoops() method
- [ ] Write unit tests
  - [ ] loop-generation.test.ts
  - [ ] alternate-paths.test.ts

#### Door System
- [ ] Create DoorState enum
- [ ] Create Door interface
- [ ] Implement placeDoors() method
  - [ ] Random door type selection
  - [ ] Door orientation detection
- [ ] Implement door rendering (all 6 types)
- [ ] Write unit tests
  - [ ] door-placement.test.ts
  - [ ] door-types.test.ts

**Reference**: [Architecture - Door](./architecture.md#door)

#### Connectivity Verification
- [ ] Implement isFullyConnected() method (floodfill)
- [ ] Implement ensureConnectivity() method (emergency corridors)
- [ ] Write unit tests
  - [ ] connectivity.test.ts
  - [ ] floodfill.test.ts

#### Stairs Placement
- [ ] Implement placeStairs() method
  - [ ] Stairs up (if not level 1)
  - [ ] Stairs down (if not level 10)
  - [ ] Place in opposite corners of level
- [ ] Render stairs (`<` and `>`)

#### Multi-Level Support
- [ ] Store levels in GameState.levels Map
- [ ] Generate level on first visit
- [ ] Persist level state when leaving
- [ ] Load level state when returning

**Reference**: [Architecture - GameState](./architecture.md#gamestate)

#### Stairs Navigation
- [ ] Implement MoveStairsCommand
  - [ ] Change currentLevel
  - [ ] Load/generate target level
  - [ ] Place player on opposite stairs
- [ ] Wire up `>` and `<` keys

#### Seed Determinism
- [ ] Ensure same seed = same dungeon
- [ ] Write unit tests
  - [ ] seed-determinism.test.ts
  - [ ] cross-level-consistency.test.ts

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

**Status**: ⚪ Not Started (0/8 complete)

### Tasks

#### ERRATIC Behavior
- [ ] Implement erraticBehavior() method
  - [ ] 50% random movement
  - [ ] 50% toward player
- [ ] Apply to Bat, Kestrel
- [ ] Write unit tests
  - [ ] erratic-behavior.test.ts

#### GREEDY Behavior
- [ ] Implement greedyBehavior() method
  - [ ] Find nearest gold
  - [ ] Choose gold vs player based on distance
- [ ] Implement findNearestGold() utility
- [ ] Apply to Orc
- [ ] Write unit tests
  - [ ] greedy-behavior.test.ts

#### THIEF Behavior
- [ ] Implement thiefBehavior() method
  - [ ] Approach player
  - [ ] Steal gold/item on contact
  - [ ] Flee after stealing
- [ ] Set hasStolen flag
- [ ] Apply to Leprechaun, Nymph
- [ ] Write unit tests
  - [ ] thief-behavior.test.ts

#### STATIONARY Behavior
- [ ] Implement stationaryBehavior() method
  - [ ] Return wait action
- [ ] Apply to Venus Flytrap
- [ ] Write unit tests
  - [ ] stationary-behavior.test.ts

#### COWARD Behavior
- [ ] Implement flee() method
  - [ ] Use A* to find path away from player
  - [ ] Pick direction that maximizes distance
- [ ] Add flee threshold check in decideAction()
- [ ] Apply to Vampire
- [ ] Write unit tests
  - [ ] coward-behavior.test.ts

#### Monster FOV
- [ ] Compute FOV for awake monsters
- [ ] Store in Monster.visibleCells
- [ ] Use for player detection
- [ ] Write unit tests
  - [ ] monster-fov.test.ts

#### Wake-Up Logic
- [ ] Check if player in monster's FOV
- [ ] Check if player adjacent
- [ ] Transition SLEEPING → HUNTING
- [ ] MEAN flag → always start HUNTING
- [ ] Write unit tests
  - [ ] wake-conditions.test.ts

#### AI State Transitions
- [ ] Implement state machine logic
- [ ] SLEEPING ↔ HUNTING
- [ ] HUNTING ↔ FLEEING
- [ ] Write unit tests
  - [ ] state-transitions.test.ts

**Reference**: [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai)

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

**Status**: ⚪ Not Started (0/15 complete)

### Tasks

#### Data Loading
- [ ] Create /data/items.json
  - [ ] Weapons with damage dice
  - [ ] Armor with AC values
  - [ ] Light sources (torches, lanterns, artifacts, oil)
  - [ ] Potions with effects
  - [ ] Scrolls with effects
  - [ ] Rings with effects
  - [ ] Wands with effects
  - [ ] Food
- [ ] Load item data at game start

**Reference**: [Architecture - items.json](./architecture.md#itemsjson)  
**Item List**: [Game Design - Items](./game-design.md#items-equipment)

#### Item Data Structures
- [ ] Create Item base interface
- [ ] Create Weapon interface
- [ ] Create Armor interface
- [ ] Create Potion interface
- [ ] Create Scroll interface
- [ ] Create Ring interface
- [ ] Create Wand interface
- [ ] Create Food interface
- [ ] Create LightSource interface
- [ ] Create OilFlask interface

#### InventoryService
- [ ] Implement InventoryService class
  - [ ] addItem() method
  - [ ] removeItem() method
  - [ ] equipWeapon() method
  - [ ] equipArmor() method
  - [ ] equipRing() method
  - [ ] unequipRing() method
  - [ ] equipLightSource() method
  - [ ] canCarry() method
  - [ ] useConsumable() method
- [ ] Write unit tests
  - [ ] inventory-management.test.ts
  - [ ] equip-unequip.test.ts
  - [ ] carry-capacity.test.ts

**Reference**: [Architecture - InventoryService](./architecture.md#inventoryservice)

#### IdentificationService
- [ ] Implement IdentificationService class
  - [ ] generateItemNames() method (seeded random)
  - [ ] identifyItem() method
  - [ ] isIdentified() method
  - [ ] getDisplayName() method
- [ ] Write unit tests
  - [ ] name-generation.test.ts
  - [ ] identification.test.ts
  - [ ] persistence.test.ts

**Reference**: [Architecture - IdentificationService](./architecture.md#identificationservice)  
**Identification System**: [Game Design - Item Identification](./game-design.md#item-identification)

#### Item Spawning
- [ ] Implement spawnItems() in DungeonService
- [ ] Use rarity weights
- [ ] Include light sources in spawn tables
- [ ] Place items in rooms
- [ ] Render items with correct symbols and colors

#### Item Commands
- [ ] Implement PickUpCommand
- [ ] Implement DropCommand
- [ ] Implement EquipCommand (w, W, P)
- [ ] Implement UnequipCommand (T, R)
- [ ] Implement UseItemCommand (q, r, z, e)
- [ ] Wire up command keys

#### Inventory UI
- [ ] Create inventory screen modal
- [ ] List all items with letters (a-z)
- [ ] Show equipped items
- [ ] Show unidentified names
- [ ] Handle item selection
- [ ] Wire up `i` key

#### Item Effects
- [ ] Implement healing potion effect
- [ ] Implement strength potion effects
- [ ] Implement identify scroll effect
- [ ] Implement enchant scroll effects
- [ ] Implement ring passive effects
- [ ] Implement wand effects
- [ ] Write unit tests
  - [ ] item-effects.test.ts
  - [ ] healing.test.ts
  - [ ] enchanting.test.ts

#### Lantern Refill
- [ ] Implement refill mechanic (UseItemCommand with oil flask)
- [ ] Check lantern is equipped
- [ ] Add 500 fuel
- [ ] Cap at maxFuel
- [ ] Remove oil flask from inventory
- [ ] Write unit tests
  - [ ] refill.test.ts

**Reference**: [Core Systems - Lighting System](./systems-core.md#lighting-system)

#### Combat Integration
- [ ] Use equipped weapon for damage calculation
- [ ] Use equipped armor for AC
- [ ] Apply ring effects to combat stats
- [ ] Write unit tests
  - [ ] weapon-damage.test.ts
  - [ ] armor-protection.test.ts

---

### Deliverable

✅ **Phase 5 Complete When:**
- Can pick up, carry, equip, and use all item types
- Light sources (torches, lanterns, oil flasks, artifacts) work correctly
- Lantern refill mechanic functional
- Inventory UI functional
- Item identification system working
- All item effects implemented
- All Phase 5 tests passing (>80% coverage)

---

## Phase 6: Hunger & Progression (Week 8)

**Goal**: Hunger system and character leveling

**Status**: ⚪ Not Started (0/9 complete)

### Tasks

#### HungerService
- [ ] Implement HungerService class
  - [ ] tickHunger() method
  - [ ] feed() method
  - [ ] getHungerState() method
  - [ ] applyHungerEffects() method
  - [ ] calculateHungerRate() method
- [ ] Write unit tests
  - [ ] hunger-depletion.test.ts
  - [ ] hunger-states.test.ts
  - [ ] hunger-effects.test.ts
  - [ ] ring-modifiers.test.ts

**Reference**: [Architecture - HungerService](./architecture.md#hungerservice)  
**Hunger Mechanics**: [Game Design - Hunger System](./game-design.md#hunger-system)

#### Food Consumption
- [ ] Implement EatCommand
  - [ ] Consume food ration
  - [ ] Restore hunger units (random 1100-1499)
  - [ ] Remove food from inventory
  - [ ] 30% chance "tastes awful" message
- [ ] Wire up `e` key
- [ ] Write unit tests
  - [ ] eat-command.test.ts

#### Hunger State Messages
- [ ] Add hunger warnings to message log
  - [ ] "You are getting hungry" (yellow)
  - [ ] "You are weak from hunger!" (red)
  - [ ] "You are fainting!" (flashing red)
- [ ] Display current hunger state in UI

#### Hunger Combat Effects
- [ ] Apply combat penalties when weak
  - [ ] -1 to hit
  - [ ] -1 to damage
- [ ] Write unit tests
  - [ ] hunger-penalties.test.ts

#### Starvation Damage
- [ ] Take 1 HP damage per turn at 0 food
- [ ] Check for death from starvation
- [ ] Write unit tests
  - [ ] starvation.test.ts

#### LevelingService
- [ ] Implement LevelingService class
  - [ ] addExperience() method
  - [ ] checkLevelUp() method
  - [ ] levelUp() method
  - [ ] getXPForLevel() method
  - [ ] calculateXPReward() method
- [ ] Write unit tests
  - [ ] xp-calculation.test.ts
  - [ ] level-up.test.ts
  - [ ] xp-curve.test.ts

**Reference**: [Architecture - LevelingService](./architecture.md#levelingservice)

#### XP Rewards
- [ ] Grant XP on monster death
- [ ] Use monster xpValue from data
- [ ] Write unit tests
  - [ ] xp-rewards.test.ts

#### Level-Up Mechanics
- [ ] Increase max HP
- [ ] Display level-up message
- [ ] Update stats display
- [ ] Write unit tests
  - [ ] stat-increases.test.ts

#### XP Progress Display
- [ ] Show current XP / next level XP in UI
- [ ] Visual progress bar (optional)

---

### Deliverable

✅ **Phase 6 Complete When:**
- Hunger system fully functional
- Food consumption works
- Hunger states and effects working
- Starvation causes death
- Character leveling works
- XP grants on kills
- All Phase 6 tests passing (>80% coverage)

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

## Notes & Decisions

### Phase 1
- Decided to implement lighting + FOV + rendering together for cohesive testing
- Three-state visibility system more complex than expected but necessary for good UX

### Future Phases
- Notes to be added as development progresses
