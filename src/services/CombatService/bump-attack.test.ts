import { CombatService } from './CombatService'
import { MockRandom } from '@services/RandomService'
import { MessageService } from '@services/MessageService'
import {
  GameState,
  Level,
  Monster,
  TileType,
  MonsterBehavior,
  MonsterState,
} from '@game/core/core'

describe('CombatService - Bump-to-Attack', () => {
  let combatService: CombatService
  let mockRandom: MockRandom
  let messageService: MessageService

  beforeEach(() => {
    mockRandom = new MockRandom()
    messageService = new MessageService()
    combatService = new CombatService(mockRandom, undefined, undefined, messageService)
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
            }))
        ),
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 30,
        maxHp: 30,
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
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
    }
  }

  function createTestMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      id: 'test-monster',
      letter: 'O',
      name: 'Orc',
      position: { x: 6, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      ...overrides,
    }
  }

  describe('hit and kill', () => {
    test('removes monster from level on kill', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      // Roll hit: 15 + (1 - 6) = 10 (exactly 10, so hits)
      // Damage: 3 (unarmed 1d4)
      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels.get(1)!.monsters).toHaveLength(0)
    })

    test('awards XP to player on kill', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1, xpValue: 25 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.player.xp).toBe(25)
    })

    test('adds hit and killed messages', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].text).toBe('You hit the Orc for 3 damage!')
      expect(result.messages[0].type).toBe('combat')
      expect(result.messages[1].text).toBe('You killed the Orc!')
      expect(result.messages[1].type).toBe('success')
    })

    test('increments turn count on kill', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 5)

      expect(result.turnCount).toBe(6)
    })

    test('does not mutate original state on kill', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      const originalXP = state.player.xp
      const originalMonsterCount = level.monsters.length

      mockRandom.setValues([15, 3])

      combatService.executeBumpAttack(state, monster, 0)

      expect(state.player.xp).toBe(originalXP)
      expect(state.levels.get(1)!.monsters).toHaveLength(originalMonsterCount)
    })
  })

  describe('hit and wound', () => {
    test('updates monster HP when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      // Hit for 3 damage
      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      const updatedMonster = result.levels.get(1)!.monsters[0]
      expect(updatedMonster.hp).toBe(7)
    })

    test('keeps monster in level when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels.get(1)!.monsters).toHaveLength(1)
    })

    test('adds hit message when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You hit the Orc for 3 damage!')
      expect(result.messages[0].type).toBe('combat')
    })

    test('increments turn count when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 3)

      expect(result.turnCount).toBe(4)
    })

    test('does not award XP when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.player.xp).toBe(0)
    })

    test('does not mutate original state when wounded', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      const originalHP = monster.hp

      mockRandom.setValues([15, 3])

      combatService.executeBumpAttack(state, monster, 0)

      expect(monster.hp).toBe(originalHP)
    })

    test('updates correct monster when multiple monsters exist', () => {
      const state = createTestState()
      const monster1 = createTestMonster({ id: 'monster-1', hp: 10 })
      const monster2 = createTestMonster({ id: 'monster-2', hp: 8, name: 'Goblin' })
      const level = state.levels.get(1)!
      level.monsters = [monster1, monster2]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster1, 0)

      const monsters = result.levels.get(1)!.monsters
      expect(monsters[0].hp).toBe(7) // monster1 damaged
      expect(monsters[1].hp).toBe(8) // monster2 unchanged
    })
  })

  describe('miss', () => {
    test('adds miss message', () => {
      const state = createTestState()
      const monster = createTestMonster({ ac: 20 }) // High AC to force miss
      const level = state.levels.get(1)!
      level.monsters = [monster]

      // Roll miss: 1 + (17 - 20) = -2 (less than 10, miss)
      mockRandom.setValues([1])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You miss the Orc.')
      expect(result.messages[0].type).toBe('combat')
    })

    test('does not damage monster on miss', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 10, ac: 20 }) // High AC to force miss
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([1])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels.get(1)!.monsters[0].hp).toBe(10)
    })

    test('does not remove monster on miss', () => {
      const state = createTestState()
      const monster = createTestMonster({ ac: 20 }) // High AC to force miss
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([1])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels.get(1)!.monsters).toHaveLength(1)
    })

    test('does not award XP on miss', () => {
      const state = createTestState()
      const monster = createTestMonster({ ac: 20 }) // High AC to force miss
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([1])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.player.xp).toBe(0)
    })

    test('increments turn count on miss', () => {
      const state = createTestState()
      const monster = createTestMonster({ ac: 20 }) // High AC to force miss
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([1])

      const result = combatService.executeBumpAttack(state, monster, 7)

      expect(result.turnCount).toBe(8)
    })
  })

  describe('monster name handling', () => {
    test('uses correct monster name in messages', () => {
      const state = createTestState()
      const monster = createTestMonster({ name: 'Dragon', hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.messages[0].text).toContain('Dragon')
      expect(result.messages[1].text).toContain('Dragon')
    })
  })

  describe('state updates', () => {
    test('preserves other state fields on kill', () => {
      const state = createTestState()
      state.player.gold = 100
      state.currentLevel = 3
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.player.gold).toBe(100)
      expect(result.currentLevel).toBe(3)
    })

    test('updates levels Map correctly', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels).toBeInstanceOf(Map)
      expect(result.levels.size).toBe(1)
      expect(result.levels.get(1)).toBeDefined()
    })

    test('does not modify original levels Map', () => {
      const state = createTestState()
      const monster = createTestMonster({ hp: 1 })
      const level = state.levels.get(1)!
      level.monsters = [monster]

      const originalLevels = state.levels

      mockRandom.setValues([15, 3])

      const result = combatService.executeBumpAttack(state, monster, 0)

      expect(result.levels).not.toBe(originalLevels)
    })
  })
})
