# Replay Debugger UI Enhancement Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Transform console-based replay debugger into visual UI with transport controls, timeline scrubber, and comprehensive state inspection.

**Architecture:** Component-based UI with MVC pattern. ReplayDebugState acts as controller implementing IReplayController interface. Two DOM components (ReplayControlPanel at bottom, StateInspectorPanel on right) render state and call controller methods. Observer pattern for state change notifications.

**Tech Stack:** TypeScript, DOM APIs, CSS, existing ReplayDebuggerService

---

## Phase 1: Foundation - Controller Interface

### Task 1: Define IReplayController Interface

**Files:**
- Create: `src/states/ReplayDebugState/IReplayController.ts`
- Reference: `src/states/ReplayDebugState/ReplayDebugState.ts` (will implement this)

**Step 1: Create interface file**

Create `src/states/ReplayDebugState/IReplayController.ts`:

```typescript
import { GameState } from '@game/core/core'
import { ReplayMetadata } from '@game/replay/replay'

/**
 * IReplayController - Interface for replay debugger control
 *
 * Provides state queries and playback control for UI components.
 * Components receive this interface and remain decoupled from ReplayDebugState.
 */
export interface IReplayController {
  // State queries
  getCurrentTurn(): number
  getTotalTurns(): number
  getCurrentState(): GameState | null
  getReplayMetadata(): ReplayMetadata | null
  isLoading(): boolean
  isReconstructing(): boolean

  // Playback control (async because they reconstruct state)
  stepForward(): Promise<void>
  stepBackward(): Promise<void>
  jumpToTurn(turn: number): Promise<void>
  skipToStart(): Promise<void>
  skipToEnd(): Promise<void>

  // Observer pattern
  onStateChange(callback: () => void): void
  removeStateChangeListener(callback: () => void): void
}
```

**Step 2: Create barrel export**

Create `src/states/ReplayDebugState/index.ts`:

```typescript
export { ReplayDebugState } from './ReplayDebugState'
export type { IReplayController } from './IReplayController'
```

**Step 3: Commit**

```bash
git add src/states/ReplayDebugState/IReplayController.ts src/states/ReplayDebugState/index.ts
git commit -m "feat: add IReplayController interface for replay debugger UI"
```

---

## Phase 2: Control Panel Component

### Task 2: Create ReplayControlPanel Component

**Files:**
- Create: `src/ui/ReplayControlPanel/ReplayControlPanel.ts`
- Create: `src/ui/ReplayControlPanel/ReplayControlPanel.css`
- Create: `src/ui/ReplayControlPanel/index.ts`

**Step 1: Create component class**

Create `src/ui/ReplayControlPanel/ReplayControlPanel.ts`:

