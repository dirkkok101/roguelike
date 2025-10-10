import { BaseState } from '@states/BaseState'
import { Input, GameState, Position, Monster } from '@game/core/core'
import { TargetingService } from '@services/TargetingService'
import { GameRenderer } from '@ui/GameRenderer'

/**
 * ITargetingState - Interface for targeting states (for GameRenderer)
 */
export interface ITargetingState {
  getCursorPosition(): Position
  getRange(): number
  getGameState(): GameState
}

/**
 * TargetConfirmCallback - called when user confirms target
 * @param targetPosition - The position where the user targeted (may or may not have a monster)
 */
export type TargetConfirmCallback = (targetPosition: Position) => void

/**
 * TargetCancelCallback - called when user cancels targeting
 */
export type TargetCancelCallback = () => void

/**
 * TargetSelectionState - Cursor-based targeting for wands, spells, ranged attacks
 *
 * Purpose: Interactive cursor mode for selecting target positions:
 * - Wand zapping (select monster or tile to zap)
 * - Spell casting (select area or target)
 * - Throwing items (select target)
 * - Ranged attacks (select enemy)
 *
 * Features:
 * - Cursor movement (h,j,k,l,y,u,b,n keys + arrows)
 * - Range validation (can't target beyond range)
 * - Line-of-sight checking (visual line from player to cursor)
 * - Monster cycling (Tab key)
 * - Target confirmation (Enter/Space)
 * - Cancel (ESC)
 * - Visual cursor overlay with line rendering
 * - Target info display (monster name, distance, etc.)
 *
 * State Properties:
 * - isPaused(): true (targeting pauses gameplay)
 * - isTransparent(): true (game visible with cursor overlay)
 *
 * Architecture:
 * - Integrated in-game targeting (no modal)
 * - Uses TargetingService for logic (monster cycling, range validation)
 * - Renders via GameRenderer's targeting overlay methods
 * - Callback pattern allows commands to handle target selection
 *
 * @example
 * // Zap wand command with position-based targeting
 * const targetingState = new TargetSelectionState(
 *   targetingService,
 *   gameRenderer,
 *   gameState,
 *   7, // range
 *   (targetPosition) => {
 *     // Zap the wand at target position (projectile logic in WandService)
 *     const command = new ZapWandCommand(
 *       wand.id,
 *       inventoryService,
 *       wandService,
 *       messageService,
 *       turnService,
 *       statusEffectService,
 *       targetingService,
 *       targetPosition
 *     )
 *     const newState = command.execute(gameState)
 *     stateManager.popState() // Close targeting
 *   },
 *   () => stateManager.popState() // Cancel
 * )
 * stateManager.pushState(targetingState)
 */
export class TargetSelectionState extends BaseState implements ITargetingState {
  private cursorPosition: Position
  private visibleMonsters: Monster[] = []

  constructor(
    private targetingService: TargetingService,
    private gameRenderer: GameRenderer,
    private gameState: GameState,
    private range: number,
    private onTarget: TargetConfirmCallback,
    private onCancel: TargetCancelCallback
  ) {
    super()
    // Cursor position will be set in enter() to nearest monster or adjacent walkable tile
    this.cursorPosition = { ...gameState.player.position }
  }

  /**
   * Called when state becomes active
   * Initialize cursor at nearest monster (if any), or adjacent walkable tile
   */
  enter(): void {
    const currentLevel = this.gameState.levels.get(this.gameState.currentLevel)
    if (!currentLevel) {
      this.onCancel()
      return
    }

    // Get visible monsters sorted by distance
    this.visibleMonsters = this.targetingService.getVisibleMonsters(
      this.gameState.player,
      currentLevel,
      this.gameState.visibleCells
    )

    // Initialize cursor at nearest valid monster (if any)
    if (this.visibleMonsters.length > 0) {
      const nearestMonster = this.targetingService.getNextTarget(
        undefined,
        this.visibleMonsters,
        'nearest'
      )
      if (nearestMonster) {
        this.cursorPosition = { ...nearestMonster.position }
        return
      }
    }

    // No monsters visible - initialize cursor at first walkable adjacent tile
    // Try tiles in order: right, up, left, down, diagonals
    const adjacentOffsets = [
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: -1 },  // up
      { dx: -1, dy: 0 },  // left
      { dx: 0, dy: 1 },   // down
      { dx: 1, dy: -1 },  // up-right
      { dx: -1, dy: -1 }, // up-left
      { dx: 1, dy: 1 },   // down-right
      { dx: -1, dy: 1 },  // down-left
    ]

    for (const offset of adjacentOffsets) {
      const x = this.gameState.player.position.x + offset.dx
      const y = this.gameState.player.position.y + offset.dy

      // Check bounds
      if (x >= 0 && x < currentLevel.width && y >= 0 && y < currentLevel.height) {
        const tile = currentLevel.tiles[y][x]
        if (tile.walkable) {
          this.cursorPosition = { x, y }
          return
        }
      }
    }

