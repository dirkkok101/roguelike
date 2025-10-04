# UI/UX Enhancement Plan - Contextual Commands & Modern Roguelike Features

**Status**: Ready to Implement
**Estimated Time**: 4-5 hours
**Test Count**: 35-40 tests
**Created**: 2025-10-04

---

## Executive Summary

This plan provides a comprehensive implementation guide for modernizing the roguelike UI with contextual commands, auto-notifications, and enhanced visual feedback. Based on research of successful modern roguelikes (Cogmind, Caves of Qud, DCSS, NetHack), we'll add discoverable UI features that help new players while staying out of the way for experts.

**Key Improvements**:
1. **Contextual Status Bar** - Shows available actions based on player position/state
2. **Auto-Notifications** - Proactive messages for item presence, warnings, hints
3. **Enhanced Message Log** - Better grouping, history, importance levels
4. **Visual State Indicators** - Color-coded HP/hunger/light, progress bars
5. **Quick Help Overlay** - Press `?` for contextual help and command reference

**Design Philosophy**:
- ✅ Discoverable for new players (show what you can do)
- ✅ Fast for experienced players (keyboard shortcuts unchanged)
- ✅ Non-intrusive (fits ASCII aesthetic)
- ✅ Context-aware (relevant to current situation)

---

## Research Findings - Modern Roguelike UI Patterns

### Cogmind (Gold Standard)

**Key Features**:
- **Automatic object labeling**: Objects labeled as they enter view
- **Smart automation**: Removes burden of obvious choices, auto-determines optimal actions
- **Dual input support**: Full keyboard + drag-drop mouse interface
- **Heavy animation**: Every UI element animated for feedback
- **Community consensus**: "Probably the gold standard of good UI"

**Lessons for our game**:
- Show item information immediately when visible
- Provide contextual hints without requiring memorization
- Support both quick keyboard shortcuts and discoverable UI elements

### Caves of Qud & DCSS

**Key Features**:
- **Burden warnings**: Display encumbrance before picking up items
- **Item type filtering**: NetHack-style 'D' key for dropping specific types
- **Modern UI elements**: Can be toggled on/off for purists
- **Contextual information**: Show what's relevant to current action

**Spring Molting update** (Caves of Qud):
- Fully mouseable, fully gamepaddable
- Maintains ASCII roguelike essence
- Preserves text-based UI option for veterans

**Lessons for our game**:
- Warn about consequences before actions (inventory full, etc.)
- Show item types and categories clearly
- Provide modern conveniences without breaking classic feel

### NetHack & Classic Roguelikes

**Key Patterns**:
- **Menu-based selection**: ',' for pickup shows menu if multiple items
- **Autopickup with filters**: pickup_types refines automatic behavior
- **Contextual prompts**: "What direction?" for directional commands
- **Type-specific commands**: 'D' prompts with item type list

**Lessons for our game**:
- Use menus for complex selections
- Provide contextual prompts for multi-step actions
- Group items by type for better organization

### Cardinal Quest Example

**Breakthrough insight**:
> "The interface entirely describes what you can do in the game. I don't think there's a single aspect of the game that's not accessible from clicking on something."

- Keyboard shortcuts for everything
- Mouseover tooltips explain information
- Right-click menus provide available options
- Noun-verb for beginners, verb-noun for experts

**Lessons for our game**:
- Make all commands discoverable through UI
- Support both command patterns (select then act, or act then select)
- Tooltips/hints should teach shortcuts

---

## Current UI Analysis

### What We Have ✅

**GameRenderer** (`src/ui/GameRenderer.ts`):
- Dungeon view: 80x22 ASCII grid rendering
- Stats panel: HP, Str, AC, Level, XP, Gold, Depth, Turn, Light
- Message log: 5 recent messages with color coding
- Three-state visibility: visible/explored/unexplored
- Item/monster/terrain rendering with proper colors

**Message System**:
```typescript
// Current MessageService (simplified)
interface Message {
  text: string
  type: 'info' | 'combat' | 'warning' | 'critical' | 'success'
  turn: number
}

// Renders last 5 messages
renderMessages(state: GameState): void {
  const recent = state.messages.slice(-5)
  // ... display
}
```

**Controls** (from game-design.md):
- Movement: Arrow keys
- Actions: i, q, r, w, W, P, R, e, d, o, c, s, >, <, ,
- All keyboard-driven, no contextual hints

### What's Missing ❌

1. **No contextual command hints**: Players must memorize all keys
2. **No item presence notifications**: Standing on item gives no feedback
3. **No status indicators**: Can't see at a glance what actions are available
4. **No quick help**: No in-game reference for commands
5. **Limited message history**: Only 5 messages visible
6. **No visual feedback**: HP/hunger/light states not color-coded
7. **No warnings**: Inventory full, low resources not proactively shown

### User Pain Points

**New Player Experience**:
- "How do I pick up this item?" → Must guess ','
- "What commands are available?" → Must check external docs
- "Is there a door nearby?" → No indication unless you try
- "Is my inventory full?" → Only find out after failed pickup

**Experienced Player Frustration**:
- "Did I pick that up?" → Scroll through combat spam
- "What's my current status?" → Parse stats mentally
- "Is anything important happening?" → Critical warnings buried

---

## Current Implementation Reference

### GameRenderer Structure
**Source**: `src/ui/GameRenderer.ts` (lines 1-220)

```typescript
export class GameRenderer {
  private dungeonContainer: HTMLElement    // 80x22 grid
  private statsContainer: HTMLElement      // Right panel
  private messagesContainer: HTMLElement   // Top log

  render(state: GameState): void {
    this.renderDungeon(state)   // ASCII grid with visibility
    this.renderStats(state)     // HP, Str, AC, Level, etc.
    this.renderMessages(state)  // Last 5 messages
  }

  private renderDungeon(state: GameState): void {
    // Renders: tiles → items → monsters → player
    // Uses RenderingService for visibility/colors
  }

  private renderStats(state: GameState): void {
    // Displays: HP, Str, AC, Level, XP, Gold, Depth, Turn, Light
  }

  private renderMessages(state: GameState): void {
    // Shows last 5 messages with color by type
    const recent = state.messages.slice(-5)
  }
}
```

### Message Service Pattern
**Source**: `src/services/MessageService/MessageService.ts`

