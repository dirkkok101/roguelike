import {
  Player,
  Wand,
  WandType,
  GameState,
  Monster,
  Level,
  StatusEffect,
  StatusEffectType,
  Position,
} from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'
import { IRandomService } from '@services/RandomService'
import { CombatService } from '@services/CombatService'
import { LevelService } from '@services/LevelService'

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface WandEffectResult {
  player: Player
  wand: Wand  // Updated wand with decremented charges
  state?: GameState  // Updated state (for level changes)
  message: string
  identified: boolean
}

// ============================================================================
// WAND SERVICE - Wand usage and charge management
// ============================================================================

export class WandService {
  constructor(
    private identificationService: IdentificationService,
    private random: IRandomService,
    private combatService: CombatService,
    private levelService: LevelService
  ) {}

  /**
   * Apply wand effect and return complete result
   * @param targetMonsterId - Optional monster ID for targeted wands
   */
  applyWand(
    player: Player,
    wand: Wand,
    state: GameState,
    targetMonsterId?: string
  ): WandEffectResult {
    // Check if wand has charges
    if (wand.currentCharges === 0) {
      return {
        player,
        wand,
        message: 'The wand has no charges.',
        identified: false,
      }
    }

    // Get target monster if specified
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      return {
        player,
        wand,
        message: 'Invalid level state.',
        identified: false,
      }
    }

    const targetMonster = targetMonsterId
      ? currentLevel.monsters.find(m => m.id === targetMonsterId)
      : undefined

    // If wand requires target but none provided, return error
    if (!targetMonster) {
      return {
        player,
        wand,
        message: 'No target in range.',
        identified: false,
      }
    }

    // Identify wand by use
    const identified = !this.identificationService.isIdentified(wand.wandType, state)
    const displayName = this.identificationService.getDisplayName(wand, state)

