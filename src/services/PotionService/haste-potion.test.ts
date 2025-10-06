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
    energy: 100,
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
      [PotionType.HASTE_SELF, 'glowing potion'],
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

function createHasteSelfPotion(): Potion {
  return {
    id: 'potion-haste-1',
    name: 'Potion of Haste Self',
    type: 'POTION' as const,
    identified: false,
    position: { x: 5, y: 5 },
    potionType: PotionType.HASTE_SELF,
    power: '0d0', // Not used for haste potion
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PotionService - HASTE_SELF Potion', () => {
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

  describe('applyPotion - HASTE_SELF', () => {
    test('applies HASTED status effect to player', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3]) // 1d5 roll for duration (3 + 3 = 6)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.HASTED)
    })

    test('duration is 4-8 turns (matches Original Rogue)', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)

      // Test min duration (3 + 1 = 4)
      mockRandom.setValues([1])
      const result1 = service.applyPotion(player, potion, state)
      expect(result1.player.statusEffects[0].duration).toBe(4)

      // Test max duration (3 + 5 = 8)
      mockRandom.setValues([5])
      const result2 = service.applyPotion(player, potion, state)
      expect(result2.player.statusEffects[0].duration).toBe(8)

      // Test middle duration (3 + 3 = 6)
      mockRandom.setValues([3])
      const result3 = service.applyPotion(player, potion, state)
      expect(result3.player.statusEffects[0].duration).toBe(6)
    })

    test('returns haste message with duration', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([4]) // Duration: 3 + 4 = 7

      const result = service.applyPotion(player, potion, state)

      expect(result.message).toContain('You feel yourself moving much faster!')
      expect(result.message).toContain('7 turns')
    })

    test('auto-identifies potion when consumed', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3])

      const result = service.applyPotion(player, potion, state)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3])

      const result = service.applyPotion(player, potion, state)

      expect(result.death).toBeFalsy()
      expect(result.player.hp).toBe(20)
    })

    test('does not modify player stats (HP, strength, level)', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.hp).toBe(20)
      expect(result.player.maxHp).toBe(20)
      expect(result.player.strength).toBe(16)
      expect(result.player.maxStrength).toBe(16)
      expect(result.player.level).toBe(1)
    })

    test('can stack with other status effects (HASTED + CONFUSED)', () => {
      let player = createTestPlayer()
      // Player already has CONFUSED status
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(2)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.CONFUSED)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.HASTED)
    })

    test('replaces existing HASTED effect (does not stack with itself)', () => {
      let player = createTestPlayer()
      // Player already hasted for 2 turns
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 2)

      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([5]) // New duration: 8

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.HASTED)
      expect(result.player.statusEffects[0].duration).toBe(8) // New duration, not 2
    })

    test('does not modify game state (no state field in result)', () => {
      const player = createTestPlayer()
      const potion = createHasteSelfPotion()
      const state = createTestState(player)
      mockRandom.setValues([3])

      const result = service.applyPotion(player, potion, state)

      expect(result.state).toBeUndefined()
    })
  })
})
