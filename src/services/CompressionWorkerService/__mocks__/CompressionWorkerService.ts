// Mock for CompressionWorkerService (Jest can't parse import.meta.url)
export class CompressionWorkerService {
  private testMode = true

  constructor() {
    // Always in test mode for mocks
  }

  enableTestMode(): void {
    this.testMode = true
  }

  disableTestMode(): void {
    this.testMode = true // Keep in test mode
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
