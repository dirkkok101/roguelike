# Run Command Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Implement Angband-style run command (Shift+Arrow) with intelligent disturbance detection for safe automatic movement.

**Architecture:** Command-based with DisturbanceService for stopping logic. RunCommand initiates run state, MoveCommand checks disturbances after each step and continues/stops accordingly. Player.runState tracks direction and starting FOV for monster detection.

**Tech Stack:** TypeScript, Jest, existing service architecture (FOVService, MonsterAIService, MapService)

---

## Task 1: Add RunState Type Definition

**Files:**
- Modify: `src/types/core/core.ts:148` (Player interface)

**Step 1: Add RunState interface to core.ts**

Add after the `Direction` type definition (around line 524):

```typescript
/**
 * Player run state - tracks continuous movement in one direction
 * Used by RunCommand and MoveCommand for automatic movement with disturbance detection
 */
export interface RunState {
  direction: Direction                // Direction of run (up/down/left/right, etc.)
  startingFOV: Set<string>            // Monster IDs visible when run started
  startingPosition: Position          // Where run began (for corridor logic)
  previousHP: number                  // HP when run started (to detect damage)
}
```

**Step 2: Update Player interface**

Change line 148 from:
```typescript
isRunning: boolean // Track if player is running (increases monster detection range)
```

To:
```typescript
isRunning: boolean // Track if player is running (increases monster detection range)
runState: RunState | null // Active run state (null when not running)
```

**Step 3: Run type check to verify it compiles**

```bash
cd /Users/dirkkok/Development/roguelike/.worktrees/run-command
npm run type-check
```

Expected: TypeScript compilation errors in files that create Player objects (missing `runState` field)

**Step 4: Fix compilation errors by adding runState: null**

Search for Player object creation:
```bash
grep -r "position:" src --include="*.ts" | grep -v test | grep "hp:" | head -5
```

Add `runState: null` to each Player object creation. Common locations:
- `src/services/PlayerService/` (player creation)
- Test files creating Player objects

**Step 5: Run type check again**

```bash
npm run type-check
```

Expected: ✓ No TypeScript errors

**Step 6: Commit**

```bash
git add src/types/core/core.ts
git add . # Include any service files with runState: null additions
git commit -m "feat: add RunState type definition to Player interface"
```

---

## Task 2: Create DisturbanceService (TDD)

**Files:**
- Create: `src/services/DisturbanceService/DisturbanceService.ts`
- Create: `src/services/DisturbanceService/disturbance-checks.test.ts`
- Create: `src/services/DisturbanceService/index.ts`

**Step 1: Write failing test for monster detection disturbance**

Create `src/services/DisturbanceService/disturbance-checks.test.ts`:

```typescript
import { DisturbanceService } from './DisturbanceService'
import { GameState, RunState, Monster, Position } from '@game/core/core'
import { createMockGameState, createMockPlayer, createMockLevel, createMockMonster } from '@utils/testHelpers'

describe('DisturbanceService - Disturbance Checks', () => {
  let service: DisturbanceService

  beforeEach(() => {
    service = new DisturbanceService()
  })

  describe('monster detection', () => {
    it('stops run when new monster appears in FOV', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 }, hp: 20 })
      const level = createMockLevel()

      const existingMonster = createMockMonster({ id: 'orc-1', position: { x: 6, y: 5 } })
      const newMonster = createMockMonster({ id: 'kobold-2', position: { x: 7, y: 5 } })
      level.monsters = [existingMonster, newMonster]

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5', '7,5']) // Both monsters visible

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(['orc-1']), // Only orc was visible when run started
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toBe('Kobold appears!')
    })

    it('does not stop if same monsters still visible', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 }, hp: 20 })
      const level = createMockLevel()

      const monster = createMockMonster({ id: 'orc-1', position: { x: 6, y: 5 } })
      level.monsters = [monster]

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5'])

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(['orc-1']),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(false)
    })
  })

  describe('safety critical', () => {
    it('stops run when HP drops below 30%', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 }, hp: 5, maxHp: 20 }) // 25%
      const state: GameState = createMockGameState({ player })

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 10
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('health is low')
    })

    it('stops run when hunger is critical', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 }, hunger: 250 }) // Below 300
      const state: GameState = createMockGameState({ player })

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('hungry')
    })
  })

  describe('navigation', () => {
    it('stops run at corridor branch (3+ walkable directions)', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 } })
      const level = createMockLevel()

      // Create T-junction: paths up, down, right
      level.tiles[4][5] = { walkable: true, type: 'CORRIDOR' } as any // up
      level.tiles[6][5] = { walkable: true, type: 'CORRIDOR' } as any // down
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right
      level.tiles[5][4] = { walkable: false, type: 'WALL' } as any // left blocked

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('corridor branches')
    })

    it('stops run when reaching a door', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 } })
      const level = createMockLevel()

      level.doors = [
        { position: { x: 5, y: 6 }, state: 'CLOSED' } as any
      ]

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('door')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test disturbance-checks.test.ts
```

