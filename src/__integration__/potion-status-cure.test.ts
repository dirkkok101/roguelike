import { FOVService } from '@services/FOVService'
import { PotionService } from '@services/PotionService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { MockRandom } from '@services/RandomService'
import { createTestPlayer } from '@test-helpers'
import {
  Player,
  Level,
  Equipment,
  Potion,
  PotionType,
  ItemType,
  GameState,
  StatusEffectType,
  TileType,
} from '@game/core/core'

/**
 * Integration test: Potion Status Cure
 *
 * Purpose: Validates end-to-end flow of status effects being cured by healing potions
 * and the immediate impact on game systems (FOV restoration, movement normalization).
 *
 * This test ensures that curing blindness/confusion via potions immediately affects
 * other game systems without requiring additional state updates.
 */
describe('Integration: Potion Status Cure', () => {
  let fovService: FOVService
  let potionService: PotionService
  let statusEffectService: StatusEffectService
  let identificationService: IdentificationService
  let levelingService: LevelingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    identificationService = new IdentificationService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)
  })

  function createTestLevel(): Level {
    const width = 20
    const height = 10

    // Create all transparent floor tiles
    const tiles = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#888',
            colorExplored: '#444',
          }))
      )

    const explored = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false))

    return {
      depth: 1,
      width,
      height,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored,
    }
  }

  function createTestState(player: Player): GameState {
    return {
      player,
      levels: new Map(),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
      visibleCells: new Set(),
      seed: 'test-seed',
      gameId: 'test-game',
      hasWon: false,
      hasAmulet: false,
      itemNameMap: { potions: new Map(), scrolls: new Map(), wands: new Map(), rings: new Map() },
      identifiedItems: new Set(),
    }
  }

  function createHealPotion(): Potion {
    return {
      id: 'potion-heal',
      type: ItemType.POTION,
      name: 'Potion of Healing',
      potionType: PotionType.HEAL,
      effect: 'Heals 1d8 HP',
      power: '1d8',
      descriptorName: 'blue potion',
      isIdentified: false,
    }
  }

  describe('Blindness → Heal Potion → Vision Restored', () => {
    test('heal potion restores vision to blind player', () => {
      const level = createTestLevel()
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // 1. Apply blindness status effect
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      // 2. Verify blindness blocks FOV (player cannot see anything)
      const blindFOV = fovService.computeFOV(player.position, 2, level, player)
      expect(blindFOV.size).toBe(0)
      expect(statusEffectService.hasStatusEffect(player, StatusEffectType.BLIND)).toBe(true)

      // 3. Drink heal potion
      mockRandom.setValues([5]) // Heal amount
      const healPotion = createHealPotion()
      const result = potionService.applyPotion(player, healPotion, state)

      // 4. Verify blindness is cured
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.message).toContain('You can see again!')

      // 5. Verify vision is immediately restored
      const curedFOV = fovService.computeFOV(result.player.position, 2, level, result.player)
      expect(curedFOV.size).toBeGreaterThan(0)
      expect(curedFOV.has('5,5')).toBe(true) // Can see own position
    })

    test('extra heal potion restores vision to blind player', () => {
      const level = createTestLevel()
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Apply blindness
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      // Verify no vision
      const blindFOV = fovService.computeFOV(player.position, 2, level, player)
      expect(blindFOV.size).toBe(0)

      // Drink extra heal potion
      mockRandom.setValues([12])
      const extraHealPotion: Potion = {
        id: 'potion-extra-heal',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.EXTRA_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, extraHealPotion, state)

      // Verify vision restored
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.message).toContain('You can see again!')

      const curedFOV = fovService.computeFOV(result.player.position, 2, level, result.player)
      expect(curedFOV.size).toBeGreaterThan(0)
    })

    test('vision quality matches normal sight after cure', () => {
      const level = createTestLevel()
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Get baseline FOV for normal vision
      const normalFOV = fovService.computeFOV(player.position, 2, level, player)
      const normalFOVSize = normalFOV.size

      // Apply blindness
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)
      const blindFOV = fovService.computeFOV(player.position, 2, level, player)
      expect(blindFOV.size).toBe(0)

      // Cure with heal potion
      mockRandom.setValues([5])
      const healPotion = createHealPotion()
      const result = potionService.applyPotion(player, healPotion, state)

      // Verify cured FOV matches normal FOV
      const curedFOV = fovService.computeFOV(result.player.position, 2, level, result.player)
      expect(curedFOV.size).toBe(normalFOVSize)
      expect(curedFOV).toEqual(normalFOV)
    })
  })

  describe('Confusion → Heal Potion → Clear Head', () => {
    test('heal potion cures confusion', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Apply confusion
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 20)
      expect(statusEffectService.hasStatusEffect(player, StatusEffectType.CONFUSED)).toBe(true)

      // Drink heal potion
      mockRandom.setValues([5])
      const healPotion = createHealPotion()
      const result = potionService.applyPotion(player, healPotion, state)

      // Verify confusion cured
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(result.message).toContain('Your head clears!')
    })

    test('extra heal potion cures confusion', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Apply confusion
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 20)

      // Drink extra heal potion
      mockRandom.setValues([12])
      const extraHealPotion: Potion = {
        id: 'potion-extra-heal',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.EXTRA_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, extraHealPotion, state)

      // Verify confusion cured
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(result.message).toContain('Your head clears!')
    })
  })

  describe('Multiple Status Effects → Heal Potion → All Cured', () => {
    test('heal potion cures both blindness and confusion simultaneously', () => {
      const level = createTestLevel()
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Apply both status effects
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 20)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      // Verify both are active
      expect(statusEffectService.hasStatusEffect(player, StatusEffectType.CONFUSED)).toBe(true)
      expect(statusEffectService.hasStatusEffect(player, StatusEffectType.BLIND)).toBe(true)
      expect(player.statusEffects.length).toBe(2)

      // Verify no vision due to blindness
      const blindFOV = fovService.computeFOV(player.position, 2, level, player)
      expect(blindFOV.size).toBe(0)

      // Drink heal potion
      mockRandom.setValues([5])
      const healPotion = createHealPotion()
      const result = potionService.applyPotion(player, healPotion, state)

      // Verify both effects cured
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.player.statusEffects.length).toBe(0)

      // Verify both cure messages present
      expect(result.message).toContain('Your head clears!')
      expect(result.message).toContain('You can see again!')

      // Verify vision restored
      const curedFOV = fovService.computeFOV(result.player.position, 2, level, result.player)
      expect(curedFOV.size).toBeGreaterThan(0)
    })

    test('heal potion only cures confusion and blindness, preserves other status effects', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      const state = createTestState(player)

      // Apply multiple status effects
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 20)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.SEE_INVISIBLE, 999)

      expect(player.statusEffects.length).toBe(4)

      // Drink heal potion
      mockRandom.setValues([5])
      const healPotion = createHealPotion()
      const result = potionService.applyPotion(player, healPotion, state)

      // Verify only confusion and blindness cured
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)

      // Verify other status effects preserved
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.HASTED)).toBe(true)
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.SEE_INVISIBLE)).toBe(true)
      expect(result.player.statusEffects.length).toBe(2)
    })
  })
})