```typescript
class MessageService {
  addMessage(
    messages: Message[],
    text: string,
    type: 'info' | 'combat' | 'warning' | 'critical' | 'success',
    turn: number
  ): Message[] {
    return [...messages, { text, type, turn }]
  }
}
```

### Layout Design
**Source**: `docs/game-design.md` (lines 453-499)

Current layout shows:
- Title bar (seed, debug toggle)
- Message log (5 lines)
- Dungeon view (80x22) + Stats panel (right side)
- **Missing**: Status bar for contextual commands

---

## Phase A: Contextual Status Bar

### Overview

Add a dynamic status bar below the dungeon view that shows context-aware commands based on player position and game state.

**Context Examples**:
```
Standing on item:     [,] pickup  [i]nventory  [w]ield  [W]ear  [P]ut on
Near closed door:     [o]pen door  [s]earch  [c]lose
Near stairs:          [>] descend  [<] ascend
In combat (adjacent): [arrows] attack  [s]earch
Default/exploration:  [i]nv  [e]at  [q]uaff  [r]ead  [?] help  [S]ave
```

### ContextService Implementation

**File**: `src/services/ContextService/ContextService.ts`

```typescript
import { GameState, Position, Level, Item, Monster, Door } from '@game/core/core'

/**
 * ContextService - Analyzes game state to determine available actions
 *
 * Provides context-aware command suggestions based on:
 * - Player position
 * - Nearby entities (items, doors, stairs, monsters)
 * - Player state (inventory full, etc.)
 * - Current game phase
 *
 * Architecture:
 * - Pure logic, no rendering
 * - Returns structured context data
 * - UI components consume this data
 */

export interface ContextAction {
  key: string          // Keyboard shortcut
  label: string        // Action description
  priority: number     // Display order (higher = more important)
  category: 'primary' | 'secondary' | 'utility'
}

export interface GameContext {
  actions: ContextAction[]
  primaryHint?: string  // Main suggestion (e.g., "Item here!")
  warnings: string[]    // Important alerts
}

export class ContextService {
  /**
   * Analyze game state and return available actions
   */
  analyzeContext(state: GameState): GameContext {
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return { actions: [], warnings: [] }
    }

    const actions: ContextAction[] = []
    const warnings: string[] = []
    let primaryHint: string | undefined

    // Check player position for items
    const itemAtPosition = this.getItemAtPosition(level, state.player.position)
    if (itemAtPosition) {
      primaryHint = `Item here: ${itemAtPosition.name}`
      actions.push(
        { key: ',', label: 'pickup', priority: 100, category: 'primary' },
        { key: 'i', label: 'inventory', priority: 90, category: 'primary' }
      )

      // Add type-specific actions
      if (itemAtPosition.type === 'WEAPON') {
        actions.push({ key: 'w', label: 'wield', priority: 80, category: 'primary' })
      } else if (itemAtPosition.type === 'ARMOR') {
        actions.push({ key: 'W', label: 'wear', priority: 80, category: 'primary' })
      } else if (itemAtPosition.type === 'RING') {
        actions.push({ key: 'P', label: 'put on', priority: 80, category: 'primary' })
      }
    }

    // Check for gold
    const goldAtPosition = this.getGoldAtPosition(level, state.player.position)
    if (goldAtPosition) {
      primaryHint = `${goldAtPosition.amount} gold pieces here`
      actions.push({ key: ',', label: 'pickup gold', priority: 100, category: 'primary' })
    }

    // Check for nearby doors
    const nearbyDoor = this.getNearbyDoor(level, state.player.position)
    if (nearbyDoor) {
      if (nearbyDoor.state === 'CLOSED') {
        actions.push({ key: 'o', label: 'open door', priority: 90, category: 'primary' })
      } else if (nearbyDoor.state === 'OPEN') {
        actions.push({ key: 'c', label: 'close door', priority: 70, category: 'secondary' })
      }
      actions.push({ key: 's', label: 'search', priority: 60, category: 'secondary' })
    }

    // Check for stairs
    if (this.isOnStairs(level, state.player.position)) {
      if (level.stairsDown && this.positionsEqual(state.player.position, level.stairsDown)) {
        actions.push({ key: '>', label: 'descend', priority: 95, category: 'primary' })
      }
      if (level.stairsUp && this.positionsEqual(state.player.position, level.stairsUp)) {
        actions.push({ key: '<', label: 'ascend', priority: 95, category: 'primary' })
      }
    }

    // Check for adjacent monsters (combat context)
    const adjacentMonster = this.getAdjacentMonster(level, state.player.position)
    if (adjacentMonster) {
      actions.push(
        { key: '↑↓←→', label: 'attack', priority: 100, category: 'primary' },
        { key: 's', label: 'search', priority: 50, category: 'secondary' }
      )
    }

    // Check inventory status
    if (state.player.inventory.length >= 26) {
      warnings.push('⚠ Inventory full (26/26)')
      actions.push({ key: 'd', label: 'drop item', priority: 85, category: 'primary' })
    }

    // Always available utility actions (if no primary context)
    if (actions.filter((a) => a.category === 'primary').length === 0) {
      actions.push(
        { key: 'i', label: 'inventory', priority: 70, category: 'utility' },
        { key: 'e', label: 'eat', priority: 60, category: 'utility' },
        { key: 'q', label: 'quaff', priority: 60, category: 'utility' },
        { key: 'r', label: 'read', priority: 60, category: 'utility' },
        { key: '?', label: 'help', priority: 50, category: 'utility' }
      )
    }

    // Sort by priority (highest first)
    actions.sort((a, b) => b.priority - a.priority)

    return {
      actions: actions.slice(0, 7), // Show max 7 actions
      primaryHint,
      warnings,
    }
  }

  /**
   * Get item at specific position
   */
  private getItemAtPosition(level: Level, pos: Position): Item | null {
    return level.items.find((item) => item.position?.x === pos.x && item.position?.y === pos.y) || null
  }

  /**
   * Get gold at specific position
   */
  private getGoldAtPosition(level: Level, pos: Position) {
    return level.gold.find((g) => g.position.x === pos.x && g.position.y === pos.y) || null
  }

  /**
   * Get nearby door (adjacent tiles)
   */
  private getNearbyDoor(level: Level, pos: Position): Door | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 }, // Up
      { x: pos.x, y: pos.y + 1 }, // Down
      { x: pos.x - 1, y: pos.y }, // Left
      { x: pos.x + 1, y: pos.y }, // Right
    ]

    for (const adjPos of adjacentPositions) {
      const door = level.doors.find((d) => d.position.x === adjPos.x && d.position.y === adjPos.y)
      if (door) return door
    }

    return null
  }

  /**
   * Check if player is on stairs
   */
  private isOnStairs(level: Level, pos: Position): boolean {
    if (level.stairsDown && this.positionsEqual(pos, level.stairsDown)) return true
    if (level.stairsUp && this.positionsEqual(pos, level.stairsUp)) return true
    return false
  }

  /**
   * Get adjacent monster (for combat context)
   */
  private getAdjacentMonster(level: Level, pos: Position): Monster | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const monster = level.monsters.find(
        (m) => m.position.x === adjPos.x && m.position.y === adjPos.y && m.isAwake
      )
      if (monster) return monster
    }

    return null
  }

  /**
   * Helper: Compare positions
   */
  private positionsEqual(a: Position, b: Position): boolean {
    return a.x === b.x && a.y === b.y
  }
}
```

