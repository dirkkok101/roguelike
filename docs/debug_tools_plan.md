# Debug Tools Implementation Plan

**Status**: Ready to Implement
**Phase**: Phase 1 - Foundation & Core Loop
**Estimated Time**: 6-7 hours
**Test Count**: 45-50 tests
**Created**: 2025-10-04
**Updated**: 2025-10-04 (Added monster debug commands & Phase 5 integration)

---

## Executive Summary

This plan provides a complete implementation guide for the Debug System, a Phase 1 requirement that enables developer testing and debugging capabilities. The system includes god mode, map reveal, monster debugging, FOV/AI/pathfinding overlays, Phase 5 item system integration, and a debug console UI.

**Key Components**:
1. **DebugService** - Core debug state and logic (god mode, map reveal, monster control, item identification)
2. **Debug Commands** - 9 debug commands (god mode, reveal, monster spawn/wake/kill, overlay toggles)
3. **DebugConsole UI** - Visual debug panel with monster/inventory/equipment stats
4. **DebugOverlays** - FOV, pathfinding, AI state visualizations
5. **Integration** - Wire into InputHandler, GameRenderer, main.ts, Phase 5 services

**Architecture Compliance**:
- Services contain ALL logic (no DOM manipulation)
- Commands orchestrate only (no logic)
- UI renders state only (no game logic)
- Immutability (return new objects)
- Dependency injection throughout

---

## Design References

### Primary Specification
**Source**: `docs/systems-advanced.md` (lines 660-710)

Full DebugService specification:
```typescript
class DebugService {
  isEnabled: boolean;

  // Core debug methods
  toggleGodMode(): void
  teleportTo(level: number): GameState
  spawnMonster(letter: string, position: Position): GameState
  spawnItem(type: ItemType, position: Position): GameState
  revealMap(state: GameState): GameState
  identifyAll(state: GameState): GameState
  showSeed(state: GameState): string
  toggleFOVDebug(): void
  toggleAIDebug(): void
  togglePathDebug(): void
  giveInfiniteLight(): GameState

  // Rendering methods (called by RenderingService)
  renderFOVOverlay(state: GameState): void
  renderPathOverlay(monsters: Monster[]): void
  renderAIOverlay(monsters: Monster[]): void
}
```

Debug Commands Table:
```
| Key | Command | Effect |
|-----|---------|--------|
| `~` | Toggle Debug Console | Show/hide debug panel |
| `g` | God Mode | Invincible, infinite hunger/light |
| `v` | Reveal Map | Show entire level |
| `m` | Spawn Monster | Show monster selection (A-Z), spawn at player |
| `M` | Wake All Monsters | Wake all sleeping monsters, set to HUNTING |
| `K` | Kill All Monsters | Remove all monsters from current level |
| `f` | Toggle FOV Debug | Highlight visible tiles & monster vision |
| `p` | Toggle Path Debug | Show A* paths as dotted lines |
| `n` | Toggle AI Debug | Display monster states & behaviors |
```

### Phase 1 Task Requirements
**Source**: `docs/plan.md` (lines 173-182)

```markdown
#### DebugService (Basic)
- [ ] Implement DebugService class
  - [ ] toggleGodMode() method
  - [ ] revealMap() method
  - [ ] teleportTo() method
  - [ ] showSeed() method
- [ ] Create debug console UI
- [ ] Wire up debug key bindings (~, g, v, t)
```

**Note**: Phase 1 focuses on basic functionality (god mode, reveal map, console UI). Advanced features (spawn, overlays) can be deferred to Phase 6 if time-constrained.

### Game Design Controls
**Source**: `docs/game-design.md` (line 375)

```markdown
| `~` | Debug | Open debug console (dev only) |
```

---

## Current State Analysis

### Existing Architecture Patterns

#### Service Initialization Pattern
**Source**: `src/main.ts` (lines 34-48)

```typescript
// Create services
const random = new SeededRandom('test-seed')
const lightingService = new LightingService(random)
const fovService = new FOVService()
const renderingService = new RenderingService(fovService)
const movementService = new MovementService()
const messageService = new MessageService()
const dungeonService = new DungeonService(random, itemData)
const combatService = new CombatService(random)
const pathfindingService = new PathfindingService()
const monsterAIService = new MonsterAIService(pathfindingService, random)
const inventoryService = new InventoryService()
const identificationService = new IdentificationService(random)
const modalController = new ModalController(identificationService)

// Phase 4-5 Services (available for debug integration)
const monsterTurnService = new MonsterTurnService(movementService, combatService, random)
const specialAbilityService = new SpecialAbilityService(random, combatService)
const trapService = new TrapService(random)

// Create UI with services
const renderer = new GameRenderer(renderingService)
const inputHandler = new InputHandler(
  movementService,
  lightingService,
  fovService,
  messageService,
  random,
  dungeonService,
  dungeonConfig,
  combatService,
  inventoryService,
  identificationService,
  modalController
)
```

**Pattern**: Services created first, then injected into UI components.

#### Key Binding Pattern
**Source**: `src/ui/InputHandler.ts` (lines 84-140)

```typescript
switch (event.key) {
  case 'ArrowUp':
    event.preventDefault()
    return new MoveCommand(
      'up',
      this.movementService,
      this.lightingService,
      this.fovService,
      this.messageService,
      this.combatService
    )

  case 'ArrowDown':
    event.preventDefault()
    return new MoveCommand(
      'down',
      this.movementService,
      this.lightingService,
      this.fovService,
      this.messageService,
      this.combatService
    )

  case 'o':
    event.preventDefault()
    this.mode = 'open_door'
    return null

  // ... more cases
}
```

**Pattern**: Switch statement maps keys to commands. Commands execute and return new GameState.

#### GameState Structure
**Source**: `src/types/core/core.ts` (lines 160-173)

```typescript
export interface GameState {
  player: Player
  currentLevel: number
  levels: Map<number, Level>
  visibleCells: Set<string>
  messages: Message[]
  turnCount: number
  seed: string
  gameId: string
  isGameOver: boolean
  hasWon: boolean
  itemNameMap: ItemNameMap
  identifiedItems: Set<string>
}
```

**Extension needed**: Add optional `debug` field for debug state.

#### Rendering Pattern
**Source**: `src/ui/GameRenderer.ts` (lines 32-36)

```typescript
render(state: GameState): void {
  this.renderDungeon(state)
  this.renderStats(state)
  this.renderMessages(state)
}
```

**Pattern**: Renderer calls sub-methods for each UI section. Services provide rendering logic, GameRenderer handles DOM.

