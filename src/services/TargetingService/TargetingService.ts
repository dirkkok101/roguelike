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
   * Routes to appropriate targeting logic based on mode
   */
  selectTarget(request: TargetingRequest, state: GameState): TargetingResult {
    // TODO: Implement in Phase 1.4
    throw new Error('Not implemented')
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
    level: Level,
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

  // ============================================================================
  // DIRECTION TARGETING LOGIC (Phase 1.3)
  // ============================================================================

  /**
   * Convert direction key to direction vector
   * Supports vi-keys (h, j, k, l, y, u, b, n) and arrow keys
   */
  getDirectionVector(direction: Direction): { dx: number; dy: number } | null {
    // TODO: Implement in Phase 1.3
    throw new Error('Not implemented')
  }

  /**
   * Cast ray from origin in direction, stopping at walls or maxRange
   * Uses Bresenham's line algorithm for straight lines
   * @returns Array of positions along the ray path
   */
  castRay(origin: Position, direction: Direction, maxRange: number, level: Level): Position[] {
    // TODO: Implement in Phase 1.3
    throw new Error('Not implemented')
  }

  /**
   * Find first monster along ray path
   * Used for directional targeting (fire, lightning, cold wands)
   */
  findFirstMonsterInRay(rayPath: Position[], level: Level): Monster | null {
    // TODO: Implement in Phase 1.3
    throw new Error('Not implemented')
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate Manhattan distance between two positions
   * Classic roguelike distance metric (L1 norm)
   */
  private distance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  /**
   * Convert position to string key for Set lookups
   */
  private posToKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }
}
