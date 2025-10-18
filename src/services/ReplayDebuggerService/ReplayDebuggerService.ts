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
   *
   * @param gameId - Game ID to load replay for
   * @returns Replay data or null if not found/incompatible
   */
  async loadReplay(gameId: string): Promise<ReplayData | null> {
    try {
      const replay = await this.indexedDB.get('replays', gameId)

      if (!replay) {
        console.warn(`No replay data found for game: ${gameId}`)
        return null
      }

      // Version compatibility check
      if (replay.version !== this.CURRENT_REPLAY_VERSION) {
        console.warn(
          `Replay version incompatible: found v${replay.version}, expected v${this.CURRENT_REPLAY_VERSION}`
        )
        return null
      }

      console.log(
        `Replay loaded: ${gameId} (${replay.commands.length} commands, ${replay.metadata.turnCount} turns)`
      )
      return replay
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
    let currentState = structuredClone(replayData.initialState)

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
}
