import { Player, Monster, Weapon, Ring, RingType, GameState, Level } from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { HungerService } from '@services/HungerService'
import { DebugService } from '@services/DebugService'

// ============================================================================
// COMBAT SERVICE - Original Rogue combat formulas
// ============================================================================

export interface CombatResult {
  hit: boolean
  damage: number
  attacker: string
  defender: string
  killed: boolean
}

export class CombatService {
  constructor(
    private random: IRandomService,
    private hungerService?: HungerService,
    private debugService?: DebugService
  ) {}

  /**
   * Player attacks monster
   */
  playerAttack(player: Player, monster: Monster): CombatResult {
    const strengthBonus = this.getStrengthBonus(player)
    const effectiveStrength = player.strength + strengthBonus

    // Apply hunger penalties if service available
    let toHitModifier = 0
    let damageModifier = 0
    if (this.hungerService) {
      const penalties = this.hungerService.applyHungerEffects(player)
      toHitModifier = penalties.toHitPenalty
      damageModifier = penalties.damagePenalty
    }

    const hit = this.calculateHit(
      player.level + effectiveStrength + toHitModifier,
      monster.ac
    )

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: 'Player',
        defender: monster.name,
        killed: false,
      }
    }

    const weapon = player.equipment.weapon
    const baseDamage = this.calculatePlayerDamage(player, weapon)
    const damage = Math.max(0, baseDamage + damageModifier) // Don't go negative
    const newHp = Math.max(0, monster.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: 'Player',
      defender: monster.name,
      killed,
    }
  }

  /**
   * Monster attacks player
   */
  monsterAttack(monster: Monster, player: Player, state?: GameState): CombatResult {
    // Check god mode - player is invincible
    if (state && this.debugService?.isGodModeActive(state)) {
      return {
        hit: false,
        damage: 0,
        attacker: monster.name,
        defender: 'Player',
        killed: false,
      }
    }

    const acBonus = this.getACBonus(player)
    const effectiveAC = player.ac - acBonus // Lower AC is better
    const hit = this.calculateHit(monster.level, effectiveAC)

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: monster.name,
        defender: 'Player',
        killed: false,
      }
    }

    const damage = this.random.roll(monster.damage)
    const newHp = Math.max(0, player.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: monster.name,
      defender: 'Player',
      killed,
    }
  }

  /**
   * Apply damage to player
   */
  applyDamageToPlayer(player: Player, damage: number): Player {
    return {
      ...player,
      hp: Math.max(0, player.hp - damage),
    }
  }

  /**
   * Apply damage to monster
   */
  applyDamageToMonster(monster: Monster, damage: number): Monster {
    return {
      ...monster,
      hp: Math.max(0, monster.hp - damage),
    }
  }

  /**
   * Calculate XP reward
   */
  calculateXP(monster: Monster): number {
    return monster.xpValue
  }


  // ============================================================================
  // PRIVATE: Combat formulas (from original Rogue)
  // ============================================================================

  /**
   * Calculate if attack hits
   * Original Rogue formula: roll d20, modified by level and AC
   */
  private calculateHit(attackerLevel: number, defenderAC: number): boolean {
    const roll = this.random.nextInt(1, 20)
    const modifier = attackerLevel - defenderAC
    return roll + modifier >= 10
  }

  /**
   * Calculate player damage with weapon
   */
  private calculatePlayerDamage(player: Player, weapon: Weapon | null): number {
    if (weapon) {
      const baseDamage = this.random.roll(weapon.damage)
      return baseDamage + weapon.bonus
    }

    // Unarmed: 1d4
    return this.random.roll('1d4')
  }

  /**
   * Get total strength bonus from equipped rings
   */
  private getStrengthBonus(player: Player): number {
    let bonus = 0

    if (player.equipment.leftRing?.ringType === RingType.ADD_STRENGTH) {
      bonus += player.equipment.leftRing.bonus
    }

    if (player.equipment.rightRing?.ringType === RingType.ADD_STRENGTH) {
      bonus += player.equipment.rightRing.bonus
    }

    return bonus
  }

  /**
   * Get total AC bonus from equipped rings (lower is better, so bonus reduces AC)
   */
  private getACBonus(player: Player): number {
    let bonus = 0

    if (player.equipment.leftRing?.ringType === RingType.PROTECTION) {
      bonus += player.equipment.leftRing.bonus
    }

    if (player.equipment.rightRing?.ringType === RingType.PROTECTION) {
      bonus += player.equipment.rightRing.bonus
    }

    if (player.equipment.leftRing?.ringType === RingType.DEXTERITY) {
      bonus += player.equipment.leftRing.bonus
    }

    if (player.equipment.rightRing?.ringType === RingType.DEXTERITY) {
      bonus += player.equipment.rightRing.bonus
    }

    return bonus
  }
}
