# Troubleshooting Guide

**Common issues and solutions** for development, testing, and runtime problems.

**Audience**: All developers
**Related Docs**: [Getting Started](./getting-started.md) | [Contributing](./contributing.md) | [CLAUDE.md](../CLAUDE.md)

---

## Build Issues

### "Cannot find module '@services/ServiceName'"

**Problem**: TypeScript can't resolve path aliases

**Solutions**:
1. **Check tsconfig.json** - Verify paths are configured:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@services/*": ["./src/services/*"],
         "@commands/*": ["./src/commands/*"],
         "@game/*": ["./src/types/*"],
         "@ui/*": ["./src/ui/*"]
       }
     }
   }
   ```

2. **Restart TypeScript server** in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

3. **Check import path**: Use `@services/ServiceName` not `@services/ServiceName/ServiceName`
   ```typescript
   // ✅ Correct
   import { FOVService } from '@services/FOVService'

   // ❌ Wrong
   import { FOVService } from '@services/FOVService/FOVService'
   ```

---

### "TypeScript compilation errors after pull"

**Problem**: Type definitions out of sync

**Solutions**:
1. **Clean install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node/npm versions**:
   ```bash
   node --version  # Should be ≥18.0.0
   npm --version   # Should be ≥9.0.0
   ```

3. **Rebuild**:
   ```bash
   npm run build
   ```

---

### "npm install fails"

**Problem**: Dependency version conflicts

**Solutions**:
1. **Use exact npm version**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Check package.json** for conflicting dependencies

3. **Clear npm cache**:
   ```bash
   npm cache clean --force
   npm install
   ```

---

## Test Issues

### "Tests flaky / random failures"

**Problem**: Using `Math.random()` instead of `IRandomService`

**Solution**: Inject `IRandomService`, use `MockRandom` in tests:

```typescript
// ❌ Bad - non-deterministic
class CombatService {
  calculateDamage() {
    return Math.floor(Math.random() * 10)  // Flaky!
  }
}

// ✅ Good - deterministic
class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(dice: string) {
    return this.random.roll(dice)  // Mockable!
  }
}

// Test with MockRandom
test('damage calculation', () => {
  const mockRandom = new MockRandom([8])  // Always returns 8
  const service = new CombatService(mockRandom)

  expect(service.calculateDamage('1d8')).toBe(8)  // Predictable!
})
```

**See**: [Testing Strategy - MockRandom](./testing-strategy.md#mockrandom-deterministic-testing)

---

### "Coverage below 80%"

**Problem**: Missing test scenarios

**Solutions**:
1. **Run coverage report**:
   ```bash
   npm run test:coverage
   ```

2. **Check uncovered lines** - Focus on:
   - Error paths (guard clauses)
   - Edge cases (empty arrays, null values)
   - Branching logic (if/else, switch)

3. **Add scenario-based tests**:
   ```typescript
   // Cover all branches
   describe('ServiceName - Error Handling', () => {
     test('returns null when input is empty')
     test('throws error when input is invalid')
     test('handles edge case: array with 1 element')
   })
   ```

**See**: [Service Testing Guide](./services/testing-guide.md)

---

### "Mock not working"

**Problem**: Service not injected properly

**Solution**: Verify dependency injection:

```typescript
// ❌ Bad - hardcoded dependency
class MoveCommand {
  execute(state: GameState) {
    const service = new MovementService()  // Can't mock!
    return service.move(state)
  }
}

// ✅ Good - injected dependency
class MoveCommand {
  constructor(private movementService: MovementService) {}

  execute(state: GameState) {
    return this.movementService.move(state)  // Mockable!
  }
}

// Test with mock
test('MoveCommand delegates to MovementService', () => {
  const mockService = { move: jest.fn() } as any
  const command = new MoveCommand(mockService)

  command.execute(state)
  expect(mockService.move).toHaveBeenCalled()
})
```

---

## Architecture Issues

### "How do I know if logic belongs in service or command?"

**Decision tree**:

```
Is it a calculation, algorithm, or business rule?
├─ YES → Service
└─ NO → Is it coordinating multiple services?
    ├─ YES → Command (orchestration only)
    └─ NO → UI (render/input only)
```

**Examples**:
- **Service**: Calculate damage, check FOV, generate dungeon
- **Command**: Call services in order (move → hunger → fuel → FOV)
- **UI**: Render grid, capture keyboard, display messages

**Red flags** (move to service):
- Loops in commands
- Calculations in commands
- Array/object manipulation in commands

**See**: [Architectural Review](./ARCHITECTURAL_REVIEW.md)

---

### "Command too large (>200 lines)"

**Problem**: Command has too much logic

**Solutions**:
1. **Extract logic to service**:
   ```typescript
   // ❌ Bad - logic in command
   execute() {
     for (let cell of visibleCells) {  // Loop!
       const pos = this.keyToPos(cell)
       level.explored[pos.y][pos.x] = true  // Logic!
     }
   }

   // ✅ Good - extracted to service
   execute() {
     const level = this.fovService.updateExploredTiles(level, visibleCells)
   }
   ```

2. **Split into multiple commands** (if handling multiple user actions)

3. **Use private helper methods** (only for orchestration, not logic)

---

### "Service has circular dependency"

**Problem**: ServiceA → ServiceB → ServiceA

**Solutions**:
1. **Extract shared logic** to new service:
   ```
   ServiceA → CommonService ← ServiceB
   ```

2. **Pass data instead of service**:
   ```typescript
   // ❌ Bad
   class ServiceA {
     constructor(private serviceB: ServiceB) {}
   }

   // ✅ Good
   class ServiceA {
     method(data: DataFromB) {
       // Use data, not ServiceB
     }
   }
   ```

3. **Rethink responsibilities** - Violation of Single Responsibility Principle

---

## Runtime Issues

### "FOV not updating after movement"

**Problem**: Light source not equipped or fuel depleted

**Solutions**:
1. **Check light source**:
   ```typescript
   console.log(player.equipment.lightSource)  // Should not be null
   console.log(player.equipment.lightSource.fuel)  // Should be > 0
   ```

2. **Check FOV service call**:
   ```typescript
   const radius = lightingService.getLightRadius(lightSource)
   const visibleCells = fovService.computeFOV(position, radius, level)
   ```

3. **Check fuel depletion** - Torches run out after 500 turns

---

### "State not rendering after update"

**Problem**: Mutation instead of immutability

**Solution**: Always return NEW objects:

```typescript
// ❌ Bad - mutation
tickFuel(light: LightSource) {
  light.fuel -= 1  // MUTATES original!
  return light
}

// ✅ Good - immutability
tickFuel(light: LightSource) {
  return { ...light, fuel: light.fuel - 1 }  // NEW object
}
```

**How to debug**:
1. Add `Object.freeze()` in dev mode to catch mutations
2. Check if state reference changed: `oldState !== newState`
3. Use Redux DevTools (if integrated) to inspect state changes

---

### "Monsters not moving"

**Problem**: Monsters sleeping or no pathfinding

**Solutions**:
1. **Check monster state**:
   ```typescript
   console.log(monster.state)  // Should be HUNTING, not SLEEPING
   ```

2. **Check wake-up logic**:
   ```typescript
   // Monsters wake when player is close
   const distance = Math.abs(player.x - monster.x) + Math.abs(player.y - monster.y)
   if (distance <= monster.aiProfile.aggroRange) {
     // Should wake up
   }
   ```

3. **Check AI behavior** - STATIONARY monsters never move

---

## Common Error Messages

### "Maximum call stack size exceeded"

**Problem**: Infinite recursion (often in FOV or pathfinding)

**Solutions**:
1. **Add depth limit**:
   ```typescript
   computeFOV(pos, radius, level, depth = 0) {
     if (depth > 50) return  // Safety limit
     // ... recursive logic
   }
   ```

2. **Check for circular references** in data structures

---

### "Cannot read property 'x' of undefined"

**Problem**: Missing null checks (often level or monster)

**Solutions**:
1. **Add guard clauses**:
   ```typescript
   execute(state: GameState) {
     const level = state.levels.get(state.currentLevel)
     if (!level) return state  // Guard!

     // ... rest of logic
   }
   ```

2. **Use optional chaining**:
   ```typescript
   const fuel = player.equipment.lightSource?.fuel ?? 0
   ```

---

### "Test timeout (5000ms exceeded)"

**Problem**: Infinite loop in test (often pathfinding)

**Solutions**:
1. **Add max iterations**:
   ```typescript
   findPath(start, goal, maxDepth = 100) {
     let depth = 0
     while (depth < maxDepth) {
       depth++
       // ... pathfinding logic
     }
   }
   ```

2. **Increase timeout** (last resort):
   ```typescript
   test('complex pathfinding', () => {
     // ...
   }, 10000)  // 10 second timeout
   ```

---

## Still Having Issues?

1. **Check related docs**:
   - [Getting Started](./getting-started.md) - Setup and basics
   - [Architecture](./architecture.md) - Layer responsibilities
   - [Testing Strategy](./testing-strategy.md) - Test patterns

2. **Search existing issues**: [GitHub Issues](https://github.com/dirkkok101/roguelike/issues)

3. **Open new issue**: Include error message, stack trace, steps to reproduce

---

**Version**: 1.0
**Last Updated**: 2025-10-06
**Maintainer**: Dirk Kok
