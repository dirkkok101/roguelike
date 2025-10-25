import { GuaranteeTracker } from './GuaranteeTracker'
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
})
