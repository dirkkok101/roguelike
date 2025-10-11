# Documentation Hub

**ASCII Roguelike Documentation** - Comprehensive guides for developers, designers, and contributors

**Status**: 🚧 In Progress (Phase 1 Complete)
**Last Updated**: 2025-10-06

---

## Quick Start (Choose Your Path)

### 🆕 New Developer
**Goal**: Get up and running in 30 minutes

1. **[Getting Started Guide](./getting-started.md)** - Clone, run, and make your first change
2. **[Architecture Diagrams](./diagrams/README.md)** - Visual architecture overview
3. **[Architecture Overview](./architecture.md)** - Detailed textual architecture
4. **[CLAUDE.md](../CLAUDE.md)** - Main reference for workflows and patterns

### 🎨 Game Designer
**Goal**: Understand game mechanics and systems

1. **[Game Design Overview](./game-design/README.md)** - All gameplay mechanics
2. **[Core Systems](./systems-core.md)** - Lighting, FOV, rendering
3. **[Advanced Systems](./systems-advanced.md)** - AI, pathfinding, dungeon generation

### 🔧 Contributor
**Goal**: Submit quality code following project standards

1. **[Contributing Guide](./contributing.md)** - Development workflow and standards
2. **[Architectural Review](./ARCHITECTURAL_REVIEW.md)** - Pre-commit checklist
3. **[Testing Strategy](./testing-strategy.md)** - Testing patterns and requirements

---

## Documentation Map

### 📊 Visual Diagrams (NEW)

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[Diagrams Index](./diagrams/README.md)** | Visual architecture diagrams (Mermaid.js) | - | All |
| **[Architecture Layers](./diagrams/architecture-layers.md)** | 4-layer architecture (UI → Command → Service → Data) | - | Dev |
| **[Service Dependencies](./diagrams/service-dependencies.md)** | Dependency graph of all 35 services | - | Dev |
| **[Data Model](./diagrams/data-model.md)** | Entity relationships (GameState, Player, Monster) | - | Dev |
| **[Command Flow](./diagrams/command-flow.md)** | MoveCommand execution sequence | - | Dev |

### 📋 Reference Guides

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[CLAUDE.md](../CLAUDE.md)** | Main reference (workflows, patterns, quick ref) | 422 | All |
| **[Architecture](./architecture.md)** | Technical architecture, SOLID principles, layers | 1,224 | Dev |
| **[Services Guide](./services/README.md)** | All 35 services reference | 287 | Dev |
| **[Commands Guide](./commands/README.md)** | All 40+ commands reference | 118 | Dev |

### 🎮 Game Design

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[Game Design Overview](./game-design/README.md)** | Master index for all game mechanics | 130 | All |
| **[Character System](./game-design/02-character.md)** | Player stats, leveling, regeneration | 120 | Designer |
| **[Combat System](./game-design/03-combat.md)** | Combat mechanics and formulas | 150 | Designer |
| **[Monsters](./game-design/04-monsters.md)** | All 26 monsters (A-Z) with stats | 180 | Designer |
| **[Items](./game-design/05-items.md)** | All item types and effects | 200 | Designer |

### 🔧 Systems & Implementation

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[Core Systems](./systems-core.md)** | Lighting, FOV, rendering, visibility | 657 | Dev |
| **[Advanced Systems](./systems-advanced.md)** | AI, pathfinding, dungeon generation | 823 | Dev |
| **[Testing Strategy](./testing-strategy.md)** | Test organization and patterns | 524 | Dev |

### 📘 How-To Guides

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[Getting Started](./getting-started.md)** | New developer onboarding (30-min quick start) | TBD | Dev |
| **[Contributing](./contributing.md)** | Development workflow and standards | TBD | Dev |
| **[Documentation Writing Guide](./documentation-guide.md)** | Templates and standards for all doc types | 932 | Dev |
| **[Troubleshooting](./troubleshooting.md)** | Common issues and solutions | TBD | Dev |
| **[Service Creation Guide](./services/creation-guide.md)** | Step-by-step service creation | 546 | Dev |
| **[Command Creation Guide](./commands/creation-guide.md)** | Step-by-step command creation | 541 | Dev |
| **[Service Patterns](./services/patterns.md)** | Common implementation patterns | 632 | Dev |
| **[Command Patterns](./commands/patterns.md)** | Orchestration patterns | 702 | Dev |
| **[Service Testing Guide](./services/testing-guide.md)** | Service-specific testing | 478 | Dev |
| **[Command Testing Guide](./commands/testing-guide.md)** | Command-specific testing | 605 | Dev |

