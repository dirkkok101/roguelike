# Implementation Plans

**Purpose**: Active and historical feature plans and refactors

---

## Overview

This folder contains both **active plans** (in progress) and **archived plans** (completed). Plans provide detailed implementation roadmaps with objectives, phases, tasks, and success criteria.

**For new features**: Follow the planning workflow in [contributing.md](../contributing.md) and use [TEMPLATE.md](./TEMPLATE.md).

---

## Active Plans

| Plan | Status | Started | Description |
|------|--------|---------|-------------|
| _No active plans_ | - | - | - |

---

## Completed Plans

| Plan | Status | Completed | Description |
|------|--------|-----------|-------------|
| **[Potion Implementation](./potion_implementation_plan.md)** | 📦 Archived | 2025-10-06 | Complete potion system (11 potions + StatusEffectService + energy system) |
| **[Death Screen Refactor](./death_screen_refactor.md)** | 📦 Archived | 2025-10-06 | Death and victory screen implementation |
| **[Documentation Refactor](./document_refactor_plan.md)** | 📦 Archived | 2025-10-06 | SOLID principles applied to documentation (6 phases, 12 commits) |
| **[Game Design Refactor](./game_design_document_refactor_plan.md)** | 📦 Archived | 2025-10-05 | Game design docs restructure (Phases 1-6) |
| **[Light Source Refactor](./light_source_plan.md)** | 📦 Archived | 2025-10-05 | Light source data model refactor (fuel tracking) |
| **[Regeneration Service](./regeneration_plan.md)** | 📦 Archived | 2025-10-05 | Natural health regeneration implementation |

---

## Creating New Plans

**When to create a plan**:
- New features (items, monsters, systems)
- Major refactors
- Architectural changes

**Plan Template**: See [contributing.md](../contributing.md#2-create-plan-for-features)

**Workflow**:
1. Create `feature_name_plan.md` in `docs/plans/`
2. Include: Objectives, Phases, Tasks, Related Docs
3. Mark status: 🚧 In Progress
4. Link from PR description
5. Mark 📦 Archived when complete

---

## Plan Structure

Good plans include:
- **Objectives** - What and why
- **Phases** - Logical groupings
- **Tasks** - Specific subtasks with checkboxes
- **Related Documentation** - Context references
- **Success Criteria** - Definition of done

**Example**: See [document_refactor_plan.md](./document_refactor_plan.md) for comprehensive plan structure

---

**Last Updated**: 2025-10-06
