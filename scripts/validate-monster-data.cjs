#!/usr/bin/env node

/**
 * Monster Data Validation Script
 *
 * Validates monsters.json against expected schema and conventions.
 * Runs as part of build and test processes to catch data issues early.
 *
 * Usage: node scripts/validate-monster-data.js
 * Exit codes: 0 = success, 1 = validation errors found
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Valid special ability flags (must match SpecialAbilityFlag enum in src/types/core/core.ts)
const validSpecialFlags = [
  'rusts_armor',      // SpecialAbilityFlag.RUSTS_ARMOR
  'freezes',          // SpecialAbilityFlag.FREEZES
  'confuses',         // SpecialAbilityFlag.CONFUSES
  'drains_strength',  // SpecialAbilityFlag.DRAINS_STRENGTH
  'drains_xp',        // SpecialAbilityFlag.DRAINS_XP
  'drains_max_hp',    // SpecialAbilityFlag.DRAINS_MAX_HP
  'holds',            // SpecialAbilityFlag.HOLDS
  'steals',           // SpecialAbilityFlag.STEALS
  'regeneration',     // SpecialAbilityFlag.REGENERATION
  'breath_weapon',    // SpecialAbilityFlag.BREATH_WEAPON
  'flying',           // SpecialAbilityFlag.FLYING
  'invisible',        // SpecialAbilityFlag.INVISIBLE
  'mean',             // SpecialAbilityFlag.MEAN
  'teleport',         // SpecialAbilityFlag.TELEPORT
];

const validBehaviors = [
  'SMART',
  'SIMPLE',
  'GREEDY',
  'ERRATIC',
  'THIEF',
  'STATIONARY',
  'COWARD',
];

const validRarities = ['common', 'uncommon', 'rare'];

function validateMonsters() {
  const errors = [];
  const warnings = [];

  // Load monsters.json
  const monstersPath = path.join(__dirname, '../public/data/monsters.json');
  let monsters;

  try {
    const data = fs.readFileSync(monstersPath, 'utf-8');
    monsters = JSON.parse(data);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to load monsters.json:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }

  console.log(`${colors.cyan}🔍 Validating monsters.json...${colors.reset}\n`);

  // Validate array
  if (!Array.isArray(monsters)) {
    errors.push('monsters.json must be an array');
    return { errors, warnings };
  }

  // Validate count
  if (monsters.length !== 26) {
    errors.push(`Expected 26 monsters (A-Z), found ${monsters.length}`);
  }

  // Track letters
  const letters = new Set();
  const names = new Set();

  // Validate each monster
  monsters.forEach((monster, index) => {
    const prefix = `Monster ${index + 1} (${monster.letter || '?'} - ${monster.name || '?'})`;

    // Required fields
    if (!monster.letter) errors.push(`${prefix}: Missing 'letter' field`);
    if (!monster.name) errors.push(`${prefix}: Missing 'name' field`);
    if (!monster.hp) errors.push(`${prefix}: Missing 'hp' field`);
    if (monster.ac === undefined) errors.push(`${prefix}: Missing 'ac' field`);
    if (!monster.damage) errors.push(`${prefix}: Missing 'damage' field`);
    if (monster.xpValue === undefined) errors.push(`${prefix}: Missing 'xpValue' field`);
    if (!monster.level) errors.push(`${prefix}: Missing 'level' field`);
    if (!monster.speed) errors.push(`${prefix}: Missing 'speed' field`);
    if (!monster.rarity) errors.push(`${prefix}: Missing 'rarity' field`);
    if (monster.mean === undefined) errors.push(`${prefix}: Missing 'mean' field`);
    if (!monster.aiProfile) errors.push(`${prefix}: Missing 'aiProfile' field`);

    // Letter validation
    if (monster.letter) {
      if (!/^[A-Z]$/.test(monster.letter)) {
        errors.push(`${prefix}: Letter must be A-Z, got '${monster.letter}'`);
      }
      if (letters.has(monster.letter)) {
        errors.push(`${prefix}: Duplicate letter '${monster.letter}'`);
      }
      letters.add(monster.letter);
    }

    // Name validation
    if (monster.name) {
      if (names.has(monster.name)) {
        warnings.push(`${prefix}: Duplicate name '${monster.name}'`);
      }
      names.add(monster.name);
    }

    // HP validation
    if (monster.hp && !/^\d+d\d+$/.test(monster.hp)) {
      errors.push(`${prefix}: Invalid HP format '${monster.hp}', expected XdY (e.g., 1d8)`);
    }

    // Damage validation
    if (monster.damage && !/^(\d+d\d+)(\+\d+d\d+)*$/.test(monster.damage)) {
      errors.push(`${prefix}: Invalid damage format '${monster.damage}', expected XdY or XdY+XdY`);
    }

    // XP validation
    if (monster.xpValue !== undefined && monster.xpValue <= 0) {
      errors.push(`${prefix}: XP value must be positive, got ${monster.xpValue}`);
    }

    // Level validation
    if (monster.level && (monster.level < 1 || monster.level > 10)) {
      errors.push(`${prefix}: Level must be 1-10, got ${monster.level}`);
    }

    // Speed validation
    if (monster.speed && (monster.speed < 5 || monster.speed > 20)) {
      warnings.push(`${prefix}: Speed ${monster.speed} is outside typical range (5-20)`);
    }

    // Rarity validation
    if (monster.rarity && !validRarities.includes(monster.rarity)) {
      errors.push(`${prefix}: Invalid rarity '${monster.rarity}', expected one of: ${validRarities.join(', ')}`);
    }

    // Mean validation
    if (monster.mean !== undefined && typeof monster.mean !== 'boolean') {
      errors.push(`${prefix}: 'mean' must be boolean, got ${typeof monster.mean}`);
    }

    // AI Profile validation
    if (monster.aiProfile) {
      if (!monster.aiProfile.behavior) {
        errors.push(`${prefix}: Missing aiProfile.behavior`);
      } else if (!validBehaviors.includes(monster.aiProfile.behavior)) {
        errors.push(`${prefix}: Invalid behavior '${monster.aiProfile.behavior}', expected one of: ${validBehaviors.join(', ')}`);
      }

      if (monster.aiProfile.intelligence === undefined) {
        errors.push(`${prefix}: Missing aiProfile.intelligence`);
      } else if (monster.aiProfile.intelligence < 1 || monster.aiProfile.intelligence > 10) {
        warnings.push(`${prefix}: Intelligence ${monster.aiProfile.intelligence} is outside typical range (1-10)`);
      }

      if (monster.aiProfile.aggroRange === undefined) {
        errors.push(`${prefix}: Missing aiProfile.aggroRange`);
      } else if (monster.aiProfile.aggroRange <= 0) {
        errors.push(`${prefix}: Aggro range must be positive, got ${monster.aiProfile.aggroRange}`);
      }

      if (monster.aiProfile.fleeThreshold === undefined) {
        errors.push(`${prefix}: Missing aiProfile.fleeThreshold`);
      } else if (monster.aiProfile.fleeThreshold < 0 || monster.aiProfile.fleeThreshold > 1) {
        errors.push(`${prefix}: Flee threshold must be 0.0-1.0, got ${monster.aiProfile.fleeThreshold}`);
      }

      // Special abilities validation
      if (monster.aiProfile.special) {
        if (!Array.isArray(monster.aiProfile.special)) {
          errors.push(`${prefix}: aiProfile.special must be an array`);
        } else {
          monster.aiProfile.special.forEach((flag) => {
            if (!validSpecialFlags.includes(flag)) {
              errors.push(`${prefix}: Invalid special ability flag '${flag}', expected one of:\n  ${validSpecialFlags.join(', ')}`);
            }
          });

          // Check for duplicates
          const uniqueFlags = new Set(monster.aiProfile.special);
          if (uniqueFlags.size !== monster.aiProfile.special.length) {
            warnings.push(`${prefix}: Duplicate flags in special array`);
          }
        }
      }
    }
  });

  // Check all letters A-Z present
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const missingLetters = allLetters.filter((letter) => !letters.has(letter));
  if (missingLetters.length > 0) {
    errors.push(`Missing letters: ${missingLetters.join(', ')}`);
  }

  return { errors, warnings };
}

// Run validation
const { errors, warnings } = validateMonsters();

// Print warnings
if (warnings.length > 0) {
  console.log(`${colors.yellow}⚠️  Warnings (${warnings.length}):${colors.reset}`);
  warnings.forEach((warning) => console.log(`  ${colors.yellow}•${colors.reset} ${warning}`));
  console.log('');
}

// Print errors
if (errors.length > 0) {
  console.log(`${colors.red}❌ Validation Failed (${errors.length} error${errors.length === 1 ? '' : 's'}):${colors.reset}`);
  errors.forEach((error) => console.log(`  ${colors.red}•${colors.reset} ${error}`));
  console.log('');
  console.log(`${colors.red}Fix the errors above and run validation again.${colors.reset}`);
  process.exit(1);
}

// Success
console.log(`${colors.green}✅ Validation Passed!${colors.reset}`);
console.log(`   • All 26 monsters validated successfully`);
console.log(`   • All special ability flags are correct`);
console.log(`   • All required fields present`);
if (warnings.length > 0) {
  console.log(`${colors.yellow}   • ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (non-blocking)${colors.reset}`);
}
console.log('');
process.exit(0);
