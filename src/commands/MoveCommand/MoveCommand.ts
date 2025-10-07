import { GameState, DoorState, Position, Level } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import type { FuelTickResult, Message as LightMessage } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import type { FOVUpdateResult } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService } from '@services/HungerService'
import type { HungerTickResult, Message as HungerMessage } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import type { RegenerationTickResult, Message as RegenMessage } from '@services/RegenerationService'
import { NotificationService } from '@services/NotificationService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'
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
    private hungerService: HungerService,
    private regenerationService: RegenerationService,
    private notificationService: NotificationService,
    private turnService: TurnService,
    private goldService: GoldService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Calculate target position (confusion handled in MovementService)
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction,
      state.player
    )

    // Detect obstacle
    const obstacle = this.movementService.detectObstacle(newPosition, level)

    // ROUTE 1: Monster → Delegate to AttackCommand (early return)
    if (obstacle.type === 'monster' && obstacle.data && 'id' in obstacle.data) {
      const monster = obstacle.data
      const attackCommand = new AttackCommand(
        monster.id,
        this.combatService,
        this.messageService,
        this.levelingService,
        this.turnService,
        this.goldService
      )
      return attackCommand.execute(state)
      // AttackCommand handles: combat, XP, level-up, messages, turn increment
      // No hunger/fuel tick (correct - no movement)
    }

    // ROUTE 2: Door → Handle based on state
    if (obstacle.type === 'door' && obstacle.data && 'state' in obstacle.data) {
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
      if (door.state === DoorState.SECRET && door.discovered !== undefined && !door.discovered) {
        const messages = this.messageService.addMessage(
          state.messages,
          "You can't go that way.",
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Discovered secret door OR closed door - open and move through
      if ((door.state === DoorState.SECRET && door.discovered) ||
          door.state === DoorState.CLOSED) {
        // Open door via DoorService (gets message and updated level)
        const result = this.doorService.openDoorWithResult(level, door)
        const stateWithOpenDoor = {
          ...state,
          levels: new Map(state.levels).set(state.currentLevel, result.level),
        }

        // Add message from result
        const messages = this.messageService.addMessage(
          stateWithOpenDoor.messages,
          result.message,
          'info',
          state.turnCount + 1
        )

        // Continue with movement (hunger, fuel, FOV, turn increment)
        return this.performMovement(
          { ...stateWithOpenDoor, messages },
          newPosition,
          result.level
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
   * Performs movement with all side effects (hunger, fuel, FOV, turn)
   * @param state Current game state
   * @param position Target position (already validated as walkable)
   * @param level Current level
   * @returns Updated state with movement, hunger tick, fuel tick, FOV update, turn increment
   */
  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // 1. Move player
    let player = this.movementService.movePlayer(state.player, position)
    let messages: (HungerMessage | LightMessage | RegenMessage)[] = []
    let updatedLevel = level

    // 1.5. Check for gold pickup at new position (automatic, no turn cost)
    const goldAtPosition = level.gold.find(
      g => g.position.x === position.x && g.position.y === position.y
    )

    if (goldAtPosition) {
      // Pickup gold (immutable player update)
      player = this.goldService.pickupGold(player, goldAtPosition.amount)

      // Remove gold from level
      const updatedGold = level.gold.filter(
        g => !(g.position.x === position.x && g.position.y === position.y)
      )
      updatedLevel = { ...level, gold: updatedGold }

      // Add pickup message (will be added to message log later)
      messages.push({
        text: `You pick up ${goldAtPosition.amount} gold pieces.`,
        type: 'success' as const,
      })
    }

    // 1.6. Process passive ring abilities (teleportation, searching)
    const ringPassiveResult = this.turnService.processPassiveRingAbilities(
      player,
      position,
      updatedLevel
    )
    player = ringPassiveResult.player
    updatedLevel = ringPassiveResult.level
    const finalPosition = ringPassiveResult.finalPosition
    messages.push(...ringPassiveResult.messages)

    // 2. Tick hunger
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
          msg.text,
          msg.type,
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
      return this.turnService.incrementTurn({
        ...state,
        player,
        messages: finalMessages,
        isGameOver: true,
        deathCause: hungerResult.death.cause,
      })
    }

    // 2.5. Tick regeneration (after hunger, before fuel)
    // Check if in combat (any monsters in visible cells from previous turn)
    const inCombat = level.monsters.some((monster) =>
      state.visibleCells.has(`${monster.position.x},${monster.position.y}`)
    )
    const regenResult: RegenerationTickResult = this.regenerationService.tickRegeneration(player, inCombat)
    player = regenResult.player
    messages.push(...regenResult.messages)

    // 3. Tick light fuel
    const fuelResult: FuelTickResult = this.lightingService.tickFuel(player)
    const updatedPlayer = fuelResult.player
    messages.push(...fuelResult.messages)

    // 4. Update FOV and exploration
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const fovResult: FOVUpdateResult = this.fovService.updateFOVAndExploration(
      finalPosition, // Use final position (may be teleported)
      lightRadius,
      updatedLevel,
      updatedPlayer
    )

    // 5. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, fovResult.level)

    // 6. Generate auto-notifications
    const stateWithUpdatedLevel = {
      ...state,
      player: updatedPlayer,
      visibleCells: fovResult.visibleCells,
      levels: updatedLevels,
    }
    const notifications = this.notificationService.generateNotifications(
      stateWithUpdatedLevel,
      state.player.position
    )

    // 7. Add hunger/fuel messages to message log
    let finalMessages = state.messages
    messages.forEach((msg) => {
      finalMessages = this.messageService.addMessage(
        finalMessages,
        msg.text,
        msg.type,
        state.turnCount + 1
      )
    })

    // 8. Add auto-notifications to message log
    notifications.forEach((msg) => {
      finalMessages = this.messageService.addMessage(finalMessages, msg, 'info', state.turnCount + 1)
    })

    // 9. Return with turn increment
    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      visibleCells: fovResult.visibleCells,
      levels: updatedLevels,
      messages: finalMessages,
    })
  }

}
