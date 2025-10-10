import { NotificationService } from './NotificationService'
import { IdentificationService } from '@services/IdentificationService'
import { Monster, MonsterState, MonsterBehavior } from '@game/core/core'

describe('NotificationService - Wake-Up Messages', () => {
  let notificationService: NotificationService
  let identificationService: IdentificationService

  beforeEach(() => {
    identificationService = new IdentificationService()
    notificationService = new NotificationService(identificationService)
  })

  // Helper to create test monster
  function createMonster(
    id: string,
    name: string,
    isAsleep: boolean,
    state: MonsterState = MonsterState.SLEEPING
  ): Monster {
    return {
      id,
      letter: name[0],
      name,
      position: { x: 10, y: 10 },
      hp: 20,
      maxHp: 20,
      ac: 5,
      damage: '1d8',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep,
      isAwake: !isAsleep,
      state,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
      energy: 0,
    }
  }

  describe('Single Monster Wake-Up', () => {
    test('generates "The Dragon wakes up!" when dragon wakes', () => {
      const previousMonsters = [createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING)]
      const currentMonsters = [createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING)]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Dragon wakes up!')
    })

    test('generates "The Orc wakes up!" when orc wakes', () => {
      const previousMonsters = [createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING)]
      const currentMonsters = [createMonster('orc-1', 'Orc', false, MonsterState.HUNTING)]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Orc wakes up!')
    })
  })

  describe('Multiple Monster Wake-Ups', () => {
    test('generates "The Bat and Orc wake up!" for two monsters', () => {
      const previousMonsters = [
        createMonster('bat-1', 'Bat', true, MonsterState.SLEEPING),
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING),
      ]
      const currentMonsters = [
        createMonster('bat-1', 'Bat', false, MonsterState.HUNTING),
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING),
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Bat and Orc wake up!')
    })

    test('generates "The Snake, Hobgoblin, and Troll wake up!" for three monsters', () => {
      const previousMonsters = [
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING),
        createMonster('hobgoblin-1', 'Hobgoblin', true, MonsterState.SLEEPING),
        createMonster('troll-1', 'Troll', true, MonsterState.SLEEPING),
      ]
      const currentMonsters = [
        createMonster('snake-1', 'Snake', false, MonsterState.HUNTING),
        createMonster('hobgoblin-1', 'Hobgoblin', false, MonsterState.HUNTING),
        createMonster('troll-1', 'Troll', false, MonsterState.HUNTING),
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Snake, Hobgoblin, and Troll wake up!')
    })

    test('handles four monsters correctly', () => {
      const previousMonsters = [
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING),
        createMonster('hobgoblin-1', 'Hobgoblin', true, MonsterState.SLEEPING),
        createMonster('troll-1', 'Troll', true, MonsterState.SLEEPING),
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING),
      ]
      const currentMonsters = [
        createMonster('snake-1', 'Snake', false, MonsterState.HUNTING),
        createMonster('hobgoblin-1', 'Hobgoblin', false, MonsterState.HUNTING),
        createMonster('troll-1', 'Troll', false, MonsterState.HUNTING),
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING),
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Snake, Hobgoblin, Troll, and Dragon wake up!')
    })
  })

  describe('No Wake-Ups', () => {
    test('returns empty array when no monsters wake up', () => {
      const previousMonsters = [
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING),
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING),
      ]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING),
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING),
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(0)
    })

    test('returns empty array when all monsters already awake', () => {
      const previousMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING),
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING),
      ]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING),
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING),
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(0)
    })

    test('returns empty array for empty monster lists', () => {
      const messages = notificationService.checkWakeUpMessages([], [])

      expect(messages).toHaveLength(0)
    })
  })

  describe('Partial Wake-Ups', () => {
    test('only reports monsters that woke up, not already awake monsters', () => {
      const previousMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING), // Already awake
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING), // Will wake up
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING), // Stays asleep
      ]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING), // Still awake
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING), // Just woke up
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING), // Still asleep
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Orc wakes up!')
    })

    test('handles multiple monsters waking while others stay asleep', () => {
      const previousMonsters = [
        createMonster('bat-1', 'Bat', true, MonsterState.SLEEPING), // Will wake up
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING), // Will wake up
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING), // Stays asleep
        createMonster('troll-1', 'Troll', false, MonsterState.HUNTING), // Already awake
      ]
      const currentMonsters = [
        createMonster('bat-1', 'Bat', false, MonsterState.HUNTING), // Just woke up
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING), // Just woke up
        createMonster('snake-1', 'Snake', true, MonsterState.SLEEPING), // Still asleep
        createMonster('troll-1', 'Troll', false, MonsterState.HUNTING), // Still awake
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Bat and Orc wake up!')
    })
  })

  describe('New Monsters', () => {
    test('ignores newly spawned monsters (not in previous list)', () => {
      const previousMonsters = [createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING)]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING),
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING), // New monster, awake
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(0) // No wake-up message for new monster
    })

    test('detects wake-up even when new monsters are present', () => {
      const previousMonsters = [
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING), // Will wake up
      ]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING), // Just woke up
        createMonster('orc-1', 'Orc', false, MonsterState.HUNTING), // New monster
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Dragon wakes up!')
    })
  })

  describe('Dead Monsters', () => {
    test('ignores monsters that died (not in current list)', () => {
      const previousMonsters = [
        createMonster('dragon-1', 'Dragon', true, MonsterState.SLEEPING),
        createMonster('orc-1', 'Orc', true, MonsterState.SLEEPING), // Will be killed
      ]
      const currentMonsters = [
        createMonster('dragon-1', 'Dragon', false, MonsterState.HUNTING), // Woke up
        // orc-1 is dead, not in current list
      ]

      const messages = notificationService.checkWakeUpMessages(currentMonsters, previousMonsters)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('The Dragon wakes up!')
    })
  })
})
