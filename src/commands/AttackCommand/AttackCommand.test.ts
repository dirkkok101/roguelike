import { AttackCommand } from './AttackCommand'
import { CombatService } from '@services/CombatService'
import { MessageService } from '@services/MessageService'
import { LevelingService } from '@services/LevelingService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, Monster, MonsterBehavior } from '@game/core/core'

describe('AttackCommand', () => {
  let combatService: CombatService
  let messageService: MessageService
  let levelingService: LevelingService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    messageService = new MessageService()
    combatService = new CombatService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    statusEffectService = new StatusEffectService()
    turnService = new TurnService(statusEffectService)
  })

  function createTestPlayer(): Player {
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
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
    }
  }

  function createTestMonster(hp: number = 10): Monster {
    return {
      id: 'test-monster',
      letter: 'T',
      name: 'Test Monster',
      position: { x: 6, y: 5 },
      hp,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }
  }

  function createTestState(player: Player, monsters: Monster[]): GameState {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      player,
      levels: new Map([
        [
          1,
          {
            depth: 1,
            width: 20,
            height: 20,
            tiles,
            rooms: [],
            monsters,
            items: [],
            gold: [],
            traps: [],
            doors: [],
            upStairs: null,
            downStairs: null,
          },
        ],
      ]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  describe('Successful attacks', () => {
    test('hits monster and deals damage', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 3]) // Hit roll, damage roll

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      const updatedMonster = result.levels.get(1)!.monsters[0]
      expect(updatedMonster.hp).toBeLessThan(10)
      expect(result.messages[0].text).toContain('You hit')
      expect(result.messages[0].text).toContain('damage')
      expect(result.messages[0].type).toBe('combat')
      expect(result.turnCount).toBe(1)
    })

    test('kills monster and removes it from level', () => {
      const player = createTestPlayer()
      const weakMonster = createTestMonster(1)
      const state = createTestState(player, [weakMonster])

      mockRandom.setValues([15, 5]) // Hit roll, high damage

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      const monsters = result.levels.get(1)!.monsters
      expect(monsters.length).toBe(0)
      expect(result.messages.some((m) => m.text.includes('killed'))).toBe(true)
      expect(result.turnCount).toBe(1)
    })

    test('awards XP when monster is killed', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(1)
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 5])

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result.player.xp).toBe(5)
    })

    test('displays killed message on death', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(1)
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 5])

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result.messages.some((m) => m.text === 'You killed the Test Monster!')).toBe(true)
      expect(result.messages.find((m) => m.text.includes('killed'))?.type).toBe('success')
    })
  })

  describe('Missed attacks', () => {
    test('misses and deals no damage', () => {
      const player = { ...createTestPlayer(), level: 1, strength: 0 }
      const monster = { ...createTestMonster(), ac: 0 }
      const state = createTestState(player, [monster])

      mockRandom.setValues([1, 3]) // Low roll = miss

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      const updatedMonster = result.levels.get(1)!.monsters[0]
      expect(updatedMonster.hp).toBe(10)
      expect(result.messages[0].text).toContain('You miss')
      expect(result.messages[0].type).toBe('combat')
      expect(result.turnCount).toBe(1)
    })
  })

  describe('Multiple monsters', () => {
    test('attacks only the specified monster', () => {
      const player = createTestPlayer()
      const monster1 = { ...createTestMonster(), id: 'monster-1' }
      const monster2 = { ...createTestMonster(), id: 'monster-2', hp: 8 }
      const state = createTestState(player, [monster1, monster2])

      mockRandom.setValues([15, 3])

      const command = new AttackCommand('monster-1', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      const monsters = result.levels.get(1)!.monsters
      expect(monsters[0].hp).toBeLessThan(10)
      expect(monsters[1].hp).toBe(8) // Unchanged
    })

    test('removes only killed monster', () => {
      const player = createTestPlayer()
      const weakMonster = { ...createTestMonster(), id: 'weak-monster', hp: 1 }
      const strongMonster = { ...createTestMonster(), id: 'strong-monster', hp: 20 }
      const state = createTestState(player, [weakMonster, strongMonster])

      mockRandom.setValues([15, 5])

      const command = new AttackCommand('weak-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      const monsters = result.levels.get(1)!.monsters
      expect(monsters.length).toBe(1)
      expect(monsters[0].id).toBe('strong-monster')
    })
  })

  describe('Invalid target', () => {
    test('does nothing if monster does not exist', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 3])

      const command = new AttackCommand('non-existent-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result).toBe(state)
      expect(result.turnCount).toBe(0)
    })
  })

  describe('State immutability', () => {
    test('does not mutate original state on hit', () => {
      const player = createTestPlayer()
      const monster = createTestMonster()
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 3])

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.levels).not.toBe(state.levels)
      expect(state.levels.get(1)!.monsters[0].hp).toBe(10)
    })

    test('does not mutate original state on kill', () => {
      const player = createTestPlayer()
      const monster = createTestMonster(1)
      const state = createTestState(player, [monster])

      mockRandom.setValues([15, 5])

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.player).not.toBe(state.player)
      expect(state.levels.get(1)!.monsters.length).toBe(1)
      expect(state.player.xp).toBe(0)
    })

    test('does not mutate original state on miss', () => {
      const player = { ...createTestPlayer(), level: 1, strength: 0 }
      const monster = { ...createTestMonster(), ac: 0 }
      const state = createTestState(player, [monster])

      mockRandom.setValues([1, 3])

      const command = new AttackCommand('test-monster', combatService, messageService, levelingService, turnService)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.messages).not.toBe(state.messages)
    })
  })
})
