import { GameState, Position } from '@game/core/core'
import { ReplayData, ValidationResult, DesyncError } from '@game/replay/replay'
import { IndexedDBService } from '@services/IndexedDBService'
import { IRandomService } from '@services/RandomService'
import { ICommandFactory } from '@services/CommandFactory'

// ============================================================================
// REPLAY DEBUGGER SERVICE - Deterministic replay and validation
// ============================================================================

/**
 * ReplayDebuggerService
 *
 * Responsibilities:
 * - Load replay data from IndexedDB
 * - Reconstruct game state from command sequence
 * - Jump to specific turn for inspection
 * - Validate replay against saved state (determinism checking)
 * - Detect desyncs (non-determinism bugs)
 *
 * **Usage:**
 * ```typescript
 * const replay = await debugger.loadReplay('game-123')
 * const stateAtTurn42 = await debugger.reconstructToTurn(replay, 42)
 * const validation = await debugger.validateDeterminism(replay, savedState)
 * ```
 */
export class ReplayDebuggerService {
  private readonly CURRENT_REPLAY_VERSION = 1

  constructor(
    private indexedDB: IndexedDBService,
    private randomService: IRandomService,
    private commandFactory: ICommandFactory
  ) {}

  /**
   * Load replay data from IndexedDB
   * Replays are now embedded in save files (unified storage)
   *
   * @param gameId - Game ID to load replay for
   * @returns Replay data or null if not found/incompatible
   */
  async loadReplay(gameId: string): Promise<ReplayData | null> {
    try {
      // Load from saves store (replays are now embedded)
      const save = await this.indexedDB.get('saves', gameId)

      if (!save) {
        console.warn(`No save found for game: ${gameId}`)
        return null
      }

      if (!save.replayData) {
        console.warn(`No replay data in save for game: ${gameId}`)
        return null
      }

      // Extract and format replay data
      const replayData: ReplayData = {
        gameId: save.gameId,
        version: this.CURRENT_REPLAY_VERSION,
        initialState: save.replayData.initialState,
        seed: save.replayData.seed,
        commands: save.replayData.commands,
        metadata: {
          // Use save metadata to construct replay metadata
          createdAt: save.timestamp,
          turnCount: save.metadata.turnCount,
          characterName: save.metadata.characterName,
          currentLevel: save.metadata.currentLevel,
          outcome: 'ongoing', // We don't track outcome in saves currently
        },
      }

      console.log(
        `Replay loaded: ${gameId} (${replayData.commands.length} commands, ${replayData.metadata.turnCount} turns)`
      )
      return replayData
    } catch (error) {
      console.error('Failed to load replay:', error)
      return null
    }
  }

