import { Room, Position, Tile } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// CORRIDOR GENERATION SERVICE - MST-based corridor generation
// ============================================================================

export interface Corridor {
  start: Position
  end: Position
  path: Position[]
}

export interface GraphNode {
  room: Room
  edges: Edge[]
}

export interface Edge {
  from: number
  to: number
  weight: number
}

export class CorridorGenerationService {
  constructor(private random: IRandomService) {}

  /**
   * Generate corridors connecting rooms using MST + optional loops
   */
  generateCorridors(rooms: Room[], loopChance: number): Corridor[] {
    if (rooms.length === 0) return []

    // Build complete connectivity graph
    const graph = this.buildRoomGraph(rooms)

    // Generate MST for guaranteed connectivity
    const mstEdges = this.generateMST(graph)

    // Create corridors from MST edges
    const corridors: Corridor[] = []
    for (const edge of mstEdges) {
      const corridor = this.createCorridor(rooms[edge.from], rooms[edge.to])
      corridors.push(corridor)
    }

    // Add extra corridors for loops
    const extraCorridors = this.generateLoops(rooms, mstEdges, loopChance)
    corridors.push(...extraCorridors)

    return corridors
  }

  /**
   * Carve corridor into tile grid
   */
  carveCorridorIntoTiles(tiles: Tile[][], corridor: Corridor, floorTile: Tile): void {
    for (const pos of corridor.path) {
      if (tiles[pos.y] && tiles[pos.y][pos.x]) {
        tiles[pos.y][pos.x] = { ...floorTile }
      }
    }
  }

  // ============================================================================
  // CONNECTIVITY GRAPH
  // ============================================================================

  /**
   * Build complete graph of room connections
   */
  buildRoomGraph(rooms: Room[]): GraphNode[] {
    const nodes: GraphNode[] = rooms.map((room) => ({
      room,
      edges: [],
    }))

    // Create edges between all pairs of rooms
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const distance = this.roomDistance(rooms[i], rooms[j])
        const edge: Edge = { from: i, to: j, weight: distance }
        nodes[i].edges.push(edge)
        nodes[j].edges.push({ from: j, to: i, weight: distance })
      }
    }

    return nodes
  }

  /**
   * Calculate Manhattan distance between room centers
   */
  private roomDistance(room1: Room, room2: Room): number {
    const center1 = this.getRoomCenter(room1)
    const center2 = this.getRoomCenter(room2)
    return Math.abs(center1.x - center2.x) + Math.abs(center1.y - center2.y)
  }

  /**
   * Get center position of room
   */
  private getRoomCenter(room: Room): Position {
    return {
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2),
    }
  }

  // ============================================================================
  // MINIMUM SPANNING TREE (Prim's Algorithm)
  // ============================================================================

  /**
   * Generate MST using Prim's algorithm
   */
  generateMST(graph: GraphNode[]): Edge[] {
    if (graph.length === 0) return []

    const mstEdges: Edge[] = []
    const visited = new Set<number>()
    const availableEdges: Edge[] = []

    // Start from first room
    visited.add(0)
    availableEdges.push(...graph[0].edges)

    while (visited.size < graph.length && availableEdges.length > 0) {
      // Sort edges by weight
      availableEdges.sort((a, b) => a.weight - b.weight)

      // Find smallest edge that connects to unvisited node
      let edgeIndex = -1
      for (let i = 0; i < availableEdges.length; i++) {
        const edge = availableEdges[i]
        if (!visited.has(edge.to)) {
          edgeIndex = i
          break
        }
      }

      if (edgeIndex === -1) break

      // Add edge to MST
      const edge = availableEdges.splice(edgeIndex, 1)[0]
      mstEdges.push(edge)
      visited.add(edge.to)

      // Add new edges from newly visited node
      for (const newEdge of graph[edge.to].edges) {
        if (!visited.has(newEdge.to)) {
          availableEdges.push(newEdge)
        }
      }
    }

    return mstEdges
  }

  // ============================================================================
  // CORRIDOR CREATION
  // ============================================================================

  /**
   * Create L-shaped corridor between two rooms
   */
  createCorridor(room1: Room, room2: Room): Corridor {
    const start = this.getRoomCenter(room1)
    const end = this.getRoomCenter(room2)
    const path: Position[] = []

    // Randomly choose horizontal-first or vertical-first
    const horizontalFirst = this.random.chance(0.5)

    if (horizontalFirst) {
      // Horizontal then vertical
      const current = { ...start }
      while (current.x !== end.x) {
        path.push({ ...current })
        current.x += current.x < end.x ? 1 : -1
      }
      while (current.y !== end.y) {
        path.push({ ...current })
        current.y += current.y < end.y ? 1 : -1
      }
      path.push({ ...current })
    } else {
      // Vertical then horizontal
      const current = { ...start }
      while (current.y !== end.y) {
        path.push({ ...current })
        current.y += current.y < end.y ? 1 : -1
      }
      while (current.x !== end.x) {
        path.push({ ...current })
        current.x += current.x < end.x ? 1 : -1
      }
      path.push({ ...current })
    }

    return { start, end, path }
  }

  // ============================================================================
  // LOOP GENERATION
  // ============================================================================

  /**
   * Generate extra corridors to create loops (alternate paths)
   */
  private generateLoops(rooms: Room[], mstEdges: Edge[], loopChance: number): Corridor[] {
    const extraCorridors: Corridor[] = []
    const mstSet = new Set(mstEdges.map((e) => `${e.from}-${e.to}`))

    // Try to add extra corridors between non-MST room pairs
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const key1 = `${i}-${j}`
        const key2 = `${j}-${i}`

        if (!mstSet.has(key1) && !mstSet.has(key2)) {
          if (this.random.chance(loopChance)) {
            const corridor = this.createCorridor(rooms[i], rooms[j])
            extraCorridors.push(corridor)
          }
        }
      }
    }

    return extraCorridors
  }
}
