import { Item, PowerTier } from '@game/core/core'

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
}
