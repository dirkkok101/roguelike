// ============================================================================
// RANDOM SERVICE - Injectable interface for deterministic testing
// ============================================================================

export interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean
  pickRandom<T>(array: T[]): T
  getState(): string  // Capture RNG internal state for replay
  setState(state: string): void  // Restore RNG internal state for replay
}

// ============================================================================
// SEEDED RANDOM - Production implementation
// ============================================================================

export class SeededRandom implements IRandomService {
  private seed: number

  constructor(seed: string) {
    this.seed = this.hashSeed(seed)
  }

  private hashSeed(seed: string): number {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  roll(dice: string): number {
    // Parse "2d8", "1d20+3", etc.
    const match = dice.match(/(\d+)d(\d+)([+\-]\d+)?/)
    if (!match) throw new Error(`Invalid dice notation: ${dice}`)

    const count = parseInt(match[1])
    const sides = parseInt(match[2])
    const modifier = match[3] ? parseInt(match[3]) : 0

    let total = 0
    for (let i = 0; i < count; i++) {
      total += this.nextInt(1, sides)
    }
    return total + modifier
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pickRandom<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }

  getState(): string {
    // Return internal seed state as string for deterministic replay
    return this.seed.toString()
  }

  setState(state: string): void {
    // Restore internal seed state from string
    this.seed = parseInt(state, 10)
  }
}

// ============================================================================
// MOCK RANDOM - Testing implementation
// ============================================================================

export class MockRandom implements IRandomService {
  private values: number[] = []
  private index = 0

  constructor(values?: number[]) {
    if (values) this.values = values
  }

  setValues(values: number[]): void {
    this.values = values
    this.index = 0
  }

  nextInt(_min: number, _max: number): number {
    if (this.index >= this.values.length) {
      throw new Error('MockRandom: No more values')
    }
    return this.values[this.index++]
  }

  roll(_dice: string): number {
    return this.nextInt(0, 100)
  }

  shuffle<T>(array: T[]): T[] {
    return array
  }

  chance(_probability: number): boolean {
    return this.nextInt(0, 1) === 1
  }

  pickRandom<T>(array: T[]): T {
    return array[0]
  }

  getState(): string {
    // MockRandom state: current index and values
    return JSON.stringify({ index: this.index, values: this.values })
  }

  setState(state: string): void {
    // Restore MockRandom state
    const parsed = JSON.parse(state)
    this.index = parsed.index
    this.values = parsed.values
  }
}
