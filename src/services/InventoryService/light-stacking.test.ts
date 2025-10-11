import { InventoryService } from './InventoryService'
import { ItemType, Torch, OilFlask, Item } from '@game/core/core'

describe('InventoryService - Light Stacking', () => {
  let service: InventoryService

  beforeEach(() => {
    service = new InventoryService()
  })

  describe('stackLightSources', () => {
    it('should stack torches with same fuel amount', () => {
      const inventory: Item[] = [
        {
          id: '1',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
        {
          id: '2',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
      ]

      const stacked = service.stackLightSources(inventory)

      expect(stacked).toHaveLength(1)
      expect(stacked[0].quantity).toBe(2)
      expect(stacked[0].totalFuel).toBe(1300)
    })

    it('should NOT stack torches with different fuel amounts', () => {
      const inventory: Item[] = [
        {
          id: '1',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
        {
          id: '2',
          type: ItemType.TORCH,
          fuel: 400,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
      ]

      const stacked = service.stackLightSources(inventory)

      expect(stacked).toHaveLength(2)
    })

    it('should stack oil flasks with same fuel amount', () => {
      const inventory: Item[] = [
        {
          id: '1',
          type: ItemType.OIL_FLASK,
          fuelAmount: 600,
          name: 'Oil Flask',
          spriteName: 'Flask of oil',
          identified: true,
        } as OilFlask,
        {
          id: '2',
          type: ItemType.OIL_FLASK,
          fuelAmount: 600,
          name: 'Oil Flask',
          spriteName: 'Flask of oil',
          identified: true,
        } as OilFlask,
        {
          id: '3',
          type: ItemType.OIL_FLASK,
          fuelAmount: 600,
          name: 'Oil Flask',
          spriteName: 'Flask of oil',
          identified: true,
        } as OilFlask,
      ]

      const stacked = service.stackLightSources(inventory)

      expect(stacked).toHaveLength(1)
      expect(stacked[0].quantity).toBe(3)
      expect(stacked[0].totalFuel).toBe(1800)
    })

    it('should NOT stack non-light-source items', () => {
      const inventory: Item[] = [
        {
          id: '1',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
        {
          id: '2',
          type: ItemType.FOOD,
          nutrition: 800,
          name: 'Food Ration',
          spriteName: 'food ration',
          identified: false,
        } as Item,
      ]

      const stacked = service.stackLightSources(inventory)

      expect(stacked).toHaveLength(2)
      // Non-stackable items should have quantity = 1
      const foodItem = stacked.find((s) => s.item.type === ItemType.FOOD)
      expect(foodItem?.quantity).toBe(1)
      expect(foodItem?.totalFuel).toBe(0)
    })

    it('should handle mixed inventory with multiple item types', () => {
      const inventory: Item[] = [
        {
          id: '1',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
        {
          id: '2',
          type: ItemType.TORCH,
          fuel: 650,
          maxFuel: 650,
          radius: 2,
          isPermanent: false,
          name: 'Torch',
          spriteName: 'Wooden Torch',
          identified: true,
        } as Torch,
        {
          id: '3',
          type: ItemType.OIL_FLASK,
          fuelAmount: 600,
          name: 'Oil Flask',
          spriteName: 'Flask of oil',
          identified: true,
        } as OilFlask,
        {
          id: '4',
          type: ItemType.FOOD,
          nutrition: 800,
          name: 'Food Ration',
          spriteName: 'food ration',
          identified: false,
        } as Item,
      ]

      const stacked = service.stackLightSources(inventory)

      // Should have 3 stacks: 1 torch stack (qty 2), 1 oil stack (qty 1), 1 food (qty 1)
      expect(stacked).toHaveLength(3)
    })
  })

  describe('getDisplayName', () => {
    it('should return plain name for quantity = 1', () => {
      const torch: Torch = {
        id: '1',
        type: ItemType.TORCH,
        fuel: 650,
        maxFuel: 650,
        radius: 2,
        isPermanent: false,
        name: 'Torch',
        spriteName: 'Wooden Torch',
        identified: true,
      } as Torch

      const displayName = service.getDisplayName(torch, 1)

      expect(displayName).toBe('Torch')
    })

    it('should format display name with quantity and total fuel for torches', () => {
      const torch: Torch = {
        id: '1',
        type: ItemType.TORCH,
        fuel: 650,
        maxFuel: 650,
        radius: 2,
        isPermanent: false,
        name: 'Torch',
        spriteName: 'Wooden Torch',
        identified: true,
      } as Torch

      const displayName = service.getDisplayName(torch, 3)

      expect(displayName).toBe('Torch (×3, 1950 turns)')
    })

    it('should format display name with quantity and total fuel for oil flasks', () => {
      const oilFlask: OilFlask = {
        id: '1',
        type: ItemType.OIL_FLASK,
        fuelAmount: 600,
        name: 'Oil Flask',
        spriteName: 'Flask of oil',
        identified: true,
      } as OilFlask

      const displayName = service.getDisplayName(oilFlask, 2)

      expect(displayName).toBe('Oil Flask (×2, 1200 turns)')
    })

    it('should handle non-stackable items', () => {
      const food = {
        id: '1',
        type: ItemType.FOOD,
        nutrition: 800,
        name: 'Food Ration',
        spriteName: 'food ration',
        identified: false,
      } as Item

      const displayName = service.getDisplayName(food, 1)

      expect(displayName).toBe('Food Ration')
    })
  })
})
