import { MonsterBehavior } from '@game/core/core'
import * as fs from 'fs'
import * as path from 'path'

// Load monsters.json using fs (Jest-compatible)
const monstersPath = path.join(__dirname, '../../../public/data/monsters.json')
const monstersData = fs.readFileSync(monstersPath, 'utf-8')
const monsters = JSON.parse(monstersData) as any[]

describe('MonsterSpawnService - Data Validation', () => {
  // All valid special ability flags that are implemented in the codebase
  const validSpecialFlags = [
    'rusts_armor',      // Aquator - SpecialAbilityService line 273
    'freezes',          // Ice Monster - SpecialAbilityService line 279
    'confuses',         // Medusa - SpecialAbilityService line 285
    'drains_strength',  // Rattlesnake - SpecialAbilityService line 291
    'drains_xp',        // Wraith - SpecialAbilityService line 297
    'drains_max_hp',    // Vampire - SpecialAbilityService line 303
    'holds',            // Venus Flytrap - SpecialAbilityService line 309
    'steals',           // Leprechaun, Nymph - MonsterTurnService line 210
    'regeneration',     // Troll, Griffin, Vampire - SpecialAbilityService line 183
    'breath_weapon',    // Dragon - SpecialAbilityService line 229
    'flying',           // Bat, Kestrel, Griffin - Passive ability
    'invisible',        // Phantom - Passive ability
    'mean',             // Various - Spawn state flag
    'teleport',         // Nymph - Behavior flag (not implemented as on-hit ability)
  ]

  const validBehaviors = [
    'SMART',
    'SIMPLE',
    'GREEDY',
    'ERRATIC',
    'THIEF',
    'STATIONARY',
    'COWARD',
  ]

  describe('Data File Loading', () => {
    test('monsters.json loads correctly', () => {
      expect(monsters).toBeDefined()
      expect(Array.isArray(monsters)).toBe(true)
    })

    test('has exactly 26 monsters (A-Z)', () => {
      expect(monsters).toHaveLength(26)
    })

    test('all monsters have required fields', () => {
      monsters.forEach((monster) => {
        expect(monster.letter).toBeDefined()
        expect(monster.name).toBeDefined()
        expect(monster.hp).toBeDefined()
        expect(monster.ac).toBeDefined()
        expect(monster.damage).toBeDefined()
        expect(monster.xpValue).toBeDefined()
        expect(monster.level).toBeDefined()
        expect(monster.speed).toBeDefined()
        expect(monster.rarity).toBeDefined()
        expect(monster.mean).toBeDefined()
        expect(monster.aiProfile).toBeDefined()
      })
    })
  })

  describe('Letter Validation', () => {
    test('all monster letters are unique', () => {
      const letters = monsters.map((m) => m.letter)
      const uniqueLetters = new Set(letters)
      expect(uniqueLetters.size).toBe(26)
    })

    test('all monster letters are A-Z', () => {
      monsters.forEach((monster) => {
        expect(monster.letter).toMatch(/^[A-Z]$/)
      })
    })

    test('all 26 letters A-Z are present', () => {
      const letters = monsters.map((m) => m.letter).sort()
      const expectedLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      expect(letters).toEqual(expectedLetters)
    })
  })

  describe('AI Profile Validation', () => {
    test('all monsters have valid behavior types', () => {
      monsters.forEach((monster) => {
        expect(validBehaviors).toContain(monster.aiProfile.behavior)
      })
    })

    test('all monsters have intelligence between 1-10', () => {
      monsters.forEach((monster) => {
        expect(monster.aiProfile.intelligence).toBeGreaterThanOrEqual(1)
        expect(monster.aiProfile.intelligence).toBeLessThanOrEqual(10)
      })
    })

    test('all monsters have valid aggro range', () => {
      monsters.forEach((monster) => {
        expect(monster.aiProfile.aggroRange).toBeGreaterThan(0)
        expect(monster.aiProfile.aggroRange).toBeLessThanOrEqual(20)
      })
    })

    test('all monsters have flee threshold between 0.0-1.0', () => {
      monsters.forEach((monster) => {
        expect(monster.aiProfile.fleeThreshold).toBeGreaterThanOrEqual(0.0)
        expect(monster.aiProfile.fleeThreshold).toBeLessThanOrEqual(1.0)
      })
    })
  })

  describe('Special Ability Flags Validation', () => {
    test('all special ability flags are valid (no typos)', () => {
      const invalidFlags: string[] = []

      monsters.forEach((monster) => {
        if (monster.aiProfile.special && monster.aiProfile.special.length > 0) {
          monster.aiProfile.special.forEach((flag: string) => {
            if (!validSpecialFlags.includes(flag)) {
              invalidFlags.push(`${monster.name} (${monster.letter}): "${flag}"`)
            }
          })
        }
      })

      if (invalidFlags.length > 0) {
        throw new Error(
          `Found invalid special ability flags:\n${invalidFlags.join('\n')}\n\n` +
            `Valid flags are:\n${validSpecialFlags.join(', ')}`
        )
      }

      expect(invalidFlags).toHaveLength(0)
    })

    test('no duplicate flags in same monster', () => {
      monsters.forEach((monster) => {
        if (monster.aiProfile.special && monster.aiProfile.special.length > 0) {
          const flags = monster.aiProfile.special
          const uniqueFlags = new Set(flags)
          expect(uniqueFlags.size).toBe(flags.length)
        }
      })
    })

    test('special flags use correct naming convention', () => {
      const badNaming: string[] = []
      const allowedExceptions = ['flying', 'mean', 'invisible', 'teleport', 'regeneration'] // Passive abilities/states

      monsters.forEach((monster) => {
        if (monster.aiProfile.special && monster.aiProfile.special.length > 0) {
          monster.aiProfile.special.forEach((flag: string) => {
            // Skip allowed exceptions (passive abilities)
            if (allowedExceptions.includes(flag)) {
              return
            }

            // Check for common mistakes
            if (
              flag.includes(' ') || // spaces instead of underscores
              flag.endsWith('ed') // past tense (e.g., "drained")
            ) {
              badNaming.push(`${monster.name} (${monster.letter}): "${flag}"`)
            }
          })
        }
      })

      if (badNaming.length > 0) {
        throw new Error(
          `Found flags with incorrect naming convention:\n${badNaming.join('\n')}\n\n` +
            `Convention: Action flags use present-tense verbs with underscores (e.g., "drains_strength")\n` +
            `Passive/state flags can use gerunds or adjectives (e.g., "flying", "invisible", "mean")`
        )
      }

      expect(badNaming).toHaveLength(0)
    })
  })

  describe('Stat Validation', () => {
    test('all monsters have positive HP dice', () => {
      monsters.forEach((monster) => {
        expect(monster.hp).toMatch(/^\d+d\d+$/)
      })
    })

    test('all monsters have valid damage dice (including 0d0)', () => {
      monsters.forEach((monster) => {
        // Damage can be 0d0, single dice (1d6), or multiple attacks (1d6+2d8)
        expect(monster.damage).toMatch(/^(\d+d\d+)(\+\d+d\d+)*$/)
      })
    })

    test('all monsters have positive XP value', () => {
      monsters.forEach((monster) => {
        expect(monster.xpValue).toBeGreaterThan(0)
      })
    })

    test('all monsters have valid level (1-10)', () => {
      monsters.forEach((monster) => {
        expect(monster.level).toBeGreaterThanOrEqual(1)
        expect(monster.level).toBeLessThanOrEqual(10)
      })
    })

    test('all monsters have valid speed (5-20)', () => {
      monsters.forEach((monster) => {
        expect(monster.speed).toBeGreaterThanOrEqual(5)
        expect(monster.speed).toBeLessThanOrEqual(20)
      })
    })

    test('all monsters have valid rarity', () => {
      const validRarities = ['common', 'uncommon', 'rare']
      monsters.forEach((monster) => {
        expect(validRarities).toContain(monster.rarity)
      })
    })
  })

  describe('Logical Consistency', () => {
    test('mean property is consistent with monster data', () => {
      // The mean property is the source of truth (boolean at root level)
      // Some monsters may also have 'mean' in special array, but it's optional
      monsters.forEach((monster) => {
        expect(typeof monster.mean).toBe('boolean')
      })
    })

    test('THIEF behavior monsters have steals flag', () => {
      const thiefMonsters = monsters.filter(
        (m) => m.aiProfile.behavior === 'THIEF'
      )
      thiefMonsters.forEach((monster) => {
        expect(monster.aiProfile.special).toContain('steals')
      })
    })

    test('STATIONARY monsters have low aggro range', () => {
      const stationaryMonsters = monsters.filter(
        (m) => m.aiProfile.behavior === 'STATIONARY'
      )
      stationaryMonsters.forEach((monster) => {
        // Stationary monsters should have very low aggro (they don't chase)
        expect(monster.aiProfile.aggroRange).toBeLessThanOrEqual(3)
      })
    })

    test('monsters with drains_max_hp flag have damage', () => {
      const drainMonsters = monsters.filter((m) =>
        m.aiProfile.special?.includes('drains_max_hp')
      )
      drainMonsters.forEach((monster) => {
        // Vampire does 1d10 damage
        expect(monster.damage).not.toBe('0d0')
      })
    })
  })

  describe('Coverage - All Implemented Abilities Have Monsters', () => {
    test('every valid flag is used by at least one monster', () => {
      const usedFlags = new Set<string>()

      monsters.forEach((monster) => {
        if (monster.aiProfile.special) {
          monster.aiProfile.special.forEach((flag: string) => {
            usedFlags.add(flag)
          })
        }
      })

      const unusedFlags = validSpecialFlags.filter((flag) => !usedFlags.has(flag))

      if (unusedFlags.length > 0) {
        throw new Error(
          `The following special ability flags are defined as valid but not used by any monster:\n` +
            unusedFlags.join(', ') +
            `\n\nEither:\n` +
            `1. Remove them from validSpecialFlags array (if ability was removed)\n` +
            `2. Add them to a monster in monsters.json (if ability exists but unused)`
        )
      }

      expect(unusedFlags).toHaveLength(0)
    })
  })

  describe('Regression Prevention - The Fixed 9 Monsters', () => {
    test('Aquator has "rusts_armor" not "rust_armor"', () => {
      const aquator = monsters.find((m) => m.letter === 'A')
      expect(aquator?.aiProfile.special).toContain('rusts_armor')
      expect(aquator?.aiProfile.special).not.toContain('rust_armor')
    })

    test('Ice Monster has "freezes" not "freeze_player"', () => {
      const iceMonster = monsters.find((m) => m.letter === 'I')
      expect(iceMonster?.aiProfile.special).toContain('freezes')
      expect(iceMonster?.aiProfile.special).not.toContain('freeze_player')
    })

    test('Leprechaun has "steals" not "steal_gold"', () => {
      const leprechaun = monsters.find((m) => m.letter === 'L')
      expect(leprechaun?.aiProfile.special).toContain('steals')
      expect(leprechaun?.aiProfile.special).not.toContain('steal_gold')
    })

    test('Medusa has "confuses" not "confuse_player"', () => {
      const medusa = monsters.find((m) => m.letter === 'M')
      expect(medusa?.aiProfile.special).toContain('confuses')
      expect(medusa?.aiProfile.special).not.toContain('confuse_player')
    })

    test('Nymph has "steals" not "steal_item"', () => {
      const nymph = monsters.find((m) => m.letter === 'N')
      expect(nymph?.aiProfile.special).toContain('steals')
      expect(nymph?.aiProfile.special).not.toContain('steal_item')
    })

    test('Rattlesnake has "drains_strength" not "drain_strength"', () => {
      const rattlesnake = monsters.find((m) => m.letter === 'R')
      expect(rattlesnake?.aiProfile.special).toContain('drains_strength')
      expect(rattlesnake?.aiProfile.special).not.toContain('drain_strength')
    })

    test('Vampire has "drains_max_hp" not "drain_max_hp"', () => {
      const vampire = monsters.find((m) => m.letter === 'V')
      expect(vampire?.aiProfile.special).toContain('drains_max_hp')
      expect(vampire?.aiProfile.special).not.toContain('drain_max_hp')
    })

    test('Venus Flytrap has "holds" not "hold_player"', () => {
      const flytrap = monsters.find((m) => m.letter === 'F')
      expect(flytrap?.aiProfile.special).toContain('holds')
      expect(flytrap?.aiProfile.special).not.toContain('hold_player')
    })

    test('Wraith has "drains_xp" not "drain_xp"', () => {
      const wraith = monsters.find((m) => m.letter === 'W')
      expect(wraith?.aiProfile.special).toContain('drains_xp')
      expect(wraith?.aiProfile.special).not.toContain('drain_xp')
    })
  })
})