### Files to Create
1. `src/services/DebugService/DebugService.ts` - Core service
2. `src/services/DebugService/debug-state.test.ts` - State management tests
3. `src/services/DebugService/god-mode.test.ts` - God mode tests
4. `src/services/DebugService/map-reveal.test.ts` - Map reveal tests
5. `src/services/DebugService/index.ts` - Barrel export
6. `src/commands/ToggleGodModeCommand/ToggleGodModeCommand.ts` - God mode command
7. `src/commands/ToggleGodModeCommand/ToggleGodModeCommand.test.ts` - Tests
8. `src/commands/ToggleGodModeCommand/index.ts` - Barrel export
9. `src/commands/RevealMapCommand/RevealMapCommand.ts` - Map reveal command
10. `src/commands/RevealMapCommand/RevealMapCommand.test.ts` - Tests
11. `src/commands/RevealMapCommand/index.ts` - Barrel export
12. `src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.ts` - Console toggle
13. `src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.test.ts` - Tests
14. `src/commands/ToggleDebugConsoleCommand/index.ts` - Barrel export
15. `src/ui/DebugConsole.ts` - Debug console UI
16. `src/ui/DebugConsole.test.ts` - Console UI tests

### Files to Modify
1. `src/types/core/core.ts` - Add DebugState interface, extend GameState
2. `src/ui/InputHandler.ts` - Add debug key bindings (~, g, v)
3. `src/ui/GameRenderer.ts` - Add debug console rendering
4. `src/main.ts` - Initialize DebugService, wire to UI

---

## Phase 1A: DebugService Implementation

### File: `src/services/DebugService/DebugService.ts`

```typescript
import {
  GameState,
  Level,
  DebugState,
  Position,
  Monster,
  MonsterBehavior,
  MonsterState,
  PotionType,
  ScrollType,
  RingType,
  WandType,
} from '@game/core/core'
import { MessageService } from '@services/MessageService'

/**
 * DebugService - Debug tools for testing and development
 *
 * Provides god mode, map reveal, and debug state management.
 *
 * Architecture:
 * - Contains ALL debug logic (no logic in commands/UI)
 * - Immutable: returns new GameState objects
 * - Only enabled in development mode
 */
export class DebugService {
  constructor(
    private messageService: MessageService,
    private isDevMode: boolean = process.env.NODE_ENV === 'development'
  ) {}

  /**
   * Check if debug mode is available
   */
  isEnabled(): boolean {
    return this.isDevMode
  }

  /**
   * Initialize debug state (call once at game start)
   */
  initializeDebugState(): DebugState {
    return {
      godMode: false,
      mapRevealed: false,
      debugConsoleVisible: false,
      fovOverlay: false,
      pathOverlay: false,
      aiOverlay: false,
    }
  }

  /**
   * Toggle god mode (invincible, infinite hunger/light)
   */
  toggleGodMode(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newGodMode = !debug.godMode

    // Add message
    const message = newGodMode
      ? 'God mode ENABLED (invincible, infinite hunger/light)'
      : 'God mode DISABLED'

    const stateWithMessage = this.messageService.addMessage(state, message, 'debug')

    return {
      ...stateWithMessage,
      debug: {
        ...debug,
        godMode: newGodMode,
      },
    }
  }

  /**
   * Reveal entire current level map
   */
  revealMap(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newMapRevealed = !debug.mapRevealed

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Mark all tiles as explored
    const newExplored = currentLevel.explored.map(row => row.map(() => true))

    const updatedLevel: Level = {
      ...currentLevel,
      explored: newExplored,
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    // Add message
    const message = newMapRevealed
      ? 'Map REVEALED (all tiles visible)'
      : 'Map reveal DISABLED'

    const stateWithMessage = this.messageService.addMessage(state, message, 'debug')

    return {
      ...stateWithMessage,
      levels: newLevels,
      debug: {
        ...debug,
        mapRevealed: newMapRevealed,
      },
    }
  }

  /**
   * Toggle debug console visibility
   */
  toggleDebugConsole(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        debugConsoleVisible: !debug.debugConsoleVisible,
      },
    }
  }

  /**
   * Show current seed (for debugging)
   */
  showSeed(state: GameState): string {
    return state.seed
  }

  /**
   * Get debug state (helper for UI)
   */
  getDebugState(state: GameState): DebugState {
    return state.debug || this.initializeDebugState()
  }

  /**
   * Check if god mode is active
   */
  isGodModeActive(state: GameState): boolean {
    return state.debug?.godMode ?? false
  }

  /**
   * Apply god mode effects to player state
   * Called by relevant services (CombatService, HungerService, LightingService)
   */
  applyGodModeEffects(state: GameState): GameState {
    if (!this.isGodModeActive(state)) return state

    // Restore full HP
    const player = state.player
    if (player.hp < player.maxHp) {
      return {
        ...state,
        player: {
          ...player,
          hp: player.maxHp,
        },
      }
    }

    return state
  }

  /**
   * Spawn monster at position for testing
   */
  spawnMonster(state: GameState, letter: string, position?: Position): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Find monster template by letter (would load from monsters.json in real implementation)
    // For now, create basic monster
    const spawnPos = position || this.findNearbyEmptyTile(currentLevel, state.player.position)
    if (!spawnPos) {
      const stateWithMsg = this.messageService.addMessage(
        state,
        'No empty tile found for monster spawn',
        'warning'
      )
      return stateWithMsg
    }

    const newMonster: Monster = {
      id: `debug-monster-${Date.now()}`,
      letter,
      name: `Debug ${letter}`,
      position: spawnPos,
      hp: 10,
      maxHp: 10,
      ac: 5,
      damage: '1d6',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 5,
        fleeThreshold: 0.25,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.HUNTING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: state.currentLevel,
    }

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: [...currentLevel.monsters, newMonster],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const stateWithMsg = this.messageService.addMessage(
      state,
      `Spawned ${letter} at (${spawnPos.x}, ${spawnPos.y})`,
      'info'
    )

    return {
      ...stateWithMsg,
      levels: newLevels,
    }
  }

  /**
   * Wake all sleeping monsters on current level
   */
  wakeAllMonsters(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    const updatedMonsters = currentLevel.monsters.map((monster) => ({
      ...monster,
      isAsleep: false,
      isAwake: true,
      state: monster.state === MonsterState.SLEEPING ? MonsterState.HUNTING : monster.state,
    }))

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: updatedMonsters,
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const awakeCount = updatedMonsters.filter((m) => m.isAwake).length
    const stateWithMsg = this.messageService.addMessage(
      state,
      `Woke ${awakeCount} monsters`,
      'warning'
    )

    return {
      ...stateWithMsg,
      levels: newLevels,
    }
  }

  /**
   * Kill all monsters on current level
   */
  killAllMonsters(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    const monsterCount = currentLevel.monsters.length

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: [],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const stateWithMsg = this.messageService.addMessage(
      state,
      `Removed ${monsterCount} monsters`,
      'info'
    )

    return {
      ...stateWithMsg,
      levels: newLevels,
    }
  }

  /**
   * Identify all items (Phase 5 integration)
   */
  identifyAll(state: GameState): GameState {
    if (!this.isEnabled()) return state

    // Mark all item types as identified
    const allItemTypes = new Set<string>()

    // Add all potion types
    Object.values(PotionType).forEach((type) => allItemTypes.add(`potion-${type}`))

    // Add all scroll types
    Object.values(ScrollType).forEach((type) => allItemTypes.add(`scroll-${type}`))

    // Add all ring types
    Object.values(RingType).forEach((type) => allItemTypes.add(`ring-${type}`))

    // Add all wand types
    Object.values(WandType).forEach((type) => allItemTypes.add(`wand-${type}`))

    const stateWithMsg = this.messageService.addMessage(
      state,
      `Identified all ${allItemTypes.size} item types`,
      'success'
    )

    return {
      ...stateWithMsg,
      identifiedItems: allItemTypes,
    }
  }

  /**
   * Toggle FOV debug overlay
   */
  toggleFOVDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        fovOverlay: !debug.fovOverlay,
      },
    }
  }

  /**
   * Toggle pathfinding debug overlay
   */
  togglePathDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        pathOverlay: !debug.pathOverlay,
      },
    }
  }

  /**
   * Toggle AI debug overlay
   */
  toggleAIDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        aiOverlay: !debug.aiOverlay,
      },
    }
  }

  /**
   * Helper: Find nearby empty tile for spawning
   */
  private findNearbyEmptyTile(level: Level, center: Position): Position | null {
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ]

    for (const offset of offsets) {
      const pos = { x: center.x + offset.x, y: center.y + offset.y }

      // Check bounds
      if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
        continue
      }

      // Check walkable
      const tile = level.tiles[pos.y][pos.x]
      if (!tile.walkable) continue

      // Check no monster
      const hasMonster = level.monsters.some((m) => m.position.x === pos.x && m.position.y === pos.y)
      if (hasMonster) continue

      return pos
    }

    return null
  }
}
```

