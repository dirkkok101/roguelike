import { GameState, RunState, Position, Level } from '@game/core/core'

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

  private checkSafety(state: GameState, runState: RunState): DisturbanceResult {
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

    // Check for corridor branches (3+ walkable directions)
    const walkableDirections = this.countWalkableDirections(currentLevel, player.position)
    if (walkableDirections >= 3) {
      return { disturbed: true, reason: 'The corridor branches.' }
    }

    return { disturbed: false }
  }

  private countWalkableDirections(level: Level, position: Position): number {
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 }, // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }, // right
    ]

    let count = 0
    for (const dir of directions) {
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
}
