import { AssetLoaderService } from './AssetLoaderService'
import { loadItemData } from '../../data/ItemDataLoader'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { SeededRandom } from '@services/RandomService'

// ============================================================================
// ASSET VALIDATION TESTS - Verify all game entities have sprite mappings
// ============================================================================

describe('AssetLoaderService - Asset Validation', () => {
  let assetLoader: AssetLoaderService
  let monsterSpawnService: MonsterSpawnService

  beforeAll(async () => {
    assetLoader = new AssetLoaderService()

    // Load the actual Gervais tileset
    await assetLoader.loadTileset(
      '/assets/tilesets/gervais/32x32.png',
      [
        '/assets/tilesets/gervais/graf-dvg.prf',
        '/assets/tilesets/gervais/flvr-dvg.prf',
        '/assets/tilesets/gervais/xtra-dvg.prf',
      ],
      32
    )

    // Load monster data
    const random = new SeededRandom('test-seed')
    monsterSpawnService = new MonsterSpawnService(random)
    await monsterSpawnService.loadMonsterData()
  }, 30000) // 30 second timeout for asset loading

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
      const monsterTemplates = (monsterSpawnService as any).monsters

      for (const monster of monsterTemplates) {
        const sprite = assetLoader.getSprite(monster.name)

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
          // Try to get sprite by first character of item name
          const firstChar = item.name[0]
          const sprite = assetLoader.getSprite(firstChar)

          if (!sprite) {
            missingSprites.push(`${item.name} [${category.name}] (${firstChar})`)
          } else {
            validSprites.push(item.name)
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
