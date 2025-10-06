import {
  GameState,
  Item,
  Potion,
  Scroll,
  Ring,
  Wand,
  PotionType,
  ScrollType,
  RingType,
  WandType,
  ItemNameMap,
  ItemType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// IDENTIFICATION SERVICE - Item name generation and identification tracking
// ============================================================================

// Descriptive name pools (from items.json)
const POTION_DESCRIPTORS = [
  'blue',
  'red',
  'clear',
  'fizzy',
  'dark',
  'cloudy',
  'smoky',
  'bubbling',
  'glowing',
  'murky',
  'sparkling',
  'milky',
  'viscous',
]

const SCROLL_LABELS = [
  'XYZZY',
  'ELBERETH',
  'NR 9',
  'PRATYAVAYAH',
  'ZELGO MER',
  'VE FORBRYDERNE',
  'HACKEM MUCHE',
  'GHOTI',
  'VERR YED HORRE',
  'PHOL ENDE WODAN',
  'THARR',
]

const RING_MATERIALS = [
  'ruby',
  'sapphire',
  'iron',
  'wooden',
  'ivory',
  'gold',
  'silver',
  'bronze',
  'jade',
  'obsidian',
]

const WAND_WOODS = [
  'oak',
  'pine',
  'metal',
  'crystal',
  'bone',
  'copper',
  'silver',
  'ebony',
  'marble',
  'glass',
]

export class IdentificationService {
  constructor(private random: IRandomService) {}

  /**
   * Generate randomized item names for a new game (seeded per game)
   * Note: Uses service's shuffle method which should be seeded
   */
  generateItemNames(): ItemNameMap {
    // Shuffle arrays to randomize mappings
    const potionDescriptors = this.random.shuffle([...POTION_DESCRIPTORS])
    const scrollLabels = this.random.shuffle([...SCROLL_LABELS])
    const ringMaterials = this.random.shuffle([...RING_MATERIALS])
    const wandWoods = this.random.shuffle([...WAND_WOODS])

    // Create mappings
    const potions = new Map<PotionType, string>()
    const potionTypes = Object.values(PotionType)
    potionTypes.forEach((type, index) => {
      const descriptor = potionDescriptors[index % potionDescriptors.length]
      potions.set(type, `${descriptor} potion`)
    })

    const scrolls = new Map<ScrollType, string>()
    const scrollTypes = Object.values(ScrollType)
    scrollTypes.forEach((type, index) => {
      const label = scrollLabels[index % scrollLabels.length]
      scrolls.set(type, `scroll labeled ${label}`)
    })

    const rings = new Map<RingType, string>()
    const ringTypes = Object.values(RingType)
    ringTypes.forEach((type, index) => {
      const material = ringMaterials[index % ringMaterials.length]
      rings.set(type, `${material} ring`)
    })

    const wands = new Map<WandType, string>()
    const wandTypes = Object.values(WandType)
    wandTypes.forEach((type, index) => {
      const wood = wandWoods[index % wandWoods.length]
      wands.set(type, `${wood} wand`)
    })

    return {
      potions,
      scrolls,
      rings,
      wands,
    }
  }

  /**
   * Identify an item type (marks all items of that type as identified)
   */
  identifyItem(itemType: string, state: GameState): GameState {
    return {
      ...state,
      identifiedItems: new Set([...state.identifiedItems, itemType]),
    }
  }

  /**
   * Check if an item type is identified
   */
  isIdentified(itemType: string, state: GameState): boolean {
    return state.identifiedItems.has(itemType)
  }

  /**
   * Get display name for an item (descriptive if unidentified, real name if identified)
   */
  getDisplayName(item: Item, state: GameState): string {
    switch (item.type) {
      case ItemType.POTION: {
        const potion = item as Potion
        if (this.isIdentified(potion.potionType, state)) {
          return potion.name
        }
        return state.itemNameMap.potions.get(potion.potionType) || 'unknown potion'
      }

      case ItemType.SCROLL: {
        const scroll = item as Scroll
        if (this.isIdentified(scroll.scrollType, state)) {
          return scroll.name
        }
        return state.itemNameMap.scrolls.get(scroll.scrollType) || 'unknown scroll'
      }

      case ItemType.RING: {
        const ring = item as Ring
        if (this.isIdentified(ring.ringType, state)) {
          return ring.name
        }
        return state.itemNameMap.rings.get(ring.ringType) || 'unknown ring'
      }

      case ItemType.WAND: {
        const wand = item as Wand
        if (this.isIdentified(wand.wandType, state)) {
          return wand.name
        }
        return state.itemNameMap.wands.get(wand.wandType) || 'unknown wand'
      }

      // Weapons, armor, food don't need identification
      default:
        return item.name
    }
  }

  /**
   * Get the item type key for identification tracking
   */
  getItemTypeKey(item: Item): string | null {
    switch (item.type) {
      case ItemType.POTION:
        return (item as Potion).potionType
      case ItemType.SCROLL:
        return (item as Scroll).scrollType
      case ItemType.RING:
        return (item as Ring).ringType
      case ItemType.WAND:
        return (item as Wand).wandType
      default:
        return null // Item doesn't need identification
    }
  }

  /**
   * Identify item by using it (convenience method)
   */
  identifyByUse(item: Item, state: GameState): GameState {
    const typeKey = this.getItemTypeKey(item)
    if (!typeKey) return state
    return this.identifyItem(typeKey, state)
  }
}
