# Progression & Success Metrics

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: All game design documents

---

## 1. Functionality Metrics

**Goal**: All core systems working correctly

### Core Loop
- [ ] Can play from Level 1 → Level 10 → Level 1 with Amulet
- [ ] Victory condition triggers (return to Level 1 with Amulet)
- [ ] Permadeath deletes save on death

### Monsters
- [ ] All 26 monsters (A-Z) implemented with correct stats
- [ ] All 7 AI behaviors function correctly (SMART, SIMPLE, GREEDY, etc.)
- [ ] Special abilities work (regeneration, rust, drain, steal, etc.)

### Items
- [ ] All item types working (weapons, armor, potions, scrolls, rings, wands, food, light sources)
- [ ] Equipment slots functional (weapon, armor, 2 rings, light source)
- [ ] Enchantments and curses apply correctly

### Combat
- [ ] Hit calculation formula accurate (1d20 + modifiers vs AC)
- [ ] Damage calculation correct (weapon dice + strength modifiers)
- [ ] Strength tables match Original Rogue

### Hunger
- [ ] Hunger depletion works (1 unit/turn, ring modifiers)
- [ ] Hunger states apply correct effects (Weak: -1 hit/damage, Starving: 1 HP/turn)
- [ ] Food rations restore correct amounts (1100-1499)

### Lighting
- [ ] Fuel consumption accurate (1/turn)
- [ ] Warning messages trigger at correct thresholds (50/10/0)
- [ ] Vision radius = light radius
- [ ] Artifacts never run out

### Health Regeneration
- [ ] Natural regeneration: 1 HP per 10 turns (hunger > 100, no combat)
- [ ] Ring of Regeneration: 1 HP per 5 turns (+30% hunger)
- [ ] Rest command works (skip turns until healed or interrupted)
- [ ] Overheal grants +1 max HP

### FOV
- [ ] Field of view shadowcasting algorithm accurate
- [ ] Vision blocked by walls, closed doors, secret doors
- [ ] Explored tiles tracked correctly

### Pathfinding
- [ ] A* pathfinding works for SMART AI
- [ ] Monsters navigate around obstacles
- [ ] All 7 AI patterns function distinctly

### Dungeon Generation
- [ ] Rooms, corridors, doors generate correctly
- [ ] All 6 door types spawn (open, closed, locked, secret, broken, archway)
- [ ] Minimum Spanning Tree ensures full connectivity
- [ ] Loops add alternate paths

### Identification
- [ ] Random descriptive names generated per game
- [ ] Items identify when used
- [ ] Scroll of Identify works
- [ ] Persistence within game (once identified, all similar items revealed)

### Debug Tools
- [ ] All debug commands work (~, g, v, f, p)
- [ ] Debug overlays display correctly

---

## 2. Quality Metrics

**Goal**: Stable, performant, well-tested

### Test Coverage
- [ ] Services: >80% coverage (aim for 100% where possible)
- [ ] Commands: >80% coverage
- [ ] Overall project: >80% lines, branches, functions

### Performance
- [ ] 60fps rendering consistently
- [ ] Input response <100ms
- [ ] No lag during gameplay

### Stability
- [ ] No game-breaking bugs
- [ ] No crashes or softlocks
- [ ] Playable from start to finish without issues

### Save/Load
- [ ] State persists accurately
- [ ] Load restores exact game state
- [ ] Auto-save every 10 turns works
- [ ] Save deletion on death works

### Balance
- [ ] Challenging but fair (playtesting feedback)
- [ ] Food scarcity creates tension but not frustration
- [ ] Light management adds strategy without tedium
- [ ] Monster difficulty scales appropriately by level

---

## 3. UX Metrics

**Goal**: Enjoyable, intuitive, authentic experience

### Controls
- [ ] Keyboard input feels snappy and responsive
- [ ] All commands accessible and discoverable
- [ ] Command mode intuitive (select item, ESC to cancel)

### Readability
- [ ] ASCII characters clear and distinguishable
- [ ] Monospace font readable at chosen size
- [ ] High contrast (visible vs explored vs unexplored)

### Messaging
- [ ] Combat log provides useful feedback
- [ ] Messages grouped intelligently (x3 for repeats)
- [ ] Warnings clear and timely (hunger, light fuel)

### UI
- [ ] Layout intuitive (dungeon, stats, messages, commands)
- [ ] Stats panel shows relevant info (HP, hunger, light, equipment)
- [ ] Command bar context-aware (shows available actions)

### Authenticity
- [ ] Captures spirit of Original Rogue
- [ ] Modern enhancements don't break immersion
- [ ] ASCII aesthetic preserved

### Lighting Tension
- [ ] Managing torches/lanterns adds strategic depth
- [ ] Running out of light creates urgency
- [ ] Artifact discovery feels rewarding

---

## 4. Progression Milestones

### Early Development (Phase 1-2)
- [ ] Basic dungeon generation
- [ ] Player movement and FOV
- [ ] Simple combat
- [ ] Item pickup/drop
- [ ] Save/load basic

### Mid Development (Phase 3-4)
- [ ] All 26 monsters implemented
- [ ] All item types working
- [ ] Advanced AI behaviors
- [ ] Lighting system complete
- [ ] Hunger system functional

### Late Development (Phase 5-6)
- [ ] Health regeneration
- [ ] Ring effects (all types)
- [ ] Wand targeting system
- [ ] Trap mechanics
- [ ] Victory condition

### Polish & Testing (Phase 7+)
- [ ] UI enhancements (message history, help modals)
- [ ] Balance tuning
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Playtesting feedback integration

---

## 5. Victory Conditions

### Standard Victory
**Complete the core objective**:
1. Reach Level 10
2. Find Amulet of Yendor
3. Return to Level 1 with Amulet
4. Victory screen displayed

### Challenge Victories (Optional)

**Low-Level Victory**:
- Win at character Level 5 or below (extreme difficulty)

**No-Healing Victory**:
- Win without using healing potions (regeneration only)

**Artifact Hunter**:
- Find all 3 permanent light sources before winning

**Pacifist** (partial):
- Minimize combat (avoid unnecessary fights)

---

## Cross-References

All game design documents contribute to these metrics.

---

## Influences

- **Software quality standards**: Test coverage, performance metrics
- **Roguelike genre conventions**: Balance, difficulty, replayability