```typescript
import { IReplayController } from '@states/ReplayDebugState'
import './ReplayControlPanel.css'

/**
 * ReplayControlPanel - Bottom overlay with transport controls and timeline
 *
 * Layout:
 * [|◀] [◀] Turn: 847/1070 [▶] [▶|]  [Jump: ___] [Go]
 * ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export class ReplayControlPanel {
  public readonly element: HTMLDivElement

  private btnSkipStart: HTMLButtonElement
  private btnStepBack: HTMLButtonElement
  private btnStepForward: HTMLButtonElement
  private btnSkipEnd: HTMLButtonElement
  private turnDisplay: HTMLSpanElement
  private slider: HTMLInputElement
  private jumpInput: HTMLInputElement
  private btnJump: HTMLButtonElement

  private scrubTimeout: number | null = null
  private stateChangeCallback: () => void

  constructor(private controller: IReplayController) {
    this.element = this.createElements()
    this.attachEventListeners()

    // Subscribe to state changes
    this.stateChangeCallback = () => this.render()
    this.controller.onStateChange(this.stateChangeCallback)

    // Initial render
    this.render()
  }

  private createElements(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'replay-control-panel'

    // Transport controls
    this.btnSkipStart = document.createElement('button')
    this.btnSkipStart.className = 'replay-btn replay-btn-skip-start'
    this.btnSkipStart.textContent = '|◀'
    this.btnSkipStart.title = 'Skip to start (turn 0)'

    this.btnStepBack = document.createElement('button')
    this.btnStepBack.className = 'replay-btn replay-btn-step-back'
    this.btnStepBack.textContent = '◀'
    this.btnStepBack.title = 'Step backward (Shift+Space)'

    this.turnDisplay = document.createElement('span')
    this.turnDisplay.className = 'replay-turn-display'
    this.turnDisplay.textContent = 'Turn: 0/0'

    this.btnStepForward = document.createElement('button')
    this.btnStepForward.className = 'replay-btn replay-btn-step-forward'
    this.btnStepForward.textContent = '▶'
    this.btnStepForward.title = 'Step forward (Space)'

    this.btnSkipEnd = document.createElement('button')
    this.btnSkipEnd.className = 'replay-btn replay-btn-skip-end'
    this.btnSkipEnd.textContent = '▶|'
    this.btnSkipEnd.title = 'Skip to end'

    // Jump controls
    this.jumpInput = document.createElement('input')
    this.jumpInput.type = 'number'
    this.jumpInput.className = 'replay-jump-input'
    this.jumpInput.placeholder = 'Turn #'
    this.jumpInput.min = '0'

    this.btnJump = document.createElement('button')
    this.btnJump.className = 'replay-btn replay-btn-jump'
    this.btnJump.textContent = 'Go'
    this.btnJump.title = 'Jump to turn'

    // Timeline slider
    this.slider = document.createElement('input')
    this.slider.type = 'range'
    this.slider.className = 'replay-timeline-slider'
    this.slider.min = '0'
    this.slider.max = '0'
    this.slider.value = '0'

    // Assemble
    const controlsRow = document.createElement('div')
    controlsRow.className = 'replay-controls-row'
    controlsRow.appendChild(this.btnSkipStart)
    controlsRow.appendChild(this.btnStepBack)
    controlsRow.appendChild(this.turnDisplay)
    controlsRow.appendChild(this.btnStepForward)
    controlsRow.appendChild(this.btnSkipEnd)

    const jumpRow = document.createElement('div')
    jumpRow.className = 'replay-jump-row'
    jumpRow.appendChild(document.createTextNode('Jump: '))
    jumpRow.appendChild(this.jumpInput)
    jumpRow.appendChild(this.btnJump)

    controlsRow.appendChild(jumpRow)

    container.appendChild(controlsRow)
    container.appendChild(this.slider)

    return container
  }

  private attachEventListeners(): void {
    this.btnSkipStart.addEventListener('click', () => this.handleSkipStart())
    this.btnStepBack.addEventListener('click', () => this.handleStepBack())
    this.btnStepForward.addEventListener('click', () => this.handleStepForward())
    this.btnSkipEnd.addEventListener('click', () => this.handleSkipEnd())
    this.btnJump.addEventListener('click', () => this.handleJump())

    // Slider scrubbing with debounce
    this.slider.addEventListener('input', (e) => this.handleSliderInput(e))

    // Jump on Enter key
    this.jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleJump()
      }
    })
  }

  private async handleSkipStart(): Promise<void> {
    await this.controller.skipToStart()
  }

  private async handleStepBack(): Promise<void> {
    await this.controller.stepBackward()
  }

  private async handleStepForward(): Promise<void> {
    await this.controller.stepForward()
  }

  private async handleSkipEnd(): Promise<void> {
    await this.controller.skipToEnd()
  }

  private async handleJump(): Promise<void> {
    const turn = parseInt(this.jumpInput.value, 10)
    if (isNaN(turn)) {
      console.warn('Invalid turn number')
      return
    }

    await this.controller.jumpToTurn(turn)
    this.jumpInput.value = ''
  }

  private handleSliderInput(event: Event): void {
    const turn = parseInt((event.target as HTMLInputElement).value, 10)

    // Update display immediately (optimistic UI)
    this.updateTurnDisplay(turn, this.controller.getTotalTurns())

    // Debounce actual reconstruction
    if (this.scrubTimeout !== null) {
      clearTimeout(this.scrubTimeout)
    }

    this.scrubTimeout = setTimeout(async () => {
      await this.controller.jumpToTurn(turn)
      this.scrubTimeout = null
    }, 150) // 150ms debounce
  }

  private render(): void {
    const current = this.controller.getCurrentTurn()
    const total = this.controller.getTotalTurns()
    const isReconstructing = this.controller.isReconstructing()

    // Update display
    this.updateTurnDisplay(current, total)

    // Update slider
    this.slider.value = current.toString()
    this.slider.max = total.toString()
    this.jumpInput.max = total.toString()

    // Disable controls during reconstruction
    const disabled = isReconstructing
    this.btnSkipStart.disabled = disabled || current === 0
    this.btnStepBack.disabled = disabled || current === 0
    this.btnStepForward.disabled = disabled || current >= total
    this.btnSkipEnd.disabled = disabled || current >= total
    this.btnJump.disabled = disabled
    this.slider.disabled = disabled
  }

  private updateTurnDisplay(current: number, total: number): void {
    this.turnDisplay.textContent = `Turn: ${current}/${total}`
  }

  public destroy(): void {
    this.controller.removeStateChangeListener(this.stateChangeCallback)
    this.element.remove()

    if (this.scrubTimeout !== null) {
      clearTimeout(this.scrubTimeout)
    }
  }
}
```