Expected: FAIL with "Cannot find module './DisturbanceService'"

**Step 3: Create DisturbanceService interface**

Create `src/services/DisturbanceService/DisturbanceService.ts`:

```typescript
import { GameState, RunState, Position, Monster } from '@game/core/core'

export interface DisturbanceResult {
  disturbed: boolean
  reason?: string
}

export class DisturbanceService {
  /**
   * Check if running should stop due to environmental changes
   * Priority: Safety > Combat > Navigation
   */
  checkDisturbance(state: GameState, runState: RunState): DisturbanceResult {
    // Safety critical checks
    const safetyCheck = this.checkSafety(state, runState)
    if (safetyCheck.disturbed) return safetyCheck

    // Combat threat checks
    const combatCheck = this.checkCombatThreats(state, runState)
    if (combatCheck.disturbed) return combatCheck

    // Navigation checks
    const navCheck = this.checkNavigation(state, runState)
    if (navCheck.disturbed) return navCheck

    return { disturbed: false }
  }

  private checkSafety(state: GameState, runState: RunState): DisturbanceResult {
    const { player } = state

    // HP below 30%
    const hpPercent = player.hp / player.maxHp
    if (hpPercent < 0.3) {
      return { disturbed: true, reason: 'Your health is low!' }
    }

    // Hunger critical (below 300)
    if (player.hunger < 300) {
      return { disturbed: true, reason: 'You are very hungry!' }
    }

    // Status effects (confused, blind, paralyzed)
    const blockingEffects = player.statusEffects.filter(
      (effect) =>
        effect.type === 'CONFUSED' ||
        effect.type === 'BLIND' ||
        effect.type === 'PARALYZED' ||
        effect.type === 'HELD'
    )
    if (blockingEffects.length > 0) {
      return { disturbed: true, reason: `You are ${blockingEffects[0].type.toLowerCase()}!` }
    }

    return { disturbed: false }
  }

  private checkCombatThreats(state: GameState, runState: RunState): DisturbanceResult {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return { disturbed: false }

    // Get monsters currently in FOV
    const currentFOVMonsters = new Set<string>()
    for (const monster of currentLevel.monsters) {
      const key = `${monster.position.x},${monster.position.y}`
      if (state.visibleCells.has(key)) {
        currentFOVMonsters.add(monster.id)
      }
    }

    // Check for new monsters in FOV
    for (const monsterId of currentFOVMonsters) {
      if (!runState.startingFOV.has(monsterId)) {
        const monster = currentLevel.monsters.find((m) => m.id === monsterId)
        if (monster) {
          return { disturbed: true, reason: `${monster.name} appears!` }
        }
      }
    }

    // Check if damaged (HP decreased)
    if (state.player.hp < runState.previousHP) {
      return { disturbed: true, reason: 'You have been hit!' }
    }

    return { disturbed: false }
  }

  private checkNavigation(state: GameState, runState: RunState): DisturbanceResult {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return { disturbed: false }

    const { player } = state

    // Check for doors adjacent to player
    for (const door of currentLevel.doors) {
      const dx = Math.abs(door.position.x - player.position.x)
      const dy = Math.abs(door.position.y - player.position.y)
      if (dx <= 1 && dy <= 1 && (dx + dy) === 1) {
        // Door is orthogonally adjacent
        return { disturbed: true, reason: 'You reach a door.' }
      }
    }

    // Check for corridor branches (3+ walkable directions)
    const walkableDirections = this.countWalkableDirections(currentLevel, player.position)
    if (walkableDirections >= 3) {
      return { disturbed: true, reason: 'The corridor branches.' }
    }

    return { disturbed: false }
  }

  private countWalkableDirections(level: any, position: Position): number {
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 }, // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }, // right
    ]

    let count = 0
    for (const dir of directions) {
      const newX = position.x + dir.x
      const newY = position.y + dir.y

      if (
        newX >= 0 &&
        newX < level.width &&
        newY >= 0 &&
        newY < level.height &&
        level.tiles[newY][newX]?.walkable
      ) {
        count++
      }
    }

    return count
  }
}
```

