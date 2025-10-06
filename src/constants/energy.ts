// ============================================================================
// ENERGY SYSTEM CONSTANTS
// ============================================================================
//
// Angband-style energy system for variable-speed actors
//
// Mechanics:
// - Energy threshold: 100 energy required to take an action
// - Speed determines energy gained per tick
// - Normal speed (10): acts every 10 ticks (100 energy / 10 per tick)
// - Hasted speed (20): acts every 5 ticks (100 energy / 20 per tick) = 2x rate
// - Slowed speed (5): acts every 20 ticks (100 energy / 5 per tick) = 0.5x rate
// - Energy carries over after actions (150 energy → act → 50 remains)
//
// Example turn cycle:
// - Player starts with 100 energy (can act immediately)
// - Player acts, consumes 100 energy, has 0 energy
// - Grant energy: player gains 10 (normal) or 20 (hasted) per tick
// - When player reaches 100 energy again, can act
// - Hasted player: 0 → 20 → 40 → 60 → 80 → 100 (5 ticks)
// - Normal player: 0 → 10 → 20 → 30 → ... → 100 (10 ticks)
//
// ============================================================================

/**
 * Energy required to take an action
 * Actor must have >= ENERGY_THRESHOLD to act
 */
export const ENERGY_THRESHOLD = 100

/**
 * Normal speed for most actors (baseline)
 * Grants 10 energy per tick → acts every 10 ticks
 */
export const NORMAL_SPEED = 10

/**
 * Hasted speed (player with HASTED status effect)
 * Grants 20 energy per tick → acts every 5 ticks (2x rate)
 */
export const HASTED_SPEED = 20

/**
 * Slowed speed (player/monster with SLOWED status effect)
 * Grants 5 energy per tick → acts every 20 ticks (0.5x rate)
 */
export const SLOWED_SPEED = 5
