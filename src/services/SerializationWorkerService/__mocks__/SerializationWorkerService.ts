// Mock for SerializationWorkerService (Jest can't parse import.meta.url)
export class SerializationWorkerService {
  constructor() {
    // Always in test mode for mocks
  }

  enableTestMode(): void {
    // No-op in mock (always in test mode)
  }

  disableTestMode(): void {
    // No-op in mock (always in test mode)
  }

  async serialize(state: any, saveVersion: number): Promise<string> {
    // Synchronous serialization for tests
    const prepared = this.prepareStateForSerializationSync(state, saveVersion)
    return JSON.stringify(prepared)
  }

  private prepareStateForSerializationSync(state: any, saveVersion: number): any {
    const serializedLevels: Array<[number, any]> = (Array.from(state.levels.entries()) as Array<[number, any]>).map(
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
      levelsVisitedWithAmulet: Array.from(state.levelsVisitedWithAmulet || []),
      itemNameMap: {
        potions: Array.from(state.itemNameMap.potions.entries()),
        scrolls: Array.from(state.itemNameMap.scrolls.entries()),
        rings: Array.from(state.itemNameMap.rings.entries()),
        wands: Array.from(state.itemNameMap.wands.entries()),
      },
    }
  }

  terminateWorker(): void {
    // No-op in mock
  }
}