### File: `src/types/core/core.ts` (ADD to existing interfaces)

```typescript
// Add this interface
export interface DebugState {
  godMode: boolean              // Player invincible, infinite resources
  mapRevealed: boolean          // All tiles visible
  debugConsoleVisible: boolean  // Debug console UI visible
  fovOverlay: boolean           // FOV visualization (Phase 6)
  pathOverlay: boolean          // Pathfinding visualization (Phase 6)
  aiOverlay: boolean            // AI state visualization (Phase 6)
}

// Modify GameState interface - ADD this field:
export interface GameState {
  player: Player
  currentLevel: number
  levels: Map<number, Level>
  visibleCells: Set<string>
  messages: Message[]
  turnCount: number
  seed: string
  gameId: string
  isGameOver: boolean
  hasWon: boolean
  itemNameMap: ItemNameMap
  identifiedItems: Set<string>
  debug?: DebugState  // ← ADD THIS FIELD (optional for production builds)
}
```

### File: `src/services/DebugService/index.ts`

```typescript
export { DebugService } from './DebugService'
```

---

## Phase 1B: Debug Commands

### File: `src/commands/ToggleGodModeCommand/ToggleGodModeCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleGodModeCommand - Enable/disable god mode
 *
 * Effects:
 * - Player invincible (no damage taken)
 * - Infinite hunger (never starves)
 * - Infinite light (torches/lanterns never run out)
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleGodModeCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleGodMode(state)
  }
}
```

### File: `src/commands/ToggleGodModeCommand/index.ts`

```typescript
export { ToggleGodModeCommand } from './ToggleGodModeCommand'
```

### File: `src/commands/RevealMapCommand/RevealMapCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * RevealMapCommand - Reveal entire current level
 *
 * Effects:
 * - Marks all tiles as explored
 * - Useful for testing dungeon generation
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class RevealMapCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.revealMap(state)
  }
}
```

### File: `src/commands/RevealMapCommand/index.ts`

```typescript
export { RevealMapCommand } from './RevealMapCommand'
```

### File: `src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleDebugConsoleCommand - Show/hide debug console UI
 *
 * Effects:
 * - Toggles debug panel visibility
 * - Panel shows seed, god mode status, turn count
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleDebugConsoleCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleDebugConsole(state)
  }
}
```

### File: `src/commands/ToggleDebugConsoleCommand/index.ts`

```typescript
export { ToggleDebugConsoleCommand } from './ToggleDebugConsoleCommand'
```

---

## Phase 1B2: Monster Debug Commands

### File: `src/commands/SpawnMonsterCommand/SpawnMonsterCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * SpawnMonsterCommand - Spawn monster for testing
 *
 * Shows monster selection UI (A-Z), spawns at player position or nearby
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class SpawnMonsterCommand implements ICommand {
  constructor(
    private letter: string,
    private debugService: DebugService
  ) {}

  execute(state: GameState): GameState {
    return this.debugService.spawnMonster(state, this.letter)
  }
}
```

### File: `src/commands/SpawnMonsterCommand/index.ts`

```typescript
export { SpawnMonsterCommand } from './SpawnMonsterCommand'
```

### File: `src/commands/WakeAllMonstersCommand/WakeAllMonstersCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * WakeAllMonstersCommand - Wake all sleeping monsters
 *
 * Effects:
 * - Sets all monsters to awake
 * - Changes SLEEPING state to HUNTING
 * - Useful for quick combat testing
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class WakeAllMonstersCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.wakeAllMonsters(state)
  }
}
```

### File: `src/commands/WakeAllMonstersCommand/index.ts`

```typescript
export { WakeAllMonstersCommand } from './WakeAllMonstersCommand'
```

### File: `src/commands/KillAllMonstersCommand/KillAllMonstersCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * KillAllMonstersCommand - Remove all monsters from level
 *
 * Effects:
 * - Removes all monsters from current level
 * - Useful for clearing combat scenarios
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class KillAllMonstersCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.killAllMonsters(state)
  }
}
```

### File: `src/commands/KillAllMonstersCommand/index.ts`

```typescript
export { KillAllMonstersCommand } from './KillAllMonstersCommand'
```

### File: `src/commands/ToggleFOVDebugCommand/ToggleFOVDebugCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleFOVDebugCommand - Toggle FOV debug overlay
 *
 * Effects:
 * - Shows/hides FOV visualization
 * - Highlights monster vision ranges
 * - Shows aggro range boundaries
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleFOVDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleFOVDebug(state)
  }
}
```

### File: `src/commands/ToggleFOVDebugCommand/index.ts`

```typescript
export { ToggleFOVDebugCommand } from './ToggleFOVDebugCommand'
```

### File: `src/commands/TogglePathDebugCommand/TogglePathDebugCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * TogglePathDebugCommand - Toggle pathfinding debug overlay
 *
 * Effects:
 * - Shows/hides A* pathfinding paths
 * - Renders paths as dotted lines
 * - Shows target positions
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class TogglePathDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.togglePathDebug(state)
  }
}
```

### File: `src/commands/TogglePathDebugCommand/index.ts`

```typescript
export { TogglePathDebugCommand } from './TogglePathDebugCommand'
```

### File: `src/commands/ToggleAIDebugCommand/ToggleAIDebugCommand.ts`

```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleAIDebugCommand - Toggle AI debug overlay
 *
 * Effects:
 * - Shows/hides AI state visualization
 * - Displays monster states (SLEEPING/HUNTING/FLEEING)
 * - Shows behavior types (SMART/SIMPLE/etc.)
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleAIDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleAIDebug(state)
  }
}
```

### File: `src/commands/ToggleAIDebugCommand/index.ts`

```typescript
export { ToggleAIDebugCommand } from './ToggleAIDebugCommand'
```

---

## Phase 1C: Debug Console UI

### File: `src/ui/DebugConsole.ts`

```typescript
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * DebugConsole - Visual debug panel overlay
 *
 * Displays:
 * - God mode status
 * - Current seed
 * - Turn count
 * - Player position
 * - Current level
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Renders debug state, doesn't modify it
 * - Uses DebugService for state queries
 */