**Step 4: Create barrel export**

Create `src/services/DisturbanceService/index.ts`:

```typescript
export { DisturbanceService } from './DisturbanceService'
export type { DisturbanceResult } from './DisturbanceService'
```

**Step 5: Run test to verify it passes**

```bash
npm test disturbance-checks.test.ts
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/services/DisturbanceService/
git commit -m "feat: add DisturbanceService with safety, combat, and navigation checks"
```

---

## Task 3: Create RunCommand

**Files:**
- Create: `src/commands/RunCommand/RunCommand.ts`
- Create: `src/commands/RunCommand/RunCommand.test.ts`
- Create: `src/commands/RunCommand/index.ts`
- Modify: `src/commands/MoveCommand/MoveCommand.ts` (import RunCommand for first step)

**Step 1: Write failing test for RunCommand**

Create `src/commands/RunCommand/RunCommand.test.ts`:

```typescript
import { RunCommand } from './RunCommand'
import { GameState, Direction } from '@game/core/core'
import { createMockGameState, createMockPlayer } from '@utils/testHelpers'

describe('RunCommand', () => {
  describe('execute', () => {
    it('sets runState and isRunning flag on player', () => {
      const player = createMockPlayer({
        position: { x: 5, y: 5 },
        hp: 20,
        runState: null,
        isRunning: false
      })
      const state: GameState = createMockGameState({ player })

      const command = new RunCommand('right')
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(true)
      expect(newState.player.runState).not.toBeNull()
      expect(newState.player.runState?.direction).toBe('right')
      expect(newState.player.runState?.startingPosition).toEqual({ x: 5, y: 5 })
      expect(newState.player.runState?.previousHP).toBe(20)
    })

    it('captures starting FOV monsters', () => {
      const player = createMockPlayer({ position: { x: 5, y: 5 }, hp: 20 })
      const level = createMockLevel()
      level.monsters = [
        createMockMonster({ id: 'orc-1', position: { x: 6, y: 5 } }),
        createMockMonster({ id: 'kobold-2', position: { x: 10, y: 10 } }) // Out of FOV
      ]

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5']) // Only orc visible

      const command = new RunCommand('right')
      const newState = command.execute(state)

      expect(newState.player.runState?.startingFOV.has('orc-1')).toBe(true)
      expect(newState.player.runState?.startingFOV.has('kobold-2')).toBe(false)
    })

    it('does not start run if player is confused', () => {
      const player = createMockPlayer({
        position: { x: 5, y: 5 },
        statusEffects: [{ type: 'CONFUSED', duration: 5 }]
      })
      const state: GameState = createMockGameState({ player })

      const command = new RunCommand('right')
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.includes('confused'))).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test RunCommand.test.ts
```

Expected: FAIL with "Cannot find module './RunCommand'"

**Step 3: Create RunCommand implementation**

Create `src/commands/RunCommand/RunCommand.ts`:

