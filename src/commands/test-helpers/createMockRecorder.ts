import { CommandRecorderService } from '@services/CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'

/**
 * Creates a mock CommandRecorderService for testing.
 * By default, recordCommand does nothing (commands are not actually recorded in tests).
 * Tests that need to verify recording can spy on recordCommand.
 */
export function createMockRecorder(): CommandRecorderService {
  const mockIndexedDB = new IndexedDBService()
  return new CommandRecorderService(mockIndexedDB)
}
