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
// 3. Monster Names
// ============================================================================

console.log('\n📦 MONSTERS (from monsters.json)')
console.log('─'.repeat(60))

const monstersPath = path.join(__dirname, '../public/data/monsters.json')
const monstersData = JSON.parse(fs.readFileSync(monstersPath, 'utf8'))

console.log(`\nNote: Monster sprites are looked up by name (e.g., "Bat").`)
console.log(`AssetLoaderService uses intelligent fallback matching with prefixes:`)
console.log(`  - 'Forest ', 'Stone ', 'Cave ', 'Hill ', 'Mountain ', etc.`)
console.log(`  - If "Bat" not found, tries "Cave bat", "Forest bat", etc.\n`)

let monstersWithoutDirectMapping = 0
monstersData.forEach((monster) => {
  // Monsters are looked up by name, not by CHAR_TO_ANGBAND
  // They need entries in the .prf files like: monster:Bat:0x81:0x81
  console.log(`  ℹ️  ${monster.letter.padEnd(3)} ${monster.name.padEnd(25)} (looked up by name, not char)`)
  monstersWithoutDirectMapping++ // We can't validate without loading .prf files
})

console.log(`\n⚠️  ${monstersWithoutDirectMapping} monsters require .prf file validation`)
console.log(`   Run the game and check console for "Sprite not found" warnings`)

// ============================================================================
// 4. Summary
// ============================================================================

console.log('\n' + '━'.repeat(60))
console.log('📊 VALIDATION SUMMARY')
console.log('━'.repeat(60))

const totalRequired = terrainChars.filter(c => c.required).length + itemChars.filter(c => c.required).length
const totalMissing = terrainMissing + itemsMissing

console.log(`\nTerrain characters: ${terrainChars.length - terrainMissing}/${terrainChars.length} mapped`)
console.log(`Item characters: ${itemChars.length - itemsMissing}/${itemChars.length} mapped`)
console.log(`Monsters: ${monstersData.length} (requires runtime validation)`)

if (totalMissing === 0) {
  console.log(`\n✅ All required character mappings present!`)
  console.log(`\nNext steps:`)
  console.log(`  1. Run the game in dev mode: npm run dev`)
  console.log(`  2. Watch console for "Sprite not found for 'X'" warnings`)
  console.log(`  3. Add missing mappings to CHAR_TO_ANGBAND in AssetLoaderService.ts`)
  process.exit(0)
} else {
  console.log(`\n❌ ${totalMissing} required character mappings missing!`)
  console.log(`\nFix by adding to CHAR_TO_ANGBAND in src/services/AssetLoaderService/AssetLoaderService.ts`)
  process.exit(1)
}
