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
      [PotionType.SEE_INVISIBLE, 'shimmering potion'],
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

function createSeeInvisiblePotion(): Potion {
  return {
    id: 'potion-see-invisible-1',
    name: 'Potion of See Invisible',
    type: 'POTION' as const,
    identified: false,
    position: { x: 5, y: 5 },
    potionType: PotionType.SEE_INVISIBLE,
    power: '0d0', // Not used for see invisible potion
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PotionService - SEE_INVISIBLE Potion', () => {
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

  describe('applyPotion - SEE_INVISIBLE', () => {
    test('applies SEE_INVISIBLE status effect to player', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.SEE_INVISIBLE)
    })

    test('duration is 999 turns (effectively permanent until stairs)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects[0].duration).toBe(999)
    })

    test('returns correct message matching design spec', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.message).toBe('Your eyes tingle. You can now see invisible creatures!')
    })

    test('auto-identifies potion when consumed', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.death).toBeFalsy()
      expect(result.player.hp).toBe(20)
    })

    test('does not modify player stats (HP, strength, level)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.hp).toBe(20)
      expect(result.player.maxHp).toBe(20)
      expect(result.player.strength).toBe(16)
      expect(result.player.maxStrength).toBe(16)
      expect(result.player.level).toBe(1)
    })

    test('can stack with other status effects (SEE_INVISIBLE + HASTED)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      // Player already has HASTED status
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 10)

      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(2)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.HASTED)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.SEE_INVISIBLE)
    })

    test('replaces existing SEE_INVISIBLE effect (does not stack with itself)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      let player = createTestPlayer({ hp: 20, maxHp: 20 })
      // Player already has SEE_INVISIBLE for 100 turns
      player = statusEffectService.addStatusEffect(player, StatusEffectType.SEE_INVISIBLE, 100)

      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.SEE_INVISIBLE)
      expect(result.player.statusEffects[0].duration).toBe(999) // Refreshed to full duration
    })

    test('does not modify game state (no state field in result)', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      expect(result.state).toBeUndefined()
    })

    test('status effect persists when integrated with StatusEffectService', () => {
      // Potion tests expect 20 HP (legacy test baseline)
      const player = createTestPlayer({ hp: 20, maxHp: 20 })
      const potion = createSeeInvisiblePotion()
      const state = createTestState(player)

      const result = service.applyPotion(player, potion, state)

      // Verify status effect is active
      const hasEffect = statusEffectService.hasStatusEffect(
        result.player,
        StatusEffectType.SEE_INVISIBLE
      )
      expect(hasEffect).toBe(true)
    })
  })
})