### ContextualCommandBar Component

**File**: `src/ui/ContextualCommandBar.ts`

```typescript
import { GameState } from '@game/core/core'
import { ContextService, GameContext } from '@services/ContextService'

/**
 * ContextualCommandBar - Dynamic status bar showing available actions
 *
 * Displays:
 * - Context-aware commands (pickup, open, attack, etc.)
 * - Primary hint (item here, door nearby)
 * - Warnings (inventory full, low health)
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Consumes ContextService analysis
 * - Renders below dungeon view
 */
export class ContextualCommandBar {
  private container: HTMLDivElement

  constructor(private contextService: ContextService) {
    this.container = this.createContainer()
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div')
    div.className = 'contextual-command-bar'
    div.style.cssText = `
      background: #1a1a1a;
      color: #aaa;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      padding: 8px 12px;
      border-top: 1px solid #444;
      display: flex;
      align-items: center;
      gap: 16px;
    `
    return div
  }

  /**
   * Render contextual commands
   */
  render(state: GameState): void {
    const context = this.contextService.analyzeContext(state)
    this.container.innerHTML = this.buildContent(context)
  }

  private buildContent(context: GameContext): string {
    let html = ''

    // Primary hint (e.g., "Item here!")
    if (context.primaryHint) {
      html += `<span style="color: #FFD700; font-weight: bold;">📍 ${context.primaryHint}</span>`
      html += `<span style="color: #666;">│</span>`
    }

    // Warnings (inventory full, etc.)
    if (context.warnings.length > 0) {
      html += `<span style="color: #FF8800;">${context.warnings.join(' ')}</span>`
      html += `<span style="color: #666;">│</span>`
    }

    // Commands
    const commandsHtml = context.actions
      .map((action) => {
        const keyColor = action.category === 'primary' ? '#00FF00' : '#0088FF'
        const labelColor = action.category === 'primary' ? '#FFFFFF' : '#AAA'
        return `<span style="color: ${keyColor};">[${action.key}]</span> <span style="color: ${labelColor};">${action.label}</span>`
      })
      .join('  ')

    html += commandsHtml

    return html
  }

  /**
   * Get container element
   */
  getContainer(): HTMLDivElement {
    return this.container
  }
}
```

### Integration with GameRenderer

**File**: `src/ui/GameRenderer.ts` (MODIFY)

Add imports:
```typescript
import { ContextualCommandBar } from './ContextualCommandBar'
import { ContextService } from '@services/ContextService'
```

Add to constructor:
```typescript
export class GameRenderer {
  private dungeonContainer: HTMLElement
  private statsContainer: HTMLElement
  private messagesContainer: HTMLElement
  private commandBar: ContextualCommandBar  // ← ADD THIS

  constructor(
    private renderingService: RenderingService,
    private contextService: ContextService,  // ← ADD THIS
    _config = { ... }
  ) {
    this.dungeonContainer = this.createDungeonView()
    this.statsContainer = this.createStatsView()
    this.messagesContainer = this.createMessagesView()
    this.commandBar = new ContextualCommandBar(contextService)  // ← ADD THIS
  }

  getContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'game-container'
    container.appendChild(this.messagesContainer)
    container.appendChild(this.dungeonContainer)
    container.appendChild(this.commandBar.getContainer())  // ← ADD THIS (after dungeon)
    container.appendChild(this.statsContainer)
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
  this.commandBar.render(state)  // ← ADD THIS
}
```

### Integration with main.ts

**File**: `src/main.ts` (MODIFY)

Add import:
```typescript
import { ContextService } from '@services/ContextService'
```

Add service initialization:
```typescript
// Create services
const contextService = new ContextService()  // ← ADD THIS

// Create UI with services
const renderer = new GameRenderer(renderingService, contextService)  // ← ADD contextService
```

---

## Phase B: Auto-Notifications

### Overview

Proactively generate helpful messages when player enters new states or encounters important situations.

**Notification Triggers**:
- Stand on item → "You see a [ruby ring] here."
- Stand on gold → "You see 47 gold pieces here."
- Multiple items → "You see several items here. Press [,] to pick up."
- Adjacent to door → "There is a closed door nearby."
- Inventory full → "⚠ Your pack is full! (26/26 items)"
- Low food → "You have no food rations!"
- Adjacent monster → "The Orc is nearby!"

### NotificationService Implementation

**File**: `src/services/NotificationService/NotificationService.ts`

