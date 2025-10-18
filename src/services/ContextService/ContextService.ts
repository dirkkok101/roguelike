import { GameState, Position, Level, Item, Monster, Door, DoorState } from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// CONTEXT SERVICE - Analyzes game state to determine available actions
// ============================================================================

/**
 * Represents an available action with display information
 */
export interface ContextAction {
  key: string // Keyboard shortcut
  label: string // Action description
  priority: number // Display order (higher = more important)
  category: 'primary' | 'secondary' | 'utility'
}

/**
 * Game context information for UI display
 */
export interface GameContext {
  actions: ContextAction[]
  primaryHint?: string // Main suggestion (e.g., "Item here!")
  warnings: string[] // Important alerts
}

/**
 * ContextService - Analyzes game state to determine available actions
 *
 * Provides context-aware command suggestions based on:
 * - Player position
 * - Nearby entities (items, doors, stairs, monsters)
 * - Player state (inventory full, etc.)
 * - Current game phase
 *
 * Architecture:
 * - Pure logic, no rendering
 * - Returns structured context data
 * - UI components consume this data
 */
export class ContextService {
  constructor(private identificationService: IdentificationService) {}

  /**
   * Analyze game state and return available actions
   */
  analyzeContext(state: GameState): GameContext {
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return { actions: [], warnings: [] }
    }

    const actions: ContextAction[] = []
    const warnings: string[] = []
    let primaryHint: string | undefined

    // Check player position for items
    const itemAtPosition = this.getItemAtPosition(level, state.player.position)
    if (itemAtPosition) {
      const displayName = this.identificationService.getDisplayName(itemAtPosition, state)
      primaryHint = `Item here: ${displayName}`
      actions.push(
        { key: ',', label: 'pickup', priority: 100, category: 'primary' },
        { key: 'i', label: 'inventory', priority: 90, category: 'primary' }
      )

      // Add type-specific actions
      if (itemAtPosition.type === 'WEAPON') {
        actions.push({ key: 'w', label: 'wield', priority: 80, category: 'primary' })
      } else if (itemAtPosition.type === 'ARMOR') {
        actions.push({ key: 'W', label: 'wear', priority: 80, category: 'primary' })
      } else if (itemAtPosition.type === 'RING') {
        actions.push({ key: 'P', label: 'put on', priority: 80, category: 'primary' })
      }
    }

    // Check for gold (automatic pickup, just notify)
    const goldAtPosition = this.getGoldAtPosition(level, state.player.position)
    if (goldAtPosition) {
      primaryHint = `${goldAtPosition.amount} gold pieces here (auto-pickup)`
    }

    // Check for nearby doors
    const nearbyDoor = this.getNearbyDoor(level, state.player.position)
    if (nearbyDoor) {
      if (nearbyDoor.state === DoorState.CLOSED) {
        actions.push({ key: 'o', label: 'open door', priority: 90, category: 'primary' })
      } else if (nearbyDoor.state === DoorState.OPEN) {
        actions.push({ key: 'c', label: 'close door', priority: 70, category: 'secondary' })
      }
      actions.push({ key: 's', label: 'search', priority: 60, category: 'secondary' })
    }

    // Check for stairs
    if (this.isOnStairs(level, state.player.position)) {
      if (level.stairsDown && this.positionsEqual(state.player.position, level.stairsDown)) {
        actions.push({ key: '>', label: 'descend', priority: 95, category: 'primary' })
      }
      if (level.stairsUp && this.positionsEqual(state.player.position, level.stairsUp)) {
        actions.push({ key: '<', label: 'ascend', priority: 95, category: 'primary' })
      }
    }

    // Check for adjacent monsters (combat context)
    const adjacentMonster = this.getAdjacentMonster(level, state.player.position)
    if (adjacentMonster) {
      actions.push(
        { key: '↑↓←→', label: 'attack', priority: 100, category: 'primary' },
        { key: 's', label: 'search', priority: 50, category: 'secondary' }
      )
    }

    // Check inventory status
    if (state.player.inventory.length >= 26) {
      warnings.push('⚠ Inventory full (26/26)')
      actions.push({ key: 'd', label: 'drop item', priority: 85, category: 'primary' })
    }

    // Always available utility actions (if no primary context)
    if (actions.filter((a) => a.category === 'primary').length === 0) {
      actions.push(
        { key: 'i', label: 'inventory', priority: 70, category: 'utility' },
        { key: 'e', label: 'eat', priority: 65, category: 'utility' },
        { key: 'q', label: 'quaff', priority: 64, category: 'utility' },
        { key: 'r', label: 'read', priority: 63, category: 'utility' },
        { key: 'z', label: 'zap', priority: 62, category: 'utility' },
        { key: 's', label: 'search', priority: 61, category: 'utility' },
        { key: 'Shift+↑↓←→', label: 'run', priority: 60, category: 'utility' },
        { key: '?', label: 'help', priority: 50, category: 'utility' }
      )
    }

    // Sort by priority (highest first)
    actions.sort((a, b) => b.priority - a.priority)

    return {
      actions: actions.slice(0, 8), // Show max 8 actions
      primaryHint,
      warnings,
    }
  }

  /**
   * Get item at specific position
   */
  private getItemAtPosition(level: Level, pos: Position): Item | null {
    return level.items.find((item) => item.position?.x === pos.x && item.position?.y === pos.y) || null
  }

  /**
   * Get gold at specific position
   */
  private getGoldAtPosition(level: Level, pos: Position) {
    return level.gold.find((g) => g.position.x === pos.x && g.position.y === pos.y) || null
  }

  /**
   * Get nearby door (adjacent tiles)
   */
  private getNearbyDoor(level: Level, pos: Position): Door | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 }, // Up
      { x: pos.x, y: pos.y + 1 }, // Down
      { x: pos.x - 1, y: pos.y }, // Left
      { x: pos.x + 1, y: pos.y }, // Right
    ]

    for (const adjPos of adjacentPositions) {
      const door = level.doors.find((d) => d.position.x === adjPos.x && d.position.y === adjPos.y)
      if (door) return door
    }

    return null
  }

  /**
   * Check if player is on stairs
   */
  private isOnStairs(level: Level, pos: Position): boolean {
    if (level.stairsDown && this.positionsEqual(pos, level.stairsDown)) return true
    if (level.stairsUp && this.positionsEqual(pos, level.stairsUp)) return true
    return false
  }

  /**
   * Get adjacent monster (for combat context)
   */
  private getAdjacentMonster(level: Level, pos: Position): Monster | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const monster = level.monsters.find(
        (m) => m.position.x === adjPos.x && m.position.y === adjPos.y && m.isAwake
      )
      if (monster) return monster
    }

    return null
  }

  /**
   * Helper: Compare positions
   */
  private positionsEqual(a: Position, b: Position): boolean {
    return a.x === b.x && a.y === b.y
  }
}
