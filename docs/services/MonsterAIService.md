# MonsterAIService

**Location**: `src/services/MonsterAIService/MonsterAIService.ts`
**Dependencies**: PathfindingService, RandomService, FOVService
**Test Coverage**: 7 behaviors, state transitions, FOV, memory tracking

---

## Purpose

Implements **AI decision-making** for all 26 monsters. Handles 7 distinct behaviors, monster FOV computation, player memory tracking, and finite state machine for monster states.

---

## Public API

### FOV Computation

#### `computeMonsterFOV(monster: Monster, state: GameState): Monster`
Computes field of view for awake monsters.

**Vision Radius**: Uses `monster.aiProfile.aggroRange`

**Optimization**: Skips FOV for sleeping monsters

**Returns**: Monster with updated `visibleCells` set

**Example**:
```typescript
const updated = service.computeMonsterFOV(dragon, state)
// updated.visibleCells: Set<string> of visible positions
```

---

### Memory Tracking

#### `updateMonsterMemory(monster: Monster, state: GameState): Monster`
Tracks last known player position for pursuit after losing sight.

**Memory Logic**:
1. **Player in FOV**: Update `lastKnownPlayerPosition`, reset `turnsWithoutSight = 0`
2. **Player not in FOV**: Increment `turnsWithoutSight`
3. **After 5 turns**: Forget position (`lastKnownPlayerPosition = null`)

**Use Case**: Monsters pursue player to last known location after losing sight

**Example**:
```typescript
const updated = service.updateMonsterMemory(troll, state)
// If player was visible: updated.lastKnownPlayerPosition = { x: 10, y: 5 }
// After 5 turns without sight: updated.lastKnownPlayerPosition = null
```

---

### Wake-Up System

#### `checkWakeUp(monster: Monster, state: GameState): Monster`
Checks if sleeping monster should wake up.

**Wake Condition**: Player within `aiProfile.aggroRange`

**State Transition**: `SLEEPING` → `HUNTING`

**Example**:
```typescript
const updated = service.checkWakeUp(dragon, state)
// If player in range: updated.isAsleep = false, updated.state = HUNTING
```

---

### State Machine

#### `updateMonsterState(monster: Monster, state: GameState): Monster`
Updates monster state based on FSM transitions.

**Monster States**:
- **SLEEPING** - Not active, waiting for player
- **WANDERING** - Patrolling, not pursuing
- **HUNTING** - Actively pursuing player
- **FLEEING** - Running away from player

**State Transitions**:

```
SLEEPING → HUNTING     (player in aggro range)
WANDERING → HUNTING    (player in aggro range)
HUNTING → FLEEING      (COWARD at low HP OR THIEF after steal)
FLEEING → HUNTING      (COWARD HP recovered)
```

**Example**:
```typescript
// Vampire at 25% HP
const updated = service.updateMonsterState(vampire, state)
// vampire.aiProfile.fleeThreshold = 0.3
// hpPercent = 0.25 < 0.3
// Result: updated.state = FLEEING
```

---

### Action Decision

#### `decideAction(monster: Monster, state: GameState): MonsterAction`
Decides monster's action for this turn.

**Returns**:
```typescript
interface MonsterAction {
  type: 'move' | 'attack' | 'wait'
  target?: Position
}
```

**Decision Process**:
1. If asleep → `wait`
2. If adjacent to player → `attack`
3. Route to behavior-specific logic
4. Return action

**Target Selection** (smart memory tracking):
1. If player visible → use current position
2. If not visible but has last known position → pursue memory
3. Otherwise → fallback to current player position

---

## Monster Behaviors

### SMART - A* Pathfinding

**Implementation**:
```typescript
private smartBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  const nextStep = this.pathfinding.getNextStep(monster.position, playerPos, level)
  if (nextStep) {
    return { type: 'move', target: nextStep }
  }
  return { type: 'wait' }
}
```

**Used By**: Dragon, Jabberwock, Quasit (boss-tier monsters)

**Characteristics**:
- Optimal pathfinding around obstacles
- Navigates complex corridor systems
- Most dangerous behavior

---

### SIMPLE - Greedy Movement

**Implementation**:
```typescript
private simpleBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  const dx = playerPos.x - monster.position.x
  const dy = playerPos.y - monster.position.y

  // Build movement priority: primary axis first, secondary axis second
  const movements: Position[] = []

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal movement is primary (larger distance)
    if (dx !== 0) movements.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y })
    if (dy !== 0) movements.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy) })
  } else {
    // Vertical movement is primary (larger distance)
    if (dy !== 0) movements.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy) })
    if (dx !== 0) movements.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y })
  }

  // Try each movement in priority order
  for (const target of movements) {
    const tile = level.tiles[target.y]?.[target.x]
    if (tile?.walkable) {
      return { type: 'move', target }
    }
  }

  return { type: 'wait' }
}
```

