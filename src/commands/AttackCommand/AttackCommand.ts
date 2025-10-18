import { GameState, MonsterState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { CombatService } from '@services/CombatService'
import { MessageService } from '@services/MessageService'
import { LevelingService } from '@services/LevelingService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'

// ============================================================================
// ATTACK COMMAND - Player attacks monster
// ============================================================================

export class AttackCommand implements ICommand {
  constructor(
    private monsterId: string,
    private combatService: CombatService,
    private messageService: MessageService,
    private levelingService: LevelingService,
    private turnService: TurnService,
    private goldService: GoldService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const monster = level.monsters.find((m) => m.id === this.monsterId)
    if (!monster) return state

    // Player attacks
    const result = this.combatService.playerAttack(state.player, monster)

    let messages = state.messages

    if (result.hit) {
      // Wake up the monster if it was sleeping (being attacked wakes monsters)
      let updatedMonsterForWake = monster
      let wakeUpMessage = false
      if (monster.isAsleep) {
        updatedMonsterForWake = {
          ...monster,
          isAsleep: false,
          state: MonsterState.HUNTING,
        }
        wakeUpMessage = true
      }

      // Add wake-up message BEFORE hit message (narrative order)
      if (wakeUpMessage) {
        messages = this.messageService.addMessage(
          messages,
          `The ${result.defender} wakes up!`,
          'warning',
          state.turnCount
        )
      }

      messages = this.messageService.addMessage(
        messages,
        `You hit the ${result.defender} for ${result.damage} damage!`,
        'combat',
        state.turnCount
      )

      if (result.killed) {
        messages = this.messageService.addMessage(
          messages,
          `You killed the ${result.defender}!`,
          'success',
          state.turnCount
        )

        // Remove monster
        const updatedMonsters = level.monsters.filter((m) => m.id !== this.monsterId)

        // Leprechaun drops gold on death (Rogue 1980 formula with inverted saving throw)
        let updatedGold = level.gold
        if (monster.name === 'Leprechaun') {
          const goldDrop = this.goldService.calculateLeprechaunDrop(
            state.player.level,
            state.player.strength,
            level.depth
          )
          const goldPile = this.goldService.dropGold(monster.position, goldDrop)
          updatedGold = [...level.gold, goldPile]

          messages = this.messageService.addMessage(
            messages,
            `The Leprechaun dropped ${goldDrop} gold pieces!`,
            'success',
            state.turnCount
          )
        }

        const xpReward = this.levelingService.calculateXPReward(monster)

        // Add XP and check for level-up
        const xpResult = this.levelingService.addExperience(state.player, xpReward)
        let updatedPlayer = xpResult.player

        // Add XP gain message
        messages = this.messageService.addMessage(
          messages,
          `You gain ${xpReward} experience points.`,
          'success',
          state.turnCount
        )

        // Handle level-up if it occurred
        if (xpResult.leveledUp) {
          updatedPlayer = this.levelingService.levelUp(updatedPlayer)
          messages = this.messageService.addMessage(
            messages,
            `You have reached level ${updatedPlayer.level}!`,
            'success',
            state.turnCount
          )
          messages = this.messageService.addMessage(
            messages,
            `Your max HP increases to ${updatedPlayer.maxHp}!`,
            'success',
            state.turnCount
          )
        }

        const updatedLevel = { ...level, monsters: updatedMonsters, gold: updatedGold }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return this.turnService.incrementTurn({
          ...state,
          player: updatedPlayer,
          levels: updatedLevels,
          messages,
          monstersKilled: state.monstersKilled + 1, // Track kill for death screen
        })
      } else {
        // Apply damage to monster (use updatedMonsterForWake which has wake-up applied)
        const updatedMonster = this.combatService.applyDamageToMonster(
          updatedMonsterForWake,
          result.damage
        )
        const updatedMonsters = level.monsters.map((m) =>
          m.id === this.monsterId ? updatedMonster : m
        )

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return this.turnService.incrementTurn({
          ...state,
          levels: updatedLevels,
          messages,
        })
      }
    } else {
      // Wake up the monster even on a miss (attacking wakes monsters)
      let updatedMonsters = level.monsters
      if (monster.isAsleep) {
        const wokeMonster = {
          ...monster,
          isAsleep: false,
          state: MonsterState.HUNTING,
        }
        updatedMonsters = level.monsters.map((m) =>
          m.id === this.monsterId ? wokeMonster : m
        )
        messages = this.messageService.addMessage(
          messages,
          `The ${result.defender} wakes up!`,
          'warning',
          state.turnCount
        )
      }

      messages = this.messageService.addMessage(
        messages,
        `You miss the ${result.defender}.`,
        'combat',
        state.turnCount
      )

      const updatedLevel = { ...level, monsters: updatedMonsters }
      const updatedLevels = new Map(state.levels)
      updatedLevels.set(state.currentLevel, updatedLevel)

      return this.turnService.incrementTurn({
        ...state,
        levels: updatedLevels,
        messages,
      })
    }
  }
}
