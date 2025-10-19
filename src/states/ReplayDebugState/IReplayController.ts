import { GameState } from '@game/core/core'
import { CommandEvent, ReplayMetadata } from '@game/replay/replay'

/**
 * IReplayController - Interface for replay debugger control
 *
 * Provides state queries and playback control for UI components.
 * Components receive this interface and remain decoupled from ReplayDebugState.
 */
export interface IReplayController {
  // State queries
  getCurrentTurn(): number
  getTotalTurns(): number
  getCurrentState(): GameState | null
  getReplayMetadata(): ReplayMetadata | null
  getCommands(): ReadonlyArray<CommandEvent>
  isLoading(): boolean
  isReconstructing(): boolean

  // Playback control (async because they reconstruct state)
  stepForward(): Promise<void>
  stepBackward(): Promise<void>
  jumpToTurn(turn: number): Promise<void>
  skipToStart(): Promise<void>
  skipToEnd(): Promise<void>

  // Observer pattern
  onStateChange(callback: () => void): void
  removeStateChangeListener(callback: () => void): void

  // Close debugger
  close(): void
}
