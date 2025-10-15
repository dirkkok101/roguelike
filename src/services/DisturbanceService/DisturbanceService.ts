import { GameState, RunState, Position, Level, Direction } from '@game/core/core'

export interface DisturbanceResult {
  disturbed: boolean
  reason?: string
  newDirection?: Direction  // New direction for automatic corridor turns
}

export class DisturbanceService {
  /**
   * Check if running should stop due to environmental changes
   * Priority: Safety > Combat > Navigation
   */
  checkDisturbance(state: GameState, runState: RunState): DisturbanceResult {
    // Safety critical checks
    const safetyCheck = this.checkSafety(state, runState)
    if (safetyCheck.disturbed) return safetyCheck

    // Combat threat checks
    const combatCheck = this.checkCombatThreats(state, runState)
    if (combatCheck.disturbed) return combatCheck

    // Navigation checks (may include newDirection for corridor turns)
    const navCheck = this.checkNavigation(state, runState)

    // Return navigation result (may have newDirection even if not disturbed)
    if (navCheck.disturbed || navCheck.newDirection) {
      return navCheck
    }

    return { disturbed: false }
  }

  private checkSafety(state: GameState, _runState: RunState): DisturbanceResult {
    const { player } = state

    // HP below 30%
    const hpPercent = player.hp / player.maxHp
    if (hpPercent < 0.3) {
      return { disturbed: true, reason: 'Your health is low!' }
    }

    // Hunger critical (below 300)
    if (player.hunger < 300) {
      return { disturbed: true, reason: 'You are very hungry!' }
    }

    // No light source (can't see where you're going)
    if (!player.equipment.lightSource) {
      return { disturbed: true, reason: 'You have no light!' }
    }

    // Status effects (confused, blind, paralyzed)
    const blockingEffects = player.statusEffects.filter(
      (effect) =>
        effect.type === 'CONFUSED' ||
        effect.type === 'BLIND' ||
        effect.type === 'PARALYZED' ||
        effect.type === 'HELD'
    )
    if (blockingEffects.length > 0) {
      return { disturbed: true, reason: `You are ${blockingEffects[0].type.toLowerCase()}!` }
    }

    return { disturbed: false }
  }

  private checkCombatThreats(state: GameState, runState: RunState): DisturbanceResult {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return { disturbed: false }

    // Get monsters currently in FOV
    const currentFOVMonsters = new Set<string>()
    for (const monster of currentLevel.monsters) {
      const key = `${monster.position.x},${monster.position.y}`
      if (state.visibleCells.has(key)) {
        currentFOVMonsters.add(monster.id)
      }
    }

    // Check for new monsters in FOV
    for (const monsterId of currentFOVMonsters) {
      if (!runState.startingFOV.has(monsterId)) {
        const monster = currentLevel.monsters.find((m) => m.id === monsterId)
        if (monster) {
          return { disturbed: true, reason: `${monster.name} appears!` }
        }
      }
    }

    // Check if damaged (HP decreased)
    if (state.player.hp < runState.previousHP) {
      return { disturbed: true, reason: 'You have been hit!' }
    }

    return { disturbed: false }
  }

  private checkNavigation(state: GameState, runState: RunState): DisturbanceResult {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      return { disturbed: false }
    }

    const { player } = state

    // Check for doors in the path of running (not perpendicular doors)
    const positionAhead = this.getPositionAhead(player.position, runState.direction)

    for (const door of currentLevel.doors) {
      if (door.position.x === positionAhead.x && door.position.y === positionAhead.y) {
        // Door is directly in the path of running
        return { disturbed: true, reason: 'You reach a door.' }
      }
    }

    // Check for corridor turns and branches
    // Skip this check if player is in a room - rooms are meant to have open floors
    const currentTile = currentLevel.tiles[player.position.y]?.[player.position.x]

