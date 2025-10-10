// ============================================================================
// ASCII DUNGEON RENDERER - Text-based rendering for game state
// ============================================================================

import { GameState, Position, ItemType, StatusEffectType } from '@game/core/core'
import { RenderingService, VisibilityState } from '@services/RenderingService'

/**
 * AsciiDungeonRenderer
 *
 * Classic text-based rendering using colored ASCII characters.
 * Provides accessibility and lower resource usage compared to sprite rendering.
 *
 * Features:
 * - Three-state visibility (visible/explored/unexplored)
 * - Color-coded entities (monsters, items, tiles)
 * - Support for detected entities (magic detection, monster detection)
 * - Respects same visibility rules as sprite renderer
 */
export class AsciiDungeonRenderer {
  constructor(private renderingService: RenderingService) {}

  /**
   * Render game state to HTML string
   * Returns HTML containing colored ASCII characters in <pre> tags
   *
   * @param state - Current game state
   * @returns HTML string for dungeon view
   */
  render(state: GameState): string {
    const level = state.levels.get(state.currentLevel)
    if (!level) return '<pre class="dungeon-grid">No level data</pre>'

    // Check for SEE_INVISIBLE status effect
    const canSeeInvisible = state.player.statusEffects.some(
      (e) => e.type === StatusEffectType.SEE_INVISIBLE
    )

    let html = '<pre class="dungeon-grid">'

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const pos: Position = { x, y }
        const tile = level.tiles[y][x]
        const visState = this.renderingService.getVisibilityState(
          pos,
          state.visibleCells,
          level
        )

        // Check for entities at this position
        let char = tile.char
        let color = this.renderingService.getColorForTile(tile, visState)

        // Items and gold (visible or detected in explored areas)
        if (visState === 'visible' || visState === 'explored') {
          // Gold piles (only if visible)
          if (visState === 'visible') {
            const gold = level.gold.find((g) => g.position.x === x && g.position.y === y)
            if (gold) {
              char = '$'
              color = '#FFD700' // Gold
            }
          }

          // Items (visible or detected)
          const item = level.items.find((i) => i.position?.x === x && i.position?.y === y)
          if (item) {
            const isDetected = state.detectedMagicItems.has(item.id)
            const isVisible = visState === 'visible'

            // Render if visible OR if detected and in explored area
            if (isVisible || isDetected) {
              char = this.getItemSymbol(item.type)
              color = isVisible
                ? this.getItemColor(item.type)
                : this.dimColor(this.getItemColor(item.type))
            }
          }

          // Monsters (visible or detected in explored areas, render on top of items)
          const monster = level.monsters.find((m) => m.position.x === x && m.position.y === y)
          if (monster) {
            const isDetected = state.detectedMonsters.has(monster.id)
            const isVisible = visState === 'visible'
            const canRenderInvisible = !monster.isInvisible || canSeeInvisible

            // Render if (visible OR detected) AND (not invisible OR has SEE_INVISIBLE)
            if ((isVisible || isDetected) && canRenderInvisible) {
              char = monster.letter
              color = isVisible
                ? this.renderingService.getColorForEntity(monster, visState)
                : this.dimColor(this.renderingService.getColorForEntity(monster, 'visible'))
            }
          }
        }

        // Stairs (visible or explored, render before player)
        const config = { showItemsInMemory: false, showGoldInMemory: false }
        if (
          level.stairsUp &&
          level.stairsUp.x === x &&
          level.stairsUp.y === y &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '<'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }
        if (
          level.stairsDown &&
          level.stairsDown.x === x &&
          level.stairsDown.y === y &&
          this.renderingService.shouldRenderEntity(pos, 'stairs', visState, config)
        ) {
          char = '>'
          color = visState === 'visible' ? '#FFFF00' : '#707070' // Yellow if visible, gray if explored
        }

        // Player (always on top)
        if (pos.x === state.player.position.x && pos.y === state.player.position.y) {
          char = '@'
          color = '#00FFFF'
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    return html
  }

  /**
   * Dim a color for detected entities (not directly visible)
   */
  private dimColor(color: string): string {
    // Convert hex to RGB, reduce brightness by 50%, return hex
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    const dimmedR = Math.floor(r * 0.5)
    const dimmedG = Math.floor(g * 0.5)
    const dimmedB = Math.floor(b * 0.5)

    return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`
  }

  /**
   * Get display symbol for item type
   */
  private getItemSymbol(itemType: ItemType): string {
    switch (itemType) {
      case ItemType.POTION:
        return '!'
      case ItemType.SCROLL:
        return '?'
      case ItemType.RING:
        return '='
      case ItemType.WAND:
        return '/'
      case ItemType.FOOD:
        return '%'
      case ItemType.OIL_FLASK:
        return '!'
      case ItemType.WEAPON:
        return ')'
      case ItemType.ARMOR:
        return '['
      default:
        return '?'
    }
  }

  /**
   * Get display color for item type
   */
  private getItemColor(itemType: ItemType): string {
    switch (itemType) {
      case ItemType.POTION:
        return '#FF00FF' // Magenta
      case ItemType.SCROLL:
        return '#FFFFFF' // White
      case ItemType.RING:
        return '#FFD700' // Gold
      case ItemType.WAND:
        return '#00FFFF' // Cyan
      case ItemType.FOOD:
        return '#8B4513' // Brown
      case ItemType.OIL_FLASK:
        return '#FFA500' // Orange
      case ItemType.WEAPON:
        return '#C0C0C0' // Silver
      case ItemType.ARMOR:
        return '#C0C0C0' // Silver
      default:
        return '#FFFFFF'
    }
  }
}
