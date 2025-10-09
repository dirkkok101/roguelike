import { Monster, GameState, Position, MonsterBehavior, MonsterState } from '@game/core/core'
import { PathfindingService } from '@services/PathfindingService'
import { IRandomService } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { LevelService } from '@services/LevelService'

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
    private fovService: FOVService,
    private levelService: LevelService
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
   * Update monster memory of player position
   * Tracks last known position for pursuit after losing sight
   */
  updateMonsterMemory(monster: Monster, state: GameState): Monster {
    // Sleeping monsters don't update memory
    if (monster.isAsleep || monster.state === MonsterState.SLEEPING) {
      return monster
    }

    const playerPos = state.player.position
    const playerPosKey = `${playerPos.x},${playerPos.y}`

    // Check if player is in monster's FOV
    const canSeePlayer = monster.visibleCells.has(playerPosKey)

    if (canSeePlayer) {
      // Update last known position and reset counter
      return {
        ...monster,
        lastKnownPlayerPosition: { ...playerPos },
        turnsWithoutSight: 0,
      }
    } else {
      // Increment turns without sight (default to 0 if undefined)
      const turnsWithoutSight = (monster.turnsWithoutSight ?? 0) + 1

      // After 5 turns, forget the last known position
      if (turnsWithoutSight > 5) {
        return {
          ...monster,
          lastKnownPlayerPosition: null,
          turnsWithoutSight,
        }
      }

      // Keep memory for a few turns
      return {
        ...monster,
        turnsWithoutSight,
      }
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
        state: MonsterState.HUNTING,
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
      case MonsterState.SLEEPING:
        // Wake up if player in aggro range
        if (inAggroRange) {
          return { ...monster, state: MonsterState.HUNTING, isAsleep: false }
        }
        break

      case MonsterState.WANDERING:
        // Start hunting if player in aggro range
        if (inAggroRange) {
          return { ...monster, state: MonsterState.HUNTING }
        }
        break

      case MonsterState.HUNTING:
        // Flee if COWARD and HP low
        if (
          monster.aiProfile.behavior === MonsterBehavior.COWARD &&
          hpPercent < monster.aiProfile.fleeThreshold
        ) {
          return { ...monster, state: MonsterState.FLEEING }
        }
        // Flee if THIEF and hasStolen
        if (
          monster.aiProfile.behavior === MonsterBehavior.THIEF &&
          monster.hasStolen
        ) {
          return { ...monster, state: MonsterState.FLEEING }
        }
        break

      case MonsterState.FLEEING:
        // Stop fleeing if HP recovered (for COWARD)
        if (
          monster.aiProfile.behavior === MonsterBehavior.COWARD &&
          hpPercent >= monster.aiProfile.fleeThreshold + 0.1
        ) {
          return { ...monster, state: MonsterState.HUNTING }
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

    // HIGHEST PRIORITY: Check for adjacent SCARE_MONSTER scrolls
    // Monsters will flee from scare scrolls before any other behavior
    const adjacentPositions = this.getAdjacentPositions(monster.position)
    for (const pos of adjacentPositions) {
      if (this.levelService.hasScareScrollAt(level, pos)) {
        // Scare scroll detected! Flee from it
        return this.fleeBehavior(monster, pos, level)
      }
    }

    // Chase probability check (matches original Rogue ISMEAN behavior)
    // If monster has chaseChance < 1.0, roll to see if it pursues this turn
    // MEAN monsters in original Rogue had 67% chance to chase per turn
    const chaseChance = monster.aiProfile.chaseChance ?? 1.0
    if (chaseChance < 1.0) {
      if (!this.random.chance(chaseChance)) {
        // Failed chase roll - monster doesn't pursue this turn
        return { type: 'wait' }
      }
    }

    const playerPos = state.player.position
    const playerPosKey = `${playerPos.x},${playerPos.y}`

    // Check if player is visible
    const canSeePlayer = monster.visibleCells.has(playerPosKey)

    // Determine target position:
    // 1. If player is visible, use current position
    // 2. If not visible but has last known position, use that
    // 3. Otherwise fall back to current player position (for backwards compatibility with tests)
    let targetPos: Position = canSeePlayer
      ? playerPos
      : (monster.lastKnownPlayerPosition ?? playerPos)

    // Check if adjacent to player - attack if adjacent (even if can't see through wall)
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
        return this.smartBehavior(monster, targetPos, level)

      case MonsterBehavior.SIMPLE:
        return this.simpleBehavior(monster, targetPos, level)

      case MonsterBehavior.ERRATIC:
        return this.erraticBehavior(monster, targetPos, level)

      case MonsterBehavior.GREEDY:
        return this.greedyBehavior(monster, playerPos, level, state)

      case MonsterBehavior.THIEF:
        return this.thiefBehavior(monster, targetPos, level)

      case MonsterBehavior.STATIONARY:
        return this.stationaryBehavior(monster, targetPos)

      case MonsterBehavior.COWARD:
        return this.cowardBehavior(monster, targetPos, level)

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
   * Tries primary axis first, then secondary axis if blocked
   */
  private simpleBehavior(
    monster: Monster,
    playerPos: Position,
    level: any
  ): MonsterAction {
    const dx = playerPos.x - monster.position.x
    const dy = playerPos.y - monster.position.y

    // Build movement priority: primary axis first, secondary axis second
    const movements: Position[] = []

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal movement is primary (larger distance)
      if (dx !== 0) movements.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y })
      if (dy !== 0) movements.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy) })
    } else {
      // Vertical movement is primary (larger distance)
      if (dy !== 0) movements.push({ x: monster.position.x, y: monster.position.y + Math.sign(dy) })
      if (dx !== 0) movements.push({ x: monster.position.x + Math.sign(dx), y: monster.position.y })
    }

    // Try each movement in priority order
    for (const target of movements) {
      const tile = level.tiles[target.y]?.[target.x]
      if (tile?.walkable) {
        return { type: 'move', target }
      }
    }

    // No valid moves available
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
    _state: GameState
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
    _monster: Monster,
    _playerPos: Position
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

  /**
   * Get all adjacent positions (4-directional)
   */
  private getAdjacentPositions(pos: Position): Position[] {
    return [
      { x: pos.x, y: pos.y - 1 }, // Up
      { x: pos.x, y: pos.y + 1 }, // Down
      { x: pos.x - 1, y: pos.y }, // Left
      { x: pos.x + 1, y: pos.y }, // Right
    ]
  }
}
