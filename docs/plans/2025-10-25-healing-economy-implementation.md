# Healing Economy Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement tiered healing potions and depth-based regeneration scaling to fix resource drain during healing.

**Architecture:**
- Replace 2 healing potions (HEAL, EXTRA_HEAL) with 4 tiers (Minor/Medium/Major/Superior)
- Add depth-based spawn rate calculations to ItemSpawnService
- Add depth-based regeneration scaling to RegenerationService
- Scale food/torch/oil spawn rates with depth

**Tech Stack:** TypeScript, Jest, JSON data files

**Design Document:** [2025-10-25-healing-economy-redesign.md](./2025-10-25-healing-economy-redesign.md)

---

## Task 1: Update Items Data - Replace Healing Potions

**Files:**
- Modify: `public/data/items.json:132-148` (potions section)

**Step 1: Replace HEAL and EXTRA_HEAL with 4 healing tiers**

Open `public/data/items.json` and replace lines 132-148 (the entire potions array) with:

```json
  "potions": [
    {
      "type": "MINOR_HEAL",
      "spriteName": "potion",
      "effect": "restore_hp",
      "power": "5d8",
      "rarity": "common",
      "minDepth": 1,
      "maxDepth": 10,
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    },
    {
      "type": "MEDIUM_HEAL",
      "spriteName": "potion",
      "effect": "restore_hp",
      "power": "8d10",
      "rarity": "uncommon",
      "minDepth": 8,
      "maxDepth": 18,
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    },
    {
      "type": "MAJOR_HEAL",
      "spriteName": "potion",
      "effect": "restore_hp",
      "power": "12d10",
      "rarity": "uncommon",
      "minDepth": 15,
      "maxDepth": 26,
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    },
    {
      "type": "SUPERIOR_HEAL",
      "spriteName": "potion",
      "effect": "restore_hp",
      "power": "15d12",
      "rarity": "rare",
      "minDepth": 20,
      "maxDepth": 26,
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    },
```

**Step 2: Verify JSON is valid**

Run: `npm run build`

Expected: Build succeeds (no JSON parsing errors)

**Step 3: Commit data changes**

```bash
git add public/data/items.json
git commit -m "data: replace HEAL/EXTRA_HEAL with 4-tier healing system

- Add MINOR_HEAL (5d8, common, depths 1-10)
- Add MEDIUM_HEAL (8d10, uncommon, depths 8-18)
- Add MAJOR_HEAL (12d10, uncommon, depths 15-26)
- Add SUPERIOR_HEAL (15d12, rare, depths 20-26)
- Add minDepth/maxDepth fields for spawn control"
```

---

## Task 2: Add Healing Spawn Rate Method to ItemSpawnService

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/healing-spawn-rates.test.ts`

**Step 1: Write failing test for calculateHealingSpawnRate()**

Create `src/services/ItemSpawnService/healing-spawn-rates.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'

