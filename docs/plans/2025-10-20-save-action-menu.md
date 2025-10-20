# Save Action Menu Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Add action menu to leaderboard allowing users to load, replay, or delete saved games

**Architecture:** Create `SaveActionMenuState` as a transparent overlay state that handles action selection. Push onto state stack when Enter pressed in LeaderboardState. Follows existing state stack pattern for modals/menus.

**Tech Stack:** TypeScript, existing state management pattern (BaseState), GameStorageService, ReplayDebugState

---

## Task 1: Create SaveActionMenuState Skeleton

**Files:**
- Create: `src/states/SaveActionMenuState/SaveActionMenuState.ts`
- Create: `src/states/SaveActionMenuState/index.ts`

**Step 1: Create barrel export file**

Create `src/states/SaveActionMenuState/index.ts`:

```typescript
export { SaveActionMenuState } from './SaveActionMenuState'
```

**Step 2: Create SaveActionMenuState skeleton class**

Create `src/states/SaveActionMenuState/SaveActionMenuState.ts`:

```typescript
import { BaseState } from '../BaseState'
import { Input, SaveSummary, GameState } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { GameStateManager } from '@services/GameStateManager'
import { PlayingState } from '../PlayingState'
import { ReplayDebugState } from '../ReplayDebugState'

/**
 * SaveActionMenuState - Action menu for selected save game
 *
 * Displays action options for a selected save:
 * - [L]oad: Load game and continue playing
 * - [R]eplay: Launch replay debugger from turn 0
 * - [D]elete: Delete save from storage
 * - [Escape]: Cancel and return to leaderboard
 */
export class SaveActionMenuState extends BaseState {
  private container: HTMLDivElement | null = null
  private deleteConfirmMode: boolean = false

  constructor(
    private save: SaveSummary,
    private gameStorage: GameStorageService,
    private stateManager: GameStateManager,
    private onDelete: () => void
  ) {
    super()
  }

  enter(): void {
    // Create UI container
    this.container = document.createElement('div')
    this.container.className = 'save-action-menu'
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      font-family: monospace;
      padding: 20px;
      border-top: 2px solid #666;
      z-index: 2000;
    `
    document.body.appendChild(this.container)
    this.render()
  }

  exit(): void {
    if (this.container) {
      document.body.removeChild(this.container)
      this.container = null
    }
  }

  update(_deltaTime: number): void {
    // No updates needed
  }

  render(): void {
    // TODO: Implement in next task
  }

  handleInput(input: Input): void {
    // TODO: Implement in next task
  }

  isPaused(): boolean {
    return true
  }

  isTransparent(): boolean {
    return true // Show leaderboard underneath
  }

  getAllowedKeys(): string[] | null {
    return null // Allow all keys
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/states/SaveActionMenuState/
git commit -m "feat: create SaveActionMenuState skeleton"
```

---

## Task 2: Implement render() Method

**Files:**
- Modify: `src/states/SaveActionMenuState/SaveActionMenuState.ts`

**Step 1: Implement render() method**

Replace the `render()` method in `SaveActionMenuState.ts`:

```typescript
render(): void {
  if (!this.container) return

  const name = this.save.characterName
  const status = this.save.status
  const level = this.save.maxDepth
  const score = this.save.score

  let html = '<pre style="margin: 0;">'

  if (this.deleteConfirmMode) {
    html += `Delete "${name}"? [Y] Yes  [N] No`
  } else {
    html += `Selected: ${name} (${status}, L${level}, Score: ${score})\n`
    html += `[L]oad  [R]eplay  [D]elete  [Escape] Back`
  }

  html += '</pre>'

  this.container.innerHTML = html
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: implement SaveActionMenuState render method"
```

---

## Task 3: Implement handleInput() Basic Routing

**Files:**
- Modify: `src/states/SaveActionMenuState/SaveActionMenuState.ts`

**Step 1: Implement handleInput() method**

Replace the `handleInput()` method in `SaveActionMenuState.ts`:

```typescript
handleInput(input: Input): void {
  // Handle delete confirmation mode
  if (this.deleteConfirmMode) {
    if (input.key === 'y' || input.key === 'Y') {
      this.deleteGame()
    } else if (input.key === 'n' || input.key === 'N' || input.key === 'Escape') {
      this.deleteConfirmMode = false
      this.render()
    }
    return
  }

  // Handle normal action menu
  switch (input.key) {
    case 'l':
    case 'L':
      this.loadGame()
      break

    case 'r':
    case 'R':
      this.replayGame()
      break

    case 'd':
    case 'D':
      // Enter delete confirmation mode
      this.deleteConfirmMode = true
      this.render()
      break

    case 'Escape':
      this.stateManager.popState()
      break
  }
}
```

**Step 2: Add stub methods**

Add these stub methods to the class (we'll implement them in next tasks):

```typescript
private async loadGame(): Promise<void> {
  // TODO: Implement in next task
  console.log('Load game:', this.save.id)
}

private async replayGame(): Promise<void> {
  // TODO: Implement in next task
  console.log('Replay game:', this.save.id)
}

private async deleteGame(): Promise<void> {
  // TODO: Implement in next task
  console.log('Delete game:', this.save.id)
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: implement SaveActionMenuState input handling with stubs"
```

---

## Task 4: Implement loadGame() Method

**Files:**
- Modify: `src/states/SaveActionMenuState/SaveActionMenuState.ts`

**Step 1: Implement loadGame() method**

Replace the `loadGame()` stub with full implementation:

```typescript
private async loadGame(): Promise<void> {
  try {
    // Load game state from storage
    const gameState = await this.gameStorage.loadGame(this.save.id)

    if (!gameState) {
      console.error('Failed to load game state')
      // TODO: Show error message to user
      return
    }

    // Clear state stack and start playing
    this.stateManager.clearStack()
    this.stateManager.pushState(new PlayingState(gameState))
  } catch (error) {
    console.error('Error loading game:', error)
    // TODO: Show error message to user
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: implement loadGame() method"
```

---

## Task 5: Implement replayGame() Method

**Files:**
- Modify: `src/states/SaveActionMenuState/SaveActionMenuState.ts`

**Step 1: Check ReplayDebugState constructor signature**

Read: `src/states/ReplayDebugState/ReplayDebugState.ts` (lines 1-50)

Expected: Constructor takes `(initialState, seed, commands, renderer)` or similar

**Step 2: Implement replayGame() method**

Replace the `replayGame()` stub with full implementation:

```typescript
private async replayGame(): Promise<void> {
  try {
    // Load full save data (includes replay data)
    const saveData = await this.gameStorage.db.get('saves', this.save.id)

    if (!saveData) {
      console.error('Save not found')
      return
    }

    if (!saveData.replayData) {
      console.error('No replay data available for this save')
      // TODO: Show error message to user
      return
    }

    const { initialState, seed, commands } = saveData.replayData

    // Get renderer from current Playing state if available
    // Or create a new one - ReplayDebugState will handle this
    this.stateManager.pushState(
      new ReplayDebugState(
        initialState,
        seed,
        commands,
        null // ReplayDebugState creates its own renderer
      )
    )
  } catch (error) {
    console.error('Error launching replay:', error)
    // TODO: Show error message to user
  }
}
```

**Step 3: Add IndexedDBService import if needed**

Check if we need to access `this.gameStorage.db` or if there's a better API.

If `GameStorageService` doesn't expose `db`, we need to add a method like `loadSaveData(id)` to GameStorageService.

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors (or identify needed API changes)

**Step 5: Commit**

```bash
git add src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: implement replayGame() method"
```

---

## Task 6: Implement deleteGame() Method

**Files:**
- Modify: `src/states/SaveActionMenuState/SaveActionMenuState.ts`

**Step 1: Implement deleteGame() method**

Replace the `deleteGame()` stub with full implementation:

```typescript
private async deleteGame(): Promise<void> {
  try {
    // Delete from storage
    await this.gameStorage.deleteGame(this.save.id)

    // Pop this menu state
    this.stateManager.popState()

    // Trigger leaderboard refresh callback
    this.onDelete()
  } catch (error) {
    console.error('Error deleting game:', error)
    // TODO: Show error message to user
    // Stay in delete confirmation mode so user can try again or cancel
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: implement deleteGame() method with confirmation"
```

---

## Task 7: Integrate with LeaderboardState

**Files:**
- Modify: `src/states/LeaderboardState/LeaderboardState.ts`

**Step 1: Add SaveActionMenuState import**

Add import at top of `LeaderboardState.ts`:

```typescript
import { SaveActionMenuState } from '../SaveActionMenuState'
```

**Step 2: Replace TODO in handleInput()**

Find the `case 'Enter':` block (around line 125) and replace:

```typescript
case 'Enter':
  // TODO: Open action menu (Resume/Replay/Delete)
  console.log('Selected save:', this.saves[this.selectedIndex])
  break
```

With:

```typescript
case 'Enter':
  if (this.saves.length > 0) {
    const selectedSave = this.saves[this.selectedIndex]
    this.stateManager.pushState(
      new SaveActionMenuState(
        selectedSave,
        this.gameStorage,
        this.stateManager,
        () => this.refreshLeaderboard()
      )
    )
  }
  break
```

**Step 3: Add refreshLeaderboard() method**

Add this new method to the `LeaderboardState` class:

```typescript
private async refreshLeaderboard(): Promise<void> {
  this.saves = await this.gameStorage.listGames()
  this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.saves.length - 1))
  this.render()
}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/states/LeaderboardState/LeaderboardState.ts
git commit -m "feat: integrate SaveActionMenuState with LeaderboardState"
```

---

## Task 8: Fix API Issues (If Needed)

**Context:** Task 5 may have revealed that we need to access save data directly. GameStorageService might not expose the IndexedDB instance.

**Step 1: Check if GameStorageService has loadSaveData() method**

Read: `src/services/GameStorageService/GameStorageService.ts`

Look for a method that returns the full save object (not just GameState).

**Step 2: If method doesn't exist, add it**

Add to `GameStorageService.ts`:

```typescript
/**
 * Load raw save data (includes replay data)
 * Used for replay debugger
 */
async loadSaveData(gameId: string): Promise<any | null> {
  try {
    const save = await this.db.get('saves', gameId)
    return save || null
  } catch (error) {
    console.error('Error loading save data:', error)
    return null
  }
}
```

**Step 3: Update SaveActionMenuState to use new API**

If added new method, update `replayGame()` in `SaveActionMenuState.ts`:

```typescript
private async replayGame(): Promise<void> {
  try {
    const saveData = await this.gameStorage.loadSaveData(this.save.id)

    if (!saveData) {
      console.error('Save not found')
      return
    }

    if (!saveData.replayData) {
      console.error('No replay data available for this save')
      return
    }

    const { initialState, seed, commands } = saveData.replayData

    this.stateManager.pushState(
      new ReplayDebugState(
        initialState,
        seed,
        commands,
        null
      )
    )
  } catch (error) {
    console.error('Error launching replay:', error)
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No type errors

**Step 5: Commit (if changes made)**

```bash
git add src/services/GameStorageService/GameStorageService.ts src/states/SaveActionMenuState/SaveActionMenuState.ts
git commit -m "feat: add loadSaveData() API for replay access"
```

---

## Task 9: Manual Testing

**Context:** States are UI components and typically not unit tested. Perform manual testing instead.

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test Load Ongoing Game**

1. Start a new game
2. Play for a few turns
3. Return to main menu
4. Open leaderboard
5. Navigate to ongoing game
6. Press Enter to open action menu
7. Verify action menu shows: `[L]oad  [R]eplay  [D]elete  [Escape] Back`
8. Press 'L' to load
9. Verify game resumes from saved state

**Step 3: Test Load Dead Game**

1. Play a game until death
2. From death screen, return to main menu
3. Open leaderboard
4. Navigate to dead game
5. Press Enter, then 'L'
6. Verify dead game loads and allows continued play

**Step 4: Test Replay**

1. Select any game in leaderboard
2. Press Enter, then 'R'
3. Verify replay debugger launches
4. Verify replay starts from turn 0
5. Verify transport controls work (space, shift+space, etc.)

**Step 5: Test Delete with Confirmation**

1. Select a game to delete
2. Press Enter, then 'D'
3. Verify confirmation prompt appears: `Delete "CharName"? [Y] Yes  [N] No`
4. Press 'N' to cancel
5. Verify returns to action menu
6. Press 'D' again
7. Press 'Y' to confirm
8. Verify game deleted from leaderboard
9. Verify leaderboard refreshes

**Step 6: Test Cancel (Escape)**

1. Select any game
2. Press Enter to open action menu
3. Press Escape
4. Verify returns to leaderboard
5. Verify can still navigate and select other games

**Step 7: Test Error Cases**

1. Manually corrupt a save in IndexedDB (optional)
2. Try to load corrupted save
3. Verify error is logged (check console)
4. Verify doesn't crash

**Step 8: Create testing checklist in plan**

Document results:

```markdown
## Testing Results

- [ ] Load ongoing game works
- [ ] Load dead game works (continues play)
- [ ] Replay launches debugger correctly
- [ ] Delete confirmation Y/N works
- [ ] Escape cancels action menu
- [ ] Leaderboard refreshes after delete
- [ ] Multiple saves can be managed
- [ ] No console errors during normal use
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `docs/systems-advanced.md` (or relevant doc)

**Step 1: Document new feature**

Add section to appropriate documentation:

```markdown
### Leaderboard Save Actions

The leaderboard now supports full save management:

**Action Menu** (press Enter on any save):
- **[L]oad**: Load game and continue playing (works for both ongoing and dead games)
- **[R]eplay**: Launch replay debugger to watch game from turn 0
- **[D]elete**: Delete save with Y/N confirmation
- **[Escape]**: Cancel and return to leaderboard

**State Stack:**
```
MainMenuState → LeaderboardState → SaveActionMenuState
                                   ↓
                            PlayingState (on Load)
                            ReplayDebugState (on Replay)
```

**Implementation**: `SaveActionMenuState` is a transparent overlay state
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: add SaveActionMenuState documentation"
```

---

## Completion Checklist

- [ ] Task 1: SaveActionMenuState skeleton created
- [ ] Task 2: render() method implemented
- [ ] Task 3: handleInput() with routing implemented
- [ ] Task 4: loadGame() method implemented
- [ ] Task 5: replayGame() method implemented
- [ ] Task 6: deleteGame() method implemented
- [ ] Task 7: LeaderboardState integration complete
- [ ] Task 8: API fixes applied (if needed)
- [ ] Task 9: Manual testing completed
- [ ] Task 10: Documentation updated

---

## Notes

**Known Issues:**
- Error messages currently only log to console - future enhancement could show in UI
- No loading spinner while loading/deleting - operations are fast enough that it's not critical

**Future Enhancements:**
- Add visual error notifications instead of console.error()
- Add loading states for async operations
- Add save renaming feature
- Add save export/import feature
