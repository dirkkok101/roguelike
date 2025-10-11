# 26 Levels Authentic Rogue Implementation Plan

> **For Claude:** Use `${CLAUDE_PLUGIN_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Extend game from 10 to 26 dungeon levels with authentic 1980 Rogue vorpal monster spawning, Amulet of Yendor quest on level 26, and return journey with monster respawning.

**Architecture:** Hybrid Angband/Rogue approach - Keep Angband light system (torches/lanterns/fuel) and modified hunger, but implement Rogue's 26-level structure, vorpal spawning ([depth-6, depth+3] range), and return journey mechanics with level persistence and monster respawn on first ascent visit.

**Tech Stack:** TypeScript, Jest, Immutable state patterns, Service-oriented architecture

---

## Phase 1: Core State & Data (Foundation) ✅

### Task 1.1: Add GameState Fields for 26 Levels ✅

**Files:**
- Modify: `src/types/core/core.ts` (GameState interface)

**Step 1: Add new fields to GameState type**

Locate the `GameState` interface and add:

```typescript
export interface GameState {
  // ... existing fields ...

  // NEW FIELDS for 26-level journey
  hasAmulet: boolean                    // Player picked up Amulet of Yendor?
  levelsVisitedWithAmulet: Set<number>  // Tracks which levels had monsters respawn
  maxDepth: number                      // Maximum depth (26)
}
```

**Step 2: Update game initialization**

Locate where GameState is created (likely in `src/services/GameService` or similar) and initialize:

```typescript
const initialState: GameState = {
  // ... existing initialization ...
  hasAmulet: false,
  levelsVisitedWithAmulet: new Set<number>(),
  maxDepth: 26  // Changed from 10
}
```

**Step 3: Run type check**

```bash
npm run type-check
```

Expected: No type errors

**Step 4: Commit**

```bash
git add src/types/core/core.ts src/services/GameService/*
git commit -m "feat: add GameState fields for 26-level journey (hasAmulet, levelsVisitedWithAmulet, maxDepth)"
```

---

### Task 1.2: Add Vorpalness Field to MonsterTemplate ✅

**Files:**
- Modify: `src/types/core/core.ts` (MonsterTemplate interface)
- Modify: `public/data/monsters.json`

**Step 1: Add vorpalness to MonsterTemplate type**

```typescript
export interface MonsterTemplate {
  letter: string
  name: string
  spriteName: string
  hp: string
  ac: number
  damage: string
  xpValue: number
  level: number
  speed: number
  rarity: 'common' | 'uncommon' | 'rare'
  mean: boolean
  aiProfile: AIProfile
  vorpalness: number  // NEW: 0-25 scale for spawn depth control
}
```

**Step 2: Add vorpalness values to monsters.json**

Update all 26 monsters with vorpalness values (from design Section 4):

```json
[
  {
    "letter": "B",
    "name": "Bat",
    "level": 1,
    "vorpalness": 1,
    ...
  },
  {
    "letter": "S",
    "name": "Snake",
    "level": 1,
    "vorpalness": 1,
    ...
  },
  {
    "letter": "E",
    "name": "Emu",
    "level": 1,
    "vorpalness": 2,
    ...
  },
  {
    "letter": "H",
    "name": "Hobgoblin",
    "level": 1,
    "vorpalness": 3,
    ...
  },
  {
    "letter": "K",
    "name": "Kestrel",
    "level": 2,
    "vorpalness": 5,
    ...
  },
  {
    "letter": "Z",
    "name": "Zombie",
    "level": 2,
    "vorpalness": 6,
    ...
  },
  {
    "letter": "O",
    "name": "Orc",
    "level": 2,
    "vorpalness": 7,
    ...
  },
  {
    "letter": "Q",
    "name": "Quagga",
    "level": 3,
    "vorpalness": 9,
    ...
  },
  {
    "letter": "R",
    "name": "Rattlesnake",
    "level": 3,
    "vorpalness": 10,
    ...
  },
  {
    "letter": "C",
    "name": "Centaur",
    "level": 4,
    "vorpalness": 12,
    ...
  },
  {
    "letter": "Y",
    "name": "Yeti",
    "level": 4,
    "vorpalness": 13,
    ...
  },
  {
    "letter": "A",
    "name": "Aquator",
    "level": 5,
    "vorpalness": 14,
    ...
  },
  {
    "letter": "L",
    "name": "Leprechaun",
    "level": 4,
    "vorpalness": 14,
    ...
  },
  {
    "letter": "F",
    "name": "Venus Flytrap",
    "level": 6,
    "vorpalness": 17,
    ...
  },
  {
    "letter": "T",
    "name": "Troll",
    "level": 6,
    "vorpalness": 18,
    ...
  },
  {
    "letter": "N",
    "name": "Nymph",
    "level": 6,
    "vorpalness": 18,
    ...
  },
  {
    "letter": "X",
    "name": "Xeroc",
    "level": 7,
    "vorpalness": 19,
    ...
  },
  {
    "letter": "W",
    "name": "Wraith",
    "level": 7,
    "vorpalness": 20,
    ...
  },
  {
    "letter": "M",
    "name": "Medusa",
    "level": 8,
    "vorpalness": 21,
    ...
  },
  {
    "letter": "P",
    "name": "Phantom",
    "level": 8,
    "vorpalness": 21,
    ...
  },
  {
    "letter": "V",
    "name": "Vampire",
    "level": 8,
    "vorpalness": 22,
    ...
  },
  {
    "letter": "I",
    "name": "Ice Monster",
    "level": 5,
    "vorpalness": 22,
    ...
  },
  {
    "letter": "U",
    "name": "Ur-vile",
    "level": 9,
    "vorpalness": 23,
    ...
  },
  {
    "letter": "D",
    "name": "Dragon",
    "level": 10,
    "vorpalness": 24,
    ...
  },
  {
    "letter": "G",
    "name": "Griffin",
    "level": 10,
    "vorpalness": 24,
    ...
  },
  {
    "letter": "J",
    "name": "Jabberwock",
    "level": 10,
    "vorpalness": 25,
    ...
  }
]
```

**Step 3: Run validation script**

```bash
npm run validate:data
```

Expected: All 26 monsters validated successfully, vorpalness field present

**Step 4: Run type check**

```bash
npm run type-check
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/types/core/core.ts public/data/monsters.json
git commit -m "feat: add vorpalness field (0-25) to all 26 monsters for authentic Rogue spawn ranges"
```

---

### Task 1.3: Add Amulet Item Type ✅

**Files:**
- Modify: `src/types/core/core.ts` (ItemType enum, new Amulet interface)

**Step 1: Add AMULET to ItemType enum**

```typescript
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  POTION = 'POTION',
  SCROLL = 'SCROLL',
  RING = 'RING',
  WAND = 'WAND',
  FOOD = 'FOOD',
  TORCH = 'TORCH',
  LANTERN = 'LANTERN',
  OIL_FLASK = 'OIL_FLASK',
  ARTIFACT = 'ARTIFACT',
  GOLD = 'GOLD',
  AMULET = 'AMULET'  // NEW: Amulet of Yendor (quest item)
}
```

**Step 2: Add Amulet interface**

```typescript
export interface Amulet {
  id: string
  name: string
  type: ItemType.AMULET
  spriteName: string
  identified: boolean
  cursed: boolean
}
```

**Step 3: Add Amulet to Item union type**

```typescript
export type Item =
  | Weapon
  | Armor
  | Potion
  | Scroll
  | Ring
  | Wand
  | Food
  | Torch
  | Lantern
  | OilFlask
  | Artifact
  | Gold
  | Amulet  // NEW
```

**Step 4: Run type check**

```bash
npm run type-check
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/types/core/core.ts
git commit -m "feat: add Amulet item type for Amulet of Yendor quest item"
```

---

## Phase 2: Level Generation (26 Levels) ✅

### Task 2.1: Update Level Generation to Support 26 Levels ✅

**Files:**
- Modify: `src/services/LevelGenerationService/LevelGenerationService.ts`
- Modify: Tests as needed

**Step 1: Write test for generating 26 levels**

Create: `src/services/LevelGenerationService/generate-all-levels.test.ts`

```typescript
import { LevelGenerationService } from './LevelGenerationService'
import { RandomService } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'

describe('LevelGenerationService - Generate All Levels', () => {
  let service: LevelGenerationService
  let randomService: RandomService
  let monsterSpawnService: MonsterSpawnService

  beforeEach(() => {
    randomService = new RandomService()
    monsterSpawnService = new MonsterSpawnService(randomService)
    service = new LevelGenerationService(randomService, monsterSpawnService)
  })

  it('should generate exactly 26 levels', () => {
    const levels = service.generateAllLevels()

    expect(levels).toHaveLength(26)
  })

  it('should generate levels with increasing depth numbers', () => {
    const levels = service.generateAllLevels()

    levels.forEach((level, index) => {
      expect(level.depth).toBe(index + 1)
    })
  })

  it('should generate connected levels with stairs', () => {
    const levels = service.generateAllLevels()

    // All levels except level 1 should have up stairs
    levels.slice(1).forEach(level => {
      const hasUpStairs = level.tiles.some(row =>
        row.some(tile => tile.type === TileType.STAIRS_UP)
      )
      expect(hasUpStairs).toBe(true)
    })

    // All levels except level 26 should have down stairs
    levels.slice(0, 25).forEach(level => {
      const hasDownStairs = level.tiles.some(row =>
        row.some(tile => tile.type === TileType.STAIRS_DOWN)
      )
      expect(hasDownStairs).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- generate-all-levels.test.ts
```

Expected: FAIL with "generateAllLevels is not a function"

**Step 3: Implement generateAllLevels method**

In `LevelGenerationService.ts`, add:

```typescript
/**
 * Generate all 26 dungeon levels at once
 *
 * Called at game initialization to create the full dungeon.
 * Levels are persistent and stored in GameState.levels array.
 *
 * @returns Array of 26 Level instances (depths 1-26)
 */
