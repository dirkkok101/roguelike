import { Position, Level, Monster, Item, GoldPile, Tile } from '@game/core/core'
import { FOVService } from '@services/FOVService'

// ============================================================================
// RENDERING SERVICE - Visibility states and color selection
// ============================================================================

export type VisibilityState = 'visible' | 'explored' | 'unexplored'

export interface RenderConfig {
  showItemsInMemory: boolean
  showGoldInMemory: boolean
}

export class RenderingService {
  constructor(_fovService: FOVService) {
    // FOV service will be used in future phases for advanced rendering
  }

  /**
   * Determine visibility state for a position
   */
  getVisibilityState(
    position: Position,
    visibleCells: Set<string>,
    level: Level
  ): VisibilityState {
    const key = `${position.x},${position.y}`

    if (visibleCells.has(key)) {
      return 'visible'
    }

    if (level.explored[position.y]?.[position.x]) {
      return 'explored'
    }

    return 'unexplored'
  }

  /**
   * Determine if entity should be rendered
   */
  shouldRenderEntity(
    _entityPosition: Position,
    entityType: 'monster' | 'item' | 'gold' | 'stairs' | 'trap',
    visibilityState: VisibilityState,
    config: RenderConfig
  ): boolean {
    // Never render unexplored
    if (visibilityState === 'unexplored') return false

    switch (entityType) {
      case 'monster':
        // Monsters only visible in FOV
        return visibilityState === 'visible'

      case 'item':
        // Items visible in FOV, optionally in memory
        return (
          visibilityState === 'visible' ||
          (visibilityState === 'explored' && config.showItemsInMemory)
        )

      case 'gold':
        // Gold visible in FOV, optionally in memory
        return (
          visibilityState === 'visible' ||
          (visibilityState === 'explored' && config.showGoldInMemory)
        )

      case 'stairs':
        // Stairs remembered once discovered
        return visibilityState === 'visible' || visibilityState === 'explored'

      case 'trap':
        // Traps only if discovered AND (visible or explored)
        // Note: discovery check handled by caller
        return visibilityState === 'visible' || visibilityState === 'explored'

      default:
        return false
    }
  }

  /**
   * Get color for tile based on visibility state
   */
  getColorForTile(tile: Tile, visibilityState: VisibilityState): string {
    switch (visibilityState) {
      case 'visible':
        return tile.colorVisible
      case 'explored':
        return tile.colorExplored
      case 'unexplored':
        return '#000000'
    }
  }

  /**
   * Get color for entity based on visibility state
   */
  getColorForEntity(
    entity: Monster | Item | GoldPile,
    visibilityState: VisibilityState
  ): string {
    if (visibilityState === 'unexplored') return '#000000'

    if (visibilityState === 'explored') {
      // Dimmed gray for explored
      return '#707070'
    }

    // Visible - return entity-specific color
    if ('letter' in entity) {
      // Monster - color by threat level
      return this.getMonsterColor(entity as Monster)
    }

    if ('amount' in entity) {
      // Gold
      return '#FFD700'
    }

    // Item - color by type
    return this.getItemColor(entity as Item)
  }

  /**
   * Get CSS class for visibility state
   */
  getCSSClass(visibilityState: VisibilityState, entityType?: string): string {
    const baseClass = `tile-${visibilityState}`
    return entityType ? `${baseClass} ${entityType}` : baseClass
  }

  // ============================================================================
  // PRIVATE: Color helpers
  // ============================================================================

  private getMonsterColor(monster: Monster): string {
    // Color by threat level based on letter
    const letter = monster.letter.charCodeAt(0)
    const A = 'A'.charCodeAt(0)
    const Z = 'Z'.charCodeAt(0)
    const position = letter - A
    const total = Z - A

    if (position < total * 0.25) {
      return '#44FF44' // Low threat - green
    } else if (position < total * 0.5) {
      return '#FFDD00' // Medium threat - yellow
    } else if (position < total * 0.75) {
      return '#FF8800' // High threat - orange
    } else {
      return '#FF4444' // Boss tier - red
    }
  }

  private getItemColor(_item: Item): string {
    // Simplified for Phase 1, expanded in Phase 5
    return '#FFFFFF'
  }
}
