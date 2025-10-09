import { GameState, Item, ItemType, Ring, TargetingRequest, TargetingResult, PotionType, ScrollType, RingType, WandType } from '@game/core/core'
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
type RingSelectionCallback = (result: { ring: Ring; slot: 'left' | 'right' } | null) => void
type TargetingCallback = (result: TargetingResult) => void
type SpawnCategoryCallback = (category: string | null) => void
type SpawnSubtypeCallback = (subtype: string | null) => void

/**
 * Internal state for each modal in the stack
 * Unified object prevents stack desynchronization issues
 */
interface ModalState {
  modal: HTMLElement
  callback?: SelectionCallback
  ringCallback?: RingSelectionCallback
  ringData?: Array<{ ring: Ring; slot: 'left' | 'right' }>
  spawnCategoryCallback?: SpawnCategoryCallback
  spawnSubtypeCallback?: SpawnSubtypeCallback
  spawnCategories?: string[]
  spawnSubtypes?: string[]
  state?: GameState
  filter: ItemFilter
}

export class ModalController {
  private modalStack: ModalState[] = []
  private targetingModal: TargetingModal | null = null

  constructor(
    private identificationService: IdentificationService,
    private curseService: CurseService,
    targetingService?: TargetingService
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
   * @param excludeItemId - Optional item ID to exclude from list (e.g., the scroll being read)
   */
  showItemSelection(
    filter: ItemFilter,
    title: string,
    state: GameState,
    callback: SelectionCallback,
    excludeItemId?: string
  ): void {
    // Filter items and exclude specific item if provided
    let items = this.filterItems(state.player.inventory, filter, state)
    if (excludeItemId) {
      items = items.filter(item => item.id !== excludeItemId)
    }

    // Create modal DOM
    const modalContainer = this.createSelectionModal(title, items, state)

    // Push unified state to stack
    this.modalStack.push({
      modal: modalContainer,
      callback,
      state,
      filter,
    })

    document.body.appendChild(modalContainer)
  }

  /**
   * Show full inventory modal (read-only)
   */
  showInventory(state: GameState): void {
    const modalContainer = this.createInventoryModal(state)

    // Push unified state to stack (no callback = read-only modal)
    this.modalStack.push({
      modal: modalContainer,
      state,
      filter: 'all',
    })

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
   * Show equipped ring selection modal (for removal)
   * @param state - Current game state
   * @param callback - Called with selected ring and slot (or null if cancelled)
   */
  showEquippedRingSelection(
    state: GameState,
    callback: RingSelectionCallback
  ): void {
    const rings = this.getEquippedRingsWithSlots(state)

    // Handle case with no equipped rings
    if (rings.length === 0) {
      callback(null)
      return
    }

    // Create modal DOM
    const modalContainer = this.createRingSelectionModal(rings, state)

    // Push unified state to stack
    this.modalStack.push({
      modal: modalContainer,
      ringCallback: callback,
      ringData: rings,
      state,
      filter: 'ring',
    })

    document.body.appendChild(modalContainer)
  }

  /**
   * Show spawn item category selection modal (DEBUG)
   * @param callback - Called with selected category (or null if cancelled)
   */
  showSpawnItemCategory(callback: SpawnCategoryCallback): void {
    const categories = ['potion', 'scroll', 'ring', 'wand', 'food', 'torch', 'lantern', 'oil']
    const modalContainer = this.createSpawnCategoryModal(categories)

    this.modalStack.push({
      modal: modalContainer,
      spawnCategoryCallback: callback,
      spawnCategories: categories,
      filter: 'all',
    })

    document.body.appendChild(modalContainer)
  }

  /**
   * Show spawn item subtype selection modal (DEBUG)
   * @param category - Item category (potion, scroll, ring, wand)
   * @param callback - Called with selected subtype (or null if cancelled)
   */
  showSpawnItemSubtype(category: string, callback: SpawnSubtypeCallback): void {
    let subtypes: string[] = []

    switch (category) {
      case 'potion':
        subtypes = Object.keys(PotionType)
        break
      case 'scroll':
        subtypes = Object.keys(ScrollType)
        break
      case 'ring':
        subtypes = Object.keys(RingType)
        break
      case 'wand':
        subtypes = Object.keys(WandType)
        break
      default:
        // No subtypes for this category
        callback(null)
        return
    }

    const modalContainer = this.createSpawnSubtypeModal(category, subtypes)

    this.modalStack.push({
      modal: modalContainer,
      spawnSubtypeCallback: callback,
      spawnSubtypes: subtypes,
      filter: 'all',
    })

    document.body.appendChild(modalContainer)
  }

  /**
   * Hide and cleanup top modal
   */
  hide(): void {
    if (this.modalStack.length === 0) return

    // Pop top modal and remove from DOM
    const topModalState = this.modalStack.pop()

    if (topModalState) {
      topModalState.modal.remove()
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

    const topModalState = this.modalStack[this.modalStack.length - 1]

    // ESC to cancel
    if (event.key === 'Escape') {
      event.preventDefault()
      if (topModalState.callback) {
        topModalState.callback(null)
      } else if (topModalState.ringCallback) {
        topModalState.ringCallback(null)
      } else if (topModalState.spawnCategoryCallback) {
        topModalState.spawnCategoryCallback(null)
      } else if (topModalState.spawnSubtypeCallback) {
        topModalState.spawnSubtypeCallback(null)
      }
      this.hide()
      return true
    }

    // Ring selection modal
    if (topModalState.ringCallback && topModalState.ringData) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && index < topModalState.ringData.length) {
        event.preventDefault()
        const selection = topModalState.ringData[index]
        topModalState.ringCallback(selection)
        this.hide()
        return true
      }
      return false
    }

    // Spawn category selection modal
    if (topModalState.spawnCategoryCallback && topModalState.spawnCategories) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && index < topModalState.spawnCategories.length) {
        event.preventDefault()
        const category = topModalState.spawnCategories[index]
        topModalState.spawnCategoryCallback(category)
        this.hide()
        return true
      }
      return false
    }

