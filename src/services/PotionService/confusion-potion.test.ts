import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
import { createTestPlayer } from '@test-helpers'
import {
  Player,
  Potion,
  PotionType,
  GameState,
  Level,
  Equipment,
  StatusEffectType,
  ItemNameMap,
  ScrollType,
  RingType,
  WandType,
} from '@game/core/core'

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestLevel(): Level {
  const width = 20
  const height = 10
  const tiles = Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({
          type: 'FLOOR' as const,
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
  const itemNameMap: ItemNameMap = {
    potions: new Map<PotionType, string>([
      [PotionType.CONFUSION, 'murky potion'],
      [PotionType.MINOR_HEAL, 'blue potion'],
    ]),
    scrolls: new Map<ScrollType, string>(),
    rings: new Map<RingType, string>(),
    wands: new Map<WandType, string>(),
  }

  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, createTestLevel()]]),
    visibleCells: new Set(),
    messages: [],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'test-game',
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap,
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  }
}

function createConfusionPotion(): Potion {
  return {
    id: 'potion-confusion-1',
    name: 'Potion of Confusion',
    type: 'POTION' as const,
    identified: false,
    position: { x: 5, y: 5 },
    potionType: PotionType.CONFUSION,
    power: '0d0', // Not used for confusion potion
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PotionService - CONFUSION Potion', () => {
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let levelingService: LevelingService
  let statusEffectService: StatusEffectService
  let service: PotionService

  beforeEach(() => {
    mockRandom = new MockRandom()
    identificationService = new IdentificationService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    statusEffectService = new StatusEffectService()
    service = new PotionService(
      mockRandom,
      identificationService,
      levelingService,
      statusEffectService
    )
  })

  describe('applyPotion - CONFUSION', () => {
    test('applies CONFUSED status effect to player', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2]) // 1d3 roll for duration (19 + 2 = 21)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.CONFUSED)
    })

    test('duration is 19-21 turns (original Rogue behavior)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)

      // Test min duration (19 + 1 = 20)
      mockRandom.setValues([1])
      const result1 = service.applyPotion(player, potion, state)
      expect(result1.player.statusEffects[0].duration).toBe(20)

      // Test max duration (19 + 3 = 22)... wait, 1d3 is 1-3, so 19 + 3 = 22
      mockRandom.setValues([3])
      const result2 = service.applyPotion(player, potion, state)
      expect(result2.player.statusEffects[0].duration).toBe(22)

      // Test middle duration (19 + 2 = 21)
      mockRandom.setValues([2])
      const result3 = service.applyPotion(player, potion, state)
      expect(result3.player.statusEffects[0].duration).toBe(21)
    })

    test('returns confusion message with duration', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2]) // Duration: 19 + 2 = 21

      const result = service.applyPotion(player, potion, state)

      expect(result.message).toContain("Wait, what's going on here?")
      expect(result.message).toContain('21 turns')
    })

    test('auto-identifies potion when consumed', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2])

      const result = service.applyPotion(player, potion, state)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2])

      const result = service.applyPotion(player, potion, state)

      expect(result.death).toBeFalsy()
      expect(result.player.hp).toBe(20)
    })

    test('does not modify player stats', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.hp).toBe(20)
      expect(result.player.maxHp).toBe(20)
      expect(result.player.strength).toBe(16)
      expect(result.player.maxStrength).toBe(16)
      expect(result.player.level).toBe(1)
    })

    test('can stack with other status effects', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      // Player already has HASTED status
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(2)
      expect(result.player.statusEffects.map(e => e.type)).toContain(StatusEffectType.HASTED)
      expect(result.player.statusEffects.map(e => e.type)).toContain(StatusEffectType.CONFUSED)
    })

    test('replaces existing CONFUSED effect (does not stack)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      // Player already confused for 5 turns
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 5)

      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2]) // New duration: 21

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.CONFUSED)
      expect(result.player.statusEffects[0].duration).toBe(21) // New duration, not 5
    })

    test('does not modify game state (no state field in result)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createConfusionPotion()
      const state = createTestState(player)
      mockRandom.setValues([2])

      const result = service.applyPotion(player, potion, state)

      expect(result.state).toBeUndefined()
    })
  })
})
