import { BaseState } from '@states/BaseState'
import { Input, GameState, Position, Monster } from '@game/core/core'
import { TargetingService } from '@services/TargetingService'
import { GameRenderer } from '@ui/GameRenderer'

/**
 * TargetConfirmCallback - called when user confirms target
 */
export type TargetConfirmCallback = (targetMonsterId: string | null) => void

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
 * // Zap wand command
 * const targetingState = new TargetSelectionState(
 *   targetingService,
 *   gameRenderer,
 *   gameState,
 *   7, // range
 *   (targetMonsterId) => {
 *     if (targetMonsterId) {
 *       // Zap the wand at target
 *       wandService.zap(gameState, wand, targetMonsterId)
 *     }
 *     stateManager.popState() // Close targeting
 *   },
 *   () => stateManager.popState() // Cancel
 * )
 * stateManager.pushState(targetingState)
 */
export class TargetSelectionState extends BaseState {
  private cursorPosition: Position
  private visibleMonsters: Monster[] = []
  private currentTargetIndex: number = 0

  constructor(
    private targetingService: TargetingService,
    private gameRenderer: GameRenderer,
    private gameState: GameState,
    private range: number,
    private onTarget: TargetConfirmCallback,
    private onCancel: TargetCancelCallback
  ) {
    super()
    // Initialize cursor at player position
    this.cursorPosition = { ...gameState.player.position }
  }

  /**
   * Called when state becomes active
   * Initialize cursor at nearest monster (if any)
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
        this.currentTargetIndex = 0
      }
    }
  }

  /**
   * Called when state is paused or removed
   * Hide targeting overlay
   */
  exit(): void {
    this.gameRenderer.hideTargetingInfo()
  }

  /**
   * Game tick logic (targeting is static, could animate cursor)
   * @param deltaTime - Time since last update
   */
  update(deltaTime: number): void {
    // Targeting is turn-based, no frame updates needed
    // Could add cursor blinking animation here in future
  }

  /**
   * Render the targeting cursor and info
   * First stores targeting state, then renders the full game with targeting overlay
   */
  render(): void {
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
  handleInput(input: Input): void {
    switch (input.key) {
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
        if (input.shift) {
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
   * Validate if current cursor position is a valid target
   */
  private isValidTarget(): boolean {
    const monster = this.getMonsterAtCursor()
    if (!monster) return false

    // Check range using Manhattan distance (consistent with TargetingService)
    const distance = this.targetingService.distance(
      this.gameState.player.position,
      this.cursorPosition
    )

    if (distance > this.range) return false

    // Check if monster is in FOV
    const key = `${this.cursorPosition.x},${this.cursorPosition.y}`
    return this.gameState.visibleCells.has(key)
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
      // Calculate Manhattan distance from player
      const dist = this.targetingService.distance(
        this.gameState.player.position,
        { x: newX, y: newY }
      )

      // Allow cursor to move anywhere within range
      // Visual feedback will indicate if target is invalid
      if (dist <= this.range) {
        this.cursorPosition = { x: newX, y: newY }
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
      // Update index for tracking
      this.currentTargetIndex = this.visibleMonsters.findIndex((m) => m.id === nextMonster.id)
    }
  }

  /**
   * Confirm target and call callback
   * Only confirms if target is valid
   */
  private confirmTarget(): void {
    const monster = this.getMonsterAtCursor()

    // If no monster at cursor or target is invalid, don't confirm
    if (!monster || !this.isValidTarget()) {
      // Could add a message here: "Invalid target"
      return
    }

    // Call callback with monster ID
    this.onTarget(monster.id)
  }
}