    if (currentTile && !currentTile.isRoom) {
      // Check if we can continue in current direction
      const canContinueAhead = this.isWalkable(currentLevel, positionAhead)

      // Get available perpendicular directions
      const perpendicularInfo = this.getPerpendicularDirections(runState.direction)
      const walkablePerpendicular: Direction[] = []

      for (const dirInfo of perpendicularInfo) {
        const checkPos = {
          x: player.position.x + dirInfo.x,
          y: player.position.y + dirInfo.y
        }
        if (this.isWalkable(currentLevel, checkPos)) {
          walkablePerpendicular.push(dirInfo.direction)
        }
      }

      // If blocked ahead but exactly one perpendicular option: corridor turn
      if (!canContinueAhead && walkablePerpendicular.length === 1) {
        return {
          disturbed: false,
          newDirection: walkablePerpendicular[0]
        }
      }

      // If multiple perpendicular options available: junction (stop running)
      if (walkablePerpendicular.length >= 2) {
        return { disturbed: true, reason: 'The corridor branches.' }
      }

      // If we have perpendicular options while we can still go ahead: junction
      if (canContinueAhead && walkablePerpendicular.length >= 1) {
        return { disturbed: true, reason: 'The corridor branches.' }
      }
    }

    return { disturbed: false }
  }

  /**
   * Get the position one step ahead in the running direction.
   * Used to check for doors directly in the path of running.
   *
   * @param position - Current player position
   * @param direction - Direction of run
   * @returns Position one step ahead in the running direction
   */
  private getPositionAhead(position: Position, direction: Direction): Position {
    switch (direction) {
      case 'up':
        return { x: position.x, y: position.y - 1 }
      case 'down':
        return { x: position.x, y: position.y + 1 }
      case 'left':
        return { x: position.x - 1, y: position.y }
      case 'right':
        return { x: position.x + 1, y: position.y }
      case 'up-left':
        return { x: position.x - 1, y: position.y - 1 }
      case 'up-right':
        return { x: position.x + 1, y: position.y - 1 }
      case 'down-left':
        return { x: position.x - 1, y: position.y + 1 }
      case 'down-right':
        return { x: position.x + 1, y: position.y + 1 }
      default:
        // Fallback: return current position (no movement)
        return position
    }
  }

  /**
   * Get perpendicular direction vectors for a given direction.
   *
   * For cardinal directions (up/down/left/right):
   * - Horizontal (left/right) → perpendicular = up/down
   * - Vertical (up/down) → perpendicular = left/right
   *
   * For diagonal directions (up-left, up-right, down-left, down-right):
   * - Returns all four perpendicular directions (forming a cross pattern)
   *
   * @param direction - Running direction
   * @returns Array of perpendicular direction info (offset + Direction enum)
   */
  private getPerpendicularDirections(direction: Direction): Array<{ x: number; y: number; direction: Direction }> {
    switch (direction) {
      case 'left':
      case 'right':
        // Horizontal movement → check vertical (up/down)
        return [
          { x: 0, y: -1, direction: 'up' as Direction },
          { x: 0, y: 1, direction: 'down' as Direction },
        ]

      case 'up':
      case 'down':
        // Vertical movement → check horizontal (left/right)
        return [
          { x: -1, y: 0, direction: 'left' as Direction },
          { x: 1, y: 0, direction: 'right' as Direction },
        ]

      case 'up-left':
      case 'up-right':
      case 'down-left':
      case 'down-right':
        // Diagonal movement → check all perpendicular directions
        // For diagonals, perpendiculars form a + pattern (not X)
        return [
          { x: 0, y: -1, direction: 'up' as Direction },
          { x: 0, y: 1, direction: 'down' as Direction },
          { x: -1, y: 0, direction: 'left' as Direction },
          { x: 1, y: 0, direction: 'right' as Direction },
        ]

      default:
        // Fallback: return empty array (no perpendicular directions)
        return []
    }
  }

  /**
   * Check if a position is walkable (within bounds and not a wall)
   *
   * @param level - Current level
   * @param position - Position to check
   * @returns True if walkable, false otherwise
   */
  private isWalkable(level: Level, position: Position): boolean {
    if (
      position.x < 0 ||
      position.x >= level.width ||
      position.y < 0 ||
      position.y >= level.height
    ) {
      return false
    }

    return level.tiles[position.y]?.[position.x]?.walkable ?? false
  }
}
