import { GameState, Item, ItemType, TargetingRequest, TargetingResult } from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'
import { CurseService } from '@services/CurseService'
import { TargetingService } from '@services/TargetingService'
import { TargetingModal } from './TargetingModal'

// ============================================================================
// MODAL CONTROLLER - Item selection and inventory display
// ============================================================================

type ItemFilter =
  | 'all'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'food'
  | 'weapon'
  | 'armor'
  | 'ring'
  | 'oil_flask'
  | 'equipment' // weapons + light sources (torches, lanterns)
  | 'unidentified'
type SelectionCallback = (item: Item | null) => void
type TargetingCallback = (result: TargetingResult) => void

export class ModalController {
  private modalStack: HTMLElement[] = []
  private callbackStack: (SelectionCallback | null)[] = []
  private stateStack: (GameState | null)[] = []
  private filterStack: ItemFilter[] = []
  private targetingModal: TargetingModal | null = null

  constructor(
    private identificationService: IdentificationService,
    private curseService: CurseService,
    private targetingService?: TargetingService
  ) {
    if (targetingService) {
      this.targetingModal = new TargetingModal(targetingService)
    }
  }

  /**
   * Show item selection modal
   * @param filter - Item type to filter by
   * @param title - Modal title (e.g., "Quaff which potion?")
   * @param state - Current game state
   * @param callback - Called with selected item (or null if cancelled)
   */
  showItemSelection(
    filter: ItemFilter,
    title: string,
    state: GameState,
    callback: SelectionCallback
  ): void {
    // Filter items
    const items = this.filterItems(state.player.inventory, filter, state)

    // Create modal DOM
    const modalContainer = this.createSelectionModal(title, items, state)

    // Push to stacks
    this.modalStack.push(modalContainer)
    this.callbackStack.push(callback)
    this.stateStack.push(state)
    this.filterStack.push(filter)

    document.body.appendChild(modalContainer)
  }

  /**
   * Show full inventory modal (read-only)
   */
  showInventory(state: GameState): void {
    const modalContainer = this.createInventoryModal(state)

    // Push to stacks (null callback = read-only modal)
    this.modalStack.push(modalContainer)
    this.callbackStack.push(null)
    this.stateStack.push(state)
    this.filterStack.push('all')

    document.body.appendChild(modalContainer)
  }

  /**
   * Show targeting modal
   * @param request - Targeting parameters (mode, range, LOS)
   * @param state - Current game state
   * @param onConfirm - Called with TargetingResult when user confirms
   * @param onCancel - Called when user cancels (ESC)
   */
  showTargeting(
    request: TargetingRequest,
    state: GameState,
    onConfirm: TargetingCallback,
    onCancel: () => void
  ): void {
    if (!this.targetingModal) {
      console.error('TargetingModal not initialized (TargetingService required)')
      onCancel()
      return
    }

    this.targetingModal.show(request, state, onConfirm, onCancel)
  }

  /**
   * Hide and cleanup top modal
   */
  hide(): void {
    if (this.modalStack.length === 0) return

    // Pop top modal and remove from DOM
    const topModal = this.modalStack.pop()
    this.callbackStack.pop()
    this.stateStack.pop()
    this.filterStack.pop()

    if (topModal) {
      topModal.remove()
    }
  }

  /**
   * Check if any modal is currently open
   */
  isOpen(): boolean {
    return this.modalStack.length > 0 || (this.targetingModal?.isVisible() ?? false)
  }

