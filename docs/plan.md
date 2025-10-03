# Implementation Plan: ASCII Roguelike

**Version**: 1.0
**Last Updated**: 2025-10-03
**Reference**: See `prd.md` for complete requirements

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 0: Project Setup](#phase-0-project-setup)
3. [Phase 1: Foundation & Core Loop](#phase-1-foundation--core-loop)
4. [Phase 2: Combat & Monsters](#phase-2-combat--monsters)
5. [Phase 3: Advanced Dungeon Generation](#phase-3-advanced-dungeon-generation)
6. [Phase 4: Complete AI Behaviors](#phase-4-complete-ai-behaviors)
7. [Phase 5: Items & Inventory](#phase-5-items--inventory)
8. [Phase 6: Hunger & Progression](#phase-6-hunger--progression)
9. [Phase 7: Win Condition & Polish](#phase-7-win-condition--polish)
10. [Phase 8: Testing, Balance & Bug Fixes](#phase-8-testing-balance--bug-fixes)
11. [Appendix A: Complete File Structure](#appendix-a-complete-file-structure)
12. [Appendix B: Data File Templates](#appendix-b-data-file-templates)
13. [Appendix C: Testing Patterns](#appendix-c-testing-patterns)
14. [Appendix D: Dependency Graph](#appendix-d-dependency-graph)

---

## Overview

### Purpose

This document provides step-by-step implementation guidance for building the ASCII Roguelike game defined in `prd.md`. It breaks down each development phase into granular tasks with:

- Exact file creation order
- Code scaffolding and interfaces
- Dependencies between components
- Testing approach for each feature
- Configuration details

### How to Use This Plan

1. **Follow phases sequentially** - Each phase builds on the previous
2. **Complete all tasks in a phase** before moving to the next
3. **Run tests frequently** - Ensure each component works before building the next
4. **Reference PRD** for feature requirements and architecture details
5. **Use provided code scaffolds** as starting points

### Development Principles

- **Test-Driven Development**: Write tests before or alongside implementation
- **Incremental Progress**: Small, working iterations
- **Clean Architecture**: Strict layer separation (Services → Commands → UI)
- **Immutable State**: All state updates return new objects
- **Dependency Injection**: Services injected for testability

---

## Phase 0: Project Setup

**Goal**: Initialize project with build tools, TypeScript, testing framework, and folder structure

### 0.1 Initialize npm Project

**Task**: Create package.json

```bash
npm init -y
```

**Update package.json**:
```json
{
  "name": "web-roguelike",
  "version": "1.0.0",
  "description": "Classic ASCII roguelike in TypeScript",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "keywords": ["roguelike", "ascii", "game"],
  "author": "",
  "license": "MIT"
}
```

### 0.2 Install Dependencies

**Dev Dependencies**:
```bash
npm install -D vite typescript @types/node
npm install -D jest @types/jest ts-jest
npm install -D @testing-library/dom @testing-library/jest-dom
```

**No runtime dependencies** (vanilla TypeScript only)

### 0.3 Configure TypeScript

**Create `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@services/*": ["src/services/*"],
      "@commands/*": ["src/commands/*"],
      "@types/*": ["src/types/*"],
      "@ui/*": ["src/ui/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.4 Configure Vite

**Create `vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@services': path.resolve(__dirname, './src/services'),
      '@commands': path.resolve(__dirname, './src/commands'),
      '@types': path.resolve(__dirname, './src/types'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
  },
})
```

### 0.5 Configure Jest

**Create `jest.config.js`**:
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

### 0.6 Create Folder Structure

```bash
mkdir -p src/{types,services,commands,ui,utils}
mkdir -p src/__tests__/{services,commands,ui,utils}
mkdir -p public/data
mkdir -p public/assets
```

**Complete structure**:
```
roguelike/
├── src/
│   ├── types/           # TypeScript interfaces and types
│   ├── services/        # Game logic layer
│   ├── commands/        # Command pattern orchestration
│   ├── ui/             # DOM rendering and input
│   ├── utils/          # Helper functions
│   ├── __tests__/      # Test files (mirrors src structure)
│   └── main.ts         # Entry point
├── public/
│   ├── data/           # JSON data files
│   │   ├── monsters.json
│   │   ├── items.json
│   │   └── config.json
│   └── assets/         # Future assets (fonts, images)
├── docs/
│   ├── prd.md          # Product requirements
│   └── plan.md         # This file
├── dist/               # Build output (generated)
├── node_modules/       # Dependencies (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── jest.config.js
├── .gitignore
└── README.md
```

### 0.7 Create .gitignore

**Create `.gitignore`**:
```
# Dependencies
node_modules/

# Build output
dist/
dist-ssr/

# Environment
.env
.env.local

# Logs
*.log
npm-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Temporary
*.tmp
```

### 0.8 Create Entry Files

**Create `public/index.html`**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Roguelike: Quest for the Amulet of Yendor</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background-color: #1a1a1a;
        color: #ffffff;
        font-family: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;
        overflow: hidden;
      }
      #app {
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Create `src/main.ts`** (placeholder):
```typescript
console.log('Roguelike initializing...')

const app = document.getElementById('app')
if (app) {
  app.innerHTML = '<h1>Welcome to the Dungeon</h1>'
}
```

### 0.9 Verify Setup

**Test build**:
```bash
npm run dev
```

Visit `http://localhost:3000` - should see "Welcome to the Dungeon"

**Test TypeScript**:
```bash
npx tsc --noEmit
```

Should compile without errors.

**Test Jest**:
```bash
npm test
```

Should run (no tests yet).

---

## Phase 1: Foundation & Core Loop

**Goal**: Basic movement, rendering, lighting, and FOV working
**Duration**: Week 1-2
**Deliverable**: Player can move around a room, see FOV change with light, observe fog of war

### 1.1 Core Type Definitions

**Create `src/types/core.ts`**:
```typescript
// ============================================================================
// CORE TYPES
// ============================================================================

export interface Position {
  x: number
  y: number
}

export enum TileType {
  WALL = 'WALL',
  FLOOR = 'FLOOR',
  CORRIDOR = 'CORRIDOR',
  DOOR = 'DOOR',
  TRAP = 'TRAP',
}

export interface Tile {
  type: TileType
  char: string
  walkable: boolean
  transparent: boolean
  colorVisible: string
  colorExplored: string
}

export enum DoorState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED',
  BROKEN = 'BROKEN',
  SECRET = 'SECRET',
  ARCHWAY = 'ARCHWAY',
}

export interface Door {
  position: Position
  state: DoorState
  discovered: boolean
  orientation: 'horizontal' | 'vertical'
  connectsRooms: [number, number]
}

export interface Room {
  id: number
  x: number
  y: number
  width: number
  height: number
}

export interface Level {
  depth: number
  width: number
  height: number
  tiles: Tile[][]
  rooms: Room[]
  doors: Door[]
  monsters: Monster[]
  items: Item[]
  gold: GoldPile[]
  stairsUp: Position | null
  stairsDown: Position | null
  explored: boolean[][]
}

export interface LightSource {
  type: 'torch' | 'lantern' | 'artifact'
  radius: number
  isPermanent: boolean
  fuel?: number
  maxFuel?: number
  name: string
}

export interface Equipment {
  weapon: Weapon | null
  armor: Armor | null
  leftRing: Ring | null
  rightRing: Ring | null
  lightSource: LightSource | null
}

export interface Player {
  position: Position
  hp: number
  maxHp: number
  strength: number
  maxStrength: number
  ac: number
  level: number
  xp: number
  gold: number
  hunger: number
  equipment: Equipment
  inventory: Item[]
}

export interface Monster {
  id: string
  letter: string
  name: string
  position: Position
  hp: number
  maxHp: number
  ac: number
  damage: string
  xpValue: number
  aiProfile: MonsterAIProfile
  isAsleep: boolean
  isAwake: boolean
  state: MonsterState
  visibleCells: Set<Position>
  currentPath: Position[] | null
  hasStolen: boolean
  level: number
}

export enum MonsterBehavior {
  SMART = 'SMART',
  GREEDY = 'GREEDY',
  ERRATIC = 'ERRATIC',
  SIMPLE = 'SIMPLE',
  THIEF = 'THIEF',
  STATIONARY = 'STATIONARY',
  COWARD = 'COWARD',
}

export enum MonsterState {
  SLEEPING = 'SLEEPING',
  WANDERING = 'WANDERING',
  HUNTING = 'HUNTING',
  FLEEING = 'FLEEING',
}

export interface MonsterAIProfile {
  behavior: MonsterBehavior | MonsterBehavior[]
  intelligence: number
  aggroRange: number
  fleeThreshold: number
  special: string[]
}

export interface GameState {
  player: Player
  currentLevel: number
  levels: Map<number, Level>
  visibleCells: Set<Position>
  messages: Message[]
  turnCount: number
  seed: string
  gameId: string
  isGameOver: boolean
  hasWon: boolean
}

export interface Message {
  text: string
  type: 'info' | 'combat' | 'warning' | 'critical' | 'success'
  turn: number
}

// Item types (minimal for Phase 1, expanded in Phase 5)
export interface Item {
  id: string
  name: string
  type: ItemType
  identified: boolean
}

export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  POTION = 'POTION',
  SCROLL = 'SCROLL',
  RING = 'RING',
  WAND = 'WAND',
  FOOD = 'FOOD',
  GOLD = 'GOLD',
  AMULET = 'AMULET',
}

export interface Weapon extends Item {
  damage: string
  bonus: number
}

export interface Armor extends Item {
  ac: number
  bonus: number
}

export interface Ring extends Item {
  effect: string
  bonus: number
}

export interface GoldPile {
  position: Position
  amount: number
}
```

**Test file `src/__tests__/types/core.test.ts`**:
```typescript
import { Position, TileType, DoorState } from '@types/core'

describe('Core Types', () => {
  test('Position type works', () => {
    const pos: Position = { x: 5, y: 10 }
    expect(pos.x).toBe(5)
    expect(pos.y).toBe(10)
  })

  test('TileType enum works', () => {
    expect(TileType.WALL).toBe('WALL')
    expect(TileType.FLOOR).toBe('FLOOR')
  })

  test('DoorState enum works', () => {
    expect(DoorState.OPEN).toBe('OPEN')
    expect(DoorState.CLOSED).toBe('CLOSED')
  })
})
```

### 1.2 Random Service (Injectable)

**Create `src/services/RandomService.ts`**:
```typescript
// ============================================================================
// RANDOM SERVICE - Injectable interface for deterministic testing
// ============================================================================

export interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean
  pickRandom<T>(array: T[]): T
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

  nextInt(min: number, max: number): number {
    if (this.index >= this.values.length) {
      throw new Error('MockRandom: No more values')
    }
    return this.values[this.index++]
  }

  roll(dice: string): number {
    return this.nextInt(0, 100)
  }

  shuffle<T>(array: T[]): T[] {
    return array
  }

  chance(probability: number): boolean {
    return this.nextInt(0, 1) === 1
  }

  pickRandom<T>(array: T[]): T {
    return array[0]
  }
}
```

**Test file `src/__tests__/services/RandomService.test.ts`**:
```typescript
import { SeededRandom, MockRandom } from '@services/RandomService'

describe('SeededRandom', () => {
  test('same seed produces same results', () => {
    const rng1 = new SeededRandom('test123')
    const rng2 = new SeededRandom('test123')

    expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))
    expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100))
  })

  test('different seeds produce different results', () => {
    const rng1 = new SeededRandom('seed1')
    const rng2 = new SeededRandom('seed2')

    expect(rng1.nextInt(1, 100)).not.toBe(rng2.nextInt(1, 100))
  })

  test('roll parses dice notation correctly', () => {
    const rng = new SeededRandom('test')
    const result = rng.roll('2d6')
    expect(result).toBeGreaterThanOrEqual(2)
    expect(result).toBeLessThanOrEqual(12)
  })

  test('roll handles modifiers', () => {
    const rng = new SeededRandom('test')
    const result = rng.roll('1d20+5')
    expect(result).toBeGreaterThanOrEqual(6)
    expect(result).toBeLessThanOrEqual(25)
  })
})

describe('MockRandom', () => {
  test('returns preset values', () => {
    const mock = new MockRandom([5, 10, 15])
    expect(mock.nextInt(0, 100)).toBe(5)
    expect(mock.nextInt(0, 100)).toBe(10)
    expect(mock.nextInt(0, 100)).toBe(15)
  })

  test('throws when no more values', () => {
    const mock = new MockRandom([5])
    mock.nextInt(0, 100)
    expect(() => mock.nextInt(0, 100)).toThrow()
  })
})
```

### 1.3 Lighting Service

**Create `src/services/LightingService.ts`**:
```typescript
import { LightSource } from '@types/core'
import { IRandomService } from './RandomService'

// ============================================================================
// LIGHTING SERVICE - Light source management and fuel tracking
// ============================================================================

export class LightingService {
  constructor(private random: IRandomService) {}

  /**
   * Tick fuel consumption for a light source (call each turn)
   */
  tickFuel(lightSource: LightSource): LightSource {
    if (lightSource.isPermanent) {
      return lightSource
    }

    if (lightSource.fuel === undefined || lightSource.fuel <= 0) {
      return lightSource
    }

    return {
      ...lightSource,
      fuel: lightSource.fuel - 1,
    }
  }

  /**
   * Refill lantern with oil flask
   */
  refillLantern(lantern: LightSource, oilAmount: number = 500): LightSource {
    if (lantern.type !== 'lantern') {
      throw new Error('Can only refill lanterns')
    }

    const newFuel = Math.min(
      (lantern.fuel || 0) + oilAmount,
      lantern.maxFuel || 1000
    )

    return {
      ...lantern,
      fuel: newFuel,
    }
  }

  /**
   * Get light radius for FOV calculations
   */
  getLightRadius(lightSource: LightSource | null): number {
    if (!lightSource) return 0
    if (lightSource.fuel !== undefined && lightSource.fuel <= 0) return 0
    return lightSource.radius
  }

  /**
   * Check if fuel is running low
   */
  isFuelLow(lightSource: LightSource): boolean {
    if (lightSource.isPermanent) return false
    if (lightSource.fuel === undefined) return false
    return lightSource.fuel < 50
  }

  /**
   * Generate fuel warning message
   */
  generateFuelWarning(lightSource: LightSource): string | null {
    if (lightSource.isPermanent || lightSource.fuel === undefined) {
      return null
    }

    if (lightSource.fuel === 0) {
      return `Your ${lightSource.name.toLowerCase()} goes out! You are in darkness!`
    }

    if (lightSource.fuel === 10) {
      return `Your ${lightSource.name.toLowerCase()} flickers...`
    }

    if (lightSource.fuel === 50) {
      return `Your ${lightSource.name.toLowerCase()} is getting dim...`
    }

    return null
  }

  /**
   * Create a new torch
   */
  createTorch(): LightSource {
    return {
      type: 'torch',
      radius: 1,
      isPermanent: false,
      fuel: 500,
      maxFuel: 500,
      name: 'Torch',
    }
  }

  /**
   * Create a new lantern
   */
  createLantern(): LightSource {
    return {
      type: 'lantern',
      radius: 2,
      isPermanent: false,
      fuel: 500,
      maxFuel: 1000,
      name: 'Lantern',
    }
  }

  /**
   * Create artifact light (permanent)
   */
  createArtifact(name: string, radius: number): LightSource {
    return {
      type: 'artifact',
      radius,
      isPermanent: true,
      name,
    }
  }
}
```

**Test file `src/__tests__/services/LightingService.test.ts`**:
```typescript
import { LightingService } from '@services/LightingService'
import { MockRandom } from '@services/RandomService'
import { LightSource } from '@types/core'

describe('LightingService', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  test('tickFuel reduces fuel by 1', () => {
    const torch = service.createTorch()
    const ticked = service.tickFuel(torch)
    expect(ticked.fuel).toBe(499)
  })

  test('tickFuel does not affect permanent lights', () => {
    const artifact = service.createArtifact('Phial', 3)
    const ticked = service.tickFuel(artifact)
    expect(ticked.fuel).toBeUndefined()
  })

  test('getLightRadius returns correct radius', () => {
    const torch = service.createTorch()
    expect(service.getLightRadius(torch)).toBe(1)

    const lantern = service.createLantern()
    expect(service.getLightRadius(lantern)).toBe(2)
  })

  test('getLightRadius returns 0 when fuel is 0', () => {
    const torch: LightSource = { ...service.createTorch(), fuel: 0 }
    expect(service.getLightRadius(torch)).toBe(0)
  })

  test('generateFuelWarning returns messages at thresholds', () => {
    let torch = service.createTorch()
    torch = { ...torch, fuel: 50 }
    expect(service.generateFuelWarning(torch)).toContain('getting dim')

    torch = { ...torch, fuel: 10 }
    expect(service.generateFuelWarning(torch)).toContain('flickers')

    torch = { ...torch, fuel: 0 }
    expect(service.generateFuelWarning(torch)).toContain('goes out')
  })

  test('refillLantern adds fuel', () => {
    let lantern = service.createLantern()
    lantern = { ...lantern, fuel: 100 }
    const refilled = service.refillLantern(lantern, 500)
    expect(refilled.fuel).toBe(600)
  })

  test('refillLantern respects max fuel', () => {
    let lantern = service.createLantern()
    lantern = { ...lantern, fuel: 800 }
    const refilled = service.refillLantern(lantern, 500)
    expect(refilled.fuel).toBe(1000)
  })
})
```

### 1.4 FOV Service (Shadowcasting)

**Create `src/services/FOVService.ts`**:
```typescript
import { Position, Level, Tile } from '@types/core'

// ============================================================================
// FOV SERVICE - Recursive shadowcasting algorithm
// ============================================================================

export class FOVService {
  /**
   * Compute field of view from origin position
   * Returns set of visible positions
   */
  computeFOV(origin: Position, radius: number, level: Level): Set<string> {
    const visible = new Set<string>()

    // Origin is always visible
    visible.add(this.posToKey(origin))

    if (radius === 0) return visible

    // Process all 8 octants
    for (let octant = 0; octant < 8; octant++) {
      this.castLight(
        level,
        origin,
        radius,
        1,
        1.0,
        0.0,
        octant,
        visible
      )
    }

    return visible
  }

  /**
   * Check if position is in FOV
   */
  isInFOV(position: Position, visibleCells: Set<string>): boolean {
    return visibleCells.has(this.posToKey(position))
  }

  /**
   * Check if tile blocks vision
   */
  isBlocking(position: Position, level: Level): boolean {
    if (
      position.x < 0 ||
      position.x >= level.width ||
      position.y < 0 ||
      position.y >= level.height
    ) {
      return true
    }

    const tile = level.tiles[position.y][position.x]
    return !tile.transparent
  }

  // ============================================================================
  // PRIVATE: Recursive shadowcasting implementation
  // ============================================================================

  private castLight(
    level: Level,
    origin: Position,
    radius: number,
    row: number,
    startSlope: number,
    endSlope: number,
    octant: number,
    visible: Set<string>
  ): void {
    if (startSlope < endSlope) return

    let nextStartSlope = startSlope

    for (let i = row; i <= radius; i++) {
      let blocked = false

      for (let dx = -i, dy = -i; dx <= 0; dx++) {
        const currentX = dx
        const currentY = dy

        const lSlope = (dx - 0.5) / (dy + 0.5)
        const rSlope = (dx + 0.5) / (dy - 0.5)

        if (startSlope < rSlope) continue
        if (endSlope > lSlope) break

        // Transform to actual position based on octant
        const actualPos = this.transformOctant(
          origin,
          currentX,
          currentY,
          octant
        )

        // Check if within map bounds
        if (
          actualPos.x < 0 ||
          actualPos.x >= level.width ||
          actualPos.y < 0 ||
          actualPos.y >= level.height
        ) {
          continue
        }

        // Check if within radius (Euclidean distance)
        const distance = Math.sqrt(
          Math.pow(actualPos.x - origin.x, 2) +
            Math.pow(actualPos.y - origin.y, 2)
        )
        if (distance > radius) continue

        // Mark as visible
        visible.add(this.posToKey(actualPos))

        // Check if blocking
        const isBlocked = this.isBlocking(actualPos, level)

        if (blocked) {
          if (isBlocked) {
            nextStartSlope = rSlope
            continue
          } else {
            blocked = false
            startSlope = nextStartSlope
          }
        } else {
          if (isBlocked && i < radius) {
            blocked = true
            this.castLight(
              level,
              origin,
              radius,
              i + 1,
              startSlope,
              lSlope,
              octant,
              visible
            )
            nextStartSlope = rSlope
          }
        }
      }

      if (blocked) break
    }
  }

  /**
   * Transform coordinates based on octant
   */
  private transformOctant(
    origin: Position,
    x: number,
    y: number,
    octant: number
  ): Position {
    switch (octant) {
      case 0:
        return { x: origin.x + x, y: origin.y - y }
      case 1:
        return { x: origin.x + y, y: origin.y - x }
      case 2:
        return { x: origin.x + y, y: origin.y + x }
      case 3:
        return { x: origin.x + x, y: origin.y + y }
      case 4:
        return { x: origin.x - x, y: origin.y + y }
      case 5:
        return { x: origin.x - y, y: origin.y + x }
      case 6:
        return { x: origin.x - y, y: origin.y - x }
      case 7:
        return { x: origin.x - x, y: origin.y - y }
      default:
        return origin
    }
  }

  /**
   * Convert position to string key for Set
   */
  private posToKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }

  /**
   * Convert string key back to position
   */
  keyToPos(key: string): Position {
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  }
}
```

**Test file `src/__tests__/services/FOVService.test.ts`**:
```typescript
import { FOVService } from '@services/FOVService'
import { Level, TileType, Position } from '@types/core'

describe('FOVService', () => {
  let service: FOVService

  beforeEach(() => {
    service = new FOVService()
  })

  function createTestLevel(width: number, height: number): Level {
    const tiles = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          }))
      )

    return {
      depth: 1,
      width,
      height,
      tiles,
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(height)
        .fill(null)
        .map(() => Array(width).fill(false)),
    }
  }

  test('origin is always visible', () => {
    const level = createTestLevel(10, 10)
    const origin: Position = { x: 5, y: 5 }
    const visible = service.computeFOV(origin, 3, level)

    expect(service.isInFOV(origin, visible)).toBe(true)
  })

  test('radius 0 only shows origin', () => {
    const level = createTestLevel(10, 10)
    const origin: Position = { x: 5, y: 5 }
    const visible = service.computeFOV(origin, 0, level)

    expect(visible.size).toBe(1)
  })

  test('walls block vision', () => {
    const level = createTestLevel(10, 10)

    // Place wall
    level.tiles[5][6] = {
      type: TileType.WALL,
      char: '#',
      walkable: false,
      transparent: false,
      colorVisible: '#8B7355',
      colorExplored: '#4A4A4A',
    }

    const origin: Position = { x: 5, y: 5 }
    const visible = service.computeFOV(origin, 3, level)

    // Wall at (6,5) should be visible
    expect(service.isInFOV({ x: 6, y: 5 }, visible)).toBe(true)

    // But tile behind wall at (7,5) should not be
    expect(service.isInFOV({ x: 7, y: 5 }, visible)).toBe(false)
  })

  test('radius limits visibility', () => {
    const level = createTestLevel(20, 20)
    const origin: Position = { x: 10, y: 10 }
    const visible = service.computeFOV(origin, 2, level)

    // Within radius
    expect(service.isInFOV({ x: 11, y: 10 }, visible)).toBe(true)
    expect(service.isInFOV({ x: 12, y: 10 }, visible)).toBe(true)

    // Outside radius
    expect(service.isInFOV({ x: 13, y: 10 }, visible)).toBe(false)
  })
})
```

### 1.5 Rendering Service

**Create `src/services/RenderingService.ts`**:
```typescript
import { Position, Level, Tile, Monster, Item, GoldPile } from '@types/core'
import { FOVService } from './FOVService'

// ============================================================================
// RENDERING SERVICE - Visibility states and color selection
// ============================================================================

export type VisibilityState = 'visible' | 'explored' | 'unexplored'

export interface RenderConfig {
  showItemsInMemory: boolean
  showGoldInMemory: boolean
}

export class RenderingService {
  private fovService: FOVService

  constructor(fovService: FOVService) {
    this.fovService = fovService
  }

  /**
   * Determine visibility state for a position
   */
  getVisibilityState(
    position: Position,
    visibleCells: Set<string>,
    level: Level
  ): VisibilityState {
    const key = `${position.x},${position.y}`

    if (visibleCells.has(key)) {
      return 'visible'
    }

    if (level.explored[position.y]?.[position.x]) {
      return 'explored'
    }

    return 'unexplored'
  }

  /**
   * Determine if entity should be rendered
   */
  shouldRenderEntity(
    entityPosition: Position,
    entityType: 'monster' | 'item' | 'gold' | 'stairs' | 'trap',
    visibilityState: VisibilityState,
    config: RenderConfig
  ): boolean {
    // Never render unexplored
    if (visibilityState === 'unexplored') return false

    switch (entityType) {
      case 'monster':
        // Monsters only visible in FOV
        return visibilityState === 'visible'

      case 'item':
        // Items visible in FOV, optionally in memory
        return (
          visibilityState === 'visible' ||
          (visibilityState === 'explored' && config.showItemsInMemory)
        )

      case 'gold':
        // Gold visible in FOV, optionally in memory
        return (
          visibilityState === 'visible' ||
          (visibilityState === 'explored' && config.showGoldInMemory)
        )

      case 'stairs':
        // Stairs remembered once discovered
        return visibilityState === 'visible' || visibilityState === 'explored'

      case 'trap':
        // Traps only if discovered AND (visible or explored)
        // Note: discovery check handled by caller
        return visibilityState === 'visible' || visibilityState === 'explored'

      default:
        return false
    }
  }

  /**
   * Get color for tile based on visibility state
   */
  getColorForTile(tile: Tile, visibilityState: VisibilityState): string {
    switch (visibilityState) {
      case 'visible':
        return tile.colorVisible
      case 'explored':
        return tile.colorExplored
      case 'unexplored':
        return '#000000'
    }
  }

  /**
   * Get color for entity based on visibility state
   */
  getColorForEntity(
    entity: Monster | Item | GoldPile,
    visibilityState: VisibilityState
  ): string {
    if (visibilityState === 'unexplored') return '#000000'

    if (visibilityState === 'explored') {
      // Dimmed gray for explored
      return '#707070'
    }

    // Visible - return entity-specific color
    if ('letter' in entity) {
      // Monster - color by threat level
      return this.getMonsterColor(entity as Monster)
    }

    if ('amount' in entity) {
      // Gold
      return '#FFD700'
    }

    // Item - color by type
    return this.getItemColor(entity as Item)
  }

  /**
   * Get CSS class for visibility state
   */
  getCSSClass(visibilityState: VisibilityState, entityType?: string): string {
    const baseClass = `tile-${visibilityState}`
    return entityType ? `${baseClass} ${entityType}` : baseClass
  }

  // ============================================================================
  // PRIVATE: Color helpers
  // ============================================================================

  private getMonsterColor(monster: Monster): string {
    // Color by threat level based on letter
    const letter = monster.letter.charCodeAt(0)
    const A = 'A'.charCodeAt(0)
    const Z = 'Z'.charCodeAt(0)
    const position = letter - A
    const total = Z - A

    if (position < total * 0.25) {
      return '#44FF44' // Low threat - green
    } else if (position < total * 0.5) {
      return '#FFDD00' // Medium threat - yellow
    } else if (position < total * 0.75) {
      return '#FF8800' // High threat - orange
    } else {
      return '#FF4444' // Boss tier - red
    }
  }

  private getItemColor(item: Item): string {
    // Simplified for Phase 1, expanded in Phase 5
    return '#FFFFFF'
  }
}
```

**Test file `src/__tests__/services/RenderingService.test.ts`**:
```typescript
import { RenderingService, RenderConfig } from '@services/RenderingService'
import { FOVService } from '@services/FOVService'
import { Level, Position, TileType, Monster } from '@types/core'

describe('RenderingService', () => {
  let service: RenderingService
  let fovService: FOVService

  beforeEach(() => {
    fovService = new FOVService()
    service = new RenderingService(fovService)
  })

  function createMockLevel(): Level {
    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles: [],
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }
  }

  test('getVisibilityState returns visible when in FOV', () => {
    const level = createMockLevel()
    const visibleCells = new Set(['5,5'])
    const pos: Position = { x: 5, y: 5 }

    expect(service.getVisibilityState(pos, visibleCells, level)).toBe(
      'visible'
    )
  })

  test('getVisibilityState returns explored when not in FOV but explored', () => {
    const level = createMockLevel()
    level.explored[5][5] = true
    const visibleCells = new Set<string>()
    const pos: Position = { x: 5, y: 5 }

    expect(service.getVisibilityState(pos, visibleCells, level)).toBe(
      'explored'
    )
  })

  test('getVisibilityState returns unexplored otherwise', () => {
    const level = createMockLevel()
    const visibleCells = new Set<string>()
    const pos: Position = { x: 5, y: 5 }

    expect(service.getVisibilityState(pos, visibleCells, level)).toBe(
      'unexplored'
    )
  })

  test('monsters only render in visible state', () => {
    const config: RenderConfig = {
      showItemsInMemory: false,
      showGoldInMemory: false,
    }

    expect(
      service.shouldRenderEntity(
        { x: 0, y: 0 },
        'monster',
        'visible',
        config
      )
    ).toBe(true)
    expect(
      service.shouldRenderEntity(
        { x: 0, y: 0 },
        'monster',
        'explored',
        config
      )
    ).toBe(false)
    expect(
      service.shouldRenderEntity(
        { x: 0, y: 0 },
        'monster',
        'unexplored',
        config
      )
    ).toBe(false)
  })

  test('stairs render in visible and explored states', () => {
    const config: RenderConfig = {
      showItemsInMemory: false,
      showGoldInMemory: false,
    }

    expect(
      service.shouldRenderEntity({ x: 0, y: 0 }, 'stairs', 'visible', config)
    ).toBe(true)
    expect(
      service.shouldRenderEntity({ x: 0, y: 0 }, 'stairs', 'explored', config)
    ).toBe(true)
    expect(
      service.shouldRenderEntity(
        { x: 0, y: 0 },
        'stairs',
        'unexplored',
        config
      )
    ).toBe(false)
  })

  test('items render based on config', () => {
    const configShow: RenderConfig = {
      showItemsInMemory: true,
      showGoldInMemory: false,
    }
    const configHide: RenderConfig = {
      showItemsInMemory: false,
      showGoldInMemory: false,
    }

    expect(
      service.shouldRenderEntity({ x: 0, y: 0 }, 'item', 'visible', configShow)
    ).toBe(true)
    expect(
      service.shouldRenderEntity(
        { x: 0, y: 0 },
        'item',
        'explored',
        configShow
      )
    ).toBe(true)
    expect(
      service.shouldRenderEntity({ x: 0, y: 0 }, 'item', 'explored', configHide)
    ).toBe(false)
  })
})
```

### 1.6 Movement Service

**Create `src/services/MovementService.ts`**:
```typescript
import { Position, Level, GameState, Player } from '@types/core'

// ============================================================================
// MOVEMENT SERVICE - Position validation and collision detection
// ============================================================================

export class MovementService {
  /**
   * Check if position is walkable
   */
  isWalkable(position: Position, level: Level): boolean {
    if (!this.isInBounds(position, level)) return false

    const tile = level.tiles[position.y][position.x]
    return tile.walkable
  }

  /**
   * Check if position is within level bounds
   */
  isInBounds(position: Position, level: Level): boolean {
    return (
      position.x >= 0 &&
      position.x < level.width &&
      position.y >= 0 &&
      position.y < level.height
    )
  }

  /**
   * Get monster at position (if any)
   */
  getMonsterAt(position: Position, level: Level) {
    return level.monsters.find(
      (m) => m.position.x === position.x && m.position.y === position.y
    )
  }

  /**
   * Move player to new position
   */
  movePlayer(player: Player, newPosition: Position): Player {
    return {
      ...player,
      position: newPosition,
    }
  }

  /**
   * Calculate new position from direction
   */
  applyDirection(
    position: Position,
    direction: 'up' | 'down' | 'left' | 'right'
  ): Position {
    switch (direction) {
      case 'up':
        return { x: position.x, y: position.y - 1 }
      case 'down':
        return { x: position.x, y: position.y + 1 }
      case 'left':
        return { x: position.x - 1, y: position.y }
      case 'right':
        return { x: position.x + 1, y: position.y }
    }
  }

  /**
   * Check if position has item
   */
  hasItem(position: Position, level: Level): boolean {
    return level.items.some(
      (item) => item.position.x === position.x && item.position.y === position.y
    )
  }

  /**
   * Check if position has gold
   */
  hasGold(position: Position, level: Level): boolean {
    return level.gold.some(
      (gold) => gold.position.x === position.x && gold.position.y === position.y
    )
  }
}
```

**Test file `src/__tests__/services/MovementService.test.ts`**:
```typescript
import { MovementService } from '@services/MovementService'
import { Level, TileType, Position } from '@types/core'

describe('MovementService', () => {
  let service: MovementService

  beforeEach(() => {
    service = new MovementService()
  })

  function createTestLevel(): Level {
    const tiles = Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          }))
      )

    // Add a wall
    tiles[5][5] = {
      type: TileType.WALL,
      char: '#',
      walkable: false,
      transparent: false,
      colorVisible: '#8B7355',
      colorExplored: '#4A4A4A',
    }

    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }
  }

  test('isWalkable returns true for floor', () => {
    const level = createTestLevel()
    expect(service.isWalkable({ x: 0, y: 0 }, level)).toBe(true)
  })

  test('isWalkable returns false for wall', () => {
    const level = createTestLevel()
    expect(service.isWalkable({ x: 5, y: 5 }, level)).toBe(false)
  })

  test('isInBounds works correctly', () => {
    const level = createTestLevel()
    expect(service.isInBounds({ x: 0, y: 0 }, level)).toBe(true)
    expect(service.isInBounds({ x: 9, y: 9 }, level)).toBe(true)
    expect(service.isInBounds({ x: -1, y: 0 }, level)).toBe(false)
    expect(service.isInBounds({ x: 10, y: 0 }, level)).toBe(false)
  })

  test('applyDirection calculates correct positions', () => {
    const pos: Position = { x: 5, y: 5 }
    expect(service.applyDirection(pos, 'up')).toEqual({ x: 5, y: 4 })
    expect(service.applyDirection(pos, 'down')).toEqual({ x: 5, y: 6 })
    expect(service.applyDirection(pos, 'left')).toEqual({ x: 4, y: 5 })
    expect(service.applyDirection(pos, 'right')).toEqual({ x: 6, y: 5 })
  })
})
```

### 1.7 Message Service

**Create `src/services/MessageService.ts`**:
```typescript
import { Message } from '@types/core'

// ============================================================================
// MESSAGE SERVICE - Combat log and message management
// ============================================================================

export class MessageService {
  private maxMessages = 100

  /**
   * Add a new message
   */
  addMessage(
    messages: Message[],
    text: string,
    type: Message['type'],
    turn: number
  ): Message[] {
    const newMessage: Message = { text, type, turn }
    const updated = [...messages, newMessage]

    // Keep only last N messages
    if (updated.length > this.maxMessages) {
      return updated.slice(-this.maxMessages)
    }

    return updated
  }

  /**
   * Add multiple messages
   */
  addMessages(
    messages: Message[],
    newMessages: Array<{ text: string; type: Message['type'] }>,
    turn: number
  ): Message[] {
    let result = messages
    for (const msg of newMessages) {
      result = this.addMessage(result, msg.text, msg.type, turn)
    }
    return result
  }

  /**
   * Get recent messages (last N)
   */
  getRecentMessages(messages: Message[], count: number = 5): Message[] {
    return messages.slice(-count)
  }

  /**
   * Clear all messages
   */
  clearMessages(): Message[] {
    return []
  }
}
```

### 1.8 Move Command

**Create `src/commands/ICommand.ts`** (interface):
```typescript
import { GameState } from '@types/core'

// ============================================================================
// COMMAND INTERFACE - All commands implement this
// ============================================================================

export interface ICommand {
  execute(state: GameState): GameState
}
```

**Create `src/commands/MoveCommand.ts`**:
```typescript
import { GameState } from '@types/core'
import { ICommand } from './ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// MOVE COMMAND - Handle player movement
// ============================================================================

export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // 1. Calculate new position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // 2. Check if walkable
    if (!this.movementService.isWalkable(newPosition, level)) {
      return this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return state
    }

    // 3. Check for monster
    const monster = this.movementService.getMonsterAt(newPosition, level)
    if (monster) {
      // Combat happens here (Phase 2)
      // For now, just block movement
      const messages = this.messageService.addMessage(
        state.messages,
        `A ${monster.name} blocks your way!`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 4. Move player
    const player = this.movementService.movePlayer(state.player, newPosition)

    // 5. Tick hunger (placeholder for Phase 6)
    // const player = hungerService.tick(player)

    // 6. Tick light fuel
    let updatedPlayer = player
    if (player.equipment.lightSource) {
      const tickedLight = this.lightingService.tickFuel(
        player.equipment.lightSource
      )
      updatedPlayer = {
        ...player,
        equipment: {
          ...player.equipment,
          lightSource: tickedLight,
        },
      }

      // Check for fuel warning
      const warning = this.lightingService.generateFuelWarning(tickedLight)
      if (warning) {
        const messages = this.messageService.addMessage(
          state.messages,
          warning,
          'warning',
          state.turnCount + 1
        )
        return {
          ...state,
          player: updatedPlayer,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    }

    // 7. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(
      newPosition,
      lightRadius,
      level
    )

    // 8. Update explored tiles
    const updatedLevel = { ...level }
    visibleCells.forEach((key) => {
      const pos = this.fovService.keyToPos(key)
      if (updatedLevel.explored[pos.y]) {
        updatedLevel.explored[pos.y][pos.x] = true
      }
    })

    // 9. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
      turnCount: state.turnCount + 1,
    }
  }
}
```

**Test file `src/__tests__/commands/MoveCommand.test.ts`**:
```typescript
import { MoveCommand } from '@commands/MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, TileType } from '@types/core'

describe('MoveCommand', () => {
  let movementService: MovementService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService

  beforeEach(() => {
    movementService = new MovementService()
    lightingService = new LightingService(new MockRandom())
    fovService = new FOVService()
    messageService = new MessageService()
  })

  function createTestState(): GameState {
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#fff',
              colorExplored: '#666',
            }))
        ),
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }

    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 30,
        maxHp: 30,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: lightingService.createTorch(),
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
    }
  }

  test('moves player to new position', () => {
    const state = createTestState()
    const command = new MoveCommand(
      'right',
      movementService,
      lightingService,
      fovService,
      messageService
    )

    const newState = command.execute(state)
    expect(newState.player.position).toEqual({ x: 6, y: 5 })
  })

  test('increments turn count', () => {
    const state = createTestState()
    const command = new MoveCommand(
      'right',
      movementService,
      lightingService,
      fovService,
      messageService
    )

    const newState = command.execute(state)
    expect(newState.turnCount).toBe(1)
  })

  test('updates FOV after move', () => {
    const state = createTestState()
    const command = new MoveCommand(
      'right',
      movementService,
      lightingService,
      fovService,
      messageService
    )

    const newState = command.execute(state)
    expect(newState.visibleCells.size).toBeGreaterThan(0)
  })

  test('marks tiles as explored', () => {
    const state = createTestState()
    const command = new MoveCommand(
      'right',
      movementService,
      lightingService,
      fovService,
      messageService
    )

    const newState = command.execute(state)
    const level = newState.levels.get(1)!
    expect(level.explored[5][6]).toBe(true)
  })
})
```

### 1.9 Basic UI Setup

**Create `src/ui/GameRenderer.ts`**:
```typescript
import { GameState, Position } from '@types/core'
import { RenderingService } from '@services/RenderingService'

// ============================================================================
// GAME RENDERER - DOM rendering for game state
// ============================================================================

export class GameRenderer {
  private dungeonContainer: HTMLElement
  private statsContainer: HTMLElement
  private messagesContainer: HTMLElement

  constructor(
    private renderingService: RenderingService,
    private config = {
      dungeonWidth: 80,
      dungeonHeight: 22,
      showItemsInMemory: false,
      showGoldInMemory: false,
    }
  ) {
    // Create UI structure
    this.dungeonContainer = this.createDungeonView()
    this.statsContainer = this.createStatsView()
    this.messagesContainer = this.createMessagesView()
  }

  /**
   * Render complete game state
   */
  render(state: GameState): void {
    this.renderDungeon(state)
    this.renderStats(state)
    this.renderMessages(state)
  }

  /**
   * Get root container
   */
  getContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'game-container'
    container.appendChild(this.messagesContainer)
    container.appendChild(this.dungeonContainer)
    container.appendChild(this.statsContainer)
    return container
  }

  // ============================================================================
  // PRIVATE: Rendering methods
  // ============================================================================

  private createDungeonView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'dungeon'
    container.className = 'dungeon-view'
    return container
  }

  private createStatsView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'stats'
    container.className = 'stats-view'
    return container
  }

  private createMessagesView(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'messages'
    container.className = 'messages-view'
    return container
  }

  private renderDungeon(state: GameState): void {
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    let html = '<pre class="dungeon-grid">'

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const pos: Position = { x, y }
        const tile = level.tiles[y][x]
        const visState = this.renderingService.getVisibilityState(
          pos,
          state.visibleCells,
          level
        )

        // Check for entities at this position
        let char = tile.char
        let color = this.renderingService.getColorForTile(tile, visState)

        // Player
        if (
          pos.x === state.player.position.x &&
          pos.y === state.player.position.y
        ) {
          char = '@'
          color = '#00FFFF'
        }
        // Monsters (only if visible)
        else if (visState === 'visible') {
          const monster = level.monsters.find(
            (m) => m.position.x === x && m.position.y === y
          )
          if (monster) {
            char = monster.letter
            color = this.renderingService.getColorForEntity(monster, visState)
          }
        }

        html += `<span style="color: ${color}">${char}</span>`
      }
      html += '\n'
    }

    html += '</pre>'
    this.dungeonContainer.innerHTML = html
  }

  private renderStats(state: GameState): void {
    const { player } = state
    const lightSource = player.equipment.lightSource

    this.statsContainer.innerHTML = `
      <div class="stats">
        <div>HP: ${player.hp}/${player.maxHp}</div>
        <div>Str: ${player.strength}/${player.maxStrength}</div>
        <div>AC: ${player.ac}</div>
        <div>Level: ${player.level}</div>
        <div>XP: ${player.xp}</div>
        <div>Gold: ${player.gold}</div>
        <div>Depth: ${state.currentLevel}</div>
        <div>Turn: ${state.turnCount}</div>
        ${
          lightSource
            ? `<div>Light: ${lightSource.name} ${
                lightSource.fuel !== undefined ? `(${lightSource.fuel})` : ''
              }</div>`
            : '<div>Light: None (darkness!)</div>'
        }
      </div>
    `
  }

  private renderMessages(state: GameState): void {
    const recent = state.messages.slice(-5)
    this.messagesContainer.innerHTML = `
      <div class="messages">
        ${recent.map((msg) => `<div class="msg-${msg.type}">${msg.text}</div>`).join('')}
      </div>
    `
  }
}
```

**Create `src/ui/InputHandler.ts`**:
```typescript
import { ICommand } from '@commands/ICommand'
import { MoveCommand } from '@commands/MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// INPUT HANDLER - Keyboard input to commands
// ============================================================================

export class InputHandler {
  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService
  ) {}

  /**
   * Handle keyboard event and return command (if any)
   */
  handleKeyPress(event: KeyboardEvent): ICommand | null {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        return new MoveCommand(
          'up',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowDown':
        event.preventDefault()
        return new MoveCommand(
          'down',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowLeft':
        event.preventDefault()
        return new MoveCommand(
          'left',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowRight':
        event.preventDefault()
        return new MoveCommand(
          'right',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      default:
        return null
    }
  }
}
```

### 1.10 Main Game Loop

**Update `src/main.ts`**:
```typescript
import { GameState, Level, TileType, Position } from '@types/core'
import { SeededRandom } from '@services/RandomService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { RenderingService } from '@services/RenderingService'
import { MovementService } from '@services/MovementService'
import { MessageService } from '@services/MessageService'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'

// ============================================================================
// MAIN - Game initialization and loop
// ============================================================================

// Create services
const random = new SeededRandom('test-seed')
const lightingService = new LightingService(random)
const fovService = new FOVService()
const renderingService = new RenderingService(fovService)
const movementService = new MovementService()
const messageService = new MessageService()

// Create UI
const renderer = new GameRenderer(renderingService)
const inputHandler = new InputHandler(
  movementService,
  lightingService,
  fovService,
  messageService
)

// Create initial game state
function createInitialState(): GameState {
  // Create simple test level (single room)
  const width = 20
  const height = 15
  const tiles = Array(height)
    .fill(null)
    .map((_, y) =>
      Array(width)
        .fill(null)
        .map((_, x) => {
          // Border walls
          if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            return {
              type: TileType.WALL,
              char: '#',
              walkable: false,
              transparent: false,
              colorVisible: '#8B7355',
              colorExplored: '#4A4A4A',
            }
          }
          // Floor
          return {
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#A89078',
            colorExplored: '#5A5A5A',
          }
        })
    )

  const level: Level = {
    depth: 1,
    width,
    height,
    tiles,
    rooms: [{ id: 0, x: 1, y: 1, width: width - 2, height: height - 2 }],
    doors: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: { x: 10, y: 7 },
    explored: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
  }

  const startPos: Position = { x: 5, y: 5 }
  const torch = lightingService.createTorch()

  const player = {
    position: startPos,
    hp: 12,
    maxHp: 12,
    strength: 16,
    maxStrength: 16,
    ac: 4,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: torch,
    },
    inventory: [],
  }

  // Compute initial FOV
  const visibleCells = fovService.computeFOV(
    startPos,
    lightingService.getLightRadius(torch),
    level
  )

  // Mark initial tiles as explored
  visibleCells.forEach((key) => {
    const pos = fovService.keyToPos(key)
    level.explored[pos.y][pos.x] = true
  })

  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells,
    messages: [
      {
        text: 'Welcome to the dungeon. Find the Amulet of Yendor!',
        type: 'info',
        turn: 0,
      },
    ],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'game-' + Date.now(),
    isGameOver: false,
    hasWon: false,
  }
}

// Game state
let gameState = createInitialState()

// Render initial state
const app = document.getElementById('app')
if (app) {
  app.innerHTML = ''
  app.appendChild(renderer.getContainer())
  renderer.render(gameState)
}

// Input handling
document.addEventListener('keydown', (event) => {
  const command = inputHandler.handleKeyPress(event)
  if (command) {
    gameState = command.execute(gameState)
    renderer.render(gameState)
  }
})

console.log('Game initialized. Use arrow keys to move.')
```

### 1.11 CSS Styling

**Create `public/styles.css`** and link in index.html:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #1a1a1a;
  color: #ffffff;
  font-family: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.4;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
}

.messages-view {
  background: #2a2a2a;
  border: 1px solid #444;
  padding: 10px;
  min-height: 100px;
}

.messages div {
  margin: 2px 0;
}

.msg-info { color: #ffffff; }
.msg-combat { color: #ff8800; }
.msg-warning { color: #ffdd00; }
.msg-critical { color: #ff0000; }
.msg-success { color: #00ff00; }

.dungeon-view {
  background: #000000;
  border: 1px solid #444;
  padding: 10px;
}

.dungeon-grid {
  margin: 0;
  line-height: 1.2;
  letter-spacing: 2px;
}

.stats-view {
  background: #2a2a2a;
  border: 1px solid #444;
  padding: 10px;
}

.stats div {
  margin: 4px 0;
}

/* Visibility state classes */
.tile-visible { opacity: 1.0; }
.tile-explored { opacity: 0.5; }
.tile-unexplored { opacity: 0; }
```

**Update `public/index.html`** to include CSS:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Roguelike: Quest for the Amulet of Yendor</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### Phase 1 Complete! ✅

At this point you should have:
- Working movement with arrow keys
- FOV visualization with lighting
- Fog of war (explored areas dimmed)
- Message log
- Stats display
- Fuel consumption for torch

**Test it**:
```bash
npm run dev
```

Navigate to `http://localhost:3000` and use arrow keys to move around!

---

## Phase 2: Combat & Monsters

**Goal**: Implement combat system with monsters and basic AI
**Duration**: Week 3
**Deliverable**: Can fight monsters with basic AI, see combat messages, die

### 2.1 Combat Service

**Create `src/services/CombatService.ts`**:
```typescript
import { Player, Monster, Weapon } from '@types/core'
import { IRandomService } from './RandomService'

// ============================================================================
// COMBAT SERVICE - Original Rogue combat formulas
// ============================================================================

export interface CombatResult {
  hit: boolean
  damage: number
  attacker: string
  defender: string
  killed: boolean
}

export class CombatService {
  constructor(private random: IRandomService) {}

  /**
   * Player attacks monster
   */
  playerAttack(player: Player, monster: Monster): CombatResult {
    const hit = this.calculateHit(player.level + player.strength, monster.ac)

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: 'Player',
        defender: monster.name,
        killed: false,
      }
    }

    const weapon = player.equipment.weapon
    const damage = this.calculatePlayerDamage(player, weapon)
    const newHp = Math.max(0, monster.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: 'Player',
      defender: monster.name,
      killed,
    }
  }

  /**
   * Monster attacks player
   */
  monsterAttack(monster: Monster, player: Player): CombatResult {
    const hit = this.calculateHit(monster.level, player.ac)

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: monster.name,
        defender: 'Player',
        killed: false,
      }
    }

    const damage = this.random.roll(monster.damage)
    const newHp = Math.max(0, player.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: monster.name,
      defender: 'Player',
      killed,
    }
  }

  /**
   * Apply damage to entity
   */
  applyDamageToPlayer(player: Player, damage: number): Player {
    return {
      ...player,
      hp: Math.max(0, player.hp - damage),
    }
  }

  applyDamageToMonster(monster: Monster, damage: number): Monster {
    return {
      ...monster,
      hp: Math.max(0, monster.hp - damage),
    }
  }

  /**
   * Calculate XP reward
   */
  calculateXP(monster: Monster): number {
    return monster.xpValue
  }

  // ============================================================================
  // PRIVATE: Combat formulas (from original Rogue)
  // ============================================================================

  private calculateHit(attackerLevel: number, defenderAC: number): boolean {
    // Original Rogue formula: roll d20, modified by level and AC
    const roll = this.random.nextInt(1, 20)
    const modifier = attackerLevel - defenderAC
    return roll + modifier >= 10
  }

  private calculatePlayerDamage(player: Player, weapon: Weapon | null): number {
    if (weapon) {
      const baseDamage = this.random.roll(weapon.damage)
      return baseDamage + weapon.bonus
    }

    // Unarmed: 1d4
    return this.random.roll('1d4')
  }
}
```

### 2.2 Monster Data & AI Profile

**Create `public/data/monsters.json`**:
```json
[
  {
    "letter": "A",
    "name": "Aquator",
    "hp": "5d8",
    "ac": 2,
    "damage": "0d0",
    "xpValue": 20,
    "aiProfile": {
      "behavior": "SIMPLE",
      "intelligence": 2,
      "aggroRange": 5,
      "fleeThreshold": 0.0,
      "special": ["rusts_armor"]
    }
  },
  {
    "letter": "B",
    "name": "Bat",
    "hp": "1d8",
    "ac": 3,
    "damage": "1d2",
    "xpValue": 1,
    "aiProfile": {
      "behavior": "ERRATIC",
      "intelligence": 1,
      "aggroRange": 5,
      "fleeThreshold": 0.0,
      "special": ["flying"]
    }
  },
  {
    "letter": "O",
    "name": "Orc",
    "hp": "1d8",
    "ac": 6,
    "damage": "1d8",
    "xpValue": 5,
    "aiProfile": {
      "behavior": "GREEDY",
      "intelligence": 3,
      "aggroRange": 5,
      "fleeThreshold": 0.0,
      "special": ["greedy"]
    }
  }
]
```

### 2.3 PathfindingService (A*)

**Create `src/services/PathfindingService.ts`**:
```typescript
import { Position, Level } from '@types/core'

// ============================================================================
// PATHFINDING SERVICE - A* algorithm for monster AI
// ============================================================================

interface PathNode {
  position: Position
  g: number // Cost from start
  h: number // Heuristic to goal
  f: number // Total cost
  parent: PathNode | null
}

export class PathfindingService {
  /**
   * Find path from start to goal using A*
   */
  findPath(start: Position, goal: Position, level: Level): Position[] | null {
    const openSet: PathNode[] = []
    const closedSet = new Set<string>()

    const startNode: PathNode = {
      position: start,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null,
    }

    openSet.push(startNode)

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      // Reached goal?
      if (
        current.position.x === goal.x &&
        current.position.y === goal.y
      ) {
        return this.reconstructPath(current)
      }

      closedSet.add(this.posKey(current.position))

      // Check neighbors
      const neighbors = this.getNeighbors(current.position, level)
      for (const neighborPos of neighbors) {
        const key = this.posKey(neighborPos)
        if (closedSet.has(key)) continue

        const g = current.g + 1
        const h = this.heuristic(neighborPos, goal)
        const f = g + h

        // Check if in open set
        const existing = openSet.find(
          (n) => n.position.x === neighborPos.x && n.position.y === neighborPos.y
        )

        if (existing) {
          if (g < existing.g) {
            existing.g = g
            existing.f = f
            existing.parent = current
          }
        } else {
          openSet.push({
            position: neighborPos,
            g,
            h,
            f,
            parent: current,
          })
        }
      }
    }

    return null // No path found
  }

  /**
   * Get next step toward goal (simplified, no full path)
   */
  getNextStep(start: Position, goal: Position, level: Level): Position | null {
    const path = this.findPath(start, goal, level)
    if (!path || path.length < 2) return null
    return path[1] // First step after start
  }

  // ============================================================================
  // PRIVATE: A* helpers
  // ============================================================================

  private heuristic(a: Position, b: Position): number {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  private getNeighbors(pos: Position, level: Level): Position[] {
    const neighbors: Position[] = []
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ]

    for (const dir of directions) {
      const newPos = { x: pos.x + dir.x, y: pos.y + dir.y }

      if (
        newPos.x >= 0 &&
        newPos.x < level.width &&
        newPos.y >= 0 &&
        newPos.y < level.height
      ) {
        const tile = level.tiles[newPos.y][newPos.x]
        if (tile.walkable) {
          neighbors.push(newPos)
        }
      }
    }

    return neighbors
  }

  private reconstructPath(node: PathNode): Position[] {
    const path: Position[] = []
    let current: PathNode | null = node

    while (current !== null) {
      path.unshift(current.position)
      current = current.parent
    }

    return path
  }

  private posKey(pos: Position): string {
    return `${pos.x},${pos.y}`
  }
}
```

### 2.4 Monster AI Service (Basic)

**Create `src/services/MonsterAIService.ts`**:
```typescript
import { Monster, GameState, Position, MonsterBehavior } from '@types/core'
import { PathfindingService } from './PathfindingService'
import { IRandomService } from './RandomService'

// ============================================================================
// MONSTER AI SERVICE - Behavior decision making
// ============================================================================

export interface MonsterAction {
  type: 'move' | 'attack' | 'wait'
  target?: Position
}

export class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private random: IRandomService
  ) {}

  /**
   * Decide action for monster
   */
  decideAction(monster: Monster, state: GameState): MonsterAction {
    // If asleep, wait
    if (monster.isAsleep) {
      return { type: 'wait' }
    }

    const level = state.levels.get(state.currentLevel)
    if (!level) return { type: 'wait' }

    const playerPos = state.player.position

    // Check if adjacent to player
    if (this.isAdjacent(monster.position, playerPos)) {
      return { type: 'attack', target: playerPos }
    }

    // Determine behavior
    const behaviors = Array.isArray(monster.aiProfile.behavior)
      ? monster.aiProfile.behavior
      : [monster.aiProfile.behavior]

    const primaryBehavior = behaviors[0]

    switch (primaryBehavior) {
      case MonsterBehavior.SMART:
        return this.smartBehavior(monster, playerPos, level)

      case MonsterBehavior.SIMPLE:
        return this.simpleBehavior(monster, playerPos, level)

      default:
        return { type: 'wait' }
    }
  }

  // ============================================================================
  // PRIVATE: Behavior implementations
  // ============================================================================

  private smartBehavior(monster: Monster, playerPos: Position, level): MonsterAction {
    // Use A* pathfinding
    const nextStep = this.pathfinding.getNextStep(monster.position, playerPos, level)
    if (nextStep) {
      return { type: 'move', target: nextStep }
    }
    return { type: 'wait' }
  }

  private simpleBehavior(monster: Monster, playerPos: Position, level): MonsterAction {
    // Move directly toward player (greedy)
    const dx = playerPos.x - monster.position.x
    const dy = playerPos.y - monster.position.y

    let target: Position

    if (Math.abs(dx) > Math.abs(dy)) {
      target = { x: monster.position.x + Math.sign(dx), y: monster.position.y }
    } else {
      target = { x: monster.position.x, y: monster.position.y + Math.sign(dy) }
    }

    // Check if walkable
    const tile = level.tiles[target.y]?.[target.x]
    if (tile?.walkable) {
      return { type: 'move', target }
    }

    return { type: 'wait' }
  }

  private isAdjacent(pos1: Position, pos2: Position): boolean {
    const dx = Math.abs(pos1.x - pos2.x)
    const dy = Math.abs(pos1.y - pos2.y)
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
  }
}
```

### 2.5 Attack Command

**Create `src/commands/AttackCommand.ts`**:
```typescript
import { GameState, Monster } from '@types/core'
import { ICommand } from './ICommand'
import { CombatService } from '@services/CombatService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// ATTACK COMMAND - Player attacks monster
// ============================================================================

export class AttackCommand implements ICommand {
  constructor(
    private monsterId: string,
    private combatService: CombatService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const monster = level.monsters.find((m) => m.id === this.monsterId)
    if (!monster) return state

    // Player attacks
    const result = this.combatService.playerAttack(state.player, monster)

    let messages = state.messages

    if (result.hit) {
      messages = this.messageService.addMessage(
        messages,
        `You hit the ${result.defender} for ${result.damage} damage!`,
        'combat',
        state.turnCount
      )

      if (result.killed) {
        messages = this.messageService.addMessage(
          messages,
          `You killed the ${result.defender}!`,
          'success',
          state.turnCount
        )

        // Remove monster and award XP
        const updatedMonsters = level.monsters.filter((m) => m.id !== this.monsterId)
        const xp = this.combatService.calculateXP(monster)

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return {
          ...state,
          player: { ...state.player, xp: state.player.xp + xp },
          levels: updatedLevels,
          messages,
          turnCount: state.turnCount + 1,
        }
      } else {
        // Apply damage to monster
        const updatedMonster = this.combatService.applyDamageToMonster(
          monster,
          result.damage
        )
        const updatedMonsters = level.monsters.map((m) =>
          m.id === this.monsterId ? updatedMonster : m
        )

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return {
          ...state,
          levels: updatedLevels,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    } else {
      messages = this.messageService.addMessage(
        messages,
        `You miss the ${result.defender}.`,
        'combat',
        state.turnCount
      )

      return {
        ...state,
        messages,
        turnCount: state.turnCount + 1,
      }
    }
  }
}
```

### Phase 2 Summary

**Phase 2 adds**:
- CombatService with original Rogue formulas
- Monster data structure and JSON
- A* pathfinding for smart monsters
- Basic AI behaviors (SIMPLE, SMART)
- Attack command
- Combat messages

**To complete Phase 2**, also add:
- Monster spawning in dungeon generation
- Monster turn processing
- Death screen
- Update MoveCommand to use AttackCommand when bumping into monsters

---

## Phase 3: Advanced Dungeon Generation

**Goal**: Full procedural dungeon generation with rooms, corridors, multiple door types, and guaranteed connectivity
**Duration**: Week 4
**Deliverable**: Can explore procedurally generated multi-level dungeon with varied doors and alternate paths

### Tasks

#### 3.1 Core DungeonService

**Create `src/services/DungeonService.ts`**:

- [ ] **Basic structure and types**
  - [ ] Room interface with bounds and ID
  - [ ] Corridor interface with start/end points
  - [ ] Graph node structure for MST
  - [ ] DungeonConfig interface (min/max rooms, sizes, etc.)

- [ ] **Room placement algorithm**
  - [ ] `placeRooms(config)` - Generate N random rooms (4-9)
  - [ ] Overlap prevention with collision detection
  - [ ] Variable room sizes (3x3 to 8x8)
  - [ ] Ensure minimum spacing between rooms
  - [ ] Return list of non-overlapping rooms

- [ ] **Room connectivity graph**
  - [ ] `buildRoomGraph(rooms)` - Create complete graph
  - [ ] Calculate distances between all room pairs (center to center)
  - [ ] Build adjacency list representation

- [ ] **Minimum Spanning Tree (MST)**
  - [ ] Implement Prim's or Kruskal's algorithm
  - [ ] `generateMST(graph)` - Find minimum spanning tree
  - [ ] Ensures all rooms are connected with minimum corridors
  - [ ] Return MST edge list

- [ ] **Corridor generation**
  - [ ] `createCorridor(room1, room2)` - Connect two rooms
  - [ ] L-shaped corridors (horizontal then vertical, or vice versa)
  - [ ] Optional winding (add random bends)
  - [ ] Carve corridor tiles in level grid
  - [ ] Handle corridor intersections

- [ ] **Loop generation for alternate paths**
  - [ ] `addExtraConnections(rooms, mst, chance)` - Add 20-30% extra edges
  - [ ] Prevents linear dungeons, adds exploration
  - [ ] Connect random non-MST room pairs

#### 3.2 Door System

- [ ] **Door placement**
  - [ ] `placeDoors(rooms, corridors)` - Add doors at room/corridor junctions
  - [ ] Detect corridor entry points into rooms
  - [ ] Create Door entities with positions

- [ ] **Door types (6 types)**
  - [ ] OPEN (`'`) - 40% chance, always passable, doesn't block vision
  - [ ] CLOSED (`+`) - 30% chance, passable, blocks vision until opened
  - [ ] LOCKED (`+`) - 10% chance, needs key to open
  - [ ] SECRET (`#`) - 10% chance, appears as wall, found via search
  - [ ] BROKEN (`'`) - 5% chance, permanently open
  - [ ] ARCHWAY (no symbol) - 5% chance, open passage with no door

- [ ] **Door data structure**
  - [ ] Position, state, discovered flag
  - [ ] Orientation (horizontal/vertical)
  - [ ] connectedRooms array

#### 3.3 Door Interaction Commands

- [ ] **OpenDoorCommand**
  - [ ] Check adjacent tiles for closed/locked doors
  - [ ] If locked, check for key in inventory
  - [ ] Change state from CLOSED to OPEN
  - [ ] Update tile transparency for FOV

- [ ] **CloseDoorCommand**
  - [ ] Check adjacent tiles for open doors
  - [ ] Change state from OPEN to CLOSED
  - [ ] Update tile transparency for FOV

- [ ] **SearchCommand**
  - [ ] `s` key - Search adjacent tiles
  - [ ] Chance to discover secret doors (formula: intelligence-based)
  - [ ] Chance to discover traps
  - [ ] Add message "You found a secret door!" or "You found a trap!"
  - [ ] Mark discovered flag on entity

#### 3.4 Trap System

- [ ] **Trap types**
  - [ ] Bear trap (1d4 damage, holds player)
  - [ ] Dart trap (1d6 damage, poison chance)
  - [ ] Teleport trap (random teleport)
  - [ ] Sleep trap (skip turns)
  - [ ] Pit trap (fall damage, deeper level)

- [ ] **Trap placement**
  - [ ] `placeTraps(level, count)` - Random placement in rooms/corridors
  - [ ] 2-4 traps per level
  - [ ] Hidden by default (discovered = false)
  - [ ] Avoid placing on player start position

- [ ] **Trap triggering**
  - [ ] Check in MovementService when player moves
  - [ ] If trap.discovered === false, chance to trigger
  - [ ] Apply trap effect to player
  - [ ] Reveal trap after triggering
  - [ ] Add message describing trap

- [ ] **TrapService**
  - [ ] `triggerTrap(trap, player, state)` - Handle trap effects
  - [ ] Damage calculation
  - [ ] Status effect application
  - [ ] Trap disarm chance (future enhancement)

#### 3.5 Connectivity & Validation

- [ ] **Floodfill verification**
  - [ ] `verifyConnectivity(level)` - Ensure all floor tiles reachable
  - [ ] Start from player spawn position
  - [ ] Mark all reachable tiles via BFS/DFS
  - [ ] If unreachable tiles found, regenerate dungeon

- [ ] **Stairs placement**
  - [ ] `placeStairs(level, depth)` - Add up/down stairs
  - [ ] Stairs up (`<`) - Not on level 1
  - [ ] Stairs down (`>`) - Not on level 10
  - [ ] Place in different rooms (not same room)
  - [ ] Ensure both reachable from spawn

#### 3.6 Multi-Level Support

- [ ] **Level generation**
  - [ ] `generateLevel(depth, seed)` - Create one dungeon level
  - [ ] Use seed for deterministic generation
  - [ ] Vary room count by depth (deeper = more rooms)
  - [ ] Increase monster/trap count with depth

- [ ] **Level persistence**
  - [ ] Store generated levels in `GameState.levels` Map
  - [ ] Key = level depth (1-10)
  - [ ] Don't regenerate when revisiting
  - [ ] Preserve monster positions, items, etc.

- [ ] **MoveStairsCommand**
  - [ ] `>` key - Go down stairs
  - [ ] `<` key - Go up stairs
  - [ ] Check if player on stairs tile
  - [ ] Load or generate target level
  - [ ] Update GameState.currentLevel
  - [ ] Spawn player at opposite stairs on new level
  - [ ] Recompute FOV for new level

#### 3.7 Entity Spawning

- [ ] **Monster spawning**
  - [ ] `spawnMonsters(level, depth)` - Place monsters in level
  - [ ] Number based on depth (1-2 at level 1, 5-7 at level 10)
  - [ ] Weighted selection based on depth (harder monsters deeper)
  - [ ] Don't spawn in starting room
  - [ ] Load monster templates from monsters.json
  - [ ] Roll HP from dice notation (e.g., "5d8")

- [ ] **Item spawning**
  - [ ] `spawnItems(level, depth)` - Place items randomly
  - [ ] 3-6 items per level
  - [ ] Weight by rarity
  - [ ] Include light sources (torches, lanterns, oil)

- [ ] **Gold spawning**
  - [ ] `spawnGold(level)` - Place gold piles
  - [ ] 2-5 piles per level
  - [ ] Amount scales with depth (10-50 * depth)

### Files to Create

- `src/services/DungeonService.ts` - Main dungeon generation
- `src/services/TrapService.ts` - Trap effects and triggering
- `src/commands/OpenDoorCommand.ts` - Open doors
- `src/commands/CloseDoorCommand.ts` - Close doors
- `src/commands/SearchCommand.ts` - Find secrets/traps
- `src/commands/MoveStairsCommand.ts` - Level navigation
- `src/__tests__/services/DungeonService.test.ts` - Dungeon tests
- `src/__tests__/services/TrapService.test.ts` - Trap tests

### Tests Required

- [ ] **DungeonService tests**
  - [ ] Room placement generates N rooms without overlap
  - [ ] MST connects all rooms
  - [ ] Loops add extra connections
  - [ ] Connectivity verification passes for valid dungeons
  - [ ] Same seed generates identical dungeon
  - [ ] All door types appear with expected frequency

- [ ] **Trap tests**
  - [ ] Trap triggering applies correct effects
  - [ ] Search command reveals traps
  - [ ] Traps don't spawn on player start

- [ ] **Door tests**
  - [ ] Open command opens closed doors
  - [ ] Locked doors require key
  - [ ] Secret doors stay hidden until searched

- [ ] **Stairs tests**
  - [ ] Moving up/down changes level correctly
  - [ ] Player spawns at opposite stairs
  - [ ] Level state preserved when revisiting

---

## Phase 4: Complete AI Behaviors & Special Abilities

**Goal**: Implement all 7 monster behaviors and special monster abilities
**Duration**: Week 5
**Deliverable**: Monsters exhibit varied, intelligent behaviors; special abilities work correctly

### Tasks

#### 4.1 Expand MonsterAIService

**Update `src/services/MonsterAIService.ts`**:

- [ ] **ERRATIC behavior** (Bat, Kestrel)
  - [ ] 50% chance to move toward player
  - [ ] 50% chance to move randomly
  - [ ] `erraticBehavior(monster, playerPos, level)` method
  - [ ] Used by flying creatures

- [ ] **GREEDY behavior** (Orc)
  - [ ] Check for gold piles in FOV
  - [ ] If gold visible, path toward gold instead of player
  - [ ] If no gold, use SIMPLE behavior
  - [ ] `greedyBehavior(monster, state, level)` method
  - [ ] Pick up gold when reached

- [ ] **THIEF behavior** (Leprechaun, Nymph)
  - [ ] Approach player using A*
  - [ ] When adjacent, attempt to steal
  - [ ] After stealing, flee in opposite direction
  - [ ] `thiefBehavior(monster, state, level)` method
  - [ ] Set hasStolen flag after theft
  - [ ] Change to FLEEING state after theft

- [ ] **STATIONARY behavior** (Venus Flytrap)
  - [ ] Never move from spawn position
  - [ ] Attack if player moves adjacent
  - [ ] `stationaryBehavior(monster, playerPos)` method
  - [ ] Special: Holds player in place for 1-2 turns

- [ ] **COWARD behavior** (Vampire)
  - [ ] Check HP percentage
  - [ ] If HP < fleeThreshold (30%), flee from player
  - [ ] Otherwise, use SMART behavior
  - [ ] `cowardBehavior(monster, state, level)` method
  - [ ] Path away from player using A* in reverse

#### 4.2 Monster State Machine

- [ ] **State transitions**
  - [ ] SLEEPING → WANDERING (player enters aggro range)
  - [ ] WANDERING → HUNTING (player in FOV)
  - [ ] HUNTING → FLEEING (HP low for COWARD, or after stealing for THIEF)
  - [ ] FLEEING → HUNTING (HP recovered or threat gone)

- [ ] **updateMonsterState(monster, state)** method
  - [ ] Check aggro range against player distance
  - [ ] Check FOV for player visibility
  - [ ] Update monster.state enum
  - [ ] Return updated monster

#### 4.3 Monster FOV & Awareness

- [ ] **Monster FOV calculation**
  - [ ] Awake monsters compute their own FOV
  - [ ] Use same shadowcasting algorithm as player
  - [ ] Vision radius = monster.aiProfile.aggroRange
  - [ ] Store in monster.visibleCells Set

- [ ] **Wake-up logic**
  - [ ] Check if player position in monster's aggro range
  - [ ] If in range, set isAsleep = false
  - [ ] Add message "The {monster} wakes up!"
  - [ ] MEAN monsters always start awake (special flag)

- [ ] **Sleeping monster optimization**
  - [ ] Skip FOV calculation for sleeping monsters
  - [ ] Skip AI decision for sleeping monsters
  - [ ] Only check distance for wake-up

#### 4.4 Special Monster Abilities

**Create `src/services/SpecialAbilityService.ts`**:

- [ ] **Rust armor** (Aquator)
  - [ ] When hits player, chance to rust equipped armor
  - [ ] Reduce armor AC bonus by 1
  - [ ] Message: "Your armor rusts!"
  - [ ] Can rust to -AC limit

- [ ] **Flying** (Bat, Kestrel, Griffin)
  - [ ] Ignore certain terrain in pathfinding
  - [ ] Can move over water/lava (if added)
  - [ ] Flag in monster data: special: ["flying"]

- [ ] **Freeze player** (Ice Monster)
  - [ ] On hit, chance to freeze
  - [ ] Player loses next turn (skip turn)
  - [ ] Message: "You are frozen solid!"
  - [ ] Stacks with damage (0d0 + freeze)

- [ ] **Confusion** (Medusa)
  - [ ] On hit, chance to confuse player
  - [ ] Player movements become random for 3-5 turns
  - [ ] Message: "You feel confused!"
  - [ ] Effect tracked in Player state

- [ ] **Invisibility** (Phantom)
  - [ ] Monster not rendered unless player has "See Invisible"
  - [ ] Can still be attacked if known position
  - [ ] Shows as '?' when bumped into
  - [ ] Special ring reveals invisible monsters

- [ ] **Drain strength** (Rattlesnake)
  - [ ] On hit, reduce player.strength by 1
  - [ ] Can't go below 3
  - [ ] Message: "You feel weaker!"
  - [ ] Permanent until restored

- [ ] **Drain XP** (Wraith)
  - [ ] On hit, reduce player XP
  - [ ] Can cause level loss if XP drops below threshold
  - [ ] Message: "You feel your life force drain away!"

- [ ] **Drain max HP** (Vampire)
  - [ ] On hit, reduce player.maxHp by 1
  - [ ] Current HP also reduced if over new max
  - [ ] Message: "You feel your life essence fade!"
  - [ ] Permanent until restored

- [ ] **Regeneration** (Griffin, Troll, Vampire)
  - [ ] Heal 1 HP per N turns
  - [ ] Check in monster turn processing
  - [ ] Can't exceed maxHp
  - [ ] Makes these monsters very dangerous

- [ ] **Holds player** (Venus Flytrap)
  - [ ] When hit, chance to hold in place
  - [ ] Player can't move for 1-2 turns
  - [ ] Can still attack
  - [ ] Message: "The flytrap grabs you!"

- [ ] **Multiple attacks** (Centaur, Dragon, etc.)
  - [ ] Parse damage string "1d2/1d5/1d5" (3 attacks)
  - [ ] Roll each attack separately
  - [ ] Apply damage from all successful hits
  - [ ] Message each attack individually

- [ ] **Breath weapon** (Dragon)
  - [ ] Ranged attack (6d6 fire damage)
  - [ ] Range: 5 tiles
  - [ ] Line-of-sight check
  - [ ] Chance to use vs melee attack
  - [ ] Message: "The dragon breathes fire!"

#### 4.5 Monster Turn Processing

**Create `src/services/MonsterTurnService.ts`**:

- [ ] **processMons

terTurns(state)** method
  - [ ] Iterate through all monsters on current level
  - [ ] Skip if monster is dead (hp <= 0)
  - [ ] Update monster state (sleeping/hunting/fleeing)
  - [ ] Decide action using MonsterAIService
  - [ ] Execute action (move, attack, wait)
  - [ ] Apply regeneration if applicable
  - [ ] Return updated game state

- [ ] **executeMonsterAction(monster, action, state)** method
  - [ ] If action.type === 'move', move monster
  - [ ] If action.type === 'attack', monster attacks player
  - [ ] If action.type === 'wait', do nothing
  - [ ] Check for theft attempt (THIEF behavior)
  - [ ] Trigger special abilities on hit

- [ ] **Integration with game loop**
  - [ ] Call processMo nsterTurns() after each player command
  - [ ] Update game state with monster changes
  - [ ] Add combat messages for monster actions

### Files to Create

- `src/services/SpecialAbilityService.ts` - Handle all special abilities
- `src/services/MonsterTurnService.ts` - Monster turn processing
- `src/__tests__/services/SpecialAbilityService.test.ts`
- `src/__tests__/services/MonsterTurnService.test.ts`

### Tests Required

- [ ] **AI Behavior tests**
  - [ ] ERRATIC moves randomly 50% of the time
  - [ ] GREEDY paths toward gold when visible
  - [ ] THIEF steals item and flees
  - [ ] STATIONARY never moves
  - [ ] COWARD flees when HP low

- [ ] **State transition tests**
  - [ ] Sleeping monster wakes when player in range
  - [ ] Monster enters HUNTING state when sees player
  - [ ] COWARD enters FLEEING when HP < threshold

- [ ] **Special ability tests**
  - [ ] Aquator rusts armor on hit
  - [ ] Ice Monster freezes player
  - [ ] Wraith drains XP
  - [ ] Vampire drains max HP
  - [ ] Regenerating monsters heal over time
  - [ ] Dragon breath weapon deals damage at range

- [ ] **Monster turn integration tests**
  - [ ] Monsters take turns after player
  - [ ] Multiple monsters act in sequence
  - [ ] Dead monsters don't act

---

## Phase 5: Items & Inventory

**Goal**: Full item system
**Duration**: Week 6-7

### 5.1 Item Interfaces

Expand item types in `src/types/core.ts`

### 5.2 InventoryService

Item management, equipment, stacking

### 5.3 IdentificationService

Random names, identification mechanics

### 5.4 Item Commands

- PickUpCommand
- DropCommand
- EquipCommand
- UseItemCommand

---

## Phase 6: Hunger & Progression

**Goal**: Hunger system and leveling
**Duration**: Week 8

### 6.1 HungerService

Food consumption, hunger states, effects

### 6.2 LevelingService

XP curves, stat increases

---

## Phase 7: Win Condition & Polish

**Goal**: Complete game loop
**Duration**: Week 9

### 7.1 Amulet Implementation

### 7.2 SaveService

LocalStorage wrapper, permadeath

### 7.3 UI Screens

Main menu, victory screen, help screen

---

## Phase 8: Testing, Balance & Bug Fixes

**Goal**: >80% coverage, balance
**Duration**: Week 10-11

### 8.1 Test Coverage

Unit tests for all services and commands

### 8.2 Integration Tests

Full game flow tests

### 8.3 Balance Tuning

Monster scaling, item drop rates, difficulty curve

---

## Appendix A: Complete File Structure

```
roguelike/
├── src/
│   ├── types/
│   │   └── core.ts
│   ├── services/
│   │   ├── RandomService.ts
│   │   ├── LightingService.ts
│   │   ├── FOVService.ts
│   │   ├── RenderingService.ts
│   │   ├── MovementService.ts
│   │   ├── MessageService.ts
│   │   ├── CombatService.ts
│   │   ├── MonsterAIService.ts
│   │   ├── PathfindingService.ts
│   │   ├── DungeonService.ts
│   │   ├── InventoryService.ts
│   │   ├── IdentificationService.ts
│   │   ├── HungerService.ts
│   │   ├── LevelingService.ts
│   │   ├── SaveService.ts
│   │   └── DebugService.ts
│   ├── commands/
│   │   ├── ICommand.ts
│   │   ├── MoveCommand.ts
│   │   ├── AttackCommand.ts
│   │   ├── PickUpCommand.ts
│   │   ├── DropCommand.ts
│   │   ├── EquipCommand.ts
│   │   ├── UseItemCommand.ts
│   │   ├── EatCommand.ts
│   │   └── SaveCommand.ts
│   ├── ui/
│   │   ├── GameRenderer.ts
│   │   ├── InputHandler.ts
│   │   ├── MainMenu.ts
│   │   └── InventoryScreen.ts
│   ├── __tests__/
│   │   ├── services/
│   │   ├── commands/
│   │   └── ui/
│   └── main.ts
├── public/
│   ├── data/
│   │   ├── monsters.json
│   │   ├── items.json
│   │   └── config.json
│   ├── styles.css
│   └── index.html
└── [config files]
```

---

## Appendix B: Data File Templates

### monsters.json (Complete)

See PRD Section 4.9 for all 26 monsters with stats and AI profiles

### items.json Structure

```json
{
  "weapons": [...],
  "armor": [...],
  "potions": [...],
  "scrolls": [...],
  "rings": [...],
  "wands": [...],
  "food": [...]
}
```

### config.json

```json
{
  "game": {
    "levels": 10,
    "startingHunger": 1300,
    "hungerTickRate": 1
  },
  "lighting": {
    "torchFuel": 500,
    "lanternMaxFuel": 1000,
    "oilFlaskFuel": 500
  },
  "dungeon": {
    "minRooms": 4,
    "maxRooms": 9,
    "roomMinSize": 3,
    "roomMaxSize": 8,
    "extraConnectionChance": 0.3
  }
}
```

---

## Appendix C: Testing Patterns

### Service Testing Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom([/* preset values */])
    service = new ServiceName(mockRandom)
  })

  test('method does what it should', () => {
    // Arrange
    const input = /* ... */

    // Act
    const result = service.method(input)

    // Assert
    expect(result).toBe(/* ... */)
  })
})
```

### Command Testing Pattern

```typescript
describe('CommandName', () => {
  let command: CommandName
  let mockServices: /* ... */

  beforeEach(() => {
    // Setup mocks
  })

  test('execute produces expected state', () => {
    const initialState = createTestState()
    const newState = command.execute(initialState)
    expect(newState./* ... */).toBe(/* ... */)
  })
})
```

---

## Appendix D: Dependency Graph

```
Phase 1: Foundation
├── Types (core.ts)
├── RandomService ──────────────────┐
├── LightingService (uses Random) ──┤
├── FOVService ─────────────────────┤
├── RenderingService (uses FOV) ────┤
├── MovementService ────────────────┤
├── MessageService ─────────────────┤
├── MoveCommand (uses all above) ───┤
└── UI (GameRenderer, InputHandler) ┘

Phase 2: Combat
├── CombatService (uses Random)
├── PathfindingService
├── MonsterAIService (uses Pathfinding, Random)
└── AttackCommand (uses Combat, Message)

Phase 3: Dungeon
└── DungeonService (uses Random, all tile/room logic)

Phase 4: AI
└── Expand MonsterAIService (ERRATIC, GREEDY, THIEF, etc.)

Phase 5: Items
├── InventoryService
├── IdentificationService (uses Random)
└── Item Commands (PickUp, Drop, Equip, Use)

Phase 6: Progression
├── HungerService
└── LevelingService

Phase 7: Polish
├── SaveService
└── UI Screens (Menu, Victory, Help)

Phase 8: Testing
└── Full coverage + balance
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Type checking
npx tsc --noEmit
```

### Key Architecture Rules

1. **Services contain ALL game logic** - no logic in commands or UI
2. **Commands orchestrate services** - coordinate multiple service calls
3. **UI renders state** - no game state in UI components
4. **State is immutable** - always return new objects
5. **Inject dependencies** - use constructor injection for testability

### Debugging Tips

1. Use MockRandom for deterministic tests
2. Check FOV with debug overlay (`DebugService`)
3. Verify state transitions with console.log
4. Use browser DevTools for DOM inspection
5. Run tests frequently to catch regressions early

---

**END OF IMPLEMENTATION PLAN**

This plan provides complete step-by-step guidance for implementing all 8 phases of the roguelike game. Follow it sequentially, test frequently, and refer to the PRD for detailed requirements.