**Step 2: Create CSS styles**

Create `src/ui/ReplayControlPanel/ReplayControlPanel.css`:

```css
.replay-control-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  border-top: 2px solid #00ff00;
  padding: 10px 20px;
  z-index: 100;
  font-family: 'Courier New', monospace;
  color: #00ff00;
}

.replay-controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.replay-btn {
  background: #1a1a1a;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 6px 12px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  transition: background 0.2s;
}

.replay-btn:hover:not(:disabled) {
  background: #00ff00;
  color: #000;
}

.replay-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.replay-turn-display {
  font-size: 16px;
  font-weight: bold;
  padding: 0 20px;
  min-width: 150px;
  text-align: center;
}

.replay-jump-row {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
}

.replay-jump-input {
  background: #1a1a1a;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 6px;
  width: 80px;
  font-family: 'Courier New', monospace;
}

.replay-timeline-slider {
  width: 100%;
  height: 8px;
  background: #1a1a1a;
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.replay-timeline-slider:hover {
  opacity: 1;
}

.replay-timeline-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #00ff00;
  cursor: pointer;
  border-radius: 50%;
}

.replay-timeline-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #00ff00;
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

.replay-timeline-slider:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

**Step 3: Create barrel export**

Create `src/ui/ReplayControlPanel/index.ts`:

```typescript
export { ReplayControlPanel } from './ReplayControlPanel'
```

**Step 4: Commit**

```bash
git add src/ui/ReplayControlPanel/
git commit -m "feat: add ReplayControlPanel with transport controls and timeline scrubber"
```

---

## Phase 3: State Inspector Component

### Task 3: Create StateInspectorPanel Component

**Files:**
- Create: `src/ui/StateInspectorPanel/StateInspectorPanel.ts`
- Create: `src/ui/StateInspectorPanel/StateInspectorPanel.css`
- Create: `src/ui/StateInspectorPanel/index.ts`

**Step 1: Create component class**

Create `src/ui/StateInspectorPanel/StateInspectorPanel.ts`:

```typescript
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
    const metadata = this.controller.getReplayMetadata()!

    // Show last 10 commands leading up to current turn
    const startIdx = Math.max(0, currentTurn - 10)
    const endIdx = currentTurn

    const commands = metadata.commands?.slice(startIdx, endIdx) || []

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
```

**Step 2: Create CSS styles**

Create `src/ui/StateInspectorPanel/StateInspectorPanel.css`:

```css
.state-inspector-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 350px;
  height: calc(100vh - 100px); /* Account for control panel */
  background: rgba(0, 0, 0, 0.95);
  border-left: 2px solid #00ff00;
  padding: 15px;
  overflow-y: auto;
  z-index: 101;
  font-family: 'Courier New', monospace;
  color: #00ff00;
  font-size: 13px;
}

.state-inspector-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #00ff00;
}

.state-inspector-section {
  margin-bottom: 15px;
  border: 1px solid #004400;
  background: rgba(0, 50, 0, 0.2);
  padding: 5px;
}

.state-inspector-section.current-turn {
  border-color: #00ff00;
  background: rgba(0, 100, 0, 0.2);
}

.section-title {
  font-weight: bold;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
  padding: 5px;
  background: rgba(0, 50, 0, 0.3);
}

summary.section-title::marker {
  color: #00ff00;
}

.section-content {
  padding: 8px 5px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  border-bottom: 1px solid rgba(0, 255, 0, 0.1);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #00aa00;
  font-weight: bold;
}

.info-value {
  color: #00ff00;
  text-align: right;
}

