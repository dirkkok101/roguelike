import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
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

function createTestPlayer(): Player {
  const equipment: Equipment = {
    weapon: null,
    armor: null,
    leftRing: null,
    rightRing: null,
    lightSource: null,
  }

  return {
    position: { x: 5, y: 5 },
    hp: 20,
    maxHp: 20,
    strength: 16,
    maxStrength: 16,
    ac: 5,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment,
    inventory: [],
    statusEffects: [],
  }
}

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
      [PotionType.BLINDNESS, 'dark potion'],
      [PotionType.HEAL, 'blue potion'],
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

function createBlindnessPotion(): Potion {
  return {
    id: 'potion-blindness-1',
    name: 'Potion of Blindness',
    type: 'POTION' as const,
    identified: false,
    position: { x: 5, y: 5 },
    potionType: PotionType.BLINDNESS,
    power: '0d0', // Not used for blindness potion
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PotionService - BLINDNESS Potion', () => {
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

  describe('applyPotion - BLINDNESS', () => {
    test('applies BLIND status effect to player', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10]) // 1d21 roll for duration (39 + 10 = 49)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.BLIND)
    })

    test('duration is 40-60 turns (balanced for gameplay)', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)

      // Test min duration (39 + 1 = 40)
      mockRandom.setValues([1])
      const result1 = service.applyPotion(player, potion, state)
      expect(result1.player.statusEffects[0].duration).toBe(40)

      // Test max duration (39 + 21 = 60)
      mockRandom.setValues([21])
      const result2 = service.applyPotion(player, potion, state)
      expect(result2.player.statusEffects[0].duration).toBe(60)

      // Test middle duration (39 + 10 = 49)
      mockRandom.setValues([10])
      const result3 = service.applyPotion(player, potion, state)
      expect(result3.player.statusEffects[0].duration).toBe(49)
    })

    test('returns blindness message with duration', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([15]) // Duration: 39 + 15 = 54

      const result = service.applyPotion(player, potion, state)

      expect(result.message).toContain("Oh, bummer! Everything is dark!")
      expect(result.message).toContain('54 turns')
    })

    test('auto-identifies potion when consumed', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10])

      const result = service.applyPotion(player, potion, state)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10])

      const result = service.applyPotion(player, potion, state)

      expect(result.death).toBeFalsy()
      expect(result.player.hp).toBe(20)
    })

    test('does not modify player stats', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.hp).toBe(20)
      expect(result.player.maxHp).toBe(20)
      expect(result.player.strength).toBe(16)
      expect(result.player.maxStrength).toBe(16)
      expect(result.player.level).toBe(1)
    })

    test('can stack with other status effects', () => {
      let player = createTestPlayer()
      // Player already has HASTED status
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(2)
      expect(result.player.statusEffects.map(e => e.type)).toContain(StatusEffectType.HASTED)
      expect(result.player.statusEffects.map(e => e.type)).toContain(StatusEffectType.BLIND)
    })

    test('replaces existing BLIND effect (does not stack)', () => {
      let player = createTestPlayer()
      // Player already blind for 10 turns
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 10)

      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([15]) // New duration: 54

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.BLIND)
      expect(result.player.statusEffects[0].duration).toBe(54) // New duration, not 10
    })

    test('does not modify game state (no state field in result)', () => {
      const player = createTestPlayer()
      const potion = createBlindnessPotion()
      const state = createTestState(player)
      mockRandom.setValues([10])

      const result = service.applyPotion(player, potion, state)

      expect(result.state).toBeUndefined()
    })
  })
})