**Used By**: Zombie, Troll, Orc (most common monsters)

**Characteristics**:
- Moves directly toward player
- Tries primary axis first (largest distance)
- Falls back to secondary axis if blocked
- Can get stuck at corners/walls

---

### ERRATIC - 50% Random

**Implementation**:
```typescript
private erraticBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  if (this.random.chance(0.5)) {
    // 50% random movement
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 },  // right
    ]

    const randomDir = this.random.pickRandom(directions)
    const target = {
      x: monster.position.x + randomDir.x,
      y: monster.position.y + randomDir.y,
    }

    const tile = level.tiles[target.y]?.[target.x]
    if (tile?.walkable) {
      return { type: 'move', target }
    }

    return { type: 'wait' }
  } else {
    // 50% toward player using simple behavior
    return this.simpleBehavior(monster, playerPos, level)
  }
}
```

**Used By**: Bat, Kestrel (flying creatures)

**Characteristics**:
- Unpredictable movement
- 50% chance to move randomly
- 50% chance to pursue player
- Simulates flying/darting behavior

---

### GREEDY - Prioritize Gold

**Implementation**:
```typescript
private greedyBehavior(monster: Monster, playerPos: Position, level: Level, state: GameState): MonsterAction {
  const nearestGold = this.findNearestGold(monster.position, level)

  if (nearestGold) {
    const goldDist = this.distance(monster.position, nearestGold)
    const playerDist = this.distance(monster.position, playerPos)

    // If gold is closer than player, go for gold
    if (goldDist < playerDist) {
      const nextStep = this.pathfinding.getNextStep(monster.position, nearestGold, level)
      if (nextStep) {
        return { type: 'move', target: nextStep }
      }
    }
  }

  // No gold or player is closer - use simple behavior toward player
  return this.simpleBehavior(monster, playerPos, level)
}
```

**Used By**: Orc

**Characteristics**:
- Prioritizes nearby gold over player
- Uses A* to navigate to gold
- Switches to player if no gold or player closer
- Picks up gold when moving onto tile (handled in MonsterTurnService)

---

### THIEF - Steal and Flee

**Implementation**:
```typescript
private thiefBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  if (monster.hasStolen) {
    // Already stole, flee from player
    return this.fleeBehavior(monster, playerPos, level)
  }

  // Otherwise, approach player using A* to get close enough to steal
  return this.smartBehavior(monster, playerPos, level)
}
```

**Used By**: Leprechaun (steals gold), Nymph (steals items)

**Characteristics**:
- Uses SMART behavior to approach player
- Steals when adjacent (handled in SpecialAbilityService)
- Switches to FLEEING after theft
- Never fights, only steals

---

### STATIONARY - Never Move

**Implementation**:
```typescript
private stationaryBehavior(monster: Monster, playerPos: Position): MonsterAction {
  return { type: 'wait' }
}
```

**Used By**: Venus Flytrap

**Characteristics**:
- Never moves from spawn position
- Waits for player to come adjacent
- Attacks when player in range
- Dangerous in corridors (blocks passage)

---

### COWARD - Flee at Low HP

**Implementation**:
```typescript
private cowardBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  const hpPercent = monster.hp / monster.maxHp

  if (hpPercent < monster.aiProfile.fleeThreshold) {
    return this.fleeBehavior(monster, playerPos, level)
  }

  // Otherwise, fight intelligently using SMART behavior
  return this.smartBehavior(monster, playerPos, level)
}
```

**Used By**: Vampire

**Flee Threshold**: Usually `0.3` (30% HP)

**Characteristics**:
- Uses SMART behavior normally
- Flees when HP drops below threshold
- May re-engage if HP recovers (rare without regeneration)
- Combines intelligence with self-preservation

---

## Helper Behaviors

### Flee Behavior

