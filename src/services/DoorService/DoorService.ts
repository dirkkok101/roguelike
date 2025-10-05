import { Level, Door, Position, DoorState, Monster, Tile } from '@game/core/core'

// ============================================================================
// DOOR SERVICE - All door manipulation logic
// ============================================================================

export class DoorService {
  /**
   * Opens a door, updating door state and tile properties
   * @returns Updated level with door opened
   */
  openDoor(level: Level, door: Door): Level {
    // Update door state to OPEN
    const updatedDoor = { ...door, state: DoorState.OPEN }
    const updatedDoors = level.doors.map((d) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    // Update tile properties for FOV
    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = "'"
    tile.walkable = true
    tile.transparent = true

    return {
      ...level,
      doors: updatedDoors,
      tiles: updatedTiles,
    }
  }

  /**
   * Closes a door, updating door state and tile properties
   * @returns Updated level with door closed
   */
  closeDoor(level: Level, door: Door): Level {
    // Update door state to CLOSED
    const updatedDoor = { ...door, state: DoorState.CLOSED }
    const updatedDoors = level.doors.map((d) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    // Update tile properties for FOV
    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = '+'
    tile.walkable = true
    tile.transparent = false

    return {
      ...level,
      doors: updatedDoors,
      tiles: updatedTiles,
    }
  }

  /**
   * Reveals a secret door, making it visible and updating tile
   * @returns Updated level with secret door revealed
   */
  revealSecretDoor(level: Level, door: Door): Level {
    // Mark door as discovered
    const revealedDoor = { ...door, discovered: true }
    const updatedDoors = level.doors.map((d) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? revealedDoor : d
    )

    // Update tile to show door (closed secret door becomes visible closed door)
    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = '+'
    tile.walkable = true
    tile.transparent = false

    return {
      ...level,
      doors: updatedDoors,
      tiles: updatedTiles,
    }
  }

  /**
   * Finds door at specific position
   * @returns Door if found, null otherwise
   */
  getDoorAt(level: Level, position: Position): Door | null {
    return (
      level.doors.find((d) => d.position.x === position.x && d.position.y === position.y) || null
    )
  }

  /**
   * Validates if door can be opened
   * @returns Validation result with reason if cannot open
   */
  canOpenDoor(door: Door | null): { canOpen: boolean; reason?: string } {
    if (!door) {
      return { canOpen: false, reason: 'There is no door there.' }
    }

    switch (door.state) {
      case DoorState.OPEN:
      case DoorState.BROKEN:
      case DoorState.ARCHWAY:
        return { canOpen: false, reason: 'That door is already open.' }

      case DoorState.LOCKED:
        return { canOpen: false, reason: 'The door is locked. You need a key.' }

      case DoorState.SECRET:
        if (!door.discovered) {
          return { canOpen: false, reason: 'There is no door there.' }
        }
        // If discovered, can be opened
        return { canOpen: true }

      case DoorState.CLOSED:
        return { canOpen: true }

      default:
        return { canOpen: false, reason: 'Cannot open this door.' }
    }
  }

  /**
   * Validates if door can be closed (checks for blocking monsters)
   * @returns Validation result with reason if cannot close
   */
  canCloseDoor(door: Door | null, level: Level, position: Position): {
    canClose: boolean
    reason?: string
  } {
    if (!door) {
      return { canClose: false, reason: 'There is no door there.' }
    }

    switch (door.state) {
      case DoorState.CLOSED:
      case DoorState.LOCKED:
        return { canClose: false, reason: 'That door is already closed.' }

      case DoorState.BROKEN:
        return { canClose: false, reason: 'The door is broken and cannot be closed.' }

      case DoorState.ARCHWAY:
        return { canClose: false, reason: 'There is no door to close, only an archway.' }

      case DoorState.OPEN:
        // Check if monster is blocking
        const monsterBlocking = level.monsters.some(
          (m) => m.position.x === position.x && m.position.y === position.y
        )
        if (monsterBlocking) {
          return { canClose: false, reason: 'There is a monster in the way!' }
        }
        return { canClose: true }

      default:
        return { canClose: false, reason: 'Cannot close this door.' }
    }
  }
}
