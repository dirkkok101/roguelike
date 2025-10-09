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
      [PotionType.LEVITATION, 'fizzy potion'],
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

function createLevitationPotion(): Potion {
  return {
    id: 'potion-levitation-1',
    name: 'Potion of Levitation',
    type: 'POTION' as const,
    identified: false,
    position: { x: 5, y: 5 },
    potionType: PotionType.LEVITATION,
    power: '0d0', // Not used for levitation potion
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('PotionService - LEVITATION Potion', () => {
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

  describe('applyPotion - LEVITATION', () => {
    test('applies LEVITATING status effect to player', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30]) // Duration value

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.LEVITATING)
    })

    test('duration is 29-32 turns (matches Original Rogue)', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)

      // Test min duration (29)
      mockRandom.setValues([29])
      const result1 = service.applyPotion(player, potion, state)
      expect(result1.player.statusEffects[0].duration).toBe(29)

      // Test max duration (32)
      mockRandom.setValues([32])
      const result2 = service.applyPotion(player, potion, state)
      expect(result2.player.statusEffects[0].duration).toBe(32)

      // Test middle duration (30)
      mockRandom.setValues([30])
      const result3 = service.applyPotion(player, potion, state)
      expect(result3.player.statusEffects[0].duration).toBe(30)
    })

    test('returns correct message matching design spec', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.message).toBe('You begin to float above the ground!')
    })

    test('auto-identifies potion when consumed', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.death).toBeFalsy()
      expect(result.player.hp).toBe(20)
    })

    test('does not modify player stats (HP, strength, level)', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.hp).toBe(20)
      expect(result.player.maxHp).toBe(20)
      expect(result.player.strength).toBe(16)
      expect(result.player.maxStrength).toBe(16)
      expect(result.player.level).toBe(1)
    })

    test('can stack with other status effects (LEVITATING + SEE_INVISIBLE)', () => {
      let player = createTestPlayer()
      // Player already has SEE_INVISIBLE status
      player = statusEffectService.addStatusEffect(player, StatusEffectType.SEE_INVISIBLE, 999)

      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(2)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.SEE_INVISIBLE)
      expect(result.player.statusEffects.map((e) => e.type)).toContain(StatusEffectType.LEVITATING)
    })

    test('replaces existing LEVITATING effect (does not stack with itself)', () => {
      let player = createTestPlayer()
      // Player already levitating for 5 turns
      player = statusEffectService.addStatusEffect(player, StatusEffectType.LEVITATING, 5)

      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([32]) // New duration: 32

      const result = service.applyPotion(player, potion, state)

      expect(result.player.statusEffects).toHaveLength(1)
      expect(result.player.statusEffects[0].type).toBe(StatusEffectType.LEVITATING)
      expect(result.player.statusEffects[0].duration).toBe(32) // Refreshed to new duration
    })

    test('does not modify game state (no state field in result)', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      expect(result.state).toBeUndefined()
    })

    test('status effect persists when integrated with StatusEffectService', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)
      mockRandom.setValues([30])

      const result = service.applyPotion(player, potion, state)

      // Verify status effect is active
      const hasEffect = statusEffectService.hasStatusEffect(
        result.player,
        StatusEffectType.LEVITATING
      )
      expect(hasEffect).toBe(true)
    })

    test('duration randomization uses correct range (29-32)', () => {
      const player = createTestPlayer()
      const potion = createLevitationPotion()
      const state = createTestState(player)

      // Test multiple random values to ensure they all fall within range
      const durations: number[] = []
      for (let i = 29; i <= 32; i++) {
        mockRandom.setValues([i])
        const result = service.applyPotion(player, potion, state)
        durations.push(result.player.statusEffects[0].duration)
      }

      // Verify all durations are within the correct range
      expect(durations.every((d) => d >= 29 && d <= 32)).toBe(true)
      expect(Math.min(...durations)).toBe(29)
      expect(Math.max(...durations)).toBe(32)
    })
  })
})
