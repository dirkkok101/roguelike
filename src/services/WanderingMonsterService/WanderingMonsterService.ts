import { Monster, Level, Position, Room } from '@game/core/core'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// WANDERING MONSTER SERVICE - Progressive spawning over time
// ============================================================================

/**
 * WanderingMonsterService
 *
 * Handles wandering monster spawns that appear progressively as the player
 * spends time on a dungeon level. Implements authentic 1980 Rogue mechanics.
 *
 * Design Principles:
 * - Time pressure: Discourages indefinite resting/grinding
 * - Fair spawning: Cannot spawn in player's current room
 * - Progressive chance: Spawn chance increases over time, capped at maximum
 * - Level-appropriate: Uses same monster selection as initial level generation
 *
 * Spawn Formula:
 * - Base chance: 0.5% per turn (1 in 200)
 * - Increment: +0.01% per turn since last spawn
 * - Maximum: 5% per turn (prevents runaway spawning)
 * - Limit: 5 wanderers per level maximum
 *
 * Dependencies: MonsterSpawnService (monster creation), IRandomService (RNG)
 */
export class WanderingMonsterService {
  // Spawn configuration (tunable for balance)
  private readonly SPAWN_CHANCE_BASE = 0.005 // 0.5% base chance
  private readonly SPAWN_CHANCE_INCREMENT = 0.0001 // +0.01% per turn
  private readonly SPAWN_CHANCE_CAP = 0.05 // 5% maximum
  private readonly MAX_WANDERERS_PER_LEVEL = 5 // Limit per level

  constructor(
    private monsterSpawnService: MonsterSpawnService,
    private random: IRandomService
  ) {}

  /**
   * Check if a wandering monster should spawn this turn
   *
   * Calculates spawn chance based on turns since last spawn, with progressive
   * increase capped at maximum. Returns false if wanderer limit reached.
   *
   * @param level - Current dungeon level
   * @param turnCount - Current game turn number
   * @returns true if wanderer should spawn, false otherwise
   */
  shouldSpawnWanderer(level: Level, turnCount: number): boolean {
    // Check wanderer limit
    const wandererCount = level.wanderingMonsterCount ?? 0
    if (wandererCount >= this.MAX_WANDERERS_PER_LEVEL) {
      return false
    }

    // Calculate turns since last spawn
    const lastSpawn = level.lastWanderingSpawnTurn ?? 0
    const turnsSinceLastSpawn = turnCount - lastSpawn

    // Calculate spawn chance with progressive increase
    const spawnChance = Math.min(
      this.SPAWN_CHANCE_BASE + turnsSinceLastSpawn * this.SPAWN_CHANCE_INCREMENT,
      this.SPAWN_CHANCE_CAP
    )

    // Roll for spawn
    return this.random.chance(spawnChance)
  }

  /**
   * Get valid spawn location for wandering monster
   *
   * Selects a random walkable tile that:
   * - Is NOT in player's current room (authentic Rogue rule)
   * - Is not occupied by another monster
   * - Is not the player's position
   *
   * @param level - Current dungeon level
   * @param playerPos - Player's current position
   * @returns Position for spawn, or null if no valid location found
   */
  getSpawnLocation(level: Level, playerPos: Position): Position | null {
    // Determine player's current room (if any)
    const playerRoom = this.findRoomContainingPosition(level.rooms, playerPos)

    // Collect all valid spawn candidates
    const candidates: Position[] = []

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y]?.[x]
        if (!tile?.walkable) continue

        const pos = { x, y }

        // Skip if in player's room
        if (playerRoom && this.isPositionInRoom(pos, playerRoom)) {
          continue
        }

        // Skip if occupied by player
        if (pos.x === playerPos.x && pos.y === playerPos.y) {
          continue
        }

        // Skip if occupied by monster
        const isOccupied = level.monsters.some(
          (m) => m.position.x === pos.x && m.position.y === pos.y
        )
        if (isOccupied) continue

        candidates.push(pos)
      }
    }

    // No valid locations
    if (candidates.length === 0) return null

    // Pick random candidate
    return this.random.pickRandom(candidates)
  }

  /**
   * Spawn a wandering monster at given position
   *
   * Selects level-appropriate monster using MonsterSpawnService weighted
   * selection, then creates monster instance at specified location.
   *
   * @param depth - Dungeon depth (1-10) for monster selection
   * @param position - Position to spawn monster at
   * @returns Newly created Monster instance
   */
  spawnWanderer(depth: number, position: Position): Monster {
    // Select monster appropriate for depth
    const template = this.monsterSpawnService.selectMonsterForDepth(depth)

    // Generate unique ID
    const id = `wanderer-${depth}-${this.random.nextInt(1000, 9999)}`

    // Create monster from template
    return this.monsterSpawnService.createMonsterFromTemplate(template, position, id)
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Find room containing a given position
   * @private
   */
  private findRoomContainingPosition(rooms: Room[], pos: Position): Room | null {
    for (const room of rooms) {
      if (this.isPositionInRoom(pos, room)) {
        return room
      }
    }
    return null
  }

  /**
   * Check if position is inside a room
   * @private
   */
  private isPositionInRoom(pos: Position, room: Room): boolean {
    return (
      pos.x >= room.x &&
      pos.x < room.x + room.width &&
      pos.y >= room.y &&
      pos.y < room.y + room.height
    )
  }
}