```typescript
import { GameState, Direction, RunState } from '@game/core/core'
import { MessageService } from '@services/MessageService'

export class RunCommand {
  private messageService: MessageService

  constructor(private direction: Direction) {
    this.messageService = new MessageService()
  }

  execute(state: GameState): GameState {
    // Check for blocking status effects
    const blockingEffects = state.player.statusEffects.filter(
      (effect) =>
        effect.type === 'CONFUSED' ||
        effect.type === 'BLIND' ||
        effect.type === 'PARALYZED' ||
        effect.type === 'HELD'
    )

    if (blockingEffects.length > 0) {
      const newState = this.messageService.addMessage(
        state,
        `You cannot run while ${blockingEffects[0].type.toLowerCase()}!`,
        'warning'
      )
      return newState
    }

    // Get current level
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Build starting FOV monster set
    const startingFOV = new Set<string>()
    for (const monster of currentLevel.monsters) {
      const key = `${monster.position.x},${monster.position.y}`
      if (state.visibleCells.has(key)) {
        startingFOV.add(monster.id)
      }
    }

    // Create run state
    const runState: RunState = {
      direction: this.direction,
      startingFOV,
      startingPosition: { ...state.player.position },
      previousHP: state.player.hp
    }

    // Set run state and flag on player
    const newPlayer = {
      ...state.player,
      isRunning: true,
      runState
    }

    return {
      ...state,
      player: newPlayer
    }
  }
}
```

**Step 4: Create barrel export**

Create `src/commands/RunCommand/index.ts`:

```typescript
export { RunCommand } from './RunCommand'
```

**Step 5: Run test to verify it passes**

```bash
npm test RunCommand.test.ts
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/commands/RunCommand/
git commit -m "feat: add RunCommand to initiate run state"
```

---

## Task 4: Modify MoveCommand for Run Continuation

**Files:**
- Modify: `src/commands/MoveCommand/MoveCommand.ts`
- Create: `src/commands/MoveCommand/run-continuation.test.ts`

**Step 1: Write failing test for run continuation**

Create `src/commands/MoveCommand/run-continuation.test.ts`:

```typescript
import { MoveCommand } from './MoveCommand'
import { GameState, RunState } from '@game/core/core'
import { createMockGameState, createMockPlayer, createMockLevel } from '@utils/testHelpers'

describe('MoveCommand - Run Continuation', () => {
  describe('when runState exists', () => {
    it('continues run if not disturbed', () => {
      const player = createMockPlayer({
        position: { x: 5, y: 5 },
        hp: 20,
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)

      const command = new MoveCommand('right')
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(true)
      expect(newState.player.runState).not.toBeNull()
    })

    it('stops run when disturbed by new monster', () => {
      const player = createMockPlayer({
        position: { x: 5, y: 5 },
        hp: 20,
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any
      level.monsters = [
        createMockMonster({ id: 'orc-1', position: { x: 6, y: 5 } })
      ]

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5']) // Monster visible

      const command = new MoveCommand('right')
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
      expect(newState.messages.some(m => m.text.includes('Orc appears'))).toBe(true)
    })

    it('stops run at corridor branch', () => {
      const player = createMockPlayer({
        position: { x: 5, y: 5 },
        isRunning: true,
        runState: {
          direction: 'right',
          startingFOV: new Set(),
          startingPosition: { x: 4, y: 5 },
          previousHP: 20
        }
      })
      const level = createMockLevel()

      // T-junction after movement
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right
      level.tiles[4][6] = { walkable: true, type: 'CORRIDOR' } as any // up from new pos
      level.tiles[6][6] = { walkable: true, type: 'CORRIDOR' } as any // down from new pos

      const state: GameState = createMockGameState({ player, currentLevel: 1 })
      state.levels.set(1, level)

      const command = new MoveCommand('right')
      const newState = command.execute(state)

      expect(newState.player.isRunning).toBe(false)
      expect(newState.player.runState).toBeNull()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test run-continuation.test.ts
```

