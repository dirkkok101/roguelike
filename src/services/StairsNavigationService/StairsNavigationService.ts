import { GameState, Level } from '@game/core/core'
import { MonsterSpawnService } from '@services/MonsterSpawnService'

/**
 * StairsNavigationService
 *
 * Handles all stairs traversal logic for 26-level dungeon with bidirectional travel.
 * Manages level persistence, monster respawning, and Amulet-triggered mechanics.
 *
 * Design:
 * - Free bidirectional travel (up/down stairs work at all times)
 * - Levels persist exactly as left (full persistence)
 * - Amulet pickup triggers respawn flag
 * - Monsters respawn on FIRST ascent visit with Amulet (tracked via levelsVisitedWithAmulet)
 * - Respawn uses cumulative vorpal pool [0, depth+3] for increased difficulty
 *
 * Dependencies: MonsterSpawnService (for respawning monsters)
 */
export class StairsNavigationService {
  constructor(private monsterSpawnService: MonsterSpawnService) {}

  /**
   * Check if player can descend (move to deeper level)
   *
   * @param state - Current game state
   * @returns true if not at maximum depth (26)
   */
  canDescend(state: GameState): boolean {
    return state.currentLevel < state.maxDepth
  }

  /**
   * Check if player can ascend (move to shallower level)
   *
   * @param state - Current game state
   * @returns true if not at surface level (1)
   */
  canAscend(state: GameState): boolean {
    return state.currentLevel > 1
  }

  /**
   * Descend one level (depth + 1)
   *
   * Saves current level to map, loads next level from map.
   * Does NOT trigger monster respawn (only ascending with Amulet does).
   *
   * @param state - Current game state
   * @returns Updated game state at new depth
   * @throws Error if already at maximum depth
   */
  descend(state: GameState): GameState {
    if (!this.canDescend(state)) {
      throw new Error('Cannot descend deeper (already at maximum depth)')
    }

    const newDepth = state.currentLevel + 1
    return this.changeLevel(state, newDepth, false) // false = not ascending
  }

  /**
   * Ascend one level (depth - 1)
   *
   * Saves current level to map, loads previous level from map.
   * Respawns monsters if moving WITH Amulet for first time.
   *
   * @param state - Current game state
   * @returns Updated game state at new depth
   * @throws Error if already at surface level
   */
  ascend(state: GameState): GameState {
    if (!this.canAscend(state)) {
      throw new Error('Cannot ascend higher (already at surface level)')
    }

    const newDepth = state.currentLevel - 1
    return this.changeLevel(state, newDepth, true) // true = ascending
  }

  /**
   * Change to a different level (core transition logic)
   *
   * Handles:
   * 1. Saving current level state to map
   * 2. Loading target level from map
   * 3. Monster respawn check (ONLY on ascent with Amulet + first visit)
   * 4. Updating visited levels tracking
   *
   * @private
   * @param state - Current game state
   * @param newDepth - Target depth level
   * @param isAscending - True if moving up (ascending), false if moving down (descending)
   */
  private changeLevel(state: GameState, newDepth: number, isAscending: boolean): GameState {
    // 1. Save current level to map (levels are persistent)
    const updatedLevels = new Map(state.levels)
    const currentLevelData = updatedLevels.get(state.currentLevel)!
    updatedLevels.set(state.currentLevel, currentLevelData)

    // 2. Load target level from map
    let targetLevel = updatedLevels.get(newDepth)!

    // 3. Check if we need to respawn monsters
    // Only respawn when: (a) ASCENDING AND (b) player has Amulet AND (c) first visit to this level with Amulet
    const needsRespawn =
      isAscending && state.hasAmulet && !state.levelsVisitedWithAmulet.has(newDepth)

    const updatedVisited = new Set(state.levelsVisitedWithAmulet)

    if (needsRespawn) {
      // Respawn monsters using cumulative vorpal pool [0, depth+3]
      targetLevel = this.respawnMonstersForLevel(targetLevel, newDepth)
      updatedLevels.set(newDepth, targetLevel) // Update the map with respawned level
      updatedVisited.add(newDepth)
    }

    // 4. Return updated state
    return {
      ...state,
      currentLevel: newDepth,
      levels: updatedLevels,
      levelsVisitedWithAmulet: updatedVisited,
    }
  }

  /**
   * Respawn monsters for a level (used during ascent with Amulet)
   *
   * Uses cumulative vorpal pool [0, depth+3] for increased difficulty.
   * This is more permissive than normal spawn range [depth-6, depth+3],
   * making the return journey more challenging.
   *
   * Examples:
   * - Level 25: Spawns monsters vorpal 0-28 (includes ALL monsters up to boss tier)
   * - Level 10: Spawns monsters vorpal 0-13 (includes early AND mid-tier)
   * - Level 1:  Spawns monsters vorpal 0-4  (only early tier, but same as normal)
   *
   * This means high-level monsters can appear on lower levels during return journey!
   *
   * @private
   * @param level - Level to respawn monsters on
   * @param depth - Dungeon depth (1-26)
   * @returns Level with respawned monsters
   */
  private respawnMonstersForLevel(level: Level, depth: number): Level {
    // Calculate cumulative vorpal range: [0, depth+3] clamped to [0, 25]
    const minVorpal = 0 // Cumulative: ALL monsters from vorpalness 0
    const maxVorpal = Math.min(25, depth + 3) // Up to depth+3 (max 25)

    // Spawn new monsters using cumulative vorpal range (harder than normal)
    const newMonsters = this.monsterSpawnService.spawnMonstersWithVorpalRange(
      level.rooms,
      level.tiles,
      depth,
      minVorpal,
      maxVorpal
    )

    return {
      ...level,
      monsters: newMonsters, // Replace old monsters with new spawns
    }
  }
}
