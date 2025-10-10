import { NotificationService } from './NotificationService'
import { IdentificationService } from '@services/IdentificationService'
import { GameState, Monster, MonsterState, MonsterBehavior } from '@game/core/core'

describe('NotificationService - Monster Sighting Messages', () => {
  let notificationService: NotificationService
  let identificationService: IdentificationService

  beforeEach(() => {
    identificationService = new IdentificationService()
    notificationService = new NotificationService(identificationService)
  })

  // Helper to create test monster
  function createMonster(id: string, name: string, x: number, y: number): Monster {
    return {
      id,
      letter: name[0],
      name,
      position: { x, y },
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
      isAsleep: false,
      isAwake: true,
      state: MonsterState.HUNTING,
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

  // Helper to create game state
  function createStateWithMonsters(monsters: Monster[], visiblePositions: string[]): GameState {
    const player: any = {
      position: { x: 10, y: 10 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1000,
      equipment: { weapon: null, armor: null, leftRing: null, rightRing: null, lightSource: null },
      inventory: [],
      statusEffects: [],
      energy: 100,
      isRunning: false,
    }

    const level: any = {
      depth: 1,
      width: 80,
      height: 22,
      tiles: [],
      rooms: [],
      doors: [],
      traps: [],
      monsters,
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 40, y: 11 },
      explored: [],
    }

    return {
      player,
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(visiblePositions),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test',
      characterName: 'Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: { potions: new Map(), scrolls: new Map(), rings: new Map(), wands: new Map() },
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    } as any
  }

  describe('Single Monster Sighting', () => {
    test('generates "You see a Dragon!" for single monster', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const state = createStateWithMonsters([dragon], ['12,10'])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Dragon!')
    })

    test('uses "an" article for vowel-starting names', () => {
      const emu = createMonster('emu-1', 'Emu', 12, 10)
      const state = createStateWithMonsters([emu], ['12,10'])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see an Emu!')
    })

    test('uses "a" article for consonant-starting names', () => {
      const snake = createMonster('snake-1', 'Snake', 12, 10)
      const state = createStateWithMonsters([snake], ['12,10'])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Snake!')
    })
  })

  describe('Multiple Monster Sighting', () => {
    test('generates "You see a Bat and an Orc!" for two monsters', () => {
      const bat = createMonster('bat-1', 'Bat', 12, 10)
      const orc = createMonster('orc-1', 'Orc', 13, 10)
      const state = createStateWithMonsters([bat, orc], ['12,10', '13,10'])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Bat and an Orc!')
    })

    test('generates "You see a Snake, a Hobgoblin, and a Troll!" for three monsters', () => {
      const snake = createMonster('snake-1', 'Snake', 12, 10)
      const hobgoblin = createMonster('hobgoblin-1', 'Hobgoblin', 13, 10)
      const troll = createMonster('troll-1', 'Troll', 14, 10)
      const state = createStateWithMonsters([snake, hobgoblin, troll], ['12,10', '13,10', '14,10'])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Snake, a Hobgoblin, and a Troll!')
    })

    test('handles four monsters correctly', () => {
      const snake = createMonster('snake-1', 'Snake', 12, 10)
      const hobgoblin = createMonster('hobgoblin-1', 'Hobgoblin', 13, 10)
      const troll = createMonster('troll-1', 'Troll', 14, 10)
      const dragon = createMonster('dragon-1', 'Dragon', 15, 10)
      const state = createStateWithMonsters(
        [snake, hobgoblin, troll, dragon],
        ['12,10', '13,10', '14,10', '15,10']
      )

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Snake, a Hobgoblin, a Troll, and a Dragon!')
    })
  })

  describe('Deduplication', () => {
    test('does NOT generate message for already-seen monster', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const state = createStateWithMonsters([dragon], ['12,10'])

      // First sighting
      const firstMessages = notificationService.checkMonsterSightings(state)
      expect(firstMessages).toHaveLength(1)
      expect(firstMessages[0]).toBe('You see a Dragon!')

      // Second call with same monster still visible
      const secondMessages = notificationService.checkMonsterSightings(state)
      expect(secondMessages).toHaveLength(0) // No duplicate message
    })

    test('generates message for new monster after first monster seen', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const state = createStateWithMonsters([dragon], ['12,10'])

      // First sighting
      const firstMessages = notificationService.checkMonsterSightings(state)
      expect(firstMessages).toHaveLength(1)
      expect(firstMessages[0]).toBe('You see a Dragon!')

      // Add new monster to visible cells
      const orc = createMonster('orc-1', 'Orc', 13, 10)
      state.levels.get(1)!.monsters.push(orc)
      state.visibleCells.add('13,10')

      // Second call with new monster
      const secondMessages = notificationService.checkMonsterSightings(state)
      expect(secondMessages).toHaveLength(1)
      expect(secondMessages[0]).toBe('You see an Orc!')
    })

    test('does NOT generate message for monster outside visible cells', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const orc = createMonster('orc-1', 'Orc', 20, 20)
      const state = createStateWithMonsters([dragon, orc], ['12,10']) // Only dragon visible

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(1)
      expect(messages[0]).toBe('You see a Dragon!') // Only dragon, not orc
    })
  })

  describe('Level Change Reset', () => {
    test('resets monstersSeen when player changes levels', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const state = createStateWithMonsters([dragon], ['12,10'])

      // First sighting on level 1
      const firstMessages = notificationService.checkMonsterSightings(state)
      expect(firstMessages).toHaveLength(1)
      expect(firstMessages[0]).toBe('You see a Dragon!')

      // Same monster, still visible, no new message
      const secondMessages = notificationService.checkMonsterSightings(state)
      expect(secondMessages).toHaveLength(0)

      // Player changes to level 2
      state.currentLevel = 2
      const level2: any = {
        depth: 2,
        width: 80,
        height: 22,
        tiles: [],
        rooms: [],
        doors: [],
        traps: [],
        monsters: [dragon], // Same dragon ID
        items: [],
        gold: [],
        stairsUp: { x: 40, y: 11 },
        stairsDown: { x: 40, y: 11 },
        explored: [],
      }
      state.levels.set(2, level2)

      // Dragon should be reported again on new level
      const thirdMessages = notificationService.checkMonsterSightings(state)
      expect(thirdMessages).toHaveLength(1)
      expect(thirdMessages[0]).toBe('You see a Dragon!')
    })
  })

  describe('Edge Cases', () => {
    test('returns empty array when no monsters in FOV', () => {
      const state = createStateWithMonsters([], [])

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(0)
    })

    test('returns empty array when level not found', () => {
      const state = createStateWithMonsters([], [])
      state.currentLevel = 999 // Invalid level

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(0)
    })

    test('handles empty visible cells set', () => {
      const dragon = createMonster('dragon-1', 'Dragon', 12, 10)
      const state = createStateWithMonsters([dragon], []) // No visible cells

      const messages = notificationService.checkMonsterSightings(state)

      expect(messages).toHaveLength(0)
    })
  })
})
