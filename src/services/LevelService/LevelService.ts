import { Level, Position, Room } from '@game/core/core'

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
}