Expected: FAIL - tests fail because MoveCommand doesn't check runState

**Step 3: Read existing MoveCommand to understand structure**

```bash
head -50 src/commands/MoveCommand/MoveCommand.ts
```

**Step 4: Modify MoveCommand.execute() to check disturbances**

Add to imports:
```typescript
import { DisturbanceService } from '@services/DisturbanceService'
```

Add after movement logic, before return statement:

```typescript
// If running, check for disturbances
if (newPlayer.runState) {
  const disturbanceService = new DisturbanceService()
  const disturbanceCheck = disturbanceService.checkDisturbance(
    { ...newState, player: newPlayer },
    newPlayer.runState
  )

  if (disturbanceCheck.disturbed) {
    // Stop running
    newPlayer = {
      ...newPlayer,
      isRunning: false,
      runState: null
    }

    // Add disturbance message
    newState = this.messageService.addMessage(
      newState,
      `You stop running. ${disturbanceCheck.reason}`,
      'info'
    )
  } else {
    // Update runState with current HP for next iteration
    newPlayer = {
      ...newPlayer,
      runState: {
        ...newPlayer.runState,
        previousHP: newPlayer.hp
      }
    }
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm test run-continuation.test.ts
```

Expected: All tests pass

**Step 6: Run all tests to ensure no regression**

```bash
npm test
```

Expected: All tests pass (except the pre-existing flaky performance test)

**Step 7: Commit**

```bash
git add src/commands/MoveCommand/
git commit -m "feat: add run continuation and disturbance checking to MoveCommand"
```

---

## Task 5: Add Input Handling for Shift+Arrow

**Files:**
- Modify: `src/ui/PlayingState.ts` (handleInput method)

**Step 1: Read existing input handling**

```bash
grep -A 20 "handleInput" src/ui/PlayingState.ts | head -30
```

Understand the current key mapping pattern.

**Step 2: Add Shift+Arrow detection to handleInput()**

Find the switch statement for arrow keys. Add run command logic:

```typescript
// Existing movement keys (around line 150-200)
case 'ArrowUp':
case 'ArrowDown':
case 'ArrowLeft':
case 'ArrowRight':
case 'h':
case 'j':
case 'k':
case 'l':
  const direction = this.getDirectionFromKey(input.key)

  // Check if Shift is held - initiate run
  if (input.shift) {
    const runCommand = new RunCommand(direction)
    const newState = runCommand.execute(this.gameState)
    this.gameState = newState

    // Execute first move
    const moveCommand = new MoveCommand(direction)
    this.gameState = moveCommand.execute(this.gameState)
  } else {
    // Normal move
    const moveCommand = new MoveCommand(direction)
    this.gameState = moveCommand.execute(this.gameState)
  }
  break
```

**Step 3: Add import for RunCommand**

At top of file:
```typescript
import { RunCommand } from '@commands/RunCommand'
```

**Step 4: Add getDirectionFromKey helper if not exists**

Check if `getDirectionFromKey` method exists. If not, add:

```typescript
private getDirectionFromKey(key: string): Direction {
  switch (key) {
    case 'ArrowUp':
    case 'k':
      return 'up'
    case 'ArrowDown':
    case 'j':
      return 'down'
    case 'ArrowLeft':
    case 'h':
      return 'left'
    case 'ArrowRight':
    case 'l':
      return 'right'
    // Diagonals
    case 'y':
      return 'up-left'
    case 'u':
      return 'up-right'
    case 'b':
      return 'down-left'
    case 'n':
      return 'down-right'
    default:
      return 'up' // fallback
  }
}
```

**Step 5: Test manually in dev server**

```bash
npm run dev
```

- Start game
- Press Shift+ArrowRight
- Verify player runs continuously right
- Verify run stops at walls/monsters/branches

**Step 6: Run type check**

```bash
npm run type-check
```

Expected: No errors

**Step 7: Commit**

```bash
git add src/ui/PlayingState.ts
git commit -m "feat: add Shift+Arrow input handling to initiate run command"
```

