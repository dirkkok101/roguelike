import { ItemEffectService } from './ItemEffectService'
import { MockRandom } from '@services/RandomService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import {
  GameState,
  Player,
  Potion,
  PotionType,
  Scroll,
  ScrollType,
  Food,
  OilFlask,
  LightSource,
  Weapon,
  Armor,
  ItemType,
} from '@game/core/core'

describe('ItemEffectService', () => {
  let service: ItemEffectService
  let mockRandom: MockRandom
  let inventoryService: InventoryService
  let identificationService: IdentificationService

  beforeEach(() => {
    mockRandom = new MockRandom([])
    inventoryService = new InventoryService()
    identificationService = new IdentificationService(mockRandom)
    service = new ItemEffectService(mockRandom, inventoryService, identificationService)
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 30,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestState(player: Player): GameState {
    return {
      player,
      currentLevel: 1,
      levels: new Map(),
      messages: [],
      turnCount: 1,
      seed: 'test',
      visibleCells: new Set(),
      isGameOver: false,
      identifiedItems: new Set(),
      itemAppearances: new Map(),
    }
  }

  // ============================================================================
  // POTION EFFECTS
  // ============================================================================

  describe('applyPotionEffect', () => {
    describe('HEAL potion', () => {
      test('heals player by rolled amount', () => {
        mockRandom.setNextValues([8]) // Roll 8 HP
        const player = createTestPlayer()
        player.hp = 15
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of healing',
            potionType: PotionType.HEAL,
            power: '2d4',
            identified: false,
            appearance: 'red potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.hp).toBe(23) // 15 + 8
        expect(result.effectMessage).toContain('+8 HP')
        expect(result.updatedState.player.inventory).toHaveLength(0) // Removed
      })

      test('caps healing at maxHP', () => {
        mockRandom.setNextValues([15]) // Roll 15 HP
        const player = createTestPlayer()
        player.hp = 25
        player.maxHp = 30
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of healing',
            potionType: PotionType.HEAL,
            power: '2d8',
            identified: false,
            appearance: 'red potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.hp).toBe(30) // Capped at maxHP
        expect(result.effectMessage).toContain('+5 HP') // Actual healing
      })
    })

    describe('EXTRA_HEAL potion', () => {
      test('heals player with extra healing message', () => {
        mockRandom.setNextValues([12])
        const player = createTestPlayer()
        player.hp = 10
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of extra healing',
            potionType: PotionType.EXTRA_HEAL,
            power: '4d4',
            identified: false,
            appearance: 'blue potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.hp).toBe(22)
        expect(result.effectMessage).toContain('much better')
        expect(result.effectMessage).toContain('+12 HP')
      })
    })

    describe('GAIN_STRENGTH potion', () => {
      test('increases both strength and maxStrength by 1', () => {
        const player = createTestPlayer()
        player.strength = 16
        player.maxStrength = 16
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of gain strength',
            potionType: PotionType.GAIN_STRENGTH,
            power: '0',
            identified: false,
            appearance: 'green potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.strength).toBe(17)
        expect(result.updatedState.player.maxStrength).toBe(17)
        expect(result.effectMessage).toContain('stronger')
        expect(result.effectMessage).toContain('17')
      })
    })

    describe('RESTORE_STRENGTH potion', () => {
      test('restores strength to maxStrength', () => {
        const player = createTestPlayer()
        player.strength = 12
        player.maxStrength = 18
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of restore strength',
            potionType: PotionType.RESTORE_STRENGTH,
            power: '0',
            identified: false,
            appearance: 'yellow potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.strength).toBe(18)
        expect(result.effectMessage).toContain('restored')
        expect(result.effectMessage).toContain('18')
      })
    })

    describe('POISON potion', () => {
      test('damages player', () => {
        mockRandom.setNextValues([6])
        const player = createTestPlayer()
        player.hp = 20
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of poison',
            potionType: PotionType.POISON,
            power: '1d8',
            identified: false,
            appearance: 'purple potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.hp).toBe(14) // 20 - 6
        expect(result.effectMessage).toContain('sick')
        expect(result.effectMessage).toContain('-6 HP')
        expect(result.isGameOver).toBeUndefined()
      })

      test('kills player and sets game over flag', () => {
        mockRandom.setNextValues([25])
        const player = createTestPlayer()
        player.hp = 10
        player.inventory = [
          {
            id: 'potion-1',
            type: ItemType.POTION,
            name: 'potion of poison',
            potionType: PotionType.POISON,
            power: '3d10',
            identified: false,
            appearance: 'purple potion',
          } as Potion,
        ]
        const state = createTestState(player)

        const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

        expect(result.updatedState.player.hp).toBe(0)
        expect(result.updatedState.isGameOver).toBe(true)
        expect(result.isGameOver).toBe(true)
      })
    })

    test('identifies potion by use', () => {
      const player = createTestPlayer()
      player.inventory = [
        {
          id: 'potion-1',
          type: ItemType.POTION,
          name: 'potion of healing',
          potionType: PotionType.HEAL,
          power: '2d4',
          identified: false,
          appearance: 'red potion',
        } as Potion,
      ]
      const state = createTestState(player)
      mockRandom.setNextValues([5])

      const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

      // identifyByUse should have been called
      expect(result.updatedState.identifiedItems).toBeDefined()
    })

    test('removes potion from inventory after use', () => {
      const player = createTestPlayer()
      player.inventory = [
        {
          id: 'potion-1',
          type: ItemType.POTION,
          name: 'potion of healing',
          potionType: PotionType.HEAL,
          power: '2d4',
          identified: false,
          appearance: 'red potion',
        } as Potion,
        {
          id: 'potion-2',
          type: ItemType.POTION,
          name: 'another potion',
          potionType: PotionType.POISON,
          power: '1d6',
          identified: false,
          appearance: 'blue potion',
        } as Potion,
      ]
      const state = createTestState(player)
      mockRandom.setNextValues([3])

      const result = service.applyPotionEffect(state, player.inventory[0] as Potion)

      expect(result.updatedState.player.inventory).toHaveLength(1)
      expect(result.updatedState.player.inventory[0].id).toBe('potion-2')
    })
  })

  // ============================================================================
  // SCROLL EFFECTS
  // ============================================================================

  describe('applyScrollEffect', () => {
    describe('IDENTIFY scroll', () => {
      test('identifies target item', () => {
        const player = createTestPlayer()
        const targetPotion: Potion = {
          id: 'target-potion',
          type: ItemType.POTION,
          name: 'potion of healing',
          potionType: PotionType.HEAL,
          power: '2d4',
          identified: false,
          appearance: 'red potion',
        }
        const scroll: Scroll = {
          id: 'scroll-1',
          type: ItemType.SCROLL,
          name: 'scroll of identify',
          scrollType: ScrollType.IDENTIFY,
          identified: false,
          appearance: 'ancient scroll',
        }
        player.inventory = [scroll, targetPotion]
        const state = createTestState(player)

        const result = service.applyScrollEffect(state, scroll, 'target-potion')

        expect(result.effectMessage).toContain('This is')
        expect(result.updatedState.player.inventory).toHaveLength(1) // Scroll removed
      })

      test('handles missing target', () => {
        const player = createTestPlayer()
        const scroll: Scroll = {
          id: 'scroll-1',
          type: ItemType.SCROLL,
          name: 'scroll of identify',
          scrollType: ScrollType.IDENTIFY,
          identified: false,
          appearance: 'ancient scroll',
        }
        player.inventory = [scroll]
        const state = createTestState(player)

        const result = service.applyScrollEffect(state, scroll) // No target

        expect(result.effectMessage).toContain('nothing happens')
      })
    })

    describe('ENCHANT_WEAPON scroll', () => {
      test('enchants weapon and increases bonus', () => {
        const player = createTestPlayer()
        const weapon: Weapon = {
          id: 'weapon-1',
          type: ItemType.WEAPON,
          name: 'mace',
          damage: '2d4',
          bonus: 0,
          identified: true,
        }
        const scroll: Scroll = {
          id: 'scroll-1',
          type: ItemType.SCROLL,
          name: 'scroll of enchant weapon',
          scrollType: ScrollType.ENCHANT_WEAPON,
          identified: false,
          appearance: 'fiery scroll',
        }
        player.inventory = [scroll, weapon]
        const state = createTestState(player)

        const result = service.applyScrollEffect(state, scroll, 'weapon-1')

        expect(result.effectMessage).toContain('glows brightly')
        expect(result.effectMessage).toContain('+1')
        // Weapon should be replaced with enchanted version
        const enchantedWeapon = result.updatedState.player.inventory.find(
          (i) => i.type === ItemType.WEAPON
        ) as Weapon
        expect(enchantedWeapon.bonus).toBe(1)
      })

      test('respects max enchantment of +3', () => {
        const player = createTestPlayer()
        const weapon: Weapon = {
          id: 'weapon-1',
          type: ItemType.WEAPON,
          name: 'mace',
          damage: '2d4',
          bonus: 3,
          identified: true,
        }
        const scroll: Scroll = {
          id: 'scroll-1',
          type: ItemType.SCROLL,
          name: 'scroll of enchant weapon',
          scrollType: ScrollType.ENCHANT_WEAPON,
          identified: false,
          appearance: 'fiery scroll',
        }
        player.inventory = [scroll, weapon]
        const state = createTestState(player)

        const result = service.applyScrollEffect(state, scroll, 'weapon-1')

        expect(result.effectMessage).toContain('maximum enchantment')
        const weaponAfter = result.updatedState.player.inventory.find(
          (i) => i.type === ItemType.WEAPON
        ) as Weapon
        expect(weaponAfter.bonus).toBe(3) // Unchanged
      })

      test('updates equipped weapon', () => {
        const player = createTestPlayer()
        const weapon: Weapon = {
          id: 'weapon-1',
          type: ItemType.WEAPON,
          name: 'mace',
          damage: '2d4',
          bonus: 0,
          identified: true,
        }
        player.equipment.weapon = weapon
        const scroll: Scroll = {
          id: 'scroll-1',
          type: ItemType.SCROLL,
          name: 'scroll of enchant weapon',
          scrollType: ScrollType.ENCHANT_WEAPON,
          identified: false,
          appearance: 'fiery scroll',
        }
        player.inventory = [scroll, weapon]
        const state = createTestState(player)

        const result = service.applyScrollEffect(state, scroll, 'weapon-1')

        expect(result.updatedState.player.equipment.weapon?.bonus).toBe(1)
      })
    })
  })

  // ============================================================================
  // WAND EFFECTS
  // ============================================================================

  describe('applyWandEffect', () => {
    test('checks for wand charges', () => {
      const player = createTestPlayer()
      const wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'wand of magic missile',
        wandType: WandType.MAGIC_MISSILE,
        currentCharges: 0,
        maxCharges: 5,
        identified: false,
        appearance: 'oak wand',
      }
      player.inventory = [wand]
      const state = createTestState(player)

      const result = service.applyWandEffect(state, wand)

      expect(result.effectMessage).toContain('no charges')
    })

    test('decrements charges when used', () => {
      const player = createTestPlayer()
      const wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'wand of magic missile',
        wandType: WandType.MAGIC_MISSILE,
        currentCharges: 3,
        maxCharges: 5,
        identified: false,
        appearance: 'oak wand',
      }
      player.inventory = [wand]
      const state = createTestState(player)

      const result = service.applyWandEffect(state, wand)

      const updatedWand = result.updatedState.player.inventory[0] as any
      expect(updatedWand.currentCharges).toBe(2)
    })
  })

  // ============================================================================
  // FOOD CONSUMPTION
  // ============================================================================

  describe('consumeFood', () => {
    test('restores hunger by nutrition amount', () => {
      const player = createTestPlayer()
      player.hunger = 500
      const food: Food = {
        id: 'food-1',
        type: ItemType.FOOD,
        name: 'ration of food',
        nutrition: 800,
        identified: true,
      }
      player.inventory = [food]
      const state = createTestState(player)

      const result = service.consumeFood(state, food)

      expect(result.updatedState.player.hunger).toBe(1300) // 500 + 800
      expect(result.effectMessage).toContain('satiated')
      expect(result.updatedState.player.inventory).toHaveLength(0)
    })
  })

  // ============================================================================
  // LANTERN REFILL
  // ============================================================================

  describe('refillLantern', () => {
    test('adds fuel to equipped lantern', () => {
      const player = createTestPlayer()
      const lantern: LightSource = {
        type: 'lantern',
        radius: 2,
        isPermanent: false,
        fuel: 200,
        maxFuel: 500,
        name: 'Lantern',
      }
      player.equipment.lightSource = lantern
      const oilFlask: OilFlask = {
        id: 'oil-1',
        type: ItemType.OIL_FLASK,
        name: 'flask of oil',
        fuelAmount: 250,
        identified: true,
      }
      player.inventory = [oilFlask]
      const state = createTestState(player)

      const result = service.refillLantern(state, oilFlask)

      expect(result.updatedState.player.equipment.lightSource?.fuel).toBe(450) // 200 + 250
      expect(result.effectMessage).toContain('+250 fuel')
      expect(result.updatedState.player.inventory).toHaveLength(0)
    })

    test('caps fuel at maxFuel', () => {
      const player = createTestPlayer()
      const lantern: LightSource = {
        type: 'lantern',
        radius: 2,
        isPermanent: false,
        fuel: 400,
        maxFuel: 500,
        name: 'Lantern',
      }
      player.equipment.lightSource = lantern
      const oilFlask: OilFlask = {
        id: 'oil-1',
        type: ItemType.OIL_FLASK,
        name: 'flask of oil',
        fuelAmount: 250,
        identified: true,
      }
      player.inventory = [oilFlask]
      const state = createTestState(player)

      const result = service.refillLantern(state, oilFlask)

      expect(result.updatedState.player.equipment.lightSource?.fuel).toBe(500) // Capped
      expect(result.effectMessage).toContain('+100 fuel') // Only added 100
    })

    test('rejects if no lantern equipped', () => {
      const player = createTestPlayer()
      player.equipment.lightSource = null
      const oilFlask: OilFlask = {
        id: 'oil-1',
        type: ItemType.OIL_FLASK,
        name: 'flask of oil',
        fuelAmount: 250,
        identified: true,
      }
      player.inventory = [oilFlask]
      const state = createTestState(player)

      const result = service.refillLantern(state, oilFlask)

      expect(result.effectMessage).toContain('do not have a lantern equipped')
    })

    test('rejects if light source is not a lantern', () => {
      const player = createTestPlayer()
      const torch: LightSource = {
        type: 'torch',
        radius: 1,
        isPermanent: false,
        fuel: 500,
        maxFuel: 500,
        name: 'Torch',
      }
      player.equipment.lightSource = torch
      const oilFlask: OilFlask = {
        id: 'oil-1',
        type: ItemType.OIL_FLASK,
        name: 'flask of oil',
        fuelAmount: 250,
        identified: true,
      }
      player.inventory = [oilFlask]
      const state = createTestState(player)

      const result = service.refillLantern(state, oilFlask)

      expect(result.effectMessage).toContain('only refill lanterns')
    })

    test('rejects if lantern already full', () => {
      const player = createTestPlayer()
      const lantern: LightSource = {
        type: 'lantern',
        radius: 2,
        isPermanent: false,
        fuel: 500,
        maxFuel: 500,
        name: 'Lantern',
      }
      player.equipment.lightSource = lantern
      const oilFlask: OilFlask = {
        id: 'oil-1',
        type: ItemType.OIL_FLASK,
        name: 'flask of oil',
        fuelAmount: 250,
        identified: true,
      }
      player.inventory = [oilFlask]
      const state = createTestState(player)

      const result = service.refillLantern(state, oilFlask)

      expect(result.effectMessage).toContain('already full')
    })
  })
})
