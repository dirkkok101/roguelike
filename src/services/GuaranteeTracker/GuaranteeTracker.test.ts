import { GuaranteeTracker, GuaranteeConfig } from './GuaranteeTracker'
import { ItemType, PowerTier, ScrollType } from '@game/core/core'

describe('GuaranteeTracker', () => {
  describe('getDepthRange', () => {
    test('returns 1-5 for depths 1-5', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](1)).toBe('1-5')
      expect(tracker['getDepthRange'](5)).toBe('1-5')
    })

    test('returns 6-10 for depths 6-10', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](6)).toBe('6-10')
      expect(tracker['getDepthRange'](10)).toBe('6-10')
    })

    test('returns 21-26 for depths 21-26', () => {
      const tracker = new GuaranteeTracker({} as any)
      expect(tracker['getDepthRange'](21)).toBe('21-26')
      expect(tracker['getDepthRange'](26)).toBe('21-26')
    })
  })

  describe('recordItem', () => {
    const mockConfig: GuaranteeConfig = {
      categoryWeights: {},
      rangeGuarantees: {
        '1-5': { healingPotions: 10 }
      }
    }

    test('records healing potion in correct range', () => {
      const tracker = new GuaranteeTracker(mockConfig)

      const healingPotion = {
        type: ItemType.POTION,
        potionType: 'MINOR_HEAL',
        powerTier: PowerTier.BASIC
      } as any

      tracker.recordItem(3, healingPotion)

      const counters = tracker['rangeCounters'].get('1-5')
      expect(counters?.healingPotions).toBe(1)
    })

    test('accumulates multiple items in same range', () => {
      const tracker = new GuaranteeTracker(mockConfig)

      const healingPotion = {
        type: ItemType.POTION,
        potionType: 'MINOR_HEAL',
        powerTier: PowerTier.BASIC
      } as any

      tracker.recordItem(1, healingPotion)
      tracker.recordItem(3, healingPotion)
      tracker.recordItem(5, healingPotion)

      const counters = tracker['rangeCounters'].get('1-5')
      expect(counters?.healingPotions).toBe(3)
    })

    test('separates items by range', () => {
      const tracker = new GuaranteeTracker({
        ...mockConfig,
        rangeGuarantees: {
          '1-5': { healingPotions: 10 },
          '6-10': { healingPotions: 8 }
        }
      })

      const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any

      tracker.recordItem(3, healingPotion)
      tracker.recordItem(8, healingPotion)

      expect(tracker['rangeCounters'].get('1-5')?.healingPotions).toBe(1)
      expect(tracker['rangeCounters'].get('6-10')?.healingPotions).toBe(1)
    })
  })

  describe('getDeficits', () => {
    test('returns deficit when quota not met', () => {
      const config: GuaranteeConfig = {
        categoryWeights: {},
        rangeGuarantees: {
          '1-5': {
            healingPotions: 10,
            identifyScrolls: 3
          }
        }
      }

      const tracker = new GuaranteeTracker(config)

      // Record only 7 healing potions (need 10)
      const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
      for (let i = 0; i < 7; i++) {
        tracker.recordItem(3, healingPotion)
      }

      // Record only 1 identify scroll (need 3)
      const identifyScroll = { type: ItemType.SCROLL, scrollType: ScrollType.IDENTIFY } as any
      tracker.recordItem(4, identifyScroll)

      const deficits = tracker.getDeficits(5)

      expect(deficits).toHaveLength(2)
      expect(deficits[0]).toEqual({
        category: 'healingPotions',
        count: 3,
        powerTiers: [PowerTier.BASIC]
      })
      expect(deficits[1]).toEqual({
        category: 'identifyScrolls',
        count: 2,
        powerTiers: [PowerTier.BASIC]
      })
    })

    test('returns empty array when all quotas met', () => {
      const config: GuaranteeConfig = {
        categoryWeights: {},
        rangeGuarantees: {
          '1-5': { healingPotions: 5 }
        }
      }

      const tracker = new GuaranteeTracker(config)

      const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
      for (let i = 0; i < 5; i++) {
        tracker.recordItem(2, healingPotion)
      }

      const deficits = tracker.getDeficits(5)
      expect(deficits).toHaveLength(0)
    })

    test('handles over-quota (no deficit)', () => {
      const config: GuaranteeConfig = {
        categoryWeights: {},
        rangeGuarantees: {
          '1-5': { healingPotions: 5 }
        }
      }

      const tracker = new GuaranteeTracker(config)

      const healingPotion = { type: ItemType.POTION, potionType: 'MINOR_HEAL' } as any
      for (let i = 0; i < 12; i++) {
        tracker.recordItem(2, healingPotion)
      }

      const deficits = tracker.getDeficits(5)
      expect(deficits).toHaveLength(0)
    })
  })
})
