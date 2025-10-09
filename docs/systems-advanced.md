# Advanced Systems: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design/README.md) | [Architecture](./architecture.md) | [Core Systems](./systems-core.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

---

## 1. Monster AI System

### 1.1 AI Behavior Profiles

Each monster has an AI profile defining its intelligence and behavior:

```typescript
interface MonsterAIProfile {
  behavior: MonsterBehavior | MonsterBehavior[];  // Can have multiple
  intelligence: number;    // 1-10 scale
  aggroRange: number;      // Distance to wake up (tiles)
  fleeThreshold: number;   // HP % to flee (0.0-1.0)
  special: string[];       // Special behavior flags
}
```

---

### 1.2 Complete Monster AI Table

| Monster | Behavior | Intelligence | Aggro Range | Flee @ | Special Notes |
|---------|----------|--------------|-------------|--------|---------------|
| Aquator | SIMPLE | 3 | 5 | Never | Seeks armor to rust |
| Bat | ERRATIC | 2 | 8 | Never | Flying, ignores some terrain |
| Centaur | SMART | 6 | 10 | 0.20 | Good tactical sense |
| Dragon | SMART | 8 | 15 | 0.15 | Uses breath weapon tactically |
| Emu | SIMPLE | 2 | 6 | Never | Mean, always awake |
| Venus Flytrap | STATIONARY | 1 | 1 | Never | Doesn't move, holds player |
| Griffin | SMART | 7 | 12 | 0.25 | Flying, regenerates |
| Hobgoblin | SIMPLE | 4 | 7 | Never | Mean, always awake |
| Ice Monster | SIMPLE | 3 | 6 | 0.50 | Freezes then backs off |
| Jabberwock | SMART | 8 | 15 | Never | Boss-tier, very aggressive |
| Kestrel | ERRATIC | 2 | 8 | 0.40 | Mean, flying |
| Leprechaun | THIEF + GREEDY | 7 | 10 | 0.30 | Steals gold, flees after |
| Medusa | SMART | 7 | 12 | 0.30 | Confusion tactics |
| Nymph | THIEF | 6 | 10 | 0.20 | Steals item, teleports away |
| Orc | GREEDY | 5 | 8 | 0.25 | Prioritizes gold over player |
| Phantom | SMART | 6 | 12 | 0.30 | Invisible, uses stealth |
| Quagga | SIMPLE | 3 | 6 | Never | Mean, always awake |
| Rattlesnake | SIMPLE | 3 | 5 | 0.40 | Strength drain attack |
| Snake | SIMPLE | 2 | 5 | Never | Mean, always awake |
| Troll | SIMPLE | 4 | 8 | 0.20 | Regenerates, persistent |
| Ur-vile | SMART | 7 | 12 | Never | Mean, tough, smart |
| Vampire | SMART + COWARD | 7 | 12 | 0.30 | Regenerates, drains max HP |
| Wraith | SMART | 6 | 10 | 0.35 | Drains XP strategically |
| Xeroc | SIMPLE | 4 | 7 | 0.30 | Basic chaser |
| Yeti | SIMPLE | 3 | 8 | 0.25 | Two attacks |
| Zombie | SIMPLE | 1 | 6 | Never | Mean, always awake, slow |

---

### 1.3 AI Behaviors

**SMART**: Full A* pathfinding, tactical positioning
- Uses PathfindingService to find optimal path
- Navigates around obstacles intelligently
- Updates path when player moves
- Used by: Dragon, Jabberwock, Centaur, Griffin, Medusa, Wraith, Vampire, Ur-vile, Phantom

**GREEDY**: Prioritizes gold over player, uses A*
- Checks for nearby gold piles
- If gold closer than player, goes for gold
- Otherwise chases player with A*
- Used by: Orc, Leprechaun (with THIEF)