.loading, .empty, .error {
  text-align: center;
  padding: 10px;
  opacity: 0.6;
  font-style: italic;
}

.error {
  color: #ff0000;
}

.command-entry {
  padding: 3px 5px;
  margin: 2px 0;
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.command-entry.current {
  background: rgba(0, 255, 0, 0.2);
  border-left: 3px solid #00ff00;
}

.command-turn {
  color: #00aa00;
  min-width: 40px;
}

.command-type {
  color: #00ff00;
  font-weight: bold;
}

.command-actor {
  color: #008800;
  font-style: italic;
}

/* Scrollbar styling */
.state-inspector-panel::-webkit-scrollbar {
  width: 8px;
}

.state-inspector-panel::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.state-inspector-panel::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 4px;
}

.state-inspector-panel::-webkit-scrollbar-thumb:hover {
  background: #00cc00;
}
```

**Step 3: Create barrel export**

Create `src/ui/StateInspectorPanel/index.ts`:

```typescript
export { StateInspectorPanel } from './StateInspectorPanel'
```

**Step 4: Commit**

```bash
git add src/ui/StateInspectorPanel/
git commit -m "feat: add StateInspectorPanel with collapsible state sections"
```

---

## Phase 4: Controller Implementation

### Task 4: Update ReplayDebugState to Implement IReplayController

**Files:**
- Modify: `src/states/ReplayDebugState/ReplayDebugState.ts`

**Step 1: Add interface implementation and observer pattern**

Update `src/states/ReplayDebugState/ReplayDebugState.ts`:

Add imports:
```typescript
import { IReplayController } from './IReplayController'
import { ReplayControlPanel } from '@ui/ReplayControlPanel'
import { StateInspectorPanel } from '@ui/StateInspectorPanel'
```

Update class declaration:
```typescript
export class ReplayDebugState extends BaseState implements IReplayController {
  private replayData: ReplayData | null = null
  private currentTurn: number = 0
  private currentState: GameState | null = null
  private isLoading: boolean = true
  private reconstructionInProgress: boolean = false

  // UI components
  private controlPanel: ReplayControlPanel | null = null
  private stateInspector: StateInspectorPanel | null = null

  // Observer pattern
  private observers: Array<() => void> = []
```

**Step 2: Implement IReplayController methods**

Add to class body:

```typescript
  // IReplayController implementation - State queries

  getCurrentTurn(): number {
    return this.currentTurn
  }

  getTotalTurns(): number {
    return this.replayData?.metadata.turnCount ?? 0
  }

  getCurrentState(): GameState | null {
    return this.currentState
  }

  getReplayMetadata(): ReplayMetadata | null {
    return this.replayData?.metadata ?? null
  }

  isLoading(): boolean {
    return this.isLoading
  }

  isReconstructing(): boolean {
    return this.reconstructionInProgress
  }

  // IReplayController implementation - Observer pattern

  onStateChange(callback: () => void): void {
    this.observers.push(callback)
  }

  removeStateChangeListener(callback: () => void): void {
    const index = this.observers.indexOf(callback)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback())
  }
