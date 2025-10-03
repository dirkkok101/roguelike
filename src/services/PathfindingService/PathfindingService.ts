import { Position, Level } from '@game/core/core'

// ============================================================================
// PATHFINDING SERVICE - A* algorithm for monster AI
// ============================================================================

interface PathNode {
  position: Position
  g: number // Cost from start
  h: number // Heuristic to goal
  f: number // Total cost
  parent: PathNode | null
}

export class PathfindingService {
  /**
   * Find path from start to goal using A*
   */
  findPath(start: Position, goal: Position, level: Level): Position[] | null {
    const openSet: PathNode[] = []
    const closedSet = new Set<string>()

    const startNode: PathNode = {
      position: start,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null,
    }

    openSet.push(startNode)

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      // Reached goal?
      if (current.position.x === goal.x && current.position.y === goal.y) {
        return this.reconstructPath(current)
      }

      closedSet.add(this.posKey(current.position))

      // Check neighbors
      const neighbors = this.getNeighbors(current.position, level)
      for (const neighborPos of neighbors) {
        const key = this.posKey(neighborPos)
        if (closedSet.has(key)) continue

        const g = current.g + 1
        const h = this.heuristic(neighborPos, goal)
        const f = g + h

        // Check if in open set
        const existing = openSet.find(
          (n) => n.position.x === neighborPos.x && n.position.y === neighborPos.y
        )

        if (existing) {
          if (g < existing.g) {
            existing.g = g
            existing.f = f
            existing.parent = current
          }
        } else {
          openSet.push({
            position: neighborPos,
            g,
            h,
            f,
            parent: current,
          })
        }
      }
    }

    return null // No path found
  }

  /**
   * Get next step toward goal (simplified, no full path)
   */
  getNextStep(start: Position, goal: Position, level: Level): Position | null {
    const path = this.findPath(start, goal, level)
    if (!path || path.length < 2) return null
    return path[1] // First step after start
  }

  // ============================================================================
  // PRIVATE: A* helpers
  // ============================================================================

  /**
   * Manhattan distance heuristic
   */
  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  /**
   * Get walkable neighbors
   */
  private getNeighbors(pos: Position, level: Level): Position[] {
    const neighbors: Position[] = []
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
    ]

    for (const dir of directions) {
      const newPos = { x: pos.x + dir.x, y: pos.y + dir.y }

      if (
        newPos.x >= 0 &&
        newPos.x < level.width &&
        newPos.y >= 0 &&
        newPos.y < level.height
      ) {
        const tile = level.tiles[newPos.y][newPos.x]
        if (tile.walkable) {
          neighbors.push(newPos)
        }
      }
    }

    return neighbors
  }

  /**
   * Reconstruct path from goal to start
   */
  private reconstructPath(node: PathNode): Position[] {
    const path: Position[] = []
    let current: PathNode | null = node

    while (current !== null) {
      path.unshift(current.position)
      current = current.parent
    }

    return path
  }

  /**
   * Convert position to string key
   */
  private posKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }
}