```typescript
import { GameState, Position, Level, Item, Monster } from '@game/core/core'

/**
 * NotificationService - Generates contextual auto-messages
 *
 * Triggers proactive notifications for:
 * - Item/gold presence
 * - Nearby doors/stairs
 * - Resource warnings (inventory full, no food, etc.)
 * - Proximity alerts (monsters nearby)
 *
 * Features:
 * - Smart deduplication (don't spam same message)
 * - Priority-based (critical > warning > info)
 * - Context-aware (only relevant to current situation)
 *
 * Architecture:
 * - Pure logic, returns message strings
 * - Called by MoveCommand after position change
 * - Integrates with MessageService
 */

interface NotificationContext {
  lastPosition?: Position
  lastItemSeen?: string
  lastGoldSeen?: number
  recentNotifications: Set<string>  // For deduplication
}

export class NotificationService {
  private context: NotificationContext = {
    recentNotifications: new Set(),
  }

  /**
   * Generate notifications for new player position
   */
  generateNotifications(state: GameState, previousPosition?: Position): string[] {
    const notifications: string[] = []
    const level = state.levels.get(state.currentLevel)
    if (!level) return notifications

    const currentPos = state.player.position

    // Reset deduplication if player moved
    if (previousPosition && !this.positionsEqual(currentPos, previousPosition)) {
      this.context.recentNotifications.clear()
    }

    // Check for items at position
    const itemsHere = level.items.filter(
      (item) => item.position?.x === currentPos.x && item.position?.y === currentPos.y
    )

    if (itemsHere.length === 1) {
      const item = itemsHere[0]
      const key = `item-${item.id}`
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`You see ${this.getArticle(item.name)} ${item.name} here.`)
        this.context.recentNotifications.add(key)
        this.context.lastItemSeen = item.id
      }
    } else if (itemsHere.length > 1) {
      const key = `items-${currentPos.x}-${currentPos.y}`
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`You see several items here. Press [,] to pick up.`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check for gold
    const goldHere = level.gold.find(
      (g) => g.position.x === currentPos.x && g.position.y === currentPos.y
    )

    if (goldHere) {
      const key = `gold-${goldHere.amount}`
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`You see ${goldHere.amount} gold piece${goldHere.amount !== 1 ? 's' : ''} here.`)
        this.context.recentNotifications.add(key)
        this.context.lastGoldSeen = goldHere.amount
      }
    }

    // Check for nearby doors
    const nearbyDoor = this.getNearbyDoor(level, currentPos)
    if (nearbyDoor && nearbyDoor.state === 'CLOSED') {
      const key = 'door-nearby'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`There is a closed door nearby.`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check inventory status
    if (state.player.inventory.length >= 26) {
      const key = 'inventory-full'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`⚠ Your pack is full! (26/26 items)`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check for adjacent monsters (warning)
    const adjacentMonster = this.getAdjacentMonster(level, currentPos)
    if (adjacentMonster && adjacentMonster.isAwake) {
      const key = `monster-${adjacentMonster.id}`
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`The ${adjacentMonster.name} is nearby!`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check critical resources
    const foodCount = state.player.inventory.filter((item) => item.type === 'FOOD').length
    if (foodCount === 0 && state.player.hunger < 500) {
      const key = 'no-food'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`⚠ You have no food rations!`)
        this.context.recentNotifications.add(key)
      }
    }

    return notifications
  }

  /**
   * Get nearby door (adjacent tiles)
   */
  private getNearbyDoor(level: Level, pos: Position) {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const door = level.doors.find((d) => d.position.x === adjPos.x && d.position.y === adjPos.y)
      if (door) return door
    }

    return null
  }

  /**
   * Get adjacent monster
   */
  private getAdjacentMonster(level: Level, pos: Position): Monster | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const monster = level.monsters.find(
        (m) => m.position.x === adjPos.x && m.position.y === adjPos.y && m.isAwake
      )
      if (monster) return monster
    }

    return null
  }

  /**
   * Get article (a/an) for item name
   */
  private getArticle(name: string): string {
    const firstChar = name[0].toLowerCase()
    return ['a', 'e', 'i', 'o', 'u'].includes(firstChar) ? 'an' : 'a'
  }

  /**
   * Helper: Compare positions
   */
  private positionsEqual(a: Position, b: Position): boolean {
    return a.x === b.x && a.y === b.y
  }
}
```

### Integration with MoveCommand

**File**: `src/commands/MoveCommand/MoveCommand.ts` (MODIFY)

Add import:
```typescript
import { NotificationService } from '@services/NotificationService'
```

Add to constructor:
```typescript
constructor(
  private direction: Direction,
  private movementService: MovementService,
  private lightingService: LightingService,
  private fovService: FOVService,
  private messageService: MessageService,
  private combatService: CombatService,
  private notificationService: NotificationService  // ← ADD THIS
) {}
```

Modify execute method (add after FOV computation):
```typescript
execute(state: GameState): GameState {
  const previousPosition = state.player.position

  // ... existing movement logic ...

  // Compute new FOV
  const visibleCells = this.fovService.computeFOV(/* ... */)

  // Update exploration
  const updatedLevel = this.fovService.updateExploration(/* ... */)

  // Generate auto-notifications (NEW)
  const notifications = this.notificationService.generateNotifications(
    stateWithUpdatedLevel,
    previousPosition
  )

  // Add notifications to message log
  let finalState = stateWithUpdatedLevel
  notifications.forEach((msg) => {
    finalState = {
      ...finalState,
      messages: this.messageService.addMessage(finalState.messages, msg, 'info', finalState.turnCount),
    }
  })

  return finalState
}
```

### Integration with main.ts

**File**: `src/main.ts` (MODIFY)

Add import:
```typescript
import { NotificationService } from '@services/NotificationService'
```

Add service initialization:
```typescript
// Create services
const notificationService = new NotificationService()  // ← ADD THIS
```

Update MoveCommand creation in InputHandler:
```typescript
// In InputHandler constructor, pass notificationService to commands
// This requires updating InputHandler to receive notificationService
```

---

## Phase C: Enhanced Message Log

### Overview

Improve message log readability with grouping, expansion, and message history.

**Features**:
- Expand from 5 to 8 visible lines
- Group similar messages: "You hit the Orc (x3)" instead of 3 separate lines
- Message importance levels (critical > warning > info)
- Press 'm' to view full message history modal
- Auto-scroll to important messages

### MessageService Enhancements

**File**: `src/services/MessageService/MessageService.ts` (MODIFY)