describe('ItemSpawnService - Healing Spawn Rates', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      weapons: [],
      armor: [],
      potions: [
        { type: 'MINOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '5d8', rarity: 'common', minDepth: 1, maxDepth: 10, descriptors: [] },
        { type: 'MEDIUM_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '8d10', rarity: 'uncommon', minDepth: 8, maxDepth: 18, descriptors: [] },
        { type: 'MAJOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '12d10', rarity: 'uncommon', minDepth: 15, maxDepth: 26, descriptors: [] },
        { type: 'SUPERIOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '15d12', rarity: 'rare', minDepth: 20, maxDepth: 26, descriptors: [] }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    service = new ItemSpawnService(mockRandom, mockItemData)
  })

  describe('calculateHealingSpawnRate()', () => {
    test('Minor Heal: depth 1 returns 10.8%', () => {
      const rate = (service as any).calculateHealingSpawnRate(1, 'MINOR_HEAL')
      expect(rate).toBeCloseTo(0.108, 3)
    })

    test('Minor Heal: depth 5 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(5, 'MINOR_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Minor Heal: depth 10 returns 0% (phased out)', () => {
      const rate = (service as any).calculateHealingSpawnRate(10, 'MINOR_HEAL')
      expect(rate).toBe(0)
    })

    test('Medium Heal: depth 8 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(8, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Medium Heal: depth 13 returns 10% (peak)', () => {
      const rate = (service as any).calculateHealingSpawnRate(13, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.10, 3)
    })

    test('Medium Heal: depth 18 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(18, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Major Heal: depth 15 returns 1%', () => {
      const rate = (service as any).calculateHealingSpawnRate(15, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.01, 3)
    })

    test('Major Heal: depth 20 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(20, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Major Heal: depth 26 returns 12%', () => {
      const rate = (service as any).calculateHealingSpawnRate(26, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.12, 3)
    })

    test('Superior Heal: depth 20 returns 0.5%', () => {
      const rate = (service as any).calculateHealingSpawnRate(20, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.005, 3)
    })

    test('Superior Heal: depth 23 returns 2%', () => {
      const rate = (service as any).calculateHealingSpawnRate(23, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.02, 3)
    })

    test('Superior Heal: depth 26 returns 3.5%', () => {
      const rate = (service as any).calculateHealingSpawnRate(26, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.035, 3)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test healing-spawn-rates`

Expected: FAIL - "calculateHealingSpawnRate is not a function"

**Step 3: Add calculateHealingSpawnRate() method to ItemSpawnService**

In `src/services/ItemSpawnService/ItemSpawnService.ts`, add this private method after `calculateCurseChance()` (around line 150):

```typescript
  /**
   * Calculate spawn rate for healing potions based on depth and tier
   * Each tier has a different spawn curve to ensure smooth progression
   *
   * @param depth - Current dungeon depth (1-26)
   * @param healingType - Healing potion type (MINOR_HEAL, MEDIUM_HEAL, MAJOR_HEAL, SUPERIOR_HEAL)
   * @returns Spawn rate as decimal (0.0 to 1.0)
   */
  private calculateHealingSpawnRate(depth: number, healingType: string): number {
    switch (healingType) {
      case 'MINOR_HEAL':
        // spawn_rate = max(0, 12% - (depth × 1.2%))
        // Depths 1-10, phased out at depth 10
        return Math.max(0, 0.12 - (depth * 0.012))

      case 'MEDIUM_HEAL':
        // spawn_rate = max(0, 10% - abs(depth - 13) × 0.8%)
        // Bell curve peaking at depth 13, depths 8-18
        return Math.max(0, 0.10 - Math.abs(depth - 13) * 0.008)

      case 'MAJOR_HEAL':
        // spawn_rate = min(12%, max(0, (depth - 14) × 1.0%))
        // Linear ramp from depth 15-26, peaks at 12%
        return Math.min(0.12, Math.max(0, (depth - 14) * 0.01))

      case 'SUPERIOR_HEAL':
        // spawn_rate = max(0, (depth - 19) × 0.5%)
        // Rare finds, depths 20-26, max 3.5%
        return Math.max(0, (depth - 19) * 0.005)

      default:
        return 0
    }
  }
```

**Step 4: Run tests to verify they pass**

Run: `npm test healing-spawn-rates`

Expected: PASS - All 12 tests pass

**Step 5: Commit healing spawn rate method**

```bash
git add src/services/ItemSpawnService/ItemSpawnService.ts src/services/ItemSpawnService/healing-spawn-rates.test.ts
git commit -m "feat: add depth-based healing spawn rate calculation

Add calculateHealingSpawnRate() method with 4 tier formulas:
- MINOR_HEAL: 10.8% → 0% (depths 1-10)
- MEDIUM_HEAL: bell curve peaking at 10% (depths 8-18)
- MAJOR_HEAL: 1% → 12% linear ramp (depths 15-26)
- SUPERIOR_HEAL: 0.5% → 3.5% rare finds (depths 20-26)"
```

---

## Task 3: Add Depth-Based Regeneration to RegenerationService

**Files:**
- Modify: `src/services/RegenerationService/RegenerationService.ts`
- Create: `src/services/RegenerationService/depth-scaling.test.ts`

**Step 1: Write failing test for calculateRegenTurns()**

Create `src/services/RegenerationService/depth-scaling.test.ts`:

```typescript
import { RegenerationService } from './RegenerationService'
import { RingService } from '@services/RingService'

describe('RegenerationService - Depth Scaling', () => {
  let service: RegenerationService
  let ringService: RingService

  beforeEach(() => {
    ringService = new RingService()
    service = new RegenerationService(ringService)
  })

  describe('calculateRegenTurns()', () => {
    test('depth 1 returns 10 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(1)
      expect(turns).toBe(10)
    })

    test('depth 5 returns 9 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(5)
      expect(turns).toBe(9)
    })

    test('depth 10 returns 8 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(10)
      expect(turns).toBe(8)
    })

    test('depth 15 returns 7 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(15)
      expect(turns).toBe(7)
    })

    test('depth 20 returns 6 turns/HP', () => {
      const turns = (service as any).calculateRegenTurns(20)
      expect(turns).toBe(6)
    })

    test('depth 26 returns 5 turns/HP (capped)', () => {
      const turns = (service as any).calculateRegenTurns(26)
      expect(turns).toBe(5)
    })

    test('depth 50 returns 5 turns/HP (capped, not negative)', () => {
      const turns = (service as any).calculateRegenTurns(50)
      expect(turns).toBe(5)
    })

    test('all depths return values between 5-10', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const turns = (service as any).calculateRegenTurns(depth)
        expect(turns).toBeGreaterThanOrEqual(5)
        expect(turns).toBeLessThanOrEqual(10)
      }
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test depth-scaling`

Expected: FAIL - "calculateRegenTurns is not a function"

**Step 3: Add calculateRegenTurns() method**

In `src/services/RegenerationService/RegenerationService.ts`, add this private method after the constructor (around line 37):

```typescript
  /**
   * Calculate regeneration speed based on depth
   * Deeper levels = faster regeneration to offset resource drain
   *
   * Formula: max(5, 10 - floor(depth × 0.2))
   *
   * @param depth - Current dungeon depth (1-26)
   * @returns Turns required per 1 HP healed (capped at 5 minimum)
   */
  private calculateRegenTurns(depth: number): number {
    return Math.max(5, 10 - Math.floor(depth * 0.2))
  }
```

**Step 4: Update tickRegeneration() to use depth-based regen**

Modify the `tickRegeneration()` method signature and implementation in `src/services/RegenerationService/RegenerationService.ts`:

**Old (line 53):**
```typescript
  tickRegeneration(player: Player, inCombat: boolean): RegenerationTickResult {
```

**New:**
```typescript
  tickRegeneration(player: Player, inCombat: boolean, depth: number = 1): RegenerationTickResult {
```

**Old (lines 79-82):**
```typescript
    // 3. Check if player has regeneration ring
    const hasRing = this.ringService.hasRing(player, RingType.REGENERATION)
    const requiredTurns = hasRing
      ? REGEN_CONFIG.RING_TURNS
      : REGEN_CONFIG.BASE_TURNS
```

**New:**
```typescript
    // 3. Check if player has regeneration ring
    const hasRing = this.ringService.hasRing(player, RingType.REGENERATION)
    const baseTurns = this.calculateRegenTurns(depth)
    const requiredTurns = hasRing
      ? Math.floor(baseTurns / 2) // Ring halves the regen time
      : baseTurns
```

**Step 5: Run tests to verify they pass**

Run: `npm test RegenerationService`

Expected: Some existing tests may fail due to signature change. We'll fix them in next step.

**Step 6: Update existing RegenerationService tests to pass depth parameter**

Find all calls to `tickRegeneration()` in `src/services/RegenerationService/*.test.ts` and add depth parameter.

Search for: `tickRegeneration(`

Add third parameter `, 1` to all calls. Example:

**Old:**
```typescript
service.tickRegeneration(player, false)
```

**New:**
```typescript
service.tickRegeneration(player, false, 1)
```

**Step 7: Run tests again to verify all pass**

Run: `npm test RegenerationService`

Expected: PASS - All tests pass including new depth-scaling tests

**Step 8: Commit regeneration scaling**

```bash
git add src/services/RegenerationService/
git commit -m "feat: add depth-based regeneration scaling

Add calculateRegenTurns() method with formula:
- Depth 1: 10 turns/HP (unchanged)
- Depth 26: 5 turns/HP (50% faster)
- Linear scaling with 5 turn/HP floor

Update tickRegeneration() to accept depth parameter.
Ring of Regeneration now halves depth-based regen time."
```

---

## Task 4: Update All Callers of tickRegeneration() to Pass Depth

**Files:**
- Modify: `src/commands/RestCommand/RestCommand.ts`
- Modify: `src/commands/MoveCommand/MoveCommand.ts`
- Modify: Any other files calling `tickRegeneration()`

**Step 1: Find all callers of tickRegeneration()**

Run: `grep -r "tickRegeneration" src/ --include="*.ts" | grep -v test.ts | grep -v RegenerationService.ts`

Expected: List of files calling the method

**Step 2: Update RestCommand to pass player depth**

In `src/commands/RestCommand/RestCommand.ts`, find the call to `tickRegeneration()` and update it:

**Old:**
```typescript
const result = this.regenService.tickRegeneration(state.player, inCombat)
```

**New:**
```typescript
const currentDepth = state.levels[state.currentLevelIndex]?.depth || 1
const result = this.regenService.tickRegeneration(state.player, inCombat, currentDepth)
```

**Step 3: Update MoveCommand to pass player depth**

In `src/commands/MoveCommand/MoveCommand.ts`, find the call to `tickRegeneration()` and update it:

**Old:**
```typescript
const result = this.regenService.tickRegeneration(newState.player, hasEnemiesInFOV)
```

**New:**
```typescript
const currentDepth = newState.levels[newState.currentLevelIndex]?.depth || 1
const result = this.regenService.tickRegeneration(newState.player, hasEnemiesInFOV, currentDepth)
```

**Step 4: Update any other callers found in Step 1**

For each file found, update the `tickRegeneration()` call to include depth parameter using the pattern:
```typescript
const currentDepth = state.levels[state.currentLevelIndex]?.depth || 1
```

**Step 5: Run all tests to verify no regressions**

Run: `npm test`

Expected: PASS - All existing tests still pass

**Step 6: Commit caller updates**

```bash
git add src/commands/
git commit -m "refactor: update tickRegeneration() callers to pass depth

Update RestCommand, MoveCommand to pass current dungeon depth
to RegenerationService for depth-based scaling."
```

---

## Task 5: Add Integration Test for Regeneration Speed Progression

**Files:**
- Create: `src/services/RegenerationService/regen-progression.test.ts`

**Step 1: Write integration test for regeneration speed**

Create `src/services/RegenerationService/regen-progression.test.ts`:

```typescript
import { RegenerationService } from './RegenerationService'
import { RingService } from '@services/RingService'
import { Player } from '@game/core/core'

describe('RegenerationService - Progression Integration', () => {
  let service: RegenerationService
  let ringService: RingService
  let basePlayer: Player

  beforeEach(() => {
    ringService = new RingService()
    service = new RegenerationService(ringService)
    service.resetTurnCounter()

    basePlayer = {
      name: 'Test',
      x: 5,
      y: 5,
      hp: 50,
      maxHp: 100,
      strength: 16,
      level: 10,
      xp: 0,
      gold: 0,
      armor: 5,
      hunger: 1000,
      turnsSinceLastRest: 0,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null
      },
      inventory: []
    }
  })

  test('depth 1 regenerates 20 HP in 200 turns (10 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 1)
      player = result.player
    }

    expect(player.hp).toBe(70) // 50 + 20 HP
  })

  test('depth 26 regenerates 40 HP in 200 turns (5 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 26)
      player = result.player
    }

    expect(player.hp).toBe(90) // 50 + 40 HP (2× faster)
  })

  test('depth 13 regenerates ~29 HP in 200 turns (7 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 13)
      player = result.player
    }

    // floor(200 / 7) = 28 heals, but we start at turn 0, so 29 total
    expect(player.hp).toBeGreaterThanOrEqual(78)
    expect(player.hp).toBeLessThanOrEqual(80)
  })

  test('regeneration stops at maxHp regardless of depth', () => {
    let player = { ...basePlayer, hp: 95, maxHp: 100 }

    for (let i = 0; i < 100; i++) {
      const result = service.tickRegeneration(player, false, 26)
      player = result.player
    }

    expect(player.hp).toBe(100) // Capped at maxHp
  })

  test('depth 26 is 50% faster than depth 1', () => {
    const turns1 = (service as any).calculateRegenTurns(1)
    const turns26 = (service as any).calculateRegenTurns(26)

    expect(turns26).toBe(5)
    expect(turns1).toBe(10)
    expect(turns26 / turns1).toBe(0.5) // 50% of original time
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npm test regen-progression`

Expected: PASS - All 5 integration tests pass

**Step 3: Commit integration test**

```bash
git add src/services/RegenerationService/regen-progression.test.ts
git commit -m "test: add regeneration speed progression integration tests

Validate depth-based regen scaling:
- Depth 1: 20 HP in 200 turns (10 turns/HP)
- Depth 26: 40 HP in 200 turns (5 turns/HP, 50% faster)"
```

---

## Task 6: Update ItemSpawnService to Filter Potions by Depth Range

**Files:**
- Modify: `src/services/ItemSpawnService/ItemSpawnService.ts`
- Create: `src/services/ItemSpawnService/depth-filtering.test.ts`

**Step 1: Write failing test for depth-based potion filtering**

Create `src/services/ItemSpawnService/depth-filtering.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { Room, Tile, ItemType } from '@game/core/core'

describe('ItemSpawnService - Depth Filtering', () => {
  let service: ItemSpawnService
  let realRandom: SeededRandom
  let mockItemData: ItemData

  const createMockTiles = (): Tile[][] => {
    const tiles: Tile[][] = []
    for (let y = 0; y < 22; y++) {
      tiles[y] = []
      for (let x = 0; x < 80; x++) {
        tiles[y][x] = { walkable: true, transparent: true, type: 'floor' } as Tile
      }
    }
    return tiles
  }

  const createTestRooms = (count: number): Room[] => {
    const rooms: Room[] = []
    for (let i = 0; i < count; i++) {
      rooms.push({
        x: 10 + i * 20,
        y: 10,
        width: 15,
        height: 10,
        doors: [],
        connected: true
      })
    }
    return rooms
  }

  beforeEach(() => {
    realRandom = new SeededRandom('test-seed-' + Date.now())
    mockItemData = {
      weapons: [],
      armor: [],
      potions: [
        { type: 'MINOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '5d8', rarity: 'common', minDepth: 1, maxDepth: 10, descriptors: [] },
        { type: 'MEDIUM_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '8d10', rarity: 'uncommon', minDepth: 8, maxDepth: 18, descriptors: [] },
        { type: 'MAJOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '12d10', rarity: 'uncommon', minDepth: 15, maxDepth: 26, descriptors: [] },
        { type: 'SUPERIOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '15d12', rarity: 'rare', minDepth: 20, maxDepth: 26, descriptors: [] }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    service = new ItemSpawnService(realRandom, mockItemData)
  })

  test('depth 1 only spawns MINOR_HEAL potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 1)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)
    potions.forEach(potion => {
      expect(potion.name).toContain('Minor') // Should only be Minor Heal
    })
  })

  test('depth 10 does not spawn MINOR_HEAL (maxDepth reached)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 10)
    const potions = items.filter(i => i.type === ItemType.POTION)

    potions.forEach(potion => {
      expect(potion.name).not.toContain('Minor') // No Minor Heal at depth 10
    })
  })

  test('depth 13 spawns only MEDIUM_HEAL potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 13)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)
    potions.forEach(potion => {
      expect(potion.name).toContain('Medium') // Only Medium at depth 13
    })
  })

  test('depth 20 spawns MAJOR and SUPERIOR potions', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 20)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)

    const hasMajor = potions.some(p => p.name.includes('Major'))
    const hasSuperior = potions.some(p => p.name.includes('Superior'))

    expect(hasMajor || hasSuperior).toBe(true)
  })

  test('depth 26 spawns MAJOR and SUPERIOR potions (no low-tier)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    const items = service.spawnItems(rooms, 100, tiles, [], 26)
    const potions = items.filter(i => i.type === ItemType.POTION)

    expect(potions.length).toBeGreaterThan(0)

    potions.forEach(potion => {
      expect(potion.name).not.toContain('Minor')
      expect(potion.name).not.toContain('Medium')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test depth-filtering`

Expected: FAIL - Tests fail because potions aren't filtered by depth yet

**Step 3: Add depth filtering to selectPotionType() method**

In `src/services/ItemSpawnService/ItemSpawnService.ts`, find the `selectPotionType()` method and add depth filtering.

**Add this helper method first (after calculateHealingSpawnRate()):**

```typescript
  /**
   * Filter items by depth range (minDepth/maxDepth fields)
   * @param items - Array of items with optional minDepth/maxDepth
   * @param depth - Current dungeon depth
   * @returns Filtered array of items valid for this depth
   */
  private filterByDepth<T extends { minDepth?: number; maxDepth?: number }>(
    items: T[],
    depth: number
  ): T[] {
    return items.filter(item => {
      const minDepth = item.minDepth ?? 1
      const maxDepth = item.maxDepth ?? 26
      return depth >= minDepth && depth <= maxDepth
    })
  }
```

**Then update selectPotionType() to use filtering:**

Find the line in `selectPotionType()` where it gets the potion list (should be near the start of the method):

**Old:**
```typescript
const potions = this.itemData.potions
```

**New:**
```typescript
const potions = this.filterByDepth(this.itemData.potions, depth)
```

Note: You'll need to ensure `depth` parameter is passed to `selectPotionType()`. Check the method signature and update if needed.

**Step 4: Run tests to verify they pass**

Run: `npm test depth-filtering`

Expected: PASS - All 5 tests pass

**Step 5: Commit depth filtering**

```bash
git add src/services/ItemSpawnService/
git commit -m "feat: add depth-based filtering for healing potions

Add filterByDepth() helper to filter items by minDepth/maxDepth.
Update selectPotionType() to only spawn potions valid for current depth.

- Depth 1: Only MINOR_HEAL
- Depth 13: Only MEDIUM_HEAL
- Depth 26: Only MAJOR_HEAL + SUPERIOR_HEAL"
```

---

## Task 7: Add Statistical Tests for Healing Spawn Distribution

**Files:**
- Create: `src/services/ItemSpawnService/healing-distribution.test.ts`

**Step 1: Write statistical distribution test**

Create `src/services/ItemSpawnService/healing-distribution.test.ts`:

```typescript
import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { Room, Tile, ItemType } from '@game/core/core'

describe('ItemSpawnService - Healing Distribution Statistics', () => {
  let service: ItemSpawnService
  let realRandom: SeededRandom
  let mockItemData: ItemData

  const createMockTiles = (): Tile[][] => {
    const tiles: Tile[][] = []
    for (let y = 0; y < 22; y++) {
      tiles[y] = []
      for (let x = 0; x < 80; x++) {
        tiles[y][x] = { walkable: true, transparent: true, type: 'floor' } as Tile
      }
    }
    return tiles
  }

  const createTestRooms = (count: number): Room[] => {
    const rooms: Room[] = []
    for (let i = 0; i < count; i++) {
      rooms.push({
        x: 10 + i * 20,
        y: 10,
        width: 15,
        height: 10,
        doors: [],
        connected: true
      })
    }
    return rooms
  }

  beforeEach(() => {
    realRandom = new SeededRandom('test-seed-' + Date.now())
    mockItemData = {
      weapons: [],
      armor: [],
      potions: [
        { type: 'MINOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '5d8', rarity: 'common', minDepth: 1, maxDepth: 10, descriptors: ['blue'] },
        { type: 'MEDIUM_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '8d10', rarity: 'uncommon', minDepth: 8, maxDepth: 18, descriptors: ['red'] },
        { type: 'MAJOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '12d10', rarity: 'uncommon', minDepth: 15, maxDepth: 26, descriptors: ['clear'] },
        { type: 'SUPERIOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '15d12', rarity: 'rare', minDepth: 20, maxDepth: 26, descriptors: ['fizzy'] }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    service = new ItemSpawnService(realRandom, mockItemData)
  })

  test('depth 1 has ~10.8% healing spawn rate (vs 3.5% baseline)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    let healingCount = 0
    let totalItems = 0
    const iterations = 500

    for (let i = 0; i < iterations; i++) {
      const items = service.spawnItems(rooms, 20, tiles, [], 1)
      totalItems += items.length
      healingCount += items.filter(i => i.type === ItemType.POTION).length
    }

    const actualRate = (healingCount / totalItems) * 100

    // Expected: ~10.8% (MINOR_HEAL only)
    // Allow ±3% margin for statistical variance
    expect(actualRate).toBeGreaterThan(7.8)
    expect(actualRate).toBeLessThan(13.8)
  }, 30000)

  test('depth 13 has ~10% healing spawn rate (MEDIUM_HEAL peak)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    let healingCount = 0
    let totalItems = 0
    const iterations = 500

    for (let i = 0; i < iterations; i++) {
      const items = service.spawnItems(rooms, 20, tiles, [], 13)
      totalItems += items.length
      healingCount += items.filter(i => i.type === ItemType.POTION).length
    }

    const actualRate = (healingCount / totalItems) * 100

    // Expected: ~10% (MEDIUM_HEAL peak)
    expect(actualRate).toBeGreaterThan(7)
    expect(actualRate).toBeLessThan(13)
  }, 30000)

  test('depth 26 has ~15.5% healing spawn rate (MAJOR + SUPERIOR)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)

    let healingCount = 0
    let totalItems = 0
    const iterations = 500

    for (let i = 0; i < iterations; i++) {
      const items = service.spawnItems(rooms, 20, tiles, [], 26)
      totalItems += items.length
      healingCount += items.filter(i => i.type === ItemType.POTION).length
    }

    const actualRate = (healingCount / totalItems) * 100

    // Expected: ~15.5% (12% MAJOR + 3.5% SUPERIOR)
    expect(actualRate).toBeGreaterThan(12.5)
    expect(actualRate).toBeLessThan(18.5)
  }, 30000)

  test('healing availability increases with depth (1 → 13 → 26)', () => {
    const tiles = createMockTiles()
    const rooms = createTestRooms(5)
    const iterations = 300

    const getHealingRate = (depth: number): number => {
      let healingCount = 0
      let totalItems = 0

      for (let i = 0; i < iterations; i++) {
        const items = service.spawnItems(rooms, 20, tiles, [], depth)
        totalItems += items.length
        healingCount += items.filter(i => i.type === ItemType.POTION).length
      }

      return (healingCount / totalItems) * 100
    }

    const rate1 = getHealingRate(1)
    const rate13 = getHealingRate(13)
    const rate26 = getHealingRate(26)

    // Rates should generally increase
    expect(rate26).toBeGreaterThan(rate1)
    expect(rate26).toBeGreaterThan(rate13)
  }, 60000)
})
```

**Step 2: Run test to verify it passes**

Run: `npm test healing-distribution`

Expected: PASS - All 4 statistical tests pass (may take 30-60 seconds)

**Step 3: Commit statistical tests**

```bash
git add src/services/ItemSpawnService/healing-distribution.test.ts
git commit -m "test: add statistical validation for healing spawn rates

Validate healing spawn rate progression across depths:
- Depth 1: ~10.8% (3.1× improvement over 3.5% baseline)
- Depth 13: ~10% (MEDIUM_HEAL peak)
- Depth 26: ~15.5% (4.4× improvement)

Uses 10,000+ spawn sample for statistical accuracy."
```

---

## Task 8: Run Full Test Suite and Verify Coverage

**Step 1: Run all tests**

Run: `npm test`

Expected: PASS - All tests pass (100+ tests)

**Step 2: Check test coverage**

Run: `npm run test:coverage`

Expected:
- ItemSpawnService: >90% coverage
- RegenerationService: >90% coverage
- Overall: >80% coverage maintained

**Step 3: If coverage drops below targets, identify gaps**

Run: `npm run test:coverage -- --verbose`

Review coverage report and add tests for any uncovered branches.

**Step 4: Commit if additional tests were added**

```bash
git add src/services/
git commit -m "test: improve coverage for healing economy features"
```

---

## Task 9: Update Core Type Definitions (if needed)

**Files:**
- Check: `src/types/core/core.ts` (PotionType enum)

**Step 1: Check if PotionType enum needs updating**

Run: `grep -n "enum PotionType" src/types/core/core.ts`

Expected: Find PotionType enum definition

**Step 2: Update PotionType enum if HEAL/EXTRA_HEAL exist**

In `src/types/core/core.ts`, find the `PotionType` enum and replace old healing types:

**Old:**
```typescript
export enum PotionType {
  HEAL = 'HEAL',
  EXTRA_HEAL = 'EXTRA_HEAL',
  // ... other types
}
```

**New:**
```typescript
export enum PotionType {
  MINOR_HEAL = 'MINOR_HEAL',
  MEDIUM_HEAL = 'MEDIUM_HEAL',
  MAJOR_HEAL = 'MAJOR_HEAL',
  SUPERIOR_HEAL = 'SUPERIOR_HEAL',
  // ... other types
}
```

**Step 3: Search for usages of old enum values**

Run: `grep -r "PotionType.HEAL" src/ --include="*.ts"`
Run: `grep -r "PotionType.EXTRA_HEAL" src/ --include="*.ts"`

Expected: Find any files using old enum values

**Step 4: Update all usages to use new enum values**

Replace:
- `PotionType.HEAL` → `PotionType.MINOR_HEAL`
- `PotionType.EXTRA_HEAL` → Check context (likely `MEDIUM_HEAL` or `MAJOR_HEAL`)

**Step 5: Run tests to verify no breakage**

Run: `npm test`

Expected: PASS - All tests still pass

**Step 6: Commit enum updates**

```bash
git add src/types/core/core.ts src/
git commit -m "refactor: update PotionType enum for 4-tier healing system

Replace HEAL/EXTRA_HEAL with MINOR_HEAL/MEDIUM_HEAL/MAJOR_HEAL/SUPERIOR_HEAL.
Update all references throughout codebase."
```

---

## Task 10: Manual Gameplay Testing

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test depth 1 healing availability**

1. Start new game
2. Play for 5 levels
3. Note healing potions found
4. Expected: 5-6 Minor Heal potions (5d8)

**Step 3: Test depth 13 healing availability**

1. Use debug mode to jump to depth 13
2. Play for 5 levels
3. Note healing potions found
4. Expected: 4-5 Medium Heal potions (8d10)

**Step 4: Test depth 26 healing availability**

1. Use debug mode to jump to depth 26
2. Play for a few levels
3. Note healing potions found
4. Expected: Mix of Major (12d10) and Superior (15d12) potions

**Step 5: Test regeneration speed**

1. Take damage at depth 1
2. Rest for 100 turns (no combat)
3. Note HP gained
4. Expected: ~10 HP (10 turns/HP)

5. Jump to depth 26
6. Take damage
7. Rest for 100 turns
8. Note HP gained
9. Expected: ~20 HP (5 turns/HP, 2× faster)

**Step 6: Document any issues**

Create GitHub issue for any bugs or balance problems discovered.

---

## Task 11: Create Verification Checklist

**Step 1: Create verification document**

Create `docs/verification/healing-economy-verification.md`:

```markdown
# Healing Economy Verification Checklist

## Data Validation
- [ ] items.json has 4 healing tiers (MINOR, MEDIUM, MAJOR, SUPERIOR)
- [ ] Each tier has correct minDepth/maxDepth ranges
- [ ] Each tier has correct power formula (5d8, 8d10, 12d10, 15d12)
- [ ] Each tier has correct rarity (common, uncommon, uncommon, rare)

## Unit Tests
- [ ] calculateHealingSpawnRate() returns correct rates for all tiers
- [ ] calculateRegenTurns() returns correct values for depths 1-26
- [ ] filterByDepth() filters potions correctly
- [ ] All RegenerationService tests pass with depth parameter

## Integration Tests
- [ ] Depth 1 spawns only MINOR_HEAL potions
- [ ] Depth 13 spawns only MEDIUM_HEAL potions
- [ ] Depth 26 spawns only MAJOR_HEAL + SUPERIOR_HEAL
- [ ] Regeneration speed doubles from depth 1 to depth 26

## Statistical Tests
- [ ] Depth 1 has ~10.8% healing spawn rate (10,000+ spawns)
- [ ] Depth 13 has ~10% healing spawn rate
- [ ] Depth 26 has ~15.5% healing spawn rate
- [ ] Healing availability increases with depth

## Code Quality
- [ ] All tests pass (npm test)
- [ ] Coverage >80% overall
- [ ] ItemSpawnService coverage >90%
- [ ] RegenerationService coverage >90%
- [ ] No TypeScript errors (npm run type-check)
- [ ] Build succeeds (npm run build)

## Gameplay Testing
- [ ] Depth 1: Find 5-6 healing potions per 5 levels
- [ ] Depth 13: Find 4-5 healing potions per 5 levels
- [ ] Depth 26: Find 6-7 healing potions per 5 levels
- [ ] Depth 1: Regen ~10 HP in 100 turns
- [ ] Depth 26: Regen ~20 HP in 100 turns
- [ ] Healing potions cover 50-100% of typical combat damage
- [ ] Resource drain during rest is manageable

## Balance Validation
- [ ] No resource starvation at any depth
- [ ] Healing doesn't trivialize combat
- [ ] Resting remains risky but viable
- [ ] Progression feels smooth and rewarding
```

**Step 2: Work through checklist**

Manually verify each item in the checklist.

**Step 3: Mark all items complete**

Replace `[ ]` with `[x]` for completed items.

**Step 4: Commit verification**

```bash
git add docs/verification/
git commit -m "docs: add healing economy verification checklist

Complete verification of:
- 4-tier healing system implementation
- Depth-based regeneration scaling
- Statistical spawn rate validation
- Gameplay balance testing"
```

---

## Task 12: Final Build and Test

**Step 1: Clean build**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS - All tests pass

**Step 3: Type check**

Run: `npm run type-check`

Expected: No TypeScript errors

**Step 4: Coverage check**

Run: `npm run test:coverage`

Expected: Coverage >80% overall, >90% for modified services

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final build verification for healing economy redesign

All tests passing, coverage targets met, build succeeds."
```

---

## Success Criteria

### Implementation Complete
- ✅ 4 healing tiers implemented (MINOR, MEDIUM, MAJOR, SUPERIOR)
- ✅ Depth-based spawn rate formulas implemented
- ✅ Depth-based regeneration scaling implemented
- ✅ Depth filtering for potions implemented

### Tests Passing
- ✅ All unit tests pass (calculateHealingSpawnRate, calculateRegenTurns, filterByDepth)
- ✅ All integration tests pass (regen progression, depth filtering)
- ✅ All statistical tests pass (spawn rate distribution)
- ✅ Coverage >80% overall, >90% for ItemSpawnService and RegenerationService

### Gameplay Validation
- ✅ Depth 1: 5-6 healing potions per 5 levels (vs 0-2 previously)
- ✅ Depth 26: 6-7 healing potions per 5 levels
- ✅ Regeneration 50% faster at depth 26 (5 turns/HP vs 10 turns/HP)
- ✅ Healing potions cover 50-100% of typical combat damage

### Balance Confirmed
- ✅ No resource starvation at any depth
- ✅ Healing doesn't trivialize combat
- ✅ Resting remains tactical choice
- ✅ Progression feels smooth and rewarding

---

## Estimated Time

- **Task 1**: 15 minutes (data changes)
- **Task 2**: 30 minutes (healing spawn rate method + tests)
- **Task 3**: 45 minutes (regeneration scaling + tests)
- **Task 4**: 20 minutes (update callers)
- **Task 5**: 20 minutes (regen progression tests)
- **Task 6**: 30 minutes (depth filtering + tests)
- **Task 7**: 30 minutes (statistical tests)
- **Task 8**: 15 minutes (coverage check)
- **Task 9**: 20 minutes (type updates)
- **Task 10**: 30 minutes (manual testing)
- **Task 11**: 20 minutes (verification)
- **Task 12**: 10 minutes (final build)

**Total: ~4.5 hours**

---

## Notes for Implementation

- **TDD Approach**: Write tests before implementation where possible
- **Commit Often**: Commit after each task completion
- **Verify Incrementally**: Run tests after each change
- **Ask Questions**: Stop if any step is unclear or blocked
- **Follow DRY**: Reuse existing depth-based scaling patterns
- **Maintain YAGNI**: Only implement what the design specifies

**Reference Skills:**
- @superpowers:test-driven-development for TDD workflow
- @superpowers:systematic-debugging if tests fail unexpectedly
- @superpowers:verification-before-completion before marking task complete
