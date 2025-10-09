import {
  GameState,
  Level,
  Monster,
  Wand,
  WandType,
  ItemType,
  MonsterBehavior,
  MonsterState,
  TileType,
  Position,
} from '@game/core/core'
import { ZapWandCommand } from '@commands/ZapWandCommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { TargetingService } from '@services/TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { IdentificationService } from '@services/IdentificationService'
import { CombatService } from '@services/CombatService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'

// ============================================================================
// TARGETING SYSTEM INTEGRATION TESTS
// ============================================================================

describe('Targeting System Integration', () => {
  let inventoryService: InventoryService
  let wandService: WandService
  let messageService: MessageService
  let turnService: TurnService
  let targetingService: TargetingService
  let fovService: FOVService
  let movementService: MovementService
  let identificationService: IdentificationService
  let mockRandom: MockRandom
  let statusEffectService: StatusEffectService
  let levelService: LevelService

  beforeEach(() => {
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    inventoryService = new InventoryService()
    messageService = new MessageService()
    levelService = new LevelService()
    fovService = new FOVService(statusEffectService)
    movementService = new MovementService(mockRandom, statusEffectService)
    identificationService = new IdentificationService(mockRandom)
    targetingService = new TargetingService(fovService, movementService)
    const combatService = new CombatService(mockRandom, null as any, null as any)
    wandService = new WandService(identificationService, mockRandom, combatService, targetingService)
    turnService = new TurnService(statusEffectService, levelService)
  })

  // Helper to create test level
  function createTestLevel(): Level {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#888',
          }))
      )

    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  // Helper to create test monster
  function createTestMonster(id: string, position: Position): Monster {
    return {
      id,
      letter: 'O',
      name: 'Orc',
      position,
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      level: 2,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0.0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.IDLE,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    }
  }

  // Helper to create test wand
  function createTestWand(id: string, wandType: WandType, range: number): Wand {
    return {
      id,
      name: `Wand of ${wandType}`,
      type: ItemType.WAND,
      identified: true,
      position: { x: 0, y: 0 },
      wandType,
      damage: '2d6',
      charges: 5,
      currentCharges: 5,
      woodName: 'oak',
      range,
    }
  }

  // ============================================================================
  // SUCCESSFUL TARGETING FLOW
  // ============================================================================

  describe('Successful Targeting Flow', () => {
    it('should execute wand zap with valid target in range and LOS', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monsterPos: Position = { x: 8, y: 5 } // 3 tiles away (in range)
      const monster = createTestMonster('monster-1', monsterPos)
      level.monsters.push(monster)

      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 7)
      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      // Compute FOV (wand target must be visible)
      const visibleCells = fovService.computeFOV(playerPos, 3, level)

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act: Execute ZapWandCommand with target
      // Setup MockRandom values for damage roll (2d6 = 2 dice)
      mockRandom.setValues([3, 4]) // Two d6 rolls

      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const result = command.execute(state)

      // Assert: Command should succeed
      expect(result.player.inventory).toHaveLength(1) // Wand still in inventory
      const updatedWand = result.player.inventory[0] as Wand
      expect(updatedWand.currentCharges).toBe(4) // Charge consumed
      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.itemsUsed).toBe(1) // Wand use tracked
    })

    it('should allow targeting monster at exact maximum range', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monsterPos: Position = { x: 10, y: 5 } // Exactly 5 tiles away
      const monster = createTestMonster('monster-1', monsterPos)
      level.monsters.push(monster)

      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 5) // Range 5
      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 10, level)

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act
      // Setup MockRandom values for damage roll
      mockRandom.setValues([3, 4])

      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const result = command.execute(state)

      // Assert: Should succeed (target at exact max range)
      const updatedWand = result.player.inventory[0] as Wand
      expect(updatedWand.currentCharges).toBe(4)
    })
  })

  // ============================================================================
  // RANGE VALIDATION
  // ============================================================================

  describe('Range Validation', () => {
    it('should reject target out of range', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monsterPos: Position = { x: 15, y: 5 } // 10 tiles away
      const monster = createTestMonster('monster-1', monsterPos)
      level.monsters.push(monster)

      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 7) // Range 7
      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 15, level)

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act
      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const result = command.execute(state)

      // Assert: Should fail with range error
      expect(result.player.inventory[0]).toEqual(wand) // Wand unchanged
      expect((result.player.inventory[0] as Wand).currentCharges).toBe(5) // No charge consumed
      expect(result.messages.some((m) => m.text.includes('out of range'))).toBe(true)
    })

    it('should use wand range property for validation', () => {
      // Arrange: Create two wands with different ranges
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monsterPos: Position = { x: 11, y: 5 } // 6 tiles away
      const monster = createTestMonster('monster-1', monsterPos)
      level.monsters.push(monster)

      const shortWand = createTestWand('wand-1', WandType.POLYMORPH, 5) // Range 5
      const longWand = createTestWand('wand-2', WandType.LIGHTNING, 8) // Range 8

      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [shortWand, longWand],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 15, level)

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act: Try short wand (should fail)
      const shortCommand = new ZapWandCommand(
        shortWand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const shortResult = shortCommand.execute(state)

      // Assert: Short wand fails
      expect((shortResult.player.inventory[0] as Wand).currentCharges).toBe(5)
      expect(shortResult.messages.some((m) => m.text.includes('Range: 5'))).toBe(true)

      // Act: Try long wand (should succeed)
      // Setup MockRandom values for damage roll (6d6 = 6 dice for LIGHTNING)
      mockRandom.setValues([3, 4, 5, 2, 6, 4])

      const longCommand = new ZapWandCommand(
        longWand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const longResult = longCommand.execute(state)

      // Assert: Long wand succeeds
      expect((longResult.player.inventory[1] as Wand).currentCharges).toBe(4)
    })
  })

  // ============================================================================
  // LOS/FOV VALIDATION
  // ============================================================================

  describe('Line of Sight Validation', () => {
    it('should reject target not in FOV', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monsterPos: Position = { x: 8, y: 5 } // Close but not in FOV
      const monster = createTestMonster('monster-1', monsterPos)
      level.monsters.push(monster)

      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 7)
      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      // Create FOV that does NOT include monster
      const visibleCells = new Set<string>()
      visibleCells.add('5,5') // Only player position

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act
      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        monster.id
      )
      const result = command.execute(state)

      // Assert: Should fail with visibility error
      expect((result.player.inventory[0] as Wand).currentCharges).toBe(5)
      expect(result.messages.some((m) => m.text.includes('no longer visible'))).toBe(true)
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should reject if no target ID provided', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 7)

      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells: new Set(),
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act: Execute without target ID
      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        undefined // No target
      )
      const result = command.execute(state)

      // Assert: Should fail
      expect((result.player.inventory[0] as Wand).currentCharges).toBe(5)
      expect(result.messages.some((m) => m.text.includes('No target'))).toBe(true)
    })

    it('should reject if target monster does not exist', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const wand = createTestWand('wand-1', WandType.MAGIC_MISSILE, 7)

      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [wand],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 5, level)

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map([[1, level]]),
        visibleCells,
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test',
        characterName: 'Test',
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
        debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
        monstersKilled: 0,
        itemsFound: 0,
        itemsUsed: 0,
        levelsExplored: 1,
      }

      // Act: Target non-existent monster
      const command = new ZapWandCommand(
        wand.id,
        inventoryService,
        wandService,
        messageService,
        turnService,
        statusEffectService,
        targetingService,
        'nonexistent-monster'
      )
      const result = command.execute(state)

      // Assert: Should fail
      expect((result.player.inventory[0] as Wand).currentCharges).toBe(5)
      expect(result.messages.some((m) => m.text.includes('no longer exists'))).toBe(true)
    })
  })

  // ============================================================================
  // TARGETING SERVICE INTEGRATION
  // ============================================================================

  describe('TargetingService Integration', () => {
    it('should find valid targets using TargetingService', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }

      // Place monsters at various distances
      const nearMonster = createTestMonster('near', { x: 7, y: 5 }) // 2 away
      const midMonster = createTestMonster('mid', { x: 10, y: 5 }) // 5 away
      const farMonster = createTestMonster('far', { x: 14, y: 5 }) // 9 away

      level.monsters.push(nearMonster, midMonster, farMonster)

      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 10, level)

      // Act: Get visible monsters
      const visibleMonsters = targetingService.getVisibleMonsters(player, level, visibleCells)

      // Assert: Should find all monsters in FOV, sorted by distance
      expect(visibleMonsters.length).toBe(3)
      expect(visibleMonsters[0].id).toBe('near')
      expect(visibleMonsters[1].id).toBe('mid')
      expect(visibleMonsters[2].id).toBe('far')
    })

    it('should validate monster targets correctly', () => {
      // Arrange
      const level = createTestLevel()
      const playerPos: Position = { x: 5, y: 5 }
      const monster = createTestMonster('monster-1', { x: 8, y: 5 }) // 3 away
      level.monsters.push(monster)

      const player = {
        position: playerPos,
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 100,
      }

      const visibleCells = fovService.computeFOV(playerPos, 5, level)

      // Act: Validate target
      const validation = targetingService.isValidMonsterTarget(
        monster,
        player,
        level,
        7, // maxRange
        true, // requiresLOS
        visibleCells
      )

      // Assert: Should be valid
      expect(validation.isValid).toBe(true)
      expect(validation.reason).toBeUndefined()
    })
  })
})