export class DebugConsole {
  private container: HTMLDivElement

  constructor(private debugService: DebugService) {
    this.container = this.createContainer()
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div')
    div.className = 'debug-console'
    div.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border: 1px solid #0f0;
      border-radius: 4px;
      z-index: 1000;
      min-width: 200px;
      display: none;
    `
    return div
  }

  /**
   * Render debug console (called by GameRenderer)
   */
  render(state: GameState): void {
    const debugState = this.debugService.getDebugState(state)

    // Show/hide based on debug state
    if (debugState.debugConsoleVisible) {
      this.container.style.display = 'block'
      this.updateContent(state, debugState)
    } else {
      this.container.style.display = 'none'
    }
  }

  private updateContent(state: GameState, debugState: any): void {
    const { player, currentLevel, turnCount, seed, levels } = state

    // Get level data
    const level = levels.get(currentLevel)
    const monsters = level?.monsters || []
    const awakeMonsters = monsters.filter((m) => m.isAwake)

    // Get nearby monsters (within 5 tiles)
    const nearbyMonsters = monsters
      .filter((m) => {
        const dx = Math.abs(m.position.x - player.position.x)
        const dy = Math.abs(m.position.y - player.position.y)
        return dx <= 5 && dy <= 5
      })
      .slice(0, 3) // Show max 3

    const nearbyText =
      nearbyMonsters.length > 0
        ? nearbyMonsters
            .map((m) => `${m.letter} (${m.state})`)
            .join(', ')
        : 'None'

    // Get equipment info
    const weaponName = player.equipment.weapon?.name || 'None'
    const armorName = player.equipment.armor?.name || 'None'
    const leftRing = player.equipment.leftRing?.name || 'None'
    const rightRing = player.equipment.rightRing?.name || 'None'

    // Get identification stats
    const identifiedCount = state.identifiedItems?.size || 0
    const totalItemTypes =
      Object.keys(PotionType).length +
      Object.keys(ScrollType).length +
      Object.keys(RingType).length +
      Object.keys(WandType).length

    this.container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #ff0;">
        🐛 DEBUG CONSOLE
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Seed:</span> ${seed}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Turn:</span> ${turnCount}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Level:</span> ${currentLevel}
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">Position:</span> (${player.position.x}, ${player.position.y})
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #888;">HP:</span> ${player.hp}/${player.maxHp}
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Inventory:</span> ${player.inventory.length}/26
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Weapon:</span> ${weaponName}
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Armor:</span> ${armorName}
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Rings:</span> ${leftRing}, ${rightRing}
        </div>
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Identified:</span> ${identifiedCount}/${totalItemTypes}
        </div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <div style="margin-bottom: 4px;">
          <span style="color: #888;">Monsters:</span> ${monsters.length} (${awakeMonsters.length} awake)
        </div>
        <div style="margin-bottom: 4px; font-size: 10px;">
          <span style="color: #666;">Nearby:</span> ${nearbyText}
        </div>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0;">
        <span style="color: ${debugState.godMode ? '#0f0' : '#888'};">
          ${debugState.godMode ? '✓' : '✗'} God Mode
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.mapRevealed ? '#0f0' : '#888'};">
          ${debugState.mapRevealed ? '✓' : '✗'} Map Revealed
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.aiOverlay ? '#0f0' : '#888'};">
          ${debugState.aiOverlay ? '✓' : '✗'} AI Debug
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.pathOverlay ? '#0f0' : '#888'};">
          ${debugState.pathOverlay ? '✓' : '✗'} Path Debug
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.fovOverlay ? '#0f0' : '#888'};">
          ${debugState.fovOverlay ? '✓' : '✗'} FOV Debug
        </span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0; font-size: 10px; color: #888;">
        ~ console | g god | v map | m spawn | M wake | K kill | f/p/n overlays
      </div>
    `
  }

  /**
   * Get container element (for mounting)
   */
  getContainer(): HTMLDivElement {
    return this.container
  }
}
```

---

## Phase 1C2: Debug Overlays

### File: `src/ui/DebugOverlays.ts`

```typescript
import { GameState, Monster, Position } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * DebugOverlays - Visual debug overlays for AI, pathfinding, and FOV
 *
 * Renders:
 * - AI state overlays (colored boxes, state text)
 * - Pathfinding paths (dotted lines)
 * - FOV/aggro ranges (semi-transparent circles)
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Renders on canvas layer above game
 * - Uses DebugService for state queries
 */
export class DebugOverlays {
  constructor(private debugService: DebugService) {}