    // Decrement charges
    const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }

    // Apply wand effect based on type
    const result = this.applyWandEffect(wand, targetMonster, currentLevel, state, displayName)

    return {
      player,
      wand: updatedWand,
      state: result.state,
      message: result.message,
      identified,
    }
  }

  /**
   * Apply specific wand effect to target
   */
  private applyWandEffect(
    wand: Wand,
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state?: GameState; message: string } {
    switch (wand.wandType) {
      case WandType.LIGHTNING:
      case WandType.FIRE:
      case WandType.COLD:
        return this.applyDamageWand(wand, target, level, state, displayName)

      case WandType.MAGIC_MISSILE:
        return this.applyMagicMissile(wand, target, level, state, displayName)

      case WandType.SLEEP:
        return this.applySleep(target, level, state, displayName)

      case WandType.SLOW_MONSTER:
        return this.applySlowMonster(target, level, state, displayName)

      case WandType.HASTE_MONSTER:
        return this.applyHasteMonster(target, level, state, displayName)

      case WandType.TELEPORT_AWAY:
        return this.applyTeleportAway(target, level, state, displayName)

      case WandType.POLYMORPH:
        return this.applyPolymorph(target, level, state, displayName)

      case WandType.CANCELLATION:
        return this.applyCancellation(target, level, state, displayName)

      default:
        return { message: `You zap ${displayName}. Nothing happens.` }
    }
  }

  /**
   * Damage wands (LIGHTNING, FIRE, COLD) - 6d6 damage
   */
  private applyDamageWand(
    wand: Wand,
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const damage = this.random.roll(wand.damage)
    const damagedMonster = this.combatService.applyDamageToMonster(target, damage)

    const elementType = wand.wandType.toLowerCase()
    const message = damagedMonster.hp > 0
      ? `You zap ${displayName}. ${target.name} is struck by ${elementType}! (${damage} damage)`
      : `You zap ${displayName}. ${target.name} is killed by ${elementType}! (${damage} damage)`

    // Update or remove monster based on whether it's dead
    const updatedLevel = damagedMonster.hp > 0
      ? this.updateMonsterInLevel(level, damagedMonster)
      : this.removeMonsterFromLevel(level, target.id)

    const updatedState = this.updateLevelInState(state, updatedLevel)

    return { state: updatedState, message }
  }

  /**
   * MAGIC_MISSILE - 2d6 damage, never misses
   */
  private applyMagicMissile(
    wand: Wand,
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const damage = this.random.roll(wand.damage)
    const damagedMonster = this.combatService.applyDamageToMonster(target, damage)

    const message = damagedMonster.hp > 0
      ? `You zap ${displayName}. Magic missiles strike ${target.name}! (${damage} damage)`
      : `You zap ${displayName}. Magic missiles kill ${target.name}! (${damage} damage)`

    // Update or remove monster based on whether it's dead
    const updatedLevel = damagedMonster.hp > 0
      ? this.updateMonsterInLevel(level, damagedMonster)
      : this.removeMonsterFromLevel(level, target.id)

    const updatedState = this.updateLevelInState(state, updatedLevel)

    return { state: updatedState, message }
  }

  /**
   * SLEEP - Adds SLEEPING status effect for 3-6 turns
   */
  private applySleep(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const duration = this.random.nextInt(3, 6)
    const sleepEffect: StatusEffect = {
      type: StatusEffectType.SLEEPING,
      duration,
    }

    const updatedMonster: Monster = {
      ...target,
      statusEffects: [...target.statusEffects, sleepEffect],
      isAsleep: true,
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name} falls asleep!`,
    }
  }

  /**
   * SLOW_MONSTER - Reduces monster speed by 50%
   */
  private applySlowMonster(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const updatedMonster: Monster = {
      ...target,
      speed: Math.max(1, Math.floor(target.speed * 0.5)),
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name} slows down!`,
    }
  }

  /**
   * HASTE_MONSTER - Increases monster speed by 2x (dangerous!)
   */
  private applyHasteMonster(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const updatedMonster: Monster = {
      ...target,
      speed: target.speed * 2,
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name} speeds up! (Careful!)`,
    }
  }

  /**
   * TELEPORT_AWAY - Teleport monster to random walkable location
   */
  private applyTeleportAway(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    // Find random walkable tile
    const walkableTiles: Position[] = []
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        if (level.tiles[y][x].walkable) {
          walkableTiles.push({ x, y })
        }
      }
    }

    if (walkableTiles.length === 0) {
      return { message: `You zap ${displayName}. Nothing happens.` }
    }

    const newPosition = this.random.pickRandom(walkableTiles)
    const updatedMonster: Monster = {
      ...target,
      position: newPosition,
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name} vanishes!`,
    }
  }

  /**
   * POLYMORPH - Change monster to random type (same depth)
   * Note: This is a simplified implementation - full implementation would
   * require MonsterSpawnService to get monsters of same depth
   */
  private applyPolymorph(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    // For now, just change the monster's name and reset HP
    // Full implementation would use MonsterSpawnService
    const updatedMonster: Monster = {
      ...target,
      hp: target.maxHp,
      name: `Polymorphed ${target.name}`,
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name} transforms!`,
    }
  }

  /**
   * CANCELLATION - Remove all status effects and reset speed
   */
  private applyCancellation(
    target: Monster,
    level: Level,
    state: GameState,
    displayName: string
  ): { state: GameState; message: string } {
    const updatedMonster: Monster = {
      ...target,
      statusEffects: [],
      isAsleep: false,
      speed: 10, // Reset to normal speed
    }

    const updatedLevel = this.updateMonsterInLevel(level, updatedMonster)
    const updatedState = this.updateLevelInState(state, updatedLevel)

    return {
      state: updatedState,
      message: `You zap ${displayName}. ${target.name}'s magical effects are cancelled!`,
    }
  }

  /**
   * Helper: Update a monster in the level's monster array
   */
  private updateMonsterInLevel(level: Level, monster: Monster): Level {
    return {
      ...level,
      monsters: level.monsters.map(m => (m.id === monster.id ? monster : m)),
    }
  }

  /**
   * Helper: Remove a dead monster from the level's monster array
   */
  private removeMonsterFromLevel(level: Level, monsterId: string): Level {
    return {
      ...level,
      monsters: level.monsters.filter(m => m.id !== monsterId),
    }
  }

  /**
   * Helper: Update a level in the game state
   */
  private updateLevelInState(state: GameState, level: Level): GameState {
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, level)
    return {
      ...state,
      levels: updatedLevels,
    }
  }
}
