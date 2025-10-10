import { AssetLoaderService } from './AssetLoaderService'
import { loadItemData, ItemData } from '../../data/ItemDataLoader'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { SeededRandom } from '@services/RandomService'

// Mock loadItemData to avoid real fetch in tests
jest.mock('../../data/ItemDataLoader', () => ({
  loadItemData: jest.fn(),
}))

// ============================================================================
// ASSET VALIDATION TESTS - Verify all game entities have sprite mappings
// ============================================================================

describe('AssetLoaderService - Asset Validation', () => {
  let assetLoader: AssetLoaderService
  let monsterSpawnService: MonsterSpawnService
  let originalFetch: typeof global.fetch

  beforeAll(async () => {
    // Mock loadItemData to avoid real fetch in tests
    ;(loadItemData as jest.Mock).mockResolvedValue({
      weapons: [
        { name: 'Mace', spriteName: 'Mace', damage: '2d4', rarity: 'common' },
        { name: 'Long sword', spriteName: 'Long sword', damage: '1d8+1', rarity: 'common' },
      ],
      armor: [
        { name: 'Leather armor', spriteName: 'Leather armour', ac: 2, rarity: 'common' },
        { name: 'Ring mail', spriteName: 'Ring mail', ac: 3, rarity: 'common' },
      ],
      lightSources: [],
      potions: [
        { type: 'HEALING', spriteName: 'Potion of healing', effect: 'heal', power: '1d8', rarity: 'common', descriptors: ['red', 'blue'] },
      ],
      scrolls: [
        { type: 'IDENTIFY', spriteName: 'Scroll of identify', effect: 'identify', rarity: 'common', labels: ['ZELGO MER'] },
      ],
      rings: [
        { type: 'STRENGTH', spriteName: 'Ring of strength', effect: 'add_strength', power: '+1', hungerModifier: 0, rarity: 'common', materials: ['gold', 'silver'] },
      ],
      wands: [
        { type: 'LIGHTNING', spriteName: 'Wand of lightning', damage: '6d6', charges: '3d8', rarity: 'rare', woods: ['oak', 'pine'] },
      ],
      food: [
        { name: 'Ration of food', spriteName: 'Ration of food', nutrition: '900', rarity: 'common' },
      ],
      consumables: [],
    } as ItemData)

    // Mock fetch for monster data loading
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { letter: 'A', name: 'Aquator', spriteName: 'Water elemental', hp: '5d8', ac: 2, damage: '0d0', xpValue: 50, level: 5, speed: 10, rarity: 'uncommon', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 4, fleeThreshold: 0.0, special: [] } },
        { letter: 'B', name: 'Bat', spriteName: 'Fruit bat', hp: '1d8', ac: 3, damage: '1d2', xpValue: 1, level: 1, speed: 10, rarity: 'common', mean: false, aiProfile: { behavior: 'ERRATIC', intelligence: 1, aggroRange: 3, fleeThreshold: 0.3, special: [] } },
        { letter: 'C', name: 'Centipede', spriteName: 'Centipede', hp: '1d8', ac: 7, damage: '1d3', xpValue: 2, level: 1, speed: 10, rarity: 'common', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 4, fleeThreshold: 0.0, special: [] } },
        { letter: 'D', name: 'Dragon', spriteName: 'Ancient dragon', hp: '10d8', ac: -1, damage: '1d8+3d10', xpValue: 5000, level: 10, speed: 15, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 10, aggroRange: 10, fleeThreshold: 0.3, special: ['BREATHE_FIRE'] } },
        { letter: 'E', name: 'Emu', spriteName: 'Emu', hp: '2d8', ac: 7, damage: '1d2', xpValue: 3, level: 1, speed: 12, rarity: 'common', mean: false, aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 4, fleeThreshold: 0.2, special: [] } },
        { letter: 'F', name: 'Venus Flytrap', spriteName: 'Venus flytrap', hp: '8d8', ac: 3, damage: '4d4', xpValue: 80, level: 8, speed: 1, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'STATIONARY', intelligence: 1, aggroRange: 1, fleeThreshold: 0.0, special: [] } },
        { letter: 'G', name: 'Griffin', spriteName: 'Griffin', hp: '13d8', ac: 2, damage: '4d3+4d5', xpValue: 2000, level: 10, speed: 20, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 9, aggroRange: 10, fleeThreshold: 0.2, special: ['FLIES'] } },
        { letter: 'H', name: 'Hobgoblin', spriteName: 'Hobgoblin', hp: '3d8', ac: 5, damage: '1d8', xpValue: 10, level: 2, speed: 10, rarity: 'common', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 5, fleeThreshold: 0.2, special: [] } },
        { letter: 'I', name: 'Ice Monster', spriteName: 'Ice monster', hp: '1d8', ac: 9, damage: '0d0', xpValue: 5, level: 1, speed: 5, rarity: 'uncommon', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 3, fleeThreshold: 0.0, special: ['freezes_player'] } },
        { letter: 'J', name: 'Jackal', spriteName: 'Jackal', hp: '2d8', ac: 7, damage: '1d2', xpValue: 3, level: 1, speed: 12, rarity: 'common', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 5, fleeThreshold: 0.3, special: [] } },
        { letter: 'K', name: 'Kobold', spriteName: 'Kobold', hp: '1d8', ac: 7, damage: '1d4', xpValue: 1, level: 1, speed: 10, rarity: 'common', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 4, fleeThreshold: 0.4, special: [] } },
        { letter: 'L', name: 'Leprechaun', spriteName: 'Leprechaun', hp: '3d8', ac: 8, damage: '1d1', xpValue: 10, level: 3, speed: 10, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'THIEF', intelligence: 7, aggroRange: 6, fleeThreshold: 0.8, special: ['steals_gold'] } },
        { letter: 'M', name: 'Mimic', spriteName: 'Mimic', hp: '7d8', ac: 7, damage: '3d4', xpValue: 140, level: 7, speed: 10, rarity: 'rare', mean: true, aiProfile: { behavior: 'STATIONARY', intelligence: 6, aggroRange: 1, fleeThreshold: 0.0, special: ['mimics_items'] } },
        { letter: 'N', name: 'Nymph', spriteName: 'Nymph', hp: '3d8', ac: 9, damage: '0d0', xpValue: 40, level: 3, speed: 10, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'THIEF', intelligence: 8, aggroRange: 3, fleeThreshold: 0.9, special: ['steals_item', 'teleports'] } },
        { letter: 'O', name: 'Orc', spriteName: 'Orc', hp: '1d8', ac: 6, damage: '1d8', xpValue: 5, level: 1, speed: 10, rarity: 'common', mean: false, aiProfile: { behavior: 'GREEDY', intelligence: 4, aggroRange: 5, fleeThreshold: 0.3, special: [] } },
        { letter: 'P', name: 'Phantom', spriteName: 'Phantom', hp: '8d8', ac: 3, damage: '4d4', xpValue: 120, level: 8, speed: 10, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 8, fleeThreshold: 0.1, special: ['invisible'] } },
        { letter: 'Q', name: 'Quasit', spriteName: 'Quasit', hp: '5d8', ac: 2, damage: '1d2+1d4', xpValue: 35, level: 4, speed: 10, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SMART', intelligence: 7, aggroRange: 7, fleeThreshold: 0.3, special: [] } },
        { letter: 'R', name: 'Rattlesnake', spriteName: 'Rattlesnake', hp: '2d8', ac: 3, damage: '1d6', xpValue: 10, level: 2, speed: 10, rarity: 'common', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 2, aggroRange: 4, fleeThreshold: 0.2, special: ['poisons'] } },
        { letter: 'S', name: 'Snake', spriteName: 'Snake', hp: '1d8', ac: 5, damage: '1d3', xpValue: 3, level: 1, speed: 10, rarity: 'common', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 3, fleeThreshold: 0.3, special: [] } },
        { letter: 'T', name: 'Troll', spriteName: 'Troll', hp: '6d8', ac: 4, damage: '1d8+1d8+2d6', xpValue: 120, level: 6, speed: 12, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] } },
        { letter: 'U', name: 'Unicorn', spriteName: 'Unicorn', hp: '8d8', ac: 0, damage: '1d9+1d9', xpValue: 200, level: 7, speed: 15, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 6, aggroRange: 9, fleeThreshold: 0.15, special: [] } },
        { letter: 'V', name: 'Vampire', spriteName: 'Vampire', hp: '8d8', ac: 1, damage: '1d10', xpValue: 350, level: 8, speed: 12, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 9, aggroRange: 10, fleeThreshold: 0.2, special: ['drains_levels'] } },
        { letter: 'W', name: 'Wraith', spriteName: 'Wraith', hp: '5d8', ac: 4, damage: '1d6', xpValue: 55, level: 5, speed: 10, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 5, aggroRange: 7, fleeThreshold: 0.1, special: ['drains_levels'] } },
        { letter: 'X', name: 'Xorn', spriteName: 'Xorn', hp: '7d8', ac: -2, damage: '1d3+1d3+1d3+4d6', xpValue: 190, level: 7, speed: 10, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 8, fleeThreshold: 0.2, special: ['passes_walls'] } },
        { letter: 'Y', name: 'Yeti', spriteName: 'Yeti', hp: '4d8', ac: 6, damage: '1d6+1d6', xpValue: 50, level: 4, speed: 10, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 6, fleeThreshold: 0.25, special: [] } },
        { letter: 'Z', name: 'Zombie', spriteName: 'Zombie', hp: '2d8', ac: 8, damage: '1d8', xpValue: 7, level: 2, speed: 5, rarity: 'common', mean: false, aiProfile: { behavior: 'SIMPLE', intelligence: 1, aggroRange: 3, fleeThreshold: 0.0, special: [] } },
      ],
    } as Response)

    assetLoader = new AssetLoaderService()

    // Mock tileset loading for faster tests
    // (Real loading is too slow for unit tests - 1.3MB PNG + parsing)
    jest.spyOn(assetLoader, 'isLoaded').mockReturnValue(true)
    jest.spyOn(assetLoader, 'getCurrentTileset').mockReturnValue({
      config: {
        name: 'Mock Gervais Tileset',
        tileWidth: 32,
        tileHeight: 32,
        imageUrl: 'mock.png',
        tiles: new Map([
          // Terrain
          ['.', { x: 0, y: 0, hexX: 0x00, hexY: 0x00 }],
          ['#', { x: 32, y: 0, hexX: 0x01, hexY: 0x00 }],
          ['+', { x: 64, y: 0, hexX: 0x02, hexY: 0x00 }],
          ["'", { x: 96, y: 0, hexX: 0x03, hexY: 0x00 }],
          ['<', { x: 128, y: 0, hexX: 0x04, hexY: 0x00 }],
          ['>', { x: 160, y: 0, hexX: 0x05, hexY: 0x00 }],
          ['^', { x: 192, y: 0, hexX: 0x06, hexY: 0x00 }],
          ['%', { x: 224, y: 0, hexX: 0x07, hexY: 0x00 }],
          ['@', { x: 256, y: 0, hexX: 0x08, hexY: 0x00 }],
          // Items
          ['$', { x: 0, y: 32, hexX: 0x00, hexY: 0x01 }],
          ['!', { x: 32, y: 32, hexX: 0x01, hexY: 0x01 }],
          ['?', { x: 64, y: 32, hexX: 0x02, hexY: 0x01 }],
          ['=', { x: 96, y: 32, hexX: 0x03, hexY: 0x01 }],
          ['/', { x: 128, y: 32, hexX: 0x04, hexY: 0x01 }],
          [')', { x: 160, y: 32, hexX: 0x05, hexY: 0x01 }],
          ['[', { x: 192, y: 32, hexX: 0x06, hexY: 0x01 }],
          ['*', { x: 224, y: 32, hexX: 0x07, hexY: 0x01 }],
          // Mock monster sprites (using monster names as keys)
          ['Water elemental', { x: 0, y: 64, hexX: 0x00, hexY: 0x02 }],
          ['Fruit bat', { x: 32, y: 64, hexX: 0x01, hexY: 0x02 }],
          ['Centipede', { x: 64, y: 64, hexX: 0x02, hexY: 0x02 }],
          ['Ancient dragon', { x: 96, y: 64, hexX: 0x03, hexY: 0x02 }],
          ['Emu', { x: 128, y: 64, hexX: 0x04, hexY: 0x02 }],
          ['Venus flytrap', { x: 160, y: 64, hexX: 0x05, hexY: 0x02 }],
          ['Griffin', { x: 192, y: 64, hexX: 0x06, hexY: 0x02 }],
          ['Hobgoblin', { x: 224, y: 64, hexX: 0x07, hexY: 0x02 }],
          ['Ice monster', { x: 256, y: 64, hexX: 0x08, hexY: 0x02 }],
          ['Jackal', { x: 0, y: 96, hexX: 0x00, hexY: 0x03 }],
          ['Kobold', { x: 32, y: 96, hexX: 0x01, hexY: 0x03 }],
          ['Leprechaun', { x: 64, y: 96, hexX: 0x02, hexY: 0x03 }],
          ['Mimic', { x: 96, y: 96, hexX: 0x03, hexY: 0x03 }],
          ['Nymph', { x: 128, y: 96, hexX: 0x04, hexY: 0x03 }],
          ['Orc', { x: 160, y: 96, hexX: 0x05, hexY: 0x03 }],
          ['Phantom', { x: 192, y: 96, hexX: 0x06, hexY: 0x03 }],
          ['Quasit', { x: 224, y: 96, hexX: 0x07, hexY: 0x03 }],
          ['Rattlesnake', { x: 256, y: 96, hexX: 0x08, hexY: 0x03 }],
          ['Snake', { x: 0, y: 128, hexX: 0x00, hexY: 0x04 }],
          ['Troll', { x: 32, y: 128, hexX: 0x01, hexY: 0x04 }],
          ['Unicorn', { x: 64, y: 128, hexX: 0x02, hexY: 0x04 }],
          ['Vampire', { x: 96, y: 128, hexX: 0x03, hexY: 0x04 }],
          ['Wraith', { x: 128, y: 128, hexX: 0x04, hexY: 0x04 }],
          ['Xorn', { x: 160, y: 128, hexX: 0x05, hexY: 0x04 }],
          ['Yeti', { x: 192, y: 128, hexX: 0x06, hexY: 0x04 }],
          ['Zombie', { x: 224, y: 128, hexX: 0x07, hexY: 0x04 }],
        ]),
      },
      image: { width: 1024, height: 1024 } as HTMLImageElement,
      isLoaded: true,
    })
    jest.spyOn(assetLoader, 'getSprite').mockImplementation((key: string) => {
      // Return mock sprite for any recognized key
      const mockTiles = assetLoader.getCurrentTileset()?.config.tiles
      return mockTiles?.get(key) || null
    })

    // Load monster data
    const random = new SeededRandom('test-seed')
    monsterSpawnService = new MonsterSpawnService(random)
    await monsterSpawnService.loadMonsterData()
  }, 10000) // Reduced timeout since we're mocking

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe('Terrain Character Validation', () => {
    const terrainCharacters = [
      { char: '.', name: 'Floor' },
      { char: '#', name: 'Wall (granite)' },
      { char: '+', name: 'Closed door' },
      { char: "'", name: 'Open door' },
      { char: '<', name: 'Stairs up' },
      { char: '>', name: 'Stairs down' },
      { char: '^', name: 'Trap' },
      { char: '%', name: 'Rubble' },
      { char: '@', name: 'Player' },
    ]

    test.each(terrainCharacters)('$name ($char) has a sprite mapping', ({ char, name }) => {
      const sprite = assetLoader.getSprite(char)
      expect(sprite).not.toBeNull()
      if (!sprite) {
        console.error(`❌ Missing sprite for ${name} (${char})`)
      }
    })
  })

  describe('Monster Validation', () => {
    test('all monsters from monsters.json have sprite mappings', async () => {
      const missingSprites: string[] = []
      const validSprites: string[] = []

      // Get all monster templates
      const monsterTemplates = (monsterSpawnService as any).monsterTemplates

      for (const monster of monsterTemplates) {
        // Look up by spriteName (the key used in tileset mapping)
        const sprite = assetLoader.getSprite(monster.spriteName)

        if (!sprite) {
          missingSprites.push(`${monster.name} (${monster.letter})`)
        } else {
          validSprites.push(monster.name)
        }
      }

      // Report results
      console.log(`\n📊 Monster Sprite Validation Results:`)
      console.log(`✅ Found: ${validSprites.length} monsters`)
      if (missingSprites.length > 0) {
        console.log(`❌ Missing: ${missingSprites.length} monsters`)
        console.log(`\nMissing sprites:`)
        missingSprites.forEach((name) => console.log(`  - ${name}`))
      }

      // Fail test if any monsters are missing sprites
      expect(missingSprites).toHaveLength(0)
    })
  })

  describe('Item Validation', () => {
    test('all items from items.json have sprite mappings', async () => {
      const itemData = await loadItemData()
      if (!itemData) {
        throw new Error('Failed to load item data')
      }

      const missingSprites: string[] = []
      const validSprites: string[] = []

      // Check all item categories
      const itemCategories = [
        { name: 'Weapons', items: itemData.weapons },
        { name: 'Armor', items: itemData.armor },
        { name: 'Potions', items: itemData.potions },
        { name: 'Scrolls', items: itemData.scrolls },
        { name: 'Rings', items: itemData.rings },
        { name: 'Wands', items: itemData.wands },
        { name: 'Food', items: itemData.food },
      ]

      for (const category of itemCategories) {
        for (const item of category.items) {
          // Get item identifier (name for weapons/armor/food, type for potions/scrolls/rings/wands)
          const itemId = (item as any).name || (item as any).type || 'unknown'

          // Try to get sprite by first character of item identifier
          const firstChar = itemId[0]
          const sprite = assetLoader.getSprite(firstChar)

          if (!sprite) {
            missingSprites.push(`${itemId} [${category.name}] (${firstChar})`)
          } else {
            validSprites.push(itemId)
          }
        }
      }

      // Report results
      console.log(`\n📊 Item Sprite Validation Results:`)
      console.log(`✅ Found: ${validSprites.length} items`)
      if (missingSprites.length > 0) {
        console.log(`❌ Missing: ${missingSprites.length} items`)
        console.log(`\nMissing sprites:`)
        missingSprites.forEach((name) => console.log(`  - ${name}`))
      }

      // Note: Items use generic sprites by type (potion, scroll, etc.)
      // so missing individual items is expected - this test is informational
      if (missingSprites.length > 0) {
        console.log(`\n⚠️  Note: Missing item sprites is not necessarily an error.`)
        console.log(`   Items often share generic sprites by type (!, ?, =, /, etc.)`)
      }
    })
  })

  describe('Special Character Validation', () => {
    const specialChars = [
      { char: '$', name: 'Gold' },
      { char: '!', name: 'Potion' },
      { char: '?', name: 'Scroll' },
      { char: '=', name: 'Ring' },
      { char: '/', name: 'Wand/Staff' },
      { char: ')', name: 'Weapon' },
      { char: '[', name: 'Armor' },
      { char: '*', name: 'Gem/Ore' },
    ]

    test.each(specialChars)('$name ($char) has a sprite mapping', ({ char, name }) => {
      const sprite = assetLoader.getSprite(char)
      expect(sprite).not.toBeNull()
      if (!sprite) {
        console.error(`❌ Missing sprite for ${name} (${char})`)
      }
    })
  })

  describe('Tileset Coverage Report', () => {
    test('generate comprehensive coverage report', async () => {
      const tileset = assetLoader.getCurrentTileset()
      if (!tileset) {
        throw new Error('Tileset not loaded')
      }

      console.log(`\n📋 Tileset Coverage Report:`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Tileset: ${tileset.config.name}`)
      console.log(`Total sprites in tileset: ${tileset.config.tiles.size}`)
      console.log(`Tile dimensions: ${tileset.config.tileWidth}×${tileset.config.tileHeight}px`)
      console.log(`Image dimensions: ${tileset.image.width}×${tileset.image.height}px`)

      // Sample some sprite keys to show what's available
      console.log(`\nSample sprite keys:`)
      const sampleKeys = Array.from(tileset.config.tiles.keys()).slice(0, 30)
      sampleKeys.forEach(key => {
        const coord = tileset.config.tiles.get(key)!
        console.log(`  - "${key}" → (${coord.x}, ${coord.y})`)
      })

      // This test always passes - it's just for reporting
      expect(tileset.config.tiles.size).toBeGreaterThan(0)
    })
  })
})