Add message grouping:
```typescript
interface Message {
  text: string
  type: 'info' | 'combat' | 'warning' | 'critical' | 'success' | 'debug'
  turn: number
  count?: number  // ← ADD: For grouped messages
  importance?: number  // ← ADD: 1 (low) to 5 (critical)
}

export class MessageService {
  private readonly MAX_MESSAGES = 1000  // Store full history

  /**
   * Add message with smart grouping
   */
  addMessage(
    messages: Message[],
    text: string,
    type: Message['type'],
    turn: number,
    importance: number = 3  // Default medium importance
  ): Message[] {
    // Check if last message is identical (for grouping)
    const lastMessage = messages[messages.length - 1]

    if (lastMessage && lastMessage.text === text && lastMessage.turn === turn) {
      // Group identical messages
      const count = (lastMessage.count || 1) + 1
      const updatedMessages = [...messages]
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        count,
      }
      return updatedMessages
    }

    // Add new message
    const newMessage: Message = { text, type, turn, importance }
    const updated = [...messages, newMessage]

    // Trim to max length
    if (updated.length > this.MAX_MESSAGES) {
      return updated.slice(-this.MAX_MESSAGES)
    }

    return updated
  }

  /**
   * Get recent messages with grouping applied
   */
  getRecentMessages(messages: Message[], count: number = 8): Message[] {
    return messages.slice(-count).map((msg) => {
      if (msg.count && msg.count > 1) {
        return {
          ...msg,
          text: `${msg.text} (x${msg.count})`,
        }
      }
      return msg
    })
  }

  /**
   * Get messages by importance threshold
   */
  getImportantMessages(messages: Message[], minImportance: number = 4): Message[] {
    return messages.filter((msg) => (msg.importance || 3) >= minImportance)
  }
}
```

### Enhanced Message Rendering

**File**: `src/ui/GameRenderer.ts` (MODIFY)

Update renderMessages:
```typescript
private renderMessages(state: GameState): void {
  const recent = this.messageService.getRecentMessages(state.messages, 8)  // ← 8 lines now

  this.messagesContainer.innerHTML = `
    <div class="messages">
      ${recent
        .map((msg) => {
          const importance = msg.importance || 3
          const weight = importance >= 4 ? 'font-weight: bold;' : ''
          return `<div class="msg-${msg.type}" style="${weight}">${msg.text}</div>`
        })
        .join('')}
    </div>
  `
}
```

### Message History Modal

**File**: `src/ui/MessageHistoryModal.ts` (NEW)

```typescript
import { GameState, Message } from '@game/core/core'
import { MessageService } from '@services/MessageService'

/**
 * MessageHistoryModal - Full message log viewer
 *
 * Press 'm' to view all messages from current game
 *
 * Features:
 * - Scrollable message list
 * - Color-coded by type
 * - Shows turn numbers
 * - Close with ESC or 'm' again
 */
export class MessageHistoryModal {
  private overlay: HTMLDivElement | null = null

  constructor(private messageService: MessageService) {}

  /**
   * Show message history modal
   */
  show(state: GameState): void {
    if (this.overlay) return // Already showing

    this.overlay = document.createElement('div')
    this.overlay.className = 'message-history-modal'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 20px;
      max-width: 800px;
      max-height: 600px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      color: #fff;
    `

    const messages = state.messages.map((msg, i) => {
      const color = this.getColorForType(msg.type)
      const countText = msg.count && msg.count > 1 ? ` (x${msg.count})` : ''
      return `
        <div style="margin-bottom: 8px;">
          <span style="color: #666;">Turn ${msg.turn}:</span>
          <span style="color: ${color};">${msg.text}${countText}</span>
        </div>
      `
    }).join('')

    content.innerHTML = `
      <h2 style="margin-top: 0;">Message History</h2>
      <div style="margin-top: 16px;">${messages}</div>
      <div style="margin-top: 16px; text-align: center; color: #888;">
        Press [m] or [ESC] to close
      </div>
    `

    this.overlay.appendChild(content)
    document.body.appendChild(this.overlay)

    // Scroll to bottom
    content.scrollTop = content.scrollHeight
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay)
      this.overlay = null
    }
  }

  private getColorForType(type: string): string {
    switch (type) {
      case 'combat': return '#FF4444'
      case 'warning': return '#FFDD00'
      case 'critical': return '#FF0000'
      case 'success': return '#00FF00'
      case 'debug': return '#00FFFF'
      default: return '#FFFFFF'
    }
  }
}
```

---

## Phase D: Visual State Indicators

### Overview

Add color-coding and visual feedback for important player states.

**Indicators**:
- HP bar: green (full) → yellow (50%) → red (25%) → blinking red (10%)
- Hunger bar: colored progress bar
- Light status: icon with color (bright → dim → dark → OUT)
- Inventory: "15/26" with color (green → yellow → red)
- Burden: "⚠ Burdened" when overencumbered

### Enhanced Stats Panel

**File**: `src/ui/GameRenderer.ts` (MODIFY)

Update renderStats method:
```typescript
private renderStats(state: GameState): void {
  const { player } = state
  const lightSource = player.equipment.lightSource

  // HP color (green > yellow > red > blinking red)
  const hpPercent = (player.hp / player.maxHp) * 100
  const hpColor =
    hpPercent >= 75 ? '#00FF00' :
    hpPercent >= 50 ? '#FFDD00' :
    hpPercent >= 25 ? '#FF8800' : '#FF0000'
  const hpBlink = hpPercent < 10 ? 'animation: blink 1s infinite;' : ''

  // Hunger bar (green > yellow > orange > red)
  const hungerPercent = Math.min(100, (player.hunger / 1300) * 100)
  const hungerColor =
    hungerPercent >= 75 ? '#00FF00' :
    hungerPercent >= 50 ? '#FFDD00' :
    hungerPercent >= 25 ? '#FF8800' : '#FF0000'
  const hungerBar = '█'.repeat(Math.floor(hungerPercent / 10)) + '▒'.repeat(10 - Math.floor(hungerPercent / 10))

  // Inventory color
  const invCount = player.inventory.length
  const invColor =
    invCount < 20 ? '#00FF00' :
    invCount < 24 ? '#FFDD00' :
    invCount < 26 ? '#FF8800' : '#FF0000'

  // Light status
  let lightDisplay = 'None (darkness!)'
  let lightColor = '#FF0000'
  if (lightSource) {
    const fuel = lightSource.fuel || 0
    const maxFuel = lightSource.maxFuel || 1
    const fuelPercent = (fuel / maxFuel) * 100

    lightColor =
      fuelPercent >= 50 ? '#FFDD00' :
      fuelPercent >= 20 ? '#FF8800' : '#FF0000'

    const fuelText = lightSource.fuel !== undefined ? ` (${fuel})` : ''
    lightDisplay = `${lightSource.name}${fuelText}`
  }

  this.statsContainer.innerHTML = `
    <style>
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    </style>
    <div class="stats">
      <div style="color: ${hpColor}; ${hpBlink}">HP: ${player.hp}/${player.maxHp}</div>
      <div>Str: ${player.strength}/${player.maxStrength}</div>
      <div>AC: ${player.ac}</div>
      <div>Level: ${player.level}</div>
      <div>XP: ${player.xp}</div>
      <div>Gold: ${player.gold}</div>
      <div>Depth: ${state.currentLevel}</div>
      <div>Turn: ${state.turnCount}</div>
      <div style="margin-top: 8px;">
        <span style="color: #888;">Hunger:</span><br>
        <span style="color: ${hungerColor};">[${hungerBar}]</span>
      </div>
      <div style="margin-top: 8px;">
        <span style="color: #888;">Light:</span><br>
        <span style="color: ${lightColor};">${lightDisplay}</span>
      </div>
      <div style="margin-top: 8px;">
        <span style="color: #888;">Inventory:</span>
        <span style="color: ${invColor};"> ${invCount}/26</span>
      </div>
    </div>
  `
}
```

---

## Phase E: Quick Help Overlay

### Overview

Press `?` to show contextual help and command reference.

**Help Content**:
- Context-aware tips (what's available NOW)
- General commands reference
- Item symbols guide
- Monster threat guide

### HelpModal Component

**File**: `src/ui/HelpModal.ts` (NEW)

```typescript
import { GameState } from '@game/core/core'
import { ContextService } from '@services/ContextService'

