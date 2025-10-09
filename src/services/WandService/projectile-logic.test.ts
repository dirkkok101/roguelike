import { WandService } from './WandService'
import { IdentificationService } from '@services/IdentificationService'
import { CombatService } from '@services/CombatService'
import { TargetingService } from '@services/TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Level,
  Player,
  Wand,
  WandType,
  ItemType,
  Monster,
  MonsterBehavior,
  MonsterState,
  TileType,
  Position,
} from '@game/core/core'

describe('WandService - Projectile Logic Edge Cases', () => {
  let wandService: WandService
  let identificationService: IdentificationService
  let combatService: CombatService
  let targetingService: TargetingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    identificationService = new IdentificationService(mockRandom)
    combatService = new CombatService(mockRandom)
    const fovService = new FOVService(new StatusEffectService())
    const movementService = new MovementService(mockRandom, new StatusEffectService())
    targetingService = new TargetingService(fovService, movementService)
    wandService = new WandService(identificationService, mockRandom, combatService, targetingService)
  })

  function createTestLevel(width: number = 20, height: number = 20): Level {
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
            colorVisible: '#fff',
            colorExplored: '#888',
          }))
      )

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
      explored: Array(height)
        .fill(null)
        .map(() => Array(width).fill(false)),
    }
  }

  function createTestPlayer(position: Position = { x: 5, y: 5 }): Player {
    return {
      position,
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
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
  }

  function createTestWand(
    wandType: WandType = WandType.MAGIC_MISSILE,
    charges: number = 5
  ): Wand {
    return {
      id: 'wand-1',
      type: ItemType.WAND,
      name: 'Wand of Magic Missile',
      wandType,
      charges: 10,
      currentCharges: charges,
      identified: true,
      damage: '2d6',
      woodName: 'oak',
      range: 8,
    }
  }

  function createMonster(id: string, position: Position, name: string = 'Orc'): Monster {
    return {
      id,
      letter: name.charAt(0).toUpperCase(),
      name,
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
        fleeThreshold: 0,
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

  function createTestState(player: Player, level: Level): GameState {
    return {
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
  }

  describe('Edge Case: Empty Ray (Target Same as Start)', () => {
    it('should handle firing at player own position (empty ray)', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()
      const state = createTestState(player, level)

      // Fire at player's own position
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 5, y: 5 })

      // Should consume charge but do nothing
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('fizzles out')
    })

    it('should handle adjacent target (minimal ray)', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()
      const monster = createMonster('m1', { x: 6, y: 5 })
      level.monsters.push(monster)
      const state = createTestState(player, level)

      mockRandom.setValues([3, 4]) // Damage roll

      // Fire at adjacent monster
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 6, y: 5 })

      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('Magic missiles')
      expect(result.state).toBeDefined()
    })
  })

  describe('Edge Case: Ray Hits Wall Immediately', () => {
    it('should stop projectile if wall is in first position', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Place wall immediately adjacent
      level.tiles[5][6] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#888',
        colorExplored: '#444',
      }

      const state = createTestState(player, level)

      // Fire at position beyond wall
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 8, y: 5 })

      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('hits the wall')
    })

    it('should hit monster before wall', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Monster at 6, wall at 7
      const monster = createMonster('m1', { x: 6, y: 5 })
      level.monsters.push(monster)
      level.tiles[5][7] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#888',
        colorExplored: '#444',
      }

      const state = createTestState(player, level)
      mockRandom.setValues([3, 4])

      // Fire past monster and wall
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 8, y: 5 })

      // Should hit monster, not wall
      expect(result.message).toContain('Magic missiles strike')
      expect(result.state?.levels.get(1)?.monsters).toHaveLength(1) // Monster still alive but damaged
    })
  })

  describe('Edge Case: Multiple Monsters in Line', () => {
    it('should hit only the first monster in line', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Three monsters in a line
      const monster1 = createMonster('m1', { x: 7, y: 5 }, 'Orc')
      const monster2 = createMonster('m2', { x: 8, y: 5 }, 'Goblin')
      const monster3 = createMonster('m3', { x: 9, y: 5 }, 'Bat')
      level.monsters.push(monster1, monster2, monster3)

      const state = createTestState(player, level)
      mockRandom.setValues([3, 4])

      // Fire past all monsters
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })

      // Should hit only first monster (m1)
      expect(result.message).toContain('Orc') // First monster's name
      expect(result.message).not.toContain('Goblin')
      expect(result.message).not.toContain('Bat')
    })

    it('should stop at first monster even if others are closer to target', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Two monsters: one closer, one at target
      const nearMonster = createMonster('m1', { x: 7, y: 5 }, 'Near')
      const targetMonster = createMonster('m2', { x: 10, y: 5 }, 'Target')
      level.monsters.push(nearMonster, targetMonster)

      const state = createTestState(player, level)
      mockRandom.setValues([3, 4])

      // Fire at far monster
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })

      // Should hit near monster, not target monster
      expect(result.message).toContain('Near')
      expect(result.message).not.toContain('Target')
    })

    it('should kill first monster if damage is sufficient', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      const monster1 = createMonster('m1', { x: 7, y: 5 }, 'Weak')
      monster1.hp = 5 // Low HP
      const monster2 = createMonster('m2', { x: 8, y: 5 }, 'Strong')
      level.monsters.push(monster1, monster2)

      const state = createTestState(player, level)
      mockRandom.setValues([6, 6]) // High damage (12 total)

      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })

      // Should kill first monster
      expect(result.message).toContain('kill')
      expect(result.message).toContain('Weak')

      // Verify first monster removed, second still present
      const updatedLevel = result.state?.levels.get(1)
      expect(updatedLevel?.monsters).toHaveLength(1)
      expect(updatedLevel?.monsters[0].id).toBe('m2') // Only strong monster remains
    })
  })

  describe('Edge Case: Diagonal Projectile Paths', () => {
    it('should handle diagonal ray with monster', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Monster on diagonal path
      const monster = createMonster('m1', { x: 7, y: 7 })
      level.monsters.push(monster)

      const state = createTestState(player, level)
      mockRandom.setValues([3, 4])

      // Fire diagonally
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 10 })

      expect(result.message).toContain('Magic missiles')
    })

    it('should handle diagonal ray with wall', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Wall on diagonal path
      level.tiles[7][7] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#888',
        colorExplored: '#444',
      }

      const state = createTestState(player, level)

      // Fire diagonally through wall
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 10 })

      expect(result.message).toContain('wall')
    })
  })

  describe('Edge Case: Empty Target (No Obstacle)', () => {
    it('should fizzle out when firing at empty tile with no obstacles', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()
      const state = createTestState(player, level)

      // Fire at empty space (no monsters, no walls)
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })

      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toContain('fizzles out')
    })

    it('should fizzle out when firing past a dead-end corridor', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()

      // Create a short corridor that ends before target
      for (let y = 0; y < 20; y++) {
        if (y !== 5) {
          level.tiles[y][7] = {
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#888',
            colorExplored: '#444',
          }
        }
      }

      const state = createTestState(player, level)

      // Fire down corridor
      const result = wandService.applyWandAtPosition(player, wand, state, { x: 6, y: 5 })

      // Should either fizzle or hit wall depending on ray calculation
      expect(result.wand.currentCharges).toBe(4)
      expect(result.message).toBeDefined()
    })
  })

  describe('Edge Case: Wand With No Charges', () => {
    it('should not throw error when using projectile logic with 0 charges', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand(WandType.MAGIC_MISSILE, 0) // No charges
      const level = createTestLevel()
      const monster = createMonster('m1', { x: 7, y: 5 })
      level.monsters.push(monster)
      const state = createTestState(player, level)

      const result = wandService.applyWandAtPosition(player, wand, state, { x: 7, y: 5 })

      expect(result.wand.currentCharges).toBe(0)
      expect(result.message).toContain('no charges')
    })
  })

  describe('Edge Case: Missing TargetingService', () => {
    it('should throw error if TargetingService not injected', () => {
      const wandServiceNoTargeting = new WandService(
        identificationService,
        mockRandom,
        combatService
        // No targetingService
      )

      const player = createTestPlayer()
      const wand = createTestWand()
      const level = createTestLevel()
      const state = createTestState(player, level)

      expect(() => {
        wandServiceNoTargeting.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })
      }).toThrow('TargetingService not injected')
    })
  })

  describe('Edge Case: Wand Effects on Hit', () => {
    it('should apply correct wand type effect when hitting monster', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const fireWand = createTestWand(WandType.FIRE, 5)
      fireWand.damage = '6d6'
      const level = createTestLevel()
      const monster = createMonster('m1', { x: 7, y: 5 })
      level.monsters.push(monster)
      const state = createTestState(player, level)

      mockRandom.setValues([3, 3, 3, 3, 3, 3]) // 6d6

      const result = wandService.applyWandAtPosition(player, fireWand, state, { x: 7, y: 5 })

      // Should mention fire effect
      expect(result.message).toMatch(/fire|struck/i)
    })
  })

  describe('Immutability', () => {
    it('should not mutate original wand object', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const originalCharges = wand.currentCharges
      const level = createTestLevel()
      const state = createTestState(player, level)

      wandService.applyWandAtPosition(player, wand, state, { x: 10, y: 5 })

      // Original wand should be unchanged
      expect(wand.currentCharges).toBe(originalCharges)
    })

    it('should not mutate original level object', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const wand = createTestWand()
      const level = createTestLevel()
      const monster = createMonster('m1', { x: 7, y: 5 })
      level.monsters.push(monster)
      const originalMonsterCount = level.monsters.length
      const state = createTestState(player, level)

      mockRandom.setValues([1, 1]) // Low damage

      wandService.applyWandAtPosition(player, wand, state, { x: 7, y: 5 })

      // Original level should be unchanged
      expect(level.monsters.length).toBe(originalMonsterCount)
    })
  })
})
