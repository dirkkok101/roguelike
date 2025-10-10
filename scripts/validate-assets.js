#!/usr/bin/env node

/**
 * Asset Validation Script
 *
 * Validates that all game entities (monsters, items, terrain) have
 * corresponding sprite mappings in the AssetLoaderService.
 *
 * This is a pre-flight check to catch missing sprites before they
 * cause runtime errors in the game.
 *
 * Usage: node scripts/validate-assets.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// PRF PARSER - Parse Angband .prf tile mapping files
// ============================================================================

/**
 * Parse a .prf file and extract monster/feat/object entries
 * @param {string} content - Raw .prf file content
 * @returns {Map<string, object>} Map of sprite keys to coordinates
 */
function parsePrfFile(content) {
  const map = new Map()
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(':')
    if (parts.length < 4) continue

    const type = parts[0]

    try {
      if (type === 'monster' && parts.length >= 4) {
        // monster:NAME:0xYY:0xXX
        const name = parts[1]
        const hexY = parseInt(parts[2], 16)
        const hexX = parseInt(parts[3], 16)
        map.set(name, { x: hexX, y: hexY, type: 'monster' })
      } else if (type === 'feat' && parts.length >= 5) {
        // feat:NAME:CONDITION:0xYY:0xXX
        const name = parts[1]
        const condition = parts[2]
        const hexY = parseInt(parts[3], 16)
        const hexX = parseInt(parts[4], 16)
        map.set(`${name}:${condition}`, { x: hexX, y: hexY, type: 'feat' })
        map.set(name, { x: hexX, y: hexY, type: 'feat' }) // Fallback without condition
      } else if (type === 'object' && parts.length >= 5) {
        // object:CATEGORY:NAME:0xYY:0xXX
        const category = parts[1]
        const name = parts[2]
        const hexY = parseInt(parts[3], 16)
        const hexX = parseInt(parts[4], 16)
        map.set(`${category}:${name}`, { x: hexX, y: hexY, type: 'object' })
        map.set(name, { x: hexX, y: hexY, type: 'object' })
      }
    } catch (err) {
      // Skip malformed lines
    }
  }

  return map
}

/**
 * Simulate AssetLoaderService.getSprite() fallback logic
 * @param {string} name - Monster/entity name to look up
 * @param {Map<string, object>} spriteMap - Parsed sprite map from .prf files
 * @returns {object|null} Sprite coordinate or null if not found
 */
function findSprite(name, spriteMap) {
  // 1. Try direct match
  if (spriteMap.has(name)) {
    return { key: name, coord: spriteMap.get(name) }
  }

  // 2. Try with prefixes and suffixes
  const prefixes = ['', 'Forest ', 'Stone ', 'Cave ', 'Hill ', 'Mountain ', 'Snow ', 'Scruffy little ']
  const suffixes = ['', ' scavenger', ' chieftain']

  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      const variant = `${prefix}${name}${suffix}`

      // Try exact case
      if (spriteMap.has(variant)) {
        return { key: variant, coord: spriteMap.get(variant) }
      }

      // Try lowercase
      const lowerVariant = variant.toLowerCase()
      for (const [key, coord] of spriteMap.entries()) {
        if (key.toLowerCase() === lowerVariant) {
          return { key, coord }
        }
      }
    }
  }

  // 3. Try suffix matching (e.g., "Bat" matches "Fruit bat")
  const lowerName = name.toLowerCase()
  for (const [key, coord] of spriteMap.entries()) {
    const lowerKey = key.toLowerCase()
    if (lowerKey.endsWith(lowerName) || lowerKey.endsWith(` ${lowerName}`)) {
      return { key, coord, fuzzy: true }
    }
  }

  return null
}

// Character to Angband feature name mapping (from AssetLoaderService)
const CHAR_TO_ANGBAND = {
  '@': ['<player>'], // Player character
  '.': ['FLOOR'], // Floor
  '#': ['GRANITE', 'PERM'], // Walls
  '+': ['CLOSED'], // Closed door
  "'": ['OPEN'], // Open door (single quote)
  '<': ['LESS'], // Up stairs
  '>': ['MORE'], // Down stairs
  '^': ['trap'], // Trap
  '%': ['RUBBLE'], // Rubble
  '*': ['MAGMA', 'QUARTZ'], // Veins
  '$': ['gold'], // Gold
  '!': ['potion'], // Potion
  '?': ['scroll'], // Scroll
  '=': ['ring'], // Ring
  '/': ['wand', 'staff'], // Wand/Staff
  ')': ['sword', 'weapon'], // Weapon
  '[': ['armor'], // Armor
}

console.log('\n🔍 Validating Asset Mappings...\n')
console.log('━'.repeat(60))

// ============================================================================
// 1. Terrain Characters
// ============================================================================

console.log('\n📦 TERRAIN CHARACTERS')
console.log('─'.repeat(60))

const terrainChars = [
  { char: '.', name: 'Floor', required: true },
  { char: '#', name: 'Wall (granite)', required: true },
  { char: '+', name: 'Closed door', required: true },
  { char: "'", name: 'Open door', required: true },
  { char: '<', name: 'Stairs up', required: true },
  { char: '>', name: 'Stairs down', required: true },
  { char: '^', name: 'Trap', required: true },
  { char: '%', name: 'Rubble', required: false },
  { char: '@', name: 'Player', required: true },
  { char: '$', name: 'Gold', required: true },
]