```

**Step 3: Implement playback control methods**

Add to class body:

```typescript
  // IReplayController implementation - Playback control

  async skipToStart(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    try {
      this.reconstructionInProgress = true
      this.currentTurn = 0
      this.currentState = this.replayData.initialState
      this.notifyObservers()
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  async skipToEnd(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      const totalTurns = this.replayData.metadata.turnCount
      this.currentTurn = totalTurns
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        totalTurns
      )

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error skipping to end:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }
```

**Step 4: Update existing stepForward/stepBackward/jumpToTurn methods**

Modify existing methods to use reconstruction flag and notify observers:

```typescript
  private async stepForward(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    if (this.currentTurn >= this.replayData.metadata.turnCount) {
      console.log('⚠️  Already at final turn')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn++
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`➡️  Turn ${this.currentTurn} / ${this.replayData.metadata.turnCount}`)

      // Show relevant command
      if (this.currentTurn <= this.replayData.commands.length) {
        const cmd = this.replayData.commands[this.currentTurn - 1]
        console.log(`   Command: ${cmd.commandType} (${cmd.actorType})`)
      }

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error stepping forward:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  private async stepBackward(): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    if (this.currentTurn <= 0) {
      console.log('⚠️  Already at turn 0')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn--
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`⬅️  Turn ${this.currentTurn} / ${this.replayData.metadata.turnCount}`)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error stepping backward:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }

  private async jumpToTurn(targetTurn?: number): Promise<void> {
    if (this.reconstructionInProgress || !this.replayData) return

    // If no turn provided, prompt user (keep existing prompt behavior)
    let turn = targetTurn
    if (turn === undefined) {
      const input = prompt(`Jump to turn (0-${this.replayData.metadata.turnCount}):`)
      if (!input) return
      turn = parseInt(input, 10)
    }

    if (isNaN(turn) || turn < 0 || turn > this.replayData.metadata.turnCount) {
      console.error('❌ Invalid turn number')
      return
    }

    try {
      this.reconstructionInProgress = true
      this.notifyObservers()

      this.currentTurn = turn
      this.currentState = await this.replayDebugger.reconstructToTurn(
        this.replayData,
        this.currentTurn
      )

      console.log(`⏩ Jumped to turn ${this.currentTurn}`)

      this.notifyObservers()
    } catch (error) {
      console.error('❌ Error jumping to turn:', error)
    } finally {
      this.reconstructionInProgress = false
      this.notifyObservers()
    }
  }
```

**Step 5: Update enter() and exit() to mount/unmount UI components**

Update `enter()` method:

```typescript
  enter(): void {
    console.log('='.repeat(60))
    console.log('REPLAY DEBUGGER')
    console.log('='.repeat(60))
    console.log(`Loading replay for game: ${this.gameId}`)

    // Create and mount UI components
    this.controlPanel = new ReplayControlPanel(this)
    this.stateInspector = new StateInspectorPanel(this)

    document.body.appendChild(this.controlPanel.element)
    document.body.appendChild(this.stateInspector.element)

    // Start loading asynchronously (fire-and-forget)
    this.loadReplayData()
  }
```

Update `exit()` method (add if doesn't exist):

```typescript
  exit(): void {
    // Cleanup UI components
    this.controlPanel?.destroy()
    this.stateInspector?.destroy()
    this.controlPanel = null
    this.stateInspector = null

    // Clear observers
    this.observers = []

    console.log('Replay debugger exited')
  }
```

**Step 6: Update loadReplayData to notify observers**

Add `this.notifyObservers()` at the end of successful load:

```typescript
  private async loadReplayData(): Promise<void> {
    try {
      this.replayData = await this.replayDebugger.loadReplay(this.gameId)

      if (!this.replayData) {
        console.error('❌ Failed to load replay data')
        console.log('Replay may not exist or version is incompatible')
        this.isLoading = false
        this.notifyObservers()
        return
      }

      // Start at turn 0
      this.currentTurn = 0
      this.currentState = this.replayData.initialState

      console.log('✅ Replay loaded successfully')
      console.log(`Character: ${this.replayData.metadata.characterName}`)
      console.log(`Total turns: ${this.replayData.metadata.turnCount}`)
      console.log(`Commands recorded: ${this.replayData.commands.length}`)
      console.log(`Outcome: ${this.replayData.metadata.outcome}`)
      console.log('')
      console.log('Controls:')
      console.log('  Space       - Step forward one turn')
      console.log('  Shift+Space - Step back one turn')
      console.log('  j           - Jump to specific turn')
      console.log('  v           - Validate determinism')
      console.log('  s           - Show current state')
      console.log('  e           - Export replay data')
      console.log('  Escape      - Exit')
      console.log('='.repeat(60))

      this.isLoading = false
      this.notifyObservers() // Notify UI components
    } catch (error) {
      console.error('❌ Error loading replay:', error)
      this.isLoading = false
      this.notifyObservers()
    }
  }
```

**Step 7: Update isTransparent to show game view behind UI**

Update `isTransparent()` method:

```typescript
  isTransparent(): boolean {
    return true  // Show game view with UI overlays
  }
```

**Step 8: Commit**

```bash
git add src/states/ReplayDebugState/ReplayDebugState.ts
git commit -m "feat: implement IReplayController in ReplayDebugState with UI component mounting"
```

---

## Phase 5: Testing

### Task 5: Manual Testing

**Files:**
- Test: Replay debugger UI

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

**Step 2: Play game and create replay data**

1. Navigate to http://localhost:3000
2. Press `N` for new game
3. Play for 20-30 turns (move around, fight monsters)
4. Press `Shift+S` to save
5. Note the game ID from console

**Step 3: Launch replay debugger**

1. Press `~` to open debug console
2. Press `L` to launch replay debugger
3. Verify UI appears:
   - Control panel at bottom with buttons and slider
   - State inspector panel on right
   - Game view still visible in background

**Step 4: Test transport controls**

1. Click "Step Forward" (▶) button → verify turn increments, game view updates
2. Click "Step Backward" (◀) button → verify turn decrements
3. Click "Skip to Start" (|◀) → verify jumps to turn 0
4. Click "Skip to End" (▶|) → verify jumps to final turn
5. Verify buttons disable appropriately at boundaries

**Step 5: Test timeline scrubber**

1. Drag slider to middle → verify turn updates (with debounce)
2. Drag rapidly → verify no lag or errors
3. Click on slider track → verify jumps to that turn

**Step 6: Test jump input**

1. Enter "50" in jump field and click "Go" → verify jumps to turn 50
2. Enter invalid number → verify no crash
3. Press Enter in jump field → verify also works

**Step 7: Test state inspector**

1. Verify current turn info updates as you step through
2. Click player state section to collapse → verify it collapses
3. Click again to expand → verify it expands
4. Step through combat → verify HP updates in real-time
5. Verify all sections show correct data

**Step 8: Test keyboard shortcuts still work**

1. Press Space → verify steps forward
2. Press Shift+Space → verify steps backward
3. Press `j` → verify shows prompt (old behavior)
4. Press Escape → verify exits debugger and cleans up UI

**Step 9: Check for errors**

1. Open browser console
2. Verify no errors during:
   - UI creation
   - State reconstruction
   - Slider scrubbing
   - Component cleanup

**Expected Results:**
- All controls work smoothly
- No visual glitches
- No console errors
- UI cleans up properly on exit
- Game view still visible behind overlays

**Step 10: Document any issues**

Create GitHub issues for any bugs found during testing.

---

## Phase 6: Documentation

### Task 6: Update Documentation

**Files:**
- Modify: `docs/systems-advanced.md` (add UI section)
- Modify: `CLAUDE.md` (update debug tools section)

**Step 1: Update systems-advanced.md**

Add to Debug System section in `docs/systems-advanced.md`:

```markdown
### Replay Debugger UI

**Visual Interface** (press `L` in debug console):

**Control Panel** (bottom overlay):
- Skip to start/end buttons
- Step forward/backward buttons
- Turn counter display
- Timeline scrubber (drag to jump)
- Jump-to-turn input field

**State Inspector** (right panel):
- Current turn info (always visible)
- Player state (collapsible): HP, position, inventory, equipment
- Level state (collapsible): Monsters, items, depth
- Command history (collapsible): Last 10 commands

**Keyboard Shortcuts:**
- Space: Step forward
- Shift+Space: Step backward
- `j`: Jump to turn (prompt)
- Escape: Exit debugger

**Architecture:**
- Component-based UI (ReplayControlPanel, StateInspectorPanel)
- Observer pattern for state updates
- Debounced slider scrubbing (150ms)
- Direct DOM manipulation (no framework)

**Implementation:** `src/states/ReplayDebugState/`, `src/ui/ReplayControlPanel/`, `src/ui/StateInspectorPanel/`
```

**Step 2: Update CLAUDE.md**

Update Debug Tools section in `CLAUDE.md`:

```markdown
**Replay Debug:**
- **`L`** - Launch replay debugger (visual UI)
- **`C`** - Choose replay from list
- **`E`** - Export/download current replay

**Replay Debugger UI:**
- Control panel with transport controls and timeline scrubber
- State inspector panel with player/level state
- Keyboard shortcuts: Space (forward), Shift+Space (back), j (jump), Esc (exit)
```

**Step 3: Commit**

```bash
git add docs/systems-advanced.md CLAUDE.md
git commit -m "docs: document replay debugger UI components and controls"
```

---

## Summary

**Implementation complete!**

The replay debugger now has:
- ✅ Visual control panel with transport controls
- ✅ Timeline scrubber for quick navigation
- ✅ State inspector with collapsible sections
- ✅ Real-time state updates via observer pattern
- ✅ Smooth scrubbing with debounce
- ✅ Keyboard shortcuts preserved
- ✅ Clean component lifecycle management

**Total files created:** 7
**Total files modified:** 3

**Estimated time:** 4-6 hours (component-based approach, well-defined interfaces)
