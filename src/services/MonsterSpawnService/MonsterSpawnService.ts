import { Monster, MonsterTemplate, Room, Tile, Position } from '@game/core/core'
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
    // TODO: Implement in Phase 3.4
    throw new Error('Not implemented')
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
    // TODO: Implement in Phase 3.1
    throw new Error('Not implemented')
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
   * @private
   */
  private filterMonstersByDepth(depth: number): MonsterTemplate[] {
    // TODO: Implement in Phase 4.1
    throw new Error('Not implemented')
  }

  /**
   * Select monster template with weighted randomness
   * @private
   */
  private selectWeightedMonster(templates: MonsterTemplate[]): MonsterTemplate {
    // TODO: Implement in Phase 4.2
    throw new Error('Not implemented')
  }

  /**
   * Check if monster is boss-tier (level >= 10)
   * @private
   */
  private isBossMonster(template: MonsterTemplate): boolean {
    // TODO: Implement in Phase 4.3
    throw new Error('Not implemented')
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
    // TODO: Implement in Phase 3.2
    throw new Error('Not implemented')
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
    // TODO: Implement in Phase 3.3
    throw new Error('Not implemented')
  }
}
