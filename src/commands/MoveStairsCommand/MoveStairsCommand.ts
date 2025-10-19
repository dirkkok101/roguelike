import { GameState, StatusEffectType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { StairsNavigationService } from '@services/StairsNavigationService'
import { FOVService } from '@services/FOVService'
import { LightingService } from '@services/LightingService'
import { VictoryService } from '@services/VictoryService'
import { LevelService } from '@services/LevelService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// MOVE STAIRS COMMAND - Navigate between dungeon levels
// ============================================================================

export class MoveStairsCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down',
    private stairsNavigationService: StairsNavigationService,
    private fovService: FOVService,
    private lightingService: LightingService,
    private messageService: MessageService,
    private victoryService: VictoryService,
    private levelService: LevelService,
    private _turnService: TurnService,
    private statusEffectService: StatusEffectService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.MOVE_STAIRS,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Check if player is on stairs
    const playerPos = state.player.position

    if (this.direction === 'down') {
      // Check for stairs down
      if (
        !currentLevel.stairsDown ||
        playerPos.x !== currentLevel.stairsDown.x ||
        playerPos.y !== currentLevel.stairsDown.y
      ) {
        const messages = this.messageService.addMessage(
          state.messages,
          'There are no stairs down here.',
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Check if can descend
      if (!this.stairsNavigationService.canDescend(state)) {
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot go any deeper!',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      return this.moveToLevel(state, 'down')
    } else {
      // Check for stairs up
      if (
        !currentLevel.stairsUp ||
        playerPos.x !== currentLevel.stairsUp.x ||
        playerPos.y !== currentLevel.stairsUp.y
      ) {
        const messages = this.messageService.addMessage(
          state.messages,
          'There are no stairs up here.',
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Check if can ascend
      if (!this.stairsNavigationService.canAscend(state)) {
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot go any higher! You need to find the Amulet first.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      return this.moveToLevel(state, 'up')
    }
  }

  private moveToLevel(
    state: GameState,
    direction: 'up' | 'down'
  ): GameState {
    // Use StairsNavigationService to handle level transition (includes monster respawn with Amulet)
    let newState = direction === 'down'
      ? this.stairsNavigationService.descend(state)
      : this.stairsNavigationService.ascend(state)

    const newDepth = newState.currentLevel
    const level = newState.levels.get(newDepth)!

    // Determine spawn position using LevelService (opposite stairs)
    const preferredPosition = direction === 'down' ? level.stairsUp : level.stairsDown
    const spawnPos = this.levelService.getSpawnPosition(level, preferredPosition)

    // Update player position and clear SEE_INVISIBLE (Original Rogue: lasts until level change)
    let updatedPlayer = { ...newState.player, position: spawnPos }
    updatedPlayer = this.statusEffectService.removeStatusEffect(updatedPlayer, StatusEffectType.SEE_INVISIBLE)

    // Compute FOV for new position
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(spawnPos, lightRadius, level)

    // Mark visible tiles as explored using FOVService
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
    const levels = new Map(newState.levels)
    levels.set(newDepth, updatedLevel)

    const messages = this.messageService.addMessage(
      newState.messages,
      direction === 'down'
        ? `You descend to level ${newDepth}.`
        : `You climb to level ${newDepth}.`,
      'info',
      state.turnCount
    )

    // Create new state after level change
    // (Turn increment happens in PlayingState)
    newState = {
      ...newState,
      player: updatedPlayer,
      levels,
      visibleCells,
      messages,
    }

    // Check victory condition after moving to new level
    if (this.victoryService.checkVictory(newState)) {
      return {
        ...newState,
        hasWon: true,
        isGameOver: true,
        messages: this.messageService.addMessage(
          newState.messages,
          'You have escaped with the Amulet of Yendor! You win!',
          'success',
          newState.turnCount
        ),
      }
    }

    return newState
  }
}
