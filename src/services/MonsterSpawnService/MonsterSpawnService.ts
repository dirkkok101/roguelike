import {
  Monster,
  MonsterTemplate,
  Room,
  Tile,
  Position,
  MonsterState,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'

/**
 * MonsterSpawnService
 *
 * Handles all monster spawning logic for dungeon level generation.
 * Loads monster definitions from JSON data file and implements weighted
 * spawning based on dungeon depth and monster rarity.
 *
 * Design Principles:
 * - Data-driven: Loads monster templates from monsters.json (single source of truth)
 * - Progressive difficulty: Spawn count and selection scale with dungeon depth
 * - Weighted distribution: Rarity and level determine spawn probability
 * - Energy system integration: Variable monster speeds (slow/normal/fast)
 *
 * Dependencies: IRandomService (dice rolls, weighted selection)
 */
export class MonsterSpawnService {
  private monsterTemplates: MonsterTemplate[] = []
  private dataLoaded = false

  constructor(private random: IRandomService) {}

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Load monster data from JSON file
   *
   * Should be called once at game initialization before any level generation.
   * Fetches monsters.json, validates structure, and caches in memory.
   *
   * @throws Error if fetch fails or JSON is malformed
   */
  async loadMonsterData(): Promise<void> {
    // Prevent duplicate loads
    if (this.dataLoaded) {
      return
    }

    try {
      const response = await fetch('/data/monsters.json')

      if (!response.ok) {
        throw new Error(`Failed to fetch monsters.json: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Validate and store
      this.monsterTemplates = this.validateMonsterData(data)
      this.dataLoaded = true
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load monster data: ${error.message}`)
      }
      throw new Error('Failed to load monster data: Unknown error')
    }
  }

  /**
   * Spawn monsters for a dungeon level
   *
   * Creates monsters appropriate for the given depth with weighted selection.
   * Places monsters in random valid positions within rooms.
   *
   * @param rooms - Room structures to spawn monsters in
   * @param tiles - Tile grid for walkability checks
   * @param depth - Dungeon level (1-10), determines spawn count and monster selection
   * @returns Array of spawned Monster instances
   */
  spawnMonsters(rooms: Room[], tiles: Tile[][], depth: number): Monster[] {
    // Ensure data is loaded
    if (!this.dataLoaded) {
      throw new Error('Monster data not loaded. Call loadMonsterData() first.')
    }

    const monsters: Monster[] = []
    const occupied = new Set<string>() // Track occupied positions

    // Determine how many monsters to spawn
    const spawnCount = this.getSpawnCount(depth)

    // Filter monsters appropriate for this depth
    const availableTemplates = this.filterMonstersByDepth(depth)

    if (availableTemplates.length === 0) {
      // No monsters available (shouldn't happen with proper data)
      return monsters
    }

    // Spawn monsters
    for (let i = 0; i < spawnCount; i++) {
      // Select monster template with weighted randomness
      const template = this.selectWeightedMonster(availableTemplates)

      // Select random valid position
      const position = this.selectSpawnPosition(rooms, tiles, occupied)

      if (!position) {
        // Could not find valid position, skip this monster
        continue
      }

      // Mark position as occupied
      occupied.add(`${position.x},${position.y}`)

      // Create monster from template
      const monster = this.createMonster(
        template,
        position,
        `monster-${depth}-${i}-${this.random.nextInt(1000, 9999)}`
      )

      monsters.push(monster)
    }

    return monsters
  }

  /**
   * Calculate spawn count for a dungeon depth
   *
   * Formula: Math.min((depth * 2) + 3, 20)
   * - Level 1: 5 monsters
   * - Level 5: 13 monsters
   * - Level 10: 20 monsters (capped)
   *
   * @param depth - Dungeon level (1-10)
   * @returns Number of monsters to spawn
   */
  getSpawnCount(depth: number): number {
    return Math.min(depth * 2 + 3, 20)
  }

  // ============================================================================
  // PRIVATE HELPERS (to be implemented in later phases)
  // ============================================================================

  /**
   * Validate monster data structure
   * @private
   */
  private validateMonsterData(data: any[]): MonsterTemplate[] {
    if (!Array.isArray(data)) {
      throw new Error('Monster data must be an array')
    }

    if (data.length === 0) {
      throw new Error('Monster data array is empty')
    }

    const validatedTemplates: MonsterTemplate[] = []

    for (let i = 0; i < data.length; i++) {
      const monster = data[i]

      // Check required fields exist
      const requiredFields = [
        'letter',
        'name',
        'hp',
        'ac',
        'damage',
        'xpValue',
        'level',
        'speed',
        'rarity',
        'mean',
        'aiProfile',
      ]

      for (const field of requiredFields) {
        if (!(field in monster)) {
          throw new Error(`Monster at index ${i} missing required field: ${field}`)
        }
      }

      // Validate types
      if (typeof monster.letter !== 'string' || monster.letter.length !== 1) {
        throw new Error(`Monster at index ${i}: letter must be a single character string`)
      }

      if (typeof monster.name !== 'string') {
        throw new Error(`Monster at index ${i}: name must be a string`)
      }

      if (typeof monster.hp !== 'string' || !monster.hp.match(/^\d+d\d+(\+\d+d\d+)*$/)) {
        throw new Error(`Monster at index ${i}: hp must be dice notation (e.g., "1d8", "2d8")`)
      }

      if (typeof monster.ac !== 'number') {
        throw new Error(`Monster at index ${i}: ac must be a number`)
      }

      if (typeof monster.damage !== 'string') {
        throw new Error(`Monster at index ${i}: damage must be a string`)
      }

      if (typeof monster.xpValue !== 'number') {
        throw new Error(`Monster at index ${i}: xpValue must be a number`)
      }

      if (typeof monster.level !== 'number' || monster.level < 1 || monster.level > 10) {
        throw new Error(`Monster at index ${i}: level must be a number between 1 and 10`)
      }

      if (typeof monster.speed !== 'number' || monster.speed < 1) {
        throw new Error(`Monster at index ${i}: speed must be a positive number`)
      }

      if (!['common', 'uncommon', 'rare'].includes(monster.rarity)) {
        throw new Error(
          `Monster at index ${i}: rarity must be "common", "uncommon", or "rare"`
        )
      }

      if (typeof monster.mean !== 'boolean') {
        throw new Error(`Monster at index ${i}: mean must be a boolean`)
      }

      if (typeof monster.aiProfile !== 'object' || monster.aiProfile === null) {
        throw new Error(`Monster at index ${i}: aiProfile must be an object`)
      }

      // All validation passed, add to results
      validatedTemplates.push(monster as MonsterTemplate)
    }

    return validatedTemplates
  }

  /**
   * Filter monster templates by dungeon depth
   *
   * Allows monsters up to 2 levels above current depth (e.g., depth 1 allows levels 1-3).
   * Ensures at least some monsters are available even on deep levels.
   * Boss monsters (level >= 10) have additional restrictions (see isBossMonster).
   *
   * @private
   */
  private filterMonstersByDepth(depth: number): MonsterTemplate[] {
    const filtered = this.monsterTemplates.filter((template) => {
      // Basic level check: monster.level <= depth + 2
      if (template.level > depth + 2) {
        return false
      }

      // Boss monsters have additional restrictions
      if (this.isBossMonster(template)) {
        // Boss monsters only spawn on deep levels (depth >= level - 1)
        // E.g., Dragon (level 10) only spawns on depth 9-10
        return depth >= template.level - 1
      }

      return true
    })

    // Fallback: if no monsters match, return all (shouldn't happen with proper data)
    return filtered.length > 0 ? filtered : this.monsterTemplates
  }

  /**
   * Select monster template with weighted randomness
   *
   * Rarity weights:
   * - common: 50% (weight 5)
   * - uncommon: 30% (weight 3)
   * - rare: 20% (weight 2)
   *
   * @private
   */
  private selectWeightedMonster(templates: MonsterTemplate[]): MonsterTemplate {
    // Map rarity to weight
    const rarityWeights: Record<string, number> = {
      common: 5, // 50% (5/10)
      uncommon: 3, // 30% (3/10)
      rare: 2, // 20% (2/10)
    }

    // Calculate total weight
    const weights = templates.map((t) => rarityWeights[t.rarity] || 1)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    // Pick random weighted value
    const randomValue = this.random.nextInt(1, totalWeight)

    // Find template at weighted index
    let cumulativeWeight = 0
    for (let i = 0; i < templates.length; i++) {
      cumulativeWeight += weights[i]
      if (randomValue <= cumulativeWeight) {
        return templates[i]
      }
    }

    // Fallback (should never reach here)
    return this.random.pickRandom(templates)
  }

  /**
   * Check if monster is boss-tier (level >= 10)
   * @private
   */
  private isBossMonster(template: MonsterTemplate): boolean {
    return template.level >= 10
  }

  /**
   * Select random valid spawn position in rooms
   * @private
   */
  private selectSpawnPosition(
    rooms: Room[],
    tiles: Tile[][],
    occupied: Set<string>
  ): Position | null {
    const maxAttempts = 10

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Pick random room
      const room = this.random.pickRandom(rooms)

      // Pick random position inside room (not on walls)
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)

      const key = `${x},${y}`

      // Check if position is valid
      if (!occupied.has(key) && tiles[y]?.[x]?.walkable) {
        return { x, y }
      }
    }

    // Could not find valid position after max attempts
    return null
  }

  /**
   * Create Monster instance from MonsterTemplate
   * @private
   */
  private createMonster(
    template: MonsterTemplate,
    position: Position,
    id: string
  ): Monster {
    // Roll HP from dice notation
    const hp = this.random.roll(template.hp)

    // Determine initial state based on "mean" flag
    const isAwake = template.mean
    const state = template.mean ? MonsterState.HUNTING : MonsterState.SLEEPING

    return {
      id,
      letter: template.letter,
      name: template.name,
      position,
      hp,
      maxHp: hp,
      ac: template.ac,
      damage: template.damage,
      xpValue: template.xpValue,
      level: template.level,
      speed: template.speed, // Variable speed from template
      energy: this.random.nextInt(0, 99), // Random initial energy for staggered starts
      aiProfile: template.aiProfile,
      isAsleep: !isAwake, // Inverse of isAwake
      isAwake,
      state,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      isInvisible: false, // Default visible (Phantoms override this)
    }
  }
}
