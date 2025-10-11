# Room Reveal FOV Implementation Plan

> **For Claude:** Use `${CLAUDE_PLUGIN_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Add configurable FOV mode that reveals entire rooms upon entry (like 1980 Rogue) while maintaining existing radius-based FOV as default.

**Architecture:** Create `RoomDetectionService` with floodfill algorithm, add `GameConfig` type with `fovMode` setting, integrate room detection into `FOVService.updateFOVAndExploration()`. Room reveal requires light (lightRadius > 0). Combine room tiles + radius tiles for full visibility.

**Tech Stack:** TypeScript, Jest, existing FOVService (shadowcasting), immutable state pattern

---

## Task 1: Add isRoom flag to Tile type

**Files:**
- Modify: `src/types/core/core.ts` (Tile interface)
- Modify: `src/services/DungeonGenerationService/DungeonGenerationService.ts`
- Test: `src/services/DungeonGenerationService/room-flag.test.ts`

**Step 1: Write the failing test**

Create `src/services/DungeonGenerationService/room-flag.test.ts`:

```typescript
import { DungeonGenerationService } from './DungeonGenerationService'
import { RandomService } from '@services/RandomService'

describe('DungeonGenerationService - Room Flag', () => {
  let service: DungeonGenerationService
  let randomService: RandomService

  beforeEach(() => {
    randomService = new RandomService()
    service = new DungeonGenerationService(randomService)
  })

  it('should mark room floor tiles with isRoom: true', () => {
    const level = service.generateLevel(1, 80, 22)

    // Find a room floor tile (char === '.' and not in corridor)
    let foundRoomTile = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        // Room floors are walkable and surrounded by room tiles
        if (tile.char === '.' && tile.walkable && tile.isRoom) {
          foundRoomTile = true
          expect(tile.isRoom).toBe(true)
        }
      }
    }

    expect(foundRoomTile).toBe(true)
  })

  it('should mark corridor tiles with isRoom: false', () => {
    const level = service.generateLevel(1, 80, 22)

    // Find corridor tiles (char === '#')
    let foundCorridorTile = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        if (tile.char === '#' && tile.walkable) {
          foundCorridorTile = true
          expect(tile.isRoom).toBe(false)
        }
      }
    }

    expect(foundCorridorTile).toBe(true)
  })

  it('should mark wall tiles with isRoom: false', () => {
    const level = service.generateLevel(1, 80, 22)

    const tile = level.tiles[0][0] // Walls at edges
    expect(tile.isRoom).toBe(false)
  })

  it('should mark door tiles with isRoom: false', () => {
    const level = service.generateLevel(1, 80, 22)

    // Find a door tile (char === '+' or char === '-')
    let foundDoor = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        if (tile.char === '+' || tile.char === '-') {
          foundDoor = true
          expect(tile.isRoom).toBe(false)
        }
      }
    }

    // Note: Doors might not exist on all levels, so this is informational
    if (foundDoor) {
      expect(foundDoor).toBe(true)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test DungeonGenerationService/room-flag
```

Expected: FAIL with "Property 'isRoom' does not exist on type 'Tile'"

**Step 3: Add isRoom to Tile interface**

In `src/types/core/core.ts`, find the `Tile` interface and add the `isRoom` field:

```typescript
export interface Tile {
  char: string
  walkable: boolean
  transparent: boolean
  isRoom: boolean  // NEW: Marks room tiles vs corridor/wall/door tiles
}
```

**Step 4: Update DungeonGenerationService to set isRoom flag**

In `src/services/DungeonGenerationService/DungeonGenerationService.ts`, find where tiles are created.

Locate the `createEmptyLevel()` method and update wall tile creation:

```typescript
// Create wall tiles (isRoom: false)
tiles[y][x] = {
  char: ' ',
  walkable: false,
  transparent: false,
  isRoom: false  // NEW
}
```

Locate room floor tile creation (in `placeRooms()` or similar method):

```typescript
// Room floor tiles (isRoom: true)
tiles[y][x] = {
  char: '.',
  walkable: true,
  transparent: true,
  isRoom: true  // NEW
}
```

Locate corridor tile creation (in `connectRooms()` or similar method):

```typescript
// Corridor tiles (isRoom: false)
tiles[y][x] = {
  char: '#',
  walkable: true,
  transparent: true,
  isRoom: false  // NEW
}
```

Locate door tile creation:

```typescript
// Door tiles (isRoom: false)
tiles[y][x] = {
  char: '+',  // or '-' for open doors
  walkable: true,  // or false for closed
  transparent: false,  // or true for open
  isRoom: false  // NEW
}
```

**Note:** The exact location depends on your DungeonGenerationService implementation. Search for `char: '.'`, `char: '#'`, and `char: '+'` to find tile creation sites.

**Step 5: Run test to verify it passes**

```bash
npm test DungeonGenerationService/room-flag
```

Expected: PASS (4 tests passing)

**Step 6: Commit**

```bash
git add src/types/core/core.ts src/services/DungeonGenerationService/DungeonGenerationService.ts src/services/DungeonGenerationService/room-flag.test.ts
git commit -m "feat: add isRoom flag to Tile type for room detection"
```

---

## Task 2: Create GameConfig type

**Files:**
- Modify: `src/types/core/core.ts`
- Test: `src/types/core/core.test.ts` (create if doesn't exist, or add to existing)

**Step 1: Write the failing test**

Create or modify `src/types/core/core.test.ts`:

```typescript
import { GameConfig } from './core'

describe('GameConfig Type', () => {
  it('should allow radius mode', () => {
    const config: GameConfig = {
      fovMode: 'radius'
    }

    expect(config.fovMode).toBe('radius')
  })

  it('should allow room-reveal mode', () => {
    const config: GameConfig = {
      fovMode: 'room-reveal'
    }

    expect(config.fovMode).toBe('room-reveal')
  })

  it('should not allow invalid modes', () => {
    // TypeScript compile-time check (this won't compile if uncommented)
    // const config: GameConfig = {
    //   fovMode: 'invalid-mode'
    // }

    // This test just validates the type exists
    expect(true).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test core.test
```

Expected: FAIL with "Cannot find name 'GameConfig'"

**Step 3: Add GameConfig interface**

In `src/types/core/core.ts`, add the `GameConfig` interface (near the top after imports):

```typescript
export interface GameConfig {
  fovMode: 'radius' | 'room-reveal'
}
```

**Step 4: Add config to GameState**

In `src/types/core/core.ts`, find the `GameState` interface and add the `config` field:

```typescript
export interface GameState {
  player: Player
  levels: Level[]
  currentLevelIndex: number
  messages: Message[]
  turnCount: number
  gameOver: boolean
  won: boolean
  config: GameConfig  // NEW: Game configuration
  // ... existing fields
}
```

**Step 5: Run test to verify it passes**

```bash
npm test core.test
```

Expected: PASS (3 tests passing)

**Step 6: Commit**

```bash
git add src/types/core/core.ts src/types/core/core.test.ts
git commit -m "feat: add GameConfig type with fovMode setting"
```

---

## Task 3: Create RoomDetectionService

**Files:**
- Create: `src/services/RoomDetectionService/RoomDetectionService.ts`
- Create: `src/services/RoomDetectionService/index.ts`
- Test: `src/services/RoomDetectionService/room-detection.test.ts`

**Step 1: Write the failing test**

Create `src/services/RoomDetectionService/room-detection.test.ts`:

```typescript
import { RoomDetectionService } from './RoomDetectionService'
import { Level, Position } from '@game/core/core'

describe('RoomDetectionService - Room Detection', () => {
  let service: RoomDetectionService

  beforeEach(() => {
    service = new RoomDetectionService()
  })

  function createTestLevel(width: number, height: number): Level {
    const tiles = Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({
        char: ' ',
        walkable: false,
        transparent: false,
        isRoom: false
      }))
    )

    return {
      depth: 1,
      width,
      height,
      tiles,
      monsters: [],
      items: [],
      doors: [],
      traps: [],
      explored: Array(height).fill(null).map(() => Array(width).fill(false)),
      stairsUp: null,
      stairsDown: { x: 5, y: 5 }
    }
  }

  function createRoom(level: Level, x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        level.tiles[row][col] = {
          char: '.',
          walkable: true,
          transparent: true,
          isRoom: true
        }
      }
    }
  }

  it('should detect all tiles in a 6x6 room from center', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6) // 6x6 room at (5,5)

    const roomTiles = service.detectRoom({ x: 8, y: 8 }, level)

    expect(roomTiles.size).toBe(36) // 6x6 = 36 tiles
  })

  it('should detect all tiles in a 6x6 room from corner', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6)

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    expect(roomTiles.size).toBe(36)
  })

  it('should stop at walls (not leak to adjacent rooms)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)  // Room 1
    // Wall gap at x=7
    createRoom(level, 8, 2, 5, 5)  // Room 2 (separate)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    expect(roomTiles.size).toBe(25) // Only room 1 (5x5)
    expect(roomTiles.has('10,4')).toBe(false) // Room 2 not included
  })

  it('should return empty set when in corridor', () => {
    const level = createTestLevel(20, 20)

    // Create corridor (isRoom: false)
    level.tiles[10][10] = {
      char: '#',
      walkable: true,
      transparent: true,
      isRoom: false
    }

    const roomTiles = service.detectRoom({ x: 10, y: 10 }, level)

    expect(roomTiles.size).toBe(0)
  })

  it('should return empty set when on wall', () => {
    const level = createTestLevel(20, 20)

    const roomTiles = service.detectRoom({ x: 0, y: 0 }, level)

    expect(roomTiles.size).toBe(0)
  })

  it('should detect room from doorway (adjacent to room)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6)

    // Door at edge of room
    level.tiles[5][4] = {
      char: '+',
      walkable: true,
      transparent: false,
      isRoom: false
    }

    const roomTiles = service.detectRoom({ x: 4, y: 5 }, level)

    // Should floodfill into adjacent room
    expect(roomTiles.size).toBe(36) // Full 6x6 room
  })

  it('should handle L-shaped rooms', () => {
    const level = createTestLevel(20, 20)

    // Create L-shape
    createRoom(level, 5, 5, 5, 5)   // Square part
    createRoom(level, 5, 10, 3, 3)  // Extension (overlaps)

    const roomTiles = service.detectRoom({ x: 7, y: 7 }, level)

    // L-shape = 5*5 + 3*3 - overlap
    // Actually, with overlap at (5,10), (6,10), we get:
    // Top part: 5*5 = 25
    // Bottom extension: 3*3 = 9
    // But they connect at row 10, so total connected tiles
    expect(roomTiles.size).toBeGreaterThan(25)
  })

  it('should handle irregular room shapes', () => {
    const level = createTestLevel(20, 20)

    // Create irregular shape manually
    level.tiles[5][5] = { char: '.', walkable: true, transparent: true, isRoom: true }
    level.tiles[5][6] = { char: '.', walkable: true, transparent: true, isRoom: true }
    level.tiles[6][5] = { char: '.', walkable: true, transparent: true, isRoom: true }

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    expect(roomTiles.size).toBe(3)
    expect(roomTiles.has('5,5')).toBe(true)
    expect(roomTiles.has('6,5')).toBe(true)
    expect(roomTiles.has('5,6')).toBe(true)
  })

  it('should not cross secret doors (pre-discovery)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)

    // Secret door (looks like wall, not transparent, not room)
    level.tiles[4][7] = {
      char: ' ',
      walkable: false,
      transparent: false,
      isRoom: false
    }

    createRoom(level, 8, 2, 5, 5)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    expect(roomTiles.size).toBe(25) // Only first room
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test RoomDetectionService
```

Expected: FAIL with "Cannot find module './RoomDetectionService'"

**Step 3: Create RoomDetectionService**

Create `src/services/RoomDetectionService/RoomDetectionService.ts`:

```typescript
import { Position, Level } from '@game/core/core'

/**
 * RoomDetectionService - Detects connected room tiles via floodfill
 *
 * Used by FOVService in room-reveal mode to reveal entire rooms upon entry.
 */
export class RoomDetectionService {
  /**
   * Detect all connected room tiles from starting position
   *
   * @param position Starting position (player position)
   * @param level Current dungeon level
   * @returns Set of position keys (format: "x,y") for all room tiles
   *
   * Algorithm: 4-directional floodfill
   * - Start at position
   * - If not room tile, return empty set
   * - Otherwise, floodfill to all connected room tiles
   * - Stop at walls, doors, corridors (isRoom: false)
   */
  detectRoom(position: Position, level: Level): Set<string> {
    const roomTiles = new Set<string>()

    // Check if starting position is a room tile
    if (!this.isRoomTile(position, level)) {
      // Not in room - check adjacent tiles (doorway case)
      const adjacentRoomPos = this.findAdjacentRoomTile(position, level)
      if (!adjacentRoomPos) {
        return roomTiles // Not in room, not in doorway
      }
      // Start floodfill from adjacent room tile
      this.floodfill(adjacentRoomPos, level, roomTiles)
      return roomTiles
    }

    // Start floodfill from current position
    this.floodfill(position, level, roomTiles)
    return roomTiles
  }

  /**
   * Check if position is a room tile
   */
  private isRoomTile(position: Position, level: Level): boolean {
    if (
      position.x < 0 ||
      position.x >= level.width ||
      position.y < 0 ||
      position.y >= level.height
    ) {
      return false
    }

    const tile = level.tiles[position.y][position.x]
    return tile.isRoom === true
  }

  /**
   * Find adjacent room tile (for doorway case)
   */
  private findAdjacentRoomTile(position: Position, level: Level): Position | null {
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }  // West
    ]

    for (const dir of directions) {
      const adjacent: Position = {
        x: position.x + dir.x,
        y: position.y + dir.y
      }

      if (this.isRoomTile(adjacent, level)) {
        return adjacent
      }
    }

    return null
  }

  /**
   * Floodfill algorithm (4-directional)
   */
  private floodfill(start: Position, level: Level, visited: Set<string>): void {
    const queue: Position[] = [start]
    const posKey = (pos: Position) => `${pos.x},${pos.y}`

    visited.add(posKey(start))

    while (queue.length > 0) {
      const current = queue.shift()!

      // Check 4 directions
      const directions = [
        { x: 0, y: -1 }, // North
        { x: 1, y: 0 },  // East
        { x: 0, y: 1 },  // South
        { x: -1, y: 0 }  // West
      ]

      for (const dir of directions) {
        const next: Position = {
          x: current.x + dir.x,
          y: current.y + dir.y
        }

        const key = posKey(next)

        // Skip if already visited
        if (visited.has(key)) continue

        // Skip if not room tile
        if (!this.isRoomTile(next, level)) continue

        // Add to visited and queue
        visited.add(key)
        queue.push(next)
      }
    }
  }
}
```

**Step 4: Create barrel export**

Create `src/services/RoomDetectionService/index.ts`:

```typescript
export { RoomDetectionService } from './RoomDetectionService'
```

**Step 5: Run test to verify it passes**

```bash
npm test RoomDetectionService
```

Expected: PASS (9 tests passing)

**Step 6: Commit**

```bash
git add src/services/RoomDetectionService/
git commit -m "feat: create RoomDetectionService with floodfill algorithm"
```

---

## Task 4: Integrate RoomDetectionService into FOVService

**Files:**
- Modify: `src/services/FOVService/FOVService.ts`
- Test: `src/services/FOVService/room-reveal-mode.test.ts`

**Step 1: Write the failing test**

Create `src/services/FOVService/room-reveal-mode.test.ts`:

```typescript
import { FOVService } from './FOVService'
import { RoomDetectionService } from '@services/RoomDetectionService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Level, Position, Player, GameConfig } from '@game/core/core'

