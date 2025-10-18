# ASCII Roguelike

**A web-based roguelike inspired by the classic 1980 Rogue**

Classic dungeon crawler with permadeath, procedural generation, turn-based gameplay, and tactical light management. Built with TypeScript + Vite following Clean Architecture principles.

---

## Features

✨ **Classic Roguelike Experience**
- 10 procedurally generated dungeon levels
- 26 unique monsters (A-Z) with varied AI behaviors
- Permadeath - when you die, the run is over
- Turn-based combat with hunger and resource management

🎨 **Dual Rendering Modes**
- **Sprite Mode** (default) - Modern graphical tiles (Angband TK tileset), hardware-accelerated
- **ASCII Mode** - Classic text-based rendering, better accessibility and lower resource usage
- Toggle instantly during gameplay with `Shift+T` key
- Preference saved automatically to localStorage

💡 **Dynamic Lighting System**
- Field of view based on light source radius
- Torches, lanterns, and artifact lights
- Fuel management creates tactical decisions
- Three-state visibility (visible/explored/unexplored)

🎮 **Rich Gameplay**
- Equipment system (weapons, armor, rings)
- Identification system (unidentified potions, scrolls, wands)
- 7 different monster AI behaviors (SMART, GREEDY, ERRATIC, etc.)
- Health regeneration with combat blocking
- Hunger system gating abilities

🎯 **Win Condition**
- Retrieve the Amulet of Yendor from Level 10
- Return to Level 1 to claim victory

---

## Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **TypeScript** knowledge recommended
- Familiarity with roguelikes helpful but not required

### Installation

```bash
# Clone the repository
git clone https://github.com/dirkkok101/roguelike.git
cd roguelike

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to play!

### Building for Production

```bash
npm run build
npm run preview
```

---

## Controls

**Movement**: Arrow keys or numpad (8-direction movement)

**Game Actions**:
- `i` - Inventory
- `e` - Eat/quaff
- `w` - Wield weapon
- `W` - Wear armor
- `t` - Take off equipment
- `P` - Put on ring
- `R` - Remove ring
- `r` - Read scroll
- `z` - Zap wand
- `d` - Drop item
- `q` - Quaff potion
- `.` - Rest (heal until full HP or interrupted)
- `<` - Go up stairs
- `>` - Go down stairs

**Display**:
- `Shift+T` - Toggle rendering mode (Sprite ↔ ASCII)
- `~` - Toggle debug console (dev mode)

---

## Documentation

Comprehensive documentation for developers and contributors:

- **[Getting Started](./docs/getting-started.md)** - New developer onboarding (30-min quick start + 2-week deep dive)
- **[Documentation Index](./docs/README.md)** - Full documentation map with learning paths
- **[Contributing](./docs/contributing.md)** - How to contribute (workflow, testing, style guide)
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code quick reference (architecture patterns, workflow)

### Key Documentation

**Game Design**:
- [Game Design Overview](./docs/game-design/README.md) - Mechanics, monsters, items, combat
- [Character System](./docs/game-design/02-character.md) - Stats, leveling, regeneration
- [Light Sources](./docs/game-design/06-light-sources.md) - Lighting mechanics

**Architecture**:
- [Architecture Guide](./docs/architecture.md) - Clean Architecture, services, data structures
- [Core Systems](./docs/systems-core.md) - Lighting, FOV, rendering
- [Advanced Systems](./docs/systems-advanced.md) - AI, pathfinding, dungeon generation

**Implementation Guides**:
- [Service Creation](./docs/services/creation-guide.md) - How to create services
- [Command Creation](./docs/commands/creation-guide.md) - How to create commands
- [Testing Strategy](./docs/testing-strategy.md) - Test organization and patterns

---

## Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Jest** - Testing framework
- **No Framework** - Vanilla DOM manipulation (lightweight, educational)
- **LocalStorage** - Save system (browser-based persistence)

---

## Architecture

This project follows **Clean Architecture** and **SOLID principles**:

```
UI Layer (DOM only, no game logic)
    ↓
Command Layer (orchestrates services)
    ↓
Service Layer (all game logic)
    ↓
Data Layer (immutable state, JSON config)
```

**Key Principles**:
- **Immutability** - Never mutate state, always return new objects
- **Dependency Injection** - All services receive dependencies via constructor
- **Single Responsibility** - Each service/command has one job
- **Testability** - 80%+ coverage with deterministic tests (MockRandom)

See [CLAUDE.md](./CLAUDE.md) for complete architecture guidelines.

---

## Development

### Testing

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

**Coverage Goals**:
- Services: >90% (pure logic)
- Commands: >80% (orchestration)
- Overall: >80%

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build
```

---

## Project Status

**Current Phase**: Phase 1 - Foundation & Core Loop (5/16 tasks complete)

**Completed Features**:
- ✅ Lighting system (torches, lanterns, artifacts)
- ✅ FOV with shadowcasting
- ✅ Monster AI (7 behaviors)
- ✅ Dungeon generation (rooms + corridors)
- ✅ Health regeneration
- ✅ Combat system
- ✅ Equipment system
- ✅ Hunger system

**In Progress**:
- 🚧 Item identification
- 🚧 Wand targeting
- 🚧 Advanced monster abilities

See [Development Plan](./docs/plan.md) for full roadmap.

---

## Contributing

Contributions welcome! Please read the [Contributing Guide](./docs/contributing.md) first.

**Quick workflow**:
1. Pick a task from [Issues](https://github.com/dirkkok101/roguelike/issues)
2. Create plan (for features) using [Template](./docs/plans/TEMPLATE.md)
3. Follow TDD (tests first)
4. Run [Architectural Review](./docs/ARCHITECTURAL_REVIEW.md) checklist
5. Commit with descriptive message
6. Open PR with plan reference

---

## License

MIT License (see LICENSE file)

---

## Acknowledgments

**Inspired by**:
- **Original Rogue (1980)** - Michael Toy, Glenn Wichman, Ken Arnold
- **NetHack** - Advanced mechanics and identification
- **Angband** - Light radius system and artifact lights

**Resources**:
- [RogueBasin](https://www.roguebasin.com/) - Roguelike development wiki
- [Red Blob Games](https://www.redblobgames.com/) - Pathfinding tutorials
- [Bob Nystrom](https://journal.stuffwithstuff.com/) - FOV and dungeon generation articles

See [References](./docs/game-design/15-references.md) for complete attribution.

---

## Contact

**Developer**: Dirk Kok
**Email**: dirkkok@gmail.com
**Repository**: https://github.com/dirkkok101/roguelike
**Issues**: https://github.com/dirkkok101/roguelike/issues

---

**Enjoy the dungeon! May you find the Amulet of Yendor!** 🏆
