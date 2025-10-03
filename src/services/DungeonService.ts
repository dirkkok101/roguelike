import {
  Level,
  Room,
  Tile,
  TileType,
  Position,
  Door,
  DoorState,
  Trap,
  TrapType,
  Monster,
  MonsterBehavior,
  MonsterState,
} from '../types/core/core'
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

    // Place doors at room/corridor junctions
    const doors = this.placeDoors(rooms, corridors, tiles)

    // Place traps
    const trapCount = this.random.nextInt(2, 4) // 2-4 traps per level
    const traps = this.placeTraps(rooms, trapCount, tiles)

    // Determine stairs positions (not in starting room)
    const startRoomIndex = 0
    const stairsUpPos = depth > 1 ? this.getRandomRoomCenter(rooms[startRoomIndex]) : null
    const stairsDownIndex = rooms.length > 1 ? rooms.length - 1 : 0
    const stairsDownPos = this.getRandomRoomCenter(rooms[stairsDownIndex])

    // Spawn monsters (exclude starting room)
    const spawnRooms = rooms.slice(1) // Skip first room
    const monsterCount = Math.min(depth + 1, 7) // 2-8 monsters based on depth
    const monsters = this.spawnMonsters(spawnRooms, monsterCount, tiles, depth)

    return {
      depth,
      width: config.width,
      height: config.height,
      tiles,
      rooms,
      doors,
      traps,
      monsters,
      items: [],
      gold: [],
      stairsUp: stairsUpPos,
      stairsDown: stairsDownPos,
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

  // ============================================================================
  // DOOR PLACEMENT
  // ============================================================================

  /**
   * Place doors at room/corridor junctions
   */
  placeDoors(rooms: Room[], corridors: Corridor[], tiles: Tile[][]): Door[] {
    const doors: Door[] = []
    const doorPositions = new Set<string>()

    // For each room, find corridor entry points
    for (const room of rooms) {
      const entries = this.findRoomEntries(room, tiles)

      for (const entry of entries) {
        const key = `${entry.x},${entry.y}`
        if (!doorPositions.has(key)) {
          doorPositions.add(key)

          const door = this.createDoor(entry, room)
          doors.push(door)

          // Update tile to reflect door
          this.updateTileForDoor(tiles, door)
        }
      }
    }

    return doors
  }

  /**
   * Find corridor entry points into a room
   */
  private findRoomEntries(room: Room, tiles: Tile[][]): Position[] {
    const entries: Position[] = []

    // Check all edges of the room
    for (let x = room.x; x < room.x + room.width; x++) {
      // Top edge
      if (room.y > 0 && tiles[room.y - 1]?.[x]?.walkable) {
        entries.push({ x, y: room.y })
      }
      // Bottom edge
      if (room.y + room.height < tiles.length && tiles[room.y + room.height]?.[x]?.walkable) {
        entries.push({ x, y: room.y + room.height - 1 })
      }
    }

    for (let y = room.y; y < room.y + room.height; y++) {
      // Left edge
      if (room.x > 0 && tiles[y]?.[room.x - 1]?.walkable) {
        entries.push({ x: room.x, y })
      }
      // Right edge
      if (room.x + room.width < tiles[0].length && tiles[y]?.[room.x + room.width]?.walkable) {
        entries.push({ x: room.x + room.width - 1, y })
      }
    }

    return entries
  }

  /**
   * Create a door with random type
   */
  private createDoor(position: Position, room: Room): Door {
    const doorType = this.randomDoorType()
    const orientation = this.detectOrientation(position, room)

    return {
      position,
      state: doorType,
      discovered: doorType !== DoorState.SECRET,
      orientation,
      connectsRooms: [room.id, -1], // -1 = corridor
    }
  }

  /**
   * Randomly select door type based on probabilities
   */
  private randomDoorType(): DoorState {
    const roll = this.random.next()

    if (roll < 0.4) return DoorState.OPEN // 40%
    if (roll < 0.7) return DoorState.CLOSED // 30%
    if (roll < 0.8) return DoorState.LOCKED // 10%
    if (roll < 0.9) return DoorState.SECRET // 10%
    if (roll < 0.95) return DoorState.BROKEN // 5%
    return DoorState.ARCHWAY // 5%
  }

  /**
   * Detect door orientation based on room position
   */
  private detectOrientation(position: Position, room: Room): 'horizontal' | 'vertical' {
    // If door is on left/right edge of room, it's vertical
    if (position.x === room.x || position.x === room.x + room.width - 1) {
      return 'vertical'
    }
    // Otherwise horizontal
    return 'horizontal'
  }

  /**
   * Update tile to reflect door state
   */
  private updateTileForDoor(tiles: Tile[][], door: Door): void {
    const tile = tiles[door.position.y][door.position.x]
    if (!tile) return

    switch (door.state) {
      case DoorState.OPEN:
      case DoorState.BROKEN:
      case DoorState.ARCHWAY:
        tile.char = "'"
        tile.walkable = true
        tile.transparent = true
        break
      case DoorState.CLOSED:
      case DoorState.LOCKED:
        tile.char = '+'
        tile.walkable = true
        tile.transparent = false
        break
      case DoorState.SECRET:
        tile.char = '#'
        tile.walkable = false
        tile.transparent = false
        break
    }
  }

  // ============================================================================
  // TRAP PLACEMENT
  // ============================================================================

  /**
   * Place traps randomly in rooms and corridors
   */
  placeTraps(rooms: Room[], count: number, tiles: Tile[][]): Trap[] {
    const traps: Trap[] = []
    const trapPositions = new Set<string>()
    const trapTypes = [
      TrapType.BEAR,
      TrapType.DART,
      TrapType.TELEPORT,
      TrapType.SLEEP,
      TrapType.PIT,
    ]

    let attempts = 0
    const maxAttempts = count * 10

    while (traps.length < count && attempts < maxAttempts) {
      attempts++

      // Pick random room
      const room = rooms[this.random.nextInt(0, rooms.length - 1)]

      // Pick random position in room (avoid edges)
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)

      const key = `${x},${y}`

      // Check if position is valid
      if (
        !trapPositions.has(key) &&
        tiles[y] &&
        tiles[y][x] &&
        tiles[y][x].walkable
      ) {
        trapPositions.add(key)

        const trapType = this.random.pickRandom(trapTypes)
        traps.push({
          type: trapType,
          position: { x, y },
          discovered: false,
          triggered: false,
        })
      }
    }

    return traps
  }

  // ============================================================================
  // MONSTER SPAWNING
  // ============================================================================

  /**
   * Spawn monsters in rooms based on depth
   */
  spawnMonsters(rooms: Room[], count: number, tiles: Tile[][], depth: number): Monster[] {
    const monsters: Monster[] = []
    const monsterPositions = new Set<string>()

    // Monster templates based on depth
    const templates = [
      {
        letter: 'B',
        name: 'Bat',
        hpDice: '1d8',
        ac: 3,
        damage: '1d2',
        xpValue: 1,
        level: 1,
        behavior: MonsterBehavior.SIMPLE,
      },
      {
        letter: 'K',
        name: 'Kobold',
        hpDice: '1d4',
        ac: 7,
        damage: '1d4',
        xpValue: 1,
        level: 1,
        behavior: MonsterBehavior.SIMPLE,
      },
      {
        letter: 'S',
        name: 'Snake',
        hpDice: '1d6',
        ac: 5,
        damage: '1d3',
        xpValue: 2,
        level: 1,
        behavior: MonsterBehavior.SIMPLE,
      },
      {
        letter: 'O',
        name: 'Orc',
        hpDice: '1d8',
        ac: 6,
        damage: '1d8',
        xpValue: 5,
        level: 2,
        behavior: MonsterBehavior.SMART,
      },
      {
        letter: 'Z',
        name: 'Zombie',
        hpDice: '2d8',
        ac: 8,
        damage: '1d8',
        xpValue: 7,
        level: 2,
        behavior: MonsterBehavior.SIMPLE,
      },
      {
        letter: 'T',
        name: 'Troll',
        hpDice: '6d8',
        ac: 4,
        damage: '1d8+1d8',
        xpValue: 120,
        level: 6,
        behavior: MonsterBehavior.SMART,
      },
    ]

    // Filter templates by depth (only spawn appropriate level monsters)
    const availableTemplates = templates.filter((t) => t.level <= depth)

    let attempts = 0
    const maxAttempts = count * 10

    while (monsters.length < count && attempts < maxAttempts) {
      attempts++

      if (rooms.length === 0 || availableTemplates.length === 0) break

      // Pick random room
      const room = rooms[this.random.nextInt(0, rooms.length - 1)]

      // Pick random position in room
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)

      const key = `${x},${y}`

      // Check if position is valid
      if (!monsterPositions.has(key) && tiles[y] && tiles[y][x] && tiles[y][x].walkable) {
        monsterPositions.add(key)

        // Pick random template
        const template = this.random.pickRandom(availableTemplates)

        // Roll HP
        const hp = this.random.roll(template.hpDice)

        monsters.push({
          id: `monster-${monsters.length}-${this.random.nextInt(1000, 9999)}`,
          letter: template.letter,
          name: template.name,
          position: { x, y },
          hp,
          maxHp: hp,
          ac: template.ac,
          damage: template.damage,
          xpValue: template.xpValue,
          level: template.level,
          aiProfile: {
            behavior: template.behavior,
            intelligence: template.level,
            aggroRange: 5 + template.level,
            fleeThreshold: 0.0,
            special: [],
          },
          isAsleep: this.random.chance(0.5), // 50% start asleep
          isAwake: !this.random.chance(0.5),
          state: MonsterState.SLEEPING,
          visibleCells: new Set(),
          currentPath: null,
          hasStolen: false,
        })
      }
    }

    return monsters
  }
}
