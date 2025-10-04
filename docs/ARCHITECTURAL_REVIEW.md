# Architectural Review Checklist

**Purpose**: Ensure code follows layered architecture guidelines before committing.

**Related Docs**: [Architecture](./architecture.md) | [CLAUDE.md Common Pitfalls](../CLAUDE.md#common-pitfalls)

---

## Quick Reference: Layer Responsibilities

```
UI Layer       → Rendering + Input capture ONLY (zero logic)
Command Layer  → Service orchestration ONLY (zero implementation)
Service Layer  → ALL game logic and rules
Data Layer     → Immutable state + JSON config
```

---

## Pre-Commit Checklist

### For Commands (AttackCommand, MoveCommand, etc.)

**✅ Passes if:**
- [ ] Command reads like a recipe (step 1, step 2, step 3...)
- [ ] Each step is a service method call
- [ ] No loops (`for`, `forEach`, `while`, `map`, `filter`)
- [ ] No conditionals implementing logic (`if/else` for business rules)
- [ ] No calculations (`Math.`, arithmetic beyond simple addition)
- [ ] No object/array manipulation (only shallow spreading for state updates)
- [ ] All logic delegated to services
- [ ] Maximum ~20-30 lines (orchestration should be concise)

**❌ Red Flags:**
```typescript
// ❌ Logic in command
visibleCells.forEach((key) => {        // Loop!
  const pos = this.fovService.keyToPos(key)
  if (updatedLevel.explored[pos.y]) {  // Conditional logic!
    updatedLevel.explored[pos.y][pos.x] = true  // Array manipulation!
  }
})

// ✅ Orchestration only
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
```

**Common Violations & Fixes:**

| Violation | Fix |
|-----------|-----|
| Loop through items to find match | Extract to service: `findItemById()` |
| Calculate damage in command | Extract to service: `calculateDamage()` |
| Update explored tiles in loop | Extract to service: `updateExploredTiles()` |
| Check multiple conditions | Extract to service: `canPerformAction()` |

---

### For Services (CombatService, FOVService, etc.)

**✅ Passes if:**
- [ ] Service contains ALL logic for its domain
- [ ] Methods are pure functions (no side effects when possible)
- [ ] Dependencies injected via constructor (especially RandomService)
- [ ] State updates return NEW objects (immutability)
- [ ] No direct DOM manipulation
- [ ] No direct user input handling
- [ ] Well-tested (>80% coverage)

**❌ Red Flags:**
```typescript
// ❌ Mutation
tickFuel(light: LightSource): LightSource {
  light.fuel -= 1  // Mutation!
  return light
}

// ✅ Immutability
tickFuel(light: LightSource): LightSource {
  return { ...light, fuel: light.fuel - 1 }
}
```

**Dependency Injection Check:**
```typescript
// ❌ Bad - hardcoded dependency
class CombatService {
  calculateDamage() {
    return Math.floor(Math.random() * 10)  // Not testable!
  }
}

// ✅ Good - injected dependency
class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(dice: string) {
    return this.random.roll(dice)  // Testable with MockRandom!
  }
}
```

---

### For UI Layer (index.html, main.ts, renderers)

**✅ Passes if:**
- [ ] Only renders GameState to DOM
- [ ] Only captures user input (keyboard, mouse)
- [ ] Converts input to Commands
- [ ] NO calculations
- [ ] NO game rules
- [ ] NO state mutations

**❌ Red Flags:**
```typescript
// ❌ Logic in UI
button.onclick = () => {
  player.hp -= damage  // Game logic in UI!
  if (player.hp <= 0) {
    alert('Game Over')
  }
}

// ✅ Delegation to command
button.onclick = () => {
  const command = new AttackCommand(services)
  const newState = command.execute(state)
  render(newState)
}
```

---

## Case Study: MoveCommand Refactoring (commit 9be65e6)

**Violation Found**: Exploration tracking logic in MoveCommand

**Before** (11 lines of logic):
```typescript
const updatedLevel = {
  ...level,
  explored: level.explored.map((row) => [...row]),
}
visibleCells.forEach((key) => {
  const pos = this.fovService.keyToPos(key)
  if (updatedLevel.explored[pos.y]) {
    updatedLevel.explored[pos.y][pos.x] = true
  }
})
```

**After** (1 line of orchestration):
```typescript
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
```

**Impact**:
- Command simplified from 11 lines to 1
- Logic extracted to `FOVService.updateExploredTiles()`
- New test file: `exploration-tracking.test.ts` (9 tests)
- Reusable across codebase
- Follows architecture guidelines

**Red Flags Detected**:
1. `forEach` loop in command
2. Array manipulation (`map`)
3. Direct array access (`explored[pos.y][pos.x]`)
4. Conditional logic (`if`)

**Lesson**: Commands should read like a recipe, not implement the recipe.

---

## Detection Tips

### How to Spot Logic in Commands

**Look for these patterns:**
- Loops: `for`, `forEach`, `while`, `map`, `filter`, `reduce`
- Array/Object manipulation: `push`, `splice`, `Object.keys`, `Object.entries`
- Calculations: `Math.`, `+`, `-`, `*`, `/`, `%`
- String manipulation: `split`, `join`, `substring`, `replace`
- Complex conditionals: nested `if/else`, `switch` statements with business logic
- Direct property access to mutate: `obj.prop = value`

**Exception**: Simple orchestration conditionals are OK:
```typescript
// ✅ OK - orchestration conditional
if (monster) {
  return this.combatService.attack(player, monster)  // Delegates to service
} else {
  return this.movementService.move(player, position)  // Delegates to service
}

// ❌ Bad - logic conditional
if (player.hp < monster.damage * 2) {  // Business rule calculation!
  return this.flee()
}
```

---

## Quick Refactoring Guide

### Step 1: Identify the Logic
- What is the command doing?
- What is the domain? (combat, movement, inventory, FOV, etc.)

### Step 2: Find or Create the Service
- Does a service already handle this domain?
- If yes, add method to existing service
- If no, create new service

### Step 3: Extract to Service Method
- Move logic to service
- Return new state (immutability)
- Add bounds checking, validation

### Step 4: Update Command
- Replace logic with single service call
- Update tests to verify behavior unchanged

### Step 5: Write Service Tests
- Create scenario-based test file
- Test happy path + edge cases
- Test immutability (original unchanged)

---

## Review Questions

Before committing, ask yourself:

1. **For Commands**: "Could I explain this command's flow to someone in 3 sentences?"
   - Yes → Probably good orchestration
   - No → Might have too much logic

2. **For Services**: "Is this logic testable in isolation?"
   - Yes → Properly separated
   - No → Might have UI dependencies

3. **For All Code**: "Does this follow the Single Responsibility Principle?"
   - Yes → Good separation of concerns
   - No → Refactor needed

4. **For State Updates**: "Am I returning a new object or mutating?"
   - New object → ✅ Immutable
   - Mutating → ❌ Fix it

---

## When to Skip This Review

**Quick fixes OK to commit without deep review:**
- Documentation updates
- Test additions (no implementation changes)
- Bug fixes in existing services (already reviewed architecture)
- UI styling changes (CSS only)

**Always review for:**
- New commands
- New services
- Major refactors
- Logic moved between layers

---

## Tools & Automation

### Future Improvements

Consider adding:
1. **ESLint rules** to catch violations automatically
2. **Pre-commit hooks** to run architectural checks
3. **Code review template** with architecture checklist
4. **Automated tests** that verify no logic in commands

### Manual Checks (Until Automated)

Before each commit:
```bash
# Search for loops in commands
grep -r "forEach\|for (\|while (" src/commands/

# Search for calculations in commands
grep -r "Math\.\|[\+\-\*\/]" src/commands/

# Search for array manipulation in commands
grep -r "\.map(\|\.filter(\|\.reduce(" src/commands/
```

If any matches found in commands, review carefully!

---

## Resources

- [Architecture Doc](./architecture.md#architecture-layers)
- [CLAUDE.md Common Pitfalls](../CLAUDE.md#common-pitfalls)
- [Testing Strategy](./testing-strategy.md)
- [Real Example: MoveCommand Refactoring](https://github.com/yourrepo/commit/9be65e6)

---

**Last Updated**: 2025-10-04
**Maintained By**: Project architecture team
