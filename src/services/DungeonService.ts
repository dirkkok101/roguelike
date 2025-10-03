import { Level, Room, Tile, TileType, Position } from '../types/core/core'
import { IRandomService } from './RandomService'

// ============================================================================
// DUNGEON SERVICE - Procedural dungeon generation with MST
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

export interface DungeonConfig {
  width: number
  height: number
  minRooms: number
  maxRooms: number
  minRoomSize: number
  maxRoomSize: number
  minSpacing: number
  loopChance: number
}

export class DungeonService {
  constructor(private random: IRandomService) {}

  /**
   * Generate a complete dungeon level
   */
  generateLevel(depth: number, config: DungeonConfig): Level {
    // Initialize empty level
    const tiles = this.createEmptyTiles(config.width, config.height)

    // Place rooms
    const rooms = this.placeRooms(config)

    // Build connectivity graph
    const graph = this.buildRoomGraph(rooms)

    // Generate MST for guaranteed connectivity
    const mstEdges = this.generateMST(graph)

    // Create corridors from MST
    const corridors: Corridor[] = []
    for (const edge of mstEdges) {
      const corridor = this.createCorridor(rooms[edge.from], rooms[edge.to])
      corridors.push(corridor)
      this.carveCorridorIntoTiles(tiles, corridor)
    }

    // Add extra connections for loops
    this.addExtraConnections(rooms, mstEdges, config.loopChance, tiles)

    // Carve rooms into tiles
    for (const room of rooms) {
      this.carveRoomIntoTiles(tiles, room)
    }

    return {
      depth,
      width: config.width,
      height: config.height,
      tiles,
      rooms,
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: depth > 1 ? this.getRandomRoomCenter(rooms[0]) : null,
      stairsDown: this.getRandomRoomCenter(rooms[rooms.length - 1]),
      explored: Array(config.height)
        .fill(null)
        .map(() => Array(config.width).fill(false)),
    }
  }

  // ============================================================================
  // ROOM PLACEMENT
  // ============================================================================

  /**
   * Generate N random rooms without overlap
   */
  placeRooms(config: DungeonConfig): Room[] {
    const rooms: Room[] = []
    const numRooms = this.random.nextInt(config.minRooms, config.maxRooms)
    const maxAttempts = 100

    for (let i = 0; i < numRooms; i++) {
      let placed = false
      let attempts = 0

      while (!placed && attempts < maxAttempts) {
        const width = this.random.nextInt(config.minRoomSize, config.maxRoomSize)
        const height = this.random.nextInt(config.minRoomSize, config.maxRoomSize)
        const x = this.random.nextInt(1, config.width - width - 1)
        const y = this.random.nextInt(1, config.height - height - 1)

        const newRoom: Room = { id: i, x, y, width, height }

        if (this.canPlaceRoom(newRoom, rooms, config.minSpacing)) {
          rooms.push(newRoom)
          placed = true
        }

        attempts++
      }
    }

    return rooms
  }

  /**
   * Check if room can be placed without overlap
   */
  private canPlaceRoom(room: Room, existingRooms: Room[], minSpacing: number): boolean {
    for (const existing of existingRooms) {
      if (this.roomsOverlap(room, existing, minSpacing)) {
        return false
      }
    }
    return true
  }

  /**
   * Check if two rooms overlap with spacing buffer
   */
  private roomsOverlap(room1: Room, room2: Room, spacing: number): boolean {
    return (
      room1.x - spacing < room2.x + room2.width + spacing &&
      room1.x + room1.width + spacing > room2.x - spacing &&
      room1.y - spacing < room2.y + room2.height + spacing &&
      room1.y + room1.height + spacing > room2.y - spacing
    )
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
   * Calculate distance between room centers
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
  // CORRIDOR GENERATION
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

  /**
   * Carve corridor into tile grid
   */
  private carveCorridorIntoTiles(tiles: Tile[][], corridor: Corridor): void {
    for (const pos of corridor.path) {
      if (tiles[pos.y] && tiles[pos.y][pos.x]) {
        tiles[pos.y][pos.x] = this.createFloorTile()
      }
    }
  }

  // ============================================================================
  // LOOP GENERATION
  // ============================================================================

  /**
   * Add extra connections to prevent linear dungeons
   */
  addExtraConnections(
    rooms: Room[],
    mstEdges: Edge[],
    loopChance: number,
    tiles: Tile[][]
  ): void {
    const mstSet = new Set(mstEdges.map((e) => `${e.from}-${e.to}`))

    // Try to add extra corridors
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const key1 = `${i}-${j}`
        const key2 = `${j}-${i}`

        if (!mstSet.has(key1) && !mstSet.has(key2)) {
          if (this.random.chance(loopChance)) {
            const corridor = this.createCorridor(rooms[i], rooms[j])
            this.carveCorridorIntoTiles(tiles, corridor)
          }
        }
      }
    }
  }

  // ============================================================================
  // TILE GENERATION
  // ============================================================================

  /**
   * Create empty tile grid filled with walls
   */
  private createEmptyTiles(width: number, height: number): Tile[][] {
    return Array(height)
      .fill(null)
      .map(() => Array(width).fill(null).map(() => this.createWallTile()))
  }

  /**
   * Carve room into tile grid
   */
  private carveRoomIntoTiles(tiles: Tile[][], room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (tiles[y] && tiles[y][x]) {
          tiles[y][x] = this.createFloorTile()
        }
      }
    }
  }

  /**
   * Create wall tile
   */
  private createWallTile(): Tile {
    return {
      type: TileType.WALL,
      char: '#',
      walkable: false,
      transparent: false,
      colorVisible: '#8B7355',
      colorExplored: '#4A4A4A',
    }
  }

  /**
   * Create floor tile
   */
  private createFloorTile(): Tile {
    return {
      type: TileType.FLOOR,
      char: '.',
      walkable: true,
      transparent: true,
      colorVisible: '#A89078',
      colorExplored: '#5A5A5A',
    }
  }

  /**
   * Get random position in room center
   */
  private getRandomRoomCenter(room: Room): Position {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    }
  }
}
