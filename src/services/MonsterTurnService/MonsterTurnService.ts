import {
  GameState,
  Monster,
  MonsterBehavior,
  MonsterState,
  Position,
  SpecialAbilityFlag,
} from '@game/core/core'
import { MonsterAIService, MonsterAction } from '@services/MonsterAIService'
import { CombatService } from '@services/CombatService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'
import { LevelService } from '@services/LevelService'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// MONSTER TURN SERVICE - Process all monster turns with energy system
// ============================================================================

export class MonsterTurnService {
  constructor(
    private random: IRandomService,
    private aiService: MonsterAIService,
    private combatService: CombatService,
    private abilityService: SpecialAbilityService,
    private messageService: MessageService,
    private turnService: TurnService,
    private goldService: GoldService,
    private levelService: LevelService
  ) {}

  /**
   * Process turns for all monsters on current level with energy system
   * NOTE: Monsters already have energy granted in Phase 1 of main game loop
   * This method processes monster actions based on accumulated energy
   */
  processMonsterTurns(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    let currentState = state

    // Process each monster
    for (const monster of level.monsters) {
      // Skip dead monsters
      if (monster.hp <= 0) {
        continue
      }

      // Monsters already have energy from Phase 1 (grantEnergyToAllActors)
      let updatedMonster = monster

      // Process monster while it has enough energy to act
      while (this.turnService.canAct(updatedMonster)) {
        // Update monster (wake up check, FOV, memory, state transitions)
        updatedMonster = this.aiService.checkWakeUp(updatedMonster, currentState)
        updatedMonster = this.aiService.computeMonsterFOV(updatedMonster, currentState)
        updatedMonster = this.aiService.updateMonsterMemory(updatedMonster, currentState)
        updatedMonster = this.aiService.updateMonsterState(updatedMonster, currentState)

        // Apply regeneration if monster has it
        if (
          this.abilityService.hasSpecial(updatedMonster, SpecialAbilityFlag.REGENERATION)
        ) {
          const regenResult = this.abilityService.regenerate(updatedMonster)
          if (regenResult.monster) {
            updatedMonster = regenResult.monster
          }
        }

        // Save updated monster to level BEFORE executing actions
        // This ensures state changes (wake-up, FOV, memory) persist even if action is 'wait'
        currentState = this.updateMonsterInLevel(updatedMonster, currentState)

        // Decide action
        const action = this.aiService.decideAction(updatedMonster, currentState)

        // Execute action
        const result = this.executeMonsterAction(updatedMonster, action, currentState)
        currentState = result

        // Consume energy after action
        const currentLevel = currentState.levels.get(currentState.currentLevel)
        if (currentLevel) {
          const monsterAfterAction = currentLevel.monsters.find((m) => m.id === updatedMonster.id)
          if (monsterAfterAction) {
            updatedMonster = this.turnService.consumeEnergy(monsterAfterAction)
            currentState = this.updateMonsterInLevel(updatedMonster, currentState)
          }
        }

        // Stop processing if player died
        if (currentState.player.hp <= 0) {
          break
        }
      }

      // Stop processing monsters if player died
      if (currentState.player.hp <= 0) {
        break
      }
    }

    return currentState
  }

  /**
   * Update a monster in the current level
   */
  private updateMonsterInLevel(monster: Monster, state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const updatedMonsters = level.monsters.map((m) =>
      m.id === monster.id ? monster : m
    )

    const updatedLevel = { ...level, monsters: updatedMonsters }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return { ...state, levels: updatedLevels }
  }

