import { GameState, Monster, TargetingRequest, TargetingResult } from '@game/core/core'
import { TargetingService } from '@services/TargetingService'

// ============================================================================
// TARGETING MODAL - UI for target selection
// ============================================================================

type TargetingCallback = (result: TargetingResult) => void

/**
 * TargetingModal - Modal overlay for selecting targets
 *
 * Design:
 * - Shows targeting info (monster name, HP, distance)
 * - Shows instructions (Tab, Shift+Tab, *, Enter, ESC)
 * - Handles keyboard input for cycling targets
 * - NO game logic - only renders state and captures input
 * - All targeting logic delegated to TargetingService
 */
export class TargetingModal {
  private modalContainer: HTMLElement | null = null
  private currentTargetId: string | undefined
  private visibleMonsters: Monster[] = []
  private request: TargetingRequest | null = null
  private state: GameState | null = null
  private onConfirm: TargetingCallback | null = null
  private onCancel: (() => void) | null = null

  constructor(private targetingService: TargetingService) {}

  /**
   * Show targeting modal
   * @param request - Targeting parameters (mode, range, LOS)
   * @param state - Current game state
   * @param onConfirm - Called with TargetingResult when user confirms
   * @param onCancel - Called when user cancels (ESC)
   */
  show(
    request: TargetingRequest,
    state: GameState,
    onConfirm: TargetingCallback,
    onCancel: () => void
  ): void {
    this.request = request
    this.state = state
    this.onConfirm = onConfirm
    this.onCancel = onCancel

    // Get visible monsters from TargetingService
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      onCancel()
      return
    }

    this.visibleMonsters = this.targetingService.getVisibleMonsters(
      state.player,
      currentLevel,
      state.visibleCells
    )

    // Check if any monsters visible
    if (this.visibleMonsters.length === 0) {
      // No targets - immediately call callback with error
      onConfirm({
        success: false,
        message: 'No monsters in range.',
      })
      return
    }

    // Auto-select nearest monster
    const nearest = this.targetingService.getNextTarget(
      undefined,
      this.visibleMonsters,
      'nearest'
    )
    this.currentTargetId = nearest?.id

    // Create and show modal
    this.modalContainer = this.createModal()
    document.body.appendChild(this.modalContainer)

    // Add keyboard listener
    document.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Hide and cleanup modal
   */
  hide(): void {
    if (this.modalContainer) {
      this.modalContainer.remove()
      this.modalContainer = null
    }
    document.removeEventListener('keydown', this.handleKeyDown)
    this.request = null
    this.state = null
    this.onConfirm = null
    this.onCancel = null
    this.visibleMonsters = []
    this.currentTargetId = undefined
  }

  /**
   * Check if modal is currently visible
   */
  isVisible(): boolean {
    return this.modalContainer !== null
  }

  // ============================================================================
  // PRIVATE: Modal rendering
  // ============================================================================

  private createModal(): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay targeting-modal'

    const content = document.createElement('div')
    content.className = 'modal-content'

    // Title
    const title = document.createElement('div')
    title.className = 'modal-title'
    title.textContent = `Targeting (Range: ${this.request?.maxRange || 0} tiles)`
    content.appendChild(title)

    // Target info
    const targetInfo = this.createTargetInfo()
    content.appendChild(targetInfo)

    // Instructions
    const instructions = document.createElement('div')
    instructions.className = 'modal-footer targeting-instructions'
    instructions.innerHTML = `
      <div>[Tab] Next  [Shift+Tab] Previous  [*] Nearest</div>
      <div>[Enter] Confirm  [ESC] Cancel</div>
    `
    content.appendChild(instructions)

    modal.appendChild(content)
    return modal
  }

  private createTargetInfo(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'targeting-info'

    const currentMonster = this.getCurrentMonster()
    if (!currentMonster) {
      container.textContent = 'No target selected'
      return container
    }

    const currentLevel = this.state?.levels.get(this.state.currentLevel)
    if (!currentLevel || !this.state || !this.request) {
      container.textContent = 'Invalid state'
      return container
    }

    // Calculate distance
    const distance = this.targetingService.distance(
      this.state.player.position,
      currentMonster.position
    )

    // Validate target
    const validation = this.targetingService.isValidMonsterTarget(
      currentMonster,
      this.state.player,
      currentLevel,
      this.request.maxRange,
      this.request.requiresLOS,
      this.state.visibleCells
    )

    // Create info display
    const isValid = validation.isValid
    const validityClass = isValid ? 'valid' : 'invalid'

    container.className = `targeting-info ${validityClass}`
    container.innerHTML = `
      <div class="target-name">${currentMonster.name}</div>
      <div class="target-stats">
        HP: ${currentMonster.hp}/${currentMonster.maxHp} | Distance: ${distance} tiles
      </div>
      ${!isValid ? `<div class="target-error">${validation.reason}</div>` : ''}
      <div class="target-count">Target ${this.getCurrentTargetIndex() + 1} of ${this.visibleMonsters.length}</div>
    `

    return container
  }

  // ============================================================================
  // PRIVATE: Keyboard handling
  // ============================================================================

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.state || !this.request) return

    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        this.cycleTarget(event.shiftKey ? 'prev' : 'next')
        break

      case '*':
        event.preventDefault()
        this.cycleTarget('nearest')
        break

      case 'Enter':
        event.preventDefault()
        this.confirmTarget()
        break

      case 'Escape':
        event.preventDefault()
        this.cancelTargeting()
        break
    }
  }

  private cycleTarget(direction: 'next' | 'prev' | 'nearest'): void {
    const nextMonster = this.targetingService.getNextTarget(
      this.currentTargetId,
      this.visibleMonsters,
      direction
    )

    if (nextMonster) {
      this.currentTargetId = nextMonster.id
      this.updateDisplay()
    }
  }

  private confirmTarget(): void {
    const currentMonster = this.getCurrentMonster()
    if (!currentMonster || !this.state || !this.request) {
      this.cancelTargeting()
      return
    }

    const currentLevel = this.state.levels.get(this.state.currentLevel)
    if (!currentLevel) {
      this.cancelTargeting()
      return
    }

    // Validate target
    const validation = this.targetingService.isValidMonsterTarget(
      currentMonster,
      this.state.player,
      currentLevel,
      this.request.maxRange,
      this.request.requiresLOS,
      this.state.visibleCells
    )

    if (!validation.isValid) {
      // Don't confirm invalid target - just update display to show error
      this.updateDisplay()
      return
    }

    // Confirm valid target
    const result: TargetingResult = {
      success: true,
      targetMonsterId: currentMonster.id,
    }

    this.hide()
    this.onConfirm?.(result)
  }

  private cancelTargeting(): void {
    this.hide()
    this.onCancel?.()
  }

  private updateDisplay(): void {
    if (!this.modalContainer) return

    // Find and replace target info element
    const oldInfo = this.modalContainer.querySelector('.targeting-info')
    if (oldInfo) {
      const newInfo = this.createTargetInfo()
      oldInfo.replaceWith(newInfo)
    }
  }

  // ============================================================================
  // PRIVATE: Helpers
  // ============================================================================

  private getCurrentMonster(): Monster | undefined {
    return this.visibleMonsters.find((m) => m.id === this.currentTargetId)
  }

  private getCurrentTargetIndex(): number {
    return this.visibleMonsters.findIndex((m) => m.id === this.currentTargetId)
  }
}
