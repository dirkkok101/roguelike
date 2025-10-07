import { GameState, Player, StatusEffectType, Scroll, Level, Position } from '@game/core/core'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { RingService } from '@services/RingService'
import { ENERGY_THRESHOLD, NORMAL_SPEED, HASTED_SPEED } from '../../constants/energy'

// ============================================================================
// ENERGY SYSTEM TYPES
// ============================================================================

/**
 * Generic actor interface for energy system
 * Any entity with energy can use energy methods
 */
type Actor = { energy: number }

/**
 * Result of processing passive ring abilities
 */
export interface RingPassiveResult {
  player: Player
  level: Level
  finalPosition: Position
  messages: Array<{ text: string; type: 'info' | 'warning' }>
}

// ============================================================================
// TURN SERVICE - Turn counter and energy management
// ============================================================================

export class TurnService {
  constructor(
    private statusEffectService: StatusEffectService,
    private levelService: LevelService,
    private ringService?: RingService // Optional for backward compatibility
  ) {}

  /**
   * Increment turn counter by 1
   * Also ticks all player status effects (decrement duration, remove expired)
   * Also removes deteriorated SCARE_MONSTER scrolls (>100 turns old)
   * Returns new GameState with incremented turnCount (immutable)
   */
  incrementTurn(state: GameState): GameState {
    const newTurnCount = state.turnCount + 1

    // Tick status effects (decrement durations, remove expired)
    const { player, expired } = this.statusEffectService.tickStatusEffects(state.player)

    // TODO: Add messages for expired effects in Phase 2.6 UI work
    // For now, just silently remove expired effects

    // Remove deteriorated scare scrolls from current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return { ...state, player, turnCount: newTurnCount }
    }

    // Get all scare scrolls on the ground
    const scareScrolls = this.levelService.getScareScrollsOnGround(level)

    // Filter out deteriorated scrolls (>100 turns old)
    const deterioratedScrollIds = new Set<string>()
    for (const scroll of scareScrolls) {
      if (scroll.droppedAtTurn !== undefined) {
        const age = newTurnCount - scroll.droppedAtTurn
        if (age > 100) {
          deterioratedScrollIds.add(scroll.id)
        }
      }
    }

    // If no scrolls deteriorated, return early
    if (deterioratedScrollIds.size === 0) {
      return { ...state, player, turnCount: newTurnCount }
    }

