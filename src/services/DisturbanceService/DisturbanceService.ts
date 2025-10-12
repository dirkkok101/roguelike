import { GameState, RunState, Position, Level, Direction } from '@game/core/core'

export interface DisturbanceResult {
  disturbed: boolean
  reason?: string
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

    // Navigation checks
    const navCheck = this.checkNavigation(state, runState)
    if (navCheck.disturbed) return navCheck

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
    if (!currentLevel) return { disturbed: false }

    const { player } = state

    // Check for doors adjacent to player
    for (const door of currentLevel.doors) {
      const dx = Math.abs(door.position.x - player.position.x)
      const dy = Math.abs(door.position.y - player.position.y)
      if (dx <= 1 && dy <= 1 && (dx + dy) === 1) {
        // Door is orthogonally adjacent
        return { disturbed: true, reason: 'You reach a door.' }
      }
    }

    // Check for corridor branches (perpendicular choices)
    const perpendicularChoices = this.countPerpendicularChoices(
      currentLevel,
      player.position,
      runState.direction
    )
    if (perpendicularChoices > 0) {
      return { disturbed: true, reason: 'The corridor branches.' }
    }

    return { disturbed: false }
  }

  /**
   * Count walkable directions perpendicular to the running direction.
   * This determines if there are new choices available (corridor branching).
   *
   * For example, if running right:
   * - Check up and down (perpendicular to horizontal)
   * - Don't count left (behind) or right (ahead) since those aren't new choices
   *
   * @param level - Current level
   * @param position - Current player position
   * @param direction - Direction of run
   * @returns Number of walkable perpendicular directions (0+ choices)
   */
  private countPerpendicularChoices(
    level: Level,
    position: Position,
    direction: Direction
  ): number {
    // Get perpendicular directions based on running direction
    const perpendicularDirs = this.getPerpendicularDirections(direction)

    let count = 0
    for (const dir of perpendicularDirs) {
      const newX = position.x + dir.x
      const newY = position.y + dir.y

      if (
        newX >= 0 &&
        newX < level.width &&
        newY >= 0 &&
        newY < level.height &&
        level.tiles[newY][newX]?.walkable
      ) {
        count++
      }
    }

    return count
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
   * @returns Array of perpendicular direction vectors
   */
  private getPerpendicularDirections(direction: Direction): Array<{ x: number; y: number }> {
    switch (direction) {
      case 'left':
      case 'right':
        // Horizontal movement → check vertical (up/down)
        return [
          { x: 0, y: -1 }, // up
          { x: 0, y: 1 },  // down
        ]

      case 'up':
      case 'down':
        // Vertical movement → check horizontal (left/right)
        return [
          { x: -1, y: 0 }, // left
          { x: 1, y: 0 },  // right
        ]

      case 'up-left':
      case 'up-right':
      case 'down-left':
      case 'down-right':
        // Diagonal movement → check all perpendicular directions
        // For diagonals, perpendiculars form a + pattern (not X)
        return [
          { x: 0, y: -1 }, // up
          { x: 0, y: 1 },  // down
          { x: -1, y: 0 }, // left
          { x: 1, y: 0 },  // right
        ]

      default:
        // Fallback: return empty array (no perpendicular directions)
        return []
    }
  }
}