  /**
   * Handle keyboard input for modal
   * Returns true if input was handled
   */
  handleInput(event: KeyboardEvent): boolean {
    // Targeting modal handles its own input
    if (this.targetingModal?.isVisible()) {
      return true
    }

    if (this.modalStack.length === 0) return false

    const topCallback = this.callbackStack[this.callbackStack.length - 1]
    const topState = this.stateStack[this.stateStack.length - 1]

    // ESC to cancel
    if (event.key === 'Escape') {
      event.preventDefault()
      if (topCallback) {
        topCallback(null)
      }
      this.hide()
      return true
    }

    // Letter selection (a-z) - only if we have a callback (selection mode)
    if (topCallback) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && topState) {
        const filteredItems = this.getFilteredItemsForCurrentModal()
        if (index < filteredItems.length) {
          event.preventDefault()
          const item = filteredItems[index]
          const topModalBefore = this.modalStack[this.modalStack.length - 1]
          topCallback(item)
          const topModalAfter = this.modalStack[this.modalStack.length - 1]

          // Only hide if the top modal is still the same one
          // (callback may have opened a new modal, e.g., targeting scrolls)
          if (topModalBefore === topModalAfter) {
            this.hide()
          }

          return true
        }
      }
    }

    return false
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getFilteredItemsForCurrentModal(): Item[] {
    if (this.stateStack.length === 0) return []

    const topState = this.stateStack[this.stateStack.length - 1]
    const topFilter = this.filterStack[this.filterStack.length - 1]

    if (!topState) return []
    return this.filterItems(topState.player.inventory, topFilter, topState)
  }

  private filterItems(inventory: Item[], filter: ItemFilter, state: GameState): Item[] {
    if (filter === 'all') return inventory

    return inventory.filter((item) => {
      switch (filter) {
        case 'potion':
          return item.type === ItemType.POTION
        case 'scroll':
          return item.type === ItemType.SCROLL
        case 'wand':
          return item.type === ItemType.WAND
        case 'food':
          return item.type === ItemType.FOOD
        case 'weapon':
          return item.type === ItemType.WEAPON
        case 'armor':
          return item.type === ItemType.ARMOR
        case 'ring':
          return item.type === ItemType.RING
        case 'oil_flask':
          return item.type === ItemType.OIL_FLASK
        case 'equipment':
          // Weapons and light sources (torches, lanterns)
          return (
            item.type === ItemType.WEAPON ||
            item.type === ItemType.TORCH ||
            item.type === ItemType.LANTERN
          )
        case 'unidentified':
          // Filter items that are not yet identified
          return (
            !this.identificationService.isIdentified(item, state) &&
            (item.type === ItemType.POTION ||
              item.type === ItemType.SCROLL ||
              item.type === ItemType.RING ||
              item.type === ItemType.WAND)
          )
        default:
          return false
      }
    })
  }

  private createSelectionModal(title: string, items: Item[], state: GameState): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const content = document.createElement('div')
    content.className = 'modal-content'

    // Title
    const titleEl = document.createElement('div')
    titleEl.className = 'modal-title'
    titleEl.textContent = title
    content.appendChild(titleEl)

    // Items list
    const list = document.createElement('div')
    list.className = 'modal-items'

    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'You have no such items.'
      empty.className = 'modal-empty'
      list.appendChild(empty)
    } else {
      items.forEach((item, index) => {
        const itemEl = document.createElement('div')
        itemEl.className = 'modal-item'
        const letter = String.fromCharCode(97 + index) // a-z
        const displayName = this.identificationService.getDisplayName(item, state)
        itemEl.textContent = `${letter}) ${displayName}`
        list.appendChild(itemEl)
      })
    }

    content.appendChild(list)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    footer.textContent = '[ESC to cancel]'
    content.appendChild(footer)

    modal.appendChild(content)
    return modal
  }

  private createInventoryModal(state: GameState): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const content = document.createElement('div')
    content.className = 'modal-content modal-inventory'

    // Title
    const title = document.createElement('div')
    title.className = 'modal-title'
    const count = state.player.inventory.length
    title.textContent = `Inventory (${count}/26 items)`
    content.appendChild(title)

    // Equipment section
    const equipment = document.createElement('div')
    equipment.className = 'modal-section'

    const eqTitle = document.createElement('div')
    eqTitle.className = 'modal-subtitle'
    eqTitle.textContent = 'EQUIPPED:'
    equipment.appendChild(eqTitle)

    const eqList = document.createElement('div')
    eqList.className = 'modal-equipment'

    // Weapon
    const weapon = state.player.equipment.weapon
    const weaponLine = document.createElement('div')
    if (weapon) {
      const cursedLabel = this.curseService.isCursed(weapon) && weapon.identified ? ' (cursed)' : ''
      weaponLine.textContent = `  Weapon: ${weapon.name} (${weapon.damage}${weapon.bonus !== 0 ? ` ${weapon.bonus > 0 ? '+' : ''}${weapon.bonus}` : ''})${cursedLabel}`
    } else {
      weaponLine.textContent = '  Weapon: (none)'
    }
    eqList.appendChild(weaponLine)

    // Armor
    const armor = state.player.equipment.armor
    const armorLine = document.createElement('div')
    if (armor) {
      const cursedLabel = this.curseService.isCursed(armor) && armor.identified ? ' (cursed)' : ''
      armorLine.textContent = `  Armor: ${armor.name} [AC ${armor.ac}${armor.bonus !== 0 ? ` ${armor.bonus > 0 ? '+' : ''}${armor.bonus}` : ''}]${cursedLabel}`
    } else {
      armorLine.textContent = '  Armor: (none)'
    }
    eqList.appendChild(armorLine)

    // Rings
    const leftRing = state.player.equipment.leftRing
    const leftLine = document.createElement('div')
    if (leftRing) {
      const cursedLabel = this.curseService.isCursed(leftRing) && leftRing.identified ? ' (cursed)' : ''
      leftLine.textContent = `  Left Ring: ${this.identificationService.getDisplayName(leftRing, state)}${cursedLabel}`
    } else {
      leftLine.textContent = '  Left Ring: (empty)'
    }
    eqList.appendChild(leftLine)

    const rightRing = state.player.equipment.rightRing
    const rightLine = document.createElement('div')
    if (rightRing) {
      const cursedLabel = this.curseService.isCursed(rightRing) && rightRing.identified ? ' (cursed)' : ''
      rightLine.textContent = `  Right Ring: ${this.identificationService.getDisplayName(rightRing, state)}${cursedLabel}`
    } else {
      rightLine.textContent = '  Right Ring: (empty)'
    }
    eqList.appendChild(rightLine)

    // Light source
    const light = state.player.equipment.lightSource
    const lightLine = document.createElement('div')
    if (light) {
      const fuelInfo = light.isPermanent ? '(permanent)' : `(${light.fuel}/${light.maxFuel} fuel)`
      lightLine.textContent = `  Light: ${light.name} ${fuelInfo}`
    } else {
      lightLine.textContent = '  Light: (none)'
    }
    eqList.appendChild(lightLine)

    equipment.appendChild(eqList)
    content.appendChild(equipment)

    // Inventory section
    const inventory = document.createElement('div')
    inventory.className = 'modal-section'

    const invTitle = document.createElement('div')
    invTitle.className = 'modal-subtitle'
    invTitle.textContent = 'CARRIED:'
    inventory.appendChild(invTitle)

    const invList = document.createElement('div')
    invList.className = 'modal-items'

    if (state.player.inventory.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = '  (nothing)'
      empty.className = 'modal-empty'
      invList.appendChild(empty)
    } else {
      state.player.inventory.forEach((item, index) => {
        const itemEl = document.createElement('div')
        const letter = String.fromCharCode(97 + index) // a-z
        const displayName = this.identificationService.getDisplayName(item, state)
        const cursedLabel = this.curseService.isCursed(item) && item.identified ? ' (cursed)' : ''
        itemEl.textContent = `${letter}) ${displayName}${cursedLabel}`
        invList.appendChild(itemEl)
      })
    }

    inventory.appendChild(invList)
    content.appendChild(inventory)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    footer.textContent = '[ESC to close]'
    content.appendChild(footer)

    modal.appendChild(content)
    return modal
  }

  private getItemIndexFromLetter(key: string): number | null {
    const code = key.charCodeAt(0)
    // a = 97, z = 122
    if (code >= 97 && code <= 122) {
      return code - 97
    }
    return null
  }
}
