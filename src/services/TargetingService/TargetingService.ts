import {
  Position,
  Level,
  Player,
  Monster,
  GameState,
  TargetingMode,
  TargetingRequest,
  TargetingResult,
  TargetValidation,
  Direction,
} from '@game/core/core'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'

// ============================================================================
// TARGETING SERVICE - Target selection, validation, and ray casting
// ============================================================================

/**
 * TargetingService handles all targeting logic for ranged interactions
 * (wands, bows, spells, thrown items).
 *
 * Design Philosophy:
 * - ALL targeting logic lives in this service (no logic in UI/commands)
 * - Deterministic: Given same inputs, always returns same outputs
 * - Immutable: Returns new objects, never mutates inputs
 * - Reusable: Designed for wands now, but architected for future bows/spells
 *
 * Responsibilities:
 * - Monster targeting (find, sort, cycle, validate)
 * - Direction targeting (ray casting for fire/lightning wands)
 * - Position targeting (ground tiles for teleport/area spells)
 * - Line-of-sight validation
 * - Range checking
 *
 * Dependencies:
 * - FOVService: Get visible monsters (already in FOV)
 * - MovementService: Position utilities, walkability checks
 */
export class TargetingService {
  constructor(
    private fovService: FOVService,
    private movementService: MovementService
  ) {}

  // ============================================================================
  // PUBLIC API - Main targeting interface
  // ============================================================================

  /**
   * Main targeting entry point
   * Automatically selects best target based on request
   * Useful for auto-targeting (nearest monster) or AI
   */
  selectTarget(request: TargetingRequest, state: GameState): TargetingResult {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      return {
        success: false,
        message: 'Invalid level state.',
      }
    }

