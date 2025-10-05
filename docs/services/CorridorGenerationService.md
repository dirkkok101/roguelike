# CorridorGenerationService

**Location**: `src/services/CorridorGenerationService/CorridorGenerationService.ts`
**Dependencies**: RandomService
**Test Coverage**: MST connectivity, loop generation, corridor carving

---

## Purpose

Generates **corridors connecting rooms** using **Minimum Spanning Tree (Prim's algorithm)** for guaranteed connectivity, plus random extra corridors for loops (alternate paths).

---

## Public API

### Corridor Generation

#### `generateCorridors(rooms: Room[], loopChance: number): Corridor[]`
Generates corridors connecting all rooms with optional loops.

**Algorithm**:
1. Build complete connectivity graph (all room pairs)
2. Generate MST using Prim's algorithm (guaranteed connectivity)
3. Create L-shaped corridors from MST edges
4. Add extra corridors for loops (loopChance = 30%)

**Returns**: Array of corridors (MST + loops)

**Example**:
```typescript
const corridors = service.generateCorridors(rooms, 0.3)
// Returns: 8-12 corridors for 9 rooms
// - Minimum 8 corridors (MST: n-1 edges for n rooms)
// - Extra 0-4 corridors (30% chance for each non-MST pair)
```

---

### Carving

#### `carveCorridorIntoTiles(tiles: Tile[][], corridor: Corridor, floorTile: Tile): void`
Carves corridor path into tile grid.

**Process**: Replaces wall tiles with floor tiles along corridor path

**Example**:
```typescript
for (const corridor of corridors) {
  service.carveCorridorIntoTiles(tiles, corridor, floorTile)
}
```

---

## Data Structures

### Corridor

```typescript
interface Corridor {
  start: Position   // Room 1 center
  end: Position     // Room 2 center
  path: Position[]  // Tile positions along corridor
}
```

---

### Graph Node

```typescript
interface GraphNode {
  room: Room
  edges: Edge[]  // Connections to other rooms
}
```

---

### Edge

```typescript
interface Edge {
  from: number  // Room index
  to: number    // Room index
  weight: number  // Manhattan distance
}
```

---

## Connectivity Graph

### buildRoomGraph

```typescript
buildRoomGraph(rooms: Room[]): GraphNode[]
```

**Creates complete graph** - every room connected to every other room.

**Edge Weight**: Manhattan distance between room centers

**Example** (3 rooms):
```
Room 0: [Edge(0→1, w=10), Edge(0→2, w=15)]
Room 1: [Edge(1→0, w=10), Edge(1→2, w=8)]
Room 2: [Edge(2→0, w=15), Edge(2→1, w=8)]
```

---

### Room Distance

```typescript
private roomDistance(room1: Room, room2: Room): number {
  const center1 = this.getRoomCenter(room1)
  const center2 = this.getRoomCenter(room2)
  return Math.abs(center1.x - center2.x) + Math.abs(center1.y - center2.y)
}
```

**Manhattan Distance** - sum of horizontal and vertical distances.

**Why Manhattan?** Corridors are axis-aligned (no diagonals), so Manhattan is natural fit.

---

## Minimum Spanning Tree (Prim's Algorithm)

### generateMST

```typescript
generateMST(graph: GraphNode[]): Edge[]
```

**Prim's Algorithm** - greedy algorithm for MST.

**Guarantees**:
- All rooms connected
- Minimal total corridor length
- Exactly n-1 edges for n rooms

---

### Algorithm Steps

```
1. Start from Room 0 (arbitrary)
2. Mark Room 0 as visited
3. Add all edges from Room 0 to availableEdges
4. While not all rooms visited:
   a. Sort availableEdges by weight (shortest first)
   b. Find smallest edge connecting to unvisited room
   c. Add edge to MST
   d. Mark destination room as visited
   e. Add new edges from destination to availableEdges
5. Return MST edges
```

---

### Example MST

**Rooms**:
```
  Room 0 ──10── Room 1
     |            |
    15            8
     |            |
  Room 2 ─────────┘
```

**MST Edges** (minimize total weight):
```
Room 0 → Room 1 (weight 10)
Room 1 → Room 2 (weight 8)
Total weight: 18

(Room 0 → Room 2 edge skipped because weight 15 > 8)
```

---

## Corridor Creation

### createCorridor

```typescript
createCorridor(room1: Room, room2: Room): Corridor
```

**Creates L-shaped corridor** between two room centers.

**Path Types**:
1. **Horizontal-first** (50% chance): Move horizontally, then vertically
2. **Vertical-first** (50% chance): Move vertically, then horizontally

---

### Horizontal-First Example

**Room 1 center**: (5, 5)
**Room 2 center**: (15, 10)

**Path**:
```
(5, 5) → (6, 5) → ... → (15, 5)  ← Horizontal
  ↓
(15, 6) → (15, 7) → ... → (15, 10)  ← Vertical
```

**Result**: L-shaped corridor (elbow at (15, 5))

---

### Vertical-First Example

**Room 1 center**: (5, 5)
**Room 2 center**: (15, 10)

**Path**:
```
(5, 5) → (5, 6) → ... → (5, 10)  ← Vertical
  ↓
(6, 10) → (7, 10) → ... → (15, 10)  ← Horizontal
```

**Result**: L-shaped corridor (elbow at (5, 10))

---

### Why Random Direction?

**Variety** - Different dungeon layouts each game.

**Avoids Patterns** - Corridors don't all look the same.

**Gameplay** - Different tactical situations (corner ambushes, line-of-sight).

---

## Loop Generation

### generateLoops

```typescript
private generateLoops(rooms: Room[], mstEdges: Edge[], loopChance: number): Corridor[]
```

**Purpose**: Add extra corridors not in MST for alternate paths.

**Algorithm**:
1. Build set of MST edge keys (`"0-1"`, `"1-2"`, etc.)
2. For each room pair NOT in MST:
   - Roll loopChance (default 30%)
   - If success, create corridor
3. Return extra corridors

---

### Example Loops

**MST** (2 edges for 3 rooms):
```
Room 0 ─── Room 1
           |
        Room 2
```

**With Loop** (30% chance):
```
Room 0 ─── Room 1
  |          |
Room 2 ──────┘
```

**Benefit**: Player can reach Room 2 from Room 0 via two paths (via Room 1, or direct).

---

### Loop Probability

**loopChance = 0.3** (30%)

**For 9 rooms**:
- MST edges: 8 (n-1)
- Possible loops: (9 × 8 / 2) - 8 = 28 room pairs
- Expected loops: 28 × 0.3 ≈ 8 extra corridors

**Result**: ~16 total corridors (8 MST + 8 loops)

---

## Testing

**Test Files**:
- `mst-connectivity.test.ts` - All rooms reachable from Room 0
- `loop-generation.test.ts` - Extra corridors added
- `corridor-carving.test.ts` - Tiles correctly carved

**Example Test**:
```typescript
describe('CorridorGenerationService - MST', () => {
  test('MST connects all rooms', () => {
    const rooms = createTestRooms(9)
    const mstEdges = service.generateMST(graph)

    expect(mstEdges.length).toBe(8)  // n-1 for n=9

    // Check all rooms reachable from Room 0
    const visited = new Set<number>()
    const queue = [0]
    visited.add(0)

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const edge of mstEdges) {
        if (edge.from === current && !visited.has(edge.to)) {
          visited.add(edge.to)
          queue.push(edge.to)
        } else if (edge.to === current && !visited.has(edge.from)) {
          visited.add(edge.from)
          queue.push(edge.from)
        }
      }
    }

    expect(visited.size).toBe(9)  // All rooms reachable
  })
})
```

---

## Related Services

- **DungeonService** - Consumes corridors for level generation
- **RoomGenerationService** - Provides rooms to connect
- **RandomService** - Randomizes corridor direction and loops

---

## Design Rationale

### Why MST?

**Guaranteed Connectivity** - Every room reachable from starting room.

**Minimal Corridors** - Tree structure prevents excessive corridors (avoids "spider web" dungeon).

**Efficiency** - Prim's algorithm is O(E log E), fast for typical dungeons.

**Alternatives**:
- Delaunay Triangulation: More corridors, more complex
- Random Connections: No guarantee all rooms connected

---

### Why Loops?

**Tactical Gameplay** - Multiple paths allow:
- Escape routes when fleeing monsters
- Flanking opportunities
- Kiting strategies (circle around loop)

**Replayability** - Different loop placements each game.

**Balance** - Too few loops = linear dungeon, too many = spider web.

---

### Why L-Shaped Corridors?

**Simplicity** - Easy to generate, no pathfinding needed.

**Visual Clarity** - Players understand corridor layout.

**Compatibility** - Works with rectangular rooms and grid-based tiles.

**Alternatives**:
- Straight corridors: Requires diagonal movement or complex routing
- Winding corridors: More realistic but harder to generate

---

## Configuration Examples

### Minimal Loops (Linear Dungeon)
```typescript
const corridors = service.generateCorridors(rooms, 0.1)
// 10% loop chance → ~1-2 extra corridors
```

**Result**: Mostly tree-like structure, few alternate paths

---

### Standard Loops (Balanced)
```typescript
const corridors = service.generateCorridors(rooms, 0.3)
// 30% loop chance → ~8 extra corridors
```

**Result**: Good mix of linear and circular paths

---

### Heavy Loops (Open Dungeon)
```typescript
const corridors = service.generateCorridors(rooms, 0.6)
// 60% loop chance → ~16 extra corridors
```

**Result**: Highly connected, many alternate paths

---

## Performance

**Complexity**:
- Graph building: O(n²) where n = room count
- MST generation: O(E log E) where E = edge count = n(n-1)/2
- Corridor creation: O(n) for MST + O(n²) for loops
- Total: O(n² log n)

**Typical Performance**: < 5ms for 9 rooms

---

## Future Enhancements

- Kruskal's MST algorithm (alternative to Prim's)
- Winding corridors (add random bends)
- Themed corridors (narrow, wide, natural caves)
- Secret corridors (hidden paths)
- Locked corridors (require keys)
