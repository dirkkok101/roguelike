import { CommandRecorderService } from '@services/CommandRecorderService'

/**
 * Creates a mock CommandRecorderService for testing.
 * By default, recordCommand does nothing (commands are not actually recorded in tests).
 * Tests that need to verify recording can spy on recordCommand.
 */
export function createMockRecorder(): CommandRecorderService {
  return new CommandRecorderService()
}