    // Remove deteriorated scrolls from level items
    const updatedItems = level.items.filter(item => !deterioratedScrollIds.has(item.id))
    const updatedLevel = { ...level, items: updatedItems }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return { ...state, player, levels: updatedLevels, turnCount: newTurnCount }
  }

  /**
   * Get current turn count
   */
  getCurrentTurn(state: GameState): number {
    return state.turnCount
  }

  /**
   * Process passive ring abilities (teleportation, searching)
   * Centralizes ring passive ability logic from MoveCommand
   *
   * @param player - Current player state
   * @param position - Current player position (may be updated by teleportation)
   * @param level - Current level
   * @returns Result with updated player, level, position, and messages
   */
  processPassiveRingAbilities(
    player: Player,
    position: Position,
    level: Level
  ): RingPassiveResult {
    if (!this.ringService) {
      // No ring service injected - return unchanged
      return {
        player,
        level,
        finalPosition: position,
        messages: [],
      }
    }

    const messages: Array<{ text: string; type: 'info' | 'warning' }> = []
    let updatedPlayer = player
    let updatedLevel = level
    let finalPosition = position

    // 1. Trigger Ring of Teleportation (15% chance, passive ability)
    const teleportResult = this.ringService.triggerTeleportation(updatedPlayer, updatedLevel)

    if (teleportResult.triggered && teleportResult.newPosition) {
      // Update player position to teleported location
      updatedPlayer = { ...updatedPlayer, position: teleportResult.newPosition }
      // Update final position for FOV calculation
      finalPosition = teleportResult.newPosition

      // Add teleportation message
      if (teleportResult.message) {
        messages.push({
          text: teleportResult.message,
          type: 'warning',
        })
      }
    }

    // 2. Trigger Ring of Searching (10% chance, passive ability)
    // Note: Searching uses the final position (after potential teleportation)
    const searchResult = this.ringService.applySearchingRing(updatedPlayer, updatedLevel)

    if (searchResult.detected) {
      // Update level with discovered traps/doors
      updatedLevel = searchResult.level

      // Add detection messages
      searchResult.messages.forEach((msg) => {
        messages.push({
          text: msg,
          type: 'info',
        })
      })
    }

    return {
      player: updatedPlayer,
      level: updatedLevel,
      finalPosition,
      messages,
    }
  }

  // ============================================================================
  // ENERGY SYSTEM METHODS
  // ============================================================================

  /**
   * Grant energy to actor based on speed
   * Returns new actor with increased energy (immutable)
   *
   * @param actor - Any entity with energy field
   * @param speed - Speed value (10=normal, 20=hasted, 5=slowed)
   * @returns New actor with energy + speed
   */
  grantEnergy<T extends Actor>(actor: T, speed: number): T {
    return { ...actor, energy: actor.energy + speed }
  }

  /**
   * Check if actor has enough energy to act
   * Actor can act when energy >= ENERGY_THRESHOLD (100)
   *
   * @param actor - Any entity with energy field
   * @returns True if actor.energy >= ENERGY_THRESHOLD
   */
  canAct<T extends Actor>(actor: T): boolean {
    return actor.energy >= ENERGY_THRESHOLD
  }

  /**
   * Consume energy after actor takes action
   * Returns new actor with energy - ENERGY_THRESHOLD (immutable)
   * Energy can carry over (e.g., 150 energy → consume → 50 remains)
   *
   * @param actor - Any entity with energy field
   * @returns New actor with energy - ENERGY_THRESHOLD
   */
  consumeEnergy<T extends Actor>(actor: T): T {
    return { ...actor, energy: actor.energy - ENERGY_THRESHOLD }
  }

  /**
   * Get player's current speed based on status effects
   * Returns HASTED_SPEED (20) if player has HASTED status
   * Returns NORMAL_SPEED (10) otherwise
   *
   * @param player - Player to check
   * @returns Speed value (10 or 20)
   */
  getPlayerSpeed(player: Player): number {
    const hasHaste = this.statusEffectService.hasStatusEffect(player, StatusEffectType.HASTED)
    return hasHaste ? HASTED_SPEED : NORMAL_SPEED
  }

  /**
   * Grant energy to player based on current speed
   * Checks player's status effects to determine speed
   * Returns new GameState with updated player (immutable)
   *
   * @param state - Current game state
   * @returns New GameState with player.energy increased
   */
  grantPlayerEnergy(state: GameState): GameState {
    const speed = this.getPlayerSpeed(state.player)
    const updatedPlayer = this.grantEnergy(state.player, speed)
    return { ...state, player: updatedPlayer }
  }

  /**
   * Grant energy to ALL actors (player + monsters) simultaneously
   * This ensures fair energy distribution - all actors accumulate energy at same rate
   * Returns new GameState with updated player and monsters (immutable)
   *
   * @param state - Current game state
   * @returns New GameState with all actors' energy increased
   */
  grantEnergyToAllActors(state: GameState): GameState {
    // Grant energy to player
    const playerSpeed = this.getPlayerSpeed(state.player)
    const updatedPlayer = this.grantEnergy(state.player, playerSpeed)

    // Grant energy to all monsters on current level
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      return { ...state, player: updatedPlayer }
    }

    // Update all monsters with energy grants
    const updatedMonsters = currentLevel.monsters.map((monster) =>
      this.grantEnergy(monster, monster.speed)
    )

    // Create updated level with new monster energies
    const updatedLevel = { ...currentLevel, monsters: updatedMonsters }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return {
      ...state,
      player: updatedPlayer,
      levels: updatedLevels,
    }
  }

  /**
   * Consume energy from player after action
   * Wrapper for consumeEnergy() for Player type
   *
   * @param player - Player who took action
   * @returns New Player with energy - ENERGY_THRESHOLD
   */
  consumePlayerEnergy(player: Player): Player {
    return this.consumeEnergy(player)
  }

  /**
   * Check if player has enough energy to act
   * Wrapper for canAct() for Player type
   *
   * @param player - Player to check
   * @returns True if player can act
   */
  canPlayerAct(player: Player): boolean {
    return this.canAct(player)
  }
}
