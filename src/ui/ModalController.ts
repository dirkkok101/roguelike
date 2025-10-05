import { GameState, Item, ItemType } from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'

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

export class ModalController {
  private modalContainer: HTMLElement | null = null
  private currentCallback: SelectionCallback | null = null
  private currentState: GameState | null = null

  constructor(private identificationService: IdentificationService) {}

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
    this.currentState = state
    this.currentCallback = callback
    this.currentFilter = filter

    // Filter items
    const items = this.filterItems(state.player.inventory, filter, state)

    // Create modal DOM
    this.modalContainer = this.createSelectionModal(title, items, state)
    document.body.appendChild(this.modalContainer)
  }

  /**
   * Show full inventory modal (read-only)
   */
  showInventory(state: GameState): void {
    this.currentState = state
    this.modalContainer = this.createInventoryModal(state)
    document.body.appendChild(this.modalContainer)
  }

  /**
   * Hide and cleanup modal
   */
  hide(): void {
    if (this.modalContainer) {
      this.modalContainer.remove()
      this.modalContainer = null
    }
    this.currentCallback = null
    this.currentState = null
  }

  /**
   * Check if modal is currently open
   */
  isOpen(): boolean {
    return this.modalContainer !== null
  }

  /**
   * Handle keyboard input for modal
   * Returns true if input was handled
   */
  handleInput(event: KeyboardEvent): boolean {
    if (!this.modalContainer) return false

    // ESC to cancel
    if (event.key === 'Escape') {
      event.preventDefault()
      if (this.currentCallback) {
        this.currentCallback(null)
      }
      this.hide()
      return true
    }

    // Letter selection (a-z) - only if we have a callback (selection mode)
    if (this.currentCallback) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && this.currentState) {
        const filteredItems = this.getFilteredItemsForCurrentModal()
        if (index < filteredItems.length) {
          event.preventDefault()
          const item = filteredItems[index]
          this.currentCallback(item)
          this.hide()
          return true
        }
      }
    }

    return false
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private currentFilter: ItemFilter = 'all'

  private getFilteredItemsForCurrentModal(): Item[] {
    if (!this.currentState) return []
    return this.filterItems(this.currentState.player.inventory, this.currentFilter, this.currentState)
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
    weaponLine.textContent = weapon
      ? `  Weapon: ${weapon.name} (${weapon.damage}${weapon.bonus !== 0 ? ` ${weapon.bonus > 0 ? '+' : ''}${weapon.bonus}` : ''})`
      : '  Weapon: (none)'
    eqList.appendChild(weaponLine)

    // Armor
    const armor = state.player.equipment.armor
    const armorLine = document.createElement('div')
    armorLine.textContent = armor
      ? `  Armor: ${armor.name} [AC ${armor.ac}${armor.bonus !== 0 ? ` ${armor.bonus > 0 ? '+' : ''}${armor.bonus}` : ''}]`
      : '  Armor: (none)'
    eqList.appendChild(armorLine)

    // Rings
    const leftRing = state.player.equipment.leftRing
    const leftLine = document.createElement('div')
    leftLine.textContent = leftRing
      ? `  Left Ring: ${this.identificationService.getDisplayName(leftRing, state)}`
      : '  Left Ring: (empty)'
    eqList.appendChild(leftLine)

    const rightRing = state.player.equipment.rightRing
    const rightLine = document.createElement('div')
    rightLine.textContent = rightRing
      ? `  Right Ring: ${this.identificationService.getDisplayName(rightRing, state)}`
      : '  Right Ring: (empty)'
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
        itemEl.textContent = `${letter}) ${displayName}`
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