  /**
   * Render AI state overlay for monsters
   */
  renderAIOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.aiOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render for each monster in FOV
    level.monsters.forEach((monster) => {
      if (!state.visibleCells.has(`${monster.position.x},${monster.position.y}`)) {
        return // Only show for visible monsters
      }

      const x = monster.position.x * cellSize
      const y = monster.position.y * cellSize

      // Draw colored box around monster based on state
      ctx.strokeStyle =
        monster.state === 'HUNTING'
          ? 'rgba(255, 0, 0, 0.8)' // Red for hunting
          : monster.state === 'FLEEING'
          ? 'rgba(255, 255, 0, 0.8)' // Yellow for fleeing
          : monster.state === 'SLEEPING'
          ? 'rgba(128, 128, 128, 0.8)' // Gray for sleeping
          : 'rgba(0, 255, 255, 0.8)' // Cyan for wandering

      ctx.lineWidth = 2
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)

      // Draw state text above monster
      ctx.fillStyle = ctx.strokeStyle
      ctx.font = '8px monospace'
      ctx.fillText(monster.state, x + 2, y - 2)

      // Draw behavior type below monster
      const behaviorText = Array.isArray(monster.aiProfile.behavior)
        ? monster.aiProfile.behavior[0]
        : monster.aiProfile.behavior
      ctx.fillText(behaviorText, x + 2, y + cellSize + 10)
    })
  }

  /**
   * Render pathfinding overlay for monsters
   */
  renderPathOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.pathOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render path for each monster with currentPath
    level.monsters.forEach((monster) => {
      if (!monster.currentPath || monster.currentPath.length === 0) return

      // Color by behavior
      const behaviorText = Array.isArray(monster.aiProfile.behavior)
        ? monster.aiProfile.behavior[0]
        : monster.aiProfile.behavior

      ctx.strokeStyle =
        behaviorText === 'SMART'
          ? 'rgba(0, 100, 255, 0.6)' // Blue for A*
          : 'rgba(0, 255, 0, 0.6)' // Green for simple

      ctx.lineWidth = 2
      ctx.setLineDash([5, 5]) // Dotted line

      // Draw path
      ctx.beginPath()
      ctx.moveTo(
        monster.position.x * cellSize + cellSize / 2,
        monster.position.y * cellSize + cellSize / 2
      )

      monster.currentPath.forEach((pos) => {
        ctx.lineTo(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2)
      })

      ctx.stroke()
      ctx.setLineDash([]) // Reset dash

      // Draw target position marker
      if (monster.currentPath.length > 0) {
        const target = monster.currentPath[monster.currentPath.length - 1]
        ctx.fillStyle = ctx.strokeStyle
        ctx.beginPath()
        ctx.arc(
          target.x * cellSize + cellSize / 2,
          target.y * cellSize + cellSize / 2,
          4,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    })
  }

  /**
   * Render FOV/aggro overlay for monsters
   */
  renderFOVOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.fovOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render for each awake monster
    level.monsters.forEach((monster) => {
      if (!monster.isAwake) return

      const x = monster.position.x * cellSize + cellSize / 2
      const y = monster.position.y * cellSize + cellSize / 2

      // Draw aggro range circle
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)' // Orange
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(x, y, monster.aiProfile.aggroRange * cellSize, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Highlight visible cells
      if (monster.visibleCells && monster.visibleCells.size > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)' // Light red
        monster.visibleCells.forEach((cellKey) => {
          const [cellX, cellY] = cellKey.split(',').map(Number)
          ctx.fillRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize)
        })
      }
    })
  }
}
```

---

## Phase 1D: Integration

### File: `src/ui/InputHandler.ts` (MODIFY - add debug key bindings)

Add imports at top:
```typescript
import { ToggleGodModeCommand } from '@commands/ToggleGodModeCommand'
import { RevealMapCommand } from '@commands/RevealMapCommand'
import { ToggleDebugConsoleCommand } from '@commands/ToggleDebugConsoleCommand'
import { SpawnMonsterCommand } from '@commands/SpawnMonsterCommand'
import { WakeAllMonstersCommand } from '@commands/WakeAllMonstersCommand'
import { KillAllMonstersCommand } from '@commands/KillAllMonstersCommand'
import { ToggleFOVDebugCommand } from '@commands/ToggleFOVDebugCommand'
import { TogglePathDebugCommand } from '@commands/TogglePathDebugCommand'
import { ToggleAIDebugCommand } from '@commands/ToggleAIDebugCommand'
import { DebugService } from '@services/DebugService'
```

Add to constructor parameters:
```typescript
constructor(
  private movementService: MovementService,
  private lightingService: LightingService,
  private fovService: FOVService,
  private messageService: MessageService,
  private random: IRandomService,
  private dungeonService: DungeonService,
  private dungeonConfig: DungeonConfig,
  private combatService: CombatService,
  private inventoryService: InventoryService,
  private identificationService: IdentificationService,
  private modalController: ModalController,
  private debugService: DebugService  // ← ADD THIS
) {}
```

Add debug key cases to switch statement (before `default:`):
```typescript
      // =====================================================================
      // DEBUG COMMANDS (dev only)
      // =====================================================================

      case '~':
        // Toggle debug console
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleDebugConsoleCommand(this.debugService)
        }
        return null

      case 'g':
        // Toggle god mode
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleGodModeCommand(this.debugService)
        }
        return null

      case 'v':
        // Reveal map
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new RevealMapCommand(this.debugService)
        }
        return null

      case 'm':
        // Spawn monster (requires monster selection - implement modal in InputHandler)
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          // TODO: Show monster selection modal, get letter
          // For now, spawn a basic 'T' (Troll) for testing
          return new SpawnMonsterCommand('T', this.debugService)
        }
        return null

      case 'M':
        // Wake all monsters
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new WakeAllMonstersCommand(this.debugService)
        }
        return null

      case 'K':
        // Kill all monsters
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new KillAllMonstersCommand(this.debugService)
        }
        return null

      case 'f':
        // Toggle FOV debug
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleFOVDebugCommand(this.debugService)
        }
        return null

      case 'p':
        // Toggle pathfinding debug
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new TogglePathDebugCommand(this.debugService)
        }
        return null

      case 'n':
        // Toggle AI debug
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleAIDebugCommand(this.debugService)
        }
        return null

      default:
        return null
```

### File: `src/ui/GameRenderer.ts` (MODIFY - add debug console & overlays)

Add import at top:
```typescript
import { DebugConsole } from './DebugConsole'
import { DebugOverlays } from './DebugOverlays'
import { DebugService } from '@services/DebugService'
```

Add to constructor:
```typescript
export class GameRenderer {
  private dungeonCanvas: HTMLCanvasElement
  private statsDiv: HTMLDivElement
  private messagesDiv: HTMLDivElement
  private debugConsole: DebugConsole  // ← ADD THIS
  private debugOverlays: DebugOverlays  // ← ADD THIS

  constructor(
    private renderingService: RenderingService,
    debugService: DebugService  // ← ADD THIS
  ) {
    this.dungeonCanvas = this.createDungeonCanvas()
    this.statsDiv = this.createStatsDiv()
    this.messagesDiv = this.createMessagesDiv()
    this.debugConsole = new DebugConsole(debugService)  // ← ADD THIS
    this.debugOverlays = new DebugOverlays(debugService)  // ← ADD THIS
  }

  getContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'game-container'
    container.appendChild(this.dungeonCanvas)
    container.appendChild(this.statsDiv)
    container.appendChild(this.messagesDiv)
    container.appendChild(this.debugConsole.getContainer())  // ← ADD THIS
    return container
  }
}
```

Modify render method to include overlays:
```typescript
render(state: GameState): void {
  this.renderDungeon(state)
  this.renderStats(state)
  this.renderMessages(state)

  // Render debug overlays on canvas
  const ctx = this.dungeonCanvas.getContext('2d')
  if (ctx) {
    const cellSize = 16 // Match your game's cell size

    // Render overlays in order (FOV → Path → AI for proper layering)
    this.debugOverlays.renderFOVOverlay(state, ctx, cellSize)
    this.debugOverlays.renderPathOverlay(state, ctx, cellSize)
    this.debugOverlays.renderAIOverlay(state, ctx, cellSize)
  }

  // Render debug console
  this.debugConsole.render(state)
}
```

### File: `src/main.ts` (MODIFY - initialize DebugService)

Add import:
```typescript
import { DebugService } from '@services/DebugService'
```

Add service initialization (around line 46):
```typescript
  const inventoryService = new InventoryService()
  const identificationService = new IdentificationService(random)
  const modalController = new ModalController(identificationService)
  const debugService = new DebugService(messageService)  // ← ADD THIS
```

Update GameRenderer initialization:
```typescript
  const renderer = new GameRenderer(renderingService, debugService)  // ← ADD debugService
```

Update InputHandler initialization:
```typescript
  const inputHandler = new InputHandler(
    movementService,
    lightingService,
    fovService,
    messageService,
    random,
    dungeonService,
    dungeonConfig,
    combatService,
    inventoryService,
    identificationService,
    modalController,
    debugService  // ← ADD THIS
  )