**ERRATIC**: 100% random movement (never seeks player)
- Always picks random walkable direction
- Completely unpredictable, no player tracking
- Matches original 1980 Rogue where Bats "always moved as if confused"
- Used by: Bat, Kestrel

**SIMPLE**: Direct "greedy" movement toward player
- No pathfinding, just picks adjacent tile closest to player
- Fast but gets stuck on obstacles
- Used by: Emu, Hobgoblin, Snake, Troll, Zombie, Aquator, Ice Monster, Quagga, Rattlesnake, Yeti, Xeroc

**STATIONARY**: Doesn't move, waits for player
- Only acts when player is adjacent
- Used by: Venus Flytrap

**THIEF**: Steals item/gold, teleports, then flees using A*
- Approaches player with SMART behavior
- On contact, steals gold/item
- **Immediately teleports** to random walkable location
- Sets `hasStolen` flag true
- Flees using A* pathfinding if encountered again
- Matches original 1980 Rogue where thieves "vanished" after stealing
- Used by: Leprechaun (gold), Nymph (items)

**COWARD**: Flees when HP < threshold
- Checks HP percentage each turn
- If below fleeThreshold, enters FLEEING state
- Uses A* to find path away from player
- Used by: Vampire (combined with SMART)

---

### 1.4 MonsterAIService Implementation

**Responsibilities**: AI behavior decision-making for all monsters

**Methods**:
```typescript
class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private fov: FOVService,
    private random: IRandomService
  ) {}

  // Main decision function
  decideAction(monster: Monster, state: GameState): MonsterAction
  updateMonsterState(monster: Monster, canSeePlayer: boolean): Monster
  shouldWakeUp(monster: Monster, state: GameState): boolean

  // Behavior implementations (private)
  private smartBehavior(...)
  private greedyBehavior(...)
  private erraticBehavior(...)
  private simpleBehavior(...)
  private thiefBehavior(...)
  private stationaryBehavior(...)
}
```

**See**:
- Implementation: `src/services/MonsterAIService/MonsterAIService.ts`
- Full API: See architecture.md section 4.16

---

### 1.5 AI Decision Tree

```typescript
decideAction(monster: Monster, state: GameState): MonsterAction {
  const profile = monster.aiProfile;

  // 1. Check wake-up conditions
  if (monster.state === MonsterState.SLEEPING) {
    if (this.canSeePlayer(monster, state) ||
        this.isPlayerAdjacent(monster, state)) {
      monster.state = MonsterState.HUNTING;
    } else {
      return { type: 'wait' };
    }
  }

  // 2. Check flee condition
  const hpPercent = monster.hp / monster.maxHp;
  if (hpPercent < profile.fleeThreshold && profile.fleeThreshold > 0) {
    monster.state = MonsterState.FLEEING;
  }

  // 3. Execute behavior based on state
  switch (monster.state) {
    case MonsterState.SLEEPING:
      return { type: 'wait' };

    case MonsterState.WANDERING:
      return this.wander(monster, state);

    case MonsterState.HUNTING:
      return this.executeBehavior(monster, state, profile.behavior);

    case MonsterState.FLEEING:
      return this.flee(monster, state);
  }
}
```

---

### 1.6 Monster States

```typescript
enum MonsterState {
  SLEEPING,    // Initial, not aware of player
  WANDERING,   // Moving randomly
  HUNTING,     // Chasing player
  FLEEING,     // Running away
}
```

**State Transitions**:
- SLEEPING → HUNTING: Player enters aggro range or attacks
- HUNTING → FLEEING: HP drops below flee threshold
- FLEEING → HUNTING: HP restored above threshold (rare)

**Mean Monsters**: Always start in HUNTING state (never sleep)

---

### 1.7 Mean Monsters & Chase Probability

**MEAN Flag (Authentic Rogue ISMEAN)**: In original 1980 Rogue, monsters with the ISMEAN flag had a **67% chance per turn** to pursue the player, creating unpredictable aggression patterns.

