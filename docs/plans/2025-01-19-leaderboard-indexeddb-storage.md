# Leaderboard & IndexedDB Storage Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Replace LocalStorage with IndexedDB for all saves, preserve saves after death, and add a leaderboard UI sorted by score.

**Architecture:** Migrate from LocalStorage to IndexedDB-only storage. Add status ('ongoing'|'died'|'won') and calculated score fields to save metadata. Create new LeaderboardState UI accessible from main menu. No migration of old saves (fresh start).

**Tech Stack:** TypeScript, IndexedDB (via existing IndexedDBService), Vite, Jest

---

## Task 1: Update IndexedDB Schema for Metadata

**Files:**
- Modify: `src/services/IndexedDBService/IndexedDBService.ts:57-68`
- Reference: Current schema has `gameId`, `timestamp`, `characterName` index

**Step 1: Add new indexes to saves store**

In `IndexedDBService.ts`, modify the `onupgradeneeded` handler:

```typescript
// Around line 57-68
request.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result
  const oldVersion = event.oldVersion

  // Create 'saves' object store (if upgrading from v0)
  if (!db.objectStoreNames.contains(IndexedDBService.STORES.SAVES)) {
    const savesStore = db.createObjectStore(IndexedDBService.STORES.SAVES, {
      keyPath: 'gameId',
    })

    // Add indexes for querying
    savesStore.createIndex('timestamp', 'timestamp', { unique: false })
    savesStore.createIndex('characterName', 'metadata.characterName', {
      unique: false,
    })
    savesStore.createIndex('status', 'metadata.status', { unique: false })  // NEW
    savesStore.createIndex('score', 'metadata.score', { unique: false })    // NEW
  }

  // Remove deprecated 'replays' object store (upgrading from v1 to v2)
  if (oldVersion < 2 && db.objectStoreNames.contains('replays')) {
    console.log('Removing deprecated replays store (unified storage migration)')
    db.deleteObjectStore('replays')
  }
}
```

**Step 2: Verify schema is backward compatible**

