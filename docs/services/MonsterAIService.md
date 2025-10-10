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

**Wake Conditions**:
1. **Proximity**: Player within `aiProfile.aggroRange`
2. **Running Detection**: Effective range increases by 50% when player running
3. **Ring of Stealth**: Prevents adjacent wake-ups (but not proximity at range)

**State Transition**: `SLEEPING` → `HUNTING`

**Running Detection**:
```typescript
const baseAggroRange = monster.aiProfile.aggroRange
const runningMultiplier = state.player.isRunning ? 1.5 : 1.0
const effectiveAggroRange = Math.round(baseAggroRange * runningMultiplier)

const distance = manhattanDistance(monster.position, state.player.position)
if (distance <= effectiveAggroRange) {
  // Wake monster
}
```

**Example**:
```typescript
// Normal movement (player.isRunning = false)
const orc = { ...monster, aiProfile: { aggroRange: 5 } }
const updated = service.checkWakeUp(orc, state)
// Wakes if player within 5 tiles

// Running (player.isRunning = true)
const stateRunning = { ...state, player: { ...state.player, isRunning: true } }
const updated2 = service.checkWakeUp(orc, stateRunning)
// Wakes if player within 8 tiles (5 × 1.5 = 7.5 → 8)
```

**ERRATIC Monsters Exception**:
- Bat and Kestrel have `aggroRange: 0`
- **Never wake from proximity** (always move randomly)
- Authentic Rogue behavior where Bats "always moved as if confused"

---

### Door Slam Wake Mechanic

#### `wakeRoomMonsters(level: Level, roomIds: number[]): { updatedMonsters: Monster[], wokeMonsters: Monster[] }`
Wakes all sleeping monsters in specified rooms (door slam mechanic).

**Called by**: MoveCommand when door slam pattern detected

