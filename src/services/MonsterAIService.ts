import { Monster, GameState, Position, MonsterBehavior } from '../types/core/core'
import { PathfindingService } from './PathfindingService'
import { IRandomService } from './RandomService'

// ============================================================================
// MONSTER AI SERVICE - Behavior decision making
// ============================================================================

export interface MonsterAction {
  type: 'move' | 'attack' | 'wait'
  target?: Position
}

export class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private random: IRandomService
  ) {}

  /**
   * Decide action for monster
   */
  decideAction(monster: Monster, state: GameState): MonsterAction {
    // If asleep, wait
    if (monster.isAsleep) {
      return { type: 'wait' }
    }

    const level = state.levels.get(state.currentLevel)
    if (!level) return { type: 'wait' }

    const playerPos = state.player.position

    // Check if adjacent to player
    if (this.isAdjacent(monster.position, playerPos)) {
      return { type: 'attack', target: playerPos }
    }

    // Determine behavior
    const behaviors = Array.isArray(monster.aiProfile.behavior)
      ? monster.aiProfile.behavior
      : [monster.aiProfile.behavior]

    const primaryBehavior = behaviors[0]

    switch (primaryBehavior) {
      case MonsterBehavior.SMART:
        return this.smartBehavior(monster, playerPos, level)

      case MonsterBehavior.SIMPLE:
        return this.simpleBehavior(monster, playerPos, level)

      case MonsterBehavior.ERRATIC:
        return this.erraticBehavior(monster, playerPos, level)

      default:
        return { type: 'wait' }
    }
  }

  // ============================================================================
  // PRIVATE: Behavior implementations
  // ============================================================================

  /**
   * SMART behavior - Use A* pathfinding
   */
  private smartBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    // Use A* pathfinding
    const nextStep = this.pathfinding.getNextStep(monster.position, playerPos, level)
    if (nextStep) {
      return { type: 'move', target: nextStep }
    }
    return { type: 'wait' }
  }

  /**
   * SIMPLE behavior - Move directly toward player (greedy)
   */
  private simpleBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    // Move directly toward player (greedy)
    const dx = playerPos.x - monster.position.x
    const dy = playerPos.y - monster.position.y

    let target: Position

    if (Math.abs(dx) > Math.abs(dy)) {
      target = { x: monster.position.x + Math.sign(dx), y: monster.position.y }
    } else {
      target = { x: monster.position.x, y: monster.position.y + Math.sign(dy) }
    }

    // Check if walkable
    const tile = level.tiles[target.y]?.[target.x]
    if (tile?.walkable) {
      return { type: 'move', target }
    }

    return { type: 'wait' }
  }

  /**
   * ERRATIC behavior - 50% random, 50% toward player
   * Used by flying creatures (Bat, Kestrel)
   */
  private erraticBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    // 50% chance to move randomly
    if (this.random.chance(0.5)) {
      // Random movement
      const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 },  // right
      ]

      const randomDir = this.random.pickRandom(directions)
      const target = {
        x: monster.position.x + randomDir.x,
        y: monster.position.y + randomDir.y,
      }

      // Check if walkable
      const tile = level.tiles[target.y]?.[target.x]
      if (tile?.walkable) {
        return { type: 'move', target }
      }

      return { type: 'wait' }
    } else {
      // Move toward player using simple behavior
      return this.simpleBehavior(monster, playerPos, level)
    }
  }

  /**
   * Check if two positions are adjacent
   */
  private isAdjacent(pos1: Position, pos2: Position): boolean {
    const dx = Math.abs(pos1.x - pos2.x)
    const dy = Math.abs(pos1.y - pos2.y)
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
  }
}