**Modern Implementation**: `chaseChance` field in MonsterAIProfile (default 1.0 = always chase)

**Complete List** (12 MEAN monsters):
- Dragon (D), Emu (E), Griffin (G), Hobgoblin (H)
- Jabberwock (J), Kestrel (K), Orc (O), Quagga (Q)
- Snake (S), Troll (T), Ur-vile (U), Zombie (Z)

**Chase Mechanic**:
```typescript
// In decideAction(), after adjacency check but before behavior routing
const chaseChance = monster.aiProfile.chaseChance ?? 1.0
if (chaseChance === 0.0) {
  return { type: 'wait' }  // Passive monster, never chases
}
if (chaseChance < 1.0) {
  if (!this.random.chance(chaseChance)) {
    return { type: 'wait' }  // Failed chase roll - wait this turn
  }
}
// Passed roll or chaseChance = 1.0 - proceed with behavior
```

**Priority Order**:
1. **Scare scrolls** - Always flee from adjacent scrolls (highest priority)
2. **Adjacency** - Always attack if adjacent (no roll needed)
3. **Chase probability** - Roll against `chaseChance` (MEAN monsters: 67%)
4. **Behavior logic** - Execute SMART/SIMPLE/ERRATIC/etc.

**Example**:
- Dragon with `chaseChance: 0.67` rolls each turn
- **Success (67%)**: Dragon pursues using SMART behavior (A* pathfinding)
- **Failure (33%)**: Dragon waits/stands still this turn
- **Adjacent**: Dragon always attacks (no roll)

**Authentic Rogue Match**: This exactly matches 1980 Rogue's ISMEAN flag behavior, creating tactical gameplay where aggressive monsters occasionally hesitate, giving players breathing room.

---

### 1.8 Testing

See [Testing Strategy](./testing-strategy.md) - `MonsterAIService/` folder
- `smart-behavior.test.ts` - A* pathfinding AI tests
- `greedy-behavior.test.ts` - Gold-seeking tests
- `erratic-behavior.test.ts` - Random movement tests
- `thief-behavior.test.ts` - Steal and flee tests
- `wake-conditions.test.ts` - Sleep/wake mechanics
- `state-transitions.test.ts` - State machine tests

**Dependencies**: PathfindingService, RandomService

---

## 2. Pathfinding System

### 2.1 PathfindingService

**Responsibilities**: A* pathfinding for monster AI

**Methods**:
```typescript
class PathfindingService {
  findPath(
    start: Position,
    goal: Position,
    level: Level,
    options?: PathfindingOptions
  ): Position[] | null

  getNextStep(
    start: Position,
    goal: Position,
    level: Level
  ): Position | null

  isWalkable(
    position: Position,
    level: Level,
    entity?: Entity
  ): boolean

  // Heuristic distance estimation (Manhattan)
  private heuristic(a: Position, b: Position): number

  // Get valid adjacent positions
  private getNeighbors(
    position: Position,
    level: Level
  ): Position[]
}

interface PathfindingOptions {
  allowDiagonal?: boolean;
  maxPathLength?: number;
  avoidMonsters?: boolean;
  avoidTraps?: boolean;
}
```

---

### 2.2 A* Algorithm

**Core Logic**:
```
Open list: Priority queue ordered by f = g + h
  - g = cost from start to current node
  - h = heuristic estimate to goal (Manhattan distance)
Closed list: Set of evaluated positions

1. Add start to open list
2. While open list not empty:
   a. Current = node with lowest f score
   b. If current == goal, reconstruct path and return
   c. Add current to closed list
   d. For each neighbor of current:
      - Calculate g, h, f scores
      - If in closed list with lower score, skip
      - If not in open list or has better score, add/update
3. If goal never reached, return null (no path)
```

---

### 2.3 Heuristic Function

**Manhattan Distance** (for 4-directional movement):
```typescript
heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
```

