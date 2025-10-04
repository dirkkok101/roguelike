import { Position, Level } from '@game/core/core'

// ============================================================================
// FOV SERVICE - Recursive shadowcasting algorithm
// ============================================================================

export class FOVService {
  /**
   * Compute field of view from origin position
   * Returns set of visible position keys (format: "x,y")
   */
  computeFOV(origin: Position, radius: number, level: Level): Set<string> {
    const visible = new Set<string>()

    // Origin is always visible
    visible.add(this.posToKey(origin))

    if (radius === 0) return visible

    // Process all 8 octants
    for (let octant = 0; octant < 8; octant++) {
      this.castLight(
        level,
        origin,
        radius,
        1,
        1.0,
        0.0,
        octant,
        visible
      )
    }

    return visible
  }

  /**
   * Check if position is in FOV
   */
  isInFOV(position: Position, visibleCells: Set<string>): boolean {
    return visibleCells.has(this.posToKey(position))
  }

  /**
   * Check if tile blocks vision
   */
  isBlocking(position: Position, level: Level): boolean {
    if (
      position.x < 0 ||
      position.x >= level.width ||
      position.y < 0 ||
      position.y >= level.height
    ) {
      return true
    }

    const tile = level.tiles[position.y][position.x]
    return !tile.transparent
  }

  // ============================================================================
  // PRIVATE: Recursive shadowcasting implementation
  // ============================================================================

  private castLight(
    level: Level,
    origin: Position,
    radius: number,
    row: number,
    startSlope: number,
    endSlope: number,
    octant: number,
    visible: Set<string>
  ): void {
    if (startSlope < endSlope) return

    let nextStartSlope = startSlope

    for (let i = row; i <= radius; i++) {
      let blocked = false

      for (let dx = -i, dy = -i; dx <= 0; dx++) {
        const currentX = dx
        const currentY = dy

        const lSlope = (dx - 0.5) / (dy + 0.5)
        const rSlope = (dx + 0.5) / (dy - 0.5)

        if (startSlope < rSlope) continue
        if (endSlope > lSlope) break

        // Transform to actual position based on octant
        const actualPos = this.transformOctant(
          origin,
          currentX,
          currentY,
          octant
        )

        // Check if within map bounds
        if (
          actualPos.x < 0 ||
          actualPos.x >= level.width ||
          actualPos.y < 0 ||
          actualPos.y >= level.height
        ) {
          continue
        }

        // Check if within radius (Euclidean distance)
        const distance = Math.sqrt(
          Math.pow(actualPos.x - origin.x, 2) +
            Math.pow(actualPos.y - origin.y, 2)
        )
        if (distance > radius) continue

        // Mark as visible
        visible.add(this.posToKey(actualPos))

        // Check if blocking
        const isBlocked = this.isBlocking(actualPos, level)

        if (blocked) {
          if (isBlocked) {
            nextStartSlope = rSlope
            continue
          } else {
            blocked = false
            startSlope = nextStartSlope
          }
        } else {
          if (isBlocked && i < radius) {
            blocked = true
            this.castLight(
              level,
              origin,
              radius,
              i + 1,
              startSlope,
              lSlope,
              octant,
              visible
            )
            nextStartSlope = rSlope
          }
        }
      }

      if (blocked) break
    }
  }

  /**
   * Transform coordinates based on octant
   */
  private transformOctant(
    origin: Position,
    x: number,
    y: number,
    octant: number
  ): Position {
    switch (octant) {
      case 0:
        return { x: origin.x + x, y: origin.y - y }
      case 1:
        return { x: origin.x + y, y: origin.y - x }
      case 2:
        return { x: origin.x + y, y: origin.y + x }
      case 3:
        return { x: origin.x + x, y: origin.y + y }
      case 4:
        return { x: origin.x - x, y: origin.y + y }
      case 5:
        return { x: origin.x - y, y: origin.y + x }
      case 6:
        return { x: origin.x - y, y: origin.y - x }
      case 7:
        return { x: origin.x - x, y: origin.y - y }
      default:
        return origin
    }
  }

  /**
   * Convert position to string key for Set
   */
  private posToKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }

  /**
   * Convert string key back to position
   */
  keyToPos(key: string): Position {
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  }

  /**
   * Update explored tiles based on visible cells
   * Returns new Level with updated explored array (immutable)
   */
  updateExploredTiles(level: Level, visibleCells: Set<string>): Level {
    // Create new explored array (immutability)
    const updatedExplored = level.explored.map((row) => [...row])

    // Mark all visible cells as explored
    visibleCells.forEach((key) => {
      const pos = this.keyToPos(key)
      // Bounds checking for safety
      if (updatedExplored[pos.y] && updatedExplored[pos.y][pos.x] !== undefined) {
        updatedExplored[pos.y][pos.x] = true
      }
    })

    // Return new Level object with updated explored array
    return { ...level, explored: updatedExplored }
  }
}
