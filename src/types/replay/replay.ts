import { GameState } from '@game/core/core'

// ============================================================================
// COMMAND EVENT - Single recorded command with RNG state
// ============================================================================

/**
 * CommandEvent
 *
 * Records a single command execution with all data needed to replay it deterministically.
 * Captured BEFORE command execution to preserve RNG state.
 */
export interface CommandEvent {
  /** Turn number when command was executed */
  turnNumber: number

  /** Real-world timestamp (milliseconds since epoch) */
  timestamp: number

  /** Type of command (e.g., 'move', 'attack', 'use-item') */
  commandType: string

  /** Who executed the command */
  actorType: 'player' | 'monster'

  /** Monster ID if actorType is 'monster' (undefined for player) */
  actorId?: string

  /** Command-specific data (direction, target, item, etc.) */
  payload: any

  /** RNG internal state BEFORE execution (for deterministic replay) */
  rngState: string
}

// ============================================================================
// COMMAND TYPES REGISTRY
// ============================================================================

/**
 * COMMAND_TYPES
 *
 * Centralized registry of all command type strings.
 * Used by CommandRecorderService and CommandFactory.
 */
export const COMMAND_TYPES = {
  // Player movement and combat
  MOVE: 'move',
  ATTACK: 'attack',
  RUN: 'run',
  REST: 'rest',
  SEARCH: 'search',

  // Item management
  PICKUP: 'pickup',
  DROP: 'drop',
  USE_ITEM: 'use-item',
  EQUIP: 'equip',
  UNEQUIP: 'unequip',
  QUAFF: 'quaff',
  READ: 'read',
  ZAP: 'zap',
  THROW: 'throw',
  WEAR: 'wear',
  REMOVE: 'remove',
  WIELD: 'wield',
  EAT: 'eat',

  // Level navigation
  DESCEND: 'descend',
  ASCEND: 'ascend',

  // Monster AI commands
  AI_MOVE: 'ai-move',
  AI_ATTACK: 'ai-attack',
  AI_FLEE: 'ai-flee',
  AI_WANDER: 'ai-wander',
  AI_STEAL: 'ai-steal',

  // System commands
  LIGHT_FUEL: 'light-fuel',
  HUNGER_TICK: 'hunger-tick',
  AUTO_SAVE: 'auto-save',
} as const

export type CommandType = (typeof COMMAND_TYPES)[keyof typeof COMMAND_TYPES]

// ============================================================================
// REPLAY DATA - Complete replay with initial state and command log
// ============================================================================

/**
 * ReplayData
 *
 * Complete replay data structure stored in IndexedDB 'replays' object store.
 * Contains everything needed to reconstruct game state from turn 0 to final turn.
 */
export interface ReplayData {
  /** Unique game identifier (matches gameId in saves store) */
  gameId: string

  /** Replay format version (for compatibility checking) */
  version: number

  /** Game state at turn 0 (before any commands) */
  initialState: GameState

  /** RNG seed used for this game */
  seed: string

  /** All recorded commands (chronological order) */
  commands: CommandEvent[]

  /** Metadata for querying and display */
  metadata: ReplayMetadata
}

/**
 * ReplayMetadata
 *
 * Metadata indexed for efficient querying in IndexedDB.
 */
export interface ReplayMetadata {
  /** When replay was created (timestamp in ms) */
  createdAt: number

  /** Total number of turns recorded */
  turnCount: number

  /** Character name (for display in lists) */
  characterName: string

  /** Current dungeon level */
  currentLevel: number

  /** Game outcome (undefined if ongoing) */
  outcome?: 'won' | 'died' | 'ongoing'
}

// ============================================================================
// VALIDATION - Determinism checking
// ============================================================================

/**
 * ValidationResult
 *
 * Result of comparing replayed state vs saved state.
 * Used to detect non-determinism bugs.
 */
export interface ValidationResult {
  /** True if states match exactly */
  valid: boolean

  /** List of fields that don't match (empty if valid) */
  desyncs: DesyncError[]
}

/**
 * DesyncError
 *
 * Single field mismatch between expected and actual state.
 */
export interface DesyncError {
  /** Turn number where desync was detected */
  turn: number

  /** Field path (e.g., 'player.hp', 'monsters.length') */
  field: string

  /** Expected value (from saved state) */
  expected: any

  /** Actual value (from replayed state) */
  actual: any
}
