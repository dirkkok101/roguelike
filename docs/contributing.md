# Contributing Guide

**Welcome, contributor!** This guide outlines the development workflow and standards for contributing to the ASCII Roguelike project.

**Audience**: All contributors (developers, designers, documenters)
**Prerequisites**: Complete [Getting Started Guide](./getting-started.md) first
**Related Docs**: [CLAUDE.md](../CLAUDE.md) | [Architectural Review](./ARCHITECTURAL_REVIEW.md) | [Testing Strategy](./testing-strategy.md)

---

## Workflow Overview

### 1. Pick a Task

**Options**:
- Browse [GitHub Issues](https://github.com/dirkkok101/roguelike/issues)
- Check [Development Plan](./plan.md) for next priority task
- Propose new feature (open issue first for discussion)

**Before starting**: Comment on issue to claim it (avoids duplicate work)

---

### 2. Create Plan (for features)

**When required**: New features, major refactors, new systems

**Steps**:
1. Create `docs/plans/feature_name_plan.md` using [Template](./plans/TEMPLATE.md)
2. Include:
   - Objectives (what and why)
   - Phases with tasks and subtasks
   - Related documentation references
   - Success criteria
3. Get feedback on plan before implementing

**Example plans**:
- [Regeneration Plan](./plans/regeneration_plan.md) - Feature implementation
- [Document Refactor Plan](./plans/document_refactor_plan.md) - Documentation refactor

---

### 3. Follow TDD (Test-Driven Development)

**Process**:
1. **Write tests first** (red → green → refactor)
2. **Run tests**: `npm test ServiceName`
3. **Check coverage**: `npm run test:coverage` (aim for >80%, services >90%)

**Testing guides**:
- [Testing Strategy](./testing-strategy.md) - Overall approach
- [Service Testing Guide](./services/testing-guide.md) - Service-specific patterns
- [Command Testing Guide](./commands/testing-guide.md) - Command-specific patterns

---

### 4. Architectural Review

**Before committing**: Run through [Architectural Review Checklist](./ARCHITECTURAL_REVIEW.md)

**Key checks**:
- ✅ Commands orchestrate only (no loops, calculations, logic)
- ✅ Services contain ALL logic (pure functions, immutable)
- ✅ State updates return NEW objects (spread operator)
- ✅ Dependencies injected via constructor
- ✅ No mutations (no `push`, `splice`, direct assignment)
- ✅ Tests achieve >80% coverage

**Quick tests**:
```bash
# Check for loops in commands (should return nothing)
grep -r "forEach\|for (\|while (" src/commands/

# Check for Math usage in commands (should return nothing)
grep -r "Math\." src/commands/

# Run type checking
npm run type-check
```

---

### 5. Commit Changes

**Format** (see examples below):
```
<type>: <subject> (50 chars max)

<body> (72 chars per line, detailed explanation)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `test`: Add/update tests
- `docs`: Documentation updates
- `chore`: Build/tooling changes

**Examples**:
```bash
# Feature commit
git commit -m "feat: implement LightingService with fuel tracking and warnings"

# Bug fix commit
git commit -m "fix: prevent negative fuel in torch consumption"

# Refactor commit
git commit -m "refactor: extract FOV exploration logic to service"

# Documentation commit
git commit -m "docs: add RegenerationService documentation with examples"
```

**Atomic commits**: One logical change per commit (makes review easier)

---

### 6. Create Pull Request

**Steps**:
1. Push branch: `git push origin feature/your-feature-name`
2. Open PR on GitHub
3. Fill PR template (see below)
4. Link plan document (if feature)
5. Request review

**PR Template**:
```markdown
## Description
Brief description of changes (2-3 sentences)

## Related Issue
Closes #123 (link to issue)

## Plan Document
- [Feature Plan](./docs/plans/feature_name_plan.md) (if applicable)

## Changes Made
- [ ] Implemented ServiceName (link to file)
- [ ] Added tests (>80% coverage achieved)
- [ ] Updated documentation (link to docs)
- [ ] Ran architectural review checklist

## Testing
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)

## Checklist
- [ ] Code follows architecture guidelines (no logic in commands)
- [ ] State updates are immutable (spread operator)
- [ ] Dependencies injected via constructor
- [ ] Descriptive commit message with footer
- [ ] Plan document linked (if feature)
```

---

## Style Guide

### Code Standards

**TypeScript**:
- Strict mode enabled (no `any` without justification)
- Explicit return types for public methods
- Interfaces over types (for consistency)

**Naming**:
- `PascalCase`: Classes, interfaces, types
- `camelCase`: Variables, functions, methods
- `UPPER_SNAKE_CASE`: Constants
- Descriptive names (no single-letter except loop indices)

**File organization**:
- One class per file
- Barrel exports (`index.ts`)
- Scenario-based test files (e.g., `fuel-consumption.test.ts`)

**Comments**:
- JSDoc for public methods (optional for obvious ones)
- Inline comments for non-obvious logic
- No commented-out code (use git history)

---

## Testing Requirements

**Coverage targets**:
- Services: >90% (pure logic, fully testable)
- Commands: >80% (orchestration, less critical)
- Overall: >80% lines, branches, functions

**Test organization**:
- AAA pattern (Arrange-Act-Assert)
- Scenario-based file naming
- MockRandom for deterministic tests
- One test file per scenario

**See**: [Testing Strategy](./testing-strategy.md)

---

## Documentation Requirements

**When to update docs**:
- ✅ New service → Create `docs/services/ServiceName.md`
- ✅ New feature → Update relevant game design doc
- ✅ Architecture change → Update `architecture.md`
- ✅ New pattern → Update patterns guides
- ✅ Bug fix → Update troubleshooting.md (if recurring issue)

**Documentation standards**:
- Keep docs under 500 lines (split if larger)
- Include code examples for every concept
- Add cross-references to related docs
- Update "Last Updated" date

**See**: [Documentation Hub](./README.md#how-to-contribute-to-docs)

---

## Questions?

- **Workflow questions**: Re-read this guide or ask in PR
- **Architecture questions**: [Architectural Review](./ARCHITECTURAL_REVIEW.md)
- **Technical issues**: [Troubleshooting](./troubleshooting.md)
- **Getting started**: [Getting Started Guide](./getting-started.md)

---

**Thank you for contributing!** 🎮

---

**Version**: 1.0
**Last Updated**: 2025-10-06
**Maintainer**: Dirk Kok