**Why Manhattan?**:
- Accurate for grid-based movement without diagonals
- Fast to compute
- Admissible (never overestimates actual cost)

---

### 2.4 Optimizations

**Path Caching**:
- Cache paths for 1-2 turns
- Invalidate on level change or significant player movement
- Reduces expensive A* calls

**Early Exit**:
- Stop search when goal reached
- Don't explore entire space

**Max Path Length**:
- Configurable limit (default: 30 tiles)
- Prevents expensive searches in large open areas
- If path > max, return null (use fallback behavior)

---

### 2.5 Testing

See [Testing Strategy](./testing-strategy.md) - `PathfindingService/` folder
- `astar-algorithm.test.ts` - Core pathfinding correctness
- `obstacle-avoidance.test.ts` - Navigating around walls
- `no-path.test.ts` - Handling unreachable goals
- `path-caching.test.ts` - Cache invalidation logic

**Dependencies**: None (pure pathfinding)

---

## 3. Dungeon Generation

### 3.1 Generation Algorithm

**Approach**: Room + Corridor generation with Minimum Spanning Tree

**Goals**:
- Variable room sizes and shapes
- Multiple door types (open, closed, locked, secret, broken, archway)
- Winding corridors with natural feel
- Loops for multiple paths
- Guaranteed full connectivity (no isolated rooms)

---

### 3.2 Generation Configuration

```typescript
interface DungeonConfig {
  // Room parameters
  minRooms: 6;
  maxRooms: 12;
  minRoomWidth: 3;
  maxRoomWidth: 12;
  minRoomHeight: 3;
  maxRoomHeight: 10;
  roomPlacementAttempts: 100;

  // Door distribution
  doorTypes: {
    open: 0.40,      // 40% already open
    closed: 0.30,    // 30% closed (can open)
    locked: 0.10,    // 10% locked (need key)
    broken: 0.05,    // 5% broken (always open, can't close)
    secret: 0.10,    // 10% secret (hidden until searched)
    archway: 0.05,   // 5% archway (no door)
  };

  // Corridor parameters
  corridorWindiness: 0.3;  // 30% chance to add bend
  bendChance: 0.5;         // At each turn, 50% to bend
  allowLoops: true;        // Create loops between rooms
  loopChance: 0.3;         // 30% of non-MST edges become loops

  // Connectivity
  minDoorsPerRoom: 1;
  maxDoorsPerRoom: 4;
  ensureFullConnectivity: true;
}
```

---

### 3.3 Door Types

```typescript
enum DoorState {
  OPEN,        // Can walk through, doesn't block vision
  CLOSED,      // Auto-opens on bump or press 'o', blocks vision
  LOCKED,      // Need key to open, blocks vision, blocks movement
  BROKEN,      // Permanently open, can't close
  SECRET,      // Hidden (appears as wall '#'), found via search
  ARCHWAY,     // No door, just opening
}
```

