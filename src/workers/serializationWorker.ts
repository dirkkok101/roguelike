// ============================================================================
// SERIALIZATION WORKER - Background state serialization
// ============================================================================
// Runs prepareStateForSerialization() and JSON.stringify() OFF THE MAIN THREAD
// This prevents keyboard input blocking during saves

export interface SerializationRequest {
  type: 'serialize'
  state: any // Raw GameState (not prepared - we do preparation here)
  saveVersion: number
  id: string
}

export interface SerializationResponse {
  type: 'serialize'
  id: string
  success: boolean
  result?: string // JSON string
  error?: string
}

/**
 * Prepare state for serialization (OFF MAIN THREAD)
 * Converts Maps/Sets to arrays so they can be JSON serialized
 * This is the EXPENSIVE operation (5-15ms for 26 levels) that we moved off the main thread
 */
function prepareStateForSerialization(state: any, saveVersion: number): any {
  // Convert levels Map to array with serialized monsters
  const serializedLevels: Array<[number, any]> = Array.from(state.levels.entries()).map(
    ([depth, level]: [number, any]) => {
      const serializedLevel = {
        ...level,
        monsters: level.monsters.map((m: any) => ({
          ...m,
          visibleCells: Array.from(m.visibleCells), // Set → Array (expensive)
          currentPath: m.currentPath,
        })),
      }
      return [depth, serializedLevel]
    }
  )

  return {
    version: saveVersion, // Add version for compatibility checking
    ...state,
    levels: serializedLevels,
    visibleCells: Array.from(state.visibleCells), // Set → Array
    identifiedItems: Array.from(state.identifiedItems), // Set → Array
    detectedMonsters: Array.from(state.detectedMonsters || []), // Set → Array
    detectedMagicItems: Array.from(state.detectedMagicItems || []), // Set → Array
    // Serialize nested Maps in itemNameMap
    itemNameMap: {
      potions: Array.from(state.itemNameMap.potions.entries()),
      scrolls: Array.from(state.itemNameMap.scrolls.entries()),
      rings: Array.from(state.itemNameMap.rings.entries()),
      wands: Array.from(state.itemNameMap.wands.entries()),
    },
  }
}

// Worker message handler
self.onmessage = (event: MessageEvent<SerializationRequest>) => {
  const request = event.data

  try {
    if (request.type === 'serialize') {
      // STEP 1: Convert Maps/Sets to Arrays (OFF MAIN THREAD - this is the key fix!)
      const serializable = prepareStateForSerialization(request.state, request.saveVersion)

      // STEP 2: JSON.stringify() (OFF MAIN THREAD)
      const json = JSON.stringify(serializable)

      const response: SerializationResponse = {
        type: 'serialize',
        id: request.id,
        success: true,
        result: json,
      }

      self.postMessage(response)
    }
  } catch (error) {
    const response: SerializationResponse = {
      type: 'serialize',
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    self.postMessage(response)
  }
}
