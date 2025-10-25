import { GuaranteeTracker, GuaranteeConfig } from './GuaranteeTracker'
import { ItemType, PowerTier } from '@game/core/core'

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
})
