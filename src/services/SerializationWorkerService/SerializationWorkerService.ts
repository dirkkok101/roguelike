import type {
  SerializationRequest,
  SerializationResponse,
} from '../../workers/serializationWorker'

// ============================================================================
// SERIALIZATION WORKER SERVICE
// ============================================================================
// Wrapper around serialization Web Worker for off-thread JSON.stringify()

export class SerializationWorkerService {
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
   */
  private initializeWorker(): void {
    // Skip worker initialization in Node/Jest environment or test mode
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
      const getWorkerUrl = new Function('return import.meta.url')
      this.worker = new Worker(
        new URL('../../workers/serializationWorker.ts', getWorkerUrl()),
        { type: 'module' }
      )

      this.worker.onmessage = (event: MessageEvent<SerializationResponse>) => {
        const response = event.data
        const pending = this.pendingRequests.get(response.id)

        if (pending) {
          this.pendingRequests.delete(response.id)

          if (response.success && response.result) {
            pending.resolve(response.result)
          } else {
            pending.reject(new Error(response.error || 'Serialization failed'))
          }
        }
      }

      this.worker.onerror = (error) => {
        console.error('Serialization worker error:', error)

        // Reject all pending requests
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
          console.error('Max worker init attempts reached - falling back to synchronous serialization')
        }
      }
    } catch (error) {
      console.warn('Failed to initialize serialization worker:', error)
      this.worker = null
    }
  }

  /**
   * Serialize state to JSON using Web Worker
   * Worker handles prepareStateForSerialization() and JSON.stringify() off the main thread
   */
  async serialize(state: any, saveVersion: number): Promise<string> {
    if (this.testMode) {
      // Synchronous serialization for tests
      const prepared = this.prepareStateForSerializationSync(state, saveVersion)
      return JSON.stringify(prepared)
    }

    if (!this.worker) {
      // Fallback to synchronous (defer to next tick to avoid blocking)
      return new Promise((resolve) => {
        setTimeout(() => {
          const prepared = this.prepareStateForSerializationSync(state, saveVersion)
          resolve(JSON.stringify(prepared))
        }, 0)
      })
    }

    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`

      // Add timeout to prevent hanging indefinitely (30 seconds)
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Worker timeout - serialization took too long (>30s)'))
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

      const request: SerializationRequest = {
        type: 'serialize',
        state,
        saveVersion,
        id,
      }

      this.worker!.postMessage(request)
    })
  }

  /**
   * Synchronous version of state preparation for test mode and fallback
   * Duplicates logic from worker (unfortunate but necessary for fallback)
   */
  private prepareStateForSerializationSync(state: any, saveVersion: number): any {
    const serializedLevels: Array<[number, any]> = Array.from(state.levels.entries()).map(
      ([depth, level]: [number, any]) => {
        const serializedLevel = {
          ...level,
          monsters: level.monsters.map((m: any) => ({
            ...m,
            visibleCells: Array.from(m.visibleCells),
            currentPath: m.currentPath,
          })),
        }
        return [depth, serializedLevel]
      }
    )

    return {
      version: saveVersion,
      ...state,
      levels: serializedLevels,
      visibleCells: Array.from(state.visibleCells),
      identifiedItems: Array.from(state.identifiedItems),
      detectedMonsters: Array.from(state.detectedMonsters || []),
      detectedMagicItems: Array.from(state.detectedMagicItems || []),
      itemNameMap: {
        potions: Array.from(state.itemNameMap.potions.entries()),
        scrolls: Array.from(state.itemNameMap.scrolls.entries()),
        rings: Array.from(state.itemNameMap.rings.entries()),
        wands: Array.from(state.itemNameMap.wands.entries()),
      },
    }
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