/**
 * HelpModal - Quick reference and contextual help
 *
 * Press '?' to show help overlay
 *
 * Shows:
 * - Context-aware tips
 * - Command reference
 * - Item symbols
 * - Monster guide
 */
export class HelpModal {
  private overlay: HTMLDivElement | null = null

  constructor(private contextService: ContextService) {}

  /**
   * Show help modal
   */
  show(state: GameState): void {
    if (this.overlay) return

    const context = this.contextService.analyzeContext(state)

    this.overlay = document.createElement('div')
    this.overlay.className = 'help-modal'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      color: #fff;
      font-family: 'Courier New', monospace;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #00FF00;
      border-radius: 8px;
      padding: 24px;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
    `

    // Context-aware tips
    const contextTips = context.actions.slice(0, 5).map(action =>
      `<span style="color: #00FF00;">[${action.key}]</span> ${action.label}`
    ).join(' | ')

    content.innerHTML = `
      <h2 style="color: #00FF00; margin-top: 0;">📖 Quick Help</h2>

      <div style="background: #222; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
        <div style="color: #FFD700; margin-bottom: 8px;">🎯 Available Now:</div>
        <div>${contextTips || 'Explore the dungeon!'}</div>
      </div>

      <h3 style="color: #00FFFF;">Movement & Actions</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div><span style="color: #00FF00;">↑↓←→</span> Move/Attack</div>
        <div><span style="color: #00FF00;">[,]</span> Pick up item</div>
        <div><span style="color: #00FF00;">[i]</span> Inventory</div>
        <div><span style="color: #00FF00;">[d]</span> Drop item</div>
        <div><span style="color: #00FF00;">[o]</span> Open door</div>
        <div><span style="color: #00FF00;">[c]</span> Close door</div>
        <div><span style="color: #00FF00;">[s]</span> Search</div>
        <div><span style="color: #00FF00;">[>]</span> Descend stairs</div>
        <div><span style="color: #00FF00;">[<]</span> Ascend stairs</div>
        <div><span style="color: #00FF00;">[S]</span> Save game</div>
      </div>

      <h3 style="color: #00FFFF;">Items</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div><span style="color: #00FF00;">[q]</span> Quaff potion</div>
        <div><span style="color: #00FF00;">[r]</span> Read scroll</div>
        <div><span style="color: #00FF00;">[z]</span> Zap wand</div>
        <div><span style="color: #00FF00;">[e]</span> Eat food</div>
        <div><span style="color: #00FF00;">[w]</span> Wield weapon</div>
        <div><span style="color: #00FF00;">[W]</span> Wear armor</div>
        <div><span style="color: #00FF00;">[P]</span> Put on ring</div>
        <div><span style="color: #00FF00;">[R]</span> Remove ring</div>
      </div>

      <h3 style="color: #00FFFF;">Symbols</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; font-size: 13px;">
        <div><span style="color: #00FFFF;">@</span> You</div>
        <div><span style="color: #FF00FF;">!</span> Potion</div>
        <div><span style="color: #FFFFFF;">?</span> Scroll</div>
        <div><span style="color: #FFD700;">*</span> Gold</div>
        <div><span style="color: #FFD700;">=</span> Ring</div>
        <div><span style="color: #00FFFF;">/</span> Wand</div>
        <div><span style="color: #8B4513;">%</span> Food</div>
        <div><span style="color: #C0C0C0;">)</span> Weapon</div>
        <div><span style="color: #C0C0C0;">[</span> Armor</div>
        <div><span style="color: #FFFFFF;">></span> Stairs down</div>
        <div><span style="color: #FFFFFF;"><</span> Stairs up</div>
        <div><span style="color: #D4AF37;">+</span> Door</div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #444; color: #888;">
        Press [?] or [ESC] to close
      </div>
    `

    this.overlay.appendChild(content)
    document.body.appendChild(this.overlay)
  }

  /**
   * Hide help modal
   */
  hide(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay)
      this.overlay = null
    }
  }
}
```

### Wire Help Key in InputHandler

**File**: `src/ui/InputHandler.ts` (MODIFY)

Add to switch statement:
```typescript
case '?':
  // Show help
  event.preventDefault()
  this.helpModal.show(state)
  return null
```

---

## Testing Requirements

### Test Coverage Goals
- **ContextService**: 100% coverage (context detection logic)
- **NotificationService**: 100% coverage (all trigger conditions)
- **MessageService enhancements**: >90% coverage (grouping, importance)
- **UI Components**: >80% coverage (rendering logic)
- **Total new tests**: 35-40

### Test Files to Create

#### 1. `src/services/ContextService/ContextService.test.ts`

```typescript
import { ContextService } from './ContextService'
import { GameState, Level, Item, Monster, Door } from '@game/core/core'

describe('ContextService - Context Detection', () => {
  let service: ContextService
  let mockState: GameState

  beforeEach(() => {
    service = new ContextService()
    // ... setup mock state
  })

  describe('Item Context', () => {
    test('shows pickup command when standing on item', () => {
      // Arrange: place item at player position
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.primaryHint).toContain('Item here')
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: ',', label: 'pickup' })
      )
    })

    test('shows type-specific commands for weapon', () => {
      // Arrange: weapon at position
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'w', label: 'wield' })
      )
    })

    test('shows multiple items message for 2+ items', () => {
      // Arrange: 2 items at position
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.primaryHint).toContain('several items')
    })
  })

  describe('Door Context', () => {
    test('shows open command for adjacent closed door', () => {
      // Arrange: closed door adjacent to player
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'o', label: 'open door' })
      )
    })

    test('shows close command for adjacent open door', () => {
      // Arrange: open door adjacent
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'c', label: 'close door' })
      )
    })
  })

  describe('Combat Context', () => {
    test('shows attack command for adjacent awake monster', () => {
      // Arrange: monster adjacent
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: '↑↓←→', label: 'attack' })
      )
    })

    test('does not show attack for sleeping monster', () => {
      // Arrange: sleeping monster adjacent
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions.find(a => a.label === 'attack')).toBeUndefined()
    })
  })

  describe('Warnings', () => {
    test('shows inventory full warning at 26 items', () => {
      // Arrange: 26 items in inventory
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.warnings).toContain('⚠ Inventory full (26/26)')
    })
  })

  describe('Priority Sorting', () => {
    test('sorts actions by priority descending', () => {
      // Arrange: multiple actions
      const context = service.analyzeContext(mockState)

      // Assert
      const priorities = context.actions.map(a => a.priority)
      const sorted = [...priorities].sort((a, b) => b - a)
      expect(priorities).toEqual(sorted)
    })

    test('limits to 7 actions maximum', () => {
      // Arrange: many possible actions
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions.length).toBeLessThanOrEqual(7)
    })
  })
})
```

**Expected tests**: 12-15 tests

#### 2. `src/services/NotificationService/NotificationService.test.ts`

```typescript
describe('NotificationService - Auto-Notifications', () => {
  let service: NotificationService
  let mockState: GameState

  describe('Item Notifications', () => {
    test('generates item presence message when standing on item', () => {
      const notifications = service.generateNotifications(mockState)

      expect(notifications).toContain('You see a ruby ring here.')
    })

    test('generates gold message with correct amount', () => {
      const notifications = service.generateNotifications(mockState)

      expect(notifications).toContain('You see 47 gold pieces here.')
    })

    test('generates multiple items message for 2+ items', () => {
      const notifications = service.generateNotifications(mockState)

      expect(notifications).toContain('You see several items here. Press [,] to pick up.')
    })

    test('uses correct article (a/an) for item names', () => {
      // Test: "an emerald" vs "a sword"
    })
  })

  describe('Deduplication', () => {
    test('does not repeat same notification on same position', () => {
      const first = service.generateNotifications(mockState)
      const second = service.generateNotifications(mockState)

      expect(second).toEqual([]) // No new notifications
    })

    test('clears deduplication when player moves', () => {
      const first = service.generateNotifications(mockState, { x: 5, y: 5 })
      // Move player
      const second = service.generateNotifications(mockStateAtNewPos, { x: 6, y: 5 })

      expect(second.length).toBeGreaterThan(0)
    })
  })

  describe('Resource Warnings', () => {
    test('warns when inventory is full', () => {
      const notifications = service.generateNotifications(mockState)

      expect(notifications).toContain('⚠ Your pack is full! (26/26 items)')
    })

    test('warns when no food and hungry', () => {
      const notifications = service.generateNotifications(mockState)

      expect(notifications).toContain('⚠ You have no food rations!')
    })
  })
})
```

**Expected tests**: 10-12 tests

#### 3. `src/ui/ContextualCommandBar.test.ts`

```typescript
describe('ContextualCommandBar', () => {
  let commandBar: ContextualCommandBar
  let mockContextService: ContextService

  test('renders primary hint when available', () => {
    const mockContext = {
      primaryHint: 'Item here: ruby ring',
      actions: [],
      warnings: []
    }

    commandBar.render(mockState)

    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('ruby ring')
  })

  test('renders actions with correct colors', () => {
    const mockContext = {
      actions: [
        { key: ',', label: 'pickup', priority: 100, category: 'primary' }
      ],
      warnings: []
    }

    commandBar.render(mockState)

    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('#00FF00') // Green for primary
    expect(html).toContain('[,]')
    expect(html).toContain('pickup')
  })

  test('renders warnings in orange', () => {
    const mockContext = {
      actions: [],
      warnings: ['⚠ Inventory full']
    }

    commandBar.render(mockState)

    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('#FF8800')
    expect(html).toContain('Inventory full')
  })
})
```

**Expected tests**: 6-8 tests

---

## Architecture Compliance Checklist

### ✅ Services contain ALL logic
- ContextService analyzes state, returns structured data
- NotificationService generates messages, manages deduplication
- MessageService handles grouping, importance
- No logic in UI components

### ✅ UI renders state only
- ContextualCommandBar displays context from ContextService
- HelpModal shows static reference + context
- MessageHistoryModal renders message list
- No game logic in render methods

### ✅ Immutability throughout
- All services return new arrays/objects
- Message additions use spread operators
- State never mutated

### ✅ Dependency injection
- ContextService injected into UI components
- NotificationService injected into commands
- MessageService already follows pattern

### ✅ Barrel exports
- index.ts for all new services
- Path aliases (@services/ContextService, @ui/*)

---

## Files Checklist

### Create (12 files)
- [ ] src/services/ContextService/ContextService.ts
- [ ] src/services/ContextService/ContextService.test.ts
- [ ] src/services/ContextService/index.ts
- [ ] src/services/NotificationService/NotificationService.ts
- [ ] src/services/NotificationService/NotificationService.test.ts
- [ ] src/services/NotificationService/index.ts
- [ ] src/ui/ContextualCommandBar.ts
- [ ] src/ui/ContextualCommandBar.test.ts
- [ ] src/ui/MessageHistoryModal.ts
- [ ] src/ui/MessageHistoryModal.test.ts
- [ ] src/ui/HelpModal.ts
- [ ] src/ui/HelpModal.test.ts

### Modify (5 files)
- [ ] src/ui/GameRenderer.ts (add command bar, enhance message log, visual indicators)
- [ ] src/services/MessageService/MessageService.ts (add grouping, importance)
- [ ] src/commands/MoveCommand/MoveCommand.ts (add notification triggers)
- [ ] src/ui/InputHandler.ts (add help key, message history key)
- [ ] src/main.ts (initialize new services)

---

## Implementation Timeline

### Phase A: Contextual Status Bar (1.5 hours)
1. Create ContextService with context detection logic
2. Write ContextService tests (12-15 tests)
3. Create ContextualCommandBar UI component
4. Write ContextualCommandBar tests (6-8 tests)
5. Integrate with GameRenderer and main.ts
6. Manual testing: verify commands update correctly

### Phase B: Auto-Notifications (1 hour)
1. Create NotificationService with trigger logic
2. Write NotificationService tests (10-12 tests)
3. Integrate with MoveCommand
4. Update main.ts initialization
5. Manual testing: verify notifications appear correctly

### Phase C: Enhanced Message Log (1 hour)
1. Enhance MessageService (grouping, importance)
2. Write enhanced MessageService tests (5-7 tests)
3. Create MessageHistoryModal component
4. Update GameRenderer message display (8 lines)
5. Wire 'm' key in InputHandler
6. Manual testing: verify grouping and history

### Phase D: Visual State Indicators (1 hour)
1. Update renderStats with color-coding
2. Add HP/hunger/light status colors
3. Add inventory fullness indicator
4. Add CSS animations (blink for critical HP)
5. Manual testing: verify all indicators

### Phase E: Quick Help Overlay (30 min)
1. Create HelpModal component
2. Write HelpModal tests (4-5 tests)
3. Wire '?' key in InputHandler
4. Manual testing: verify help display

### Final: Testing & Polish (30 min)
1. Run full test suite: `npm test`
2. Run coverage: `npm run test:coverage`
3. Manual UX testing: verify all flows
4. Update plan.md and game-design.md

**Total estimated time**: 4-5 hours

---

## Success Criteria

### Functional Requirements
- [ ] Press any key → relevant commands shown in status bar
- [ ] Stand on item → "You see [item] here" message
- [ ] Inventory full → warning in status bar + message
- [ ] Press '?' → help modal shows with current context
- [ ] Press 'm' → message history modal shows all messages
- [ ] HP/hunger/light → color-coded correctly
- [ ] Multiple same messages → grouped as "(x3)"

### UX Requirements
- [ ] New player can discover commands without docs
- [ ] Experienced player not slowed down (shortcuts work)
- [ ] Important warnings surface automatically
- [ ] UI feels responsive and helpful
- [ ] ASCII aesthetic preserved

### Technical Requirements
- [ ] All services tested (>90% coverage)
- [ ] UI components tested (>80% coverage)
- [ ] No logic in UI (architecture compliant)
- [ ] Immutability maintained throughout
- [ ] All tests passing

---

## User Experience Examples

### Example 1: Item Pickup Flow

**Before** (current):
```
Player moves to position with ruby ring
[No feedback]
Player presses random keys...
Player eventually finds ',' key
Item picked up: "Added ruby ring to inventory."
```

**After** (improved):
```
Player moves to position with ruby ring
AUTO-MESSAGE: "You see a ruby ring here."
STATUS BAR: [,] pickup  [i]nventory  [P]put on
Player sees [,] and presses it
Item picked up: "Added ruby ring to inventory (15/26)"
```

### Example 2: Door Interaction

**Before**:
```
Player approaches closed door
[No indication door is there unless visible]
Player must remember 'o' key
```

**After**:
```
Player approaches closed door
AUTO-MESSAGE: "There is a closed door nearby."
STATUS BAR: [o]pen door  [s]earch  [c]lose
Player presses 'o'
Door opens: "You open the door."
```

### Example 3: Inventory Full

**Before**:
```
Player picks up 26th item
[Inventory now full, no warning]
Player tries to pick up 27th item
"You cannot carry any more!"
```

**After**:
```
Player picks up 26th item
AUTO-MESSAGE: "⚠ Your pack is full! (26/26 items)"
STATUS BAR: Shows warning badge
STATS PANEL: Inventory count shows RED
Player sees warnings before trying next pickup
```

---

## Appendix A: Roguelike UI Best Practices

### Discoverability Principles
1. **Show, don't hide**: Make commands visible through UI
2. **Context over memory**: Relevant actions > full command list
3. **Teach through use**: Tooltips/hints teach keyboard shortcuts
4. **Support both patterns**: Noun-verb (select→act) + verb-noun (act→select)

### Modern Roguelike Patterns
1. **Automatic labeling**: Show object info when entering FOV
2. **Smart defaults**: Auto-determine obvious choices
3. **Contextual menus**: Right-click/interact shows relevant options
4. **Warning before consequence**: Show burden/danger before action
5. **Graceful degradation**: Modern UI optional, keyboard always works

### Accessibility Considerations
1. **Color-blind friendly**: Use shapes + colors (not just colors)
2. **Keyboard-first**: All mouse actions have keyboard equivalent
3. **Clear messaging**: Explicit text > implicit symbols
4. **Adjustable UI**: Options to show/hide modern elements

---

## Appendix B: Alternative Approaches Considered

### Mouse Support (Deferred)
**Why deferred**: Web platform supports it well, but requires:
- Click-to-move pathfinding
- Right-click context menus
- Hover tooltips for every tile
- Touch support for mobile

**Decision**: Implement post-launch as progressive enhancement

### Minimap (Rejected)
**Why rejected**:
- Clutters ASCII aesthetic
- Not in original Rogue
- FOV system already provides spatial awareness

### Floating Tooltips (Rejected)
**Why rejected**:
- Breaks terminal feel
- Status bar provides same info
- Can be distracting

### Auto-pickup (Partially Implemented)
**Why partial**:
- Auto-notifications achieve same discoverability
- Player still has control with ','
- Avoids accidental pickups (heavy items, cursed items)

---

**End of UI/UX Enhancement Plan**

This document provides complete context for implementing modern roguelike UI improvements. Follow phases A-E in order, test after each phase, and verify UX with manual testing. When complete, update game-design.md UI section and create descriptive git commit.
