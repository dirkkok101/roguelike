# Game Design Documentation

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Architecture](../architecture.md) | [Core Systems](../systems-core.md) | [Advanced Systems](../systems-advanced.md) | [Testing](../testing-strategy.md)

---

## Overview

This folder contains focused game design documents following SOLID principles. Each document covers a single topic with game rules, mechanics, and influences from classic roguelikes (Rogue 1980, NetHack, Angband).

**Design Philosophy**: Modular, maintainable documentation where each file has a single responsibility, making it easy to find information and update mechanics without editing massive files.

---

## Table of Contents

### Core Game Design

1. **[Overview](./01-overview.md)** - Product vision, objectives, and win condition
2. **[Character](./02-character.md)** - Stats, progression, health regeneration, and permadeath
3. **[Dungeon](./03-dungeon.md)** - Level structure, ASCII symbols, and persistence
4. **[Monsters](./04-monsters.md)** - All 26 monsters A-Z with AI behaviors and abilities
5. **[Items](./05-items.md)** - Complete item catalog and equipment system

### Systems & Mechanics

6. **[Light Sources](./06-light-sources.md)** - Lighting mechanics (torches, lanterns, artifacts)
7. **[Identification](./07-identification.md)** - Unidentified items and discovery system
8. **[Hunger](./08-hunger.md)** - Hunger mechanics, states, and food management
9. **[Combat](./09-combat.md)** - Combat formulas, damage calculation, and death

### Interface & Controls

10. **[Controls](./10-controls.md)** - Movement, commands, and keybindings
11. **[UI Design](./11-ui-design.md)** - Visual design, colors, and layout

### Meta & Systems

12. **[Save System](./12-save-system.md)** - Persistence and permadeath implementation
13. **[Progression](./13-progression.md)** - Success metrics and completion goals
14. **[Future](./14-future.md)** - Post-v1 features and expansions
15. **[References](./15-references.md)** - Glossary, sources, and credits

---

## Reading Order

### New to the Game?
Start with these to understand core gameplay:
1. [Overview](./01-overview.md) - What is this game?
2. [Character](./02-character.md) - Your character's abilities
3. [Controls](./10-controls.md) - How to play
4. [Light Sources](./06-light-sources.md) - Critical survival mechanic

### Developer?
Understand game design then dive into implementation:
1. [Overview](./01-overview.md) - Product vision
2. [Architecture](../architecture.md) - Technical patterns
3. [Core Systems](../systems-core.md) - Implementation details
4. Pick specific design docs as needed

### Game Designer?
Read all documents in numbered order (01-15) for complete game design understanding.

---

## Document Structure

Each document follows this pattern:
- **Purpose**: Single, clear responsibility
- **Contents**: Game rules and mechanics (no source code)
- **Influences**: Credits to Rogue, NetHack, Angband where applicable
- **Cross-references**: Links to related documents
- **Length**: 50-150 lines (focused, maintainable)

---

## Cross-Reference Map

**Character-focused**:
- Character → Hunger, Combat, Items, Light Sources
- Progression → All systems

**Systems-focused**:
- Light Sources → Dungeon, Character, UI Design
- Combat → Character, Monsters, Items
- Hunger → Character, Items

**Interface-focused**:
- Controls → All gameplay systems
- UI Design → Light Sources, Dungeon

**Meta**:
- Future → Current features (as baseline)
- References → All documents (sources)

---

## SOLID Principles Applied

This documentation structure demonstrates SOLID principles:

- **Single Responsibility**: Each document covers ONE topic (character, combat, etc.)
- **Open/Closed**: Extend by adding new docs, not modifying existing ones
- **Interface Segregation**: Readers see only relevant content per topic
- **Dependency Inversion**: This README provides navigation abstraction

**Why SOLID for docs?** Same benefits as code: maintainability, discoverability, modularity.

---

## Quick Reference

**Looking for...**
- Character stats and leveling? → [Character](./02-character.md)
- Monster abilities? → [Monsters](./04-monsters.md)
- How lighting works? → [Light Sources](./06-light-sources.md)
- Combat calculations? → [Combat](./09-combat.md)
- Hunger mechanics? → [Hunger](./08-hunger.md)
- Keybindings? → [Controls](./10-controls.md)
- What items do? → [Items](./05-items.md)

---

**Developer**: Dirk Kok
**Repository**: https://github.com/dirkkok101/roguelike
**Issues**: https://github.com/dirkkok101/roguelike/issues
