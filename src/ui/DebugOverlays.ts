import { GameState, Monster, Position } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * DebugOverlays - Visual debug overlays for AI, pathfinding, and FOV
 *
 * Renders:
 * - AI state overlays (colored boxes, state text)
 * - Pathfinding paths (dotted lines)
 * - FOV/aggro ranges (semi-transparent circles)
 *
 * Architecture:
 * - UI component only (no game logic)
 * - Renders on canvas layer above game
 * - Uses DebugService for state queries
 */
export class DebugOverlays {
  constructor(private debugService: DebugService) {}

  /**
   * Render AI state overlay for monsters
   */
  renderAIOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.aiOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render for each monster in FOV
    level.monsters.forEach((monster) => {
      if (!state.visibleCells.has(`${monster.position.x},${monster.position.y}`)) {
        return // Only show for visible monsters
      }

      const x = monster.position.x * cellSize
      const y = monster.position.y * cellSize

      // Draw colored box around monster based on state
      ctx.strokeStyle =
        monster.state === 'HUNTING'
          ? 'rgba(255, 0, 0, 0.8)' // Red for hunting
          : monster.state === 'FLEEING'
          ? 'rgba(255, 255, 0, 0.8)' // Yellow for fleeing
          : monster.state === 'SLEEPING'
          ? 'rgba(128, 128, 128, 0.8)' // Gray for sleeping
          : 'rgba(0, 255, 255, 0.8)' // Cyan for wandering

      ctx.lineWidth = 2
      ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)

      // Draw state text above monster
      ctx.fillStyle = ctx.strokeStyle
      ctx.font = '8px monospace'
      ctx.fillText(monster.state, x + 2, y - 2)

      // Draw behavior type below monster
      const behaviorText = Array.isArray(monster.aiProfile.behavior)
        ? monster.aiProfile.behavior[0]
        : monster.aiProfile.behavior
      ctx.fillText(behaviorText, x + 2, y + cellSize + 10)
    })
  }

  /**
   * Render pathfinding overlay for monsters
   */
  renderPathOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.pathOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render path for each monster with currentPath
    level.monsters.forEach((monster) => {
      if (!monster.currentPath || monster.currentPath.length === 0) return

      // Color by behavior
      const behaviorText = Array.isArray(monster.aiProfile.behavior)
        ? monster.aiProfile.behavior[0]
        : monster.aiProfile.behavior

      ctx.strokeStyle =
        behaviorText === 'SMART'
          ? 'rgba(0, 100, 255, 0.6)' // Blue for A*
          : 'rgba(0, 255, 0, 0.6)' // Green for simple

      ctx.lineWidth = 2
      ctx.setLineDash([5, 5]) // Dotted line

      // Draw path
      ctx.beginPath()
      ctx.moveTo(
        monster.position.x * cellSize + cellSize / 2,
        monster.position.y * cellSize + cellSize / 2
      )

      monster.currentPath.forEach((pos) => {
        ctx.lineTo(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2)
      })

      ctx.stroke()
      ctx.setLineDash([]) // Reset dash

      // Draw target position marker
      if (monster.currentPath.length > 0) {
        const target = monster.currentPath[monster.currentPath.length - 1]
        ctx.fillStyle = ctx.strokeStyle
        ctx.beginPath()
        ctx.arc(
          target.x * cellSize + cellSize / 2,
          target.y * cellSize + cellSize / 2,
          4,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    })
  }

  /**
   * Render FOV/aggro overlay for monsters
   */
  renderFOVOverlay(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    cellSize: number
  ): void {
    const debugState = this.debugService.getDebugState(state)
    if (!debugState.fovOverlay) return

    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // Render for each awake monster
    level.monsters.forEach((monster) => {
      if (!monster.isAwake) return

      const x = monster.position.x * cellSize + cellSize / 2
      const y = monster.position.y * cellSize + cellSize / 2

      // Draw aggro range circle
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)' // Orange
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(x, y, monster.aiProfile.aggroRange * cellSize, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Highlight visible cells
      if (monster.visibleCells && monster.visibleCells.size > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)' // Light red
        monster.visibleCells.forEach((cellKey) => {
          const [cellX, cellY] = cellKey.split(',').map(Number)
          ctx.fillRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize)
        })
      }
    })
  }
}
