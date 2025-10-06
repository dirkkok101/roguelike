import { Level, Position, Room, Scroll, ItemType, ScrollType } from '@game/core/core'

// ============================================================================
// LEVEL SERVICE - Level manipulation and spawn position logic
// ============================================================================

export class LevelService {
  /**
   * Get spawn position for player entering level
   * Prefers provided position (e.g., opposite stairs), falls back to room center
   */
  getSpawnPosition(level: Level, preferredPosition?: Position | null): Position {
    // Use preferred if valid
    if (preferredPosition && this.isValidSpawnPosition(level, preferredPosition)) {
      return preferredPosition
    }

    // Fallback to center of first room
    if (level.rooms.length > 0) {
      return this.getRoomCenter(level.rooms[0])
    }

    // Ultimate fallback: level center
    return {
      x: Math.floor(level.width / 2),
      y: Math.floor(level.height / 2),
    }
  }

  /**
   * Check if position is valid for spawning
   */
  private isValidSpawnPosition(level: Level, position: Position): boolean {
    if (!this.isInBounds(position, level)) {
      return false
    }

    const tile = level.tiles[position.y][position.x]
    return tile.walkable
  }

  /**
   * Get center position of room
   */
  private getRoomCenter(room: Room): Position {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    }
  }

  /**
   * Check if position is within level bounds
   */
  private isInBounds(position: Position, level: Level): boolean {
    return (
      position.x >= 0 &&
      position.x < level.width &&
      position.y >= 0 &&
      position.y < level.height
    )
  }

  // ============================================================================
  // ITEM MANIPULATION METHODS
  // ============================================================================

  /**
   * Remove an item from the level by its ID
   * Returns a new level with the item removed from items array
   */
  removeItemFromLevel(level: Level, itemId: string): Level {
    const updatedItems = level.items.filter((item) => item.id !== itemId)
    return { ...level, items: updatedItems }
  }

  // ============================================================================
  // SCROLL UTILITY METHODS
  // ============================================================================

  /**
   * Get all walkable tiles on level (for TELEPORTATION scroll)
   * Returns array of positions that are walkable and not occupied by monsters
   */
  getAllWalkableTiles(level: Level): Position[] {
    const walkableTiles: Position[] = []

    // Get all monster positions for filtering
    const monsterPositions = new Set(
      level.monsters.map(m => `${m.position.x},${m.position.y}`)
    )

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        const posKey = `${x},${y}`

        // Include if walkable and no monster
        if (tile.walkable && !monsterPositions.has(posKey)) {
          walkableTiles.push({ x, y })
        }
      }
    }

    return walkableTiles
  }

  /**
   * Get empty adjacent tiles (for CREATE_MONSTER scroll)
   * Returns walkable tiles adjacent to position with no monsters
   */
  getEmptyAdjacentTiles(position: Position, level: Level): Position[] {
    const adjacentOffsets = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                    { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
    ]

    const monsterPositions = new Set(
      level.monsters.map(m => `${m.position.x},${m.position.y}`)
    )

    const emptyTiles: Position[] = []

    for (const offset of adjacentOffsets) {
      const adjPos = {
        x: position.x + offset.dx,
        y: position.y + offset.dy,
      }

      if (!this.isInBounds(adjPos, level)) continue

      const tile = level.tiles[adjPos.y][adjPos.x]
      const posKey = `${adjPos.x},${adjPos.y}`

      if (tile.walkable && !monsterPositions.has(posKey)) {
        emptyTiles.push(adjPos)
      }
    }

    return emptyTiles
  }

  /**
   * Get all tiles on level (for MAGIC_MAPPING scroll)
   * Returns all tile positions regardless of walkability
   */
  getAllTiles(level: Level): Position[] {
    const allTiles: Position[] = []

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        allTiles.push({ x, y })
      }
    }

    return allTiles
  }

  /**
   * Check if position is inside a room (for LIGHT scroll)
   * Returns true if position is within any room's bounds
   */
  isInRoom(position: Position, level: Level): boolean {
    for (const room of level.rooms) {
      if (
        position.x >= room.x &&
        position.x < room.x + room.width &&
        position.y >= room.y &&
        position.y < room.y + room.height
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Get all tiles in room containing position (for LIGHT scroll)
   * Uses flood-fill to find all connected floor tiles in room
   * Returns empty array if position not in a room
   */
  getRoomTiles(position: Position, level: Level): Position[] {
    // Check if in a room first
    if (!this.isInRoom(position, level)) {
      return []
    }

    const roomTiles: Position[] = []
    const visited = new Set<string>()
    const queue: Position[] = [position]

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = `${current.x},${current.y}`

      if (visited.has(key)) continue
      visited.add(key)

      if (!this.isInBounds(current, level)) continue

      const tile = level.tiles[current.y][current.x]

      // Only include floor tiles (not walls, corridors)
      if (tile.type === 'FLOOR') {
        roomTiles.push(current)

        // Add adjacent tiles to queue (4-directional)
        queue.push({ x: current.x + 1, y: current.y })
        queue.push({ x: current.x - 1, y: current.y })
        queue.push({ x: current.x, y: current.y + 1 })
        queue.push({ x: current.x, y: current.y - 1 })
      }
    }

    return roomTiles
  }

  // ============================================================================
  // SCARE_MONSTER SCROLL HELPERS
  // ============================================================================

  /**
   * Get all SCARE_MONSTER scrolls currently on the ground
   */
  getScareScrollsOnGround(level: Level): Scroll[] {
    return level.items.filter(
      (item) =>
        item.type === ItemType.SCROLL &&
        (item as Scroll).scrollType === ScrollType.SCARE_MONSTER
    ) as Scroll[]
  }

  /**
   * Check if there's a SCARE_MONSTER scroll at the given position
   */
  hasScareScrollAt(level: Level, position: Position): boolean {
    return level.items.some(
      (item) =>
        item.type === ItemType.SCROLL &&
        (item as Scroll).scrollType === ScrollType.SCARE_MONSTER &&
        item.position?.x === position.x &&
        item.position?.y === position.y
    )
  }

  /**
   * Get positions of all SCARE_MONSTER scrolls as a Set for O(1) lookup
   * Returns Set<string> where each string is "x,y"
   */
  getScareScrollPositions(level: Level): Set<string> {
    const positions = new Set<string>()
    const scareScrolls = this.getScareScrollsOnGround(level)

    for (const scroll of scareScrolls) {
      if (scroll.position) {
        positions.add(`${scroll.position.x},${scroll.position.y}`)
      }
    }

    return positions
  }
}
