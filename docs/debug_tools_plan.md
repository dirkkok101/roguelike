# Debug Tools Implementation Plan

**Status**: Ready to Implement
**Phase**: Phase 1 - Foundation & Core Loop
**Estimated Time**: 4-6 hours
**Test Count**: 30+ tests
**Created**: 2025-10-04

---

## Executive Summary

This plan provides a complete implementation guide for the Debug System, a Phase 1 requirement that enables developer testing and debugging capabilities. The system includes god mode, map reveal, FOV/AI/pathfinding overlays, and a debug console UI.

**Key Components**:
1. **DebugService** - Core debug state and logic
2. **Debug Commands** - 6 debug commands (god mode, reveal, overlays)
3. **DebugConsole UI** - Visual debug panel
4. **DebugOverlays** - FOV, pathfinding, AI state visualizations
5. **Integration** - Wire into InputHandler, GameRenderer, main.ts

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
| `f` | Toggle FOV Debug | Highlight visible tiles |
| `p` | Toggle Path Debug | Show A* paths |
| `n` | Toggle AI Debug | Display monster states |
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
import { GameState, Level, DebugState } from '@game/core/core'
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
    const { player, currentLevel, turnCount, seed } = state

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
        <span style="color: ${debugState.godMode ? '#0f0' : '#888'};">
          ${debugState.godMode ? '✓' : '✗'} God Mode
        </span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: ${debugState.mapRevealed ? '#0f0' : '#888'};">
          ${debugState.mapRevealed ? '✓' : '✗'} Map Revealed
        </span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #0f0; font-size: 10px; color: #888;">
        Press ~ to toggle
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

## Phase 1D: Integration

### File: `src/ui/InputHandler.ts` (MODIFY - add debug key bindings)

Add imports at top:
```typescript
import { ToggleGodModeCommand } from '@commands/ToggleGodModeCommand'
import { RevealMapCommand } from '@commands/RevealMapCommand'
import { ToggleDebugConsoleCommand } from '@commands/ToggleDebugConsoleCommand'
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

      default:
        return null
```

### File: `src/ui/GameRenderer.ts` (MODIFY - add debug console rendering)

Add import at top:
```typescript
import { DebugConsole } from './DebugConsole'
import { DebugService } from '@services/DebugService'
```

Add to constructor:
```typescript
export class GameRenderer {
  private dungeonCanvas: HTMLCanvasElement
  private statsDiv: HTMLDivElement
  private messagesDiv: HTMLDivElement
  private debugConsole: DebugConsole  // ← ADD THIS

  constructor(
    private renderingService: RenderingService,
    debugService: DebugService  // ← ADD THIS
  ) {
    this.dungeonCanvas = this.createDungeonCanvas()
    this.statsDiv = this.createStatsDiv()
    this.messagesDiv = this.createMessagesDiv()
    this.debugConsole = new DebugConsole(debugService)  // ← ADD THIS
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

Modify render method:
```typescript
render(state: GameState): void {
  this.renderDungeon(state)
  this.renderStats(state)
  this.renderMessages(state)
  this.debugConsole.render(state)  // ← ADD THIS
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

### Phase 1A: Core Service (1-1.5 hours)
1. Create DebugService folder structure
2. Add DebugState interface to core.ts
3. Implement DebugService class
4. Write DebugService tests (debug-state.test.ts, god-mode.test.ts, map-reveal.test.ts)
5. Run tests: `npm test DebugService`

### Phase 1B: Commands (30 min)
1. Create ToggleGodModeCommand + tests
2. Create RevealMapCommand + tests
3. Create ToggleDebugConsoleCommand + tests
4. Run tests: `npm test Command`

### Phase 1C: Debug Console UI (45 min)
1. Create DebugConsole.ts
2. Write DebugConsole tests
3. Run tests: `npm test DebugConsole`

### Phase 1D: Integration (30 min)
1. Modify InputHandler (add debug keys)
2. Modify GameRenderer (add debug console rendering)
3. Modify main.ts (initialize DebugService)
4. Run dev server: `npm run dev`
5. Manual testing: press ~, g, v

### Phase 1E: God Mode Integration (30 min)
1. Modify CombatService (god mode check)
2. Update main.ts (inject DebugService into CombatService)
3. Test god mode prevents damage
4. Run full test suite: `npm test`

### Final: Documentation & Commit (15 min)
1. Update plan.md (mark DebugService complete)
2. Run coverage: `npm run test:coverage`
3. Git commit: "feat: implement DebugService with god mode, map reveal, and debug console"

**Total estimated time**: 4-5 hours

---

## Appendix A: Quick Reference

### Debug Commands Summary
| Key | Command | Service Method | Effect |
|-----|---------|---------------|--------|
| `~` | ToggleDebugConsoleCommand | toggleDebugConsole() | Show/hide console |
| `g` | ToggleGodModeCommand | toggleGodMode() | Enable/disable invincibility |
| `v` | RevealMapCommand | revealMap() | Show entire map |

### Files Checklist
**Create (16 files)**:
- [ ] src/services/DebugService/DebugService.ts
- [ ] src/services/DebugService/debug-state.test.ts
- [ ] src/services/DebugService/god-mode.test.ts
- [ ] src/services/DebugService/map-reveal.test.ts
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
- [ ] src/ui/DebugConsole.ts
- [ ] src/ui/DebugConsole.test.ts

**Modify (4 files)**:
- [ ] src/types/core/core.ts (add DebugState, extend GameState)
- [ ] src/ui/InputHandler.ts (add debug keys ~, g, v)
- [ ] src/ui/GameRenderer.ts (add debug console rendering)
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

## Appendix B: Deferred Features (Phase 6)

These features are specified in systems-advanced.md but can be deferred to Phase 6 if time-constrained:

### Advanced Debug Features (Phase 6+)
- **toggleFOVDebug()** - Highlight visible tiles overlay
- **togglePathDebug()** - Show A* pathfinding visualization
- **toggleAIDebug()** - Display monster state overlays
- **teleportTo(level)** - Instant level change
- **spawnMonster(letter, pos)** - Create monster at position
- **spawnItem(type, pos)** - Create item at position
- **identifyAll()** - Auto-identify all items
- **giveInfiniteLight()** - Never run out of fuel

### Phase 1 Minimum Viable Debug
For Phase 1 completion, implement ONLY:
- God mode (invincibility)
- Map reveal (exploration)
- Debug console UI (basic info display)
- Key bindings (~, g, v)

This satisfies plan.md Phase 1 requirements while keeping scope manageable.

---

**End of Implementation Plan**

This document provides complete context for implementing the Debug System. Follow phases 1A-1E in order, run tests after each phase, and verify architecture compliance throughout. When complete, update plan.md and create descriptive git commit.
