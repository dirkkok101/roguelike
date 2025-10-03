import { GameState, Position } from '@types/core/core'
import { RenderingService } from '@services/RenderingService'

// ============================================================================
// GAME RENDERER - DOM rendering for game state
// ============================================================================

export class GameRenderer {
  private dungeonContainer: HTMLElement
  private statsContainer: HTMLElement
  private messagesContainer: HTMLElement

  constructor(
    private renderingService: RenderingService,
    private config = {
      dungeonWidth: 80,
      dungeonHeight: 22,
      showItemsInMemory: false,
      showGoldInMemory: false,
    }
  ) {
    // Create UI structure
    this.dungeonContainer = this.createDungeonView()
    this.statsContainer = this.createStatsView()
    this.messagesContainer = this.createMessagesView()
  }

  /**
   * Render complete game state
   */
  render(state: GameState): void {
    this.renderDungeon(state)
    this.renderStats(state)
    this.renderMessages(state)
  }

  /**
   * Get root container
   */
  getContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'game-container'
    container.appendChild(this.messagesContainer)
    container.appendChild(this.dungeonContainer)
    container.appendChild(this.statsContainer)
    return container
  }

  // ============================================================================
  // PRIVATE: Rendering methods
  // ============================================================================

  private createDungeonView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'dungeon'
    container.className = 'dungeon-view'
    return container
  }

  private createStatsView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'stats'
    container.className = 'stats-view'
    return container
  }

  private createMessagesView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'messages'
    container.className = 'messages-view'
    return container
  }

  private renderDungeon(state: GameState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

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

        // Player
        if (
          pos.x === state.player.position.x &&
          pos.y === state.player.position.y
        ) {
          char = '@'
          color = '#00FFFF'
        }
        // Monsters (only if visible)
        else if (visState === 'visible') {
          const monster = level.monsters.find(
            (m) => m.position.x === x && m.position.y === y
          )
          if (monster) {
            char = monster.letter
            color = this.renderingService.getColorForEntity(monster, visState)
          }
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    this.dungeonContainer.innerHTML = html
  }

  private renderStats(state: GameState): void {
    const { player } = state
    const lightSource = player.equipment.lightSource

    this.statsContainer.innerHTML = `
      <div class="stats">
        <div>HP: ${player.hp}/${player.maxHp}</div>
        <div>Str: ${player.strength}/${player.maxStrength}</div>
        <div>AC: ${player.ac}</div>
        <div>Level: ${player.level}</div>
        <div>XP: ${player.xp}</div>
        <div>Gold: ${player.gold}</div>
        <div>Depth: ${state.currentLevel}</div>
        <div>Turn: ${state.turnCount}</div>
        ${
          lightSource
            ? `<div>Light: ${lightSource.name} ${
                lightSource.fuel !== undefined ? `(${lightSource.fuel})` : ''
              }</div>`
            : '<div>Light: None (darkness!)</div>'
        }
      </div>
    `
  }

  private renderMessages(state: GameState): void {
    const recent = state.messages.slice(-5)
    this.messagesContainer.innerHTML = `
      <div class="messages">
        ${recent.map((msg) => `<div class="msg-${msg.type}">${msg.text}</div>`).join('')}
      </div>
    `
  }
}