    // Fallback: If all adjacent tiles are non-walkable, cancel targeting
    // (This shouldn't happen in normal gameplay, but handle it gracefully)
    this.onCancel()
  }

  /**
   * Called when state is paused or removed
   * Hide targeting overlay
   */
  exit(): void {
    if (!this.gameRenderer) {
      console.error('GameRenderer not initialized in TargetSelectionState')
      return
    }
    this.gameRenderer.hideTargetingInfo()
  }

  /**
   * Game tick logic (targeting is static, could animate cursor)
   * @param deltaTime - Time since last update
   */
  update(_deltaTime: number): void {
    // Targeting is turn-based, no frame updates needed
    // Could add cursor blinking animation here in future
  }

  /**
   * Render the targeting cursor and info
   * First stores targeting state, then renders the full game with targeting overlay
   */
  render(): void {
    if (!this.gameRenderer) {
      console.error('GameRenderer not initialized in TargetSelectionState')
      return
    }

    // Store targeting state FIRST so GameRenderer can use it during render
    this.gameRenderer.renderTargetingOverlay(this)

    // Then render base game with targeting overlay (dungeon, stats, messages, cursor, line)
    this.gameRenderer.render(this.gameState)
  }

  /**
   * Handle input for targeting
   *
   * Commands:
   * - h,j,k,l,y,u,b,n: Move cursor (vim-style)
   * - Arrow keys: Move cursor
   * - Enter/Space: Confirm target (calls onTarget)
   * - Tab: Cycle to next visible monster
   * - Shift+Tab: Cycle to previous visible monster
   * - ESC: Cancel targeting (calls onCancel)
   *
   * @param input - Key press and modifiers
   */
  handleInput(_input: Input): void {
    switch (_input.key) {
      // Vim-style movement keys
      case 'h': // Left
        this.moveCursor(-1, 0)
        break
      case 'j': // Down
        this.moveCursor(0, 1)
        break
      case 'k': // Up
        this.moveCursor(0, -1)
        break
      case 'l': // Right
        this.moveCursor(1, 0)
        break
      case 'y': // Up-left
        this.moveCursor(-1, -1)
        break
      case 'u': // Up-right
        this.moveCursor(1, -1)
        break
      case 'b': // Down-left
        this.moveCursor(-1, 1)
        break
      case 'n': // Down-right
        this.moveCursor(1, 1)
        break

      // Arrow keys
      case 'ArrowUp':
        this.moveCursor(0, -1)
        break
      case 'ArrowDown':
        this.moveCursor(0, 1)
        break
      case 'ArrowLeft':
        this.moveCursor(-1, 0)
        break
      case 'ArrowRight':
        this.moveCursor(1, 0)
        break

      // Confirm target
      case 'Enter':
      case ' ':
        this.confirmTarget()
        break

      // Cycle monsters
      case 'Tab':
        if (_input.shift) {
          this.cycleMonster('prev')
        } else {
          this.cycleMonster('next')
        }
        break

      // Cancel targeting
      case 'Escape':
        this.onCancel()
        break
    }
  }

  /**
   * Targeting is a paused state (gameplay pauses during targeting)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Targeting is transparent (shows game with cursor overlay)
   * Players can see the dungeon and monsters while targeting
   */
  isTransparent(): boolean {
    return true
  }

  /**
   * Get current cursor position (for GameRenderer)
   */
  getCursorPosition(): Position {
    return this.cursorPosition
  }

  /**
   * Get maximum targeting range (for GameRenderer)
   */
  getRange(): number {
    return this.range
  }

  /**
   * Get current game state (for GameRenderer)
   */
  getGameState(): GameState {
    return this.gameState
  }

  /**
   * Get monster at cursor position (if any)
   */
  private getMonsterAtCursor(): Monster | null {
    const level = this.gameState.levels.get(this.gameState.currentLevel)
    if (!level) return null

    return level.monsters.find(
      (m) => m.position.x === this.cursorPosition.x && m.position.y === this.cursorPosition.y
    ) || null
  }

  /**
   * Move cursor in a direction
   * @param dx - X offset (-1, 0, 1)
   * @param dy - Y offset (-1, 0, 1)
   */
  private moveCursor(dx: number, dy: number): void {
    const newX = this.cursorPosition.x + dx
    const newY = this.cursorPosition.y + dy

    // Validate position is on map
    const level = this.gameState.levels.get(this.gameState.currentLevel)
    if (!level) return

    if (newX >= 0 && newX < level.width && newY >= 0 && newY < level.height) {
      const newPos = { x: newX, y: newY }

      // Check if tile is walkable (cursor can only move to walkable tiles)
      const tile = level.tiles[newY][newX]
      if (!tile.walkable) {
        return // Cannot move cursor to non-walkable tiles (walls, etc.)
      }

      // Calculate Manhattan distance from player
      const dist = this.targetingService.distance(this.gameState.player.position, newPos)

      // Allow cursor to move anywhere walkable within range
      if (dist <= this.range) {
        this.cursorPosition = newPos
      }
    }
  }

  /**
   * Cycle to next/previous visible monster
   * @param direction - 'next' or 'prev'
   */
  private cycleMonster(direction: 'next' | 'prev'): void {
    if (this.visibleMonsters.length === 0) return

    // Get current monster ID (if cursor is on a monster)
    const currentMonster = this.getMonsterAtCursor()
    const currentId = currentMonster?.id

    // Get next monster in cycle
    const nextMonster = this.targetingService.getNextTarget(
      currentId,
      this.visibleMonsters,
      direction
    )

    if (nextMonster) {
      this.cursorPosition = { ...nextMonster.position }
    }
  }

  /**
   * Confirm target and call callback
   * Fires wand at the targeted position (whether empty or with monster)
   * The WandService will handle projectile logic to find what gets hit
   */
  private confirmTarget(): void {
    // Cannot target player's own position
    if (
      this.cursorPosition.x === this.gameState.player.position.x &&
      this.cursorPosition.y === this.gameState.player.position.y
    ) {
      return // Silently ignore attempts to target self
    }

    // Fire at cursor position (enable firing at empty tiles for projectile logic)
    this.onTarget({ ...this.cursorPosition })
  }
}