generateAllLevels(): Level[] {
  const levels: Level[] = []

  for (let depth = 1; depth <= 26; depth++) {
    const level = this.generateLevel(depth)
    levels.push(level)
  }

  return levels
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- generate-all-levels.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/services/LevelGenerationService/*
git commit -m "feat: add generateAllLevels() to create all 26 levels at game start"
```

---

### Task 2.2: Update Game Initialization to Generate 26 Levels ✅

**Files:**
- Modify: `src/services/GameService/GameService.ts` (or wherever new game is initialized)

**Step 1: Update newGame() to generate 26 levels**

Find the game initialization code and change from:

```typescript
// OLD - Generate single level
const initialLevel = this.levelGenerationService.generateLevel(1)

const gameState: GameState = {
  currentLevel: initialLevel,
  currentDepth: 1,
  // ...
}
```

To:

```typescript
// NEW - Generate all 26 levels
const allLevels = this.levelGenerationService.generateAllLevels()

const gameState: GameState = {
  currentLevel: allLevels[0],  // Start at level 1 (index 0)
  levels: allLevels,           // Store all 26 levels
  currentDepth: 1,
  maxDepth: 26,
  hasAmulet: false,
  levelsVisitedWithAmulet: new Set<number>(),
  // ...
}
```

**Step 2: Run type check**

```bash
npm run type-check
```

Expected: No type errors

**Step 3: Test game initialization manually**

```bash
npm run dev
```

Start a new game, verify:
- Game starts without errors
- Can move around on level 1
- Monsters spawn on level 1

**Step 4: Commit**

```bash
git add src/services/GameService/*
git commit -m "feat: initialize game with all 26 levels generated upfront"
```

---

## Phase 3: Vorpal Spawning System

### Task 3.1: Implement Vorpal Range Filtering ✅

**Files:**
- Modify: `src/services/MonsterSpawnService/MonsterSpawnService.ts`
- Create: `src/services/MonsterSpawnService/vorpal-filtering.test.ts`

**Step 1: Write test for vorpal range filtering**

```typescript
import { MonsterSpawnService } from './MonsterSpawnService'
import { MockRandom } from '@services/RandomService/MockRandom'

describe('MonsterSpawnService - Vorpal Filtering', () => {
  let service: MonsterSpawnService
  let mockRandom: MockRandom

  beforeEach(async () => {
    mockRandom = new MockRandom()
    service = new MonsterSpawnService(mockRandom)
    await service.loadMonsterData()
  })

  describe('filterByVorpalRange', () => {
    it('should return only monsters within vorpal range for depth 1', () => {
      // Depth 1: vorpal range [0, 4]
      const filtered = service.filterByVorpalRange(0, 4)

      // Should include: Bat(1), Snake(1), Emu(2), Hobgoblin(3)
      expect(filtered).toHaveLength(4)
      expect(filtered.map(m => m.letter)).toContain('B')
      expect(filtered.map(m => m.letter)).toContain('S')
      expect(filtered.map(m => m.letter)).toContain('E')
      expect(filtered.map(m => m.letter)).toContain('H')
    })

    it('should return only monsters within vorpal range for depth 10', () => {
      // Depth 10: vorpal range [4, 13]
      const filtered = service.filterByVorpalRange(4, 13)

      // Should include: Kestrel(5) through Yeti(13)
      // Should NOT include: Bat/Snake/Emu/Hobgoblin (too low)
      // Should NOT include: Aquator+ (too high)
      expect(filtered.length).toBeGreaterThan(4)
      expect(filtered.map(m => m.letter)).not.toContain('B') // Bat too low
      expect(filtered.map(m => m.letter)).not.toContain('A') // Aquator too high
    })

    it('should return only boss monsters for depth 26', () => {
      // Depth 26: vorpal range [20, 25]
      const filtered = service.filterByVorpalRange(20, 25)

      // Should include: Wraith(20) through Jabberwock(25)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.map(m => m.letter)).toContain('D') // Dragon
      expect(filtered.map(m => m.letter)).toContain('G') // Griffin
      expect(filtered.map(m => m.letter)).toContain('J') // Jabberwock
    })

    it('should return empty array if no monsters in range', () => {
      // Impossible range
      const filtered = service.filterByVorpalRange(30, 35)

      expect(filtered).toHaveLength(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- vorpal-filtering.test.ts
```

Expected: FAIL with "filterByVorpalRange is not a function"

**Step 3: Implement filterByVorpalRange method**

In `MonsterSpawnService.ts`:

```typescript
/**
 * Filter monsters by vorpal range
 *
 * Vorpal range determines which monsters can spawn at a given depth.
 * Range formula: [depth - 6, depth + 3] clamped to [0, 25]
 *
 * @param minVorpal - Minimum vorpalness value (inclusive)
 * @param maxVorpal - Maximum vorpalness value (inclusive)
 * @returns Filtered array of MonsterTemplates within range
 */
filterByVorpalRange(minVorpal: number, maxVorpal: number): MonsterTemplate[] {
  if (!this.dataLoaded) {
    throw new Error('Monster data not loaded. Call loadMonsterData() first.')
  }

  return this.monsterTemplates.filter(template => {
    return template.vorpalness >= minVorpal && template.vorpalness <= maxVorpal
  })
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- vorpal-filtering.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/services/MonsterSpawnService/*
git commit -m "feat: add filterByVorpalRange() for authentic Rogue monster spawning"
```

---

### Task 3.2: Replace Level-Based Filtering with Vorpal Filtering ✅

**Files:**
- Modify: `src/services/MonsterSpawnService/MonsterSpawnService.ts`

**Step 1: Update spawnMonsters() to use vorpal filtering**

Replace the existing `filterMonstersByDepth()` call with vorpal filtering:

```typescript
/**
 * Spawn monsters for a dungeon level
 *
 * Uses vorpal range formula [depth-6, depth+3] for authentic Rogue spawning.
 */
spawnMonsters(rooms: Room[], tiles: Tile[][], depth: number): Monster[] {
  if (!this.dataLoaded) {
    throw new Error('Monster data not loaded. Call loadMonsterData() first.')
  }

  const monsters: Monster[] = []
  const occupied = new Set<string>()

  // Calculate spawn count
  const spawnCount = this.getSpawnCount(depth)

  // Calculate vorpal range: [depth-6, depth+3] clamped to [0, 25]
  const minVorpal = Math.max(0, depth - 6)
  const maxVorpal = Math.min(25, depth + 3)

  // Filter monsters by vorpal range (replaces old level-based filtering)
  const availableTemplates = this.filterByVorpalRange(minVorpal, maxVorpal)

  if (availableTemplates.length === 0) {
    // No monsters available (shouldn't happen with proper vorpal values)
    return monsters
  }

  // Spawn monsters (rest of logic unchanged)
  for (let i = 0; i < spawnCount; i++) {
    const template = this.selectWeightedMonster(availableTemplates)
    const position = this.selectSpawnPosition(rooms, tiles, occupied)

    if (!position) {
      continue
    }

    occupied.add(`${position.x},${position.y}`)

    const monster = this.createMonster(
      template,
      position,
      `monster-${depth}-${i}-${this.random.nextInt(1000, 9999)}`
    )

    monsters.push(monster)
  }

  return monsters
}
```

**Step 2: Update selectMonsterForDepth() (used by wandering monsters)**

```typescript
/**
 * Select monster template for a given depth
 *
 * Uses vorpal range to match level generation spawning.
 */
selectMonsterForDepth(depth: number): MonsterTemplate {
  if (!this.dataLoaded) {
    throw new Error('Monster data not loaded. Call loadMonsterData() first.')
  }

  // Calculate vorpal range
  const minVorpal = Math.max(0, depth - 6)
  const maxVorpal = Math.min(25, depth + 3)

  // Filter monsters by vorpal range
  const availableTemplates = this.filterByVorpalRange(minVorpal, maxVorpal)

  if (availableTemplates.length === 0) {
    throw new Error(`No monsters available for depth ${depth}`)
  }

  // Select monster template with weighted randomness
  return this.selectWeightedMonster(availableTemplates)
}
```

**Step 3: Remove old filterMonstersByDepth() method**

Delete the old `filterMonstersByDepth()` private method (no longer needed).

**Step 4: Run all monster spawn tests**

```bash
npm test -- MonsterSpawnService
```

Expected: All existing tests pass (may need to update some test expectations for vorpal ranges)

**Step 5: Commit**

```bash
git add src/services/MonsterSpawnService/*
git commit -m "feat: replace level-based filtering with vorpal range [depth-6, depth+3]"
```

---

## Phase 4: Stairs & Navigation

### Task 4.1: Create StairsNavigationService ✅

**Files:**
- Create: `src/services/StairsNavigationService/StairsNavigationService.ts`
- Create: `src/services/StairsNavigationService/index.ts`
- Create: `src/services/StairsNavigationService/stairs-navigation.test.ts`

**Step 1: Write tests for StairsNavigationService**

```typescript
import { StairsNavigationService } from './StairsNavigationService'
import { GameState, Level } from '@game/core/core'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { MockRandom } from '@services/RandomService/MockRandom'

describe('StairsNavigationService', () => {
  let service: StairsNavigationService
  let monsterSpawnService: MonsterSpawnService
  let mockState: GameState

  beforeEach(() => {
    const mockRandom = new MockRandom()
    monsterSpawnService = new MonsterSpawnService(mockRandom)
    service = new StairsNavigationService(monsterSpawnService)

    // Mock state with 26 levels
    const mockLevels: Level[] = Array.from({ length: 26 }, (_, i) => ({
      depth: i + 1,
      // ... other level properties
    } as Level))

    mockState = {
      currentDepth: 1,
      currentLevel: mockLevels[0],
      levels: mockLevels,
      maxDepth: 26,
      hasAmulet: false,
      levelsVisitedWithAmulet: new Set<number>(),
      // ... other state properties
    } as GameState
  })

  describe('canDescend', () => {
    it('should return true if not at max depth', () => {
      expect(service.canDescend(mockState)).toBe(true)
    })

    it('should return false if at max depth (26)', () => {
      mockState.currentDepth = 26
      expect(service.canDescend(mockState)).toBe(false)
    })
  })

  describe('canAscend', () => {
    it('should return true if not at surface', () => {
      mockState.currentDepth = 10
      expect(service.canAscend(mockState)).toBe(true)
    })

    it('should return false if at surface (depth 1)', () => {
      mockState.currentDepth = 1
      expect(service.canAscend(mockState)).toBe(false)
    })
  })

  describe('descend', () => {
    it('should move player down one level', () => {
      const result = service.descend(mockState)

      expect(result.currentDepth).toBe(2)
      expect(result.currentLevel).toBe(result.levels[1])
    })

    it('should save current level to levels array', () => {
      const modifiedLevel = { ...mockState.currentLevel, someChange: true }
      mockState.currentLevel = modifiedLevel as any

      const result = service.descend(mockState)

      expect(result.levels[0]).toBe(modifiedLevel)
    })

    it('should throw error if already at max depth', () => {
      mockState.currentDepth = 26

      expect(() => service.descend(mockState)).toThrow('Cannot descend')
    })
  })

  describe('ascend', () => {
    it('should move player up one level', () => {
      mockState.currentDepth = 10

      const result = service.ascend(mockState)

      expect(result.currentDepth).toBe(9)
      expect(result.currentLevel).toBe(result.levels[8])
    })

    it('should throw error if already at surface', () => {
      mockState.currentDepth = 1

      expect(() => service.ascend(mockState)).toThrow('Cannot ascend')
    })
  })

  describe('monster respawn on ascent with Amulet', () => {
    beforeEach(() => {
      mockState.hasAmulet = true
      mockState.currentDepth = 10
    })

    it('should respawn monsters on first visit with Amulet', () => {
      const result = service.ascend(mockState)

      // Ascending to depth 9
      expect(result.currentDepth).toBe(9)
      expect(result.levelsVisitedWithAmulet.has(9)).toBe(true)
      expect(result.currentLevel.monsters.length).toBeGreaterThan(0)
    })

    it('should NOT respawn if already visited with Amulet', () => {
      mockState.levelsVisitedWithAmulet = new Set([9])
      const originalMonsters = mockState.levels[8].monsters

      const result = service.ascend(mockState)

      // Monsters should be unchanged
      expect(result.currentLevel.monsters).toBe(originalMonsters)
    })

    it('should NOT respawn without Amulet', () => {
      mockState.hasAmulet = false
      const originalMonsters = mockState.levels[8].monsters

      const result = service.ascend(mockState)

      // Monsters should be unchanged
      expect(result.currentLevel.monsters).toBe(originalMonsters)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- stairs-navigation.test.ts
```

Expected: FAIL with module not found errors

**Step 3: Implement StairsNavigationService**

Create `StairsNavigationService.ts`:

```typescript
import { GameState, Level, Monster } from '@game/core/core'
import { MonsterSpawnService } from '@services/MonsterSpawnService'

/**
 * StairsNavigationService
 *
 * Handles all stairs traversal logic for 26-level dungeon with bidirectional travel.
 * Manages level persistence, monster respawning, and Amulet-triggered mechanics.
 *
 * Design:
 * - Free bidirectional travel (up/down stairs work at all times)
 * - Levels persist exactly as left (full persistence)
 * - Amulet pickup triggers respawn flag
 * - Monsters respawn on FIRST visit with Amulet (tracked via levelsVisitedWithAmulet)
 *
 * Dependencies: MonsterSpawnService (for respawning monsters)
 */
export class StairsNavigationService {
  constructor(private monsterSpawnService: MonsterSpawnService) {}

  /**
   * Check if player can descend (move to deeper level)
   */
  canDescend(state: GameState): boolean {
    return state.currentDepth < state.maxDepth
  }

  /**
   * Check if player can ascend (move to shallower level)
   */
  canAscend(state: GameState): boolean {
    return state.currentDepth > 1
  }

  /**
   * Descend one level (depth + 1)
   *
   * Saves current level, loads next level from array.
   * Respawns monsters if moving WITH Amulet for first time.
   */
  descend(state: GameState): GameState {
    if (!this.canDescend(state)) {
      throw new Error('Cannot descend deeper (already at maximum depth)')
    }

    const newDepth = state.currentDepth + 1
    return this.changeLevel(state, newDepth)
  }

  /**
   * Ascend one level (depth - 1)
   *
   * Saves current level, loads previous level from array.
   * Respawns monsters if moving WITH Amulet for first time.
   */
  ascend(state: GameState): GameState {
    if (!this.canAscend(state)) {
      throw new Error('Cannot ascend higher (already at surface level)')
    }

    const newDepth = state.currentDepth - 1
    return this.changeLevel(state, newDepth)
  }

  /**
   * Change to a different level (core transition logic)
   *
   * @private
   */
  private changeLevel(state: GameState, newDepth: number): GameState {
    // 1. Save current level to array
    const updatedLevels = [...state.levels]
    updatedLevels[state.currentDepth - 1] = state.currentLevel

    // 2. Load target level from array
    let targetLevel = updatedLevels[newDepth - 1]

    // 3. Check if we need to respawn monsters
    const needsRespawn =
      state.hasAmulet && !state.levelsVisitedWithAmulet.has(newDepth)

    const updatedVisited = new Set(state.levelsVisitedWithAmulet)

    if (needsRespawn) {
      // Respawn monsters using full vorpal pool [0, depth+3]
      targetLevel = this.respawnMonstersForLevel(targetLevel, newDepth)
      updatedVisited.add(newDepth)
    }

    // 4. Return updated state
    return {
      ...state,
      currentDepth: newDepth,
      currentLevel: targetLevel,
      levels: updatedLevels,
      levelsVisitedWithAmulet: updatedVisited,
    }
  }

  /**
   * Respawn monsters for a level (used during ascent with Amulet)
   *
   * Uses cumulative vorpal pool [0, depth+3] for increased difficulty.
   *
   * @private
   */
  private respawnMonstersForLevel(level: Level, depth: number): Level {
    // Use cumulative vorpal range for ascent challenge
    const minVorpal = 0 // All monsters unlocked up to this depth
    const maxVorpal = Math.min(25, depth + 3)

    // Filter available monsters
    const availableMonsters = this.monsterSpawnService.filterByVorpalRange(
      minVorpal,
      maxVorpal
    )

    // Calculate spawn count (same formula as original generation)
    const spawnCount = this.monsterSpawnService.getSpawnCount(depth)

    // Spawn new monsters
    const newMonsters = this.monsterSpawnService.spawnMonsters(
      level.rooms,
      level.tiles,
      depth
    )

    return {
      ...level,
      monsters: newMonsters, // Replace old monsters with new spawns
    }
  }
}
```

**Step 4: Create barrel export**

Create `index.ts`:

```typescript
export { StairsNavigationService } from './StairsNavigationService'
```

**Step 5: Run test to verify it passes**

```bash
npm test -- stairs-navigation.test.ts
```

Expected: PASS (10+ tests)

**Step 6: Commit**

```bash
git add src/services/StairsNavigationService/*
git commit -m "feat: add StairsNavigationService for 26-level traversal with monster respawn"
```

---

### Task 4.2: Update DescendStairsCommand to Use StairsNavigationService ✅

**Note:** Completed as part of MoveStairsCommand refactor (combines Tasks 4.2 and 4.3)

**Files:**
- Modify: `src/commands/MoveStairsCommand/MoveStairsCommand.ts`

**Step 1: Inject StairsNavigationService into DescendStairsCommand**

Update constructor:

```typescript
export class DescendStairsCommand implements Command {
  constructor(
    private fovService: FOVService,
    private messageService: MessageService,
    private stairsNavigationService: StairsNavigationService  // NEW
  ) {}
```

**Step 2: Replace direct depth increment with service call**

Replace:

```typescript
// OLD
if (state.currentDepth >= 10) {
  // Can't go deeper
  return { state, messages: ['You cannot descend further'] }
}

const newState = {
  ...state,
  currentDepth: state.currentDepth + 1,
  // ... manual level transition logic
}
```

With:

```typescript
// NEW
if (!this.stairsNavigationService.canDescend(state)) {
  return {
    state,
    messages: [{ text: 'You cannot descend further', type: 'warning' }]
  }
}

let newState = this.stairsNavigationService.descend(state)
```

**Step 3: Update FOV recalculation (keep existing logic)**

```typescript
// Recalculate FOV for new level (unchanged)
newState = {
  ...newState,
  currentLevel: {
    ...newState.currentLevel,
    visibleCells: this.fovService.calculateFOV(
      newState.currentLevel.tiles,
      newState.player.position,
      newState.player.equipment.lightSource
    )
  }
}
```

**Step 4: Add message for descending**

```typescript
this.messageService.addMessage({
  text: `You descend the stairs deeper into the dungeon... (Level ${newState.currentDepth})`,
  type: 'info'
})
```

**Step 5: Run command tests**

```bash
npm test -- DescendStairsCommand
```

Expected: All tests pass (update expectations if needed for 26 levels)

**Step 6: Commit**

```bash
git add src/commands/DescendStairsCommand/*
git commit -m "refactor: use StairsNavigationService in DescendStairsCommand"
```

---

### Task 4.3: Update AscendStairsCommand to Use StairsNavigationService ✅

**Note:** Completed as part of MoveStairsCommand refactor (combines Tasks 4.2 and 4.3)

**Files:**
- Modify: `src/commands/MoveStairsCommand/MoveStairsCommand.ts`

**Step 1: Inject StairsNavigationService**

```typescript
export class AscendStairsCommand implements Command {
  constructor(
    private fovService: FOVService,
    private messageService: MessageService,
    private stairsNavigationService: StairsNavigationService  // NEW
  ) {}
```

**Step 2: Replace direct depth decrement with service call**

```typescript
// NEW
if (!this.stairsNavigationService.canAscend(state)) {
  return {
    state,
    messages: [{ text: 'You cannot ascend higher', type: 'warning' }]
  }
}

let newState = this.stairsNavigationService.ascend(state)
```

**Step 3: Add contextual message based on Amulet status**

```typescript
const message = newState.hasAmulet
  ? `You climb the stairs toward the surface... (Level ${newState.currentDepth})`
  : `You climb back up the stairs... (Level ${newState.currentDepth})`

this.messageService.addMessage({
  text: message,
  type: 'info'
})
```

**Step 4: Run command tests**

```bash
npm test -- AscendStairsCommand
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/commands/AscendStairsCommand/*
git commit -m "refactor: use StairsNavigationService in AscendStairsCommand"
```

---

## Phase 5: Amulet & Win Condition

### Task 5.1: Create Amulet Factory and Spawn on Level 26 ✅

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/amulet-spawn.test.ts`

**Note:** Level 26 amulet spawning already implemented in DungeonService.generateLevel()

**Step 1: Write test for Amulet spawning**

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { Level, ItemType } from '@game/core/core'

describe('ItemSpawnService - Amulet Spawn', () => {
  let service: ItemSpawnService

  beforeEach(() => {
    service = new ItemSpawnService()
  })

  describe('createAmulet', () => {
    it('should create Amulet of Yendor', () => {
      const amulet = service.createAmulet()

      expect(amulet.type).toBe(ItemType.AMULET)
      expect(amulet.name).toBe('Amulet of Yendor')
      expect(amulet.identified).toBe(true)
      expect(amulet.cursed).toBe(false)
    })
  })

  describe('spawnAmuletOnLevel', () => {
    it('should add Amulet to level 26', () => {
      const mockLevel: Level = {
        depth: 26,
        items: [],
        // ... other properties
      } as Level

      const result = service.spawnAmuletOnLevel(mockLevel)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].type).toBe(ItemType.AMULET)
      expect(result.items[0].name).toBe('Amulet of Yendor')
    })

    it('should place Amulet in a valid walkable position', () => {
      const mockLevel: Level = {
        depth: 26,
        items: [],
        tiles: /* mock tiles */,
        rooms: /* mock rooms */
      } as Level

      const result = service.spawnAmuletOnLevel(mockLevel)

      const amulet = result.items[0]
      const tile = result.tiles[amulet.position.y][amulet.position.x]
      expect(tile.walkable).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- amulet-spawn.test.ts
```

Expected: FAIL

**Step 3: Implement Amulet creation and spawning**

```typescript
/**
 * Create Amulet of Yendor (quest item)
 */
createAmulet(): Amulet {
  return {
    id: `amulet-yendor`,
    name: 'Amulet of Yendor',
    type: ItemType.AMULET,
    spriteName: 'amulet',
    identified: true,  // Always identified
    cursed: false      // Never cursed
  }
}

/**
 * Spawn Amulet of Yendor on a level (should only be called for level 26)
 */
spawnAmuletOnLevel(level: Level): Level {
  const amulet = this.createAmulet()

  // Find a valid spawn position (center of a random room)
  const room = this.randomService.pickRandom(level.rooms)
  const centerX = Math.floor(room.x + room.width / 2)
  const centerY = Math.floor(room.y + room.height / 2)

  const amuletWithPosition = {
    ...amulet,
    position: { x: centerX, y: centerY }
  }

  return {
    ...level,
    items: [...level.items, amuletWithPosition]
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- amulet-spawn.test.ts
```

Expected: PASS

**Step 5: Update level generation to spawn Amulet on level 26**

In `LevelGenerationService.generateAllLevels()`:

```typescript
generateAllLevels(): Level[] {
  const levels: Level[] = []

  for (let depth = 1; depth <= 26; depth++) {
    let level = this.generateLevel(depth)

    // Spawn Amulet on level 26
    if (depth === 26) {
      level = this.itemSpawnService.spawnAmuletOnLevel(level)
    }

    levels.push(level)
  }

  return levels
}
```

**Step 6: Commit**

```bash
git add src/services/ItemSpawnService/* src/services/LevelGenerationService/*
git commit -m "feat: spawn Amulet of Yendor on level 26"
```

---

### Task 5.2: Handle Amulet Pickup in PickupItemCommand ✅

**Note:** Already implemented in PickUpCommand.ts (lines 62-89) with comprehensive test coverage

**Files:**
- Modify: `src/commands/PickUpCommand/PickUpCommand.ts` (already done)
- Tests: `src/commands/PickUpCommand/amulet-pickup.test.ts` (7 tests passing)

**Step 1: Add special handling for Amulet pickup**

After picking up item, check if it's the Amulet:

```typescript
execute(state: GameState): CommandResult {
  // ... existing pickup logic ...

  // After successful pickup
  const pickedUpItem = /* item that was picked up */

  let newState = {
    ...state,
    player: {
      ...state.player,
      inventory: [...state.player.inventory, pickedUpItem]
    }
  }

  // NEW: Check if picked up Amulet
  if (pickedUpItem.type === ItemType.AMULET) {
    newState = {
      ...newState,
      hasAmulet: true
    }

    this.messageService.addMessage({
      text: 'You have found the Amulet of Yendor! Return to the surface to win!',
      type: 'success'
    })
  } else {
    this.messageService.addMessage({
      text: `You pick up the ${pickedUpItem.name}.`,
      type: 'info'
    })
  }

  return { state: newState, messages: [] }
}
```

**Step 2: Prevent dropping the Amulet (optional but recommended)**

In `DropItemCommand`:

```typescript
execute(state: GameState, itemId: string): CommandResult {
  const item = state.player.inventory.find(i => i.id === itemId)

  // Prevent dropping quest items
  if (item?.type === ItemType.AMULET) {
    return {
      state,
      messages: [{
        text: 'You cannot drop the Amulet of Yendor!',
        type: 'warning'
      }]
    }
  }

  // ... rest of drop logic
}
```

**Step 3: Run command tests**

```bash
npm test -- PickupItemCommand DropItemCommand
```

Expected: Tests pass (add new test cases if needed)

**Step 4: Commit**

```bash
git add src/commands/PickupItemCommand/* src/commands/DropItemCommand/*
git commit -m "feat: handle Amulet pickup and prevent dropping quest item"
```

---

### Task 5.3: Create WinConditionService and Victory Screen ✅

**Note:** Already implemented as VictoryService with full integration in MoveStairsCommand

**Files:**
- Create: `src/services/VictoryService/VictoryService.ts` (already done)
- Create: `src/services/VictoryService/victory-condition.test.ts` (5 tests passing)
- Integration: Victory checking in MoveStairsCommand.ts (lines 144-157)
- Victory screen: `src/states/VictoryScreenState/VictoryScreenState.ts` (already done)

**Step 1: Write tests for WinConditionService**

```typescript
import { WinConditionService } from './WinConditionService'
import { GameState } from '@game/core/core'

describe('WinConditionService', () => {
  let service: WinConditionService

  beforeEach(() => {
    service = new WinConditionService()
  })

  describe('checkWinCondition', () => {
    it('should return false if not at surface', () => {
      const state = {
        currentDepth: 10,
        hasAmulet: true
      } as GameState

      expect(service.checkWinCondition(state)).toBe(false)
    })

    it('should return false if at surface without Amulet', () => {
      const state = {
        currentDepth: 1,
        hasAmulet: false
      } as GameState

      expect(service.checkWinCondition(state)).toBe(false)
    })

    it('should return true if at surface WITH Amulet', () => {
      const state = {
        currentDepth: 1,
        hasAmulet: true
      } as GameState

      expect(service.checkWinCondition(state)).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- win-condition.test.ts
```

Expected: FAIL

**Step 3: Implement WinConditionService**

```typescript
import { GameState } from '@game/core/core'

/**
 * WinConditionService
 *
 * Checks victory condition: Player at surface (depth 1) with Amulet of Yendor.
 */
export class WinConditionService {
  /**
   * Check if player has won the game
   *
   * Win condition: depth === 1 && hasAmulet === true
   */
  checkWinCondition(state: GameState): boolean {
    return state.currentDepth === 1 && state.hasAmulet === true
  }

  /**
   * Get victory statistics for victory screen
   */
  getVictoryStats(state: GameState) {
    return {
      turnsPlayed: state.turnCount,
      monstersKilled: state.player.stats.monstersKilled || 0,
      goldCollected: state.player.gold,
      experienceLevel: state.player.level,
      finalHP: state.player.hp,
      maxHP: state.player.maxHp
    }
  }
}
```

**Step 4: Create barrel export**

```typescript
export { WinConditionService } from './WinConditionService'
```

**Step 5: Run test to verify it passes**

```bash
npm test -- win-condition.test.ts
```

Expected: PASS

**Step 6: Integrate into game loop**

In `AscendStairsCommand`, after ascending:

```typescript
// After ascending with StairsNavigationService
let newState = this.stairsNavigationService.ascend(state)

// Check win condition
if (this.winConditionService.checkWinCondition(newState)) {
  // Trigger victory!
  this.messageService.addMessage({
    text: 'You have escaped the dungeon with the Amulet of Yendor! YOU WIN!',
    type: 'success'
  })

  // TODO: Transition to victory screen (DeathScreenState equivalent)
  // This will depend on your state management system
}
```

**Step 7: Commit**

```bash
git add src/services/WinConditionService/* src/commands/AscendStairsCommand/*
git commit -m "feat: add WinConditionService and victory check when reaching surface with Amulet"
```

---

## Phase 6: Monster Respawn (Already Implemented)

**Note:** Monster respawn logic was already implemented in Task 4.1 (StairsNavigationService.respawnMonstersForLevel). This phase is complete!

**Verification Step:**

Run integration test to verify respawn works:

```bash
npm test -- stairs-navigation.test.ts -t "monster respawn"
```

Expected: All respawn tests pass

---

## Phase 7: Resource Rebalancing ✅

### Task 7.1: Update Light Source Fuel Values ✅

**Files:**
- Modify: `src/services/LightingService/LightingService.ts` (or wherever light constants are defined)
- Modify: `src/data/items.json` (if items are data-driven)

**Step 1: Update torch fuel capacity**

Change from 500 → 650 turns:

```typescript
// In item creation or constants
const TORCH_FUEL = 650  // Changed from 500
```

**Step 2: Update lantern fuel capacity**

Change from 500 → 750 max fuel:

```typescript
const LANTERN_MAX_FUEL = 750  // Changed from 500
```

**Step 3: Update oil flask refill amount**

Change from 500 → 600 turns:

```typescript
const OIL_FLASK_REFILL = 600  // Changed from 500
```

**Step 4: Update all relevant tests**

```bash
npm test -- LightingService
```

Expected: Tests pass (update expectations to match new fuel values)

**Step 5: Commit**

```bash
git add src/services/LightingService/* src/data/items.json
git commit -m "balance: increase light source fuel for 26-level journey (torch 650, lantern 750, oil 600)"
```

---

### Task 7.2: Update Food Spawn Rate with Depth Scaling ✅

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`

**Completed:** Added depth-scaled food spawning (10% base + 1% per 5 levels), torch spawning (7%), and oil flask spawning (5%) with helper methods.

**Step 1: Implement depth-scaled food spawning**

Replace fixed 15% with depth-scaling formula:

```typescript
/**
 * Calculate food spawn chance for a given depth
 *
 * Base: 10%
 * Depth bonus: +1% every 5 levels
 *
 * Depth 1-4: 10%
 * Depth 5-9: 11%
 * Depth 10-14: 12%
 * Depth 15-19: 13%
 * Depth 20-24: 14%
 * Depth 25-26: 15%
 */
getFoodSpawnChance(depth: number): number {
  const baseChance = 0.10
  const depthBonus = Math.floor(depth / 5) * 0.01
  return baseChance + depthBonus
}

/**
 * Spawn food on level (updated to use depth scaling)
 */
spawnFood(level: Level): Level {
  const spawnChance = this.getFoodSpawnChance(level.depth)

  if (this.randomService.chance(spawnChance)) {
    // ... spawn food logic
  }

  return level
}
```

**Step 2: Update torch and oil spawn rates**

```typescript
getTorchSpawnChance(depth: number): number {
  return 0.07  // 7% (increased from 5%)
}

getOilFlaskSpawnChance(depth: number): number {
  return 0.05  // 5% (increased from 3%)
}
```

**Step 3: Run tests**

```bash
npm test -- ItemSpawnService
```

Expected: Tests pass

**Step 4: Commit**

```bash
git add src/services/ItemSpawnService/*
git commit -m "balance: scale food spawn with depth (10%+bonus), increase torch/oil rates for 26 levels"
```

---

## Phase 8: Light Source Stacking

### Task 8.1: Implement Light Source Stacking in Inventory

**Files:**
- Modify: `src/services/InventoryService/InventoryService.ts` (or wherever inventory is managed)
- Create: `src/services/InventoryService/light-stacking.test.ts`

**Step 1: Write test for light source stacking**

```typescript
import { InventoryService } from './InventoryService'
import { ItemType, Torch } from '@game/core/core'

describe('InventoryService - Light Stacking', () => {
  let service: InventoryService

  beforeEach(() => {
    service = new InventoryService()
  })

  it('should stack torches with same fuel amount', () => {
    const inventory: Item[] = [
      { id: '1', type: ItemType.TORCH, fuel: 650, name: 'Torch' } as Torch,
      { id: '2', type: ItemType.TORCH, fuel: 650, name: 'Torch' } as Torch
    ]

    const stacked = service.stackLightSources(inventory)

    expect(stacked).toHaveLength(1)
    expect(stacked[0].quantity).toBe(2)
    expect(stacked[0].totalFuel).toBe(1300)
  })

  it('should NOT stack torches with different fuel amounts', () => {
    const inventory: Item[] = [
      { id: '1', type: ItemType.TORCH, fuel: 650, name: 'Torch' } as Torch,
      { id: '2', type: ItemType.TORCH, fuel: 400, name: 'Torch' } as Torch
    ]

    const stacked = service.stackLightSources(inventory)

    expect(stacked).toHaveLength(2)
  })

  it('should format display name with quantity and total fuel', () => {
    const torch: Torch = {
      id: '1',
      type: ItemType.TORCH,
      fuel: 650,
      name: 'Torch'
    } as Torch

    const displayName = service.getDisplayName(torch, 3)

    expect(displayName).toBe('Torch (×3, 1950 turns)')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- light-stacking.test.ts
```

Expected: FAIL

**Step 3: Implement stacking logic**

```typescript
/**
 * Stack light sources by type and fuel amount
 *
 * Groups torches/oil flasks with identical fuel values into stacks.
 * Each stack tracks quantity and total available fuel.
 */
stackLightSources(inventory: Item[]): StackedItem[] {
  const stacks = new Map<string, StackedItem>()

  for (const item of inventory) {
    // Only stack torches and oil flasks
    if (item.type !== ItemType.TORCH && item.type !== ItemType.OIL_FLASK) {
      stacks.set(item.id, { item, quantity: 1, totalFuel: 0 })
      continue
    }

    // Create stack key: type + fuel amount
    const fuel = 'fuel' in item ? item.fuel : 0
    const stackKey = `${item.type}-${fuel}`

    if (stacks.has(stackKey)) {
      // Add to existing stack
      const stack = stacks.get(stackKey)!
      stack.quantity += 1
      stack.totalFuel += fuel
    } else {
      // Create new stack
      stacks.set(stackKey, {
        item,
        quantity: 1,
        totalFuel: fuel
      })
    }
  }

  return Array.from(stacks.values())
}

/**
 * Get display name for stacked item
 *
 * Format: "Torch (×3, 1950 turns)" for stacked items
 */
getDisplayName(item: Item, quantity: number = 1): string {
  if (quantity === 1) {
    return item.name
  }

  const fuel = 'fuel' in item ? item.fuel : 0
  const totalFuel = fuel * quantity

  return `${item.name} (×${quantity}, ${totalFuel} turns)`
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- light-stacking.test.ts
```

Expected: PASS

**Step 5: Update inventory display to use stacking**

In inventory UI rendering:

```typescript
// When displaying inventory
const stackedItems = inventoryService.stackLightSources(player.inventory)

for (const stack of stackedItems) {
  const displayName = inventoryService.getDisplayName(stack.item, stack.quantity)
  // Render: displayName
}
```

**Step 6: Commit**

```bash
git add src/services/InventoryService/*
git commit -m "feat: stack light sources by fuel amount in inventory display"
```

---

## Phase 9: Testing & Polish

### Task 9.1: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Check coverage**

```bash
npm run test:coverage
```

Expected: >80% coverage overall

**Step 3: Fix any failing tests**

If tests fail, fix them and commit:

```bash
git add <files>
git commit -m "fix: resolve test failures after 26-level refactor"
```

---

### Task 9.2: Manual Playtest

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test descent journey**

- [ ] Start new game at level 1
- [ ] Verify monsters appropriate for depth 1 (only Bat/Snake/Emu/Hobgoblin)
- [ ] Descend to level 5, verify mid-level monsters spawn
- [ ] Descend to level 10, verify NO bosses spawn
- [ ] Descend to level 15, verify still no bosses
- [ ] Descend to level 20, verify higher-level monsters
- [ ] Reach level 26, verify bosses spawn
- [ ] Find and pick up Amulet of Yendor

**Step 3: Test ascent journey**

- [ ] With Amulet, ascend to level 25
- [ ] Verify monsters respawned (different from before)
- [ ] Verify full monster pool available (easier AND harder monsters)
- [ ] Ascend to level 10
- [ ] Verify monsters respawned on first visit
- [ ] Descend back to level 11, ascend to level 10 again
- [ ] Verify monsters NOT respawned (same as before)
- [ ] Reach level 1 with Amulet
- [ ] Verify victory message/screen appears

**Step 4: Test resource balance**

- [ ] Monitor food consumption over ~50 turns
- [ ] Verify you find enough food to survive
- [ ] Monitor light fuel consumption
- [ ] Verify you find enough torches/oil
- [ ] Verify torch stacking works in inventory

**Step 5: Document any issues**

If issues found, create tasks and fix them.

---

### Task 9.3: Update Documentation

**Files:**
- Modify: `docs/game-design/README.md` (update win condition, level count)
- Modify: `docs/systems-core.md` (update spawn system documentation)
- Modify: `CLAUDE.md` (update quick reference)

**Step 1: Update game design docs**

Change references from "10 levels" to "26 levels", update win condition to include return journey.

**Step 2: Update system docs**

Document vorpal spawn system, replace old level-based filtering explanation.

**Step 3: Update CLAUDE.md quick reference**

Update:
- Level count: 10 → 26
- Win condition: "Retrieve Amulet from Level 10" → "Retrieve Amulet from Level 26, return to Level 1"
- Add vorpal spawning to monster system summary

**Step 4: Commit documentation**

```bash
git add docs/* CLAUDE.md
git commit -m "docs: update for 26-level dungeon with vorpal spawning and return journey"
```

---

## Phase 10: Savegame Migration

### Task 10.1: Add Savegame Version Breaking Change Warning

**Files:**
- Modify: `src/services/SaveGameService/SaveGameService.ts` (or equivalent)

**Step 1: Increment save version**

```typescript
const SAVE_VERSION = 2  // Changed from 1 (breaking change)
```

**Step 2: Add migration check**

```typescript
loadGame(): GameState | null {
  const savedData = localStorage.getItem('roguelike-save')

  if (!savedData) {
    return null
  }

  const parsed = JSON.parse(savedData)

  // Check version
  if (parsed.version !== SAVE_VERSION) {
    // Show warning to user
    console.warn('Save file from old version detected. Clearing incompatible save.')
    localStorage.removeItem('roguelike-save')
    return null
  }

  return parsed.gameState
}
```

**Step 3: Add UI notification (optional)**

When old save detected, show message:

```
"Game updated to 26 levels! Previous saves incompatible. Starting fresh adventure..."
```

**Step 4: Test save/load**

- Start new game (26 levels)
- Save game
- Refresh page
- Verify load works
- Manually edit localStorage to version 1
- Refresh
- Verify save is cleared with warning

**Step 5: Commit**

```bash
git add src/services/SaveGameService/*
git commit -m "feat: add save version breaking change for 26-level update"
```

---

## Final Steps

### Task 11.1: Final Integration Test

**Step 1: Run full test suite one last time**

```bash
npm test
npm run test:coverage
npm run type-check
npm run build
```

Expected: All pass

**Step 2: Complete playthrough test**

Play from level 1 → 26 → 1 with Amulet, verify everything works end-to-end.

**Step 3: If all tests pass, mark plan complete**

---

### Task 11.2: Merge to Main

**Step 1: Return to main repo and create PR**

```bash
cd /Users/dirkkok/Development/roguelike
git checkout main
```

**Step 2: Create pull request**

```bash
gh pr create --title "feat: extend to 26 levels with authentic Rogue vorpal spawning" --body "$(cat <<'EOF'
## Summary
- Extended dungeon from 10 to 26 levels
- Implemented authentic Rogue vorpal spawning system [depth-6, depth+3]
- Added Amulet of Yendor quest on level 26
- Implemented return journey with monster respawning
- Rebalanced resources (food, light) for 52-level journey
- Added light source stacking in inventory

## Testing
- 3073+ tests passing
- Full playthrough tested (descent + ascent)
- Resource balance verified over 26-level journey

## Breaking Changes
- Save files from 10-level version incompatible (version bump to v2)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Merge when ready**

After code review (if applicable), merge the PR.

---

## Summary

**Total Estimated Time:** 20-30 hours

**Key Milestones:**
1. ✅ Core state & data structures (2 hours)
2. ✅ Level generation extended to 26 (2 hours)
3. ✅ Vorpal spawning system (3 hours)
4. ✅ Stairs navigation & persistence (4 hours)
5. ✅ Amulet & win condition (3 hours)
6. ✅ Monster respawn (included in stairs)
7. ✅ Resource rebalancing (2 hours)
8. ✅ Light source stacking (2 hours)
9. ✅ Testing & polish (4 hours)
10. ✅ Savegame migration (1 hour)

**Success Criteria:**
- [ ] Player can descend through all 26 levels
- [ ] Vorpal spawning creates appropriate difficulty curve
- [ ] Amulet appears on level 26
- [ ] Return journey triggers monster respawn
- [ ] Victory screen on reaching level 1 with Amulet
- [ ] Resources balanced for 52-level journey
- [ ] All tests passing (>3000 tests)
- [ ] No breaking bugs in playthrough

---

**Ready to implement!** 🎮