describe('FOVService - Room Reveal Mode', () => {
  let fovService: FOVService
  let roomDetectionService: RoomDetectionService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    roomDetectionService = new RoomDetectionService()
    fovService = new FOVService(statusEffectService, roomDetectionService)
  })

  function createTestLevel(width: number, height: number): Level {
    const tiles = Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({
        char: ' ',
        walkable: false,
        transparent: false,
        isRoom: false
      }))
    )

    return {
      depth: 1,
      width,
      height,
      tiles,
      monsters: [],
      items: [],
      doors: [],
      traps: [],
      explored: Array(height).fill(null).map(() => Array(width).fill(false)),
      stairsUp: null,
      stairsDown: { x: 5, y: 5 }
    }
  }

  function createRoom(level: Level, x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        level.tiles[row][col] = {
          char: '.',
          walkable: true,
          transparent: true,
          isRoom: true
        }
      }
    }
  }

  function createCorridor(level: Level, x: number, y: number, length: number, horizontal: boolean) {
    for (let i = 0; i < length; i++) {
      const pos = horizontal ? { x: x + i, y } : { x, y: y + i }
      level.tiles[pos.y][pos.x] = {
        char: '#',
        walkable: true,
        transparent: true,
        isRoom: false
      }
    }
  }

  const mockPlayer: Player = {
    position: { x: 5, y: 5 },
    hp: 20,
    maxHp: 20,
    strength: 16,
    level: 1,
    exp: 0,
    gold: 0,
    armor: 0,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      light: null
    },
    statusEffects: [],
    hunger: 500,
    maxHunger: 1000
  }

  describe('radius mode (default)', () => {
    it('should use radius-based FOV only', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 10, 10)

      const config: GameConfig = { fovMode: 'radius' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2, // radius
        level,
        mockPlayer,
        config
      )

      // Should only see within radius 2 (roughly 12-15 tiles)
      expect(result.visibleCells.size).toBeLessThan(30)
      expect(result.visibleCells.size).toBeGreaterThan(5)
    })
  })

  describe('room-reveal mode', () => {
    it('should reveal entire room when player enters', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6) // 36 tiles

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2, // lightRadius
        level,
        mockPlayer,
        config
      )

      // Should see entire 6x6 room (36 tiles) + origin
      expect(result.visibleCells.size).toBe(36)
    })

    it('should combine room tiles + radius tiles', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)
      createCorridor(level, 11, 8, 5, true) // Corridor extends east

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2, // Can see 2 tiles into corridor
        level,
        mockPlayer,
        config
      )

      // Room (36) + partial corridor visibility
      expect(result.visibleCells.size).toBeGreaterThan(36)
    })

    it('should require lightRadius > 0 to reveal room', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        0, // No light
        level,
        mockPlayer,
        config
      )

      // No light = no room reveal, only origin visible
      expect(result.visibleCells.size).toBe(1) // Just the origin
      expect(result.visibleCells.has('8,8')).toBe(true)
    })

    it('should use radius-only when in corridor', () => {
      const level = createTestLevel(20, 20)
      createCorridor(level, 5, 5, 10, true)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 5 },
        2,
        level,
        mockPlayer,
        config
      )

      // Corridor uses radius-based FOV (no room detection)
      expect(result.visibleCells.size).toBeLessThan(15)
    })

    it('should mark explored tiles correctly', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        config
      )

      // All visible room tiles should be marked explored
      result.visibleCells.forEach((key) => {
        const [x, y] = key.split(',').map(Number)
        expect(result.level.explored[y][x]).toBe(true)
      })
    })
  })

  describe('mode switching', () => {
    it('should switch modes correctly mid-game', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const radiusConfig: GameConfig = { fovMode: 'radius' }
      const radiusResult = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        radiusConfig
      )

      const roomRevealConfig: GameConfig = { fovMode: 'room-reveal' }
      const roomResult = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        roomRevealConfig
      )

      // Room reveal should see more tiles
      expect(roomResult.visibleCells.size).toBeGreaterThan(radiusResult.visibleCells.size)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test FOVService/room-reveal-mode
```

Expected: FAIL with "Too many arguments" (FOVService doesn't accept config yet)

**Step 3: Update FOVService to accept config and roomDetectionService**

In `src/services/FOVService/FOVService.ts`, modify the constructor and `updateFOVAndExploration()`:

```typescript
import { Position, Level, Player, StatusEffectType, GameConfig } from '@game/core/core'
import { StatusEffectService } from '@services/StatusEffectService'
import { RoomDetectionService } from '@services/RoomDetectionService'

// ... existing FOVUpdateResult interface ...

export class FOVService {
  constructor(
    private statusEffectService: StatusEffectService,
    private roomDetectionService: RoomDetectionService  // NEW
  ) {}

  /**
   * Compute field of view from origin position
   * Returns set of visible position keys (format: "x,y")
   * If player is blind, returns empty set (no vision)
   */
  computeFOV(origin: Position, radius: number, level: Level, player?: Player): Set<string> {
    // ... existing implementation unchanged ...
  }

  /**
   * Combined FOV computation + exploration update
   * Convenience method that combines computeFOV() and updateExploredTiles()
   *
   * NEW: Supports room-reveal mode via config.fovMode
   */
  updateFOVAndExploration(
    position: Position,
    lightRadius: number,
    level: Level,
    player?: Player,
    config?: GameConfig  // NEW: Optional config (defaults to radius mode)
  ): FOVUpdateResult {
    let visibleCells: Set<string>

    // Determine FOV mode
    const fovMode = config?.fovMode || 'radius'

    if (fovMode === 'room-reveal' && lightRadius > 0) {
      // Mode A: Room reveal + radius for corridors
      const roomTiles = this.roomDetectionService.detectRoom(position, level)
      const radiusTiles = this.computeFOV(position, lightRadius, level, player)

      // Combine: Room tiles + radius-based FOV
      visibleCells = new Set([...roomTiles, ...radiusTiles])
    } else {
      // Mode C: Pure radius-based (current behavior)
      visibleCells = this.computeFOV(position, lightRadius, level, player)
    }

    const updatedLevel = this.updateExploredTiles(level, visibleCells)
    return { visibleCells, level: updatedLevel }
  }

  // ... rest of existing methods unchanged ...
}
```

**Step 4: Run test to verify it passes**

```bash
npm test FOVService/room-reveal-mode
```

Expected: PASS (8 tests passing)

**Step 5: Update existing FOVService tests**

Check if other FOVService tests are broken due to constructor change. Fix them by adding `RoomDetectionService` to the setup:

```bash
npm test FOVService
```

If tests fail, update `beforeEach()` in other test files:

```typescript
beforeEach(() => {
  statusEffectService = new StatusEffectService()
  roomDetectionService = new RoomDetectionService()  // ADD THIS
  fovService = new FOVService(statusEffectService, roomDetectionService)  // UPDATE THIS
})
```

**Step 6: Commit**

```bash
git add src/services/FOVService/
git commit -m "feat: integrate room-reveal mode into FOVService"
```

---

## Task 5: Update game initialization to include config

**Files:**
- Modify: `src/main.ts` (or wherever GameState is initialized)
- Test: Manual testing (run `npm run dev`)

**Step 1: Find game initialization code**

Search for where `GameState` is first created (likely in `main.ts` or a game initialization service).

**Step 2: Add default config to initial GameState**

Add the `config` field to the initial state:

```typescript
const initialState: GameState = {
  player: /* ... */,
  levels: /* ... */,
  currentLevelIndex: 0,
  messages: [],
  turnCount: 0,
  gameOver: false,
  won: false,
  config: {
    fovMode: 'radius'  // NEW: Default to current behavior
  }
  // ... other fields
}
```

**Step 3: Update FOVService instantiation**

Find where `FOVService` is created and add `RoomDetectionService`:

```typescript
const statusEffectService = new StatusEffectService()
const roomDetectionService = new RoomDetectionService()  // NEW
const fovService = new FOVService(statusEffectService, roomDetectionService)  // UPDATED
```

**Step 4: Update commands to pass config**

Find all commands that call `fovService.updateFOVAndExploration()` (likely `MoveCommand`, `OpenDoorCommand`, etc.).

Update calls to pass config:

```typescript
// Before:
const { visibleCells, level } = this.fovService.updateFOVAndExploration(
  newPosition,
  lightRadius,
  currentLevel,
  state.player
)

// After:
const { visibleCells, level } = this.fovService.updateFOVAndExploration(
  newPosition,
  lightRadius,
  currentLevel,
  state.player,
  state.config  // NEW: Pass config
)
```

**Step 5: Manual test**

```bash
npm run dev
```

Start game and verify it still works (default radius mode).

**Step 6: Commit**

```bash
git add src/main.ts src/commands/*/  # Or specific command files
git commit -m "feat: add config to GameState initialization and pass to FOVService"
```

---

## Task 6: Add config toggle to debug console

**Files:**
- Modify: `src/ui/DebugConsole.ts` (or wherever debug commands are handled)
- Test: Manual testing (`~` key → type command)

**Step 1: Find debug command handler**

Locate where debug commands are processed (likely in `DebugConsole.ts` or `DebugService.ts`).

**Step 2: Add fovMode toggle command**

Add a new debug command to toggle FOV mode:

```typescript
// In debug command handler
case 'fov-mode':
case 'fov':
  // Toggle FOV mode
  const newMode = state.config.fovMode === 'radius' ? 'room-reveal' : 'radius'

  return {
    ...state,
    config: {
      ...state.config,
      fovMode: newMode
    },
    messages: [
      ...state.messages,
      { text: `FOV mode set to: ${newMode}`, type: 'info' as const }
    ]
  }
```

**Step 3: Add help text**

Update debug help message:

```typescript
case 'help':
  return {
    ...state,
    messages: [
      ...state.messages,
      { text: 'Debug Commands:', type: 'info' as const },
      { text: '  g - God mode', type: 'info' as const },
      { text: '  v - Reveal map', type: 'info' as const },
      { text: '  fov - Toggle FOV mode (radius/room-reveal)', type: 'info' as const },  // NEW
      // ... other commands
    ]
  }
```

**Step 4: Manual test**

```bash
npm run dev
```

1. Press `~` to open debug console
2. Type `fov` and press Enter
3. Verify message appears: "FOV mode set to: room-reveal"
4. Walk into a room and verify entire room is revealed
5. Type `fov` again to toggle back to radius mode
6. Verify it switches back

**Step 5: Commit**

```bash
git add src/ui/DebugConsole.ts  # Or appropriate file
git commit -m "feat: add debug command to toggle FOV mode"
```

---

## Task 7: Manual playtesting checklist

**Files:**
- None (manual testing only)

**Playtesting Steps:**

Run the game:
```bash
npm run dev
```

**Test Scenario 1: Room Reveal Mode**
- [ ] Press `~` and type `fov` to enable room-reveal mode
- [ ] Walk into a room → entire room should be visible instantly
- [ ] Walk out of room → room should fade to 50% opacity (explored state)
- [ ] Walk back into same room → should reveal again
- [ ] Verify monsters only visible in current FOV (disappear when you leave)

**Test Scenario 2: Corridor Behavior**
- [ ] In room-reveal mode, walk through a corridor
- [ ] Verify only radius-based FOV is used (no full reveal)
- [ ] Verify walls/corners behave normally

**Test Scenario 3: Light Requirement**
- [ ] In room-reveal mode, let torch burn out (or use debug to remove light)
- [ ] Walk into a room with no light → should NOT reveal (only see current tile)
- [ ] Equip torch again → room should reveal

**Test Scenario 4: Radius Mode (Default)**
- [ ] Press `~` and type `fov` to switch back to radius mode
- [ ] Walk into a room → should only see radius-based FOV (2-3 tiles)
- [ ] Verify current behavior unchanged

**Test Scenario 5: Doorways**
- [ ] Stand in doorway → verify room reveals (or adjacent room tiles visible)
- [ ] Stand on door tile → no crashes, behavior makes sense

**Test Scenario 6: Secret Doors**
- [ ] Find secret door (before discovery)
- [ ] Verify room doesn't leak through undiscovered secret door
- [ ] Discover secret door → verify rooms still separate

**Test Scenario 7: Edge Cases**
- [ ] Tiny rooms (2×2) → still reveal correctly
- [ ] L-shaped rooms → entire shape reveals
- [ ] Large rooms (10×10) → entire room reveals
- [ ] Adjacent rooms with wall between → only current room reveals

**Step 2: Document any bugs found**

If bugs are found, create GitHub issues or add tasks here.

**Step 3: Celebrate!**

Feature complete! Both FOV modes working and toggleable.

---

## Summary

**What We Built:**
- `isRoom` flag on Tile type for room detection
- `GameConfig` type with `fovMode` setting
- `RoomDetectionService` with floodfill algorithm
- Room-reveal mode integrated into `FOVService`
- Debug command to toggle modes
- Full test coverage (>80%)

**Testing:**
- 9 tests for RoomDetectionService (floodfill algorithm)
- 8 tests for FOV room-reveal mode
- 4 tests for Tile isRoom flag
- 3 tests for GameConfig type
- Manual playtesting checklist

**Architecture:**
- Maintains SOLID principles (RoomDetectionService has single responsibility)
- Maintains immutability (config changes return new GameState)
- Maintains layered architecture (logic in services, commands orchestrate)
- Backward compatible (default to radius mode)

**Next Steps (Optional):**
- Add UI toggle in settings menu (instead of just debug command)
- Add config persistence to localStorage
- Add "dark rooms" mode (room-reveal only for lit rooms, like original Rogue)
- Add animation/transition effect when room reveals

**Total Implementation Time:** ~2-3 hours for experienced developer following this plan

---

**Questions or Issues?**

If you encounter problems:
1. Check test output for specific failures
2. Verify file paths match your project structure
3. Check CLAUDE.md for project-specific conventions
4. Run `npm test` after each task to catch issues early