```typescript
private fleeBehavior(monster: Monster, targetPos: Position, level: Level): MonsterAction {
  // Move away from target
  const dx = monster.position.x - targetPos.x
  const dy = monster.position.y - targetPos.y

  // Move in opposite direction from target
  if (Math.abs(dx) > Math.abs(dy)) {
    target = { x: monster.position.x + Math.sign(dx), y: monster.position.y }
  } else {
    target = { x: monster.position.x, y: monster.position.y + Math.sign(dy) }
  }

  // Check if walkable
  const tile = level.tiles[target.y]?.[target.x]
  if (tile?.walkable) {
    return { type: 'move', target }
  }

  // If can't flee in preferred direction, try perpendicular
  const altTarget = Math.abs(dx) > Math.abs(dy)
    ? { x: monster.position.x, y: monster.position.y + (dy > 0 ? 1 : -1) }
    : { x: monster.position.x + (dx > 0 ? 1 : -1), y: monster.position.y }

  const altTile = level.tiles[altTarget.y]?.[altTarget.x]
  if (altTile?.walkable) {
    return { type: 'move', target: altTarget }
  }

  return { type: 'wait' }
}
```

**Used By**: COWARD, THIEF

**Characteristics**:
- Moves in opposite direction from player
- Tries primary axis first
- Falls back to perpendicular if blocked
- May get cornered

---

## Helper Methods

### Find Nearest Gold

```typescript
private findNearestGold(position: Position, level: Level): Position | null {
  if (!level.gold || level.gold.length === 0) {
    return null
  }

  let nearest: Position | null = null
  let minDist = Infinity

  for (const goldPile of level.gold) {
    const dist = this.distance(position, goldPile.position)
    if (dist < minDist) {
      minDist = dist
      nearest = goldPile.position
    }
  }

  return nearest
}
```

---

### Distance Calculation

**Manhattan Distance** (matches pathfinding heuristic):

```typescript
private distance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}
```

---

### Adjacency Check

```typescript
private isAdjacent(pos1: Position, pos2: Position): boolean {
  const dx = Math.abs(pos1.x - pos2.x)
  const dy = Math.abs(pos1.y - pos2.y)
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
}
```

**Note**: 4-directional only (no diagonals)

---

## Monster State FSM

```
          ┌─────────────┐
          │  SLEEPING   │
          └──────┬──────┘
                 │ Player in aggro range
                 ↓
          ┌─────────────┐
    ┌────→│  HUNTING    │
    │     └──────┬──────┘
    │            │ COWARD at low HP
    │            │ THIEF after steal
    │            ↓
    │     ┌─────────────┐
    └─────┤  FLEEING    │
  HP      └─────────────┘
  recovers
  (COWARD)
```

---

## Aggro System

**Aggro Range**: Defined in `monster.aiProfile.aggroRange`

**Typical Ranges**:
- Small creatures (Bat): 3-4 tiles
- Medium creatures (Orc): 5-6 tiles
- Large creatures (Dragon): 7-8 tiles

**Use Cases**:
1. **Wake-up check**: Monster wakes if player within range
2. **Vision radius**: Monster FOV computed with aggro range
3. **State transitions**: WANDERING → HUNTING when player enters range

---

## Testing

**Test Files**:
- `smart-behavior.test.ts` - A* pathfinding AI
- `simple-behavior.test.ts` - Greedy movement
- `erratic-behavior.test.ts` - Random movement
- `thief-behavior.test.ts` - Steal and flee
- `coward-behavior.test.ts` - Flee at low HP
- `memory-tracking.test.ts` - Last known position
- `state-machine.test.ts` - FSM transitions

**Example Test**:
```typescript
describe('MonsterAIService - THIEF', () => {
  test('approaches player before stealing', () => {
    const leprechaun = { ...baseMonster, hasStolen: false }
    const action = service.decideAction(leprechaun, state)

    expect(action.type).toBe('move')
    // Uses SMART behavior to approach
  })

  test('flees after stealing', () => {
    const leprechaun = { ...baseMonster, hasStolen: true }
    const action = service.decideAction(leprechaun, state)

    expect(action.type).toBe('move')
    // Moves away from player
  })
})
```

---

## Related Services

- **PathfindingService** - SMART, GREEDY, THIEF behaviors use A*
- **FOVService** - Computes monster vision
- **MonsterTurnService** - Consumes actions to execute monster turns
- **SpecialAbilityService** - Handles special attacks (breath weapon, steal)

---

## Design Rationale

### Why Memory Tracking?

**Original Rogue** didn't have this - monsters always knew player position.

**Modern Enhancement**:
- More realistic AI (monsters lose track of player)
- Allows stealth/evasion gameplay
- Monsters patrol last known location (creates suspense)

### Why 7 Behaviors?

**Variety** - Each monster feels unique:
- SMART: Threatening boss encounters
- SIMPLE: Predictable fodder
- ERRATIC: Annoying fliers
- GREEDY: Tactical challenge (lure with gold)
- THIEF: Resource drain (protect gold/items)
- STATIONARY: Environmental hazard
- COWARD: Hit-and-run threat

**Balance** - Behaviors create different tactical challenges for player.
