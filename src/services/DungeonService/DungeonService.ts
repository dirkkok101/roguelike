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
  Weapon,
  Armor,
  Potion,
  Scroll,
  Ring,
  Food,
  Torch,
  Lantern,
  Artifact,
  OilFlask,
  PotionType,
  ScrollType,
  RingType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { RoomGenerationService, RoomGenerationConfig } from '@services/RoomGenerationService'
import {
  CorridorGenerationService,
  Corridor,
  GraphNode,
  Edge,
} from '@services/CorridorGenerationService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
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

  constructor(
    private random: IRandomService,
    monsterSpawnService: MonsterSpawnService,
    private itemData?: ItemData
  ) {
    this.roomGenerationService = new RoomGenerationService(random)
    this.corridorGenerationService = new CorridorGenerationService(random)
    this.monsterSpawnService = monsterSpawnService
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
    const floorTile = this.createFloorTile()
    for (const corridor of corridors) {
      this.corridorGenerationService.carveCorridorIntoTiles(tiles, corridor, floorTile)
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
    const stairsDownPos = depth < 10 ? this.getRandomRoomCenter(rooms[stairsDownIndex]) : null

    // Spawn monsters (exclude starting room) - delegated to MonsterSpawnService
    const spawnRooms = rooms.slice(1) // Skip first room
    const monsters = this.monsterSpawnService.spawnMonsters(spawnRooms, tiles, depth)

    // Spawn items (exclude starting room, avoid monster positions)
    const itemCount = this.random.nextInt(3, 6) // 3-6 items per level
    const items = this.spawnItems(spawnRooms, itemCount, tiles, monsters, depth)

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
      gold: [],
      stairsUp: stairsUpPos,
      stairsDown: stairsDownPos,
      explored: Array(config.height)
        .fill(null)
        .map(() => Array(config.width).fill(false)),
    }

    // Spawn Amulet of Yendor on Level 10
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
    const roll = this.random.next()

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
  // ITEM SPAWNING
  // ============================================================================

  /**
   * Spawn items in dungeon rooms with rarity-based selection
   */
  spawnItems(
    rooms: Room[],
    count: number,
    tiles: Tile[][],
    monsters: Monster[],
    depth: number
  ): Item[] {
    const items: Item[] = []
    const itemPositions = new Set<string>()

    // Build occupied positions set (monsters + items)
    monsters.forEach((m) => itemPositions.add(`${m.position.x},${m.position.y}`))

    // Rarity weights (common: 60%, uncommon: 30%, rare: 10%)
    const rarityWeights = { common: 0.6, uncommon: 0.3, rare: 0.1 }

    // Item templates - use loaded data if available, otherwise fall back to hardcoded
    const weaponTemplates =
      this.itemData?.weapons ||
      [
        { name: 'Dagger', damage: '1d6', rarity: 'common' },
        { name: 'Short Sword', damage: '1d8', rarity: 'common' },
        { name: 'Mace', damage: '2d4', rarity: 'common' },
        { name: 'Spear', damage: '2d3', rarity: 'common' },
        { name: 'Long Sword', damage: '1d12', rarity: 'uncommon' },
        { name: 'Battle Axe', damage: '2d8', rarity: 'uncommon' },
        { name: 'Flail', damage: '2d5', rarity: 'uncommon' },
        { name: 'Two-Handed Sword', damage: '3d6', rarity: 'rare' },
      ]

    const armorTemplates =
      this.itemData?.armor ||
      [
        { name: 'Leather Armor', ac: 8, rarity: 'common' },
        { name: 'Studded Leather', ac: 7, rarity: 'common' },
        { name: 'Ring Mail', ac: 7, rarity: 'uncommon' },
        { name: 'Scale Mail', ac: 6, rarity: 'uncommon' },
        { name: 'Chain Mail', ac: 5, rarity: 'uncommon' },
        { name: 'Splint Mail', ac: 4, rarity: 'rare' },
        { name: 'Plate Mail', ac: 3, rarity: 'rare' },
      ]

    const potionTemplates =
      this.itemData?.potions.map((p) => ({
        type: PotionType[p.type as keyof typeof PotionType],
        effect: p.effect,
        power: p.power,
        rarity: p.rarity,
      })) ||
      [
        { type: PotionType.HEAL, effect: 'restore_hp', power: '1d8', rarity: 'common' },
        { type: PotionType.EXTRA_HEAL, effect: 'restore_hp', power: '3d8', rarity: 'uncommon' },
        { type: PotionType.GAIN_STRENGTH, effect: 'increase_strength', power: '1', rarity: 'uncommon' },
        {
          type: PotionType.RESTORE_STRENGTH,
          effect: 'restore_strength',
          power: '1',
          rarity: 'common',
        },
        { type: PotionType.POISON, effect: 'damage', power: '1d6', rarity: 'common' },
        { type: PotionType.HASTE_SELF, effect: 'haste', power: '1d10', rarity: 'uncommon' },
        { type: PotionType.RAISE_LEVEL, effect: 'level_up', power: '1', rarity: 'rare' },
      ]

    const scrollTemplates =
      this.itemData?.scrolls.map((s) => ({
        type: ScrollType[s.type as keyof typeof ScrollType],
        effect: s.effect,
        rarity: s.rarity,
      })) ||
      [
        { type: ScrollType.IDENTIFY, effect: 'identify_item', rarity: 'common' },
        { type: ScrollType.ENCHANT_WEAPON, effect: 'enchant_weapon', rarity: 'uncommon' },
        { type: ScrollType.ENCHANT_ARMOR, effect: 'enchant_armor', rarity: 'uncommon' },
        { type: ScrollType.MAGIC_MAPPING, effect: 'reveal_map', rarity: 'uncommon' },
        { type: ScrollType.TELEPORTATION, effect: 'teleport', rarity: 'common' },
        { type: ScrollType.REMOVE_CURSE, effect: 'remove_curse', rarity: 'uncommon' },
        { type: ScrollType.SCARE_MONSTER, effect: 'scare', rarity: 'rare' },
        { type: ScrollType.HOLD_MONSTER, effect: 'hold', rarity: 'rare' },
      ]

    const ringTemplates =
      this.itemData?.rings.map((r) => ({
        type: RingType[r.type as keyof typeof RingType],
        effect: r.effect,
        rarity: r.rarity,
      })) ||
      [
        { type: RingType.PROTECTION, effect: 'ac_bonus', rarity: 'uncommon' },
        { type: RingType.REGENERATION, effect: 'regen', rarity: 'uncommon' },
        { type: RingType.ADD_STRENGTH, effect: 'strength_bonus', rarity: 'uncommon' },
        { type: RingType.SLOW_DIGESTION, effect: 'slow_hunger', rarity: 'uncommon' },
        { type: RingType.SEE_INVISIBLE, effect: 'see_invisible', rarity: 'rare' },
        { type: RingType.STEALTH, effect: 'stealth', rarity: 'rare' },
      ]

    const foodTemplates =
      this.itemData?.food.map((f) => ({
        name: f.name,
        nutrition: parseInt(f.nutrition),
        rarity: f.rarity,
      })) || [{ name: 'Food Ration', nutrition: 900, rarity: 'common' }]

    const lightSourceTemplates =
      this.itemData?.lightSources ||
      [
        { type: 'torch', name: 'Torch', radius: 2, fuel: 500, isPermanent: false, rarity: 'common' },
        { type: 'lantern', name: 'Lantern', radius: 2, fuel: 500, isPermanent: false, rarity: 'uncommon' },
        { type: 'artifact', name: 'Phial of Galadriel', radius: 3, isPermanent: true, rarity: 'legendary' },
      ]

    const consumableTemplates =
      this.itemData?.consumables ||
      [{ name: 'Oil Flask', type: 'lantern_fuel', fuelAmount: 500, rarity: 'uncommon' }]

    // Spawn items
    for (let i = 0; i < count; i++) {
      if (rooms.length === 0) break

      // Pick random room
      const room = rooms[this.random.nextInt(0, rooms.length - 1)]

      // Pick random position in room
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)
      const key = `${x},${y}`

      // Check if position is valid
      if (!itemPositions.has(key) && tiles[y] && tiles[y][x] && tiles[y][x].walkable) {
        itemPositions.add(key)

        // Roll for rarity
        const rarityRoll = this.random.chance(rarityWeights.common)
          ? 'common'
          : this.random.chance(rarityWeights.uncommon / (1 - rarityWeights.common))
            ? 'uncommon'
            : 'rare'

        // Pick item category with depth-based weights
        // Early game (1-3): More torches, no lanterns
        // Mid game (4-7): Normal torch/lantern/oil mix
        // Late game (8-10): Fewer torches, more lanterns/oil, rare artifacts
        const categories: string[] = []

        // Base categories (12 each)
        for (let j = 0; j < 12; j++) {
          categories.push('weapon', 'armor', 'potion', 'scroll', 'ring', 'food')
        }

        // Torches (depth-based)
        const torchWeight = depth <= 3 ? 20 : depth <= 7 ? 15 : 10
        for (let j = 0; j < torchWeight; j++) {
          categories.push('torch')
        }

        // Lanterns (depth-based, not in early game)
        const lanternWeight = depth <= 3 ? 0 : depth <= 7 ? 8 : 12
        for (let j = 0; j < lanternWeight; j++) {
          categories.push('lantern')
        }

        // Oil flasks (depth-based)
        const oilWeight = depth <= 3 ? 3 : depth <= 7 ? 10 : 12
        for (let j = 0; j < oilWeight; j++) {
          categories.push('oil_flask')
        }

        const category = this.random.pickRandom(categories)

        // Create item based on category and rarity
        let item: Item | null = null
        const itemId = `item-${items.length}-${this.random.nextInt(1000, 9999)}`

        switch (category) {
          case 'weapon': {
            const templates = weaponTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const bonus = rarityRoll === 'rare' ? this.random.nextInt(1, 2) : 0
              item = {
                id: itemId,
                name: bonus > 0 ? `${template.name} +${bonus}` : template.name,
                type: ItemType.WEAPON,
                identified: false,
                position: { x, y },
                damage: template.damage,
                bonus,
              } as Weapon
            }
            break
          }

          case 'armor': {
            const templates = armorTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const bonus = rarityRoll === 'rare' ? this.random.nextInt(1, 2) : 0
              item = {
                id: itemId,
                name: bonus > 0 ? `${template.name} +${bonus}` : template.name,
                type: ItemType.ARMOR,
                identified: false,
                position: { x, y },
                ac: template.ac,
                bonus,
              } as Armor
            }
            break
          }

          case 'potion': {
            const templates = potionTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Potion of ${template.type}`,
                type: ItemType.POTION,
                identified: false,
                position: { x, y },
                potionType: template.type,
                effect: template.effect,
                power: template.power,
                descriptorName: 'unknown', // Set by IdentificationService
              } as Potion
            }
            break
          }

          case 'scroll': {
            const templates = scrollTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Scroll of ${template.type}`,
                type: ItemType.SCROLL,
                identified: false,
                position: { x, y },
                scrollType: template.type,
                effect: template.effect,
                labelName: 'unknown', // Set by IdentificationService
              } as Scroll
            }
            break
          }

          case 'ring': {
            const templates = ringTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const bonus = this.random.nextInt(1, 3)
              item = {
                id: itemId,
                name: `Ring of ${template.type} +${bonus}`,
                type: ItemType.RING,
                identified: false,
                position: { x, y },
                ringType: template.type,
                effect: template.effect,
                bonus,
                materialName: 'unknown', // Set by IdentificationService
                hungerModifier: 1.5,
              } as Ring
            }
            break
          }

          case 'food': {
            const template = this.random.pickRandom(foodTemplates)
            item = {
              id: itemId,
              name: template.name,
              type: ItemType.FOOD,
              identified: false,
              position: { x, y },
              nutrition: template.nutrition,
            } as Food
            break
          }

          case 'torch': {
            // Check for artifact spawning on deep levels (8-10)
            const isArtifactLevel = depth >= 8
            const shouldSpawnArtifact = isArtifactLevel && this.random.chance(0.005) // 0.5% chance

            if (shouldSpawnArtifact) {
              // Spawn artifact light source
              const artifacts = lightSourceTemplates.filter((t) => t.rarity === 'legendary')
              if (artifacts.length > 0) {
                const artifact = this.random.pickRandom(artifacts)
                item = {
                  id: itemId,
                  name: artifact.name,
                  type: ItemType.TORCH, // Artifacts use TORCH type
                  identified: true, // Artifacts are always identified
                  position: { x, y },
                  radius: artifact.radius,
                  isPermanent: true,
                } as Artifact
              }
            } else {
              // Spawn regular torch
              const torch = lightSourceTemplates.find((t) => t.type === 'torch')
              if (torch) {
                item = {
                  id: itemId,
                  name: torch.name,
                  type: ItemType.TORCH,
                  identified: true, // Torches are always identified
                  position: { x, y },
                  fuel: torch.fuel ?? 500,
                  maxFuel: torch.fuel ?? 500,
                  radius: torch.radius,
                  isPermanent: false,
                } as Torch
              }
            }
            break
          }

          case 'lantern': {
            const lantern = lightSourceTemplates.find((t) => t.type === 'lantern')
            if (lantern) {
              item = {
                id: itemId,
                name: lantern.name,
                type: ItemType.LANTERN,
                identified: true, // Lanterns are always identified
                position: { x, y },
                fuel: lantern.fuel ?? 500,
                maxFuel: 1000, // Lanterns can hold more fuel
                radius: lantern.radius,
                isPermanent: false,
              } as Lantern
            }
            break
          }

          case 'oil_flask': {
            const oilFlask = consumableTemplates.find((t) => t.type === 'lantern_fuel')
            if (oilFlask) {
              item = {
                id: itemId,
                name: oilFlask.name,
                type: ItemType.OIL_FLASK,
                identified: true, // Oil flasks are always identified
                position: { x, y },
                fuelAmount: oilFlask.fuelAmount,
              } as OilFlask
            }
            break
          }
        }

        if (item) {
          items.push(item)
        }
      }
    }

    return items
  }

  // ============================================================================
  // AMULET OF YENDOR SPAWNING
  // ============================================================================

  /**
   * Spawn Amulet of Yendor on Level 10
   * Places on walkable floor tile in last room
   */
  spawnAmulet(level: Level): Level {
    // Only spawn on Level 10
    if (level.depth !== 10) {
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
