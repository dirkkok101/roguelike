# PathfindingService

**Location**: `src/services/PathfindingService/PathfindingService.ts`
**Dependencies**: None
**Test Coverage**: A* algorithm, path optimization

---

## Purpose

Implements A* pathfinding algorithm for monster AI. Finds optimal paths from monsters to player (or away for fleeing monsters).

---

## Public API

### Pathfinding

#### `findPath(start: Position, goal: Position, level: Level): Position[] | null`
Finds shortest path using A* algorithm.

**Parameters**:
- `start` - Starting position (monster)
- `goal` - Target position (player)
- `level` - Current level (for walkability checks)

**Returns**: Array of positions from start to goal, or `null` if no path

**Example**:
```typescript
const path = service.findPath(
  { x: 5, y: 5 },  // Monster position
  { x: 15, y: 10 }, // Player position
  level
)
// Returns: [{x:5,y:5}, {x:6,y:5}, {x:7,y:5}, ..., {x:15,y:10}]
```

---

#### `getNextStep(start: Position, goal: Position, level: Level): Position | null`
Gets next single step toward goal (simplified wrapper).

**Returns**: Next position to move to, or `null` if no path

**Use Case**: Monster AI only needs next step, not full path

**Example**:
```typescript
const nextStep = service.getNextStep(monsterPos, playerPos, level)
// Returns: {x: 6, y: 5} (one step toward player)
```

---

## A* Algorithm

**Classic pathfinding algorithm** - industry standard for game AI.

### Node Structure
```typescript
interface PathNode {
  position: Position
  g: number  // Cost from start (steps taken)
  h: number  // Heuristic to goal (estimated remaining)
  f: number  // Total cost (g + h)
  parent: PathNode | null  // For path reconstruction
}
```

### Cost Functions

**G-Cost**: Actual distance from start
```typescript
g = current.g + 1  // Each step costs 1
```

**H-Cost**: Manhattan distance heuristic
```typescript
h = |x1 - x2| + |y1 - y2|
```

**F-Cost**: Total estimated cost
```typescript
f = g + h
```

---

## Algorithm Steps

1. **Initialize** open set with start node
2. **Loop** while open set not empty:
   - Get node with lowest f-cost
   - If goal reached: reconstruct and return path
   - Add node to closed set
   - For each walkable neighbor:
     - Calculate g, h, f costs
     - Add to open set or update if better path found
3. **Return** `null` if no path found

---

## Heuristic Function

**Manhattan Distance** - optimal for 4-directional movement:

```typescript
private heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
```

**Why Manhattan?** Monsters move in cardinal directions only (no diagonals).

**Admissible**: Never overestimates actual distance (guarantees optimal path).

---

## Walkability Checks

**Walkable Tiles** (monsters can move):
- Floors
- Open doors
- Broken doors
- Archways

**Blocked Tiles** (cannot path through):
- Walls
- Closed doors (monsters can open, but pathfinding treats as obstacle)
- Locked doors
- Secret doors (undiscovered)

**Example**:
```typescript
private getNeighbors(position: Position, level: Level): Position[] {
  const neighbors = [
    { x: position.x + 1, y: position.y },  // Right
    { x: position.x - 1, y: position.y },  // Left
    { x: position.x, y: position.y + 1 },  // Down
    { x: position.x, y: position.y - 1 },  // Up
  ]

  return neighbors.filter(pos => this.isWalkable(pos, level))
}
```

---

## Path Reconstruction

After reaching goal, backtrack through parent pointers:

```typescript
private reconstructPath(node: PathNode): Position[] {
  const path: Position[] = []
  let current: PathNode | null = node

  while (current) {
    path.unshift(current.position)
    current = current.parent
  }

  return path
}
```

**Result**: Path from start to goal in correct order.

---

## Performance

**Time Complexity**: O(b^d) where b = branching factor, d = depth
- **Typical**: ~100-500 nodes checked per path
- **Worst case**: Entire level searched

**Optimization**: Sorts open set by f-cost (lowest first)

**Space Complexity**: O(n) where n = nodes in open/closed sets

---

## Usage in MonsterAIService

### SMART Monsters (A* pathfinding)
```typescript
// Monster uses A* for intelligent pathfinding
const path = this.pathfinding.findPath(monster.position, player.position, level)
if (path && path.length > 1) {
  const nextStep = path[1]  // Skip current position
  // Move monster to nextStep
}
```

### SIMPLE Monsters (greedy movement)
```typescript
// Monsters don't use pathfinding - just move toward player
const nextStep = this.getNextStep(monster.position, player.position, level)
// Move if nextStep is walkable
```

### FLEEING Monsters (reverse pathfinding)
```typescript
// Calculate path FROM player TO monster, then reverse
const pathToPlayer = this.pathfinding.findPath(monster.position, player.position, level)
// Move in opposite direction
```

---

## Path Visualization (Debug)

**Debug Overlay** shows A* paths when enabled:

```
###########
#........T#  T = Troll
#.····@...#  @ = Player
#.········#  · = A* path
###########
```

See [TogglePathDebugCommand](../commands/debug-path.md) for details.

---

## Testing

**Test Files**:
- `astar-algorithm.test.ts` - Algorithm correctness
- `path-optimization.test.ts` - Optimal path validation

**Example Test**:
```typescript
describe('PathfindingService - A*', () => {
  test('finds shortest path around wall', () => {
    // Create level with wall between start and goal
    const path = service.findPath(start, goal, level)

    expect(path).toBeDefined()
    expect(path.length).toBe(15)  // Known shortest path
    expect(path[0]).toEqual(start)
    expect(path[path.length - 1]).toEqual(goal)
  })
})
```

---

## Related Services

- **MonsterAIService** - Primary consumer of pathfinding
- **FOVService** - Monsters path toward last known player position (from FOV)
