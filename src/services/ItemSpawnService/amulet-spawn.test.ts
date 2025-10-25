import { ItemSpawnService } from './ItemSpawnService'
import { ItemType, Position, Amulet } from '@game/core/core'
import { MockRandom } from '@services/RandomService'
import { mockItemData, mockGuaranteeConfig } from '@/test-utils'

describe('ItemSpawnService - Amulet Spawn', () => {
  let mockRandom: MockRandom

  describe('createAmulet', () => {
    it('should create Amulet of Yendor', () => {
      // MockRandom needs one value for ID generation
      mockRandom = new MockRandom([5000])
      const service = new ItemSpawnService(mockRandom, mockItemData, mockGuaranteeConfig)
      const position: Position = { x: 10, y: 10 }
      const amulet = service.createAmulet(position)

      expect(amulet.type).toBe(ItemType.AMULET)
      expect(amulet.name).toBe('Amulet of Yendor')
      expect(amulet.identified).toBe(true) // Always identified
      expect(amulet.cursed).toBe(false) // Never cursed
      expect(amulet.position).toEqual(position)
    })

    it('should have valid sprite name', () => {
      // MockRandom needs one value for ID generation
      mockRandom = new MockRandom([5000])
      const service = new ItemSpawnService(mockRandom, mockItemData, mockGuaranteeConfig)
      const position: Position = { x: 10, y: 10 }
      const amulet = service.createAmulet(position)

      expect(amulet.spriteName).toBeDefined()
      expect(amulet.spriteName.length).toBeGreaterThan(0)
    })

    it('should have unique ID', () => {
      // MockRandom needs two values for two ID generations
      mockRandom = new MockRandom([5000, 6000])
      const service = new ItemSpawnService(mockRandom, mockItemData, mockGuaranteeConfig)
      const position: Position = { x: 10, y: 10 }
      const amulet1 = service.createAmulet(position)
      const amulet2 = service.createAmulet(position)

      expect(amulet1.id).not.toBe(amulet2.id)
    })
  })
})