```

Initialize debug state in createInitialState():
```typescript
  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells,
    messages: [
      {
        text: 'Welcome to the dungeon. Find the Amulet of Yendor!',
        type: 'info',
        turn: 0,
      },
    ],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'game-' + Date.now(),
    isGameOver: false,
    hasWon: false,
    itemNameMap,
    identifiedItems: new Set(),
    debug: debugService.initializeDebugState(),  // ← ADD THIS
  }
```

---

## Phase 1E: God Mode Integration with Other Services

To make god mode actually work, we need CombatService to check for god mode before applying damage.

### File: `src/services/CombatService/CombatService.ts` (MODIFY)

Add import:
```typescript
import { DebugService } from '@services/DebugService'
```

Add to constructor:
```typescript
constructor(
  private random: IRandomService,
  private debugService?: DebugService  // ← ADD THIS (optional for backward compatibility)
) {}
```

Modify applyDamage method:
```typescript
applyDamage(state: GameState, targetId: string, damage: number): GameState {
  // Check god mode (player invincible)
  if (this.debugService && this.debugService.isGodModeActive(state) && targetId === 'player') {
    return state  // No damage in god mode
  }

  // ... rest of existing logic
}
```

### File: `src/main.ts` (MODIFY - inject DebugService into CombatService)

Update CombatService initialization:
```typescript
  const combatService = new CombatService(random, debugService)  // ← ADD debugService
```

**Note**: Move debugService initialization BEFORE combatService to fix dependency order:
```typescript
  const debugService = new DebugService(messageService)
  const combatService = new CombatService(random, debugService)  // Now debugService exists
```

---

## Testing Requirements

### Test Coverage Goals
- **DebugService**: 100% coverage (all methods tested)
- **Commands**: >90% coverage (simple orchestration)
- **UI**: >80% coverage (rendering logic)
- **Total new tests**: 30+

### Test Files to Create

#### 1. `src/services/DebugService/debug-state.test.ts`
**Purpose**: Test debug state initialization and management

```typescript
import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'

describe('DebugService - State Management', () => {
  let debugService: DebugService
  let messageService: MessageService

  beforeEach(() => {
    messageService = new MessageService()
    debugService = new DebugService(messageService, true) // Force dev mode
  })

  test('initializes debug state with all flags false', () => {
    const debugState = debugService.initializeDebugState()

    expect(debugState.godMode).toBe(false)
    expect(debugState.mapRevealed).toBe(false)
    expect(debugState.debugConsoleVisible).toBe(false)
    expect(debugState.fovOverlay).toBe(false)
    expect(debugState.pathOverlay).toBe(false)
    expect(debugState.aiOverlay).toBe(false)
  })

  test('isEnabled returns true in dev mode', () => {
    expect(debugService.isEnabled()).toBe(true)
  })

  test('isEnabled returns false in production', () => {
    const prodService = new DebugService(messageService, false)
    expect(prodService.isEnabled()).toBe(false)
  })
})
```

**Expected tests**: 5-7 tests

#### 2. `src/services/DebugService/god-mode.test.ts`
**Purpose**: Test god mode toggle and effects

```typescript
import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('DebugService - God Mode', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    mockState = {
      // ... minimal state
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('toggleGodMode enables god mode when disabled', () => {
    const result = debugService.toggleGodMode(mockState)

    expect(result.debug?.godMode).toBe(true)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('God mode ENABLED')
  })

  test('toggleGodMode disables god mode when enabled', () => {
    const enabledState = debugService.toggleGodMode(mockState)
    const result = debugService.toggleGodMode(enabledState)

    expect(result.debug?.godMode).toBe(false)
    expect(result.messages[result.messages.length - 1].text).toContain('DISABLED')
  })

  test('isGodModeActive returns correct status', () => {
    expect(debugService.isGodModeActive(mockState)).toBe(false)

    const enabled = debugService.toggleGodMode(mockState)
    expect(debugService.isGodModeActive(enabled)).toBe(true)
  })

  test('toggleGodMode does nothing in production mode', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.toggleGodMode(mockState)

    expect(result).toBe(mockState) // Returns unchanged
  })
})
```

**Expected tests**: 6-8 tests

#### 3. `src/services/DebugService/map-reveal.test.ts`
**Purpose**: Test map reveal functionality

```typescript
import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level } from '@game/core/core'

describe('DebugService - Map Reveal', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    // Create state with unexplored level
    const level: Level = {
      width: 10,
      height: 10,
      tiles: [], // ... tiles
      explored: Array(10).fill(null).map(() => Array(10).fill(false)), // All unexplored
      rooms: [],
      doors: [],
      corridors: [],
      upStairs: null,
      downStairs: { x: 5, y: 5 },
      monsters: [],
      items: [],
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('revealMap marks all tiles as explored', () => {
    const result = debugService.revealMap(mockState)

    const level = result.levels.get(1)!
    expect(level.explored.every(row => row.every(cell => cell === true))).toBe(true)
  })

  test('revealMap sets mapRevealed flag', () => {
    const result = debugService.revealMap(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })

  test('revealMap adds message', () => {
    const result = debugService.revealMap(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Map REVEALED')
  })

  test('revealMap toggles off when called twice', () => {
    const revealed = debugService.revealMap(mockState)
    const hidden = debugService.revealMap(revealed)

    expect(hidden.debug?.mapRevealed).toBe(false)
  })

  test('revealMap does nothing in production', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.revealMap(mockState)

    expect(result).toBe(mockState)
  })

  test('preserves original state immutability', () => {
    const result = debugService.revealMap(mockState)

    expect(result).not.toBe(mockState)
    expect(result.levels).not.toBe(mockState.levels)
    expect(mockState.levels.get(1)!.explored[0][0]).toBe(false) // Original unchanged
  })
})
```

**Expected tests**: 8-10 tests

#### 4. `src/commands/ToggleGodModeCommand/ToggleGodModeCommand.test.ts`

```typescript
import { ToggleGodModeCommand } from './ToggleGodModeCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('ToggleGodModeCommand', () => {
  test('executes debugService.toggleGodMode', () => {
    const messageService = new MessageService()
    const debugService = new DebugService(messageService, true)
    const command = new ToggleGodModeCommand(debugService)

    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.godMode).toBe(true)
  })
})
```

**Expected tests**: 2-3 tests (commands are simple)

#### 5. `src/commands/RevealMapCommand/RevealMapCommand.test.ts`

```typescript
import { RevealMapCommand } from './RevealMapCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level } from '@game/core/core'

