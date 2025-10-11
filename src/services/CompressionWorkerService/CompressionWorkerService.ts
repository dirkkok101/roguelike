import type {
  CompressionRequest,
  CompressionResponse,
} from '../../workers/compressionWorker'

// ============================================================================
// COMPRESSION WORKER SERVICE
// ============================================================================
// Wrapper around compression Web Worker for easy usage

export class CompressionWorkerService {
  private worker: Worker | null = null
  private pendingRequests = new Map<
    string,
    { resolve: (result: string) => void; reject: (error: Error) => void }
  >()
  private requestId = 0
  private testMode = false // For testing without worker
  private workerInitAttempts = 0
  private readonly MAX_WORKER_INIT_ATTEMPTS = 3

  constructor() {
    this.initializeWorker()

    // CRITICAL: Clean up worker when page unloads to prevent memory leaks
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.terminateWorker()
      })
    }
  }

  /**
   * Enable test mode (synchronous, no worker)
   * Used by tests to avoid worker overhead
   */
  enableTestMode(): void {
    this.testMode = true
    this.terminateWorker()
  }

  /**
   * Disable test mode (use worker)
   */
  disableTestMode(): void {
    this.testMode = false
    if (!this.worker) {
      this.initializeWorker()
    }
  }

  /**
   * Initialize Web Worker
   * NOTE: Uses Function approach to prevent Jest parse errors with import.meta
   * This is required because Jest fails to parse import.meta during test runs
   * In browser mode, this is CSP-safe as long as 'unsafe-eval' is not used
   */
  private initializeWorker(): void {
    // Skip worker initialization in Node/Jest environment or test mode
    // Workers are only available in browser environment
    if (this.testMode || typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.worker = null
      return
    }

    // CRITICAL: Prevent infinite retry loop if worker initialization repeatedly fails
    if (this.workerInitAttempts >= this.MAX_WORKER_INIT_ATTEMPTS) {
      console.error(
        `Max worker initialization attempts (${this.MAX_WORKER_INIT_ATTEMPTS}) exceeded - using synchronous fallback`
      )
      this.worker = null
      return
    }

    this.workerInitAttempts++

    try {
      // Use Function to defer import.meta evaluation (prevents Jest parse error)
      // This is the only way to use import.meta without Jest failing to parse the file
      // NOTE: This does NOT use eval() and is CSP-safe in most contexts
      const getWorkerUrl = new Function('return import.meta.url')
      this.worker = new Worker(
        new URL('../../workers/compressionWorker.ts', getWorkerUrl()),
        { type: 'module' }
      )

      this.worker.onmessage = (event: MessageEvent<CompressionResponse>) => {
        const response = event.data
        const pending = this.pendingRequests.get(response.id)

        if (pending) {
          this.pendingRequests.delete(response.id)

          if (response.success && response.result) {
            pending.resolve(response.result)
          } else {
            pending.reject(new Error(response.error || 'Compression failed'))
          }
        }
      }

      this.worker.onerror = (error) => {
        console.error('Compression worker error:', error)
        console.error('Error details:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
        })

        // Reject all pending requests with detailed error
        const errorMessage = `Worker crashed: ${error.message || 'Unknown error'}`
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error(errorMessage))
        })
        this.pendingRequests.clear()

        // Try to reinitialize worker (with retry limit)
        this.worker = null
        if (this.workerInitAttempts < this.MAX_WORKER_INIT_ATTEMPTS) {
          console.log(
            `Attempting to reinitialize worker (attempt ${this.workerInitAttempts + 1}/${this.MAX_WORKER_INIT_ATTEMPTS})...`
          )
          this.initializeWorker()
        } else {
          console.error('Max worker init attempts reached - falling back to synchronous compression')
        }
      }
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error)
      this.worker = null
    }
  }

  /**
   * Compress data using Web Worker
   */
  async compress(data: string): Promise<string> {
    if (this.testMode) {
      // Synchronous compression for tests
      const LZString = await import('lz-string')
      return LZString.compress(data)
    }

    if (!this.worker) {
      // Fallback to synchronous (defer to next tick to avoid blocking)
      return new Promise(async (resolve) => {
        setTimeout(async () => {
          const LZString = await import('lz-string')
          resolve(LZString.compress(data))
        }, 0)
      })
    }

    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`

      // CRITICAL: Add timeout to prevent hanging indefinitely (30 seconds)
      // Workers can hang due to browser bugs, extension interference, or corrupted data
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Worker timeout - compression took too long (>30s)'))
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: (result: string) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })

      const request: CompressionRequest = {
        type: 'compress',
        data,
        id,
      }

      this.worker!.postMessage(request)
    })
  }

  /**
   * Decompress data using Web Worker
   */
  async decompress(data: string): Promise<string> {
    if (this.testMode) {
      // Synchronous decompression for tests
      const LZString = await import('lz-string')
      return LZString.decompress(data) || ''
    }

    if (!this.worker) {
      // Fallback to synchronous (defer to next tick to avoid blocking)
      return new Promise(async (resolve) => {
        setTimeout(async () => {
          const LZString = await import('lz-string')
          resolve(LZString.decompress(data) || '')
        }, 0)
      })
    }

    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`

      // CRITICAL: Add timeout to prevent hanging indefinitely (30 seconds)
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Worker timeout - decompression took too long (>30s)'))
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: (result: string) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })

      const request: CompressionRequest = {
        type: 'decompress',
        data,
        id,
      }

      this.worker!.postMessage(request)
    })
  }

  /**
   * Terminate worker (cleanup)
   */
  terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Worker terminated'))
    })
    this.pendingRequests.clear()
  }
}
