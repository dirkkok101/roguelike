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
  Item,
  ItemType,
  GoldPile,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { RoomGenerationService, RoomGenerationConfig } from '@services/RoomGenerationService'
import {
  CorridorGenerationService,
  Corridor,
} from '@services/CorridorGenerationService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GoldService } from '@services/GoldService'
import { ItemData } from '../../data/ItemDataLoader'

// ============================================================================
// DUNGEON SERVICE - Procedural dungeon generation with MST
// ============================================================================

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
  private roomGenerationService: RoomGenerationService
  private corridorGenerationService: CorridorGenerationService
  private monsterSpawnService: MonsterSpawnService
  private itemSpawnService: ItemSpawnService
  private goldService: GoldService

  constructor(
    private random: IRandomService,
    monsterSpawnService: MonsterSpawnService,
    itemData: ItemData
  ) {
    this.roomGenerationService = new RoomGenerationService(random)
    this.corridorGenerationService = new CorridorGenerationService(random)
    this.monsterSpawnService = monsterSpawnService
    this.itemSpawnService = new ItemSpawnService(random, itemData)
    this.goldService = new GoldService(random)
  }

  /**
   * Generate all 26 dungeon levels at once
   *
   * Called at game initialization to create the full dungeon.
   * Levels are persistent and stored in GameState.levels array.
   *
   * @param config Dungeon configuration settings
   * @returns Array of 26 Level instances (depths 1-26)
   */
  generateAllLevels(config: DungeonConfig): Level[] {
    const levels: Level[] = []

    for (let depth = 1; depth <= 26; depth++) {
      const level = this.generateLevel(depth, config)
      levels.push(level)
    }

    return levels
  }

  /**
   * Generate a complete dungeon level
   */
  generateLevel(depth: number, config: DungeonConfig): Level {
    // Initialize empty level
    const tiles = this.createEmptyTiles(config.width, config.height)

    // Place rooms using RoomGenerationService
    const roomConfig: RoomGenerationConfig = {
      dungeonWidth: config.width,
      dungeonHeight: config.height,
      minRoomCount: config.minRooms,
      maxRoomCount: config.maxRooms,
      minRoomSize: config.minRoomSize,
      maxRoomSize: config.maxRoomSize,
      minSpacing: config.minSpacing,
    }
    const rooms = this.roomGenerationService.generateRooms(roomConfig)

    // Generate corridors connecting rooms using MST + loops
    const corridors = this.corridorGenerationService.generateCorridors(rooms, config.loopChance)

    // Carve corridors into tiles
    const corridorTile = this.createCorridorTile()
    for (const corridor of corridors) {
      this.corridorGenerationService.carveCorridorIntoTiles(tiles, corridor, corridorTile)
    }

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
    const stairsDownPos = depth < 26 ? this.getRandomRoomCenter(rooms[stairsDownIndex]) : null

    // Spawn monsters (exclude starting room) - delegated to MonsterSpawnService
    const spawnRooms = rooms.slice(1) // Skip first room
    const monsters = this.monsterSpawnService.spawnMonsters(spawnRooms, tiles, depth)

    // Spawn items (exclude starting room, avoid monster positions)
    const itemCount = this.random.nextInt(5, 8) // 5-8 items per level
    const items = this.itemSpawnService.spawnItems(spawnRooms, itemCount, tiles, monsters, depth)

    // Spawn gold (3-9 piles per level)
    const goldCount = this.random.nextInt(3, 9)
    const gold = this.spawnGold(rooms, goldCount, tiles, depth)

    // Create initial level
    const level: Level = {
      depth,
      width: config.width,
      height: config.height,
      tiles,
      rooms,
      doors,
      traps,
      monsters,
      items,
      gold,
      stairsUp: stairsUpPos,
      stairsDown: stairsDownPos,
      explored: Array(config.height)
        .fill(null)
        .map(() => Array(config.width).fill(false)),
    }

    // Spawn Amulet of Yendor on Level 26
    return this.spawnAmulet(level)
  }


  // Note: Connectivity graph, MST, and corridor generation logic moved to CorridorGenerationService

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
      isRoom: false,  // Walls are not rooms
    }
  }

  /**
   * Create floor tile (for rooms)
   */
  private createFloorTile(): Tile {
    return {
      type: TileType.FLOOR,
      char: '.',
      walkable: true,
      transparent: true,
      colorVisible: '#A89078',
      colorExplored: '#5A5A5A',
      isRoom: true,  // Floor tiles in rooms
    }
  }

  /**
   * Create corridor tile (not in a room)
   */
  private createCorridorTile(): Tile {
    return {
      type: TileType.CORRIDOR,
      char: '#',
      walkable: true,
      transparent: true,
      colorVisible: '#A89078',
      colorExplored: '#5A5A5A',
      isRoom: false,  // Corridors are not rooms
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
  placeDoors(rooms: Room[], _corridors: Corridor[], tiles: Tile[][]): Door[] {
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
      // Top edge - place door on wall tile where corridor meets room
      if (room.y > 0 && tiles[room.y - 1]?.[x]?.walkable) {
        entries.push({ x, y: room.y - 1 })
      }
      // Bottom edge - place door on wall tile where corridor meets room
      if (room.y + room.height < tiles.length && tiles[room.y + room.height]?.[x]?.walkable) {
        entries.push({ x, y: room.y + room.height })
      }
    }

    for (let y = room.y; y < room.y + room.height; y++) {
      // Left edge - place door on wall tile where corridor meets room
      if (room.x > 0 && tiles[y]?.[room.x - 1]?.walkable) {
        entries.push({ x: room.x - 1, y })
      }
      // Right edge - place door on wall tile where corridor meets room
      if (room.x + room.width < tiles[0].length && tiles[y]?.[room.x + room.width]?.walkable) {
        entries.push({ x: room.x + room.width, y })
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
    const roll = this.random.nextInt(0, 99) / 100.0 // Generates 0.00 to 0.99

    if (roll < 0.5) return DoorState.OPEN // 50%
    if (roll < 0.8) return DoorState.CLOSED // 30%
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

    // Set tile type to DOOR
    tile.type = TileType.DOOR
    tile.isRoom = false  // Doors are not room tiles

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
        tile.walkable = false
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
  // MONSTER SPAWNING (Single Monster for CREATE_MONSTER Scroll)
  // ============================================================================

  /**
   * Spawn a single monster at specific position (for CREATE_MONSTER scroll)
   * Note: Bulk monster spawning has been moved to MonsterSpawnService
   */
  spawnSingleMonster(position: Position, depth: number): Monster {
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

    // Filter templates by depth
    const availableTemplates = templates.filter((t) => t.level <= depth)
    if (availableTemplates.length === 0) {
      // Fallback to bat if no templates available
      availableTemplates.push(templates[0])
    }

    // Pick random template
    const template = this.random.pickRandom(availableTemplates)

    // Roll HP
    const hp = this.random.roll(template.hpDice)

    return {
      id: `monster-scroll-${this.random.nextInt(1000, 9999)}`,
      letter: template.letter,
      name: template.name,
      position,
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
      isAsleep: false, // Spawned monsters are awake (aggressive!)
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      energy: this.random.nextInt(0, 99),
      speed: 10,
      isInvisible: false,
      statusEffects: [], // No status effects on spawn
    }
  }


  // ============================================================================
  // GOLD SPAWNING
  // ============================================================================

  /**
   * Spawn gold piles randomly in rooms
   * Uses original Rogue 1980 GOLDCALC formula for amounts
   *
   * @param rooms All rooms in level
   * @param count Number of gold piles to spawn (3-9)
   * @param tiles Tile grid for validation
   * @param depth Dungeon depth for gold amount calculation
   * @returns Array of GoldPile objects
   */
  private spawnGold(rooms: Room[], count: number, tiles: Tile[][], depth: number): GoldPile[] {
    const gold: GoldPile[] = []
    const goldPositions = new Set<string>()

    let attempts = 0
    const maxAttempts = count * 20 // Allow more attempts to ensure placement

    while (gold.length < count && attempts < maxAttempts) {
      attempts++

      // Pick random room
      const room = rooms[this.random.nextInt(0, rooms.length - 1)]

      // Pick random position in room (avoid edges to prevent door placement)
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)

      const key = `${x},${y}`

      // Check if position is valid:
      // - Not already occupied by gold
      // - Walkable floor tile
      // - Not a door
      if (
        !goldPositions.has(key) &&
        tiles[y]?.[x] &&
        tiles[y][x].walkable &&
        tiles[y][x].type === TileType.FLOOR
      ) {
        goldPositions.add(key)

        // Calculate gold amount using Rogue 1980 formula
        const amount = this.goldService.calculateGoldAmount(depth)
        const goldPile = this.goldService.dropGold({ x, y }, amount)

        gold.push(goldPile)
      }
    }

    return gold
  }

  // ============================================================================
  // AMULET OF YENDOR SPAWNING
  // ============================================================================

  /**
   * Spawn Amulet of Yendor on Level 26
   * Places on walkable floor tile in last room
   */
  spawnAmulet(level: Level): Level {
    // Only spawn on Level 26
    if (level.depth !== 26) {
      return level
    }

    // Find walkable floor tile in last room
    const lastRoom = level.rooms[level.rooms.length - 1]
    let position: Position | null = null

    // Try to find a walkable floor tile (avoid room edges)
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = this.random.nextInt(lastRoom.x + 1, lastRoom.x + lastRoom.width - 2)
      const y = this.random.nextInt(lastRoom.y + 1, lastRoom.y + lastRoom.height - 2)

      if (level.tiles[y]?.[x]?.walkable && level.tiles[y][x].type === TileType.FLOOR) {
        position = { x, y }
        break
      }
    }

    // Fallback: use room center if no position found
    if (!position) {
      position = {
        x: lastRoom.x + Math.floor(lastRoom.width / 2),
        y: lastRoom.y + Math.floor(lastRoom.height / 2),
      }
    }

    // Create amulet item
    const amulet: Item = {
      id: `amulet_${Date.now()}`,
      name: 'Amulet of Yendor',
      type: ItemType.AMULET,
      identified: true, // Always identified
      position,
    }

    return {
      ...level,
      items: [...level.items, amulet],
    }
  }
}