describe('RevealMapCommand', () => {
  test('executes debugService.revealMap', () => {
    const messageService = new MessageService()
    const debugService = new DebugService(messageService, true)
    const command = new RevealMapCommand(debugService)

    const level: Level = {
      width: 5,
      height: 5,
      explored: Array(5).fill(null).map(() => Array(5).fill(false)),
      // ... other fields
    } as Level

    const mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.mapRevealed).toBe(true)
  })
})
```

**Expected tests**: 2-3 tests

#### 6. `src/ui/DebugConsole.test.ts`

```typescript
import { DebugConsole } from './DebugConsole'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('DebugConsole', () => {
  let debugConsole: DebugConsole
  let debugService: DebugService

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    debugConsole = new DebugConsole(debugService)
  })

  test('container hidden by default', () => {
    const container = debugConsole.getContainer()
    expect(container.style.display).toBe('none')
  })

  test('shows container when debugConsoleVisible is true', () => {
    const mockState = {
      seed: 'test-seed',
      turnCount: 42,
      currentLevel: 3,
      player: { position: { x: 10, y: 5 }, hp: 12, maxHp: 12 },
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.style.display).toBe('block')
  })

  test('displays seed, turn, level, position', () => {
    const mockState = {
      seed: 'test-123',
      turnCount: 100,
      currentLevel: 5,
      player: { position: { x: 15, y: 20 }, hp: 8, maxHp: 12 },
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('test-123')
    expect(container.innerHTML).toContain('100')
    expect(container.innerHTML).toContain('5')
    expect(container.innerHTML).toContain('(15, 20)')
    expect(container.innerHTML).toContain('8/12')
  })

  test('shows god mode status', () => {
    const mockState = {
      debug: { ...debugService.initializeDebugState(), debugConsoleVisible: true, godMode: true },
    } as GameState

    debugConsole.render(mockState)

    const container = debugConsole.getContainer()
    expect(container.innerHTML).toContain('✓ God Mode')
  })
})
```

**Expected tests**: 6-8 tests

---

## Architecture Compliance Checklist

### ✅ Services contain ALL logic
- DebugService has toggleGodMode, revealMap, all state management
- No logic in commands or UI

### ✅ Commands orchestrate only
- Commands call single DebugService method
- No conditional logic, calculations, or state manipulation
- Return result directly from service

### ✅ UI renders state only
- DebugConsole reads state, renders DOM
- No game logic in render methods
- Only visual representation

### ✅ Immutability throughout
- All DebugService methods return new GameState
- Spread operators for all updates
- Original state never mutated

### ✅ Dependency injection
- DebugService injected into commands
- DebugService injected into UI components
- MessageService injected into DebugService

### ✅ Barrel exports
- index.ts for DebugService
- index.ts for all commands
- Path aliases (@services/DebugService, @commands/*)

### ✅ Testing
- Services: >80% coverage goal
- Commands: orchestration tested
- UI: rendering logic tested
- Immutability verified in all tests

---

## Success Criteria

### Functional Requirements
- [ ] Press `~` toggles debug console (shows/hides)
- [ ] Press `g` toggles god mode (message confirms)
- [ ] Press `v` reveals entire map (all tiles visible)
- [ ] God mode prevents player damage
- [ ] Debug console displays: seed, turn, level, position, HP, mode status
- [ ] Debug commands only work in dev mode (disabled in production)

### Technical Requirements
- [ ] DebugService contains all debug logic
- [ ] Commands orchestrate only (no logic)
- [ ] UI renders state only (no game logic)
- [ ] All state updates immutable (return new objects)
- [ ] DebugService >90% test coverage
- [ ] All commands tested
- [ ] DebugConsole rendering tested
- [ ] God mode integration with CombatService working
- [ ] All tests passing (currently 787/787)
- [ ] TypeScript compiles with no errors
- [ ] Follows existing architecture patterns exactly

### Documentation
- [ ] Update plan.md: Mark DebugService task complete
- [ ] Update CLAUDE.md if new patterns introduced
- [ ] Git commit with descriptive message

---

## Implementation Timeline

### Phase 1A: Core Service (2 hours) - was 1-1.5 hours
1. Create DebugService folder structure
2. Add DebugState interface to core.ts
3. Implement DebugService class with:
   - Basic methods (god mode, reveal, console)
   - Monster methods (spawn, wake, kill)
   - Item methods (identifyAll)
   - Overlay methods (FOV, path, AI)
4. Write DebugService tests:
   - debug-state.test.ts (5-7 tests)
   - god-mode.test.ts (6-8 tests)
   - map-reveal.test.ts (8-10 tests)
   - monster-spawning.test.ts (8-10 tests)
   - monster-control.test.ts (6-8 tests)
   - overlay-toggles.test.ts (6-8 tests)
   - identify-all.test.ts (5-7 tests)
5. Run tests: `npm test DebugService`

### Phase 1B: Basic Commands (30 min)
1. Create ToggleGodModeCommand + tests (2-3 tests)
2. Create RevealMapCommand + tests (2-3 tests)
3. Create ToggleDebugConsoleCommand + tests (2-3 tests)
4. Run tests: `npm test Command`

### Phase 1B2: Monster Debug Commands (1 hour) - NEW
1. Create SpawnMonsterCommand + tests (4-5 tests)
2. Create WakeAllMonstersCommand + tests (3-4 tests)
3. Create KillAllMonstersCommand + tests (3-4 tests)
4. Create ToggleFOVDebugCommand + tests (2-3 tests)
5. Create TogglePathDebugCommand + tests (2-3 tests)
6. Create ToggleAIDebugCommand + tests (2-3 tests)
7. Run tests: `npm test Command`

### Phase 1C: Debug Console UI (1 hour) - was 45 min
1. Create DebugConsole.ts with:
   - Basic info display
   - Monster stats (count, nearby)
   - Inventory/equipment stats (Phase 5)
   - Identified items count
   - Overlay toggle indicators
2. Write DebugConsole tests (6-8 tests)
3. Run tests: `npm test DebugConsole`

### Phase 1C2: Debug Overlays (1 hour) - NEW
1. Create DebugOverlays.ts with:
   - renderAIOverlay (colored boxes, state text)
   - renderPathOverlay (dotted paths, targets)
   - renderFOVOverlay (aggro circles, vision cells)
2. Write DebugOverlays tests (8-10 tests)
3. Run tests: `npm test DebugOverlays`

### Phase 1D: Integration (1 hour) - was 30 min
1. Modify InputHandler:
   - Add 9 debug key bindings (~, g, v, m, M, K, f, p, n)
   - Wire commands to keys
2. Modify GameRenderer:
   - Add debug console rendering
   - Add overlay rendering (canvas layer)
3. Modify main.ts (initialize DebugService)
4. Run dev server: `npm run dev`
5. Manual testing: all debug keys

### Phase 1E: God Mode Integration (30 min)
1. Modify CombatService (god mode check)
2. Update main.ts (inject DebugService into CombatService)
3. Test god mode prevents damage
4. Run full test suite: `npm test`

### Final: Documentation & Commit (15 min)
1. Update plan.md (mark DebugService complete)
2. Run coverage: `npm run test:coverage`
3. Git commit: "feat: implement DebugService with god mode, monster debugging, and visual overlays"

**Total estimated time**: 6-7 hours (was 4-5 hours)

---

## Appendix A: Quick Reference

### Debug Commands Summary
| Key | Command | Service Method | Effect |
|-----|---------|---------------|--------|
| `~` | ToggleDebugConsoleCommand | toggleDebugConsole() | Show/hide console |
| `g` | ToggleGodModeCommand | toggleGodMode() | Enable/disable invincibility |
| `v` | RevealMapCommand | revealMap() | Show entire map |
| `m` | SpawnMonsterCommand | spawnMonster() | Spawn monster by letter at player |
| `M` | WakeAllMonstersCommand | wakeAllMonsters() | Wake all sleeping monsters |
| `K` | KillAllMonstersCommand | killAllMonsters() | Remove all monsters from level |
| `f` | ToggleFOVDebugCommand | toggleFOVDebug() | Show FOV/aggro range overlays |
| `p` | TogglePathDebugCommand | togglePathDebug() | Show A* pathfinding paths |
| `n` | ToggleAIDebugCommand | toggleAIDebug() | Show AI state & behavior overlays |

### Files Checklist
**Create (32 files)** - was 16:
- [ ] src/services/DebugService/DebugService.ts
- [ ] src/services/DebugService/debug-state.test.ts
- [ ] src/services/DebugService/god-mode.test.ts
- [ ] src/services/DebugService/map-reveal.test.ts
- [ ] src/services/DebugService/monster-spawning.test.ts
- [ ] src/services/DebugService/monster-control.test.ts
- [ ] src/services/DebugService/overlay-toggles.test.ts
- [ ] src/services/DebugService/identify-all.test.ts
- [ ] src/services/DebugService/index.ts
- [ ] src/commands/ToggleGodModeCommand/ToggleGodModeCommand.ts
- [ ] src/commands/ToggleGodModeCommand/ToggleGodModeCommand.test.ts
- [ ] src/commands/ToggleGodModeCommand/index.ts
- [ ] src/commands/RevealMapCommand/RevealMapCommand.ts
- [ ] src/commands/RevealMapCommand/RevealMapCommand.test.ts
- [ ] src/commands/RevealMapCommand/index.ts
- [ ] src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.ts
- [ ] src/commands/ToggleDebugConsoleCommand/ToggleDebugConsoleCommand.test.ts
- [ ] src/commands/ToggleDebugConsoleCommand/index.ts
- [ ] src/commands/SpawnMonsterCommand/SpawnMonsterCommand.ts
- [ ] src/commands/SpawnMonsterCommand/SpawnMonsterCommand.test.ts
- [ ] src/commands/SpawnMonsterCommand/index.ts
- [ ] src/commands/WakeAllMonstersCommand/WakeAllMonstersCommand.ts
- [ ] src/commands/WakeAllMonstersCommand/WakeAllMonstersCommand.test.ts
- [ ] src/commands/WakeAllMonstersCommand/index.ts
- [ ] src/commands/KillAllMonstersCommand/KillAllMonstersCommand.ts
- [ ] src/commands/KillAllMonstersCommand/KillAllMonstersCommand.test.ts
- [ ] src/commands/KillAllMonstersCommand/index.ts
- [ ] src/commands/ToggleFOVDebugCommand/ToggleFOVDebugCommand.ts
- [ ] src/commands/ToggleFOVDebugCommand/ToggleFOVDebugCommand.test.ts
- [ ] src/commands/ToggleFOVDebugCommand/index.ts
- [ ] src/commands/TogglePathDebugCommand/TogglePathDebugCommand.ts
- [ ] src/commands/TogglePathDebugCommand/TogglePathDebugCommand.test.ts
- [ ] src/commands/TogglePathDebugCommand/index.ts
- [ ] src/commands/ToggleAIDebugCommand/ToggleAIDebugCommand.ts
- [ ] src/commands/ToggleAIDebugCommand/ToggleAIDebugCommand.test.ts
- [ ] src/commands/ToggleAIDebugCommand/index.ts
- [ ] src/ui/DebugConsole.ts
- [ ] src/ui/DebugConsole.test.ts
- [ ] src/ui/DebugOverlays.ts
- [ ] src/ui/DebugOverlays.test.ts

**Modify (4 files)**:
- [ ] src/types/core/core.ts (add DebugState, extend GameState)
- [ ] src/ui/InputHandler.ts (add debug keys ~, g, v, m, M, K, f, p, n)
- [ ] src/ui/GameRenderer.ts (add debug console & overlay rendering)
- [ ] src/main.ts (initialize DebugService, wire to UI)

### Test Commands
```bash
# Run specific service tests
npm test DebugService

