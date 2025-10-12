// Mock for CompressionWorkerService (Jest can't parse import.meta.url)
export class CompressionWorkerService {
  constructor() {
    // Always in test mode for mocks
  }

  enableTestMode(): void {
    // No-op in mock (always in test mode)
  }

  disableTestMode(): void {
    // No-op in mock (always in test mode)
  }

  async compress(data: string): Promise<string> {
    // Synchronous mock compression (just return the data)
    const LZString = await import('lz-string')
    return LZString.compress(data)
  }

  async decompress(data: string): Promise<string> {
    // Synchronous mock decompression
    const LZString = await import('lz-string')
    return LZString.decompress(data) || ''
  }

  terminateWorker(): void {
    // No-op in mock
  }
}
