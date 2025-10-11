import * as LZString from 'lz-string'

// ============================================================================
// COMPRESSION WEB WORKER
// ============================================================================
// Runs compression/decompression in background thread to avoid blocking main thread

export interface CompressionRequest {
  type: 'compress' | 'decompress'
  data: string
  id: string // Request ID for matching response
}

export interface CompressionResponse {
  success: boolean
  result?: string
  error?: string
  id: string // Matches request ID
}

// Worker message handler
self.onmessage = (event: MessageEvent<CompressionRequest>) => {
  const { type, data, id } = event.data

  try {
    if (type === 'compress') {
      const compressed = LZString.compress(data)
      const response: CompressionResponse = {
        success: true,
        result: compressed,
        id,
      }
      self.postMessage(response)
    } else if (type === 'decompress') {
      const decompressed = LZString.decompress(data)
      const response: CompressionResponse = {
        success: true,
        result: decompressed || '',
        id,
      }
      self.postMessage(response)
    } else {
      const response: CompressionResponse = {
        success: false,
        error: `Unknown compression type: ${type}`,
        id,
      }
      self.postMessage(response)
    }
  } catch (error) {
    const response: CompressionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Compression failed',
      id,
    }
    self.postMessage(response)
  }
}

// Export types for main thread to import
export {}
