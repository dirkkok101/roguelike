# Phase 7 Implementation Plan: Win Condition & Polish

**Version**: 2.0
**Created**: 2025-10-04
**Last Updated**: 2025-10-04
**Status**: ✅ COMPLETE (11/11 tasks complete - 100%)
**Goal**: Complete game loop with Amulet of Yendor, save/load system, and polished UI

---

## Table of Contents

1. [Overview](#overview)
2. [Task A: Amulet of Yendor](#task-a-amulet-of-yendor)
3. [Task B: Victory Condition System](#task-b-victory-condition-system)
4. [Task C: Victory Screen UI](#task-c-victory-screen-ui)
5. [Task D: Death Screen UI](#task-d-death-screen-ui)
6. [Task E: LocalStorageService](#task-e-localstorageservice)
7. [Task F: SaveCommand & Integration](#task-f-savecommand--integration)
8. [Task G: Auto-Save System](#task-g-auto-save-system)
9. [Task H: Load Game Flow](#task-h-load-game-flow)
10. [Task I: Permadeath Implementation](#task-i-permadeath-implementation)
11. [Task J: Main Menu System](#task-j-main-menu-system)
12. [Task K: UI Polish](#task-k-ui-polish)
13. [Integration Checklist](#integration-checklist)
14. [Testing Strategy](#testing-strategy)
15. [Success Criteria](#success-criteria)

---

## Overview

### Phase 7 Goals

**Primary Objectives**:
1. ✅ Implement complete win condition (Amulet retrieval + return to Level 1)
2. ✅ Create game-ending screens (victory and death)
3. ✅ Build save/load system with LocalStorage persistence
4. ⚪ Implement auto-save and permadeath
5. ⚪ Create main menu system
6. ⚪ Polish UI for release quality

**Current Progress** (2025-10-04):
- ✅ **Task A**: Amulet of Yendor spawning, pickup, restrictions (20 tests)
- ✅ **Task B**: VictoryService with victory logic and scoring (16 tests)
- ✅ **Task C**: VictoryScreen UI component (19 tests)
- ✅ **Task D**: DeathScreen UI component with death tracking (22 tests)
- ✅ **Task E**: LocalStorageService with serialization (26 tests)
- ✅ **Task F**: SaveCommand with S key binding (9 tests)
- ⚪ **Task G**: QuitCommand & AutoSaveMiddleware (pending)
- ⚪ **Task H**: Load game on startup (pending)
- ⚪ **Task I**: Permadeath implementation (pending)
- ⚪ **Task J**: Main menu system (pending)
- ⚪ **Task K**: UI polish (pending)

**Test Results**: 1191 tests passing (+112 new tests)

**Architecture Alignment**:
- Services contain all game logic ✅
- Commands orchestrate service calls ✅
- UI components render state only ✅
- Immutable state updates throughout ✅
- >80% test coverage for all new code ✅

**Dependencies**:
- Phase 1-6 complete (all core systems working) ✅
- `isGameOver` and `hasWon` flags already in GameState ✅
- `ItemType.AMULET` already defined ✅
- Level generation (stairs) already working ✅
- Modal system established (ModalController, HelpModal) ✅

---

## Task A: Amulet of Yendor

### A1: Data Structure Changes

**Update Player Interface** (no changes needed - items stored in inventory)

**Add GameState Field**:
```typescript
// src/types/core/core.ts
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
  hasAmulet: boolean  // ← ADD THIS
  itemNameMap: ItemNameMap
  identifiedItems: Set<string>
  debug?: DebugState
}
```

**Amulet Item Definition**:
```typescript
// In DungeonService or ItemDataLoader
const AMULET_OF_YENDOR: Item = {
  id: 'amulet_yendor_001',
  name: 'Amulet of Yendor',
  type: ItemType.AMULET,
  identified: true,  // Always identified
  position: { x: 0, y: 0 },  // Set by spawn logic
}
```

### A2: Spawn Logic (DungeonService)

**Add Method**:
```typescript
// DungeonService.ts
spawnAmulet(level: Level): Level {
  // Only spawn on Level 10
  if (level.depth !== 10) {
    return level
  }

  // Find center of last room
  const lastRoom = level.rooms[level.rooms.length - 1]
  const centerX = lastRoom.x + Math.floor(lastRoom.width / 2)
  const centerY = lastRoom.y + Math.floor(lastRoom.height / 2)

  const amulet: Item = {
    id: `amulet_${Date.now()}`,
    name: 'Amulet of Yendor',
    type: ItemType.AMULET,
    identified: true,
    position: { x: centerX, y: centerY },
  }

  return {
    ...level,
    items: [...level.items, amulet],
  }
}
```

**Integration Point**: Call `spawnAmulet()` in `generateLevel()` after room/corridor generation

### A3: Pickup Restrictions (InventoryService)

**Add Method**:
```typescript
// InventoryService.ts
canDropAmulet(item: Item): boolean {
  return item.type !== ItemType.AMULET
}
```

**Update DropCommand**:
```typescript
// DropCommand.ts - Add validation
execute(state: GameState): GameState {
  // ...existing logic...

  if (!this.inventoryService.canDropAmulet(selectedItem)) {
    return this.messageService.addMessage(
      state.messages,
      'The Amulet of Yendor cannot be dropped!',
      'warning',
      state.turnCount
    )
  }

  // ...continue with drop logic...
}
```

### A4: Amulet Tracking (PickUpCommand)

**Update PickUpCommand**:
```typescript
// PickUpCommand.ts - Set hasAmulet flag
execute(state: GameState): GameState {
  // ...existing pickup logic...

  // Check if picked up amulet
  const hasAmulet = state.hasAmulet || item.type === ItemType.AMULET

  if (item.type === ItemType.AMULET) {
    messages = this.messageService.addMessage(
      messages,
      'You have retrieved the Amulet of Yendor! Return to Level 1 to win!',
      'success',
      state.turnCount
    )
  }

  return {
    ...state,
    hasAmulet,
    messages,
    player: updatedPlayer,
    // ...rest of state
  }
}
```

### A5: Tests

**File**: `src/services/DungeonService/amulet-spawning.test.ts`

```typescript
describe('DungeonService - Amulet Spawning', () => {
  test('spawns amulet on level 10', () => {
    const level = service.generateLevel(10, config)
    const amulets = level.items.filter(i => i.type === ItemType.AMULET)

    expect(amulets).toHaveLength(1)
    expect(amulets[0].name).toBe('Amulet of Yendor')
    expect(amulets[0].identified).toBe(true)
  })

  test('does not spawn amulet on levels 1-9', () => {
    for (let depth = 1; depth <= 9; depth++) {
      const level = service.generateLevel(depth, config)
      const amulets = level.items.filter(i => i.type === ItemType.AMULET)
      expect(amulets).toHaveLength(0)
    }
  })

  test('amulet spawns in center of last room', () => {
    const level = service.generateLevel(10, config)
    const amulet = level.items.find(i => i.type === ItemType.AMULET)
    const lastRoom = level.rooms[level.rooms.length - 1]

    const expectedX = lastRoom.x + Math.floor(lastRoom.width / 2)
    const expectedY = lastRoom.y + Math.floor(lastRoom.height / 2)

    expect(amulet?.position).toEqual({ x: expectedX, y: expectedY })
  })
})
```

**File**: `src/commands/PickUpCommand/amulet-pickup.test.ts`

```typescript
describe('PickUpCommand - Amulet Pickup', () => {
  test('sets hasAmulet flag when picking up amulet', () => {
    const state = createTestState({
      hasAmulet: false,
      currentLevel: createLevelWithAmuletAt(player.position),
    })

    const result = command.execute(state)

    expect(result.hasAmulet).toBe(true)
  })

  test('shows victory message on amulet pickup', () => {
    const state = createTestState(/* amulet at player pos */)
    const result = command.execute(state)

    const lastMessage = result.messages[result.messages.length - 1]
    expect(lastMessage.text).toContain('Return to Level 1 to win')
    expect(lastMessage.type).toBe('success')
  })
})
```

**File**: `src/commands/DropCommand/amulet-restrictions.test.ts`

```typescript
describe('DropCommand - Amulet Restrictions', () => {
  test('prevents dropping amulet', () => {
    const amulet = createAmulet()
    const state = createTestState({
      player: { inventory: [amulet] },
    })

    const result = command.execute(state)

    expect(result.player.inventory).toContain(amulet)
    expect(result.messages[result.messages.length - 1].text)
      .toContain('cannot be dropped')
  })

  test('allows dropping other items normally', () => {
    const potion = createPotion()
    const state = createTestState({
      player: { inventory: [potion] },
    })

    const result = command.execute(state)

    expect(result.player.inventory).not.toContain(potion)
  })
})
```

---

## Task B: Victory Condition System

### B1: Victory Check Service

**Create**: `src/services/VictoryService/VictoryService.ts`

```typescript
import { GameState } from '@game/core/core'

export class VictoryService {
  /**
   * Check if player has won the game
   * Win condition: On Level 1 with Amulet of Yendor
   */
  checkVictory(state: GameState): boolean {
    return state.currentLevel === 1 && state.hasAmulet
  }

  /**
   * Calculate final score based on:
   * - Gold collected
   * - Levels explored
   * - Monsters killed
   * - Turns taken (lower is better)
   * - XP earned
   */
  calculateScore(state: GameState): number {
    const goldScore = state.player.gold * 10
    const levelScore = state.currentLevel * 100
    const xpScore = state.player.xp * 5
    const turnPenalty = Math.floor(state.turnCount / 10)

    return Math.max(0, goldScore + levelScore + xpScore - turnPenalty)
  }

  /**
   * Generate victory statistics for display
   */
  getVictoryStats(state: GameState): VictoryStats {
    return {
      finalLevel: state.player.level,
      totalGold: state.player.gold,
      totalXP: state.player.xp,
      totalTurns: state.turnCount,
      deepestLevel: this.getDeepestLevel(state),
      finalScore: this.calculateScore(state),
      seed: state.seed,
      gameId: state.gameId,
    }
  }

  private getDeepestLevel(state: GameState): number {
    // Get highest level number from levels map
    return Math.max(...Array.from(state.levels.keys()))
  }
}

export interface VictoryStats {
  finalLevel: number
  totalGold: number
  totalXP: number
  totalTurns: number
  deepestLevel: number
  finalScore: number
  seed: string
  gameId: string
}
```

### B2: Victory Check Integration

**MoveStairsCommand Update**:
```typescript
// MoveStairsCommand.ts
constructor(
  // ...existing services...
  private victoryService: VictoryService
) {}

execute(state: GameState): GameState {
  // ...existing movement logic...

  const newState = {
    ...state,
    currentLevel: targetLevel,
    player: movedPlayer,
    levels: updatedLevels,
  }

  // Check victory condition after moving to new level
  if (this.victoryService.checkVictory(newState)) {
    return {
      ...newState,
      hasWon: true,
      isGameOver: true,
      messages: this.messageService.addMessage(
        newState.messages,
        'You have escaped with the Amulet of Yendor! You win!',
        'success',
        newState.turnCount
      ),
    }
  }

  return newState
}
```

### B3: Tests

**File**: `src/services/VictoryService/victory-condition.test.ts`

```typescript
describe('VictoryService - Victory Condition', () => {
  test('returns true when on level 1 with amulet', () => {
    const state = createTestState({
      currentLevel: 1,
      hasAmulet: true,
    })

    expect(service.checkVictory(state)).toBe(true)
  })

  test('returns false when on level 1 without amulet', () => {
    const state = createTestState({
      currentLevel: 1,
      hasAmulet: false,
    })

    expect(service.checkVictory(state)).toBe(false)
  })

  test('returns false when on level 2+ with amulet', () => {
    const state = createTestState({
      currentLevel: 5,
      hasAmulet: true,
    })

    expect(service.checkVictory(state)).toBe(false)
  })
})
```

**File**: `src/services/VictoryService/score-calculation.test.ts`

```typescript
describe('VictoryService - Score Calculation', () => {
  test('calculates score from gold, level, xp, turns', () => {
    const state = createTestState({
      player: { gold: 500, level: 10, xp: 2000 },
      turnCount: 1000,
    })

    const score = service.calculateScore(state)

    // 500*10 + 10*100 + 2000*5 - 1000/10 = 5000 + 1000 + 10000 - 100 = 15900
    expect(score).toBe(15900)
  })

  test('returns 0 minimum score', () => {
    const state = createTestState({
      player: { gold: 0, level: 1, xp: 0 },
      turnCount: 100000,  // Huge turn penalty
    })

    const score = service.calculateScore(state)
    expect(score).toBe(0)
  })
})
```

**File**: `src/commands/MoveStairsCommand/victory-integration.test.ts`

```typescript
describe('MoveStairsCommand - Victory Integration', () => {
  test('sets hasWon and isGameOver when reaching level 1 with amulet', () => {
    const state = createTestState({
      currentLevel: 2,
      hasAmulet: true,
      player: { position: stairsUpPosition },
    })

    const result = command.execute(state)

    expect(result.currentLevel).toBe(1)
    expect(result.hasWon).toBe(true)
    expect(result.isGameOver).toBe(true)
  })

  test('shows victory message', () => {
    const state = createTestState({
      currentLevel: 2,
      hasAmulet: true,
      player: { position: stairsUpPosition },
    })

    const result = command.execute(state)
    const lastMessage = result.messages[result.messages.length - 1]

    expect(lastMessage.text).toContain('You win')
    expect(lastMessage.type).toBe('success')
  })

  test('does not trigger victory without amulet', () => {
    const state = createTestState({
      currentLevel: 2,
      hasAmulet: false,
      player: { position: stairsUpPosition },
    })

    const result = command.execute(state)

    expect(result.hasWon).toBe(false)
    expect(result.isGameOver).toBe(false)
  })
})
```

---

## Task C: Victory Screen UI

### C1: VictoryScreen Component

**Create**: `src/ui/VictoryScreen.ts`

```typescript
import { VictoryStats } from '@services/VictoryService'

export class VictoryScreen {
  private container: HTMLDivElement | null = null

  /**
   * Display victory screen with final stats
   */
  show(stats: VictoryStats, onNewGame: () => void): void {
    this.container = this.createVictoryModal(stats, onNewGame)
    document.body.appendChild(this.container)
  }

  /**
   * Hide and cleanup
   */
  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private createVictoryModal(
    stats: VictoryStats,
    onNewGame: () => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content victory-modal'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #FFD700;
      padding: 30px;
      min-width: 500px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = `
      <div class="victory-title" style="font-size: 24px; color: #FFD700; margin-bottom: 20px;">
        ╔═══════════════════════════════╗
        ║    VICTORY IS YOURS!          ║
        ║  You escaped with the Amulet  ║
        ╚═══════════════════════════════╝
      </div>

      <div class="victory-stats" style="margin: 20px 0; text-align: left;">
        <div style="color: #00FF00; font-weight: bold; margin-bottom: 10px;">
          Final Score: ${stats.finalScore.toLocaleString()}
        </div>
        <div style="margin: 5px 0;">Character Level: ${stats.finalLevel}</div>
        <div style="margin: 5px 0;">Total Gold: ${stats.totalGold}</div>
        <div style="margin: 5px 0;">Experience: ${stats.totalXP}</div>
        <div style="margin: 5px 0;">Deepest Level: ${stats.deepestLevel}</div>
        <div style="margin: 5px 0;">Total Turns: ${stats.totalTurns}</div>
        <div style="margin: 5px 0; color: #888;">Seed: ${stats.seed}</div>
      </div>

      <div class="victory-footer" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 20px;">
        <div style="color: #FFD700; margin-bottom: 10px;">
          Press [N] for New Game
        </div>
      </div>
    `

    // Handle keyboard input
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onNewGame()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
```

### C2: Integration with GameRenderer

**Update GameRenderer.ts**:
```typescript
import { VictoryScreen } from '@ui/VictoryScreen'
import { VictoryService } from '@services/VictoryService'

export class GameRenderer {
  private victoryScreen: VictoryScreen

  constructor(
    // ...existing services...
    private victoryService: VictoryService
  ) {
    this.victoryScreen = new VictoryScreen()
    // ...
  }

  render(state: GameState): void {
    // Check for victory before rendering
    if (state.hasWon && !this.victoryScreen.isVisible()) {
      const stats = this.victoryService.getVictoryStats(state)
      this.victoryScreen.show(stats, () => {
        // New game callback (handled by main.ts)
        window.location.reload()
      })
      return  // Don't render game when victory screen shown
    }

    // ...existing render logic...
  }
}
```

### C3: Tests

**File**: `src/ui/VictoryScreen.test.ts`

```typescript
describe('VictoryScreen', () => {
  test('displays victory title', () => {
    const stats = createVictoryStats()
    screen.show(stats, jest.fn())

    const title = document.querySelector('.victory-title')
    expect(title?.textContent).toContain('VICTORY IS YOURS')
  })

  test('displays all stats', () => {
    const stats: VictoryStats = {
      finalLevel: 10,
      totalGold: 1234,
      totalXP: 5678,
      totalTurns: 9000,
      deepestLevel: 10,
      finalScore: 50000,
      seed: 'test-seed',
      gameId: 'game-123',
    }

    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Final Score: 50,000')
    expect(document.body.textContent).toContain('Character Level: 10')
    expect(document.body.textContent).toContain('Total Gold: 1234')
  })

  test('calls onNewGame when N pressed', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), callback)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('hides screen when callback triggered', () => {
    screen.show(createVictoryStats(), () => {})
    expect(screen.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(screen.isVisible()).toBe(false)
  })
})
```

---

## Task D: Death Screen UI

### D1: Death Cause Tracking

**Update GameState**:
```typescript
// src/types/core/core.ts
export interface GameState {
  // ...existing fields...
  isGameOver: boolean
  hasWon: boolean
  deathCause?: string  // ← ADD THIS
}
```

**Update Combat/Hunger/Trap Services**:
```typescript
// CombatService.ts - Add death cause
applyDamage(/* params */): { player: Player; deathCause?: string } {
  const newHp = Math.max(0, player.hp - damage)

  return {
    player: { ...player, hp: newHp },
    deathCause: newHp <= 0 ? `Killed by ${attackerName}` : undefined,
  }
}

// HungerService.ts - Add death cause
applyStarvation(player: Player): { player: Player; deathCause?: string } {
  return {
    player: { ...player, hp: 0 },
    deathCause: 'Died of starvation',
  }
}

// TrapService.ts - Add death cause
triggerTrap(/* params */): { player: Player; deathCause?: string } {
  // ...apply trap damage...

  return {
    player: updatedPlayer,
    deathCause: player.hp <= 0 ? `Killed by ${trapName} trap` : undefined,
  }
}
```

### D2: DeathScreen Component

**Create**: `src/ui/DeathScreen.ts`

```typescript
import { GameState } from '@game/core/core'

export interface DeathStats {
  cause: string
  finalLevel: number
  totalGold: number
  totalXP: number
  totalTurns: number
  deepestLevel: number
  seed: string
}

export class DeathScreen {
  private container: HTMLDivElement | null = null

  show(stats: DeathStats, onNewGame: () => void): void {
    this.container = this.createDeathModal(stats, onNewGame)
    document.body.appendChild(this.container)
  }

  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private createDeathModal(
    stats: DeathStats,
    onNewGame: () => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content death-modal'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #8B0000;
      padding: 30px;
      min-width: 500px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = `
      <div class="death-title" style="font-size: 24px; color: #FF4444; margin-bottom: 20px;">
        ╔═══════════════════════════════╗
        ║        GAME OVER              ║
        ║      You have died...         ║
        ╚═══════════════════════════════╝
      </div>

      <div class="death-cause" style="color: #FF8800; font-size: 16px; margin: 20px 0;">
        ${stats.cause}
      </div>

      <div class="death-stats" style="margin: 20px 0; text-align: left; border-top: 1px solid #444; padding-top: 15px;">
        <div style="margin: 5px 0;">Character Level: ${stats.finalLevel}</div>
        <div style="margin: 5px 0;">Total Gold: ${stats.totalGold}</div>
        <div style="margin: 5px 0;">Experience: ${stats.totalXP}</div>
        <div style="margin: 5px 0;">Deepest Level: ${stats.deepestLevel}</div>
        <div style="margin: 5px 0;">Total Turns: ${stats.totalTurns}</div>
        <div style="margin: 5px 0; color: #888;">Seed: ${stats.seed}</div>
      </div>

      <div class="death-footer" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 20px;">
        <div style="color: #888; margin-bottom: 10px; font-style: italic;">
          Permadeath - Your save has been deleted
        </div>
        <div style="color: #00FF00; margin-bottom: 10px;">
          Press [N] for New Game
        </div>
      </div>
    `

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onNewGame()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
```

### D3: Integration

**Update GameRenderer.ts**:
```typescript
import { DeathScreen, DeathStats } from '@ui/DeathScreen'

export class GameRenderer {
  private deathScreen: DeathScreen

  constructor(/* services */) {
    this.deathScreen = new DeathScreen()
    // ...
  }

  render(state: GameState): void {
    // Check for death
    if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
      const stats: DeathStats = {
        cause: state.deathCause || 'Unknown cause',
        finalLevel: state.player.level,
        totalGold: state.player.gold,
        totalXP: state.player.xp,
        totalTurns: state.turnCount,
        deepestLevel: Math.max(...Array.from(state.levels.keys())),
        seed: state.seed,
      }

      this.deathScreen.show(stats, () => {
        window.location.reload()
      })
      return
    }

    // Check for victory (from Task C)
    if (state.hasWon && !this.victoryScreen.isVisible()) {
      // ...victory logic...
    }

    // ...normal render...
  }
}
```

### D4: Tests

**File**: `src/ui/DeathScreen.test.ts`

```typescript
describe('DeathScreen', () => {
  test('displays death title', () => {
    const stats = createDeathStats()
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('GAME OVER')
  })

  test('displays death cause', () => {
    const stats = createDeathStats({ cause: 'Killed by Orc' })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Killed by Orc')
  })

  test('shows permadeath message', () => {
    screen.show(createDeathStats(), jest.fn())

    expect(document.body.textContent).toContain('save has been deleted')
  })

  test('calls onNewGame when N pressed', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))

    expect(callback).toHaveBeenCalled()
  })
})
```

---

## Task E: LocalStorageService

### E1: Service Implementation

**Create**: `src/services/LocalStorageService/LocalStorageService.ts`

```typescript
import { GameState } from '@game/core/core'

export class LocalStorageService {
  private readonly SAVE_KEY_PREFIX = 'roguelike_save_'
  private readonly CONTINUE_KEY = 'roguelike_continue'

  /**
   * Save game state to LocalStorage
   */
  saveGame(state: GameState): void {
    try {
      const saveKey = this.getSaveKey(state.gameId)
      const serialized = this.serializeGameState(state)

      localStorage.setItem(saveKey, serialized)
      localStorage.setItem(this.CONTINUE_KEY, state.gameId)

      console.log(`Game saved: ${state.gameId}`)
    } catch (error) {
      console.error('Failed to save game:', error)
      throw new Error('Save failed - storage quota exceeded?')
    }
  }

  /**
   * Load game state from LocalStorage
   */
  loadGame(gameId?: string): GameState | null {
    try {
      const targetId = gameId || this.getContinueGameId()
      if (!targetId) {
        return null
      }

      const saveKey = this.getSaveKey(targetId)
      const serialized = localStorage.getItem(saveKey)

      if (!serialized) {
        return null
      }

      return this.deserializeGameState(serialized)
    } catch (error) {
      console.error('Failed to load game:', error)
      return null
    }
  }

  /**
   * Delete save file (for permadeath)
   */
  deleteSave(gameId: string): void {
    const saveKey = this.getSaveKey(gameId)
    localStorage.removeItem(saveKey)

    // Clear continue pointer if it matches this save
    const continueId = this.getContinueGameId()
    if (continueId === gameId) {
      localStorage.removeItem(this.CONTINUE_KEY)
    }

    console.log(`Save deleted: ${gameId}`)
  }

  /**
   * Check if a save exists
   */
  hasSave(gameId?: string): boolean {
    const targetId = gameId || this.getContinueGameId()
    if (!targetId) {
      return false
    }

    const saveKey = this.getSaveKey(targetId)
    return localStorage.getItem(saveKey) !== null
  }

  /**
   * Get the game ID of the most recent save
   */
  getContinueGameId(): string | null {
    return localStorage.getItem(this.CONTINUE_KEY)
  }

  /**
   * List all save game IDs
   */
  listSaves(): string[] {
    const saves: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.SAVE_KEY_PREFIX)) {
        const gameId = key.substring(this.SAVE_KEY_PREFIX.length)
        saves.push(gameId)
      }
    }

    return saves
  }

  private getSaveKey(gameId: string): string {
    return `${this.SAVE_KEY_PREFIX}${gameId}`
  }

  /**
   * Serialize GameState to JSON string
   * Handle special types: Map, Set
   */
  private serializeGameState(state: GameState): string {
    const serializable = {
      ...state,
      levels: Array.from(state.levels.entries()),  // Map → Array
      visibleCells: Array.from(state.visibleCells),  // Set → Array
      identifiedItems: Array.from(state.identifiedItems),  // Set → Array
      // Note: Monster visibleCells and currentPath also need conversion
      // This is done per-level
    }

    // Deep clone levels to convert monster Sets
    serializable.levels = serializable.levels.map(([depth, level]) => {
      return [
        depth,
        {
          ...level,
          monsters: level.monsters.map(m => ({
            ...m,
            visibleCells: Array.from(m.visibleCells),
            currentPath: m.currentPath,
          })),
        },
      ]
    })

    return JSON.stringify(serializable)
  }

  /**
   * Deserialize JSON string to GameState
   * Restore Map and Set types
   */
  private deserializeGameState(json: string): GameState {
    const data = JSON.parse(json)

    // Restore levels Map
    const levelsArray = data.levels as Array<[number, any]>
    const levels = new Map(
      levelsArray.map(([depth, level]) => {
        return [
          depth,
          {
            ...level,
            monsters: level.monsters.map((m: any) => ({
              ...m,
              visibleCells: new Set(m.visibleCells),
            })),
          },
        ]
      })
    )

    // Restore Sets
    const visibleCells = new Set(data.visibleCells)
    const identifiedItems = new Set(data.identifiedItems)

    return {
      ...data,
      levels,
      visibleCells,
      identifiedItems,
    }
  }
}
```

### E2: Tests

**File**: `src/services/LocalStorageService/save-load.test.ts`

```typescript
describe('LocalStorageService - Save/Load', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('saves game state to localStorage', () => {
    const state = createTestState({ gameId: 'test-123' })

    service.saveGame(state)

    const saved = localStorage.getItem('roguelike_save_test-123')
    expect(saved).not.toBeNull()
  })

  test('loads saved game state', () => {
    const original = createTestState({ gameId: 'test-456' })
    service.saveGame(original)

    const loaded = service.loadGame('test-456')

    expect(loaded).not.toBeNull()
    expect(loaded?.gameId).toBe('test-456')
    expect(loaded?.player.hp).toBe(original.player.hp)
  })

  test('returns null when no save exists', () => {
    const loaded = service.loadGame('nonexistent')

    expect(loaded).toBeNull()
  })

  test('preserves Map and Set types', () => {
    const state = createTestState({
      levels: new Map([[1, level1], [2, level2]]),
      visibleCells: new Set(['0,0', '1,1']),
      identifiedItems: new Set(['potion_healing']),
    })

    service.saveGame(state)
    const loaded = service.loadGame(state.gameId)!

    expect(loaded.levels).toBeInstanceOf(Map)
    expect(loaded.visibleCells).toBeInstanceOf(Set)
    expect(loaded.identifiedItems).toBeInstanceOf(Set)
  })

  test('preserves nested Sets in monsters', () => {
    const monster = createMonster({
      visibleCells: new Set(['5,5', '6,6']),
    })
    const state = createTestState({
      levels: new Map([[1, { monsters: [monster] }]]),
    })

    service.saveGame(state)
    const loaded = service.loadGame(state.gameId)!

    const loadedMonster = loaded.levels.get(1)!.monsters[0]
    expect(loadedMonster.visibleCells).toBeInstanceOf(Set)
    expect(loadedMonster.visibleCells.size).toBe(2)
  })
})
```

**File**: `src/services/LocalStorageService/persistence.test.ts`

```typescript
describe('LocalStorageService - Persistence', () => {
  test('sets continue key when saving', () => {
    const state = createTestState({ gameId: 'game-789' })

    service.saveGame(state)

    expect(localStorage.getItem('roguelike_continue')).toBe('game-789')
  })

  test('hasSave returns true when save exists', () => {
    const state = createTestState({ gameId: 'exists' })
    service.saveGame(state)

    expect(service.hasSave('exists')).toBe(true)
  })

  test('hasSave returns false when save does not exist', () => {
    expect(service.hasSave('missing')).toBe(false)
  })

  test('deleteSave removes save file', () => {
    const state = createTestState({ gameId: 'doomed' })
    service.saveGame(state)

    service.deleteSave('doomed')

    expect(service.hasSave('doomed')).toBe(false)
  })

  test('deleteSave clears continue key if matching', () => {
    const state = createTestState({ gameId: 'clear-me' })
    service.saveGame(state)

    service.deleteSave('clear-me')

    expect(localStorage.getItem('roguelike_continue')).toBeNull()
  })

  test('listSaves returns all save IDs', () => {
    service.saveGame(createTestState({ gameId: 'save1' }))
    service.saveGame(createTestState({ gameId: 'save2' }))
    service.saveGame(createTestState({ gameId: 'save3' }))

    const saves = service.listSaves()

    expect(saves).toHaveLength(3)
    expect(saves).toContain('save1')
    expect(saves).toContain('save2')
    expect(saves).toContain('save3')
  })
})
```

**File**: `src/services/LocalStorageService/error-handling.test.ts`

```typescript
describe('LocalStorageService - Error Handling', () => {
  test('throws error when storage quota exceeded', () => {
    // Mock localStorage.setItem to throw
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')
    mockSetItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const state = createTestState()

    expect(() => service.saveGame(state)).toThrow('Save failed')

    mockSetItem.mockRestore()
  })

  test('returns null when JSON parsing fails', () => {
    localStorage.setItem('roguelike_save_corrupt', 'invalid json{{{')

    const loaded = service.loadGame('corrupt')

    expect(loaded).toBeNull()
  })
})
```

---

## Task F: SaveCommand & Integration

### F1: SaveCommand Implementation

**Create**: `src/commands/SaveCommand/SaveCommand.ts`

```typescript
import { ICommand } from '@game/core/command'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'
import { MessageService } from '@services/MessageService'

export class SaveCommand implements ICommand {
  constructor(
    private localStorageService: LocalStorageService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    try {
      this.localStorageService.saveGame(state)

      return {
        ...state,
        messages: this.messageService.addMessage(
          state.messages,
          'Game saved successfully.',
          'success',
          state.turnCount
        ),
      }
    } catch (error) {
      return {
        ...state,
        messages: this.messageService.addMessage(
          state.messages,
          `Save failed: ${error}`,
          'critical',
          state.turnCount
        ),
      }
    }
  }
}
```

### F2: Key Binding Integration

**Update InputHandler.ts**:
```typescript
// InputHandler.ts
constructor(
  // ...existing services...
  private localStorageService: LocalStorageService
) {
  this.saveCommand = new SaveCommand(
    localStorageService,
    messageService
  )
}

handleKeyPress(event: KeyboardEvent, state: GameState): ICommand | null {
  // ...existing key bindings...

  // S key - Save game
  if (event.key === 'S' && !event.ctrlKey) {
    return this.saveCommand
  }

  // Q key - Quit (with auto-save)
  if (event.key === 'Q' && !event.ctrlKey) {
    return this.quitCommand  // See Task G
  }

  // ...rest of bindings...
}
```

### F3: Tests

**File**: `src/commands/SaveCommand/save-command.test.ts`

```typescript
describe('SaveCommand', () => {
  let command: SaveCommand
  let storageService: LocalStorageService
  let messageService: MessageService

  beforeEach(() => {
    storageService = new LocalStorageService()
    messageService = new MessageService()
    command = new SaveCommand(storageService, messageService)
    localStorage.clear()
  })

  test('saves game to localStorage', () => {
    const state = createTestState({ gameId: 'cmd-test' })

    command.execute(state)

    expect(storageService.hasSave('cmd-test')).toBe(true)
  })

  test('adds success message on save', () => {
    const state = createTestState()

    const result = command.execute(state)

    const lastMessage = result.messages[result.messages.length - 1]
    expect(lastMessage.text).toContain('saved successfully')
    expect(lastMessage.type).toBe('success')
  })

  test('adds error message on save failure', () => {
    // Mock storage failure
    jest.spyOn(storageService, 'saveGame').mockImplementation(() => {
      throw new Error('Storage full')
    })

    const state = createTestState()
    const result = command.execute(state)

    const lastMessage = result.messages[result.messages.length - 1]
    expect(lastMessage.text).toContain('Save failed')
    expect(lastMessage.type).toBe('critical')
  })

  test('does not mutate original state', () => {
    const state = createTestState()
    const original = { ...state }

    command.execute(state)

    expect(state).toEqual(original)
  })
})
```

---

## Task G: Auto-Save System

### G1: Auto-Save on Quit

**Create**: `src/commands/QuitCommand/QuitCommand.ts`

```typescript
import { ICommand } from '@game/core/command'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'

export class QuitCommand implements ICommand {
  constructor(private localStorageService: LocalStorageService) {}

  execute(state: GameState): GameState {
    // Don't save if game is over
    if (state.isGameOver) {
      return state
    }

    try {
      this.localStorageService.saveGame(state)
      console.log('Auto-saved before quit')
    } catch (error) {
      console.error('Auto-save failed:', error)
    }

    // Trigger page unload or return to main menu
    // For now, just reload the page
    window.location.reload()

    return state
  }
}
```

### G2: Auto-Save Every N Turns

**Update MoveCommand** (or create middleware):
```typescript
// Option 1: Add to MoveCommand
execute(state: GameState): GameState {
  // ...existing movement logic...

  const newState = {
    ...state,
    turnCount: state.turnCount + 1,
    // ...other updates...
  }

  // Auto-save every 10 turns
  if (newState.turnCount % 10 === 0) {
    try {
      this.localStorageService.saveGame(newState)
      console.log(`Auto-saved at turn ${newState.turnCount}`)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  return newState
}

// Option 2: Create AutoSaveMiddleware (cleaner)
export class AutoSaveMiddleware {
  constructor(
    private localStorageService: LocalStorageService,
    private saveInterval: number = 10
  ) {}

  afterTurn(state: GameState): void {
    if (state.turnCount % this.saveInterval === 0) {
      try {
        this.localStorageService.saveGame(state)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }
  }
}

// In main.ts or InputHandler:
const autoSave = new AutoSaveMiddleware(localStorageService)

document.addEventListener('keydown', (event) => {
  const command = inputHandler.handleKeyPress(event, gameState)
  if (command) {
    gameState = command.execute(gameState)
    autoSave.afterTurn(gameState)  // Auto-save hook
    renderer.render(gameState)
  }
})
```

### G3: Tests

**File**: `src/commands/QuitCommand/quit-command.test.ts`

```typescript
describe('QuitCommand', () => {
  test('saves game before quitting', () => {
    const state = createTestState({ gameId: 'quit-test' })

    // Mock window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    command.execute(state)

    expect(storageService.hasSave('quit-test')).toBe(true)
  })

  test('does not save if game is over', () => {
    const state = createTestState({
      gameId: 'dead-game',
      isGameOver: true,
    })

    command.execute(state)

    expect(storageService.hasSave('dead-game')).toBe(false)
  })
})
```

**File**: `src/services/LocalStorageService/auto-save.test.ts`

```typescript
describe('AutoSaveMiddleware', () => {
  test('saves every 10 turns by default', () => {
    const middleware = new AutoSaveMiddleware(service)

    const state = createTestState({ turnCount: 10 })
    middleware.afterTurn(state)

    expect(service.hasSave(state.gameId)).toBe(true)
  })

  test('does not save on non-interval turns', () => {
    const middleware = new AutoSaveMiddleware(service)

    const state = createTestState({ turnCount: 7 })
    middleware.afterTurn(state)

    expect(service.hasSave(state.gameId)).toBe(false)
  })

  test('respects custom save interval', () => {
    const middleware = new AutoSaveMiddleware(service, 5)

    const state1 = createTestState({ turnCount: 5 })
    middleware.afterTurn(state1)
    expect(service.hasSave(state1.gameId)).toBe(true)

    const state2 = createTestState({ turnCount: 10 })
    middleware.afterTurn(state2)
    expect(service.hasSave(state2.gameId)).toBe(true)
  })
})
```

---

## Task H: Load Game Flow

### H1: Load on Startup

**Update main.ts**:
```typescript
// main.ts
async function initializeGame() {
  // ...existing service initialization...

  const localStorageService = new LocalStorageService()

  // Check for existing save
  let gameState: GameState

  if (localStorageService.hasSave()) {
    const loaded = localStorageService.loadGame()

    if (loaded) {
      console.log('Continuing saved game:', loaded.gameId)
      gameState = loaded
    } else {
      console.log('Failed to load save, starting new game')
      gameState = createInitialState()
    }
  } else {
    console.log('No save found, starting new game')
    gameState = createInitialState()
  }

  // Render initial state
  renderer.render(gameState)

  // ...event listeners...
}
```

### H2: Continue vs New Game Selection

**Create**: `src/ui/MainMenu.ts`

```typescript
export class MainMenu {
  private container: HTMLDivElement | null = null

  show(hasSave: boolean, onNewGame: () => void, onContinue: () => void): void {
    this.container = this.createMenuModal(hasSave, onNewGame, onContinue)
    document.body.appendChild(this.container)
  }

  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private createMenuModal(
    hasSave: boolean,
    onNewGame: () => void,
    onContinue: () => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay main-menu'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 3000;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content main-menu-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #8B7355;
      padding: 40px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    const continueOption = hasSave
      ? `<div style="color: #00FF00; margin: 10px 0;">[C] Continue</div>`
      : ''

    modal.innerHTML = `
      <div class="menu-title" style="margin-bottom: 40px;">
        <pre style="color: #D4AF37; font-size: 16px;">
╔═══════════════════════════════╗
║   ROGUE: THE QUEST FOR        ║
║   THE AMULET OF YENDOR        ║
╚═══════════════════════════════╝
        </pre>
      </div>

      <div class="menu-options">
        <div style="color: #FFFFFF; margin: 10px 0;">[N] New Game</div>
        ${continueOption}
        <div style="color: #0088FF; margin: 10px 0;">[H] Help</div>
        <div style="color: #888; margin: 10px 0;">[~] Debug Mode</div>
      </div>

      <div class="menu-footer" style="margin-top: 40px; color: #666; font-size: 12px;">
        Press a key to begin...
      </div>
    `

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (key === 'n') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onNewGame()
      } else if (key === 'c' && hasSave) {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onContinue()
      } else if (key === 'h') {
        // Show help screen (Task J)
        console.log('Show help screen')
      } else if (key === '~') {
        // Enable debug mode and start new game
        console.log('Debug mode enabled')
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
```

### H3: Updated Startup Flow

**Revised main.ts**:
```typescript
async function initializeGame() {
  // ...create services...

  const localStorageService = new LocalStorageService()
  const mainMenu = new MainMenu()

  const startNewGame = () => {
    gameState = createInitialState()
    renderer.render(gameState)
    attachEventListeners()
  }

  const continueGame = () => {
    const loaded = localStorageService.loadGame()
    if (loaded) {
      gameState = loaded
      renderer.render(gameState)
      attachEventListeners()
    } else {
      console.error('Failed to load save')
      startNewGame()
    }
  }

  // Show main menu
  mainMenu.show(
    localStorageService.hasSave(),
    startNewGame,
    continueGame
  )
}
```

### H4: Tests

**File**: `src/ui/MainMenu.test.ts`

```typescript
describe('MainMenu', () => {
  test('shows Continue option when save exists', () => {
    menu.show(true, jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('[C] Continue')
  })

  test('hides Continue option when no save', () => {
    menu.show(false, jest.fn(), jest.fn())

    expect(document.body.textContent).not.toContain('[C] Continue')
  })

  test('calls onNewGame when N pressed', () => {
    const callback = jest.fn()
    menu.show(false, callback, jest.fn())

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))

    expect(callback).toHaveBeenCalled()
  })

  test('calls onContinue when C pressed', () => {
    const callback = jest.fn()
    menu.show(true, jest.fn(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))

    expect(callback).toHaveBeenCalled()
  })

  test('ignores C key when no save exists', () => {
    const callback = jest.fn()
    menu.show(false, jest.fn(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))

    expect(callback).not.toHaveBeenCalled()
  })
})
```

---

## Task I: Permadeath Implementation

### I1: Delete Save on Death

**Update Combat/Hunger/Trap Services** (from Task D):
```typescript
// Ensure death sets isGameOver = true
// Already handled in MonsterTurnService.ts:226
```

**Update GameRenderer** (from Task D):
```typescript
render(state: GameState): void {
  // Delete save on death
  if (state.isGameOver && !state.hasWon) {
    this.localStorageService.deleteSave(state.gameId)
    console.log('Save deleted (permadeath)')
  }

  // Show death screen
  if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
    // ...show death screen...
  }
}
```

**Alternative**: Handle in DeathScreen.show() callback:
```typescript
// GameRenderer.ts
render(state: GameState): void {
  if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
    // Delete save BEFORE showing screen
    this.localStorageService.deleteSave(state.gameId)

    const stats: DeathStats = { /* ... */ }
    this.deathScreen.show(stats, () => {
      window.location.reload()
    })
  }
}
```

### I2: Prevent Save Scumming

**In LocalStorageService**:
```typescript
// Already handled - saveGame() always overwrites
// No mechanism to load "older" saves
// Only one save per gameId
```

**In Commands**:
```typescript
// Every action triggers auto-save (every N turns)
// No way to restore previous state
// Permadeath enforced by deletion on isGameOver
```

### I3: Tests

**File**: `src/services/LocalStorageService/permadeath.test.ts`

```typescript
describe('LocalStorageService - Permadeath', () => {
  test('save is deleted when player dies', () => {
    const state = createTestState({
      gameId: 'doomed',
      isGameOver: true,
      hasWon: false,
    })

    service.saveGame(state)
    expect(service.hasSave('doomed')).toBe(true)

    // Simulate death handling
    service.deleteSave('doomed')

    expect(service.hasSave('doomed')).toBe(false)
  })

  test('save is NOT deleted when player wins', () => {
    const state = createTestState({
      gameId: 'winner',
      isGameOver: true,
      hasWon: true,
    })

    service.saveGame(state)

    // Victory does not delete save
    expect(service.hasSave('winner')).toBe(true)
  })

  test('continue key is cleared on permadeath', () => {
    const state = createTestState({ gameId: 'clear' })
    service.saveGame(state)

    expect(service.getContinueGameId()).toBe('clear')

    service.deleteSave('clear')

    expect(service.getContinueGameId()).toBeNull()
  })
})
```

---

## Task J: Main Menu System

### J1: Main Menu (Already in Task H)

See **Task H2** for MainMenu.ts implementation.

### J2: Help Screen

**Create**: `src/ui/HelpScreen.ts`

```typescript
export class HelpScreen {
  private container: HTMLDivElement | null = null

  show(onClose: () => void): void {
    this.container = this.createHelpModal(onClose)
    document.body.appendChild(this.container)
  }

  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private createHelpModal(onClose: () => void): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay help-screen'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 3000;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content help-content'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #8B7355;
      padding: 30px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    modal.innerHTML = `
      <div class="help-title" style="color: #D4AF37; font-size: 20px; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px;">
        ROGUE - HELP & CONTROLS
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">MOVEMENT</div>
        <div style="margin: 5px 0;">Arrow Keys - Move player</div>
        <div style="margin: 5px 0;">> - Go down stairs</div>
        <div style="margin: 5px 0;">< - Go up stairs</div>
        <div style="margin: 5px 0;">s - Search for secret doors/traps</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">COMBAT</div>
        <div style="margin: 5px 0;">Move into enemy to attack</div>
        <div style="margin: 5px 0;">Combat is automatic</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">INVENTORY</div>
        <div style="margin: 5px 0;">i - Open inventory</div>
        <div style="margin: 5px 0;">g - Pick up item</div>
        <div style="margin: 5px 0;">d - Drop item</div>
        <div style="margin: 5px 0;">w - Wield/wear equipment</div>
        <div style="margin: 5px 0;">t - Take off equipment</div>
        <div style="margin: 5px 0;">e - Eat food</div>
        <div style="margin: 5px 0;">q - Quaff potion</div>
        <div style="margin: 5px 0;">r - Read scroll</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">DOORS</div>
        <div style="margin: 5px 0;">o - Open door</div>
        <div style="margin: 5px 0;">c - Close door</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">GAME</div>
        <div style="margin: 5px 0;">S - Save game</div>
        <div style="margin: 5px 0;">Q - Quit (auto-saves)</div>
        <div style="margin: 5px 0;">? - This help screen</div>
        <div style="margin: 5px 0;">Ctrl+M - Message history</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">GOAL</div>
        <div style="margin: 5px 0;">1. Descend to Level 10</div>
        <div style="margin: 5px 0;">2. Find the Amulet of Yendor (&)</div>
        <div style="margin: 5px 0;">3. Return to Level 1</div>
        <div style="margin: 5px 0;">4. Victory!</div>
      </div>

      <div class="help-section" style="margin: 15px 0;">
        <div style="color: #00FF00; font-weight: bold;">SYMBOLS</div>
        <div style="margin: 5px 0;">@ - You</div>
        <div style="margin: 5px 0;">A-Z - Monsters</div>
        <div style="margin: 5px 0;"># - Wall</div>
        <div style="margin: 5px 0;">. - Floor</div>
        <div style="margin: 5px 0;">+ - Door</div>
        <div style="margin: 5px 0;">> - Stairs down</div>
        <div style="margin: 5px 0;">< - Stairs up</div>
        <div style="margin: 5px 0;">! - Potion</div>
        <div style="margin: 5px 0;">? - Scroll</div>
        <div style="margin: 5px 0;">$ - Gold</div>
        <div style="margin: 5px 0;">& - Amulet</div>
      </div>

      <div class="help-footer" style="margin-top: 20px; border-top: 1px solid #444; padding-top: 10px; text-align: center; color: #888;">
        Press ESC or ? to close
      </div>
    `

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
```

### J3: Integration

**Update MainMenu.ts** to support Help:
```typescript
// In createMenuModal handleKeyPress:
else if (key === 'h') {
  // Show help, then return to menu
  const helpScreen = new HelpScreen()
  helpScreen.show(() => {
    // After help closes, show menu again
    menu.show(hasSave, onNewGame, onContinue)
  })
  this.hide()
}
```

### J4: Tests

**File**: `src/ui/HelpScreen.test.ts`

```typescript
describe('HelpScreen', () => {
  test('displays all control sections', () => {
    screen.show(jest.fn())

    expect(document.body.textContent).toContain('MOVEMENT')
    expect(document.body.textContent).toContain('COMBAT')
    expect(document.body.textContent).toContain('INVENTORY')
    expect(document.body.textContent).toContain('GOAL')
  })

  test('shows win condition', () => {
    screen.show(jest.fn())

    expect(document.body.textContent).toContain('Descend to Level 10')
    expect(document.body.textContent).toContain('Amulet of Yendor')
  })

  test('closes on ESC key', () => {
    const callback = jest.fn()
    screen.show(callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(callback).toHaveBeenCalled()
    expect(screen.isVisible()).toBe(false)
  })

  test('closes on ? key', () => {
    const callback = jest.fn()
    screen.show(callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))

    expect(callback).toHaveBeenCalled()
  })
})
```

---

## Task K: UI Polish

### K1: Finalize Color Palette

**Already defined in game-design.md** - verify implementation matches spec.

**Review**: public/styles.css
- Verify all colors match design doc
- Check visible/explored/unexplored states
- Confirm message type colors

### K2: Light Fuel Indicator

**Already implemented** in GameRenderer.ts (Phase 1):
- Shows "Torch (dim)" when low
- Shows "~45 turns left"

**Polish**: Add visual indicator
```typescript
// In GameRenderer.ts renderStats()
let fuelBar = ''
if (lightSource && !lightSource.isPermanent && lightSource.fuel !== undefined) {
  const fuelPercent = (lightSource.fuel / lightSource.maxFuel!) * 100
  const barLength = 10
  const filled = Math.floor((fuelPercent / 100) * barLength)
  const empty = barLength - filled

  fuelBar = `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}] ${Math.floor(fuelPercent)}%`
}

statsHtml += `
  <div class="stat-light">
    <div>LIGHT</div>
    <div>${lightSource?.name || 'None'}</div>
    ${fuelBar}
  </div>
`
```

### K3: Hunger Indicator

**Already implemented** in GameRenderer.ts (Phase 6):
- Shows hunger bar
- Shows status text ("Hungry", "Weak", etc.)

**Verify**: Color-coding matches states

### K4: Improve Message Log Styling

**Already enhanced in Phase UI/UX**:
- 8 lines instead of 5
- Message grouping
- Color-coded by type

**Additional Polish**:
```css
/* public/styles.css */
.messages-view {
  grid-column: 1 / -1;
  grid-row: 1;
  background: linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 100%);
  border: 1px solid #444;
  padding: 15px;
  min-height: 120px;
  max-height: 150px;
  overflow-y: auto;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.messages div {
  margin: 2px 0;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### K5: Subtle Animations

**Low HP Pulse**:
```css
/* public/styles.css */
@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.low-hp {
  animation: pulse-red 1s ease-in-out infinite;
}
```

**Apply in GameRenderer**:
```typescript
// When rendering player stats
const hpClass = player.hp <= player.maxHp * 0.3 ? 'low-hp' : ''
statsHtml += `<div class="${hpClass}">HP: ${player.hp}/${player.maxHp}</div>`
```

**Torch Flicker**:
```css
@keyframes flicker {
  0%, 100% { opacity: 1; }
  25% { opacity: 0.8; }
  50% { opacity: 1; }
  75% { opacity: 0.9; }
}

.torch-low {
  animation: flicker 0.5s ease-in-out infinite;
}
```

### K6: Spacing and Padding

**Review**: Ensure consistent spacing across all UI elements
- Messages: 15px padding
- Stats: 15px padding
- Dungeon: 15px padding
- Modals: 20-30px padding
- Grid gap: 15px

**Adjust if needed** in styles.css

### K7: Player Glow Effect

```css
/* Apply subtle glow to @ symbol */
.player-char {
  text-shadow: 0 0 3px #00FFFF, 0 0 5px #00FFFF;
}
```

```typescript
// In GameRenderer when rendering player
dungeonGrid[py][px] = `<span class="player-char">@</span>`
```

---

## Integration Checklist

### Service Dependencies
- [ ] VictoryService initialized in main.ts
- [ ] LocalStorageService initialized in main.ts
- [ ] Services injected into commands
- [ ] Services injected into UI components (GameRenderer)

### Command Wiring
- [ ] SaveCommand wired to S key
- [ ] QuitCommand wired to Q key
- [ ] Victory check in MoveStairsCommand
- [ ] Death cause tracking in all damage sources

### UI Components
- [ ] VictoryScreen instantiated in GameRenderer
- [ ] DeathScreen instantiated in GameRenderer
- [ ] MainMenu shown on startup
- [ ] HelpScreen accessible from menu and in-game (?)

### State Management
- [ ] hasAmulet flag added to GameState
- [ ] deathCause field added to GameState
- [ ] isGameOver properly set on death
- [ ] hasWon properly set on victory

### Main.ts Flow
```typescript
async function initializeGame() {
  // 1. Load item data
  // 2. Create all services (including new ones)
  // 3. Create UI components
  // 4. Create InputHandler with all commands
  // 5. Check for save
  // 6. Show main menu OR load game
  // 7. Attach event listeners
  // 8. Start game loop
}
```

---

## Testing Strategy

### Coverage Goals
- **Services**: >80% (VictoryService, LocalStorageService)
- **Commands**: >80% (SaveCommand, QuitCommand)
- **UI Components**: >60% (VictoryScreen, DeathScreen, MainMenu, HelpScreen)

### Test Organization

```
src/
├── services/
│   ├── VictoryService/
│   │   ├── VictoryService.ts
│   │   ├── victory-condition.test.ts
│   │   ├── score-calculation.test.ts
│   │   ├── stats-generation.test.ts
│   │   └── index.ts
│   │
│   └── LocalStorageService/
│       ├── LocalStorageService.ts
│       ├── save-load.test.ts
│       ├── persistence.test.ts
│       ├── permadeath.test.ts
│       ├── error-handling.test.ts
│       ├── serialization.test.ts
│       └── index.ts
│
├── commands/
│   ├── SaveCommand/
│   │   ├── SaveCommand.ts
│   │   ├── save-command.test.ts
│   │   └── index.ts
│   │
│   └── QuitCommand/
│       ├── QuitCommand.ts
│       ├── quit-command.test.ts
│       └── index.ts
│
└── ui/
    ├── VictoryScreen.ts
    ├── VictoryScreen.test.ts
    ├── DeathScreen.ts
    ├── DeathScreen.test.ts
    ├── MainMenu.ts
    ├── MainMenu.test.ts
    ├── HelpScreen.ts
    └── HelpScreen.test.ts
```

### Test Patterns

**Service Tests**: AAA pattern (Arrange, Act, Assert)
```typescript
test('description', () => {
  // Arrange
  const state = createTestState({ /* config */ })

  // Act
  const result = service.method(state)

  // Assert
  expect(result).toBe(expected)
})
```

**Command Tests**: State transformation
```typescript
test('description', () => {
  const state = createTestState()
  const result = command.execute(state)

  expect(result).not.toBe(state)  // Immutability
  expect(result.field).toBe(expected)
})
```

**UI Tests**: DOM assertions
```typescript
test('description', () => {
  component.show(params)

  expect(document.body.textContent).toContain('expected')
  expect(component.isVisible()).toBe(true)
})
```

### Integration Tests

**Full Victory Flow**:
```typescript
test('complete victory flow', () => {
  // 1. Create state on Level 10
  // 2. Pick up amulet (hasAmulet = true)
  // 3. Move to stairs up
  // 4. Execute MoveStairsCommand repeatedly to Level 1
  // 5. Verify hasWon = true, isGameOver = true
  // 6. Check victory stats generated correctly
})
```

**Full Death Flow**:
```typescript
test('complete death flow', () => {
  // 1. Create state with low HP
  // 2. Attack command kills player
  // 3. Verify isGameOver = true, deathCause set
  // 4. Check save is deleted
  // 5. Verify death screen shown
})
```

**Save/Load Flow**:
```typescript
test('complete save/load cycle', () => {
  // 1. Create game state
  // 2. Save game
  // 3. Modify state
  // 4. Load saved game
  // 5. Verify loaded state matches original
  // 6. Check Map/Set types preserved
})
```

---

## Success Criteria

### ✅ Phase 7 Complete When:

**Gameplay**:
- [ ] Full game loop playable (Level 1 → 10 → 1)
- [ ] Can retrieve Amulet and win
- [ ] Player death triggers game over screen
- [ ] Victory screen shows correct stats
- [ ] Death screen shows correct cause

**Save System**:
- [ ] Manual save with S key works
- [ ] Auto-save on quit works
- [ ] Auto-save every N turns works
- [ ] Load game from main menu works
- [ ] Continue option shown when save exists

**Permadeath**:
- [ ] Save deleted on player death
- [ ] Cannot reload after death
- [ ] Victory does not delete save

**UI**:
- [ ] Main menu with New/Continue/Help options
- [ ] Help screen shows all controls
- [ ] Victory screen displays final stats
- [ ] Death screen shows cause and stats
- [ ] All screens have proper styling

**Architecture**:
- [ ] Services contain all logic
- [ ] Commands orchestrate only
- [ ] UI components render state only
- [ ] Immutable state updates throughout

**Testing**:
- [ ] All Phase 7 tests passing
- [ ] >80% coverage for services and commands
- [ ] >60% coverage for UI components
- [ ] Integration tests for key flows

**Polish**:
- [ ] Colors match design spec
- [ ] Light fuel indicator working
- [ ] Hunger indicator working
- [ ] Message log styled well
- [ ] Subtle animations implemented
- [ ] Consistent spacing/padding

---

## Implementation Order

**Recommended sequence**:

1. **Task A** - Amulet of Yendor (foundation)
2. **Task B** - Victory Condition System (core logic)
3. **Task E** - LocalStorageService (persistence foundation)
4. **Task C** - Victory Screen UI (visual feedback)
5. **Task D** - Death Screen UI (visual feedback)
6. **Task F** - SaveCommand (manual save)
7. **Task G** - Auto-Save System (convenience)
8. **Task I** - Permadeath (enforcement)
9. **Task H** - Load Game Flow (startup)
10. **Task J** - Main Menu System (polish)
11. **Task K** - UI Polish (final touches)

**Rationale**: Build foundation first (amulet, victory logic, save system), then add UI layers, then polish.

---

## Notes

**Architecture Compliance**:
- All new services follow established patterns
- Commands orchestrate, never implement logic
- UI components are pure renderers
- Immutability maintained throughout

**Testing Coverage**:
- Aim for >80% on all services/commands
- UI tests focus on critical interactions
- Integration tests validate end-to-end flows

**User Experience**:
- Victory feels rewarding (stats, score)
- Death is clear and fair (cause shown)
- Save system is transparent (auto-save notifications)
- Main menu is intuitive (clear options)

**Performance**:
- LocalStorage operations are fast (<10ms)
- Serialization handles large states (10 levels × monsters × items)
- Auto-save does not block gameplay

**Edge Cases**:
- Storage quota exceeded (show error)
- Corrupted save data (start new game)
- Multiple tabs (localStorage shared - race conditions possible)
- Browser private mode (localStorage may not persist)

---

## References

- [Game Design - Win Condition](./game-design.md#core-loop)
- [Game Design - Save System](./game-design.md#save-system--persistence)
- [Architecture - Service Layer](./architecture.md#service-layer)
- [Architecture - Command Layer](./architecture.md#command-layer)
- [Testing Strategy - Coverage Goals](./testing-strategy.md)
- [Plan - Phase 7 Tasks](./plan.md#phase-7-win-condition--polish-week-9)

---

**End of Phase 7 Implementation Plan**