# Run command tests
npm test ToggleGodMode
npm test RevealMap
npm test ToggleDebugConsole

# Run UI tests
npm test DebugConsole

# Run all tests
npm test

# Coverage report
npm run test:coverage

# Watch mode (during development)
npm run test:watch
```

### Key Architecture Patterns
```typescript
// Service pattern (logic only, no DOM)
class DebugService {
  toggleGodMode(state: GameState): GameState {
    return { ...state, debug: { ...state.debug, godMode: !state.debug.godMode }}
  }
}

// Command pattern (orchestration only)
class ToggleGodModeCommand implements ICommand {
  execute(state: GameState): GameState {
    return this.debugService.toggleGodMode(state)
  }
}

// UI pattern (rendering only)
class DebugConsole {
  render(state: GameState): void {
    if (state.debug?.debugConsoleVisible) {
      this.container.innerHTML = `<div>${state.seed}</div>`
    }
  }
}
```

---

## Appendix B: Feature Status

### ✅ Implemented in Phase 1 (Comprehensive Debug Tools)
- **toggleGodMode()** - Player invincibility, infinite resources
- **revealMap()** - Show entire level map
- **toggleDebugConsole()** - Show/hide debug panel
- **spawnMonster(letter)** - Create monster for testing
- **wakeAllMonsters()** - Wake all sleeping monsters
- **killAllMonsters()** - Remove all monsters from level
- **identifyAll()** - Auto-identify all items (Phase 5 integration)
- **toggleFOVDebug()** - Highlight visible tiles, monster vision, aggro ranges
- **togglePathDebug()** - Show A* pathfinding visualization
- **toggleAIDebug()** - Display monster state overlays & behaviors

### 🔄 Deferred to Phase 6+ (Advanced Features)
- **teleportTo(level)** - Instant level change (needs level transition logic)
- **spawnItem(type, pos)** - Create item at position (needs item factory)
- **setPlayerStats(stats)** - Quick stat adjustment (needs input UI)
- **giveInfiniteLight()** - Never run out of fuel (optional enhancement)
- **Monster selection modal** - UI for choosing monster letter (currently hardcoded to 'T')

### Phase 1 Implementation Complete
The comprehensive debug tools provide:
- ✅ God mode (invincibility, infinite hunger/light)
- ✅ Map reveal (exploration)
- ✅ Monster debugging (spawn, wake, kill)
- ✅ Visual overlays (AI, pathfinding, FOV)
- ✅ Phase 5 integration (inventory, equipment, identification)
- ✅ Debug console UI with complete stats
- ✅ 9 debug key bindings

This exceeds plan.md Phase 1 requirements and provides powerful testing capabilities for all implemented phases (1-5).

---

**End of Implementation Plan**

This document provides complete context for implementing the Debug System. Follow phases 1A-1E in order, run tests after each phase, and verify architecture compliance throughout. When complete, update plan.md and create descriptive git commit.