let terrainMissing = 0
terrainChars.forEach(({ char, name, required }) => {
  const hasMappings = CHAR_TO_ANGBAND[char]
  const status = hasMappings ? '✅' : (required ? '❌' : '⚠️ ')
  const mappings = hasMappings ? CHAR_TO_ANGBAND[char].join(', ') : 'NOT MAPPED'
  console.log(`${status} '${char}' ${name.padEnd(20)} → ${mappings}`)
  if (!hasMappings && required) terrainMissing++
})

// ============================================================================
// 2. Item Type Characters
// ============================================================================

console.log('\n📦 ITEM TYPE CHARACTERS')
console.log('─'.repeat(60))

const itemChars = [
  { char: '!', name: 'Potion', required: true },
  { char: '?', name: 'Scroll', required: true },
  { char: '=', name: 'Ring', required: true },
  { char: '/', name: 'Wand/Staff', required: true },
  { char: ')', name: 'Weapon', required: true },
  { char: '[', name: 'Armor', required: true },
  { char: '*', name: 'Gem/Ore', required: false },
]

let itemsMissing = 0
itemChars.forEach(({ char, name, required }) => {
  const hasMappings = CHAR_TO_ANGBAND[char]
  const status = hasMappings ? '✅' : (required ? '❌' : '⚠️ ')
  const mappings = hasMappings ? CHAR_TO_ANGBAND[char].join(', ') : 'NOT MAPPED'
  console.log(`${status} '${char}' ${name.padEnd(20)} → ${mappings}`)
  if (!hasMappings && required) itemsMissing++
})

// ============================================================================
// 3. Load and Parse .prf Files
// ============================================================================

console.log('\n📦 LOADING SPRITE MAPPINGS (.prf files)')
console.log('─'.repeat(60))

const prfFiles = [
  path.join(__dirname, '../public/assets/tilesets/gervais/graf-dvg.prf'),
  path.join(__dirname, '../public/assets/tilesets/gervais/flvr-dvg.prf'),
  path.join(__dirname, '../public/assets/tilesets/gervais/xtra-dvg.prf'),
]

const spriteMap = new Map()
let totalPrfEntries = 0

for (const prfFile of prfFiles) {
  try {
    const content = fs.readFileSync(prfFile, 'utf8')
    const fileMap = parsePrfFile(content)

    // Merge into main map
    for (const [key, value] of fileMap.entries()) {
      spriteMap.set(key, value)
    }

    console.log(`✅ Loaded ${path.basename(prfFile).padEnd(20)} (${fileMap.size} entries)`)
    totalPrfEntries += fileMap.size
  } catch (err) {
    console.log(`❌ Failed to load ${path.basename(prfFile)}: ${err.message}`)
  }
}

console.log(`\nTotal sprite mappings: ${spriteMap.size}`)

// ============================================================================
// 4. Monster Validation
// ============================================================================

console.log('\n📦 MONSTER SPRITE VALIDATION')
console.log('─'.repeat(60))

const monstersPath = path.join(__dirname, '../public/data/monsters.json')
const monstersData = JSON.parse(fs.readFileSync(monstersPath, 'utf8'))

console.log(`\nValidating ${monstersData.length} monsters from monsters.json`)
console.log(`Lookup logic: direct match → prefix variants → suffix matching\n`)

let monstersMapped = 0
let monstersMissing = 0
const missingMonsters = []

monstersData.forEach((monster) => {
  const sprite = findSprite(monster.name, spriteMap)

  if (sprite) {
    const matchType = sprite.fuzzy ? '(fuzzy)' : '(exact)'
    const coordStr = `0x${sprite.coord.x.toString(16).toUpperCase().padStart(2, '0')}:0x${sprite.coord.y.toString(16).toUpperCase().padStart(2, '0')}`
    console.log(`✅ ${monster.letter.padEnd(3)} ${monster.name.padEnd(20)} → "${sprite.key}" ${matchType} ${coordStr}`)
    monstersMapped++
  } else {
    console.log(`❌ ${monster.letter.padEnd(3)} ${monster.name.padEnd(20)} → NOT FOUND`)
    missingMonsters.push(monster)
    monstersMissing++
  }
})

if (monstersMissing > 0) {
  console.log(`\n⚠️  ${monstersMissing} monsters missing sprite mappings:`)
  missingMonsters.forEach(m => {
    console.log(`   - ${m.name} (${m.letter})`)
  })
}

// ============================================================================
// 5. Summary
// ============================================================================

console.log('\n' + '━'.repeat(60))
console.log('📊 VALIDATION SUMMARY')
console.log('━'.repeat(60))

const totalRequired = terrainChars.filter(c => c.required).length + itemChars.filter(c => c.required).length
const totalMissing = terrainMissing + itemsMissing + monstersMissing

console.log(`\nTerrain characters: ${terrainChars.length - terrainMissing}/${terrainChars.length} mapped`)
console.log(`Item characters: ${itemChars.length - itemsMissing}/${itemChars.length} mapped`)
console.log(`Monsters: ${monstersMapped}/${monstersData.length} mapped`)
console.log(`Total sprite entries in .prf files: ${spriteMap.size}`)

if (totalMissing === 0) {
  console.log(`\n✅ All required mappings present!`)
  console.log(`\nAll game entities have sprite mappings and are ready to render.`)
  process.exit(0)
} else {
  console.log(`\n❌ ${totalMissing} entity mappings missing!`)
  console.log(`\nFixes needed:`)
  if (terrainMissing > 0 || itemsMissing > 0) {
    console.log(`  1. Add missing character mappings to CHAR_TO_ANGBAND in AssetLoaderService.ts`)
  }
  if (monstersMissing > 0) {
    console.log(`  2. Add missing monster sprites to .prf files or update monsters.json names`)
    console.log(`     Missing: ${missingMonsters.map(m => m.name).join(', ')}`)
  }
  process.exit(1)
}
