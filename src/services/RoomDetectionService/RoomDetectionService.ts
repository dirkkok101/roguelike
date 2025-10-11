import { Position, Level } from '@game/core/core'

/**
 * RoomDetectionService - Detects connected room tiles via floodfill
 *
 * Used by FOVService in room-reveal mode to reveal entire rooms upon entry.
 */
export class RoomDetectionService {
  /**
   * Detect all connected room tiles from starting position
   *
   * @param position Starting position (player position)
   * @param level Current dungeon level
   * @returns Set of position keys (format: "x,y") for all room tiles
   *
   * Algorithm: 4-directional floodfill
   * - Start at position
   * - If not room tile, return empty set
   * - Otherwise, floodfill to all connected room tiles
   * - Stop at walls, doors, corridors (isRoom: false)
   */
  detectRoom(position: Position, level: Level): Set<string> {
    const roomTiles = new Set<string>()

    // Check if starting position is a room tile
    if (!this.isRoomTile(position, level)) {
      // Not in room - check adjacent tiles (doorway case)
      const adjacentRoomPos = this.findAdjacentRoomTile(position, level)
      if (!adjacentRoomPos) {
        return roomTiles // Not in room, not in doorway
      }
      // Start floodfill from adjacent room tile
      this.floodfill(adjacentRoomPos, level, roomTiles)
      return roomTiles
    }

    // Start floodfill from current position
    this.floodfill(position, level, roomTiles)
    return roomTiles
  }

  /**
   * Check if position is a room tile
   */
  private isRoomTile(position: Position, level: Level): boolean {
    if (
      position.x < 0 ||
      position.x >= level.width ||
      position.y < 0 ||
      position.y >= level.height
    ) {
      return false
    }

    const tile = level.tiles[position.y][position.x]
    return tile.isRoom === true
  }

  /**
   * Find adjacent room tile (for doorway case)
   */
  private findAdjacentRoomTile(position: Position, level: Level): Position | null {
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }  // West
    ]

    for (const dir of directions) {
      const adjacent: Position = {
        x: position.x + dir.x,
        y: position.y + dir.y
      }

      if (this.isRoomTile(adjacent, level)) {
        return adjacent
      }
    }

    return null
  }

  /**
   * Floodfill algorithm (4-directional)
   */
  private floodfill(start: Position, level: Level, visited: Set<string>): void {
    const queue: Position[] = [start]
    const posKey = (pos: Position) => `${pos.x},${pos.y}`

    visited.add(posKey(start))

    while (queue.length > 0) {
      const current = queue.shift()!

      // Check 4 directions
      const directions = [
        { x: 0, y: -1 }, // North
        { x: 1, y: 0 },  // East
        { x: 0, y: 1 },  // South
        { x: -1, y: 0 }  // West
      ]

      for (const dir of directions) {
        const next: Position = {
          x: current.x + dir.x,
          y: current.y + dir.y
        }

        const key = posKey(next)

        // Skip if already visited
        if (visited.has(key)) continue

        // Skip if not room tile
        if (!this.isRoomTile(next, level)) continue

        // Add to visited and queue
        visited.add(key)
        queue.push(next)
      }
    }
  }
}
