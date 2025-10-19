import { IReplayController } from '@states/ReplayDebugState'
import './ReplayControlPanel.css'

/**
 * ReplayControlPanel - Bottom overlay with transport controls and timeline
 *
 * Layout:
 * [|◀] [◀] Turn: 847/1070 [▶] [▶|]  [Jump: ___] [Go]
 * ━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export class ReplayControlPanel {
  public readonly element: HTMLDivElement

  private btnSkipStart!: HTMLButtonElement
  private btnStepBack!: HTMLButtonElement
  private btnStepForward!: HTMLButtonElement
  private btnSkipEnd!: HTMLButtonElement
  private turnDisplay!: HTMLSpanElement
  private slider!: HTMLInputElement
  private jumpInput!: HTMLInputElement
  private btnJump!: HTMLButtonElement

  private scrubTimeout: ReturnType<typeof setTimeout> | null = null
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
