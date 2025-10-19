import { IReplayController } from '@states/ReplayDebugState'
import { GameState } from '@game/core/core'
import './StateInspectorPanel.css'

/**
 * StateInspectorPanel - Right-side panel for state inspection
 *
 * Shows comprehensive game state with collapsible sections:
 * - Current turn info
 * - Player state
 * - Level state
 * - Command history
 * - Validation
 */
export class StateInspectorPanel {
  public readonly element: HTMLDivElement

  private currentTurnSection: HTMLElement
  private playerStateSection: HTMLDetailsElement
  private levelStateSection: HTMLDetailsElement
  private commandHistorySection: HTMLDetailsElement

  private stateChangeCallback: () => void

  constructor(private controller: IReplayController) {
    this.element = this.createElements()

    // Subscribe to state changes
    this.stateChangeCallback = () => this.render()
    this.controller.onStateChange(this.stateChangeCallback)

    // Initial render
    this.render()
  }

  private createElements(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'state-inspector-panel'

    // Header
    const header = document.createElement('div')
    header.className = 'state-inspector-header'
    header.textContent = '🐛 STATE INSPECTOR'
    container.appendChild(header)

    // Current turn info (always visible)
    this.currentTurnSection = this.createCurrentTurnSection()
    container.appendChild(this.currentTurnSection)

    // Player state (collapsible)
    this.playerStateSection = this.createCollapsibleSection('Player State', true)
    container.appendChild(this.playerStateSection)

    // Level state (collapsible)
    this.levelStateSection = this.createCollapsibleSection('Level State', true)
    container.appendChild(this.levelStateSection)

    // Command history (collapsible, default closed)
    this.commandHistorySection = this.createCollapsibleSection('Command History', false)
    container.appendChild(this.commandHistorySection)

    return container
  }

  private createCurrentTurnSection(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'state-inspector-section current-turn'

    const title = document.createElement('div')
    title.className = 'section-title'
    title.textContent = '📊 Current Turn Info'
    section.appendChild(title)

    const content = document.createElement('div')
    content.className = 'section-content'
    section.appendChild(content)

    return section
  }

  private createCollapsibleSection(title: string, open: boolean): HTMLDetailsElement {
    const details = document.createElement('details')
    details.className = 'state-inspector-section'
    if (open) details.open = true

    const summary = document.createElement('summary')
    summary.className = 'section-title'
    summary.textContent = title
    details.appendChild(summary)

    const content = document.createElement('div')
    content.className = 'section-content'
    details.appendChild(content)

    return details
  }

  private render(): void {
    const state = this.controller.getCurrentState()
    const turn = this.controller.getCurrentTurn()
    const metadata = this.controller.getReplayMetadata()

    if (!state || !metadata) {
      this.renderLoading()
      return
    }

    this.renderCurrentTurn(turn, state)
    this.renderPlayerState(state)
    this.renderLevelState(state)
    this.renderCommandHistory(turn)
  }

  private renderLoading(): void {
    this.currentTurnSection.querySelector('.section-content')!.innerHTML =
      '<div class="loading">Loading replay data...</div>'
  }

  private renderCurrentTurn(turn: number, state: GameState): void {
    const content = this.currentTurnSection.querySelector('.section-content')!
    const metadata = this.controller.getReplayMetadata()!

    content.innerHTML = `
      <div class="info-row">
        <span class="info-label">Turn:</span>
        <span class="info-value">${turn}/${metadata.turnCount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Game Turn:</span>
        <span class="info-value">${state.turnCount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Seed:</span>
        <span class="info-value">${state.seed}</span>
      </div>
    `
  }

  private renderPlayerState(state: GameState): void {
    const content = this.playerStateSection.querySelector('.section-content')!
    const player = state.player

    const hpPercent = (player.hp / player.maxHp) * 100
    const hpBar = '█'.repeat(Math.floor(hpPercent / 10)) + '░'.repeat(10 - Math.floor(hpPercent / 10))

    const hungerPercent = (player.hunger / player.maxHunger) * 100
    const hungerStatus = hungerPercent > 75 ? 'Fed' : hungerPercent > 50 ? 'Hungry' : hungerPercent > 25 ? 'Weak' : 'Starving'

    content.innerHTML = `
      <div class="info-row">
        <span class="info-label">Position:</span>
        <span class="info-value">(${player.position.x}, ${player.position.y})</span>
      </div>
      <div class="info-row">
        <span class="info-label">HP:</span>
        <span class="info-value">${player.hp}/${player.maxHp} [${hpBar}]</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level:</span>
        <span class="info-value">${player.level} (${player.xp}/${player.xpToNextLevel} XP)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hunger:</span>
        <span class="info-value">${player.hunger}/${player.maxHunger} (${hungerStatus})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Gold:</span>
        <span class="info-value">${player.gold}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Strength:</span>
        <span class="info-value">${player.strength}/${player.maxStrength}</span>
      </div>
      <div class="info-row">
        <span class="info-label">AC:</span>
        <span class="info-value">${player.armorClass}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Inventory:</span>
        <span class="info-value">${player.inventory.length}/${player.inventoryCapacity}</span>
      </div>
    `
  }

  private renderLevelState(state: GameState): void {
    const content = this.levelStateSection.querySelector('.section-content')!
    const currentLevel = state.levels.get(state.currentLevel)

    if (!currentLevel) {
      content.innerHTML = '<div class="error">Level data not found</div>'
      return
    }

    const awakeMonsters = currentLevel.monsters.filter(m => m.isAwake).length

    content.innerHTML = `
      <div class="info-row">
        <span class="info-label">Depth:</span>
        <span class="info-value">${state.currentLevel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Monsters:</span>
        <span class="info-value">${currentLevel.monsters.length} (${awakeMonsters} awake)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Items:</span>
        <span class="info-value">${currentLevel.items.length}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Gold piles:</span>
        <span class="info-value">${currentLevel.gold.length}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Traps:</span>
        <span class="info-value">${currentLevel.traps.length}</span>
      </div>
    `
  }

  private renderCommandHistory(currentTurn: number): void {
    const content = this.commandHistorySection.querySelector('.section-content')!

    // Show last 10 commands leading up to current turn
    const startIdx = Math.max(0, currentTurn - 10)
    const endIdx = currentTurn

    // Use controller.getCommands() instead of metadata.commands
    const allCommands = this.controller.getCommands()
    const commands = allCommands.slice(startIdx, endIdx)

    if (commands.length === 0) {
      content.innerHTML = '<div class="empty">No commands yet</div>'
      return
    }

    const commandsHTML = commands.map((cmd, idx) => {
      const turnNum = startIdx + idx + 1
      const isCurrent = turnNum === currentTurn
      return `
        <div class="command-entry ${isCurrent ? 'current' : ''}">
          <span class="command-turn">${turnNum}:</span>
          <span class="command-type">${cmd.commandType}</span>
          <span class="command-actor">(${cmd.actorType})</span>
        </div>
      `
    }).join('')

    content.innerHTML = commandsHTML
  }

  public destroy(): void {
    this.controller.removeStateChangeListener(this.stateChangeCallback)
    this.element.remove()
  }
}