**Parameters**:
- `level`: Current dungeon level
- `roomIds`: Array of room IDs to wake (from door's `connectsRooms`)

**Returns**:
- `updatedMonsters`: New monster array with woken monsters
- `wokeMonsters`: Array of monsters that were woken (for messaging)

**Algorithm**:
1. Create set of target room IDs for fast lookup
2. Map over all monsters:
   - If already awake, return unchanged
   - Find monster's current room using `findMonsterRoom()`
   - If room ID matches target rooms, wake monster (SLEEPING → HUNTING)
   - Otherwise return unchanged
3. Collect woken monsters for message generation

**Example**:
```typescript
// Door at (5,5) connects rooms 0 and 1
const door = {
  position: { x: 5, y: 5 },
  connectsRooms: [0, 1]
}

// Player door slammed (returned to door position)
const wakeResult = service.wakeRoomMonsters(level, door.connectsRooms)

// wakeResult.wokeMonsters: [orc, hobgoblin] (in rooms 0 and 1)
// Monster in room 2: still asleep (not connected by this door)
```

**Selective Waking**:
- Only wakes monsters in rooms connected by specific door
- Monsters in other rooms remain asleep
- Allows tactical control of which monsters wake

**Immutability**:
- Returns new monster array (does not mutate level.monsters)
- Caller must update state: `{ ...level, monsters: wakeResult.updatedMonsters }`

**Helper Method**:
```typescript
private findMonsterRoom(monster: Monster, rooms: Room[]): Room | null {
  for (const room of rooms) {
    if (
      monster.position.x >= room.x &&
      monster.position.x < room.x + room.width &&
      monster.position.y >= room.y &&
      monster.position.y < room.y + room.height
    ) {
      return room
    }
  }
  return null
}
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

**Decision Process** (priority order):
1. If asleep → `wait`
2. Check for adjacent SCARE_MONSTER scrolls → `flee`
3. If adjacent to player → `attack`
4. **Chase probability check** (MEAN monsters: 67% chance per turn)
5. Route to behavior-specific logic
6. Return action

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

### ERRATIC - 100% Random (Authentic Rogue)

**Implementation**:
```typescript
private erraticBehavior(monster: Monster, _playerPos: Position, level: Level): MonsterAction {
  // Always move randomly (matches original Rogue behavior)
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

  // Check if walkable
  const tile = level.tiles[target.y]?.[target.x]
  if (tile?.walkable) {
    return { type: 'move', target }
  }

  return { type: 'wait' }
}
```

**Used By**: Bat, Kestrel (flying creatures)

**Characteristics**:
- **100% random movement** (never seeks player)
- Matches original Rogue where Bats "always moved as if confused"
- Completely unpredictable
- Simulates erratic flying/darting behavior
- Can accidentally move toward or away from player

**Authentic Rogue Behavior**: In the original 1980 Rogue, Bats always moved randomly, creating frustrating encounters where they were hard to hit.

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

### THIEF - Steal, Teleport, and Flee (Authentic Rogue)

**Implementation**:
```typescript
private thiefBehavior(monster: Monster, playerPos: Position, level: Level): MonsterAction {
  if (monster.hasStolen) {
    // Already stole, flee from player on foot
    // (Teleportation happens immediately after stealing in MonsterTurnService)
    return this.fleeBehavior(monster, playerPos, level)
  }

  // Otherwise, approach player using A* to get close enough to steal
  // (Actual stealing and teleportation happen when adjacent in MonsterTurnService)
  return this.smartBehavior(monster, playerPos, level)
}
```

**Used By**: Leprechaun (steals gold), Nymph (steals items)

**Workflow**:
1. **Approach**: Uses SMART behavior to get adjacent to player
2. **Steal**: Steals when adjacent (handled in MonsterTurnService)
3. **Teleport**: Immediately teleports to random walkable location (MonsterTurnService)
4. **Flee**: If encountered again, flees on foot using this behavior

**Characteristics**:
- Uses A* pathfinding to approach player intelligently
- **Teleports after stealing** (matches original Rogue where thieves "vanished")
- Switches to FLEEING state after theft
- Never fights, only steals
- Teleport avoids current position (always moves away)

**Authentic Rogue Behavior**: In the original 1980 Rogue, Leprechauns and Nymphs were stationary monsters that would "disappear" after stealing, simulated here by teleportation.

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

## Chase Probability (MEAN Monsters - Authentic Rogue)

**MEAN Flag**: In original 1980 Rogue, monsters with the ISMEAN flag had a **67% chance per turn** to pursue the player.

**Modern Implementation**: `chaseChance` field in monster AIProfile

**Affected Monsters** (12 total):
- Dragon, Emu, Griffin, Hobgoblin, Jabberwock, Kestrel
- Orc, Quagga, Snake, Troll, Ur-vile, Zombie

**Decision Logic**:
```typescript
// Chase probability check (before behavior routing)
const chaseChance = monster.aiProfile.chaseChance ?? 1.0

if (chaseChance === 0.0) {
  // 0% chase chance - passive monster, never chases
  return { type: 'wait' }
}

if (chaseChance < 1.0) {
  if (!this.random.chance(chaseChance)) {
    // Failed chase roll - monster doesn't pursue this turn
    return { type: 'wait' }
  }
}

// Chase roll succeeded or chaseChance === 1.0 - continue to behavior
```

**Priority**: Chase probability is checked **AFTER** adjacency but **BEFORE** behavior routing
- Adjacent monsters always attack (no roll needed)
- Non-adjacent MEAN monsters must pass 67% roll to pursue

**Example**: Hobgoblin 5 tiles away from player
- Turn 1: Roll 0.45 ≤ 0.67 → **Pursues** (moves closer)
- Turn 2: Roll 0.80 > 0.67 → **Waits** (stands still)
- Turn 3: Roll 0.32 ≤ 0.67 → **Pursues** (moves closer)

**Balance Impact**: MEAN monsters feel less relentless, giving player breathing room

**Authentic Rogue Behavior**: This matches the original Rogue's ISMEAN flag exactly (67% chance), creating the same tactical dynamics players experienced in 1980.

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

## Authentic Rogue (1980) vs Modern Enhancements

This implementation **balances authentic Rogue behavior with modern AI improvements**.

### Authentic Behaviors Preserved

**From Original Rogue (1980)**:

1. **ISMEAN Flag → Chase Probability**
   - ✅ **67% chase chance** for MEAN monsters
   - Original: `if (rnd(100) < 67) chase_player();`
   - Modern: `if (random.chance(0.67)) pursue();`

2. **ERRATIC Movement (Bats)**
   - ✅ **100% random movement** (never seeks player)
   - Original: Bats "always moved as if confused"
   - Modern: `pickRandom(directions)` every turn

3. **THIEF Teleportation**
   - ✅ **Teleport after stealing** (Leprechaun, Nymph)
   - Original: Thieves were stationary and "vanished" after stealing
   - Modern: Teleport to random walkable location, then flee on foot

4. **GREEDY Behavior (Dragons)**
   - ✅ **Guard gold piles** (prioritize gold over player)
   - Original: Dragons had ISGREED flag, sat on gold hoards
   - Modern: Orc uses similar logic (closest target priority)

### Modern Enhancements

**New Features Not in Original Rogue**:

1. **Field of View (FOV)**
   - **Modern**: Monsters compute FOV based on aggro range
   - **Original**: Monsters always knew player position (omniscient)
   - **Why**: More realistic, enables stealth gameplay

2. **Memory Tracking**
   - **Modern**: Monsters remember last known player position (5 turns)
   - **Original**: No memory system
   - **Why**: Creates suspense (monsters patrol last seen location)

3. **A* Pathfinding (SMART behavior)**
   - **Modern**: Optimal pathfinding around obstacles
   - **Original**: Simple greedy movement (Bresenham's line algorithm)
   - **Why**: Makes boss monsters more threatening, navigates complex levels

4. **State Machine (FSM)**
   - **Modern**: SLEEPING → WANDERING → HUNTING → FLEEING states
   - **Original**: Binary asleep/awake, simple chase logic
   - **Why**: More dynamic monster behavior, better pacing

5. **4-Directional Movement**
   - **Modern**: Cardinal directions only (no diagonals)
   - **Original**: 8-directional movement
   - **Why**: Design choice for this project (simpler, clearer)

### Behavior Mapping

**Original Rogue → Modern Implementation**:

| Original Rogue | Modern Behavior | Notes |
|----------------|-----------------|-------|
| Bat (random) | ERRATIC (100%) | ✅ Authentic |
| ISMEAN flag | chaseChance: 0.67 | ✅ Authentic |
| ISGREED (Dragon) | GREEDY | ✅ Authentic |
| Leprechaun steal | THIEF + teleport | ✅ Authentic |
| Simple chase | SIMPLE | ✅ Preserved |
| - | SMART (A*) | ⭐ Enhanced |
| - | COWARD | ⭐ Enhanced |
| - | STATIONARY | ⭐ Enhanced |

### Testing Philosophy

**Test Authentic Behaviors**:
- Chase probability tests verify 67% chance exactly
- ERRATIC tests verify 100% random (no player-seeking)
- THIEF tests verify teleport after steal

**Test Modern Enhancements**:
- FOV tests verify vision radius = aggro range
- Memory tests verify 5-turn retention
- A* tests verify optimal pathfinding

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
