import { GameState, DoorState, Position, Level, Monster } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService, FuelTickResult } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService, HungerTickResult } from '@services/HungerService'
import { NotificationService } from '@services/NotificationService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { AttackCommand } from '../AttackCommand'

// ============================================================================
// MOVE COMMAND - Handle player movement and combat
// ============================================================================

export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private combatService: CombatService,
    private levelingService: LevelingService,
    private doorService: DoorService,
    private hungerService?: HungerService,
    private notificationService?: NotificationService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Calculate target position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // Detect obstacle
    const obstacle = this.detectObstacle(newPosition, level)

    // ROUTE 1: Monster → Delegate to AttackCommand (early return)
    if (obstacle.type === 'monster') {
      const attackCommand = new AttackCommand(
        obstacle.data.id,
        this.combatService,
        this.messageService,
        this.levelingService
      )
      return attackCommand.execute(state)
      // AttackCommand handles: combat, XP, level-up, messages, turn increment
      // No hunger/fuel tick (correct - no movement)
    }

    // ROUTE 2: Door → Handle based on state
    if (obstacle.type === 'door') {
      const door = obstacle.data

      // Locked door - blocked (no turn)
      if (door.state === DoorState.LOCKED) {
        const messages = this.messageService.addMessage(
          state.messages,
          'The door is locked.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Undiscovered secret door - blocked (no turn)
      if (door.state === DoorState.SECRET && !door.discovered) {
        const messages = this.messageService.addMessage(
          state.messages,
          "You can't go that way.",
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Closed door - open and move through
      if (door.state === DoorState.CLOSED) {
        // Open door via DoorService (no turn increment)
        const updatedLevel = this.doorService.openDoor(level, door)
        const stateWithOpenDoor = {
          ...state,
          levels: new Map(state.levels).set(state.currentLevel, updatedLevel),
        }

        // Add message
        const messages = this.messageService.addMessage(
          stateWithOpenDoor.messages,
          'You open the door.',
          'info',
          state.turnCount + 1
        )

        // Continue with movement (hunger, fuel, FOV, turn increment)
        return this.performMovement(
          { ...stateWithOpenDoor, messages },
          newPosition,
          updatedLevel
        )
      }
    }

    // ROUTE 3: Wall → Blocked (no turn)
    if (obstacle.type === 'wall') {
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // ROUTE 4: Clear path → Normal movement
    return this.performMovement(state, newPosition, level)
  }

  /**
   * Detects what obstacle (if any) is at the target position
   */
  private detectObstacle(
    position: Position,
    level: Level
  ): { type: 'none' | 'monster' | 'door' | 'wall'; data?: any } {
    // Check for monster
    const monster = level.monsters.find(
      (m) => m.position.x === position.x && m.position.y === position.y
    )
    if (monster) return { type: 'monster', data: monster }

    // Check for closed/locked/secret door
    const door = level.doors.find(
      (d) => d.position.x === position.x && d.position.y === position.y
    )
    if (
      door &&
      (door.state === DoorState.CLOSED ||
        door.state === DoorState.LOCKED ||
        (door.state === DoorState.SECRET && !door.discovered))
    ) {
      return { type: 'door', data: door }
    }

    // Check walkability
    if (!this.movementService.isWalkable(position, level)) {
      return { type: 'wall' }
    }

    return { type: 'none' }
  }

  /**
   * Performs movement with all side effects (hunger, fuel, FOV, turn)
   * @param state Current game state
   * @param position Target position (already validated as walkable)
   * @param level Current level
   * @returns Updated state with movement, hunger tick, fuel tick, FOV update, turn increment
   */
  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // 1. Move player
    let player = this.movementService.movePlayer(state.player, position)
    let messages: string[] = []

    // 2. Tick hunger
    if (this.hungerService) {
      const hungerResult: HungerTickResult = this.hungerService.tickHunger(player)
      player = hungerResult.player
      messages.push(...hungerResult.messages)

      // Check for death from starvation
      if (hungerResult.death) {
        let finalMessages = state.messages
        // Add hunger messages first
        messages.forEach((msg) => {
          finalMessages = this.messageService.addMessage(
            finalMessages,
            msg,
            msg.includes('fainting') ? 'critical' : 'warning',
            state.turnCount + 1
          )
        })
        // Add death message
        finalMessages = this.messageService.addMessage(
          finalMessages,
          'You died of starvation!',
          'critical',
          state.turnCount + 1
        )
        return {
          ...state,
          player,
          messages: finalMessages,
          isGameOver: true,
          deathCause: hungerResult.death.cause,
          turnCount: state.turnCount + 1,
        }
      }
    }

    // 3. Tick light fuel
    const fuelResult: FuelTickResult = this.lightingService.tickFuel(player)
    const updatedPlayer = fuelResult.player
    messages.push(...fuelResult.messages)

    // 4. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(position, lightRadius, level)

    // 5. Update explored tiles
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

    // 6. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 7. Generate auto-notifications
    const stateWithUpdatedLevel = {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
    }
    const notifications = this.notificationService
      ? this.notificationService.generateNotifications(stateWithUpdatedLevel, state.player.position)
      : []

    // 8. Add hunger messages to message log
    let finalMessages = state.messages
    messages.forEach((msg) => {
      finalMessages = this.messageService.addMessage(
        finalMessages,
        msg,
        msg.includes('fainting') ? 'critical' : 'warning',
        state.turnCount + 1
      )
    })

    // 9. Add auto-notifications to message log
    notifications.forEach((msg) => {
      finalMessages = this.messageService.addMessage(finalMessages, msg, 'info', state.turnCount + 1)
    })

    // 10. Return with turn increment
    return {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
      messages: finalMessages,
      turnCount: state.turnCount + 1,
    }
  }

}
