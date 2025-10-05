import { Player, Position, Level, Door, Trap, DoorState } from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { DoorService } from '@services/DoorService'

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface SearchResult {
  found: boolean
  type: 'door' | 'trap' | null
  position: Position | null
  message: string
  updatedLevel: Level
}

// ============================================================================
// SEARCH SERVICE - Secret door and trap detection
// ============================================================================

export class SearchService {
  constructor(
    private random: IRandomService,
    private doorService: DoorService
  ) {}

  /**
   * Search for secrets (doors and traps) adjacent to player position
   * Returns complete result with found status, type, position, message, and updated level
   *
   * @param player - Player performing search (level affects find chance)
   * @param playerPosition - Position to search from
   * @param level - Current level to search
   * @returns SearchResult with all information needed by command
   */
  searchForSecrets(
    player: Player,
    playerPosition: Position,
    level: Level
  ): SearchResult {
    const adjacentPositions = this.getAdjacentPositions(playerPosition)

    // Check for secret doors first (priority over traps)
    const doorResult = this.findSecretDoor(adjacentPositions, level, player)
    if (doorResult) {
      return doorResult
    }

    // Check for traps
    const trapResult = this.findTrap(adjacentPositions, level, player)
    if (trapResult) {
      return trapResult
    }

    // Nothing found
    return {
      found: false,
      type: null,
      position: null,
      message: 'You search but find nothing.',
      updatedLevel: level,
    }
  }

  /**
   * Find secret door in adjacent positions
   * @returns SearchResult if door found and revealed, null otherwise
   */
  private findSecretDoor(
    adjacentPositions: Position[],
    level: Level,
    player: Player
  ): SearchResult | null {
    for (const pos of adjacentPositions) {
      const secretDoor = this.getSecretDoorAt(level, pos)

      if (secretDoor) {
        const findChance = this.calculateFindChance(player.level)
        if (this.random.chance(findChance)) {
          // Use DoorService to reveal door (handles tile updates)
          const updatedLevel = this.doorService.revealSecretDoor(level, secretDoor)

          return {
            found: true,
            type: 'door',
            position: pos,
            message: 'You found a secret door!',
            updatedLevel,
          }
        }
      }
    }
    return null
  }

  /**
   * Find trap in adjacent positions
   * @returns SearchResult if trap found and revealed, null otherwise
   */
  private findTrap(
    adjacentPositions: Position[],
    level: Level,
    player: Player
  ): SearchResult | null {
    for (const pos of adjacentPositions) {
      const trap = this.getTrapAt(level, pos)

      if (trap) {
        const findChance = this.calculateFindChance(player.level)
        if (this.random.chance(findChance)) {
          const updatedLevel = this.revealTrap(level, trap)

          return {
            found: true,
            type: 'trap',
            position: pos,
            message: `You found a ${trap.type.toLowerCase()} trap!`,
            updatedLevel,
          }
        }
      }
    }
    return null
  }

  /**
   * Get undiscovered secret door at position
   * @returns Door if secret door exists and not discovered, null otherwise
   */
  private getSecretDoorAt(level: Level, position: Position): Door | null {
    return (
      level.doors.find(
        (d) =>
          d.position.x === position.x &&
          d.position.y === position.y &&
          d.state === DoorState.SECRET &&
          !d.discovered
      ) || null
    )
  }

  /**
   * Get undiscovered trap at position
   * @returns Trap if exists and not discovered, null otherwise
   */
  private getTrapAt(level: Level, position: Position): Trap | null {
    return (
      level.traps.find(
        (t) =>
          t.position.x === position.x &&
          t.position.y === position.y &&
          !t.discovered
      ) || null
    )
  }

  /**
   * Reveal trap by marking as discovered
   * Returns new Level with updated trap state (immutable)
   */
  private revealTrap(level: Level, trap: Trap): Level {
    const updatedTraps = level.traps.map((t) =>
      t.position.x === trap.position.x && t.position.y === trap.position.y
        ? { ...t, discovered: true }
        : t
    )

    return {
      ...level,
      traps: updatedTraps,
    }
  }

  /**
   * Calculate probability of finding secret based on player level
   * Base 50% + 5% per player level
   *
   * @param playerLevel - Player's current level
   * @returns Probability between 0 and 1
   */
  private calculateFindChance(playerLevel: number): number {
    return 0.5 + playerLevel * 0.05
  }

  /**
   * Get positions adjacent to given position (4 cardinal directions)
   *
   * @param position - Center position
   * @returns Array of 4 adjacent positions [left, right, up, down]
   */
  private getAdjacentPositions(position: Position): Position[] {
    return [
      { x: position.x - 1, y: position.y }, // Left
      { x: position.x + 1, y: position.y }, // Right
      { x: position.x, y: position.y - 1 }, // Up
      { x: position.x, y: position.y + 1 }, // Down
    ]
  }
}