    switch (request.mode) {
      case TargetingMode.MONSTER:
        return this.selectMonsterTarget(request, state, currentLevel)

      case TargetingMode.DIRECTION:
        return {
          success: false,
          message: 'Direction targeting requires user input (not automated).',
        }

      case TargetingMode.POSITION:
        return {
          success: false,
          message: 'Position targeting requires user input (not automated).',
        }

      default:
        return {
          success: false,
          message: 'Invalid targeting mode.',
        }
    }
  }

  /**
   * Helper: Auto-select nearest valid monster target
   */
  private selectMonsterTarget(
    request: TargetingRequest,
    state: GameState,
    level: Level
  ): TargetingResult {
    // Get visible monsters sorted by distance
    const visibleMonsters = this.getVisibleMonsters(state.player, level, state.visibleCells)

    if (visibleMonsters.length === 0) {
      return {
        success: false,
        message: 'No monsters in range.',
      }
    }

    // Find first valid target (monsters already sorted by distance)
    for (const monster of visibleMonsters) {
      const validation = this.isValidMonsterTarget(
        monster,
        state.player,
        level,
        request.maxRange,
        request.requiresLOS,
        state.visibleCells
      )

      if (validation.isValid) {
        return {
          success: true,
          targetMonsterId: monster.id,
        }
      }
    }

    // No valid targets found
    return {
      success: false,
      message: 'No valid targets in range.',
    }
  }

  // ============================================================================
  // MONSTER TARGETING LOGIC (Phase 1.2)
  // ============================================================================

  /**
   * Get all visible monsters, sorted by distance from player (closest first)
   * Uses Manhattan distance (L1 norm) for classic roguelike feel
   */
  getVisibleMonsters(player: Player, level: Level, fovCells: Set<string>): Monster[] {
    // Filter monsters that are in FOV
    const visibleMonsters = level.monsters.filter((monster) =>
      this.fovService.isInFOV(monster.position, fovCells)
    )

    // Sort by distance from player (closest first)
    return visibleMonsters.sort((a, b) => {
      const distA = this.distance(player.position, a.position)
      const distB = this.distance(player.position, b.position)
      return distA - distB
    })
  }

  /**
   * Get next target when cycling through monsters
   * @param direction - 'next', 'prev', or 'nearest'
   */
  getNextTarget(
    currentTargetId: string | undefined,
    visibleMonsters: Monster[],
    direction: 'next' | 'prev' | 'nearest'
  ): Monster | null {
    // Return null if no monsters visible
    if (visibleMonsters.length === 0) {
      return null
    }

    // If direction is 'nearest', return first monster (already sorted by distance)
    if (direction === 'nearest') {
      return visibleMonsters[0]
    }

    // Find current target index
    const currentIndex = currentTargetId
      ? visibleMonsters.findIndex((m) => m.id === currentTargetId)
      : -1

    // Calculate next index based on direction
    let nextIndex: number

    if (direction === 'next') {
      // Cycle to next monster (wrap around to start)
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % visibleMonsters.length
    } else {
      // direction === 'prev'
      // Cycle to previous monster (wrap around to end)
      nextIndex =
        currentIndex === -1
          ? visibleMonsters.length - 1
          : (currentIndex - 1 + visibleMonsters.length) % visibleMonsters.length
    }

    return visibleMonsters[nextIndex]
  }

  /**
   * Validate if monster is a valid target
   * Checks:
   * - Monster is in FOV (if requiresLOS)
   * - Distance <= maxRange
   * - Custom validation function (if provided)
   */
  isValidMonsterTarget(
    monster: Monster,
    player: Player,
    _level: Level,
    maxRange: number,
    requiresLOS: boolean,
    fovCells: Set<string>
  ): TargetValidation {
    // Check if monster is in FOV (if LOS required)
    if (requiresLOS && !this.fovService.isInFOV(monster.position, fovCells)) {
      return {
        isValid: false,
        reason: 'You cannot see that monster.',
      }
    }

    // Check distance (Manhattan distance)
    const dist = this.distance(player.position, monster.position)
    if (dist > maxRange) {
      return {
        isValid: false,
        reason: `That monster is too far away. (Range: ${maxRange})`,
      }
    }

    // All checks passed
    return {
      isValid: true,
    }
  }

  /**
   * Check if target position is within range of player
   *
   * Uses Manhattan distance (L1 norm) for range calculation, which is the
   * classic roguelike distance metric. This helper method encapsulates range
   * validation logic that was previously scattered in command classes.
   *
   * @param playerPos Player's current position
   * @param targetPos Target position to check
   * @param maxRange Maximum range in tiles (Manhattan distance)
   * @returns Object with inRange boolean and calculated distance
   *
   * @example
   * const check = targetingService.isTargetInRange(
   *   player.position,
   *   monster.position,
   *   wand.range
   * )
   * if (!check.inRange) {
   *   console.log(`Too far! (${check.distance} > ${wand.range})`)
   * }
   */
  public isTargetInRange(
    playerPos: Position,
    targetPos: Position,
    maxRange: number
  ): { inRange: boolean; distance: number } {
    const distance = this.distance(playerPos, targetPos)
    return {
      inRange: distance <= maxRange,
      distance,
    }
  }

  /**
   * Comprehensive validation for wand targeting
   *
   * Combines all checks: target existence, FOV visibility, and range.
   * This method is designed for commands to call directly, encapsulating
   * all targeting validation logic in the service layer.
   *
   * Validation checks performed (in order):
   * 1. Level state validity
   * 2. Monster existence
   * 3. FOV/line-of-sight (if target is visible)
   * 4. Range validation (Manhattan distance)
   *
   * @param targetId Monster ID to validate
   * @param wandRange Maximum range of the wand
   * @param state Current game state
   * @returns Validation result with monster reference if valid
   *
   * @example
   * const validation = targetingService.validateWandTarget(
   *   'monster-123',
   *   wand.range,
   *   state
   * )
   *
   * if (!validation.isValid) {
   *   return showError(validation.error!)
   * }
   *
   * const monster = validation.monster!
   * // Proceed with wand effect
   */
  public validateWandTarget(
    targetId: string,
    wandRange: number,
    state: GameState
  ): { isValid: boolean; error?: string; monster?: Monster } {
    // 1. Validate level exists
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        isValid: false,
        error: 'Invalid level state.',
      }
    }

    // 2. Validate monster exists
    const monster = level.monsters.find((m) => m.id === targetId)
    if (!monster) {
      return {
        isValid: false,
        error: 'Target no longer exists.',
      }
    }

    // 3. Validate monster is in FOV (line of sight)
    const targetKey = `${monster.position.x},${monster.position.y}`
    if (!state.visibleCells.has(targetKey)) {
      return {
        isValid: false,
        error: 'Target no longer visible.',
      }
    }

    // 4. Validate monster is in range
    const rangeCheck = this.isTargetInRange(state.player.position, monster.position, wandRange)
    if (!rangeCheck.inRange) {
      return {
        isValid: false,
        error: `Target out of range. (Range: ${wandRange})`,
      }
    }

    // All checks passed
    return {
      isValid: true,
      monster,
    }
  }

  // ============================================================================
  // DIRECTION TARGETING LOGIC (Phase 1.3)
  // ============================================================================

  /**
   * Convert direction key to direction vector
   * Supports vi-keys (h, j, k, l, y, u, b, n) and arrow keys
   */
  getDirectionVector(direction: Direction): { dx: number; dy: number } | null {
    switch (direction) {
      case 'up':
        return { dx: 0, dy: -1 }
      case 'down':
        return { dx: 0, dy: 1 }
      case 'left':
        return { dx: -1, dy: 0 }
      case 'right':
        return { dx: 1, dy: 0 }
      case 'up-left':
        return { dx: -1, dy: -1 }
      case 'up-right':
        return { dx: 1, dy: -1 }
      case 'down-left':
        return { dx: -1, dy: 1 }
      case 'down-right':
        return { dx: 1, dy: 1 }
      default:
        return null
    }
  }

  /**
   * Cast ray from origin in direction, stopping at walls or maxRange
   * Uses Bresenham's line algorithm for straight lines
   * @returns Array of positions along the ray path
   */
  castRay(origin: Position, direction: Direction, maxRange: number, level: Level): Position[] {
    const vector = this.getDirectionVector(direction)
    if (!vector) return []

    const path: Position[] = []
    let { x, y } = origin
    const { dx, dy } = vector

    // Calculate the number of steps (use the larger of dx/dy)
    // For diagonal movement, this ensures we move at 45 degrees
    const steps = maxRange

    for (let i = 0; i < steps; i++) {
      // Move in the direction
      x += dx
      y += dy

      const pos = { x, y }

      // Check bounds
      if (!this.movementService.isInBounds(pos, level)) {
        break
      }

      // Add position to path
      path.push(pos)

      // Stop at walls (non-walkable tiles)
      if (!this.movementService.isWalkable(pos, level)) {
        break
      }
    }

    return path
  }

  /**
   * Find first monster along ray path
   * Used for directional targeting (fire, lightning, cold wands)
   */
  findFirstMonsterInRay(rayPath: Position[], level: Level): Monster | null {
    for (const pos of rayPath) {
      const monster = this.movementService.getMonsterAt(pos, level)
      if (monster) {
        return monster
      }
    }
    return null
  }

  /**
   * Calculate ray from start to end position using Bresenham's line algorithm
   *
   * This method traces a line between two arbitrary positions, used for
   * projectile-based wand targeting. The ray stops at walls or reaches the
   * target position, returning all positions along the path.
   *
   * Based on original Rogue (1980) behavior:
   * - Bolts stop at first obstacle (monster or wall)
   * - No pass-through or bouncing mechanics
   * - All wand types use the same bolt mechanics
   *
   * @param start - Starting position (player position)
   * @param end - End position (cursor/target position)
   * @param level - Current dungeon level
   * @returns Array of positions along the ray path (excluding start position)
   */
  public calculateRay(start: Position, end: Position, level: Level): Position[] {
    // Early return if start and end are the same position
    if (start.x === end.x && start.y === end.y) {
      return []
    }

    const path: Position[] = []

    // Calculate deltas
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)

    // Determine step directions
    const sx = start.x < end.x ? 1 : -1
    const sy = start.y < end.y ? 1 : -1

    // Initial error
    let err = dx - dy

    // Current position
    let x = start.x
    let y = start.y

    // Trace line using Bresenham's algorithm
    while (true) {
      // Add current position to path (skip start position)
      if (x !== start.x || y !== start.y) {
        const pos = { x, y }

        // Stop at out of bounds positions (before adding to path)
        if (!this.movementService.isInBounds(pos, level)) {
          break
        }

        path.push(pos)

        // Stop if we've reached the end position
        if (x === end.x && y === end.y) {
          break
        }

        // Stop at walls (non-walkable tiles)
        if (!this.movementService.isWalkable(pos, level)) {
          break
        }
      }

      // Bresenham's algorithm step
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }

    return path
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate Manhattan distance (L1 norm) between two positions
   *
   * Used for range checks and target sorting. Manhattan distance is the
   * sum of absolute differences in x and y coordinates, representing the
   * minimum number of orthogonal moves needed to reach from a to b.
   *
   * This is the classic roguelike distance metric.
   *
   * @param a Starting position
   * @param b Target position
   * @returns Manhattan distance in tiles
   *
   * @example
   * const dist = targetingService.distance({ x: 5, y: 5 }, { x: 8, y: 7 })
   * // Returns 5 (3 horizontal + 2 vertical)
   */
  public distance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

}
