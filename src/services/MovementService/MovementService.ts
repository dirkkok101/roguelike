import { Position, Level, Player, Monster, Door, DoorState } from '@game/core/core'

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface ObstacleResult {
  type: 'none' | 'monster' | 'door' | 'wall'
  data?: Monster | Door
}

// ============================================================================
// MOVEMENT SERVICE - Position validation and collision detection
// ============================================================================

export class MovementService {
  /**
   * Check if position is walkable
   */
  isWalkable(position: Position, level: Level): boolean {
    if (!this.isInBounds(position, level)) return false

    const tile = level.tiles[position.y][position.x]
    return tile.walkable
  }

  /**
   * Check if position is within level bounds
   */
  isInBounds(position: Position, level: Level): boolean {
    return (
      position.x >= 0 &&
      position.x < level.width &&
      position.y >= 0 &&
      position.y < level.height
    )
  }

  /**
   * Get monster at position (if any)
   */
  getMonsterAt(position: Position, level: Level) {
    return level.monsters.find(
      (m) => m.position.x === position.x && m.position.y === position.y
    )
  }

  /**
   * Move player to new position
   */
  movePlayer(player: Player, newPosition: Position): Player {
    return {
      ...player,
      position: newPosition,
    }
  }

  /**
   * Calculate new position from direction
   */
  applyDirection(
    position: Position,
    direction: 'up' | 'down' | 'left' | 'right'
  ): Position {
    switch (direction) {
      case 'up':
        return { x: position.x, y: position.y - 1 }
      case 'down':
        return { x: position.x, y: position.y + 1 }
      case 'left':
        return { x: position.x - 1, y: position.y }
      case 'right':
        return { x: position.x + 1, y: position.y }
    }
  }

  /**
   * Check if position has item
   */
  hasItem(position: Position, level: Level): boolean {
    return level.items.some(
      (item) => item.position.x === position.x && item.position.y === position.y
    )
  }

  /**
   * Check if position has gold
   */
  hasGold(position: Position, level: Level): boolean {
    return level.gold.some(
      (gold) => gold.position.x === position.x && gold.position.y === position.y
    )
  }

  /**
   * Detect obstacle at target position
   * Checks for monsters, blocking doors, and walls in that order
   */
  detectObstacle(position: Position, level: Level): ObstacleResult {
    // Check for monster
    const monster = this.getMonsterAt(position, level)
    if (monster) {
      return { type: 'monster', data: monster }
    }

    // Check for blocking door
    const door = this.getDoorAt(position, level)
    if (door && this.isBlockingDoor(door)) {
      return { type: 'door', data: door }
    }

    // Check walkability (walls)
    if (!this.isWalkable(position, level)) {
      return { type: 'wall' }
    }

    return { type: 'none' }
  }

  /**
   * Get door at position (if any)
   */
  private getDoorAt(position: Position, level: Level): Door | null {
    return (
      level.doors.find(
        (d) => d.position.x === position.x && d.position.y === position.y
      ) || null
    )
  }

  /**
   * Check if door blocks movement
   * Closed, locked, or undiscovered secret doors block movement
   */
  private isBlockingDoor(door: Door): boolean {
    return (
      door.state === DoorState.CLOSED ||
      door.state === DoorState.LOCKED ||
      (door.state === DoorState.SECRET && !door.discovered)
    )
  }
}
