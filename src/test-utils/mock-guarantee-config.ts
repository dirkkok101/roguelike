import { GuaranteeConfig } from '@services/GuaranteeTracker'

/**
 * Mock guarantee config for testing ItemSpawnService
 * Provides complete category weights and range guarantees for all depth ranges
 * Based on guarantees.json structure
 */
export const mockGuaranteeConfig: GuaranteeConfig = {
  categoryWeights: {
    '1-5': {
      potion: 20,
      scroll: 20,
      ring: 5,
      wand: 5,
      weapon: 15,
      armor: 15,
      food: 12,
      light: 8,
    },
    '6-10': {
      potion: 18,
      scroll: 18,
      ring: 10,
      wand: 10,
      weapon: 12,
      armor: 12,
      food: 12,
      light: 8,
    },
    '11-15': {
      potion: 16,
      scroll: 16,
      ring: 14,
      wand: 14,
      weapon: 10,
      armor: 10,
      food: 12,
      light: 8,
    },
    '16-20': {
      potion: 15,
      scroll: 15,
      ring: 16,
      wand: 16,
      weapon: 8,
      armor: 8,
      food: 14,
      light: 8,
    },
    '21-26': {
      potion: 14,
      scroll: 14,
      ring: 18,
      wand: 18,
      weapon: 6,
      armor: 6,
      food: 16,
      light: 8,
    },
  },
  rangeGuarantees: {
    '1-5': {
      healingPotions: 10,
      identifyScrolls: 3,
      weapons: 2,
      armors: 2,
      food: 6,
      lightSources: 8,
    },
    '6-10': {
      healingPotions: 8,
      enchantScrolls: 2,
      rings: 2,
      lanterns: 1,
      lightSources: 6,
      food: 5,
    },
    '11-15': {
      healingPotions: 6,
      utilityPotions: 6,
      utilityScrolls: 3,
      rings: 3,
      wands: 2,
      lightSources: 5,
      food: 5,
    },
    '16-20': {
      healingPotions: 8,
      advancedPotions: 8,
      advancedScrolls: 4,
      rings: 4,
      wands: 3,
      lightSources: 5,
      food: 5,
    },
    '21-26': {
      healingPotions: 8,
      powerfulItems: 10,
      artifacts: 2,
      food: 10,
      lightSources: 4,
    },
  },
}