  /**
   * Execute a specific monster action
   */
  private executeMonsterAction(
    monster: Monster,
    action: MonsterAction,
    state: GameState
  ): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    switch (action.type) {
      case 'move':
        return this.handleMove(monster, action.target!, state)

      case 'attack':
        return this.handleAttack(monster, state)

      case 'wait':
        // Monster does nothing this turn
        return state

      default:
        return state
    }
  }

  /**
   * Handle monster movement
   */
  private handleMove(monster: Monster, target: Position, state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Check if target position is walkable and not occupied by another monster
    const tile = level.tiles[target.y]?.[target.x]
    if (!tile?.walkable) {
      return state
    }

    // Check for other monsters at target
    const monsterAtTarget = level.monsters.find(
      (m) => m.position.x === target.x && m.position.y === target.y && m.id !== monster.id
    )
    if (monsterAtTarget) {
      return state
    }

    // Move monster
    const updatedMonster = { ...monster, position: target }

    // Update monster in level
    const updatedMonsters = level.monsters.map((m) =>
      m.id === monster.id ? updatedMonster : m
    )

    const updatedLevel = { ...level, monsters: updatedMonsters }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // Check if monster is GREEDY and just moved onto gold
    if (this.aiService.hasBehavior(monster, MonsterBehavior.GREEDY)) {
      // Check for gold at new position
      const goldHere = level.gold.find(
        (g) => g.position.x === target.x && g.position.y === target.y
      )
      if (goldHere) {
        // Remove gold from level
        const updatedGold = level.gold.filter(
          (g) => g.position.x !== target.x || g.position.y !== target.y
        )
        updatedLevels.set(state.currentLevel, {
          ...updatedLevel,
          gold: updatedGold,
        })
      }
    }

    return {
      ...state,
      levels: updatedLevels,
    }
  }

  /**
   * Handle monster attacking player
   */
  private handleAttack(monster: Monster, state: GameState): GameState {
    let currentPlayer = state.player
    let messages = state.messages
    let killedBy: string | undefined = undefined

    // Check for THIEF behavior - steal instead of attack
    if (
      this.abilityService.hasSpecial(monster, SpecialAbilityFlag.STEALS) &&
      !monster.hasStolen
    ) {
      return this.handleTheft(monster, state)
    }

    // Handle multiple attacks if monster has them
    const attacks = this.abilityService.parseMultipleAttacks(monster.damage)

    for (const _attackDamage of attacks) {
      // Check breath weapon for Dragon
      if (
        this.abilityService.shouldUseBreathWeapon(monster) &&
        attacks.length === 1
      ) {
        const breathDamage = this.abilityService.rollBreathWeaponDamage(monster)
        messages = this.messageService.addMessage(
          messages,
          `The ${monster.name} breathes fire at you for ${breathDamage} damage!`,
          'combat',
          state.turnCount
        )

        currentPlayer = this.combatService.applyDamageToPlayer(
          currentPlayer,
          breathDamage
        )

        // Check if breath weapon killed player
        if (currentPlayer.hp <= 0) {
          killedBy = `Killed by ${monster.name}'s breath weapon`
          break
        }
        continue
      }

      // Normal attack
      const result = this.combatService.monsterAttack(monster, currentPlayer)

      if (result.hit) {
        // Apply damage
        currentPlayer = this.combatService.applyDamageToPlayer(
          currentPlayer,
          result.damage
        )

        messages = this.messageService.addMessage(
          messages,
          `The ${monster.name} hits you for ${result.damage} damage.`,
          'combat',
          state.turnCount
        )

        // Check if attack killed player
        if (currentPlayer.hp <= 0) {
          killedBy = `Killed by ${monster.name}`
          break
        }

        // Apply special abilities on hit
        const abilityResult = this.abilityService.applyOnHitAbilities(
          currentPlayer,
          monster
        )
        if (abilityResult.player) {
          currentPlayer = abilityResult.player
        }
        for (const msg of abilityResult.messages) {
          messages = this.messageService.addMessage(
            messages,
            msg,
            'warning',
            state.turnCount
          )
        }

        // Check if special ability killed player (e.g., poison)
        if (currentPlayer.hp <= 0 && !killedBy) {
          killedBy = `Killed by ${monster.name}`
          break
        }
      } else {
        messages = this.messageService.addMessage(
          messages,
          `The ${monster.name} misses you.`,
          'combat',
          state.turnCount
        )
      }
    }

    // Check for player death
    const isGameOver = currentPlayer.hp <= 0

    return {
      ...state,
      player: currentPlayer,
      messages,
      isGameOver,
      deathCause: killedBy || state.deathCause,
    }
  }

  /**
   * Handle theft by THIEF monsters (Leprechaun, Nymph)
   */
  private handleTheft(monster: Monster, state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    let messages = state.messages
    let player = state.player

    // Leprechaun steals gold (Rogue 1980 formula with saving throw)
    if (monster.name === 'Leprechaun' && player.gold > 0) {
      const level = state.levels.get(state.currentLevel)
      const depth = level?.depth || 1

      // Use GoldService formula: saving throw determines 1x or 5x GOLDCALC
      const stolenGold = this.goldService.calculateLeprechaunSteal(
        player.gold,
        player.level,
        player.strength,
        depth
      )

      player = { ...player, gold: Math.max(0, player.gold - stolenGold) }
      messages = this.messageService.addMessage(
        messages,
        `The Leprechaun steals ${stolenGold} gold and flees!`,
        'warning',
        state.turnCount
      )
    }
    // Nymph steals random item
    else if (monster.name === 'Nymph' && player.inventory.length > 0) {
      const randomIndex = this.random.nextInt(0, player.inventory.length - 1)
      const stolenItem = player.inventory[randomIndex]
      player = {
        ...player,
        inventory: player.inventory.filter((_, i) => i !== randomIndex),
      }
      messages = this.messageService.addMessage(
        messages,
        `The Nymph steals your ${stolenItem.name} and disappears!`,
        'warning',
        state.turnCount
      )
    }

    // Mark monster as having stolen and teleport (matches original Rogue behavior)
    // In original Rogue, Leprechauns and Nymphs were stationary and teleported after stealing
    const walkableTiles = this.levelService.getAllWalkableTiles(level)

    // Filter out monster's current position (avoid "teleporting" to same spot)
    const teleportDestinations = walkableTiles.filter(
      pos => pos.x !== monster.position.x || pos.y !== monster.position.y
    )

    let updatedMonster: Monster
    if (teleportDestinations.length > 0) {
      // Teleport to random walkable position
      const teleportPos = this.random.pickRandom(teleportDestinations)
      updatedMonster = {
        ...monster,
        hasStolen: true,
        state: MonsterState.FLEEING,
        position: teleportPos
      }
    } else {
      // No valid teleport destinations - just mark as stolen (edge case)
      updatedMonster = { ...monster, hasStolen: true, state: MonsterState.FLEEING }
    }

    const updatedMonsters = level.monsters.map((m) =>
      m.id === monster.id ? updatedMonster : m
    )

    const updatedLevel = { ...level, monsters: updatedMonsters }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return {
      ...state,
      player,
      messages,
      levels: updatedLevels,
    }
  }
}