### 🔍 Review & Quality

| Document | Purpose | Lines | Audience |
|----------|---------|-------|----------|
| **[Architectural Review](./ARCHITECTURAL_REVIEW.md)** | Pre-commit checklist | 308 | Dev |
| **[Testing Strategy](./testing-strategy.md)** | Test organization and standards | 524 | Dev |

---

## Learning Paths

### Beginner Path (Week 1)
**Goal**: Understand core concepts

1. **Day 1-2**: Read [Getting Started](./getting-started.md) + [CLAUDE.md](../CLAUDE.md)
2. **Day 3**: Read [Architecture](./architecture.md) (focus on layers + SOLID)
3. **Day 4**: Read [Service Creation Guide](./services/creation-guide.md) + 2 example services
4. **Day 5**: Read [Command Creation Guide](./commands/creation-guide.md) + 2 example commands
5. **Day 6-7**: Read [Testing Strategy](./testing-strategy.md) + practice TDD

**Recommended Examples**:
- Services: [LightingService](./services/LightingService.md), [FOVService](./services/FOVService.md)
- Commands: [MoveCommand](./commands/patterns.md#movecommand-example), [AttackCommand](./commands/patterns.md#attackcommand-example)

### Intermediate Path (Week 2)
**Goal**: Understand game systems

1. **Day 1-2**: Read [Game Design Overview](./game-design/README.md) + character/combat
2. **Day 3**: Read [Core Systems](./systems-core.md) (lighting, FOV, visibility)
3. **Day 4**: Read [Advanced Systems](./systems-advanced.md) (AI, pathfinding)
4. **Day 5**: Explore service docs ([Services Guide](./services/README.md))
5. **Day 6-7**: Build a feature (item, monster, command)

### Advanced Path (Week 3+)
**Goal**: Contribute quality code

1. **Architecture mastery**: Implement service following [Architectural Review](./ARCHITECTURAL_REVIEW.md)
2. **Testing mastery**: Achieve >90% coverage on new features
3. **Design mastery**: Design new feature following [Game Design](./game-design/README.md) patterns
4. **Code review**: Review PRs using [Contributing Guide](./contributing.md)

---

## Document Status Legend

- ✅ **Complete** - Comprehensive, reviewed, up-to-date
- 🚧 **In Progress** - Being actively updated
- 📦 **Archived** - Historical reference (moved to `docs/plans/`)
- 🆕 **New** - Recently added (last 30 days)

---

## How to Contribute to Docs

**Found an issue? Want to improve docs?**

1. **Small fixes** (typos, broken links): Submit PR directly
2. **New sections**: Open issue first to discuss approach
3. **New documents**: Follow [Documentation Writing Guide](./documentation-guide.md)

**Quick Standards**:
- Keep documents under 500 lines (split if larger)
- Use scenario-based organization (not method-based)
- Include code examples with every concept
- Add cross-references to related docs
- Update "Last Updated" date when editing

**See**:
- **[Documentation Writing Guide](./documentation-guide.md)** - Comprehensive guide for all doc types
- **[Contributing Guide](./contributing.md)** - Development workflow

---

## Questions?

- **Getting Started**: See [Getting Started Guide](./getting-started.md)
- **Technical Issues**: See [Troubleshooting](./troubleshooting.md)
- **Architecture Questions**: See [Architecture](./architecture.md) or [CLAUDE.md](../CLAUDE.md)
- **Game Design Questions**: See [Game Design](./game-design/README.md)

---

**Version**: 1.0
**Last Updated**: 2025-10-06
**Maintainers**: Dirk Kok