  /**
   * Reconstruct game state up to a specific turn
   *
   * Replays all commands from initial state up to (and including) targetTurn.
   * Restores RNG state before each command for deterministic replay.
   *
   * @param replayData - The replay data containing initial state and commands
   * @param targetTurn - Turn number to reconstruct to
   * @returns Reconstructed game state at targetTurn
   */
  async reconstructToTurn(replayData: ReplayData, targetTurn: number): Promise<GameState> {
    // Start from initial state (turn 0)
    // CRITICAL: Deserialize the initial state to restore Maps/Sets from JSON arrays
    let currentState = this.deserializeGameState(replayData.initialState)

    // Filter commands up to target turn
    const commandsToExecute = replayData.commands.filter(
      (cmd) => cmd.turnNumber <= targetTurn
    )

    console.log(
      `Reconstructing state: ${commandsToExecute.length} commands from turn 0 to ${targetTurn}`
    )

    // Replay each command
    for (const commandEvent of commandsToExecute) {
      try {
        // Restore RNG state BEFORE command execution
        this.randomService.setState(commandEvent.rngState)

        // Reconstruct and execute command
        const command = this.commandFactory.createFromEvent(commandEvent)
        const result = command.execute(currentState)
        // Handle both sync and async commands
        currentState = result instanceof Promise ? await result : result
      } catch (error) {
        console.error(
          `Failed to replay command at turn ${commandEvent.turnNumber}:`,
          error
        )
        throw new Error(
          `Replay failed at turn ${commandEvent.turnNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log(`State reconstructed successfully to turn ${targetTurn}`)
    return currentState
  }

  /**
   * Validate that replay produces deterministic results
   *
   * Reconstructs final state from commands and compares to saved state.
   * If they match exactly, the game is deterministic.
   * If they differ, returns list of desyncs (non-determinism bugs).
   *
   * @param replayData - The replay data to validate
   * @param savedState - The saved final state to compare against
   * @returns Validation result with desyncs (if any)
   */
  async validateDeterminism(
    replayData: ReplayData,
    savedState: GameState
  ): Promise<ValidationResult> {
    console.log(`Validating determinism for ${replayData.gameId}...`)

    // Reconstruct final state from commands
    const finalTurn = replayData.metadata.turnCount
    const reconstructed = await this.reconstructToTurn(replayData, finalTurn)

    // Deep comparison
    const desyncs = this.compareStates(savedState, reconstructed)

    if (desyncs.length === 0) {
      console.log('✅ Validation PASSED - Game is fully deterministic')
    } else {
      console.error(`❌ Validation FAILED - ${desyncs.length} desync(s) detected:`)
      desyncs.forEach((desync) => {
        console.error(`  - Turn ${desync.turn}: ${desync.field}`)
        console.error(`    Expected: ${JSON.stringify(desync.expected)}`)
        console.error(`    Actual: ${JSON.stringify(desync.actual)}`)
      })
    }

    return {
      valid: desyncs.length === 0,
      desyncs: desyncs,
    }
  }

  /**
   * Compare two game states and find all differences
   *
   * Performs deep comparison of critical game state fields:
   * - Player stats (HP, position, gold, level, XP)
   * - Monster count, positions, HP
   * - Item positions and counts
   * - Turn count
   *
   * @param expected - The expected state (from save)
   * @param actual - The actual state (from replay)
   * @returns Array of desyncs (empty if states match)
   */
  private compareStates(expected: GameState, actual: GameState): DesyncError[] {
    const desyncs: DesyncError[] = []
    const turn = expected.turnCount

    // === TURN COUNT ===
    if (expected.turnCount !== actual.turnCount) {
      desyncs.push({
        turn,
        field: 'turnCount',
        expected: expected.turnCount,
        actual: actual.turnCount,
      })
    }

    // === PLAYER STATE ===
    if (expected.player.hp !== actual.player.hp) {
      desyncs.push({
        turn,
        field: 'player.hp',
        expected: expected.player.hp,
        actual: actual.player.hp,
      })
    }

    if (!this.positionsEqual(expected.player.position, actual.player.position)) {
      desyncs.push({
        turn,
        field: 'player.position',
        expected: expected.player.position,
        actual: actual.player.position,
      })
    }

    if (expected.player.gold !== actual.player.gold) {
      desyncs.push({
        turn,
        field: 'player.gold',
        expected: expected.player.gold,
        actual: actual.player.gold,
      })
    }

    if (expected.player.level !== actual.player.level) {
      desyncs.push({
        turn,
        field: 'player.level',
        expected: expected.player.level,
        actual: actual.player.level,
      })
    }

    if (expected.player.xp !== actual.player.xp) {
      desyncs.push({
        turn,
        field: 'player.xp',
        expected: expected.player.xp,
        actual: actual.player.xp,
      })
    }

    // === MONSTER STATE ===
    const expectedLevel = expected.levels.get(expected.currentLevel)
    const actualLevel = actual.levels.get(actual.currentLevel)

    if (expectedLevel && actualLevel) {
      if (expectedLevel.monsters.length !== actualLevel.monsters.length) {
        desyncs.push({
          turn,
          field: 'monsters.length',
          expected: expectedLevel.monsters.length,
          actual: actualLevel.monsters.length,
        })
      }

      // Compare each monster (if counts match)
      if (expectedLevel.monsters.length === actualLevel.monsters.length) {
        expectedLevel.monsters.forEach((expectedMonster, index) => {
          const actualMonster = actualLevel.monsters[index]

          if (expectedMonster.hp !== actualMonster.hp) {
            desyncs.push({
              turn,
              field: `monsters[${index}].hp`,
              expected: expectedMonster.hp,
              actual: actualMonster.hp,
            })
          }

          if (
            !this.positionsEqual(expectedMonster.position, actualMonster.position)
          ) {
            desyncs.push({
              turn,
              field: `monsters[${index}].position`,
              expected: expectedMonster.position,
              actual: actualMonster.position,
            })
          }
        })
      }

      // === ITEM STATE ===
      if (expectedLevel.items.length !== actualLevel.items.length) {
        desyncs.push({
          turn,
          field: 'items.length',
          expected: expectedLevel.items.length,
          actual: actualLevel.items.length,
        })
      }
    }

    return desyncs
  }

  /**
   * Helper: Check if two positions are equal
   */
  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y
  }

  /**
   * Deserialize game state from stored replay data
   *
   * When replay data is loaded from IndexedDB, the initialState field may contain
   * serialized arrays instead of Maps/Sets (depending on browser and storage backend).
   * This method converts them back to proper JavaScript Map/Set instances.
   *
   * @param data - Raw state data from replay (may have arrays instead of Maps/Sets)
   * @returns Fully deserialized GameState with Maps/Sets restored
   */
  private deserializeGameState(data: any): GameState {
    // Check if already deserialized (levels is a Map)
    let levels: Map<number, any>

    // Detect the format of levels data
    // Can be: Map instance, Array of entries, or Object (from structured clone)
    if (data.levels instanceof Map) {
      // Already a Map, but need to ensure monster visibleCells are Sets
      levels = new Map(
        Array.from(data.levels.entries()).map(([depth, level]) => [
          depth,
          {
            ...level,
            monsters: level.monsters.map((m: any) => ({
              ...m,
              visibleCells: m.visibleCells instanceof Set
                ? m.visibleCells
                : new Set(m.visibleCells || []),
            })),
          },
        ])
      )
    } else if (Array.isArray(data.levels)) {
      // Convert from array of entries to Map
      levels = new Map(
        data.levels.map(([depth, level]: [number, any]) => {
          return [
            depth,
            {
              ...level,
              monsters: level.monsters.map((m: any) => ({
                ...m,
                visibleCells: new Set(m.visibleCells || []),
              })),
            },
          ]
        })
      )
    } else if (typeof data.levels === 'object' && data.levels !== null) {
      // Convert from plain object (structured clone result) to Map
      // Object.entries() converts { "1": {...}, "2": {...} } to [["1", {...}], ...]
      const entries = Object.entries(data.levels)

      // Empty object means Map was lost during serialization (test environment issue)
      // In production, this shouldn't happen as IndexedDB preserves Maps
      if (entries.length === 0) {
        console.warn('[ReplayDebugger] Empty levels object detected - Map was lost during serialization')
        // Create an empty Map - this will likely cause errors but is better than crashing
        levels = new Map()
      } else {
        levels = new Map(
          entries.map(([depthStr, level]: [string, any]) => {
            const depth = parseInt(depthStr, 10)
            return [
              depth,
              {
                ...level,
                monsters: level.monsters.map((m: any) => ({
                  ...m,
                  visibleCells: new Set(m.visibleCells || []),
                })),
              },
            ]
          })
        )
      }
    } else {
      throw new Error(`Unexpected levels format: ${typeof data.levels}`)
    }

    // Restore Sets with defaults for missing fields
    // Handle both Set instances (already deserialized) and arrays (from JSON)
    const visibleCells = data.visibleCells instanceof Set
      ? data.visibleCells
      : new Set(Array.isArray(data.visibleCells) ? data.visibleCells : [])

    const identifiedItems = data.identifiedItems instanceof Set
      ? data.identifiedItems
      : new Set(Array.isArray(data.identifiedItems) ? data.identifiedItems : [])

    const detectedMonsters = data.detectedMonsters instanceof Set
      ? data.detectedMonsters
      : new Set(Array.isArray(data.detectedMonsters) ? data.detectedMonsters : [])

    const detectedMagicItems = data.detectedMagicItems instanceof Set
      ? data.detectedMagicItems
      : new Set(Array.isArray(data.detectedMagicItems) ? data.detectedMagicItems : [])

    const levelsVisitedWithAmulet = data.levelsVisitedWithAmulet instanceof Set
      ? data.levelsVisitedWithAmulet
      : new Set(Array.isArray(data.levelsVisitedWithAmulet) ? data.levelsVisitedWithAmulet : [])

    // Restore nested Maps in itemNameMap
    // Handle both Map instances and arrays/objects
    const itemNameMap = {
      potions: data.itemNameMap.potions instanceof Map
        ? data.itemNameMap.potions
        : Array.isArray(data.itemNameMap.potions)
          ? new Map(data.itemNameMap.potions)
          : new Map(Object.entries(data.itemNameMap.potions || {})),
      scrolls: data.itemNameMap.scrolls instanceof Map
        ? data.itemNameMap.scrolls
        : Array.isArray(data.itemNameMap.scrolls)
          ? new Map(data.itemNameMap.scrolls)
          : new Map(Object.entries(data.itemNameMap.scrolls || {})),
      rings: data.itemNameMap.rings instanceof Map
        ? data.itemNameMap.rings
        : Array.isArray(data.itemNameMap.rings)
          ? new Map(data.itemNameMap.rings)
          : new Map(Object.entries(data.itemNameMap.rings || {})),
      wands: data.itemNameMap.wands instanceof Map
        ? data.itemNameMap.wands
        : Array.isArray(data.itemNameMap.wands)
          ? new Map(data.itemNameMap.wands)
          : new Map(Object.entries(data.itemNameMap.wands || {})),
    }

    return {
      ...data,
      levels,
      visibleCells,
      identifiedItems,
      detectedMonsters,
      detectedMagicItems,
      levelsVisitedWithAmulet,
      itemNameMap,
    }
  }
}