---

## Task 6: Integration Testing

**Files:**
- Create: `src/commands/RunCommand/integration.test.ts`

**Step 1: Write integration test for full run cycle**

Create `src/commands/RunCommand/integration.test.ts`:

```typescript
import { RunCommand } from './RunCommand'
import { MoveCommand } from '@commands/MoveCommand'
import { GameState } from '@game/core/core'
import { createMockGameState, createMockPlayer, createMockLevel, createMockMonster } from '@utils/testHelpers'

describe('RunCommand - Integration', () => {
  it('runs continuously until hitting monster', () => {
    // Setup: Player at (5,5), corridor to right, monster at (8,5)
    const player = createMockPlayer({ position: { x: 5, y: 5 }, hp: 20 })
    const level = createMockLevel()

    // Create corridor: (5,5) -> (6,5) -> (7,5) | monster at (8,5)
    level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any
    level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any
    level.tiles[5][7] = { walkable: true, type: 'CORRIDOR' } as any
    level.tiles[5][8] = { walkable: true, type: 'CORRIDOR' } as any

    level.monsters = [
      createMockMonster({ id: 'orc-1', position: { x: 8, y: 5 }, name: 'Orc' })
    ]

    let state: GameState = createMockGameState({ player, currentLevel: 1 })
    state.levels.set(1, level)
    state.visibleCells = new Set(['5,5', '6,5']) // Limited FOV

    // Step 1: Start run
    const runCommand = new RunCommand('right')
    state = runCommand.execute(state)

    expect(state.player.isRunning).toBe(true)

    // Step 2: Move right to (6,5) - continue
    state.visibleCells = new Set(['6,5', '7,5'])
    const move1 = new MoveCommand('right')
    state = move1.execute(state)

    expect(state.player.position).toEqual({ x: 6, y: 5 })
    expect(state.player.isRunning).toBe(true)

    // Step 3: Move right to (7,5) - monster appears, stop
    state.visibleCells = new Set(['7,5', '8,5']) // Monster now visible
    const move2 = new MoveCommand('right')
    state = move2.execute(state)

    expect(state.player.position).toEqual({ x: 7, y: 5 })
    expect(state.player.isRunning).toBe(false) // Stopped
    expect(state.player.runState).toBeNull()
    expect(state.messages.some(m => m.text.includes('Orc appears'))).toBe(true)
  })

  it('runs until corridor branches', () => {
    const player = createMockPlayer({ position: { x: 5, y: 5 } })
    const level = createMockLevel()

    // Straight corridor to T-junction
    level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any
    level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any
    level.tiles[5][7] = { walkable: true, type: 'CORRIDOR' } as any

    // T-junction at (7,5): up, down, right all walkable
    level.tiles[4][7] = { walkable: true, type: 'CORRIDOR' } as any // up
    level.tiles[6][7] = { walkable: true, type: 'CORRIDOR' } as any // down
    level.tiles[5][8] = { walkable: true, type: 'CORRIDOR' } as any // right

    let state: GameState = createMockGameState({ player, currentLevel: 1 })
    state.levels.set(1, level)

    // Start run
    const runCommand = new RunCommand('right')
    state = runCommand.execute(state)

    // Move to (6,5) - continue
    const move1 = new MoveCommand('right')
    state = move1.execute(state)
    expect(state.player.isRunning).toBe(true)

    // Move to (7,5) - T-junction, stop
    const move2 = new MoveCommand('right')
    state = move2.execute(state)
    expect(state.player.position).toEqual({ x: 7, y: 5 })
    expect(state.player.isRunning).toBe(false)
    expect(state.messages.some(m => m.text.includes('corridor branches'))).toBe(true)
  })
})
```

**Step 2: Run integration test**

```bash
npm test integration.test.ts
```

Expected: All tests pass

**Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass (3140+ tests)

**Step 4: Commit**

```bash
git add src/commands/RunCommand/integration.test.ts
git commit -m "test: add integration tests for run command cycle"
```