Check: Existing saves won't have `status` or `score` indexes, but they'll work fine (indexes don't affect existing data)

**Step 3: Commit**

```bash
git add src/services/IndexedDBService/IndexedDBService.ts
git commit -m "feat: add status and score indexes to IndexedDB saves store"
```

---

## Task 2: Add SaveSummary Type Definition

**Files:**
- Modify: `src/types/core/core.ts` (add new type at end)
- Reference: Existing types like `GameState`, `Player`

**Step 1: Add SaveSummary interface**

Add to end of `core.ts`:

```typescript
/**
 * Summary of a saved game for leaderboard display
 * Extracted from SaveDocument metadata
 */
export interface SaveSummary {
  gameId: string
  characterName: string
  status: 'ongoing' | 'died' | 'won'
  score: number
  gold: number
  level: number
  turnCount: number
  timestamp: number
  maxDepth: number
  monstersKilled: number
}
```

**Step 2: Commit**

```bash
git add src/types/core/core.ts
git commit -m "feat: add SaveSummary type for leaderboard display"
```

---

## Task 3: Update GameStorageService to Calculate Status & Score

**Files:**
- Modify: `src/services/GameStorageService/GameStorageService.ts:50-120`
- Test: `src/services/GameStorageService/GameStorageService.test.ts`

**Step 1: Write failing test for calculateStatus**

In `GameStorageService.test.ts`:

```typescript
describe('calculateStatus', () => {
  it('should return "ongoing" for active game', () => {
    const state = createTestState({ isGameOver: false })
    const status = (service as any).calculateStatus(state)
    expect(status).toBe('ongoing')
  })

  it('should return "won" for victory', () => {
    const state = createTestState({ isGameOver: true, hasWon: true })
    const status = (service as any).calculateStatus(state)
    expect(status).toBe('won')
  })

  it('should return "died" for death', () => {
    const state = createTestState({ isGameOver: true, hasWon: false })
    const status = (service as any).calculateStatus(state)
    expect(status).toBe('died')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: FAIL with "calculateStatus is not a function"

**Step 3: Implement calculateStatus method**

In `GameStorageService.ts`, add private method:

```typescript
private calculateStatus(state: GameState): 'ongoing' | 'died' | 'won' {
  if (!state.isGameOver) return 'ongoing'
  return state.hasWon ? 'won' : 'died'
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: PASS

**Step 5: Write failing test for calculateScore**

```typescript
describe('calculateScore', () => {
  it('should calculate score from gold + monsters + depth', () => {
    const state = createTestState({
      player: { gold: 500 },
      monstersKilled: 10,
      maxDepth: 5
    })
    const score = (service as any).calculateScore(state)
    // 500 + (10 * 100) + (5 * 1000) = 500 + 1000 + 5000 = 6500
    expect(score).toBe(6500)
  })

  it('should handle zero values', () => {
    const state = createTestState({
      player: { gold: 0 },
      monstersKilled: 0,
      maxDepth: 0
    })
    const score = (service as any).calculateScore(state)
    expect(score).toBe(0)
  })
})
```

**Step 6: Run test to verify it fails**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: FAIL with "calculateScore is not a function"

**Step 7: Implement calculateScore method**

```typescript
private calculateScore(state: GameState): number {
  return (
    state.player.gold +
    (state.monstersKilled * 100) +
    (state.maxDepth * 1000)
  )
}
```

**Step 8: Run test to verify it passes**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: PASS

**Step 9: Update saveGame to include status and score**

Modify `saveGame` method around line 60:

```typescript
async saveGame(state: GameState): Promise<void> {
  // Build SaveDocument
  const saveDoc = {
    gameId: state.gameId,
    version: SAVE_VERSION,
    timestamp: Date.now(),
    gameState: state,
    replayData: {
      initialState: this.commandRecorder.getInitialState(),
      commands: this.commandRecorder.getCommandLog(),
      seed: state.seed
    },
    metadata: {
      characterName: state.characterName || 'Unknown Hero',
      currentLevel: state.currentLevel,
      turnCount: state.turnCount,
      status: this.calculateStatus(state),     // NEW
      gold: state.player.gold,
      monstersKilled: state.monstersKilled,
      maxDepth: state.maxDepth,
      score: this.calculateScore(state)        // NEW
    }
  }

  await this.indexedDB.put('saves', state.gameId, saveDoc)
}
```

**Step 10: Commit**

```bash
git add src/services/GameStorageService/GameStorageService.ts src/services/GameStorageService/GameStorageService.test.ts
git commit -m "feat: add calculateStatus and calculateScore to GameStorageService"
```

---

## Task 4: Implement listGames() Method

**Files:**
- Modify: `src/services/GameStorageService/GameStorageService.ts` (add new method)
- Test: `src/services/GameStorageService/GameStorageService.test.ts`

**Step 1: Write failing test for listGames**

```typescript
describe('listGames', () => {
  it('should return empty array when no saves exist', async () => {
    mockIndexedDB.getAll.mockResolvedValue([])

    const games = await service.listGames()

    expect(games).toEqual([])
  })

  it('should return saves sorted by score descending', async () => {
    const saves = [
      {
        gameId: 'game-1',
        metadata: {
          characterName: 'Alice',
          status: 'died',
          score: 1000,
          gold: 100,
          currentLevel: 5,
          turnCount: 50,
          maxDepth: 5,
          monstersKilled: 9
        },
        timestamp: Date.now()
      },
      {
        gameId: 'game-2',
        metadata: {
          characterName: 'Bob',
          status: 'won',
          score: 5000,
          gold: 500,
          currentLevel: 26,
          turnCount: 200,
          maxDepth: 26,
          monstersKilled: 45
        },
        timestamp: Date.now()
      }
    ]
    mockIndexedDB.getAll.mockResolvedValue(saves)

    const games = await service.listGames()

    // Sorted by score descending (Bob first with 5000, Alice second with 1000)
    expect(games).toHaveLength(2)
    expect(games[0].characterName).toBe('Bob')
    expect(games[0].score).toBe(5000)
    expect(games[1].characterName).toBe('Alice')
    expect(games[1].score).toBe(1000)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: FAIL with "listGames is not a function"

**Step 3: Implement listGames method**

```typescript
async listGames(): Promise<SaveSummary[]> {
  const allSaves = await this.indexedDB.getAll('saves')

  // Map to SaveSummary and sort by score descending
  return allSaves
    .map(doc => ({
      gameId: doc.gameId,
      characterName: doc.metadata.characterName,
      status: doc.metadata.status,
      score: doc.metadata.score,
      gold: doc.metadata.gold,
      level: doc.metadata.currentLevel,
      turnCount: doc.metadata.turnCount,
      timestamp: doc.timestamp,
      maxDepth: doc.metadata.maxDepth,
      monstersKilled: doc.metadata.monstersKilled
    }))
    .sort((a, b) => b.score - a.score)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- GameStorageService.test.ts --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/GameStorageService/GameStorageService.ts src/services/GameStorageService/GameStorageService.test.ts
git commit -m "feat: implement listGames() method for leaderboard"
```

---

## Task 5: Remove Delete-On-Death Behavior

**Files:**
- Modify: `src/ui/GameRenderer.ts:132-138`

**Step 1: Remove deleteSave call from GameRenderer**

Find the permadeath deletion code (around line 132-138):

```typescript
// BEFORE:
if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
  // Permadeath: Delete save immediately when player dies
  this.gameStorageService.deleteSave(state.gameId)
  if (this.debugService.isEnabled()) {
    console.log('[GameRenderer] Save deleted (permadeath)')
  }
  this.deathScreen.show()
}

// AFTER:
if (state.isGameOver && !state.hasWon && !this.deathScreen.isVisible()) {
  // Save is preserved with status='died'
  // Auto-save middleware will save final state automatically
  this.deathScreen.show()
}
```

**Step 2: Verify auto-save saves death state**

Check: AutoSaveMiddleware should already be saving on death (it saves on every turn)

**Step 3: Commit**

```bash
git add src/ui/GameRenderer.ts
git commit -m "feat: preserve saves after death (remove permadeath deletion)"
```

---

## Task 6: Create LeaderboardState UI Component

**Files:**
- Create: `src/states/LeaderboardState/LeaderboardState.ts`
- Create: `src/states/LeaderboardState/index.ts`
- Reference: `src/states/MainMenuState/MainMenuState.ts` for ASCII table rendering

**Step 1: Create LeaderboardState skeleton**

```typescript
import { BaseState } from '../BaseState'
import { GameState, Input, SaveSummary } from '@game/core/core'
import { GameStorageService } from '@services/GameStorageService'
import { GameStateManager } from '@services/GameStateManager'

/**
 * LeaderboardState - Display all saved games sorted by score
 *
 * Features:
 * - Shows all saves (ongoing, died, won) in score order
 * - Navigate with ↑/↓, select with Enter, back with Escape
 * - Enter opens action menu (Resume/Replay/Delete)
 */
export class LeaderboardState extends BaseState {
  private saves: SaveSummary[] = []
  private selectedIndex: number = 0
  private isLoading: boolean = true
  private container: HTMLDivElement | null = null

  constructor(
    private gameStorage: GameStorageService,
    private stateManager: GameStateManager
  ) {
    super()
  }

  async enter(): void {
    // Load saves
    this.saves = await this.gameStorage.listGames()
    this.isLoading = false

    // Create UI container
    this.container = document.createElement('div')
    this.container.className = 'leaderboard-container'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      color: #fff;
      font-family: monospace;
      padding: 20px;
      overflow-y: auto;
      z-index: 1000;
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
    if (!this.container || this.isLoading) return

    if (this.saves.length === 0) {
      this.container.innerHTML = `
        <pre>
╔════════════════════ LEADERBOARD ════════════════════╗
║                                                     ║
║            No saved games found.                    ║
║                                                     ║
║            Press [Escape] to return to menu         ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
        </pre>
      `
      return
    }

    // Render table
    let html = '<pre>'
    html += '╔════════════════════════════════ LEADERBOARD ═══════════════════════════════╗\n'
    html += '║ Rank │ Character       │ Status  │ Score    │ Gold  │ Depth │ Monsters ║\n'
    html += '╠══════╪═════════════════╪═════════╪══════════╪═══════╪═══════╪══════════╣\n'

    this.saves.forEach((save, index) => {
      const rank = (index + 1).toString().padStart(4, ' ')
      const name = save.characterName.substring(0, 15).padEnd(15, ' ')
      const status = save.status.padEnd(7, ' ')
      const score = save.score.toString().padStart(8, ' ')
      const gold = save.gold.toString().padStart(5, ' ')
      const depth = `L${save.maxDepth}`.padStart(5, ' ')
      const monsters = save.monstersKilled.toString().padStart(8, ' ')

      const isSelected = index === this.selectedIndex
      const prefix = isSelected ? '>' : ' '

      html += `║ ${prefix}${rank} │ ${name} │ ${status} │ ${score} │ ${gold} │ ${depth} │ ${monsters} ║\n`
    })

    html += '╚═══════════════════════════════════════════════════════════════════════════════╝\n'
    html += '\n'
    html += '[↑/↓] Navigate  [Enter] Actions  [Escape] Back\n'
    html += '</pre>'

    this.container.innerHTML = html
  }

  handleInput(input: Input): void {
    if (this.isLoading) return

    switch (input.key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1)
        this.render()
        break

      case 'ArrowDown':
        this.selectedIndex = Math.min(this.saves.length - 1, this.selectedIndex + 1)
        this.render()
        break

      case 'Enter':
        // TODO: Open action menu (Resume/Replay/Delete)
        console.log('Selected save:', this.saves[this.selectedIndex])
        break

      case 'Escape':
        this.stateManager.popState()
        break
    }
  }

  isPaused(): boolean {
    return true
  }

  isTransparent(): boolean {
    return false  // Opaque overlay
  }
}
```

**Step 2: Create barrel export**

Create `src/states/LeaderboardState/index.ts`:

```typescript
export { LeaderboardState } from './LeaderboardState'
```

**Step 3: Test manually**

Run: `npm run dev`
Expected: Can open leaderboard from main menu (after next task)

**Step 4: Commit**

```bash
git add src/states/LeaderboardState/
git commit -m "feat: create LeaderboardState UI component with ASCII table"
```

---

## Task 7: Add Leaderboard Option to Main Menu

**Files:**
- Modify: `src/states/MainMenuState/MainMenuState.ts:40-80`
- Reference: Existing menu options (New Game, Continue, Settings)

**Step 1: Import LeaderboardState**

Add import at top of `MainMenuState.ts`:

```typescript
import { LeaderboardState } from '@states/LeaderboardState'
```

**Step 2: Add 'Leaderboard' to menu options**

Modify menu options array (around line 50):

```typescript
// BEFORE:
private menuOptions = ['New Game', 'Continue', 'Settings']

// AFTER:
private menuOptions = ['New Game', 'Continue', 'Leaderboard', 'Settings']
```

**Step 3: Add leaderboard handler to handleInput**

In the `handleInput` method, add case for 'Leaderboard':

```typescript
case 'Enter':
  const selected = this.menuOptions[this.selectedIndex]

  if (selected === 'New Game') {
    // ... existing code ...
  } else if (selected === 'Continue') {
    // ... existing code ...
  } else if (selected === 'Leaderboard') {
    const leaderboardState = new LeaderboardState(
      this.gameStorage,
      this.stateManager
    )
    this.stateManager.pushState(leaderboardState)
  } else if (selected === 'Settings') {
    // ... existing code ...
  }
  break
```

**Step 4: Update constructor to accept GameStorageService**

Modify constructor (around line 30):

```typescript
constructor(
  private stateManager: GameStateManager,
  private gameStorage: GameStorageService,  // NEW
  // ... other parameters ...
) {
  super()
}
```

**Step 5: Update main.ts to pass GameStorageService**

In `src/main.ts`, find MainMenuState instantiation (around line 300):

```typescript
// BEFORE:
const mainMenu = new MainMenuState(
  stateManager,
  // ... other params ...
)

// AFTER:
const mainMenu = new MainMenuState(
  stateManager,
  gameStorage,  // NEW
  // ... other params ...
)
```

**Step 6: Test manually**

Run: `npm run dev`
Steps:
1. Start game
2. Press Escape to return to menu
3. Navigate to "Leaderboard"
4. Press Enter
Expected: Leaderboard screen opens showing saved games

**Step 7: Commit**

```bash
git add src/states/MainMenuState/MainMenuState.ts src/main.ts
git commit -m "feat: add Leaderboard option to main menu"
```

---

## Task 8: Remove LocalStorageService (Cleanup)

**Files:**
- Delete: `src/services/LocalStorageService/` (entire directory)
- Modify: Remove imports from `src/main.ts`, `src/services/GameStorageService/GameStorageService.ts`

**Step 1: Check for LocalStorageService usage**

```bash
grep -r "LocalStorageService" src/ --exclude-dir=node_modules
```

Expected: Should only find references in:
- `src/main.ts` (import statement)
- `src/services/GameStorageService/GameStorageService.ts` (if still referencing it)

**Step 2: Remove LocalStorageService import from main.ts**

Remove line:
```typescript
import { LocalStorageService } from '@services/LocalStorageService'
```

**Step 3: Remove LocalStorageService instantiation from main.ts**

Remove line:
```typescript
const localStorageService = new LocalStorageService()
```

**Step 4: Delete LocalStorageService directory**

```bash
rm -rf src/services/LocalStorageService/
```

**Step 5: Verify tests still pass**

```bash
npm test -- --no-coverage
```

Expected: Tests pass (LocalStorageService tests removed)

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove LocalStorageService (migrated to IndexedDB)"
```

---

## Task 9: Update Documentation

**Files:**
- Modify: `CLAUDE.md:120-150` (Save & Replay Storage section)
- Modify: `docs/services/GameStorageService.md`

**Step 1: Update CLAUDE.md storage section**

Replace "Save & Replay Storage" section with:

```markdown
## Save & Replay Storage (Quick Reference)

**Architecture**: IndexedDB-only storage - all saves persist after death

### Storage Format

Save files (IndexedDB 'saves' store) contain:
- **gameState**: Full game state
- **replayData**: Embedded replay information
  - `initialState`: Game state at turn 0
  - `seed`: RNG seed for deterministic replay
  - `commands`: Full command history from turn 0
- **metadata**: Character name, turn count, level, timestamp, **status**, **score**
- **version**: Save format version (current: 6)

### Key Features

1. **No Deletion on Death**: Saves preserved with status='died'
2. **Leaderboard**: All saves sorted by score (gold + monsters×100 + depth×1000)
3. **Score Calculation**: Automatic on every save
4. **Status Tracking**: 'ongoing' | 'died' | 'won'

### Key Services

- **GameStorageService**: Save/load operations, leaderboard queries, score calculation
- **CommandRecorderService**: Records commands during gameplay
- **ReplayDebuggerService**: Loads and reconstructs game states from embedded replay data
- **IndexedDBService**: Database operations (DB version 2, single 'saves' store)

**Details**: [Replay System](./docs/replay-system.md)
```

**Step 2: Update GameStorageService documentation**

Create or update `docs/services/GameStorageService.md`:

```markdown
# GameStorageService

Handles saving and loading games to/from IndexedDB.

## Responsibilities

- Save game state with embedded replay data
- Load game state by gameId
- List all games for leaderboard
- Calculate game status and score
- Delegate to IndexedDBService for persistence

## API

### saveGame(state: GameState): Promise<void>

Saves game state to IndexedDB with:
- Full game state
- Embedded replay data (initialState, commands, seed)
- Metadata (character name, turn count, level, status, score)

Status calculation:
- 'ongoing': Game in progress (!isGameOver)
- 'won': Player retrieved Amulet and escaped (isGameOver && hasWon)
- 'died': Player died (isGameOver && !hasWon)

Score calculation:
```
score = gold + (monstersKilled × 100) + (maxDepth × 1000)
```

### loadGame(gameId: string): Promise<GameState | null>

Loads game state by ID. Returns null if not found.

### listGames(): Promise<SaveSummary[]>

Returns all saved games sorted by score (descending).

Used by LeaderboardState to display game list.

### deleteSave(gameId: string): Promise<void>

Deletes a save file. Used when player manually deletes from leaderboard.

## Architecture Notes

- **No LocalStorage**: All saves use IndexedDB
- **No Migration**: Old LocalStorage saves are not migrated (fresh start)
- **No Deletion on Death**: Saves preserved after player dies
- **Automatic Score**: Calculated on every save

## Dependencies

- IndexedDBService: Database operations
- CommandRecorderService: Provides replay data

## Used By

- AutoSaveMiddleware: Auto-saves during gameplay
- SaveCommand: Manual save via 'S' key
- LeaderboardState: Lists all games
- MainMenuState: Load game from continue
```

**Step 3: Commit**

```bash
git add CLAUDE.md docs/services/GameStorageService.md
git commit -m "docs: update storage documentation for IndexedDB migration"
```

---

## Task 10: Manual Testing & Polish

**Step 1: Test full workflow**

1. Start new game
2. Play for a few turns, collect gold, kill monsters
3. Save game (press 'S')
4. Continue playing
5. Die intentionally
6. Return to main menu (Escape)
7. Navigate to Leaderboard
8. Verify save appears with status='died' and correct score

**Step 2: Test edge cases**

- Empty leaderboard (no saves)
- Multiple saves (verify sorting)
- Ongoing vs died vs won saves

**Step 3: Polish UI if needed**

Adjust LeaderboardState rendering:
- Column widths
- Colors for status (green=won, red=died, yellow=ongoing)
- Highlight selected row

**Step 4: Final commit**

```bash
git add -A
git commit -m "polish: improve leaderboard UI and add status colors"
```

---

## Verification Checklist

- [ ] All saves go to IndexedDB (no LocalStorage)
- [ ] Saves preserved after death (status='died')
- [ ] Leaderboard shows all saves sorted by score
- [ ] Score calculated correctly (gold + monsters×100 + depth×1000)
- [ ] Status reflects game outcome (ongoing/died/won)
- [ ] Navigate leaderboard with ↑/↓, back with Escape
- [ ] Main menu has "Leaderboard" option
- [ ] Tests pass: `npm test -- --no-coverage`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] LocalStorageService completely removed

---

## Notes for Engineer

**Testing:**
- Run `npm test -- GameStorageService` frequently during Task 3-4
- Manual testing required for UI (Tasks 6-7)
- Check browser DevTools → Application → IndexedDB → roguelike_db → saves

**Architecture:**
- Follow existing patterns from MainMenuState for UI
- Use BaseState for all new state classes
- Keep services pure (no side effects in getters)

**Common Pitfalls:**
- Don't forget to update main.ts constructor calls
- Always add barrel exports (index.ts) for new folders
- Test with empty database (clear IndexedDB via DevTools)