See [Architecture](./architecture.md#door) for full data structure.

---

### 3.4 Generation Steps

```typescript
class DungeonService {
  generateLevel(depth: number, seed: string): Level {
    // 1. Initialize empty level
    const level = this.createEmptyLevel(80, 22, depth);

    // 2. Place rooms (with overlap prevention)
    const rooms = this.placeRooms(level, config);

    // 3. Build room connection graph (all possible connections)
    const graph = this.buildRoomGraph(rooms);

    // 4. Create Minimum Spanning Tree (ensures connectivity)
    const mst = this.minimumSpanningTree(graph);

    // 5. Connect MST rooms with corridors
    for (const edge of mst) {
      this.connectRooms(level, edge.roomA, edge.roomB, config);
    }

    // 6. Add loops (extra connections for alternate routes)
    if (config.allowLoops) {
      this.addLoops(level, graph, mst, config.loopChance);
    }

    // 7. Place doors at room/corridor junctions
    const doors = this.placeDoors(level, rooms, config.doorTypes);

    // 8. Verify full connectivity
    if (!this.isFullyConnected(level, rooms)) {
      this.ensureConnectivity(level, rooms);
    }

    // 9. Place stairs
    this.placeStairs(level, rooms);

    // 10. Spawn entities
    this.spawnMonsters(level, depth);
    this.spawnItems(level, depth);
    this.spawnGold(level);

    return level;
  }
}
```

**Door Placement Details**:

Doors are placed on **wall tiles** at the junction between rooms and corridors, not on floor tiles inside rooms:

```typescript
// Door positions are on the wall boundary
Top edge:    door.y = room.y - 1  (wall above room)
Bottom edge: door.y = room.y + room.height  (wall below room)
Left edge:   door.x = room.x - 1  (wall left of room)
Right edge:  door.x = room.x + room.width  (wall right of room)
```

**Auto-open Behavior** (implemented in MoveCommand):
- **CLOSED doors**: Auto-open when player walks into them (bump-to-open)
- **LOCKED doors**: Block movement, show "The door is locked" message
- **SECRET doors**: Appear as walls until discovered (search command)
- **OPEN/BROKEN/ARCHWAY**: Walkable, no interaction needed

See [Door Plan](./door_plan.md) for full implementation details (commit 980519f, f1a12aa).

---

### 3.5 Room Placement

```typescript
placeRooms(level: Level, config: DungeonConfig): Room[] {
  const rooms: Room[] = [];
  const targetCount = this.random.nextInt(config.minRooms, config.maxRooms);

  for (let attempts = 0; 
       attempts < config.roomPlacementAttempts && rooms.length < targetCount; 
       attempts++) {
    
    const width = this.random.nextInt(config.minRoomWidth, config.maxRoomWidth);
    const height = this.random.nextInt(config.minRoomHeight, config.maxRoomHeight);
    const x = this.random.nextInt(1, level.width - width - 1);
    const y = this.random.nextInt(1, level.height - height - 1);

    const newRoom = { x, y, width, height, id: rooms.length };

    // Check for overlap with existing rooms (with 1-tile buffer)
    if (!this.overlapsAny(newRoom, rooms)) {
      this.carveRoom(level, newRoom);
      rooms.push(newRoom);
    }
  }

  return rooms;
}
```

**Overlap Prevention**: Requires 1-tile buffer between rooms to ensure corridors have space.

---

### 3.6 Corridor Connection

**L-Shaped Corridors**:
```typescript
connectRooms(level: Level, roomA: Room, roomB: Room, config: DungeonConfig): void {
  const startA = this.getRandomPoint(roomA);
  const startB = this.getRandomPoint(roomB);

  // Choose random elbow point
  const useHorizontalFirst = this.random.chance(0.5);

  if (useHorizontalFirst) {
    // Go horizontal first, then vertical
    this.carveCorridor(level, startA, { x: startB.x, y: startA.y }, config.corridorWindiness);
    this.carveCorridor(level, { x: startB.x, y: startA.y }, startB, config.corridorWindiness);
  } else {
    // Go vertical first, then horizontal
    this.carveCorridor(level, startA, { x: startA.x, y: startB.y }, config.corridorWindiness);
    this.carveCorridor(level, { x: startA.x, y: startB.y }, startB, config.corridorWindiness);
  }
}
```

**Winding**:
```typescript
carveCorridor(level: Level, start: Position, end: Position, windiness: number): void {
  let current = { ...start };
  const dx = Math.sign(end.x - start.x);
  const dy = Math.sign(end.y - start.y);

  while (current.x !== end.x || current.y !== end.y) {
    level.tiles[current.x][current.y] = this.createCorridorTile();

    // Add random bends for natural feel
    if (this.random.chance(windiness)) {
      // Randomly choose direction this step
      if (this.random.chance(0.5) && current.x !== end.x) {
        current.x += dx;
      } else if (current.y !== end.y) {
        current.y += dy;
      }
    } else {
      // Standard movement
      if (dx !== 0 && current.x !== end.x) {
        current.x += dx;
      } else if (dy !== 0 && current.y !== end.y) {
        current.y += dy;
      }
    }
  }
}
```

---

### 3.7 Minimum Spanning Tree

**Prim's Algorithm**:
```typescript
minimumSpanningTree(graph: RoomGraph): Edge[] {
  const mst: Edge[] = [];
  const visited = new Set<number>();
  const edges = [...graph.edges].sort((a, b) => a.weight - b.weight);

  // Start with first room
  visited.add(0);

  while (visited.size < graph.rooms.length) {
    // Find cheapest edge connecting visited to unvisited
    const nextEdge = edges.find(e =>
      (visited.has(e.roomA) && !visited.has(e.roomB)) ||
      (visited.has(e.roomB) && !visited.has(e.roomA))
    );

    if (!nextEdge) break;

    mst.push(nextEdge);
    visited.add(nextEdge.roomA);
    visited.add(nextEdge.roomB);
  }

  return mst;
}
```

**Purpose**: Ensures all rooms are connected with minimum corridors.

---

### 3.8 Loop Generation

```typescript
addLoops(level: Level, graph: RoomGraph, mst: Edge[], loopChance: number): void {
  // Add extra connections (not in MST) to create loops
  const unusedEdges = graph.edges.filter(e => !mst.includes(e));

  for (const edge of unusedEdges) {
    if (this.random.chance(loopChance)) {
      this.connectRooms(
        level,
        graph.rooms[edge.roomA],
        graph.rooms[edge.roomB],
        this.config
      );
    }
  }
}
```

**Purpose**: Creates alternate paths, making exploration more interesting and reducing chokepoints.

---

### 3.9 Connectivity Verification

**Floodfill Check**:
```typescript
isFullyConnected(level: Level, rooms: Room[]): boolean {
  const visited = new Set<number>();
  const queue = [rooms[0].id];

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    if (visited.has(roomId)) continue;
    visited.add(roomId);

    // Find connected rooms via corridors
    const connected = this.getConnectedRooms(level, rooms[roomId], rooms);
    for (const connectedId of connected) {
      if (!visited.has(connectedId)) {
        queue.push(connectedId);
      }
    }
  }

  return visited.size === rooms.length;
}
```

If disconnected, add emergency corridors until fully connected.

---

### 3.10 Testing

See [Testing Strategy](./testing-strategy.md) - `DungeonService/` folder
- `room-generation.test.ts` - Room placement, overlap prevention
- `corridor-connection.test.ts` - L-shaped corridors, winding
- `mst-connectivity.test.ts` - Minimum spanning tree correctness
- `loop-generation.test.ts` - Loop creation
- `door-placement.test.ts` - Door type distribution
- `connectivity.test.ts` - Floodfill verification
- `seed-determinism.test.ts` - Same seed = same dungeon

**Dependencies**: RandomService

---

## 4. Debug System

**Purpose**: Development tools for testing, debugging, and rapid iteration

### 4.1 DebugService

**Responsibilities**: Debug commands, visualizations, and cheats

**Methods**:
```typescript
class DebugService {
  isEnabled: boolean;

  // Command handlers
  toggleGodMode(): void
  teleportTo(level: number): GameState
  spawnMonster(letter: string, position: Position): GameState
  spawnItem(type: ItemType, position: Position): GameState
  revealMap(state: GameState): GameState
  identifyAll(state: GameState): GameState
  showSeed(state: GameState): string
  toggleFOVDebug(): void
  toggleAIDebug(): void
  togglePathDebug(): void
  giveInfiniteLight(): GameState

  // Overlay rendering
  renderFOVOverlay(state: GameState): void
  renderPathOverlay(monsters: Monster[]): void
  renderAIStateOverlay(monsters: Monster[]): void
}
```

---

### 4.2 Debug Commands

| Key | Command | Effect |
|-----|---------|--------|
| `~` | Toggle Debug Console | Show/hide debug panel |
| `g` | God Mode | Invincible, infinite hunger/light |
| `t` | Teleport | Jump to any level |
| `m` | Spawn Monster | Create monster at cursor |
| `i` | Spawn Item | Create item at cursor |
| `v` | Reveal Map | Show entire level |
| `a` | Identify All | Reveal all item identities |
| `l` | Infinite Light | Permanent radius 3 light |
| `f` | Toggle FOV Debug | Highlight visible tiles |
| `p` | Toggle Path Debug | Show A* paths |
| `n` | Toggle AI Debug | Display monster states |

---

### 4.3 Debug Console UI

```
┌───────────────────────────────────────────┐
│ DEBUG CONSOLE (~ to toggle)               │
│ ───────────────────────────────────────── │
│ Seed: abc123def456                        │
│ Turn: 542    Depth: 5                     │
│ FOV Debug: [ON]  AI Debug: [ON]          │
│ God Mode: [OFF]                           │
│                                           │
│ COMMANDS:                                 │
│  g - Toggle god mode (invincible)         │
│  t - Teleport to level (1-10)             │
│  m - Spawn monster (letter A-Z)           │
│  i - Spawn item (type)                    │
│  v - Reveal entire map                    │
│  a - Identify all items                   │
│  l - Infinite light (radius 3)            │
│  f - Toggle FOV overlay                   │
│  p - Toggle path overlay                  │
│  n - Toggle AI state overlay              │
│                                           │
│ MONSTER AI STATES:                        │
│  D (Dragon): HUNTING, Path: 12 tiles      │
│  O (Orc): GREEDY, Target: Gold (15,8)     │
│  B (Bat): ERRATIC, Random                 │
└───────────────────────────────────────────┘
```

---

### 4.4 Visual Overlays

**FOV Overlay**:
- Highlights visible tiles in green
- Shows light radius boundary
- Displays blocked tiles in red

**Pathfinding Overlay**:
- Draws A* paths as red lines
- Shows path cost for each monster
- Indicates unreachable targets

**AI State Overlay**:
- Displays state above each monster:
  - `[S]` = SLEEPING
  - `[W]` = WANDERING
  - `[H]` = HUNTING
  - `[F]` = FLEEING
- Shows aggro range circle
- Indicates if can see player

---

### 4.5 God Mode Implementation

```typescript
applyGodMode(state: GameState): GameState {
  if (this.godMode) {
    return {
      ...state,
      player: {
        ...state.player,
        hp: 9999,
        maxHp: 9999,
        foodUnits: 9999,
        lightSource: { 
          radius: 3, 
          isPermanent: true,
          type: 'artifact',
          name: 'Debug Light'
        },
      }
    };
  }
  return state;
}
```

---

### 4.6 Testing

See [Testing Strategy](./testing-strategy.md) - `DebugService/` folder
- `god-mode.test.ts` - Invincibility, infinite resources
- `teleport.test.ts` - Level jumping
- `spawning.test.ts` - Monster/item creation
- `overlays.test.ts` - Visual debug rendering

**Dependencies**: All services (for command execution)

---

## 5. Cross-References

**Related Systems**:
- Core Systems (FOV, Lighting, Rendering): [Core Systems](./systems-core.md)
- Combat System: [Game Design - Combat](./game-design/09-combat.md)
- Data Structures: [Architecture](./architecture.md)
- Monsters: [Game Design - Monsters](./game-design/04-monsters.md)

**Testing**:
- All advanced systems have comprehensive test coverage: [Testing Strategy](./testing-strategy.md)

**Development Plan**:
- Phase 2 implements basic AI: [Plan](./plan.md#phase-2)
- Phase 3 implements dungeon generation: [Plan](./plan.md#phase-3)
- Phase 4 implements advanced AI: [Plan](./plan.md#phase-4)
