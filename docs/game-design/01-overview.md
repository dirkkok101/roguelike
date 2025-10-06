# Game Overview

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Dungeon](./03-dungeon.md) | [Monsters](./04-monsters.md) | [Items](./05-items.md)

---

## 1. Product Overview

**Name**: Web Roguelike

**Genre**: Classic roguelike dungeon crawler

**Platform**: Web (TypeScript + Vite)

**Target Audience**: Roguelike enthusiasts, retro gamers, fans of challenging procedurally-generated games

**Core Concept**: A faithful recreation of the original 1980 Rogue game using modern web technologies while preserving the classic ASCII aesthetic and core gameplay loop. Players navigate procedurally generated dungeons, battle monsters, manage resources (hunger, equipment, lighting), and attempt to retrieve the legendary Amulet of Yendor.

**Inspiration**: **Original Rogue (1980)** - The grandfather of roguelikes, establishing permadeath, procedural generation, turn-based combat, and ASCII graphics as genre conventions.

---

## 2. Game Objective

The player must:

1. **Start** on Level 1 of the dungeon
2. **Descend** through 10 procedurally generated dungeon levels
3. **Retrieve** the **Amulet of Yendor** from Level 10
4. **Return** to the surface (Level 1) with the amulet
5. **Survive** hunger, combat, traps, darkness, and **permadeath**

**Victory Condition**: Return to Level 1 with the Amulet of Yendor.

**Failure**: Death is permanent - game over, start fresh.

---

## 3. Core Features

### Key Gameplay Systems

**Exploration**:
- 10 procedurally generated levels (rooms + corridors)
- ASCII graphics with three-state visibility (visible/explored/unexplored)
- Light management (torches, lanterns, artifacts)
- Field of view based on light radius (1-3 tiles)

**Character Progression**:
- Fighter class with stats (HP, Strength, Armor Class, Level, XP, Gold)
- Level up by defeating monsters
- Find equipment to improve combat effectiveness
- Health regeneration (hunger-gated, combat-blocked)
- Permanent death (permadeath)

**Resource Management**:
- Hunger system (food depletion, combat penalties when starving)
- Light fuel (torches burn out, lanterns need oil)
- Health recovery (potions, rest, natural regeneration)
- Equipment durability (armor can rust)

**Combat & Monsters**:
- Turn-based tactical combat
- 26 monster types (A-Z) with unique abilities
- 7 AI behavior patterns (SMART, SIMPLE, GREEDY, ERRATIC, THIEF, STATIONARY, COWARD)
- Special abilities (regeneration, rust, steal, drain, freeze, confuse)

**Items & Equipment**:
- Weapons, armor, potions, scrolls, rings, wands
- Unidentified items (mystery and discovery)
- Enchantments and curses
- Light sources (torches, lanterns, permanent artifacts)

**Challenge**:
- Permadeath (save deleted on death)
- Strategic resource management (food, light, health)
- Risk/reward decisions (explore deeper vs retreat to safety)
- Procedural generation ensures unique experience each playthrough

---

## 4. Key Differentiators

### What Makes This Roguelike Special?

**Light Management System** (Angband-inspired):
- Vision radius determined by equipped light source
- Torches burn out (500 turns fuel)
- Lanterns refillable with oil flasks
- Permanent artifact lights (rare, powerful)
- Darkness creates tension and strategic depth

**Three-State Visibility**:
- **Visible**: Currently in field of view (full color)
- **Explored**: Previously seen (dimmed/grayscale)
- **Unexplored**: Never seen (black/hidden)
- Monsters only visible in current FOV (creates suspense)

**Faithful to Original Rogue**:
- Classic ASCII aesthetics
- Turn-based gameplay (no time pressure)
- Permadeath (no save scumming)
- Procedural generation (infinite replayability)
- Item identification system (mystery and discovery)

**Modern Web Implementation**:
- Runs in browser (no installation)
- LocalStorage save system
- Enhanced UI (message history, contextual commands, quick help)
- Accessibility features (colorblind-friendly palette)

---

## 5. Design Philosophy

### Core Principles

**Challenging but Fair**:
- Clear feedback (combat messages, warnings, stat displays)
- Consistent rules (no hidden mechanics)
- Strategic depth (resource management, tactical combat)
- Player agency (meaningful choices with consequences)

**Faithful Recreation**:
- Honor original Rogue mechanics and spirit
- Classic ASCII aesthetic (readable, authentic)
- Permadeath creates stakes and tension
- Procedural generation ensures variety

**Modern Enhancements**:
- Quality-of-life improvements (message history, rest command)
- Enhanced visibility system (fog of war, light radius)
- Refined AI behaviors (7 distinct patterns)
- Polished UI (while maintaining ASCII charm)

**Replayability**:
- Procedural generation (unique dungeon each game)
- Random item identification (different each playthrough)
- Permadeath (start fresh, learn from mistakes)
- Multiple viable strategies (combat, stealth, resource optimization)

---

## 6. Success Criteria

### What Defines a Successful Playthrough?

**Victory**:
- Retrieve Amulet of Yendor from Level 10
- Return to Level 1 with amulet
- Survive all hazards and challenges

**Mastery**:
- Complete run without using healing potions
- Complete run at Level 5 or below (challenge mode)
- Find all 3 artifact light sources
- Kill all 26 monster types

**Progression**:
- Each run teaches new lessons (monster behaviors, item effects)
- Gradual improvement in survival depth (reach Level 5, 7, 10)
- Build knowledge of game systems (combat formulas, hunger rates)

---

## Cross-References

- **[Character](./02-character.md)** - Stats, progression, health regeneration
- **[Dungeon](./03-dungeon.md)** - Level structure, ASCII symbols
- **[Monsters](./04-monsters.md)** - All 26 monsters and AI behaviors
- **[Items](./05-items.md)** - Complete item catalog
- **[Light Sources](./06-light-sources.md)** - Lighting mechanics (critical system)
- **[Combat](./09-combat.md)** - Combat formulas and damage calculation
- **[Hunger](./08-hunger.md)** - Food management system

---

**Developer**: Dirk Kok
**Repository**: https://github.com/dirkkok101/roguelike
