# Game Design Documentation Refactor Plan

**Version**: 1.0
**Created**: 2025-10-05
**Status**: Planning
**Related Docs**: [Game Design](./game-design.md) | [CLAUDE.md](../CLAUDE.md) | [Architecture](./architecture.md)

---

## 1. Objectives

### Primary Goal
Refactor the monolithic `docs/game-design.md` (697 lines) into focused, modular documents following SOLID principles to improve maintainability, discoverability, and clarity.

### Design Philosophy: SOLID Principles for Documentation

**Single Responsibility Principle (SRP)**
- Each document covers ONE game design topic
- ✅ Good: `character.md` covers only character stats and progression
- ❌ Bad: `game-design.md` covering 14 different topics (GOD document)

**Open/Closed Principle (OCP)**
- Documents open for extension (add new sections), closed for modification (don't edit other docs)
- New mechanics added to appropriate focused doc, not scattered across monolith

**Dependency Inversion Principle (DIP)**
- Documents reference abstractions (README.md index), not concrete file paths everywhere
- Cross-references through central index

**Interface Segregation Principle (ISP)**
- Readers shouldn't wade through irrelevant sections
- Each doc contains only what's needed for that topic

### Success Criteria
- ✅ No document exceeds 150 lines (maintainability)
- ✅ Each document has single, clear purpose (SRP)
- ✅ All latest mechanics documented (regeneration, lighting, etc.)
- ✅ Rogue/Angband/NetHack influences clearly attributed
- ✅ Game design logic separated from implementation code
- ✅ All cross-references updated across project docs
- ✅ README.md index provides navigation

---

## 2. Current State Analysis

### Problems with Monolithic game-design.md

**Violates Single Responsibility Principle**
- 697 lines covering 14 different topics
- Character, monsters, items, combat, hunger, UI, controls, saves, etc.
- Difficult to find specific information
- Changes to one topic require editing massive file

**Maintenance Issues**
- Latest mechanics (regeneration) buried in 700-line file
- Lighting details scattered across multiple sections
- No clear place to add new mechanics
- Cross-references break easily

**Discovery Issues**
- Can't quickly find "how does hunger work?"
- Must scroll through unrelated content
- No focused entry point per topic

**Update Friction**
- Adding regeneration mechanics: where does it go?
- Updating light sources: affects 3+ sections
- Risk of inconsistency across sections

### Current Document Structure (14 Sections)
1. Product Overview (lines 9-20)
2. Game Objective (lines 23-32)
3. Core Features - Character (lines 36-62)
4. Core Features - Dungeon & ASCII (lines 65-101)
5. Core Features - Monsters (lines 104-154)
6. Core Features - Items & Equipment (lines 157-224)
7. Item Identification System (lines 227-248)
8. Hunger System (lines 251-279)
9. Combat System (lines 282-337)
10. Controls (lines 340-385)
11. UI/UX Design (lines 388-519)
12. Screens & Modals (lines 520-540)
13. Save System & Persistence (lines 543-573)
14. Success Metrics (lines 576-613)
15. Future Enhancements (lines 617-652)
16. Appendix (lines 655-697)

**Total**: 697 lines (GOD document anti-pattern)

---

## 3. Proposed Structure: docs/game-design/

### Overview of New Structure

```
docs/game-design/
├── README.md                    # Index of all game design docs
├── 01-overview.md               # Product overview, objectives, win condition
├── 02-character.md              # Stats, progression, regeneration, permadeath
├── 03-dungeon.md                # Structure, ASCII symbols, level mechanics
├── 04-monsters.md               # 26 monsters A-Z, AI, abilities, influences
├── 05-items.md                  # All item types, equipment system
├── 06-light-sources.md          # Lighting mechanics (detailed)
├── 07-identification.md         # Unidentified items, discovery
├── 08-hunger.md                 # Hunger mechanics, states, strategy
├── 09-combat.md                 # Combat formulas, damage, death
├── 10-controls.md               # Movement, commands, keybindings
├── 11-ui-design.md              # Visual design, colors, layout
├── 12-save-system.md            # Persistence, permadeath implementation
├── 13-progression.md            # Success metrics, goals
├── 14-future.md                 # Post-v1 features, expansions
└── 15-references.md             # Glossary, Rogue/Angband sources
```

**Rationale**: Numbered prefixes provide reading order, each doc 50-150 lines

---

## 4. Document Specifications

### 01-overview.md (50-80 lines)
**Purpose**: High-level product vision and objectives

**Contents**:
- Product name, genre, platform
- Target audience
- Core concept (faithful Rogue recreation)
- Win condition (Amulet of Yendor retrieval)
- Key differentiators (light management, permadeath)
- Quick feature list

**Influences Referenced**:
- Original Rogue (1980) - core gameplay loop
- Modern web tech stack

**Cross-references**: Character, dungeon, items

---

### 02-character.md (80-120 lines)
**Purpose**: Player character stats, progression, and health mechanics

**Contents**:
- Core stats (HP, Strength, AC, Level, XP, Gold)
- Progression system (leveling, equipment)
- **Health Regeneration** (NEW - from regeneration_plan.md)
  - Natural regeneration: 1 HP per 10 turns
  - Hunger gate: requires hunger > 100
  - Combat blocking: no regen with enemy in FOV
  - Ring of Regeneration: doubles rate (5 turns), +30% hunger
  - Rest command mechanics
- Healing sources (potions, regeneration, rest)
- Max HP increase (overheal mechanic)
- Permadeath rules

**Influences Referenced**:
- **Original Rogue**: Healing potion overheal grants +1 max HP
- **NetHack**: Regeneration formulas, hunger costs
- **Angband**: Regeneration ring mechanics

**Cross-references**: Hunger, combat, items

---

### 03-dungeon.md (60-90 lines)
**Purpose**: Dungeon structure and level mechanics

**Contents**:
- 10 levels of increasing difficulty
- Procedural generation (reference advanced systems)
- Level persistence
- Stairs (up/down)
- ASCII symbol table (walls, floors, corridors, doors, stairs, traps)
- Door types (6 types: open, closed, locked, secret, broken, archway)

**Influences Referenced**:
- **Original Rogue**: Room + corridor generation
- Procedural generation patterns

**Cross-references**: Monsters (scaling), light sources (visibility)

---

### 04-monsters.md (120-150 lines)
**Purpose**: Complete monster compendium with AI behaviors

**Contents**:
- All 26 monsters A-Z (table with stats)
- AI behavior types (7 types: SMART, SIMPLE, GREEDY, ERRATIC, THIEF, STATIONARY, COWARD)
- Special abilities (regeneration, rust, steal, drain, etc.)
- **Monster Regeneration** (Trolls, Griffins, Vampires: 1 HP/turn)
- Sleep/awake states
- "Mean" monsters (always awake)
- Scaling by dungeon level

**Influences Referenced**:
- **Original Rogue**: All 26 monster letters, special abilities
- **NetHack**: Advanced AI behaviors
- Monster HP formulas (XdY notation)

**Cross-references**: Combat (damage formulas), dungeon (spawning)

---

### 05-items.md (100-130 lines)
**Purpose**: All item categories and equipment system

**Contents**:
- Item categories overview
- Food (rations, hunger restoration)
- Weapons (types, damage dice, enchantment)
- Armor (types, AC values, enchantment, rust vulnerability)
- Potions (types, identification)
- Scrolls (types, identification)
- Rings (types, effects, hunger modifiers)
  - **Ring of Regeneration**: 5-turn regen, +30% hunger
- Wands/Staffs (charges, effects)
- Gold (scoring, theft)
- Amulet of Yendor (win condition)

**Influences Referenced**:
- **Original Rogue**: Item categories, enchantment system
- **NetHack**: Ring mechanics, hunger modifiers

**Cross-references**: Light sources (separate doc), identification, hunger

---

### 06-light-sources.md (80-120 lines)
**Purpose**: Detailed lighting mechanics (critical system)

**Contents**:
- Light source types (torches, lanterns, artifacts)
- **Torch mechanics**:
  - Radius 2, 500 turns fuel
  - Fuel consumption (1/turn)
  - Warning system (50/10/0 turn thresholds)
- **Lantern mechanics**:
  - Radius 2, refillable
  - Oil flasks (500 turns each)
  - Cannot overfill
- **Artifact lights**:
  - Phial of Galadriel, Star of Elendil, Arkenstone
  - Radius 2-3, permanent (no fuel)
- Starting equipment options
- Light progression (early/mid/late game)
- Darkness effects (vision radius 0, combat penalties)
- FOV = Light Radius relationship

**Influences Referenced**:
- **Angband**: Light radius system, artifact lights, fuel consumption
- **Original Rogue**: Torch mechanics (simplified)

**Cross-references**: Character (starting equipment), items, dungeon (visibility)

---

### 07-identification.md (50-70 lines)
**Purpose**: Unidentified item discovery system

**Contents**:
- Unidentified items (potions, scrolls, rings, wands)
- Random descriptive names per playthrough
- Descriptive name examples (blue potion, scroll labeled XYZZY, ruby ring)
- Identification methods:
  1. Use the item (risky)
  2. Scroll of Identify
  3. Trial and error across games
- Persistence (once identified, all similar items revealed)

**Influences Referenced**:
- **Original Rogue**: Mystery and discovery, randomized names
- **NetHack**: Enhanced identification system

**Cross-references**: Items (potions, scrolls, rings, wands)

---

### 08-hunger.md (60-80 lines)
**Purpose**: Hunger mechanics and food management

**Contents**:
- Hunger units (start: 1300, max: 2000)
- Food ration restoration (1100-1499 units)
- Hunger depletion rates:
  - Base: 1 unit/turn
  - Ring modifiers (Ring of Regeneration: +30%)
  - Ring of Slow Digestion (reduces rate)
- Hunger states table (Normal, Hungry, Weak, Starving)
- Effects by state (combat penalties, HP damage)
- Strategy tips (rationing, ring management)

**Influences Referenced**:
- **Original Rogue**: Hunger system basics
- **NetHack**: Ring hunger modifiers
- **Angband**: Regeneration food costs

**Cross-references**: Character (regeneration), items (rings, food)

---

### 09-combat.md (70-90 lines)
**Purpose**: Combat formulas and damage calculations

**Contents**:
- Turn-based combat flow
- Hit calculation formula (1d20 + modifiers vs AC)
- To-hit modifiers:
  - Strength bonuses
  - Sleeping/held targets (+4)
  - Enchanted weapons
- Damage calculation (weapon dice + strength modifier)
- Strength damage bonus table
- Armor Class (AC) system (lower = better)
- Combat messages
- Death mechanics (permadeath)

**Influences Referenced**:
- **Original Rogue**: Combat formulas, AC system, strength tables
- Classic D&D mechanics (1d20 roll)

**Cross-references**: Character (stats), items (weapons, armor), monsters

---

### 10-controls.md (60-80 lines)
**Purpose**: Input controls and command reference

**Contents**:
- Movement (arrow keys, diagonal)
- Command key table:
  - Inventory (i)
  - Item use (q, r, w, W, T, P, R, z, e, d)
  - Movement (>, <, s, o, c, .)
  - Rest (5, .) - NEW
  - System (S, Q, ~)
- Command mode flow (key → menu → select → ESC cancel)
- Mac keyboard compatibility notes

**Influences Referenced**:
- **Original Rogue**: Command key scheme (q, r, w, etc.)
- Vi-style movement (optional)

**Cross-references**: Character (rest command), UI design

---

### 11-ui-design.md (100-130 lines)
**Purpose**: Visual design, colors, and layout

**Contents**:
- Design philosophy (readable, authentic, enhanced, accessible)
- Typography (monospace fonts, sizing)
- Color palette:
  - Three visibility states (visible, explored, unexplored)
  - Terrain colors (walls, floors, corridors, doors, stairs)
  - Entity colors (player, monsters, items)
  - Message colors (damage, healing, warnings)
- Effects (subtle glow, fade, pulse, flicker)
- Layout diagram (title bar, message log, dungeon view, stats panel, command bar)
- Enhanced UI features:
  - Message grouping
  - Message history modal
  - Contextual command bar
  - Auto-notifications
  - Quick help modal

**Influences Referenced**:
- Classic ASCII terminal aesthetics
- Modern web accessibility standards

**Cross-references**: Light sources (visibility), dungeon (symbols)

---

### 12-save-system.md (50-70 lines)
**Purpose**: Save/load and permadeath mechanics

**Contents**:
- LocalStorage strategy
- Save data format (JSON GameState)
- Save triggers:
  - Manual save (S key)
  - Auto-save on quit (Q key)
  - Auto-save every 10 turns
- Load process (continue option)
- Permadeath implementation:
  - Delete save on death
  - No save scumming (overwrite each turn)
  - Death screen display

**Influences Referenced**:
- **Original Rogue**: Permadeath, save deletion
- Web LocalStorage patterns

**Cross-references**: Character (permadeath), controls (save keys)

---

### 13-progression.md (60-80 lines)
**Purpose**: Success metrics and completion criteria

**Contents**:
- Functionality metrics (core loop, monsters, items, systems)
- Quality metrics (test coverage, performance, stability)
- UX metrics (controls, readability, messages, UI, lighting tension)
- Checkboxes for tracking completion

**Influences Referenced**:
- Software quality standards
- Roguelike genre conventions

**Cross-references**: All game design docs

---

### 14-future.md (60-90 lines)
**Purpose**: Post-v1 enhancements and expansions

**Contents**:
- Additional features:
  - Character classes (Thief, Mage, Ranger)
  - More items and light sources
  - Special rooms
  - Quests
  - Monster AI improvements
  - Traps variety
  - Sound/music
- Technical improvements:
  - Mobile support
  - Multiplayer
  - Cloud saves
  - Replay system
  - Modding support
  - Accessibility
- Content expansions:
  - More levels
  - Boss fights
  - Alternate dungeons
  - Prestige mode
  - Achievements
  - Daily challenges

**Influences Referenced**:
- Modern roguelike innovations
- Community feature requests

**Cross-references**: Current features (as baseline)

---

### 15-references.md (50-70 lines)
**Purpose**: Glossary, external references, and credits

**Contents**:
- Glossary (roguelike terms, acronyms)
- References:
  - **Original Rogue** manual, source code
  - **NetHack** wiki, mechanics guides
  - **Angband** documentation, lighting system
  - RogueBasin articles
  - Algorithm references (FOV, pathfinding, dungeon gen)
- Contact information (developer, repository, issues)

**Influences Referenced**:
- All classic roguelike sources
- Academic algorithm papers

**Cross-references**: All docs (as reference material)

---

### README.md (80-120 lines)
**Purpose**: Central index and navigation hub

**Contents**:
- Overview paragraph (what this folder contains)
- Table of contents with descriptions:
  - Each doc listed with 1-2 sentence summary
  - Links to all 15 documents
- Reading order recommendations:
  - New players: Start with overview → character → controls
  - Developers: Start with overview → architecture docs
  - Game designers: Read all in order
- Cross-reference map (which docs relate to each other)
- Version and last updated date

**Example Structure**:
```markdown
# Game Design Documentation

This folder contains focused game design documents following SOLID principles.
Each document covers a single topic with game rules, mechanics, and influences
from classic roguelikes (Rogue 1980, NetHack, Angband).

## Table of Contents

### Core Game Design
1. **[Overview](./01-overview.md)** - Product vision, objectives, win condition
2. **[Character](./02-character.md)** - Stats, progression, regeneration
3. **[Dungeon](./03-dungeon.md)** - Level structure, ASCII symbols
...

### Systems & Mechanics
6. **[Light Sources](./06-light-sources.md)** - Lighting mechanics (torches, lanterns, artifacts)
7. **[Identification](./07-identification.md)** - Unidentified items, discovery
...

## Reading Order

**New to the game?** Start here:
- Overview → Character → Controls → Light Sources

**Developer?** Check these:
- Overview → [Architecture](../architecture.md) → [Core Systems](../systems-core.md)

**Game designer?** Read all docs in numbered order.
```

---

## 5. Implementation Phases

### Phase 1: Create Structure & Index
**Goal**: Set up folder and create navigation hub

**Tasks**:
- [ ] **Task 1.1**: Create folder structure
  - [ ] Create `docs/game-design/` folder
  - [ ] Verify folder created successfully
  - **Commit**: `docs: create game-design folder for SOLID documentation refactor`

- [ ] **Task 1.2**: Create README.md index
  - [ ] Write overview paragraph
  - [ ] Create table of contents with all 15 docs
  - [ ] Add reading order recommendations
  - [ ] Add cross-reference map
  - [ ] Add version and date
  - **Commit**: `docs: create game-design README.md index`

**Completion Criteria**: Folder exists, README.md provides clear navigation

---

### Phase 2: Extract Core Game Design (Docs 1-5)

#### Task 2.1: Create 01-overview.md
- [ ] Extract product overview section (lines 9-20)
- [ ] Extract game objective section (lines 23-32)
- [ ] Add quick feature list
- [ ] Add cross-references to other docs
- [ ] Verify 50-80 lines
- **Commit**: `docs: create game-design/01-overview.md`

#### Task 2.2: Create 02-character.md
- [ ] Extract core stats (lines 42-56)
- [ ] Extract progression (lines 52-55)
- [ ] **ADD health regeneration mechanics** (from regeneration_plan.md):
  - Natural regeneration (10 turns, hunger gate, combat block)
  - Ring of Regeneration (5 turns, +30% hunger)
  - Rest command mechanics
  - Healing sources (potions, regen, rest)
  - Max HP increase (overheal)
- [ ] Extract permadeath rules (lines 58-62)
- [ ] Add Rogue/NetHack/Angband influences
- [ ] Verify 80-120 lines
- **Commit**: `docs: create game-design/02-character.md with regeneration`

#### Task 2.3: Create 03-dungeon.md
- [ ] Extract dungeon structure (lines 68-71)
- [ ] Extract ASCII character table (lines 73-98)
- [ ] Add level persistence notes
- [ ] Add door types (6 types)
- [ ] Add Rogue influence notes
- [ ] Verify 60-90 lines
- **Commit**: `docs: create game-design/03-dungeon.md`

#### Task 2.4: Create 04-monsters.md
- [ ] Extract monster table (lines 108-135)
- [ ] Extract AI behaviors (lines 137-152)
- [ ] Add monster regeneration (Trolls, Griffins, Vampires)
- [ ] Add sleep/awake states
- [ ] Add scaling notes
- [ ] Add Rogue/NetHack influences
- [ ] Verify 120-150 lines
- **Commit**: `docs: create game-design/04-monsters.md`

#### Task 2.5: Create 05-items.md
- [ ] Extract item categories (lines 159-224)
- [ ] Extract weapons (lines 166-170)
- [ ] Extract armor (lines 172-178)
- [ ] Extract potions, scrolls, rings, wands (lines 187-212)
- [ ] **Update Ring of Regeneration**: 5-turn regen, +30% hunger
- [ ] Extract gold and amulet (lines 214-223)
- [ ] Add Rogue/NetHack influences
- [ ] Verify 100-130 lines
- **Commit**: `docs: create game-design/05-items.md`

**Completion Criteria**: Core game design docs complete, all cross-referenced

---

### Phase 3: Extract Systems (Docs 6-9)

#### Task 3.1: Create 06-light-sources.md
- [ ] Extract light source types from items section (lines 180-185)
- [ ] **ADD detailed mechanics from systems-core.md**:
  - Torch mechanics (radius 2, 500 turns, warnings)
  - Lantern mechanics (radius 2, refillable, oil flasks)
  - Artifact lights (Phial, Star, Arkenstone, radius 2-3, permanent)
  - Starting equipment options
  - Light progression (early/mid/late game)
  - Darkness effects
  - FOV = Light Radius relationship
- [ ] Add Angband influence (light radius system)
- [ ] Verify 80-120 lines
- **Commit**: `docs: create game-design/06-light-sources.md with Angband mechanics`

#### Task 3.2: Create 07-identification.md
- [ ] Extract identification system (lines 229-248)
- [ ] Add descriptive name examples
- [ ] Add identification methods
- [ ] Add persistence rules
- [ ] Add Rogue influence
- [ ] Verify 50-70 lines
- **Commit**: `docs: create game-design/07-identification.md`

#### Task 3.3: Create 08-hunger.md
- [ ] Extract hunger system (lines 253-279)
- [ ] Extract hunger units and depletion
- [ ] Extract hunger states table
- [ ] **ADD ring modifiers** (Regeneration: +30%, Slow Digestion: reduce)
- [ ] Add strategy tips
- [ ] Add Rogue/NetHack/Angband influences
- [ ] Verify 60-80 lines
- **Commit**: `docs: create game-design/08-hunger.md`

#### Task 3.4: Create 09-combat.md
- [ ] Extract combat system (lines 284-337)
- [ ] Extract hit calculation
- [ ] Extract damage calculation
- [ ] Extract strength tables
- [ ] Extract AC system
- [ ] Add Rogue influence (formulas, D&D mechanics)
- [ ] Verify 70-90 lines
- **Commit**: `docs: create game-design/09-combat.md`

**Completion Criteria**: Systems docs complete, latest mechanics included

---

### Phase 4: Extract UI & Meta (Docs 10-15)

#### Task 4.1: Create 10-controls.md
- [ ] Extract controls section (lines 342-385)
- [ ] Extract movement keys
- [ ] Extract command key table
- [ ] **ADD rest command** (5, .) with description
- [ ] Add command mode flow
- [ ] Add Rogue influence (command scheme)
- [ ] Verify 60-80 lines
- **Commit**: `docs: create game-design/10-controls.md`

#### Task 4.2: Create 11-ui-design.md
- [ ] Extract UI/UX design (lines 390-519)
- [ ] Extract design philosophy
- [ ] Extract color palette
- [ ] Extract layout diagram
- [ ] Extract enhanced UI features
- [ ] Verify 100-130 lines
- **Commit**: `docs: create game-design/11-ui-design.md`

#### Task 4.3: Create 12-save-system.md
- [ ] Extract save system (lines 545-573)
- [ ] Extract LocalStorage strategy
- [ ] Extract save triggers
- [ ] Extract permadeath implementation
- [ ] Add Rogue influence
- [ ] Verify 50-70 lines
- **Commit**: `docs: create game-design/12-save-system.md`

#### Task 4.4: Create 13-progression.md
- [ ] Extract success metrics (lines 578-613)
- [ ] Extract functionality metrics
- [ ] Extract quality metrics
- [ ] Extract UX metrics
- [ ] Verify 60-80 lines
- **Commit**: `docs: create game-design/13-progression.md`

#### Task 4.5: Create 14-future.md
- [ ] Extract future enhancements (lines 619-652)
- [ ] Extract additional features
- [ ] Extract technical improvements
- [ ] Extract content expansions
- [ ] Verify 60-90 lines
- **Commit**: `docs: create game-design/14-future.md`

#### Task 4.6: Create 15-references.md
- [ ] Extract appendix (lines 657-697)
- [ ] Extract glossary
- [ ] Extract references (Rogue, NetHack, Angband, RogueBasin)
- [ ] Add contact information
- [ ] Verify 50-70 lines
- **Commit**: `docs: create game-design/15-references.md`

**Completion Criteria**: All 15 focused docs created, each <150 lines

---

### Phase 5: Update Cross-References

**Goal**: Update all project docs that reference game-design.md

**Tasks**:
- [ ] **Task 5.1**: Update CLAUDE.md
  - [ ] Change `[Game Design](./game-design.md)` to `[Game Design](./game-design/README.md)`
  - [ ] Update "Read relevant specs" section
  - [ ] Verify all links work
  - **Commit**: `docs: update CLAUDE.md cross-references`

- [ ] **Task 5.2**: Update architecture.md
  - [ ] Find all references to game-design.md
  - [ ] Update to point to specific focused docs (e.g., character.md, combat.md)
  - [ ] Verify links work
  - **Commit**: `docs: update architecture.md cross-references`

- [ ] **Task 5.3**: Update systems-core.md
  - [ ] Update references to game-design.md
  - [ ] Point to specific docs (light-sources.md, character.md, etc.)
  - [ ] Verify links work
  - **Commit**: `docs: update systems-core.md cross-references`

- [ ] **Task 5.4**: Update systems-advanced.md
  - [ ] Update references to game-design.md
  - [ ] Point to monsters.md, dungeon.md, etc.
  - [ ] Verify links work
  - **Commit**: `docs: update systems-advanced.md cross-references`

- [ ] **Task 5.5**: Update testing-strategy.md
  - [ ] Update references to game-design.md
  - [ ] Point to README.md or specific docs
  - [ ] Verify links work
  - **Commit**: `docs: update testing-strategy.md cross-references`

- [ ] **Task 5.6**: Update regeneration_plan.md
  - [ ] Update references to game-design.md
  - [ ] Point to character.md, hunger.md
  - [ ] Verify links work
  - **Commit**: `docs: update regeneration_plan.md cross-references`

- [ ] **Task 5.7**: Update light_source_plan.md
  - [ ] Update references to game-design.md
  - [ ] Point to light-sources.md
  - [ ] Verify links work
  - **Commit**: `docs: update light_source_plan.md cross-references`

- [ ] **Task 5.8**: Update any service/command docs
  - [ ] Search for game-design.md references in docs/services/
  - [ ] Search for game-design.md references in docs/commands/
  - [ ] Update to point to specific focused docs
  - [ ] Verify links work
  - **Commit**: `docs: update service/command doc cross-references`

**Completion Criteria**: All cross-references updated and verified

---

### Phase 6: Cleanup & Verification

**Goal**: Remove old file, verify integrity

**Tasks**:
- [ ] **Task 6.1**: Verify all content migrated
  - [ ] Compare old game-design.md to new docs
  - [ ] Check for missing sections
  - [ ] Verify all 697 lines accounted for
  - [ ] No content loss

- [ ] **Task 6.2**: Verify cross-references
  - [ ] Test all links in README.md
  - [ ] Test all links in CLAUDE.md
  - [ ] Test all links in architecture.md
  - [ ] Test all links in systems-*.md
  - [ ] No broken links

- [ ] **Task 6.3**: Verify SOLID principles
  - [ ] Each doc has single responsibility ✓
  - [ ] Each doc <150 lines ✓
  - [ ] README.md provides abstraction layer ✓
  - [ ] Docs are modular and focused ✓

- [ ] **Task 6.4**: Delete old game-design.md
  - [ ] Confirm all content migrated
  - [ ] Confirm all cross-references updated
  - [ ] Delete docs/game-design.md
  - **Commit**: `docs: delete monolithic game-design.md (migrated to game-design/)`

- [ ] **Task 6.5**: Final verification
  - [ ] Read through all 15 new docs
  - [ ] Check for consistency
  - [ ] Check for completeness
  - [ ] Check for clarity
  - **Commit**: `docs: finalize game design documentation refactor`

**Completion Criteria**: Old file deleted, all links working, SOLID principles verified

---

## 6. Content Enhancements

### New Mechanics to Document

**Health Regeneration** (from regeneration_plan.md):
- Natural regeneration: 1 HP per 10 turns
- Hunger gate: requires hunger > 100
- Combat blocking: enemy in FOV prevents regen
- Ring of Regeneration: 5-turn rate, +30% hunger cost
- Rest command: skip turns until healed or interrupted
- Max HP increase: healing at full HP grants +1 max HP

**Where to Add**:
- `02-character.md`: Regeneration mechanics section
- `05-items.md`: Ring of Regeneration details
- `08-hunger.md`: Ring hunger penalty
- `10-controls.md`: Rest command (5, .)

**Light Source Details** (from systems-core.md):
- Torch: radius 2, 500 turns, warnings at 50/10/0
- Lantern: radius 2, refillable, oil flasks 500 turns each
- Artifacts: Phial of Galadriel, Star of Elendil, Arkenstone
- Starting equipment: torch + 2 spares OR lantern + 2 oil flasks
- Progression: early (torches) → mid (lantern) → late (artifacts)
- FOV = light radius relationship

**Where to Add**:
- `06-light-sources.md`: Comprehensive light mechanics
- `02-character.md`: Starting equipment
- `11-ui-design.md`: Light warnings, visual effects

### Influences to Attribute

**Original Rogue (1980)**:
- Permadeath, item identification, combat formulas
- 26 monsters (A-Z letters)
- Healing potion overheal (+1 max HP)
- Command key scheme (q, r, w, etc.)
- Save deletion on death

**NetHack**:
- Regeneration formulas (XL-based rates)
- Ring hunger modifiers (+30 nutrition)
- Advanced AI behaviors
- Enhanced identification

**Angband**:
- Light radius system
- Artifact light sources (Phial, Star)
- Regeneration food costs
- Constitution-based recovery

**Where to Add**:
- Each doc references relevant influences in context
- `15-references.md`: Complete reference list

---

## 7. File Mapping (Old → New)

| Old Section (Lines) | New Document | Notes |
|---------------------|--------------|-------|
| Product Overview (9-20) | 01-overview.md | Direct migration |
| Game Objective (23-32) | 01-overview.md | Direct migration |
| Character Stats (42-56) | 02-character.md | + regeneration mechanics |
| Permadeath (58-62) | 02-character.md | Direct migration |
| Dungeon Structure (68-71) | 03-dungeon.md | Direct migration |
| ASCII Table (73-98) | 03-dungeon.md | Direct migration |
| Monsters Table (108-135) | 04-monsters.md | + regeneration notes |
| AI Behaviors (137-152) | 04-monsters.md | Direct migration |
| Items Overview (159-164) | 05-items.md | Direct migration |
| Weapons (166-170) | 05-items.md | Direct migration |
| Armor (172-178) | 05-items.md | Direct migration |
| Light Sources (180-185) | 06-light-sources.md | + detailed mechanics |
| Potions/Scrolls/Rings/Wands (187-212) | 05-items.md | Ring update |
| Gold/Amulet (214-223) | 05-items.md | Direct migration |
| Identification (229-248) | 07-identification.md | Direct migration |
| Hunger System (253-279) | 08-hunger.md | + ring modifiers |
| Combat System (284-337) | 09-combat.md | Direct migration |
| Controls (342-385) | 10-controls.md | + rest command |
| UI/UX Design (390-519) | 11-ui-design.md | Direct migration |
| Save System (545-573) | 12-save-system.md | Direct migration |
| Success Metrics (578-613) | 13-progression.md | Direct migration |
| Future Enhancements (619-652) | 14-future.md | Direct migration |
| Appendix (657-697) | 15-references.md | Direct migration |

**Total**: 697 lines → 15 focused docs (avg 70 lines each)

---

## 8. Quality Checklist

### SOLID Principles Verification

**Single Responsibility Principle**:
- [ ] Each doc covers ONE topic only
- [ ] No doc >150 lines
- [ ] Clear, focused purpose for each doc

**Open/Closed Principle**:
- [ ] New mechanics added to appropriate doc
- [ ] No need to modify multiple docs for single feature
- [ ] Extensions don't require widespread changes

**Dependency Inversion Principle**:
- [ ] README.md provides abstraction layer
- [ ] Cross-references use index, not direct paths everywhere
- [ ] Central navigation hub

**Interface Segregation Principle**:
- [ ] Readers only see relevant content
- [ ] No wading through unrelated sections
- [ ] Focused entry points

### Content Quality

- [ ] All 697 lines accounted for (no content loss)
- [ ] All latest mechanics documented (regeneration, lighting)
- [ ] All influences properly attributed (Rogue, NetHack, Angband)
- [ ] Game design logic separated from code
- [ ] Cross-references complete and accurate
- [ ] No broken links
- [ ] Consistent formatting
- [ ] Clear, concise writing

### Navigation Quality

- [ ] README.md index complete
- [ ] Reading order recommendations clear
- [ ] Cross-reference map helpful
- [ ] Easy to find specific topics
- [ ] Logical document organization (numbered)

---

## 9. Risk Mitigation

### Risk 1: Content Loss During Migration
**Mitigation**:
- Complete one doc at a time, verify before next
- Keep old game-design.md until Phase 6 complete
- Line-by-line comparison before deletion
- Git commits after each doc creation

### Risk 2: Broken Cross-References
**Mitigation**:
- Phase 5 dedicated to cross-reference updates
- Test all links before deleting old file
- Search codebase for "game-design.md" references
- Systematic verification of all docs

### Risk 3: Inconsistent Information
**Mitigation**:
- Single source of truth per topic
- Cross-references point to authoritative doc
- Review all docs for consistency before finalization

### Risk 4: Over-Fragmentation
**Mitigation**:
- 15 docs is reasonable for 697 lines
- README.md provides navigation
- Numbered prefixes show reading order
- Each doc substantive (50-150 lines)

---

## 10. Timeline Estimate

**Total Estimated Time**: 6-8 hours

**Phase Breakdown**:
- Phase 1 (Structure & Index): 30 minutes
- Phase 2 (Core Design, Docs 1-5): 2 hours
- Phase 3 (Systems, Docs 6-9): 1.5 hours
- Phase 4 (UI & Meta, Docs 10-15): 2 hours
- Phase 5 (Cross-References): 1 hour
- Phase 6 (Cleanup & Verification): 1 hour

**Dependencies**: None (can start immediately)

**Blockers**: None identified

---

## 11. Success Metrics

### Quantitative Metrics
- ✅ 15 focused documents created
- ✅ Each doc 50-150 lines (avg 70)
- ✅ 0 lines lost from original (697 accounted for)
- ✅ 0 broken cross-references
- ✅ 100% of latest mechanics documented

### Qualitative Metrics
- ✅ Easy to find specific topics
- ✅ Clear navigation via README.md
- ✅ Modular, maintainable structure
- ✅ SOLID principles demonstrated
- ✅ Influences properly attributed
- ✅ Game design logic separated from code

### Maintainability Metrics
- ✅ Adding new mechanics: update 1 doc, not massive file
- ✅ Finding information: index → focused doc
- ✅ Updating mechanics: single source of truth
- ✅ Onboarding developers: clear structure

---

## 12. Post-Refactor Benefits

### Developer Benefits
- **Faster navigation**: Jump directly to relevant doc (monsters, combat, etc.)
- **Easier updates**: Modify focused doc, not 700-line file
- **Clearer ownership**: Each system has dedicated doc
- **Better git diffs**: Changes isolated to relevant files

### Documentation Benefits
- **Modularity**: Add new docs without bloating existing ones
- **Maintainability**: Single responsibility = easier to keep current
- **Discoverability**: Index + numbered docs = clear path
- **Scalability**: Easy to add new topics (16-xxx.md)

### Project Benefits
- **SOLID principles**: Documentation follows same principles as code
- **Consistency**: Architecture patterns reflected in docs
- **Professionalism**: Well-organized documentation = quality project
- **Onboarding**: New contributors find information quickly

---

## 13. References

### Related Documentation
- [CLAUDE.md](../CLAUDE.md) - Workflow rules, SOLID principles
- [Game Design](./game-design.md) - Current monolithic doc (to be replaced)
- [Architecture](./architecture.md) - Technical architecture
- [Systems Core](./systems-core.md) - Core systems (lighting, FOV)
- [Regeneration Plan](./regeneration_plan.md) - Health regeneration mechanics
- [Light Source Plan](./light_source_plan.md) - Lighting system details

### SOLID Principles for Documentation
- **SRP**: Each doc has one topic
- **OCP**: Extend by adding docs, not modifying existing
- **LSP**: Not applicable to documentation
- **ISP**: Readers see only relevant content
- **DIP**: Index provides abstraction layer

### Classic Roguelike Sources
- Original Rogue (1980) - Core mechanics
- NetHack - Advanced systems
- Angband - Light radius, artifacts

---

## 14. Notes & Decisions

### Design Decisions
1. **Numbered prefixes (01-15)**: Provide reading order, aid navigation
2. **README.md as hub**: Central index following DIP
3. **150-line limit**: Prevents document bloat, enforces SRP
4. **15 documents**: Balances modularity vs fragmentation
5. **Influences in context**: Attribution where relevant, not separate section
6. **Light sources separate doc**: Critical system deserves focused treatment

### Open Questions
- Should we create `docs/game-design/images/` for diagrams? (Decision: Defer to future)
- Should monsters be split by tier? (Decision: No, 150-line limit sufficient)
- Should we version these docs? (Decision: Use git history)

### Future Considerations
- Add visual diagrams (dungeon layout, UI mockups)
- Create player-facing summary (quick start guide)
- Generate PDF from markdown for offline reading
- Automated link checking in CI/CD

---

**Plan Status**: ⚪ Ready to Execute
**Next Action**: Begin Phase 1, Task 1.1 (Create docs/game-design/ folder)
**Estimated Completion**: 6-8 hours (1-2 development sessions)
