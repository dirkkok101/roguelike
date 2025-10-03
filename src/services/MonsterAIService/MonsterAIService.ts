import { Monster, GameState, Position, MonsterBehavior } from '@game/core/core'
import { PathfindingService } from '@services/PathfindingService'
import { IRandomService } from '@services/RandomService'
import { FOVService } from '@services/FOVService'

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
    private random: IRandomService,
    private fovService: FOVService
  ) {}

  /**
   * Compute FOV for monster (for awake monsters)
   */
  computeMonsterFOV(monster: Monster, state: GameState): Monster {
    // Skip FOV calculation for sleeping monsters (optimization)
    if (monster.isAsleep || monster.state === 'SLEEPING') {
      return monster
    }

    const level = state.levels.get(state.currentLevel)
    if (!level) return monster

    // Use aggro range as vision radius
    const visionRadius = monster.aiProfile.aggroRange
    const visibleCells = this.fovService.computeFOV(
      monster.position,
      visionRadius,
      level
    )

    return {
      ...monster,
      visibleCells,
    }
  }

  /**
   * Check if monster should wake up
   */
  checkWakeUp(monster: Monster, state: GameState): Monster {
    // Already awake
    if (!monster.isAsleep) {
      return monster
    }

    const playerPos = state.player.position
    const distToPlayer = this.distance(monster.position, playerPos)

    // Wake up if player within aggro range
    if (distToPlayer <= monster.aiProfile.aggroRange) {
      return {
        ...monster,
        isAsleep: false,
        state: 'HUNTING',
      }
    }

    return monster
  }

  /**
   * Update monster state based on conditions (FSM)
   */
  updateMonsterState(monster: Monster, state: GameState): Monster {
    const level = state.levels.get(state.currentLevel)
    if (!level) return monster

    const playerPos = state.player.position
    const distToPlayer = this.distance(monster.position, playerPos)

    // Check if player is in aggro range
    const inAggroRange = distToPlayer <= monster.aiProfile.aggroRange

    // Calculate HP percentage for COWARD check
    const hpPercent = monster.hp / monster.maxHp

    // State transitions
    switch (monster.state) {
      case 'SLEEPING':
        // Wake up if player in aggro range
        if (inAggroRange) {
          return { ...monster, state: 'HUNTING', isAsleep: false }
        }
        break

      case 'WANDERING':
        // Start hunting if player in aggro range
        if (inAggroRange) {
          return { ...monster, state: 'HUNTING' }
        }
        break

      case 'HUNTING':
        // Flee if COWARD and HP low
        if (
          monster.aiProfile.behavior === MonsterBehavior.COWARD &&
          hpPercent < monster.aiProfile.fleeThreshold
        ) {
          return { ...monster, state: 'FLEEING' }
        }
        // Flee if THIEF and hasStolen
        if (
          monster.aiProfile.behavior === MonsterBehavior.THIEF &&
          monster.hasStolen
        ) {
          return { ...monster, state: 'FLEEING' }
        }
        break

      case 'FLEEING':
        // Stop fleeing if HP recovered (for COWARD)
        if (
          monster.aiProfile.behavior === MonsterBehavior.COWARD &&
          hpPercent >= monster.aiProfile.fleeThreshold + 0.1
        ) {
          return { ...monster, state: 'HUNTING' }
        }
        // THIEF continues fleeing once stolen
        break
    }

    return monster
  }

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

      case MonsterBehavior.GREEDY:
        return this.greedyBehavior(monster, playerPos, level, state)

      case MonsterBehavior.THIEF:
        return this.thiefBehavior(monster, playerPos, level)

      case MonsterBehavior.STATIONARY:
        return this.stationaryBehavior(monster, playerPos)

      case MonsterBehavior.COWARD:
        return this.cowardBehavior(monster, playerPos, level)

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
   * GREEDY behavior - Prioritize gold over player
   * Used by Orcs
   */
  private greedyBehavior(
    monster: Monster,
    playerPos: Position,
    level: any,
    state: GameState
  ): MonsterAction {
    // Find nearest gold pile
    const nearestGold = this.findNearestGold(monster.position, level)

    if (nearestGold) {
      // Calculate distances
      const goldDist = this.distance(monster.position, nearestGold)
      const playerDist = this.distance(monster.position, playerPos)

      // If gold is closer than player, go for gold
      if (goldDist < playerDist) {
        const nextStep = this.pathfinding.getNextStep(monster.position, nearestGold, level)
        if (nextStep) {
          return { type: 'move', target: nextStep }
        }
      }
    }

    // No gold or player is closer - use simple behavior toward player
    return this.simpleBehavior(monster, playerPos, level)
  }

  /**
   * THIEF behavior - Steal and flee
   * Used by Leprechaun (steals gold), Nymph (steals items)
   */
  private thiefBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    // If already stole, flee from player
    if (monster.hasStolen) {
      return this.fleeBehavior(monster, playerPos, level)
    }

    // Otherwise, approach player using A* to get close enough to steal
    // (Actual stealing happens when adjacent in the attack phase)
    return this.smartBehavior(monster, playerPos, level)
  }

  /**
   * STATIONARY behavior - Never move
   * Used by Venus Flytrap
   */
  private stationaryBehavior(
    monster: Monster,
    playerPos: Position
  ): MonsterAction {
    // Venus Flytrap never moves, just waits for player to come adjacent
    // When adjacent, attack action is triggered automatically
    return { type: 'wait' }
  }

  /**
   * COWARD behavior - Flee when HP is low
   * Used by Vampire
   */
  private cowardBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    // Calculate HP percentage
    const hpPercent = monster.hp / monster.maxHp

    // If HP below flee threshold, flee
    if (hpPercent < monster.aiProfile.fleeThreshold) {
      return this.fleeBehavior(monster, playerPos, level)
    }

    // Otherwise, fight intelligently using SMART behavior
    return this.smartBehavior(monster, playerPos, level)
  }

  /**
   * Flee from target position
   */
  private fleeBehavior(
    monster: Monster,
    targetPos: Position,
    level: any
  ): MonsterAction {
    // Move away from target
    const dx = monster.position.x - targetPos.x
    const dy = monster.position.y - targetPos.y

    let target: Position

    // Move in opposite direction from target
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

    // If can't flee in preferred direction, try perpendicular
    const altTarget = Math.abs(dx) > Math.abs(dy)
      ? { x: monster.position.x, y: monster.position.y + (dy > 0 ? 1 : -1) }
      : { x: monster.position.x + (dx > 0 ? 1 : -1), y: monster.position.y }

    const altTile = level.tiles[altTarget.y]?.[altTarget.x]
    if (altTile?.walkable) {
      return { type: 'move', target: altTarget }
    }

    return { type: 'wait' }
  }

  /**
   * Find nearest gold pile to position
   */
  private findNearestGold(position: Position, level: any): Position | null {
    if (!level.gold || level.gold.length === 0) {
      return null
    }

    let nearest: Position | null = null
    let minDist = Infinity

    for (const goldPile of level.gold) {
      const dist = this.distance(position, goldPile.position)
      if (dist < minDist) {
        minDist = dist
        nearest = goldPile.position
      }
    }

    return nearest
  }

  /**
   * Calculate Manhattan distance between two positions
   */
  private distance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
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