    // Spawn subtype selection modal
    if (topModalState.spawnSubtypeCallback && topModalState.spawnSubtypes) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && index < topModalState.spawnSubtypes.length) {
        event.preventDefault()
        const subtype = topModalState.spawnSubtypes[index]
        topModalState.spawnSubtypeCallback(subtype)
        this.hide()
        return true
      }
      return false
    }

    // Letter selection (a-z) - only if we have a callback (selection mode)
    if (topModalState.callback) {
      const index = this.getItemIndexFromLetter(event.key)
      if (index !== null && topModalState.state) {
        const filteredItems = this.getFilteredItemsForCurrentModal()
        if (index < filteredItems.length) {
          event.preventDefault()
          const item = filteredItems[index]
          const topModalBefore = this.modalStack[this.modalStack.length - 1]
          topModalState.callback(item)
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

  /**
   * Get equipped rings with their slot information
   * @param state - Current game state
   * @returns Array of rings with slot labels (empty if no rings equipped)
   */
  private getEquippedRingsWithSlots(
    state: GameState
  ): Array<{ ring: Ring; slot: 'left' | 'right' }> {
    const rings: Array<{ ring: Ring; slot: 'left' | 'right' }> = []
    if (state.player.equipment.leftRing) {
      rings.push({ ring: state.player.equipment.leftRing, slot: 'left' })
    }
    if (state.player.equipment.rightRing) {
      rings.push({ ring: state.player.equipment.rightRing, slot: 'right' })
    }
    return rings
  }

  private getFilteredItemsForCurrentModal(): Item[] {
    if (this.modalStack.length === 0) return []

    const topModalState = this.modalStack[this.modalStack.length - 1]

    if (!topModalState.state) return []
    return this.filterItems(
      topModalState.state.player.inventory,
      topModalState.filter,
      topModalState.state
    )
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
          if (
            item.type !== ItemType.POTION &&
            item.type !== ItemType.SCROLL &&
            item.type !== ItemType.RING &&
            item.type !== ItemType.WAND
          ) {
            return false
          }
          const typeKey = this.identificationService.getItemTypeKey(item)
          return typeKey ? !this.identificationService.isIdentified(typeKey, state) : false
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

  private createRingSelectionModal(
    rings: Array<{ ring: Ring; slot: 'left' | 'right' }>,
    state: GameState
  ): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const content = document.createElement('div')
    content.className = 'modal-content'

    // Title
    const titleEl = document.createElement('div')
    titleEl.className = 'modal-title'
    titleEl.textContent = 'Remove which ring?'
    content.appendChild(titleEl)

    // Rings list
    const list = document.createElement('div')
    list.className = 'modal-items'

    rings.forEach((entry, index) => {
      const itemEl = document.createElement('div')
      itemEl.className = 'modal-item'
      const letter = String.fromCharCode(97 + index) // a-z
      const displayName = this.identificationService.getDisplayName(entry.ring, state)
      const slotLabel = entry.slot === 'left' ? 'Left' : 'Right'
      const cursedLabel =
        this.curseService.isCursed(entry.ring) && entry.ring.identified ? ' (cursed)' : ''
      itemEl.textContent = `${letter}) ${slotLabel}: ${displayName}${cursedLabel}`
      list.appendChild(itemEl)
    })

    content.appendChild(list)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    footer.textContent = '[ESC to cancel]'
    content.appendChild(footer)

    modal.appendChild(content)
    return modal
  }

  private createSpawnCategoryModal(categories: string[]): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const content = document.createElement('div')
    content.className = 'modal-content'

    // Title
    const titleEl = document.createElement('div')
    titleEl.className = 'modal-title'
    titleEl.textContent = 'Spawn which item type?'
    content.appendChild(titleEl)

    // Categories list
    const list = document.createElement('div')
    list.className = 'modal-items'

    categories.forEach((category, index) => {
      const itemEl = document.createElement('div')
      itemEl.className = 'modal-item'
      const letter = String.fromCharCode(97 + index) // a-z
      itemEl.textContent = `${letter}) ${category}`
      list.appendChild(itemEl)
    })

    content.appendChild(list)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    footer.textContent = '[ESC to cancel]'
    content.appendChild(footer)

    modal.appendChild(content)
    return modal
  }

  private createSpawnSubtypeModal(category: string, subtypes: string[]): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const content = document.createElement('div')
    content.className = 'modal-content'

    // Title
    const titleEl = document.createElement('div')
    titleEl.className = 'modal-title'
    titleEl.textContent = `Spawn which ${category}?`
    content.appendChild(titleEl)

    // Subtypes list
    const list = document.createElement('div')
    list.className = 'modal-items'

    subtypes.forEach((subtype, index) => {
      const itemEl = document.createElement('div')
      itemEl.className = 'modal-item'
      const letter = String.fromCharCode(97 + index) // a-z
      itemEl.textContent = `${letter}) ${subtype}`
      list.appendChild(itemEl)
    })

    content.appendChild(list)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'modal-footer'
    footer.textContent = '[ESC to cancel]'
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
