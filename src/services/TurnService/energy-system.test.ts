import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { Player, GameState, Equipment, StatusEffectType } from '@game/core/core'
import { ENERGY_THRESHOLD, NORMAL_SPEED, HASTED_SPEED, SLOWED_SPEED } from '../../constants/energy'

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
    energy: 100, // Start with full energy
    isRunning: false,
    runState: null,
  }
}

function createTestState(player: Player): GameState {
  return {
    player,
    currentLevel: 1,
    levels: new Map(),
    visibleCells: new Set(),
    messages: [],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'test-game',
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap: {
      potions: new Map(),
      scrolls: new Map(),
      rings: new Map(),
      wands: new Map(),
    },
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('TurnService - Energy System', () => {
  let statusEffectService: StatusEffectService
  let service: TurnService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    service = new TurnService(statusEffectService, levelService)
  })

  describe('grantEnergy', () => {
    test('grants normal speed energy (10) to actor', () => {
      const actor = { energy: 50 }

      const result = service.grantEnergy(actor, NORMAL_SPEED)

      expect(result.energy).toBe(60) // 50 + 10
    })

    test('grants hasted speed energy (20) to actor', () => {
      const actor = { energy: 50 }

      const result = service.grantEnergy(actor, HASTED_SPEED)

      expect(result.energy).toBe(70) // 50 + 20
    })

    test('grants slowed speed energy (5) to actor', () => {
      const actor = { energy: 50 }

      const result = service.grantEnergy(actor, SLOWED_SPEED)

      expect(result.energy).toBe(55) // 50 + 5
    })

    test('does not mutate original actor (immutable)', () => {
      const actor = { energy: 50 }

      service.grantEnergy(actor, NORMAL_SPEED)

      expect(actor.energy).toBe(50) // Original unchanged
    })
  })

  describe('canAct', () => {
    test('returns true when energy >= ENERGY_THRESHOLD (100)', () => {
      const actor1 = { energy: 100 }
      const actor2 = { energy: 150 }

      expect(service.canAct(actor1)).toBe(true)
      expect(service.canAct(actor2)).toBe(true)
    })

    test('returns false when energy < ENERGY_THRESHOLD (100)', () => {
      const actor1 = { energy: 99 }
      const actor2 = { energy: 50 }
      const actor3 = { energy: 0 }

      expect(service.canAct(actor1)).toBe(false)
      expect(service.canAct(actor2)).toBe(false)
      expect(service.canAct(actor3)).toBe(false)
    })
  })

  describe('consumeEnergy', () => {
    test('subtracts ENERGY_THRESHOLD (100) from actor energy', () => {
      const actor = { energy: 150 }

      const result = service.consumeEnergy(actor)

      expect(result.energy).toBe(50) // 150 - 100
    })

    test('allows energy carryover (150 energy → consume → 50 remains)', () => {
      const actor = { energy: 150 }

      const result = service.consumeEnergy(actor)

      expect(result.energy).toBe(50)
      expect(service.canAct(result)).toBe(false) // 50 < 100
    })

    test('can result in negative energy if actor had < 100', () => {
      const actor = { energy: 50 }

      const result = service.consumeEnergy(actor)

      expect(result.energy).toBe(-50) // 50 - 100
    })

    test('does not mutate original actor (immutable)', () => {
      const actor = { energy: 150 }

      service.consumeEnergy(actor)

      expect(actor.energy).toBe(150) // Original unchanged
    })
  })

  describe('getPlayerSpeed', () => {
    test('returns HASTED_SPEED (20) when player has HASTED status', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)

      const speed = service.getPlayerSpeed(player)

      expect(speed).toBe(HASTED_SPEED) // 20
    })

    test('returns NORMAL_SPEED (10) when player has no HASTED status', () => {
      const player = createTestPlayer()

      const speed = service.getPlayerSpeed(player)

      expect(speed).toBe(NORMAL_SPEED) // 10
    })

    test('returns NORMAL_SPEED (10) when player has other status effects but not HASTED', () => {
      let player = createTestPlayer()
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const speed = service.getPlayerSpeed(player)

      expect(speed).toBe(NORMAL_SPEED) // 10
    })
  })

  describe('grantPlayerEnergy', () => {
    test('grants correct amount for normal player (speed 10)', () => {
      const player = createTestPlayer()
      player.energy = 50
      const state = createTestState(player)

      const result = service.grantPlayerEnergy(state)

      expect(result.player.energy).toBe(60) // 50 + 10
    })

    test('grants correct amount for hasted player (speed 20)', () => {
      let player = createTestPlayer()
      player.energy = 50
      player = statusEffectService.addStatusEffect(player, StatusEffectType.HASTED, 5)
      const state = createTestState(player)

      const result = service.grantPlayerEnergy(state)

      expect(result.player.energy).toBe(70) // 50 + 20
    })

    test('does not mutate original state (immutable)', () => {
      const player = createTestPlayer()
      player.energy = 50
      const state = createTestState(player)

      service.grantPlayerEnergy(state)

      expect(state.player.energy).toBe(50) // Original unchanged
    })
  })

  describe('canPlayerAct', () => {
    test('returns true when player energy >= 100', () => {
      const player = createTestPlayer()
      player.energy = 100

      expect(service.canPlayerAct(player)).toBe(true)
    })

    test('returns false when player energy < 100', () => {
      const player = createTestPlayer()
      player.energy = 99

      expect(service.canPlayerAct(player)).toBe(false)
    })
  })

  describe('consumePlayerEnergy', () => {
    test('consumes ENERGY_THRESHOLD from player', () => {
      const player = createTestPlayer()
      player.energy = 150

      const result = service.consumePlayerEnergy(player)

      expect(result.energy).toBe(50) // 150 - 100
    })

    test('does not mutate original player (immutable)', () => {
      const player = createTestPlayer()
      player.energy = 150

      service.consumePlayerEnergy(player)

      expect(player.energy).toBe(150) // Original unchanged
    })
  })
})