---

## Task 7: Update Documentation

**Files:**
- Modify: `docs/commands/README.md`
- Create: `docs/commands/RunCommand.md`

**Step 1: Create RunCommand documentation**

Create `docs/commands/RunCommand.md`:

```markdown
# RunCommand

Initiates continuous automatic movement in one direction until disturbed.

## Purpose

Allows fast travel through corridors using Shift+Arrow keys. Movement continues automatically until the player encounters danger, choices, or safety thresholds.

## Usage

**Input**: Shift + Arrow Key (or Shift + hjkl)

**Example**:
- Shift+ArrowRight → Run east until disturbed
- Shift+k → Run north until disturbed

## Implementation

### Initialization
1. Check for blocking status effects (confused, blind, paralyzed)
2. Capture starting FOV monsters (for change detection)
3. Create RunState with direction, starting position, starting FOV, HP
4. Set `player.isRunning = true` and `player.runState`

### Continuation (via MoveCommand)
Each move step:
1. Execute normal movement
2. If `runState` exists, call DisturbanceService
3. If disturbed: clear runState, set isRunning=false, show message
4. If not disturbed: continue running in same direction

## Disturbance Conditions

### Safety Critical (Priority 1)
- HP below 30% → "Your health is low!"
- Hunger below 300 → "You are very hungry!"
- Status effect (confused, blind, paralyzed, held)

### Combat Threats (Priority 2)
- New monster appears in FOV → "[Monster] appears!"
- Player takes damage → "You have been hit!"

### Navigation (Priority 3)
- Corridor branches (3+ walkable directions) → "The corridor branches."
- Door adjacent → "You reach a door."

## Dependencies

- **DisturbanceService**: Checks stopping conditions
- **MoveCommand**: Executes movement and checks disturbances
- **MessageService**: Adds stop/warning messages
- **FOVService**: Determines visible monsters (via GameState.visibleCells)

## Testing

See:
- `src/commands/RunCommand/RunCommand.test.ts` - Unit tests
- `src/commands/RunCommand/integration.test.ts` - Full run cycles
- `src/services/DisturbanceService/disturbance-checks.test.ts` - Stopping logic

## Architecture Notes

- **Stateless Commands**: RunCommand only initiates. MoveCommand handles continuation.
- **Priority System**: Safety > Combat > Navigation ensures player safety
- **Immutability**: RunState is recreated on each update (HP tracking)
- **Energy System**: Each run step consumes normal movement energy (fair turn processing)
```

**Step 2: Update commands README**

Add to `docs/commands/README.md` in the Movement section:

```markdown
### RunCommand
- **Purpose**: Automatic movement until disturbed
- **Input**: Shift + Arrow keys
- **Docs**: [RunCommand.md](./RunCommand.md)
```

**Step 3: Commit documentation**

```bash
git add docs/commands/
git commit -m "docs: add RunCommand documentation and update commands README"
```

---

## Task 8: Final Verification

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (3146+ tests, 1 flaky performance test acceptable)

**Step 2: Run type check**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 3: Test manually**

```bash
npm run dev
```

Manual test checklist:
- [ ] Shift+ArrowRight runs east
- [ ] Run stops when monster appears
- [ ] Run stops at corridor T-junction
- [ ] Run stops at door
- [ ] Run stops when HP low
- [ ] Run stops when hungry
- [ ] Cannot run while confused (drink confusion potion, try run)
- [ ] Shift+hjkl keys also work for run

**Step 4: Create summary commit if needed**

```bash
git log --oneline | head -10
```

Verify commits are descriptive and follow conventional commit format.

---

## Completion

✅ **Feature Complete**: Run command with Shift+Arrow
✅ **Testing**: Unit + Integration tests (100% coverage)
✅ **Documentation**: Commands docs updated
✅ **Architecture**: Follows SOLID, DRY, immutability principles

**Next Steps**: Merge to main or create PR for review.

See: `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/finishing-a-development-branch/SKILL.md` for merge/PR workflow.
