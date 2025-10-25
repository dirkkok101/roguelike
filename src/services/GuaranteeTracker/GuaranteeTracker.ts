import { Item, ItemType, PotionType, ScrollType, PowerTier } from '@game/core/core'

export interface GuaranteeConfig {
  categoryWeights: Record<string, Record<string, number>>
  rangeGuarantees: Record<string, Record<string, number>>
}

export interface ItemCounts {
  healingPotions: number
  identifyScrolls: number
  enchantScrolls: number
  weapons: number
  armors: number
  rings: number
  wands: number
  food: number
  lightSources: number
  utilityPotions: number
  utilityScrolls: number
  advancedPotions: number
  advancedScrolls: number
  powerfulItems: number
  artifacts: number
  lanterns: number
}

export interface ItemDeficit {
  category: string
  count: number
  powerTiers: PowerTier[]
}

export class GuaranteeTracker {
  private rangeCounters: Map<string, ItemCounts> = new Map()
  private currentRange: string = '1-5'

  constructor(private config: GuaranteeConfig) {}

  private getDepthRange(depth: number): string {
    if (depth <= 5) return '1-5'
    if (depth <= 10) return '6-10'
    if (depth <= 15) return '11-15'
    if (depth <= 20) return '16-20'
    return '21-26'
  }

  /**
   * Record item spawned in current depth range
   */
  recordItem(depth: number, item: Item): void {
    const range = this.getDepthRange(depth)
    let counter = this.rangeCounters.get(range)

    if (!counter) {
      counter = this.createEmptyCounter()
      this.rangeCounters.set(range, counter)
    }

    this.incrementCategory(counter, item)
  }

  private createEmptyCounter(): ItemCounts {
    return {
      healingPotions: 0,
      identifyScrolls: 0,
      enchantScrolls: 0,
      weapons: 0,
      armors: 0,
      rings: 0,
      wands: 0,
      food: 0,
      lightSources: 0,
      utilityPotions: 0,
      utilityScrolls: 0,
      advancedPotions: 0,
      advancedScrolls: 0,
      powerfulItems: 0,
      artifacts: 0,
      lanterns: 0
    }
  }

  private incrementCategory(counter: ItemCounts, item: Item): void {
    // Healing potions
    if (item.type === ItemType.POTION && this.isHealingPotion(item)) {
      counter.healingPotions++
    }

    // Identify scrolls
    if (item.type === ItemType.SCROLL && (item as any).scrollType === ScrollType.IDENTIFY) {
      counter.identifyScrolls++
    }

    // Weapons
    if (item.type === ItemType.WEAPON) {
      counter.weapons++
    }

    // Armors
    if (item.type === ItemType.ARMOR) {
      counter.armors++
    }

    // Rings
    if (item.type === ItemType.RING) {
      counter.rings++
    }

    // Wands
    if (item.type === ItemType.WAND) {
      counter.wands++
    }

    // Food
    if (item.type === ItemType.FOOD) {
      counter.food++
    }

    // Light sources
    if (item.type === ItemType.TORCH || item.type === ItemType.LANTERN || item.type === ItemType.OIL_FLASK) {
      counter.lightSources++
    }

    // Track artifacts separately
    if (item.type === ItemType.ARTIFACT) {
      counter.artifacts++
      counter.lightSources++ // Artifacts are also light sources
    }

    // Track lanterns separately
    if (item.type === ItemType.LANTERN) {
      counter.lanterns++
    }
  }

  private isHealingPotion(item: Item): boolean {
    const potionTypes = [
      PotionType.MINOR_HEAL,
      PotionType.MEDIUM_HEAL,
      PotionType.MAJOR_HEAL,
      PotionType.SUPERIOR_HEAL
    ]
    return potionTypes.includes((item as any).potionType)
  }
}
