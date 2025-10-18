import { ICommand } from '@commands/ICommand'
import { CommandEvent } from '@game/replay/replay'

/**
 * ICommandFactory
 *
 * Factory interface for creating command instances from command events.
 * Used by ReplayDebuggerService to reconstruct commands during replay.
 */
export interface ICommandFactory {
  /**
   * Create a command instance from a recorded command event
   *
   * @param event - The command event to reconstruct
   * @returns Command instance ready to execute
   * @throws Error if command type is unknown or unsupported
   */
  createFromEvent(event: CommandEvent): ICommand
}
