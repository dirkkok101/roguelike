import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
import {
  Player,
  Potion,
  PotionType,
  ItemType,
  GameState,
  ItemNameMap,
  ScrollType,
  RingType,
  WandType,
  Level,
  Monster,
  MonsterBehavior,
  MonsterState,
  TileType,
} from '@game/core/core'

describe('PotionService - Detection Potions', () => {
  let potionService: PotionService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let levelingService: LevelingService
  let statusEffectService: StatusEffectService
  let testPlayer: Player
  let testState: GameState
  let testLevel: Level

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    potionService = new PotionService(
      mockRandom,
      identificationService,
      levelingService
    )

    testPlayer = {
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      maxStrength: 16,
      level: 3,
      xp: 75,
      gold: 0,
      ac: 10,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      hunger: 1000,
    } as Player

    // Create test monsters
    const monster1: Monster = {
      id: 'monster-1',
      letter: 'O',
      name: 'Orc',
      spriteName: 'Orc',
      position: { x: 10, y: 10 },
      hp: 15,
      maxHp: 15,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 5,
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
    }

    const monster2: Monster = {
      id: 'monster-2',
      letter: 'K',
      name: 'Kobold',
      spriteName: 'Kobold',
      position: { x: 15, y: 15 },
      hp: 10,
      maxHp: 10,
      ac: 7,
      damage: '1d6',
      xpValue: 3,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: true,
      isAwake: false,
      state: MonsterState.SLEEPING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
    }

    // Create test level with monsters
    testLevel = {
      depth: 1,
      width: 80,
      height: 24,
      tiles: Array(24)
        .fill(null)
        .map(() =>
          Array(80).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#888',
            colorExplored: '#444',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [monster1, monster2],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 40, y: 12 },
      explored: Array(24)
        .fill(null)
        .map(() => Array(80).fill(false)),
    }

    // Create itemNameMap for identification
    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>([
        [PotionType.DETECT_MONSTERS, 'glowing potion'],
      ]),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      player: testPlayer,
      currentLevel: 1,
      levels: new Map([[1, testLevel]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: '12345',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap,
      identifiedItems: new Set<string>(),
      detectedMonsters: new Set<string>(),
      detectedMagicItems: new Set<string>(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    } as GameState
  })

  describe('applyPotion - DETECT_MONSTERS', () => {
    test('detects all monsters on current level', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.state).toBeDefined()
      expect(result.state!.detectedMonsters.size).toBe(2)
      expect(result.state!.detectedMonsters.has('monster-1')).toBe(true)
      expect(result.state!.detectedMonsters.has('monster-2')).toBe(true)
    })

    test('returns correct message for multiple monsters', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe('You sense 2 monsters nearby!')
    })

    test('returns correct message for single monster', () => {
      // Remove one monster
      testLevel.monsters = [testLevel.monsters[0]]

      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe('You sense a monster nearby!')
      expect(result.state!.detectedMonsters.size).toBe(1)
    })

    test('returns "strange feeling" message when no monsters present', () => {
      // Remove all monsters
      testLevel.monsters = []

      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe(
        'You have a strange feeling for a moment, then it passes.'
      )
      expect(result.state!.detectedMonsters.size).toBe(0)
    })

    test('auto-identifies potion when consumed', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.death).toBe(false)
    })

    test('does not modify player stats', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.hp).toBe(testPlayer.hp)
      expect(result.player.maxHp).toBe(testPlayer.maxHp)
      expect(result.player.level).toBe(testPlayer.level)
      expect(result.player.strength).toBe(testPlayer.strength)
    })

    test('detects both sleeping and awake monsters', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      // Verify one monster is asleep, one is awake
      expect(testLevel.monsters[0].isAsleep).toBe(false)
      expect(testLevel.monsters[1].isAsleep).toBe(true)

      const result = potionService.applyPotion(testPlayer, potion, testState)

      // Both should be detected
      expect(result.state!.detectedMonsters.size).toBe(2)
    })

    test('handles level with many monsters', () => {
      // Add more monsters
      for (let i = 3; i <= 10; i++) {
        const monster: Monster = {
          id: `monster-${i}`,
          letter: 'G',
          name: 'Goblin',
      spriteName: 'Goblin',
          position: { x: i * 5, y: i * 2 },
          hp: 8,
          maxHp: 8,
          ac: 7,
          damage: '1d4',
          xpValue: 2,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 2,
            aggroRange: 5,
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
        }
        testLevel.monsters.push(monster)
      }

      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Detect Monsters',
      spriteName: 'Potion of Detect Monsters',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MONSTERS,
        effect: 'detect_monsters',
        power: '0',
        descriptorName: 'glowing potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.state!.detectedMonsters.size).toBe(10)
      expect(result.message).toBe('You sense 10 monsters nearby!')
    })
  })

  describe('applyPotion - DETECT_MAGIC', () => {
    beforeEach(() => {
      // Add magic items to test level
      testLevel.items = [
        {
          id: 'potion-heal',
          name: 'Potion of Healing',
      spriteName: 'Potion of Healing',
          type: ItemType.POTION,
          identified: false,
          position: { x: 10, y: 10 },
          potionType: PotionType.HEAL,
          effect: 'restore_hp',
          power: '1d8',
          descriptorName: 'red potion',
        } as Potion,
        {
          id: 'scroll-identify',
          name: 'Scroll of Identify',
      spriteName: 'Scroll of Identify',
          type: ItemType.SCROLL,
          identified: false,
          position: { x: 15, y: 15 },
          scrollType: ScrollType.IDENTIFY,
          effect: 'identify_item',
          labelName: 'scroll labeled XYZZY',
        },
        {
          id: 'ring-protection',
          name: 'Ring of Protection',
      spriteName: 'Ring of Protection',
          type: ItemType.RING,
          identified: false,
          position: { x: 20, y: 20 },
          ringType: RingType.PROTECTION,
          effect: 'improve_ac',
          bonus: 1,
          materialName: 'ruby ring',
          hungerModifier: 1.2,
        },
        {
          id: 'wand-lightning',
          name: 'Wand of Lightning',
      spriteName: 'Wand of Lightning',
          type: ItemType.WAND,
          identified: false,
          position: { x: 25, y: 5 },
          wandType: WandType.LIGHTNING,
          damage: '3d6',
          charges: 5,
          currentCharges: 5,
          woodName: 'oak wand',
        },
        // Non-magic item (should not be detected)
        {
          id: 'weapon-sword',
          name: 'Long Sword',
      spriteName: 'Long Sword',
          type: ItemType.WEAPON,
          identified: true,
          position: { x: 30, y: 10 },
          damage: '1d12',
          bonus: 0,
        },
      ]
    })

    test('detects all magic items on current level', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.state).toBeDefined()
      expect(result.state!.detectedMagicItems.size).toBe(4) // potion, scroll, ring, wand
      expect(result.state!.detectedMagicItems.has('potion-heal')).toBe(true)
      expect(result.state!.detectedMagicItems.has('scroll-identify')).toBe(true)
      expect(result.state!.detectedMagicItems.has('ring-protection')).toBe(true)
      expect(result.state!.detectedMagicItems.has('wand-lightning')).toBe(true)
      // Weapon should NOT be detected
      expect(result.state!.detectedMagicItems.has('weapon-sword')).toBe(false)
    })

    test('returns correct message for multiple magic items', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe('You sense 4 magic items nearby!')
    })

    test('returns correct message for single magic item', () => {
      // Keep only one magic item
      testLevel.items = [testLevel.items[0]]

      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe('You sense magic nearby!')
      expect(result.state!.detectedMagicItems.size).toBe(1)
    })

    test('returns "strange feeling" message when no magic items present', () => {
      // Remove all items
      testLevel.items = []

      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe(
        'You have a strange feeling for a moment, then it passes.'
      )
      expect(result.state!.detectedMagicItems.size).toBe(0)
    })

    test('does not detect non-magic items', () => {
      // Only non-magic items
      testLevel.items = [
        {
          id: 'weapon-sword',
          name: 'Long Sword',
      spriteName: 'Long Sword',
          type: ItemType.WEAPON,
          identified: true,
          position: { x: 10, y: 10 },
          damage: '1d12',
          bonus: 0,
        },
        {
          id: 'armor-plate',
          name: 'Plate Mail',
      spriteName: 'Plate Mail',
          type: ItemType.ARMOR,
          identified: true,
          position: { x: 15, y: 15 },
          ac: 3,
          bonus: 0,
        },
        {
          id: 'food-ration',
          name: 'Food Ration',
      spriteName: 'Food Ration',
          type: ItemType.FOOD,
          identified: true,
          position: { x: 20, y: 20 },
          nutrition: 1300,
        },
      ]

      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.state!.detectedMagicItems.size).toBe(0)
      expect(result.message).toBe(
        'You have a strange feeling for a moment, then it passes.'
      )
    })

    test('auto-identifies potion when consumed', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.identified).toBe(true)
    })

    test('does not kill player', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.death).toBe(false)
    })

    test('does not modify player stats', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.hp).toBe(testPlayer.hp)
      expect(result.player.maxHp).toBe(testPlayer.maxHp)
      expect(result.player.level).toBe(testPlayer.level)
      expect(result.player.strength).toBe(testPlayer.strength)
    })

    test('detects all four magic item types', () => {
      const potion: Potion = {
        id: 'potion-detect',
        name: 'Potion of Detect Magic',
      spriteName: 'Potion of Detect Magic',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.DETECT_MAGIC,
        effect: 'detect_magic',
        power: '0',
        descriptorName: 'shimmering potion',
      }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      // Verify all magic types detected
      const types = testLevel.items
        .filter((item) => result.state!.detectedMagicItems.has(item.id))
        .map((item) => item.type)

      expect(types).toContain(ItemType.POTION)
      expect(types).toContain(ItemType.SCROLL)
      expect(types).toContain(ItemType.RING)
      expect(types).toContain(ItemType.WAND)
    })
  })
})
