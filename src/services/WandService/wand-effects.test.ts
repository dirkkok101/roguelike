import { WandService } from './WandService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import { CombatService } from '@services/CombatService'
import { LevelService } from '@services/LevelService'
import {
  Player,
  Wand,
  WandType,
  GameState,
  Monster,
  Level,
  StatusEffectType,
  Tile,
  TileType,
} from '@game/core/core'

// ============================================================================
// WAND SERVICE - Wand Effect Tests
// ============================================================================

describe('WandService - Wand Effects', () => {
  let wandService: WandService
  let identificationService: IdentificationService
  let mockRandom: MockRandom
  let combatService: CombatService
  let levelService: LevelService
  let player: Player
  let state: GameState
  let level: Level
  let targetMonster: Monster

  beforeEach(() => {
    mockRandom = new MockRandom()
    identificationService = new IdentificationService()
    combatService = new CombatService(mockRandom)
    levelService = new LevelService()
    wandService = new WandService(identificationService, mockRandom, combatService, levelService)

    // Create player
    player = {
      name: 'TestPlayer',
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 50,
      strength: 16,
      level: 5,
      xp: 0,
      gold: 0,
      armor: 3,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      statusEffects: [],
      hungerLevel: 500,
      maxHungerLevel: 2000,
    }

    // Create target monster
    targetMonster = {
      id: 'monster-1',
      char: 'O',
      name: 'Orc',
      position: { x: 6, y: 5 },
      hp: 20,
      maxHp: 20,
      attack: '1d8',
      defense: 4,
      xpValue: 10,
      speed: 10,
      behavior: 'SIMPLE',
      isAsleep: false,
      statusEffects: [],
      aiState: null,
    }

    // Create tiles
    const tiles: Tile[][] = Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#A89078',
            colorExplored: '#5A5A5A',
          }))
      )

    // Create level
    level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      monsters: [targetMonster],
      items: [],
      doors: [],
      rooms: [],
      corridors: [],
      upStairs: { x: 1, y: 1 },
      downStairs: { x: 9, y: 9 },
      visibleTiles: new Set(),
      exploredTiles: new Set(),
      traps: [],
    }

    // Create game state
    state = {
      player,
      levels: new Map([[1, level]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
      identifiedItems: new Map(),
      leaderboard: [],
      seed: 'test-seed',
    }
  })

  // ==========================================================================
  // SLEEP Wand Tests
  // ==========================================================================

  describe('SLEEP Wand', () => {
    test('applies SLEEPING status effect to target', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Sleep',
        type: 7, // ItemType.WAND
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLEEP,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'oak',
        damage: '0d0', // Sleep doesn't deal damage
      }

      // Mock random for duration: nextInt(3, 6)
      mockRandom.setValues([4]) // Duration = 4 turns

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4) // Decremented
      expect(result.message).toContain('falls asleep')

      // Check monster in updated state
      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)
      expect(updatedMonster?.isAsleep).toBe(true)
      expect(updatedMonster?.statusEffects).toHaveLength(1)
      expect(updatedMonster?.statusEffects[0].type).toBe(StatusEffectType.SLEEPING)
      expect(updatedMonster?.statusEffects[0].duration).toBe(4)
    })

    test('uses charge even when applied to sleeping monster', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Sleep',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLEEP,
        currentCharges: 3,
        maxCharges: 10,
        materialName: 'oak',
        damage: '0d0',
      }

      mockRandom.setValues([3])

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(2) // Decremented
    })
  })

  // ==========================================================================
  // SLOW_MONSTER Wand Tests
  // ==========================================================================

  describe('SLOW_MONSTER Wand', () => {
    test('reduces monster speed by 50%', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-2',
        name: 'Wand of Slow Monster',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLOW_MONSTER,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'maple',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('slows down')

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)
      expect(updatedMonster?.speed).toBe(5) // 10 * 0.5 = 5
    })

    test('minimum speed is 1', () => {
      // Arrange
      targetMonster.speed = 1 // Already at minimum

      const wand: Wand = {
        id: 'wand-2',
        name: 'Wand of Slow Monster',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLOW_MONSTER,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'maple',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)
      expect(updatedMonster?.speed).toBe(1) // Cannot go below 1
    })
  })

  // ==========================================================================
  // HASTE_MONSTER Wand Tests
  // ==========================================================================

  describe('HASTE_MONSTER Wand', () => {
    test('doubles monster speed', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-3',
        name: 'Wand of Haste Monster',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.HASTE_MONSTER,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'ash',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('speeds up')
      expect(result.message).toContain('Careful') // Warning message

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)
      expect(updatedMonster?.speed).toBe(20) // 10 * 2 = 20
    })

    test('can haste multiple times', () => {
      // Arrange
      targetMonster.speed = 20 // Already hasted once

      const wand: Wand = {
        id: 'wand-3',
        name: 'Wand of Haste Monster',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.HASTE_MONSTER,
        currentCharges: 3,
        maxCharges: 10,
        materialName: 'ash',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)
      expect(updatedMonster?.speed).toBe(40) // 20 * 2 = 40
    })
  })

  // ==========================================================================
  // TELEPORT_AWAY Wand Tests
  // ==========================================================================

  describe('TELEPORT_AWAY Wand', () => {
    test('teleports monster to random walkable location', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-4',
        name: 'Wand of Teleport Away',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.TELEPORT_AWAY,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'willow',
        damage: '0d0',
      }

      const originalPosition = { ...targetMonster.position }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('vanishes')

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)

      // Monster should have moved (very unlikely to be same position)
      const hasMoved =
        updatedMonster?.position.x !== originalPosition.x ||
        updatedMonster?.position.y !== originalPosition.y

      expect(hasMoved).toBe(true)
    })
  })

  // ==========================================================================
  // POLYMORPH Wand Tests
  // ==========================================================================

  describe('POLYMORPH Wand', () => {
    test('transforms monster (simplified implementation)', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-5',
        name: 'Wand of Polymorph',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.POLYMORPH,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'cedar',
        damage: '0d0',
      }

      const originalHp = targetMonster.hp
      targetMonster.hp = 10 // Damage it first

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('transforms')

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)

      // HP should be reset to maxHp
      expect(updatedMonster?.hp).toBe(updatedMonster?.maxHp)

      // Name should change (simplified implementation adds "Polymorphed")
      expect(updatedMonster?.name).toContain('Polymorphed')
    })
  })

  // ==========================================================================
  // CANCELLATION Wand Tests
  // ==========================================================================

  describe('CANCELLATION Wand', () => {
    test('removes all status effects and resets speed', () => {
      // Arrange
      targetMonster.speed = 20 // Hasted
      targetMonster.isAsleep = true
      targetMonster.statusEffects = [
        { type: StatusEffectType.SLEEPING, duration: 5 },
        { type: StatusEffectType.CONFUSED, duration: 3 },
      ]

      const wand: Wand = {
        id: 'wand-6',
        name: 'Wand of Cancellation',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.CANCELLATION,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'pine',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('cancelled')

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)

      expect(updatedMonster?.statusEffects).toHaveLength(0)
      expect(updatedMonster?.isAsleep).toBe(false)
      expect(updatedMonster?.speed).toBe(10) // Reset to normal
    })

    test('works on monster with no status effects', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-6',
        name: 'Wand of Cancellation',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.CANCELLATION,
        currentCharges: 3,
        maxCharges: 10,
        materialName: 'pine',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(2)
      expect(result.message).toContain('cancelled')

      const updatedLevel = result.state?.levels.get(1)
      const updatedMonster = updatedLevel?.monsters.find(m => m.id === targetMonster.id)

      expect(updatedMonster?.statusEffects).toHaveLength(0)
      expect(updatedMonster?.speed).toBe(10)
    })
  })

  // ==========================================================================
  // Wand Charge Management Tests
  // ==========================================================================

  describe('Wand Charge Management', () => {
    test('wand with 0 charges cannot be used', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-empty',
        name: 'Wand of Sleep',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLEEP,
        currentCharges: 0,
        maxCharges: 10,
        materialName: 'oak',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.message).toBe('The wand has no charges.')
      expect(result.wand.currentCharges).toBe(0) // Unchanged
      expect(result.state).toBeUndefined() // No state change
    })

    test('each use decrements charge by 1', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-charges',
        name: 'Wand of Slow Monster',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLOW_MONSTER,
        currentCharges: 7,
        maxCharges: 10,
        materialName: 'maple',
        damage: '0d0',
      }

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.wand.currentCharges).toBe(6)
    })
  })

  // ==========================================================================
  // Wand Identification Tests
  // ==========================================================================

  describe('Wand Identification', () => {
    test('using an unidentified wand identifies it', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-unknown',
        name: 'Wand of Sleep',
        type: 7,
        identified: false,
        position: { x: 5, y: 5 },
        wandType: WandType.SLEEP,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'oak',
        damage: '0d0',
      }

      mockRandom.setValues([4])

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.identified).toBe(true)
    })

    test('using an already identified wand does not re-identify', () => {
      // Arrange
      const wand: Wand = {
        id: 'wand-known',
        name: 'Wand of Sleep',
        type: 7,
        identified: true,
        position: { x: 5, y: 5 },
        wandType: WandType.SLEEP,
        currentCharges: 5,
        maxCharges: 10,
        materialName: 'oak',
        damage: '0d0',
      }

      // Mark as already identified
      state.identifiedItems.set(WandType.SLEEP, true)

      mockRandom.setValues([4])

      // Act
      const result = wandService.applyWand(player, wand, state, targetMonster.id)

      // Assert
      expect(result.identified).toBe(false) // Not newly identified
    })
  })
})
