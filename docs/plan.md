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
mkdir -p public/data
mkdir -p public/assets
```

**Complete structure** (hybrid colocated with scenario-based tests):
```
roguelike/
├── src/
│   ├── types/           # TypeScript interfaces and types
│   │   └── core/
│   │       ├── core.ts
│   │       └── core.test.ts
│   ├── services/        # Game logic layer (each service in own folder)
│   │   ├── RandomService/
│   │   │   ├── RandomService.ts
│   │   │   ├── seeded.test.ts           # Deterministic RNG tests
│   │   │   ├── mock.test.ts             # Mock implementation tests
│   │   │   └── index.ts                 # Barrel export
│   │   ├── LightingService/
│   │   │   ├── LightingService.ts
│   │   │   ├── fuel-consumption.test.ts # Fuel tick & warning tests
│   │   │   ├── light-sources.test.ts    # Creation & radius tests
│   │   │   ├── refill.test.ts           # Lantern refill tests
│   │   │   └── index.ts                 # Barrel export
│   │   └── FOVService/
│   │       ├── FOVService.ts
│   │       ├── shadowcasting.test.ts    # FOV algorithm tests
│   │       ├── blocking.test.ts         # Vision blocking tests
│   │       ├── radius.test.ts           # Light radius tests
│   │       └── index.ts                 # Barrel export
│   ├── commands/        # Command pattern orchestration
│   │   └── MoveCommand/
│   │       ├── MoveCommand.ts
│   │       ├── movement.test.ts         # Basic movement tests
│   │       ├── collision.test.ts        # Collision detection tests
│   │       ├── fov-updates.test.ts      # FOV recalculation tests
│   │       └── index.ts                 # Barrel export
│   ├── ui/             # DOM rendering and input
│   ├── utils/          # Helper functions
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

### 1.2.5 Migrate to Hybrid Test Structure

**Goal**: Establish consistent folder structure and test organization pattern for all services and commands

**Duration**: 1-2 hours

**Tasks**:

1. Fix LightingService folder structure (move orphaned .ts file)
2. Add barrel exports to RandomService and LightingService
3. Rename RandomService tests to scenario-based convention (remove `ServiceName.` prefix)
4. Create LightingService scenario-based test files
5. Create `docs/testing-strategy.md` with comprehensive guidelines
6. Git commits after each major task

**Deliverable**: All existing code migrated to new structure, ready to continue with Phase 1.3+ using consistent pattern

---

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

### Phase 2 Complete! ✅

At this point you should be able to:
- Fight monsters in the single-room dungeon
- See monsters move toward you using basic AI (SIMPLE)
- Take and deal damage with combat messages
- Gain XP when monsters die
- Die when HP reaches 0
- See death screen with stats
- Watch monsters use A* pathfinding around obstacles

**Test it:**
1. `npm run dev`
2. Wait for monsters to spawn and approach you
3. Bump into them to attack (movement key toward monster)
4. Verify combat messages appear in message log
5. Check XP gain shown in messages on monster death
6. Let monsters kill you to test death screen
7. Verify stats displayed on death screen

**Playtest scenarios:**
- Do monsters pathfind intelligently around walls?
- Are combat messages clear about hit/miss/damage?
- Does XP reward feel proportional to difficulty?
- Is early game survivable but challenging?

**Known limitations:**
- Only 1 room available (full procedural dungeon in Phase 3)
- Only basic AI behaviors implemented (more in Phase 4)
- No items to help in combat yet (Phase 5)

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

### Phase 3 Complete! ✅

At this point you should be able to:
- Explore procedurally generated multi-room dungeons
- See varied room layouts every game (4-9 rooms)
- Navigate corridors connecting rooms
- Open and close doors (o/c keys)
- Search for secret doors and traps (s key)
- Navigate between 26 dungeon levels via stairs (>/<)
- Experience guaranteed connectivity (all rooms reachable)
- Trigger traps (bear trap, dart, teleport, sleep, pit)

**Test it:**
1. `npm run dev`
2. Explore multiple rooms connected by corridors
3. Test opening doors (o) and closing doors (c)
4. Search for secret doors (s key near walls)
5. Step on a trap to trigger it
6. Go down stairs (>) to level 2
7. Go back up (<) to level 1 - verify same layout
8. Restart game - verify new dungeon layout
9. Check all rooms are reachable from start

**Playtest scenarios:**
- Can you reach every room from your starting position?
- Do corridors feel natural (not too straight/boring)?
- Are locked doors blocking progress appropriately?
- Do traps feel fair (not instant death)?
- Does dungeon complexity increase with depth?
- Are secret doors discoverable with searching?

**Known limitations:**
- All monsters still use basic AI (advanced behaviors in Phase 4)
- No items to find yet (Phase 5)
- No special monster abilities yet (Phase 4)

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

### Phase 4 Complete! ✅

At this point you should be able to:
- Observe 7 different AI behaviors (SMART, ERRATIC, GREEDY, SIMPLE, THIEF, STATIONARY, COWARD)
- Experience 12+ special monster abilities
- Watch Leprechaun steal gold and flee
- Get confused by Medusa (random movement)
- See Troll regenerate HP each turn
- Watch Ice Monster freeze you in place
- Survive (or not) Vampire draining max HP permanently
- See monsters with different personalities and tactics

**Test it:**
1. `npm run dev`
2. Find a Bat (letter B) - watch ERRATIC movement (random + toward player)
3. Drop gold on floor, find an Orc (O) - watch GREEDY behavior prioritize gold
4. Find a Leprechaun (L) - watch it steal gold then flee
5. Fight a Troll (T) - notice HP regeneration each turn
6. Get hit by Ice Monster (I) - verify you're frozen for turns
7. Fight Medusa (M) - get confused and move randomly
8. Check combat log for all special ability messages
9. Test COWARD monsters flee when HP < 30%

**Playtest scenarios:**
- Do monsters feel distinct from each other in behavior?
- Are special abilities too overpowered or too weak?
- Is GREEDY AI obvious (monsters go for gold)?
- Does THIEF AI flee after stealing?
- Are regenerating monsters beatable?
- Is confusion effect clear to player?

**Known limitations:**
- No items to counter special abilities yet (Phase 5)
- No healing items if drained/damaged (Phase 5)
- Limited strategies without inventory (Phase 5)

---

## Phase 5: Items & Inventory

**Goal**: Full item system with inventory management, identification, and all item effects
**Duration**: Week 6-7
**Deliverable**: Can pick up, carry, equip, and use all item types with proper effects

### Tasks

#### 5.1 Item Type Definitions

**Update `src/types/core.ts`**:

- [ ] **Base Item interface** (already exists, expand)
  - [ ] id, name, type, identified, position
  - [ ] unidentifiedName (e.g., "blue potion")
  - [ ] stackable flag for food/ammo

- [ ] **Weapon types** (10 weapons)
  - [ ] Mace (2d4), Long sword (3d4), Short bow (1d1)
  - [ ] Arrow (1d1, stackable), Dagger (1d6)
  - [ ] Two-handed sword (4d4), Dart (1d3, stackable)
  - [ ] Crossbow (1d2), Crossbow bolt (1d2, stackable), Spear (2d3)

- [ ] **Armor types** (8 armors)
  - [ ] Leather (AC 8), Ring mail (AC 7), Studded leather (AC 7)
  - [ ] Scale mail (AC 6), Chain mail (AC 5), Splint mail (AC 4)
  - [ ] Banded mail (AC 4), Plate mail (AC 3)

- [ ] **Potion types** (12 potions with effects)
  - [ ] Confusion, Hallucination, Healing, Extra healing
  - [ ] Poison, Raise level, Strength, Restore strength
  - [ ] Blindness, See invisible, Levitation, Haste self

- [ ] **Scroll types** (14 scrolls with effects)
  - [ ] Monster confusion, Magic mapping, Hold monster, Sleep
  - [ ] Enchant armor, Enchant weapon, Identify, Scare monster
  - [ ] Food detection, Teleportation, Remove curse, Create monster
  - [ ] Aggravate monsters, Protect armor

- [ ] **Ring types** (14 rings with effects)
  - [ ] Protection, Add strength, Sustain strength, Searching
  - [ ] See invisible, Adornment, Aggravate monster (cursed)
  - [ ] Dexterity, Increase damage, Regeneration
  - [ ] Slow digestion, Teleportation (cursed), Stealth, Maintain armor

- [ ] **Wand types** (14 wands with charges/effects)
  - [ ] Light, Striking, Lightning, Fire, Cold
  - [ ] Polymorph, Magic missile, Haste monster, Slow monster
  - [ ] Drain life, Cancellation, Teleport away, Teleport to, Nothing

#### 5.2 Identification System

**Create `src/services/IdentificationService.ts`**:

- [ ] **Random name generation**
  - [ ] Shuffle potion colors per game (12 colors)
  - [ ] Shuffle scroll titles per game (14 titles)
  - [ ] Shuffle ring stones per game (14 stones)
  - [ ] Shuffle wand materials per game (14 materials)
  - [ ] Store mappings in GameState for consistency

- [ ] **Identification mechanics**
  - [ ] Mark item as identified
  - [ ] Identify all items of same type globally
  - [ ] Auto-identify on use
  - [ ] Identify via scroll of identify

#### 5.3 Inventory Management

**Create `src/services/InventoryService.ts`**:

- [ ] **Inventory operations**
  - [ ] Add/remove items from inventory array
  - [ ] Check capacity (26 items max, a-z slots)
  - [ ] Find item by ID
  - [ ] Filter by ItemType

- [ ] **Equipment management**
  - [ ] Equip weapon (unequip current)
  - [ ] Equip armor (unequip current)
  - [ ] Equip ring to left/right slot
  - [ ] Equip light source
  - [ ] Unequip item from slot

- [ ] **Stacking**
  - [ ] Stack food rations
  - [ ] Stack ammo (arrows, darts, bolts)
  - [ ] Combine stacks on pickup

- [ ] **Cursed items**
  - [ ] Flag items as cursed
  - [ ] Prevent unequipping cursed items
  - [ ] Require Remove Curse scroll

#### 5.4 Item Commands (11 commands)

- [ ] **PickUpCommand** (`,`)
  - [ ] Check item at position, add to inventory
  - [ ] Check capacity, stack if stackable
  - [ ] Remove from level, message

- [ ] **DropCommand** (`d`)
  - [ ] Show inventory, select item
  - [ ] Remove from inventory, add to level
  - [ ] Can't drop equipped items

- [ ] **WieldCommand** (`w`)
  - [ ] Show weapons, select, equip

- [ ] **WearArmorCommand** (`W`)
  - [ ] Show armor, select, equip

- [ ] **TakeOffArmorCommand** (`T`)
  - [ ] Check if cursed, unequip armor

- [ ] **PutOnRingCommand** (`P`)
  - [ ] Show rings, ask which hand, equip
  - [ ] Apply ring effects

- [ ] **RemoveRingCommand** (`R`)
  - [ ] Select hand, check cursed, unequip
  - [ ] Remove ring effects

- [ ] **QuaffPotionCommand** (`q`)
  - [ ] Show potions, select, apply effect
  - [ ] Remove potion, auto-identify

- [ ] **ReadScrollCommand** (`r`)
  - [ ] Show scrolls, select, apply effect
  - [ ] Remove scroll, auto-identify

- [ ] **ZapWandCommand** (`z`)
  - [ ] Show wands, choose direction if targeted
  - [ ] Apply effect, decrement charges

- [ ] **EatCommand** (`e`)
  - [ ] Show food, select, add nutrition
  - [ ] Remove food from inventory

#### 5.5 Item Effects

**Create `src/services/ItemEffectService.ts`**:

- [ ] **Potion effects** (implement all 12)
  - [ ] Confusion, Hallucination, Healing, Extra healing
  - [ ] Poison, Raise level, Strength, Restore strength
  - [ ] Blindness, See invisible, Levitation, Haste

- [ ] **Scroll effects** (implement all 14)
  - [ ] Monster confusion, Magic mapping, Hold, Sleep
  - [ ] Enchant armor, Enchant weapon, Identify, Scare
  - [ ] Food detection, Teleportation, Remove curse, Create monster
  - [ ] Aggravate, Protect armor

- [ ] **Wand effects** (implement all 14)
  - [ ] Damage wands (striking, lightning, fire, cold)
  - [ ] Utility wands (light, teleport, polymorph, etc.)
  - [ ] Line-of-sight for beams

- [ ] **Ring effects** (passive, always active)
  - [ ] Apply when equipped
  - [ ] Remove when unequipped
  - [ ] Stat modifiers, behavior changes

#### 5.6 Inventory UI

**Create `src/ui/InventoryScreen.ts`**:

- [ ] **Modal overlay on `i` key**
  - [ ] Darken background
  - [ ] Show inventory grid

- [ ] **Display**
  - [ ] List items a-z
  - [ ] Show identified/unidentified names
  - [ ] Indicator (*) for equipped items
  - [ ] Color code by type

- [ ] **Item selection**
  - [ ] Letter to select, show details
  - [ ] Context actions
  - [ ] ESC to close

- [ ] **Equipment slots**
  - [ ] Display current weapon, armor, rings, light

### Files to Create

- `src/services/IdentificationService.ts`
- `src/services/InventoryService.ts`
- `src/services/ItemEffectService.ts`
- `src/commands/PickUpCommand.ts`
- `src/commands/DropCommand.ts`
- `src/commands/WieldCommand.ts`
- `src/commands/WearArmorCommand.ts`
- `src/commands/TakeOffArmorCommand.ts`
- `src/commands/PutOnRingCommand.ts`
- `src/commands/RemoveRingCommand.ts`
- `src/commands/QuaffPotionCommand.ts`
- `src/commands/ReadScrollCommand.ts`
- `src/commands/ZapWandCommand.ts`
- `src/ui/InventoryScreen.ts`
- All corresponding test files

### Tests Required

- [ ] **Identification tests**
  - [ ] Random names consistent within game
  - [ ] Different across games
  - [ ] Identifying one identifies all of type

- [ ] **Inventory tests**
  - [ ] Add/remove items works
  - [ ] Stacking works for stackables
  - [ ] Capacity limit (26) enforced
  - [ ] Equipment slots work

- [ ] **Item effect tests**
  - [ ] All 12 potion effects work
  - [ ] All 14 scroll effects work
  - [ ] All 14 wand effects work
  - [ ] Ring bonuses apply correctly

- [ ] **Command tests**
  - [ ] All 11 item commands work
  - [ ] Can't unequip cursed items
  - [ ] Auto-identify on use

### Phase 5 Complete! ✅

At this point you should be able to:
- Pick up items from dungeon floor (`,` key)
- View inventory with all items (`i` key)
- Equip weapons, armor, and rings
- Drink potions, read scrolls, zap wands, eat food
- See unidentified items ("red potion" vs "potion of healing")
- Identify items by using them or reading scroll of identify
- Get stuck with cursed items (cannot remove)
- Use remove curse scroll to free cursed items
- Experience all 50+ item effects

**Test it:**
1. `npm run dev`
2. Find and pick up various items (`,` key)
3. Press `i` to view inventory screen
4. Equip a weapon (`w`) and armor (`W`)
5. Drink an unidentified potion (`q`) - note if it gets auto-identified
6. Try on a ring (`P`) - test 2-ring limit
7. Read a scroll of identify (`r`) to identify an unknown item
8. Get a cursed item equipped - try to remove it (should fail)
9. Read scroll of remove curse to free it
10. Zap a wand (`z`) - check charges deplete
11. Verify inventory shows equipment slots and letter assignments

**Playtest scenarios:**
- Is inventory management intuitive and easy to navigate?
- Are unidentified item names varied and memorable?
- Do item effects feel impactful and useful?
- Is identification system clear (which items are known)?
- Can you recover from cursed items reasonably?
- Are there enough healing potions to survive?
- Do wand charges run out at a reasonable rate?

**Known limitations:**
- No hunger system yet (can't starve, Phase 6)
- No leveling system (can't gain stats, Phase 6)
- No victory condition (can't win yet, Phase 7)

---

## Phase 6: Hunger & Progression

**Goal**: Hunger system and leveling
**Duration**: Week 8

### 6.1 HungerService Implementation

Create the hunger system that tracks food consumption and applies effects.

**Hunger States (enum)**:
- [ ] Define `HungerState` enum with 5 states:
  - `FULL` (0-300 turns since eating)
  - `NOT_HUNGRY` (300-900 turns)
  - `HUNGRY` (900-1400 turns) - "You are getting hungry"
  - `WEAK` (1400-1900 turns) - "You are weak from hunger"
  - `FAINTING` (1900+ turns) - "You are fainting from hunger" + 1 HP damage per turn

**Core Service**:
- [ ] Create `src/services/HungerService.ts`
- [ ] Define `IHungerService` interface:
  ```typescript
  interface IHungerService {
    tick(player: Player): HungerUpdate
    consumeFood(player: Player, nutritionalValue: number): Player
    getHungerState(turnsSinceAte: number): HungerState
    getHungerEffects(state: HungerState): HungerEffects
    shouldTakeDamage(state: HungerState): boolean
  }
  ```

**Hunger Mechanics**:
- [ ] Implement `tick()` method:
  - Increment player's `turnsSinceAte` counter
  - Check for state transitions
  - Return messages for state changes
  - Apply starvation damage if `FAINTING`
- [ ] Implement `consumeFood()` method:
  - Reset `turnsSinceAte` to 0 or negative (for overeating)
  - Update hunger state
  - Return updated player
- [ ] Implement `getHungerState()` method with turn thresholds
- [ ] Implement `getHungerEffects()` method:
  - `FAINTING`: -2 to hit, no regeneration
  - `WEAK`: -1 to hit, half regeneration
  - `HUNGRY`: normal, reminder message
  - `NOT_HUNGRY`/`FULL`: normal
- [ ] Implement `shouldTakeDamage()` for starvation

**Player State Updates**:
- [ ] Add `turnsSinceAte: number` to Player type in `core.ts`
- [ ] Add `hungerState: HungerState` to Player type
- [ ] Update player initialization to set hunger values

**Integration**:
- [ ] Update main game loop to call `HungerService.tick()` each turn
- [ ] Update `CombatService` to apply hunger modifiers to hit chances
- [ ] Update regeneration logic to check hunger effects
- [ ] Add hunger state to status display in GameRenderer

**Tests**:
- [ ] Create `src/__tests__/services/HungerService.test.ts`
- [ ] Test all 5 hunger state transitions
- [ ] Test food consumption and counter reset
- [ ] Test starvation damage application
- [ ] Test hunger effects on combat modifiers
- [ ] Test overeating (negative turnsSinceAte)

### 6.2 Food Items

Implement food items and eating mechanics.

**Food Type Definition**:
- [ ] Add `Food` item category to ItemType enum in `core.ts`
- [ ] Add `nutritionalValue: number` to Item interface
- [ ] Define food items in data:
  ```typescript
  {
    type: 'Food',
    name: 'ration of food',
    nutritionalValue: 900,  // ~900 turns of sustenance
    symbol: '🍖',
    stackable: true
  }
  ```

**Food Variants** (optional variety):
- [ ] Ration of food (standard, 900 turns)
- [ ] Slime mold (Vegetarians only, 900 turns, "Yuk, what a slimy mold!")
- [ ] Fruit (found on dungeon floor, 300 turns)

**EatCommand Implementation**:
- [ ] Create `src/commands/EatCommand.ts`
- [ ] Implement `ICommand` interface
- [ ] Validate player has food in inventory
- [ ] Select food from inventory (if multiple)
- [ ] Call `HungerService.consumeFood()`
- [ ] Remove food from inventory
- [ ] Display appropriate message
- [ ] Handle cursed food (if applicable)

**Inventory Integration**:
- [ ] Update `InventoryService` to handle food items
- [ ] Add food filtering for `EatCommand`
- [ ] Update inventory display to show food

**Key Binding**:
- [ ] Bind `e` key to `EatCommand` in InputHandler
- [ ] Add to help screen

**Tests**:
- [ ] Create `src/__tests__/commands/EatCommand.test.ts`
- [ ] Test eating ration resets hunger
- [ ] Test eating with no food shows error
- [ ] Test eating removes item from inventory
- [ ] Test eating when full shows message
- [ ] Test inventory updates correctly

### 6.3 LevelingService Implementation

Create the experience and leveling system.

**Experience System**:
- [ ] Create `src/services/LevelingService.ts`
- [ ] Define `ILevelingService` interface:
  ```typescript
  interface ILevelingService {
    addExperience(player: Player, xpGained: number): LevelUpResult
    calculateXPRequired(level: number): number
    calculateXPReward(monsterLevel: number, playerLevel: number): number
    levelUp(player: Player): Player
  }
  ```

**XP Curves**:
- [ ] Implement `calculateXPRequired()` with original Rogue formula:
  - Level 2: 10 XP
  - Level 3: 20 XP
  - Level 4: 40 XP
  - Formula: `10 * Math.pow(2, level - 2)`
  - Cap at reasonable maximum (e.g., level 20)
- [ ] Create XP lookup table for fast access

**XP Rewards**:
- [ ] Implement `calculateXPReward()`:
  - Base XP = monster's HP * (monster level + 1)
  - Scale by level difference (harder monsters = more XP)
  - Minimum 1 XP per kill
  - Formula: `Math.max(1, baseXP * (1 + (monsterLevel - playerLevel) * 0.1))`

**Level-Up Mechanics**:
- [ ] Implement `addExperience()` method:
  - Add XP to player's total
  - Check if threshold reached
  - Trigger level-up if needed
  - Return level-up details
- [ ] Implement `levelUp()` method:
  - Increment player level
  - Increase max HP (see next section)
  - Increase stats (see next section)
  - Full heal on level-up
  - Return updated player

**Stat Increases**:
- [ ] Implement `calculateStatIncrease()` for each stat:
  - **Strength**: 10% chance to increase by 1 (max 31)
  - **Max HP**: Always increases by 1d10 (average 5.5)
  - **To-hit bonus**: Automatically increases with level
  - No increases to other stats (keep simple like original)
- [ ] Cap stats at reasonable maximums

**HP Gain Per Level**:
- [ ] Implement `calculateHPGain()`:
  - Roll 1d10 for HP increase
  - Add to max HP
  - Heal player to full on level-up
  - Display HP gain in message

**Player State**:
- [ ] Add `xp: number` to Player type in `core.ts`
- [ ] Add `xpToNextLevel: number` to Player type
- [ ] Initialize XP to 0 for new players

**Tests**:
- [ ] Create `src/__tests__/services/LevelingService.test.ts`
- [ ] Test XP curve formula (levels 1-10)
- [ ] Test XP reward calculation
- [ ] Test level-up triggers at correct thresholds
- [ ] Test stat increases (using MockRandom)
- [ ] Test HP gain on level-up
- [ ] Test multiple level-ups from single XP gain
- [ ] Test level cap if implemented

### 6.4 Level-Up Integration & UI

Integrate leveling into game flow and display.

**Combat Integration**:
- [ ] Update `CombatService.playerAttack()`:
  - On monster kill, calculate XP reward
  - Call `LevelingService.addExperience()`
  - Handle level-up result
  - Return XP and level-up info
- [ ] Update `AttackCommand`:
  - Display XP gained message
  - Display level-up message if applicable
  - Show stat increases

**Level-Up Messages**:
- [ ] Create congratulations message: "Welcome to level X!"
- [ ] Display HP gain: "You gain X hit points!"
- [ ] Display stat increases: "You feel stronger!" (if STR increased)
- [ ] Use `MessageService.addMessage()` with special styling

**Status Display Updates**:
- [ ] Update `GameRenderer` to show current level
- [ ] Display XP progress: "Level: 5 (XP: 120/160)"
- [ ] Update stats display to show level-modified values
- [ ] Consider XP bar visualization (optional)

**Level-Scaled Mechanics**:
- [ ] Update `CombatService` to use level in to-hit calculations:
  - Player to-hit: `level + strength bonus - monster AC`
  - Monster to-hit: `monster level - player AC`
- [ ] Update damage calculations if level affects damage
- [ ] Update dungeon generation to scale with player level (optional)

**UI Polish**:
- [ ] Add level-up animation or highlight (optional)
- [ ] Add sound effect for level-up (optional)
- [ ] Pause game briefly to show level-up message
- [ ] Add level to save file

**Tests**:
- [ ] Create `src/__tests__/integration/leveling.test.ts`
- [ ] Test full kill → XP → level-up flow
- [ ] Test level-up messages appear correctly
- [ ] Test stats update in UI after level-up
- [ ] Test combat uses new level values
- [ ] Test save/load preserves XP and level

### 6.5 Files Created in Phase 6

- `src/services/HungerService.ts` (120 lines)
- `src/services/LevelingService.ts` (180 lines)
- `src/commands/EatCommand.ts` (80 lines)
- `src/__tests__/services/HungerService.test.ts` (250 lines)
- `src/__tests__/services/LevelingService.test.ts` (300 lines)
- `src/__tests__/commands/EatCommand.test.ts` (150 lines)
- `src/__tests__/integration/leveling.test.ts` (200 lines)

**Total**: ~1,280 lines of code + tests

### 6.6 Testing Requirements

- [ ] All hunger state transitions work correctly
- [ ] Starvation damage applies when fainting
- [ ] Food consumption resets hunger properly
- [ ] Hunger affects combat and regeneration
- [ ] XP curves match original Rogue formula
- [ ] Level-up triggers at correct XP thresholds
- [ ] Stats increase appropriately
- [ ] HP gain on level-up uses 1d10
- [ ] Level-up messages display correctly
- [ ] UI shows updated stats after level-up
- [ ] Save/load preserves hunger and XP state

### Phase 6 Complete! ✅

At this point you should be able to:
- Experience 5 hunger states (Full → Not Hungry → Hungry → Weak → Fainting)
- See hunger warnings in message log
- Eat food (`e` key) to reset hunger counter
- Take starvation damage when fainting (1 HP/turn)
- Die from starvation if no food available
- Gain XP from monster kills
- Level up when XP threshold reached
- See stat increases on level-up (HP always, STR 10% chance)
- Feel character progression over time

**Test it:**
1. `npm run dev`
2. Play for 900+ turns without eating - watch hunger progress
3. Eat a ration of food (`e`) to reset hunger to full
4. Kill monsters and watch XP accumulate
5. Level up and see "Welcome to level 2!" message
6. Note HP gain (1d10) and potential STR increase
7. Check stats display shows updated level and max HP
8. Try to starve to death (don't eat for ~1900 turns)
9. Verify hunger affects combat (to-hit penalty when weak/fainting)
10. Test regeneration slows/stops when hungry

**Playtest scenarios:**
- Does hunger create meaningful pressure to find food?
- Is food scarce enough to matter but not frustrating?
- Does leveling feel rewarding and impactful?
- Are XP requirements balanced (level 5 by floor 10)?
- Is starvation a real threat or easily avoided?
- Do stat increases feel significant?
- Is the 1d10 HP gain per level enough to keep pace with damage?

**Known limitations:**
- No save/load yet (can't resume game, Phase 7)
- No victory condition (can't win yet, Phase 7)
- No complete UI screens (main menu, help, Phase 7)

---

## Phase 7: Win Condition & Polish

**Goal**: Complete game loop
**Duration**: Week 9

### 7.1 Amulet of Yendor Implementation

Create the win condition: retrieve the Amulet from level 26 and return to level 1.

**Amulet Item**:
- [ ] Define Amulet in `core.ts` as special item type:
  ```typescript
  {
    type: 'Amulet',
    name: 'the Amulet of Yendor',
    symbol: ',',
    color: Colors.GOLD_BRIGHT,
    unique: true,
    questItem: true
  }
  ```
- [ ] Add amulet spawning to `DungeonService`:
  - Only spawn on level 26 (deepest level)
  - Place in guaranteed accessible room
  - Never spawn on level 1-25

**Amulet Pickup**:
- [ ] Update `PickUpCommand` to handle amulet:
  - Display special message: "You have found the Amulet of Yendor!"
  - Mark amulet as possessed in player state
  - Add to inventory (but cannot be dropped)
  - Log achievement
- [ ] Add `hasAmulet: boolean` to Player type

**Victory Condition**:
- [ ] Create `checkVictoryCondition()` in game loop:
  - Check if player has amulet
  - Check if player is on level 1
  - Check if player is on upstairs tile
- [ ] Trigger victory when all conditions met
- [ ] Transition to victory screen

**Amulet Effects** (optional difficulty increase):
- [ ] Increase monster spawn rate when amulet possessed
- [ ] Increase monster aggression range
- [ ] Display "The Amulet makes you feel exposed" message

**Tests**:
- [ ] Create `src/__tests__/integration/victory.test.ts`
- [ ] Test amulet spawns only on level 26
- [ ] Test amulet pickup adds to inventory
- [ ] Test victory condition triggers correctly
- [ ] Test cannot win without amulet
- [ ] Test cannot win on wrong level

### 7.2 SaveService & Persistence

Implement save/load system with permadeath.

**SaveService Interface**:
- [ ] Create `src/services/SaveService.ts`
- [ ] Define `ISaveService` interface:
  ```typescript
  interface ISaveService {
    saveGame(gameState: GameState): void
    loadGame(): GameState | null
    hasSavedGame(): boolean
    deleteSave(): void
    autoSave(gameState: GameState): void
  }
  ```

**LocalStorage Implementation**:
- [ ] Implement localStorage wrapper with error handling
- [ ] Use key: `roguelike_save_v1`
- [ ] Handle quota exceeded errors
- [ ] Validate saved data on load

**Game State Serialization**:
- [ ] Define `GameState` type in `core.ts`:
  ```typescript
  interface GameState {
    player: Player
    dungeon: Level[]
    currentLevel: number
    turnCount: number
    seed: string
    messageLog: Message[]
    identifications: IdentificationState
    gameVersion: string
  }
  ```
- [ ] Implement `serializeGameState()` to JSON
- [ ] Implement `deserializeGameState()` with validation
- [ ] Handle version migrations if needed

**Permadeath Mechanics**:
- [ ] Delete save file on player death
- [ ] Show "Your save has been deleted" message
- [ ] Prevent save scumming (no manual save/load)
- [ ] Only allow one save slot

**Auto-Save Events**:
- [ ] Auto-save after each player action
- [ ] Auto-save on level transition
- [ ] Auto-save on pickup/drop
- [ ] Auto-save on equipment change
- [ ] Debounce saves (max once per 100ms)

**Load Game Flow**:
- [ ] Check for saved game on startup
- [ ] Restore all game state from save
- [ ] Reinitialize services with saved RNG seed
- [ ] Restore FOV and lighting state
- [ ] Resume game at saved position

**SaveCommand** (optional manual save):
- [ ] Create `src/commands/SaveCommand.ts`
- [ ] Bind to `S` key (Shift+S)
- [ ] Display "Game saved" message
- [ ] Exit game after save (classic roguelike behavior)

**Tests**:
- [ ] Create `src/__tests__/services/SaveService.test.ts`
- [ ] Test save/load round-trip preserves state
- [ ] Test deleted save returns null on load
- [ ] Test localStorage errors handled gracefully
- [ ] Test auto-save debouncing
- [ ] Test permadeath deletes save
- [ ] Test version migration (if implemented)

### 7.3 Main Menu Screen

Create the main menu UI.

**Main Menu Component**:
- [ ] Create `src/ui/MainMenu.ts`
- [ ] Define menu interface:
  ```typescript
  interface IMainMenu {
    render(hasSavedGame: boolean): void
    handleInput(key: string): MenuAction
  }
  ```

**Menu Options**:
- [ ] Display game title (ASCII art optional):
  ```
  ╔═══════════════════════════════════╗
  ║     ROGUE: Dungeon Crawl          ║
  ║                                   ║
  ║  [N] New Game                     ║
  ║  [C] Continue Game                ║
  ║  [H] Help                         ║
  ║  [A] About                        ║
  ╚═══════════════════════════════════╝
  ```
- [ ] "New Game" - starts new game (warns if save exists)
- [ ] "Continue Game" - loads saved game (disabled if no save)
- [ ] "Help" - shows help screen
- [ ] "About" - shows credits and version

**Menu Rendering**:
- [ ] Center menu on screen
- [ ] Highlight selected option
- [ ] Keyboard navigation (arrow keys or letters)
- [ ] Enter to confirm selection
- [ ] ESC to exit game (with confirmation)

**New Game Confirmation**:
- [ ] If save exists, show warning:
  - "A saved game exists. Starting a new game will delete it."
  - "Are you sure? (Y/N)"
- [ ] Delete save if confirmed
- [ ] Generate new seed for new game

**Integration**:
- [ ] Update `main.ts` to show menu on startup
- [ ] Handle menu → game transition
- [ ] Handle game → menu transition (on death/victory)

**Tests**:
- [ ] Create `src/__tests__/ui/MainMenu.test.ts`
- [ ] Test menu renders correctly
- [ ] Test navigation works
- [ ] Test "Continue" disabled without save
- [ ] Test new game warning shows with existing save
- [ ] Test menu state transitions

### 7.4 Victory Screen

Display victory screen when player wins.

**Victory Screen Component**:
- [ ] Create `src/ui/VictoryScreen.ts`
- [ ] Display victory message:
  ```
  ╔═══════════════════════════════════╗
  ║  CONGRATULATIONS!                 ║
  ║                                   ║
  ║  You have retrieved the Amulet    ║
  ║  of Yendor and escaped the        ║
  ║  Dungeons of Doom!                ║
  ║                                   ║
  ║  Your Final Stats:                ║
  ║  ═════════════════                ║
  ║  Score: 12,450                    ║
  ║  Level: 12                        ║
  ║  HP: 84/120                       ║
  ║  Turns: 8,341                     ║
  ║  Kills: 127                       ║
  ║  Gold: 2,450                      ║
  ║                                   ║
  ║  [Press any key to continue]      ║
  ╚═══════════════════════════════════╝
  ```

**Score Calculation**:
- [ ] Create `calculateScore()` function:
  - Base score = gold collected
  - Bonus per level = 100 * level
  - Bonus per kill = 10 * kill
  - Amulet bonus = 10,000
  - Item value bonus
- [ ] Display final score prominently

**Victory Statistics**:
- [ ] Track kills throughout game
- [ ] Track gold collected (including spent)
- [ ] Track turns taken
- [ ] Track deepest level reached
- [ ] Display all stats on victory screen

**High Score Table** (optional):
- [ ] Store top 10 scores in localStorage
- [ ] Display high score table
- [ ] Highlight current run if in top 10
- [ ] Show date and player name (optional input)

**Victory Flow**:
- [ ] Trigger on victory condition
- [ ] Delete save file (game complete)
- [ ] Show victory screen
- [ ] Wait for key press
- [ ] Return to main menu

**Tests**:
- [ ] Create `src/__tests__/ui/VictoryScreen.test.ts`
- [ ] Test victory screen renders
- [ ] Test score calculation formula
- [ ] Test stats display correctly
- [ ] Test high score saving (if implemented)
- [ ] Test save deleted on victory

### 7.5 Death Screen

Display death screen when player dies.

**Death Screen Component**:
- [ ] Create `src/ui/DeathScreen.ts`
- [ ] Display death message:
  ```
  ╔═══════════════════════════════════╗
  ║  YOU DIED                         ║
  ║                                   ║
  ║  Killed by: Troll on level 12     ║
  ║                                   ║
  ║  Your Stats:                      ║
  ║  ═══════════                      ║
  ║  Score: 3,240                     ║
  ║  Level: 8                         ║
  ║  Turns: 4,127                     ║
  ║  Kills: 67                        ║
  ║  Gold: 740                        ║
  ║                                   ║
  ║  [Press any key to continue]      ║
  ╚═══════════════════════════════════╝
  ```

**Death Reasons**:
- [ ] Track cause of death (monster name, starvation, etc.)
- [ ] Display specific death message
- [ ] Store death info for tombstone

**Tombstone/Morgue File** (optional):
- [ ] Create death log entry
- [ ] Store in localStorage (`roguelike_morgue`)
- [ ] Include full inventory and equipment
- [ ] Include dungeon level reached
- [ ] View past deaths from main menu

**Death Flow**:
- [ ] Trigger on player HP <= 0
- [ ] Delete save file (permadeath)
- [ ] Show death screen
- [ ] Wait for key press
- [ ] Return to main menu

**Tests**:
- [ ] Create `src/__tests__/ui/DeathScreen.test.ts`
- [ ] Test death screen renders
- [ ] Test cause of death displayed
- [ ] Test save deleted on death
- [ ] Test stats display correctly
- [ ] Test morgue file created (if implemented)

### 7.6 Help Screen

Display help screen with keybindings and instructions.

**Help Screen Component**:
- [ ] Create `src/ui/HelpScreen.ts`
- [ ] Display comprehensive help:
  ```
  ╔═══════════════════════════════════╗
  ║  HELP - ROGUE                     ║
  ║                                   ║
  ║  MOVEMENT:                        ║
  ║  ←↑↓→ or hjkl  Move               ║
  ║  yubn          Diagonal movement  ║
  ║  .             Rest (pass turn)   ║
  ║                                   ║
  ║  ITEMS:                           ║
  ║  ,             Pick up item       ║
  ║  d             Drop item          ║
  ║  i             Show inventory     ║
  ║  w             Wield weapon       ║
  ║  W             Wear armor         ║
  ║  T             Take off armor     ║
  ║  P             Put on ring        ║
  ║  R             Remove ring        ║
  ║  q             Quaff potion       ║
  ║  r             Read scroll        ║
  ║  z             Zap wand           ║
  ║  e             Eat food           ║
  ║                                   ║
  ║  DUNGEON:                         ║
  ║  >             Go down stairs     ║
  ║  <             Go up stairs       ║
  ║  o             Open door          ║
  ║  c             Close door         ║
  ║  s             Search for traps   ║
  ║                                   ║
  ║  OTHER:                           ║
  ║  ?             Show this help     ║
  ║  S             Save & quit        ║
  ║  Q             Quit (no save)     ║
  ║                                   ║
  ║  [ESC] Close help                 ║
  ╚═══════════════════════════════════╝
  ```

**Help Sections**:
- [ ] Movement commands (8-direction + rest)
- [ ] Item commands (11 commands)
- [ ] Dungeon commands (stairs, doors, search)
- [ ] System commands (help, save, quit)
- [ ] Symbols legend (tiles, monsters, items)

**Symbols Legend**:
- [ ] Show all tile symbols (@, #, +, %, etc.)
- [ ] Show monster symbols (a-z, A-Z)
- [ ] Show item symbols (!, ?, /, =, etc.)
- [ ] Color-coded if possible

**Help Access**:
- [ ] Bind `?` key to show help
- [ ] Available from main menu
- [ ] Available during gameplay
- [ ] ESC to close and return

**Tests**:
- [ ] Create `src/__tests__/ui/HelpScreen.test.ts`
- [ ] Test help screen renders
- [ ] Test all commands listed
- [ ] Test help accessible from game and menu
- [ ] Test ESC closes help

### 7.7 UI Polish & Final Integration

Polish the UI and integrate all screens.

**Title & Branding**:
- [ ] Create ASCII title logo (optional)
- [ ] Add version number to main menu
- [ ] Add credits/attribution
- [ ] Consistent color scheme across all screens

**Screen Transitions**:
- [ ] Smooth fade between screens (optional)
- [ ] Clear screen before rendering new screen
- [ ] Consistent layout and spacing
- [ ] Handle window resize gracefully

**Message History Modal**:
- [ ] Create `MessageHistory.ts` UI component
- [ ] Display scrollable message log
- [ ] Bind to `M` key (Shift+M)
- [ ] Show last 100 messages
- [ ] Highlight recent messages
- [ ] ESC to close

**Game Over Handling**:
- [ ] Centralize game over logic
- [ ] Handle death → death screen → main menu flow
- [ ] Handle victory → victory screen → main menu flow
- [ ] Ensure save deleted in both cases

**Quit Confirmation**:
- [ ] Add confirmation dialog for quit without save
- [ ] "Really quit? Your game will not be saved. (Y/N)"
- [ ] Save if user chooses to save
- [ ] Exit without save if confirmed

**Status Bar Polish**:
- [ ] Consistent formatting for all stats
- [ ] Color-code critical values (low HP = red)
- [ ] Show hunger status with icon
- [ ] Show XP progress bar (optional)
- [ ] Show floor number prominently

**Input Handling**:
- [ ] Handle invalid keys gracefully
- [ ] Display "Unknown command" for invalid keys
- [ ] Support uppercase and lowercase
- [ ] Handle numpad and vi keys interchangeably

**Tests**:
- [ ] Create `src/__tests__/integration/ui-flow.test.ts`
- [ ] Test menu → game transition
- [ ] Test game → death → menu flow
- [ ] Test game → victory → menu flow
- [ ] Test help screen from all contexts
- [ ] Test quit confirmation
- [ ] Test message history modal

### 7.8 Files Created in Phase 7

- `src/services/SaveService.ts` (200 lines)
- `src/commands/SaveCommand.ts` (60 lines)
- `src/ui/MainMenu.ts` (150 lines)
- `src/ui/VictoryScreen.ts` (120 lines)
- `src/ui/DeathScreen.ts` (100 lines)
- `src/ui/HelpScreen.ts` (180 lines)
- `src/ui/MessageHistory.ts` (100 lines)
- `src/__tests__/services/SaveService.test.ts` (300 lines)
- `src/__tests__/ui/MainMenu.test.ts` (200 lines)
- `src/__tests__/ui/VictoryScreen.test.ts` (150 lines)
- `src/__tests__/ui/DeathScreen.test.ts` (120 lines)
- `src/__tests__/ui/HelpScreen.test.ts` (100 lines)
- `src/__tests__/integration/victory.test.ts` (200 lines)
- `src/__tests__/integration/ui-flow.test.ts` (250 lines)

**Total**: ~2,230 lines of code + tests

### 7.9 Testing Requirements

- [ ] Amulet spawns correctly on level 26
- [ ] Victory condition triggers with amulet on level 1
- [ ] Save/load preserves all game state
- [ ] Permadeath deletes save on death
- [ ] Auto-save works on all key events
- [ ] Main menu displays correctly
- [ ] Continue game loads saved state
- [ ] New game warns if save exists
- [ ] Victory screen shows correct stats and score
- [ ] Death screen shows correct cause of death
- [ ] Help screen lists all commands
- [ ] Message history displays recent messages
- [ ] Quit confirmation prevents accidental exits
- [ ] All screen transitions work smoothly

### Phase 7 Complete! ✅

At this point you should have a **complete, playable roguelike game**!

You should be able to:
- Start game from main menu (New Game / Continue / Help)
- Play through all 26 dungeon levels
- Find the Amulet of Yendor on level 26
- Return to level 1 with the amulet
- Win the game and see victory screen with score
- Die and see death screen with cause and stats
- Save and quit (`S`), then resume game later
- Experience permadeath (save deleted on death/victory)
- View help screen (`?`) with all commands
- View message history (`M`) to review past events
- See all UI polish and screen transitions

**Test it - Full Game Playthrough:**
1. `npm run dev` - see main menu
2. Press `N` for New Game
3. Play through multiple levels
4. Save and quit (`S` or `Shift+S`)
5. Refresh page - see main menu with "Continue Game"
6. Press `C` to continue - resume where you left off
7. Attempt to reach level 26
8. Find the Amulet of Yendor (golden `,` symbol)
9. Pick it up - see special message
10. Return to level 1 using up stairs (`<`)
11. Step on up stairs on level 1 - trigger victory!
12. See victory screen with final score and stats
13. Press any key to return to main menu

**Test it - Death Scenario:**
1. Start new game
2. Let monsters kill you
3. See death screen with cause ("Killed by Troll on level 5")
4. Verify stats displayed (level, gold, kills, turns)
5. Press any key to return to main menu
6. Try to continue - should not be available (save deleted)

**Test it - Help & UI:**
1. From main menu, press `H` for help
2. Verify all commands listed correctly
3. Press `ESC` to close help
4. During game, press `?` for help
5. Press `M` (Shift+M) for message history
6. Verify scrollable log of recent messages
7. Test `Q` quit confirmation dialog

**Playtest scenarios:**
- Can you complete a full game from start to victory?
- Is the amulet clearly visible on level 26?
- Is the victory condition clear (return to level 1)?
- Does save/load preserve everything (position, items, hunger, etc.)?
- Is permadeath working (no save scumming)?
- Are all UI screens polished and professional?
- Is the help screen comprehensive enough for new players?
- Does the score calculation feel fair?

**Victory criteria:**
- [ ] Win the game at least once
- [ ] Save/load works perfectly across sessions
- [ ] Death deletes save (tested)
- [ ] Victory deletes save (tested)
- [ ] All screens render correctly
- [ ] No game-breaking bugs

---

## Phase 8: Testing, Balance & Bug Fixes

**Goal**: >80% coverage, balance
**Duration**: Week 10-11

### 8.1 Service Unit Test Coverage

Ensure all services have comprehensive unit tests.

**Core Services** (Phases 0-1):
- [ ] `RandomService.test.ts` - complete with MockRandom validation
- [ ] `FOVService.test.ts` - test all 8 octants, edge cases
- [ ] `LightingService.test.ts` - test torch, lantern, radius calculations
- [ ] `RenderingService.test.ts` - test visibility states, colors
- [ ] `MovementService.test.ts` - test collisions, valid moves
- [ ] `MessageService.test.ts` - test message queue, limits

**Combat Services** (Phase 2):
- [ ] `CombatService.test.ts` - test hit calculations, damage, death
- [ ] `PathfindingService.test.ts` - test A*, blocked paths, long distances
- [ ] `MonsterAIService.test.ts` - test all 7 AI behaviors with deterministic RNG

**Dungeon Services** (Phase 3):
- [ ] `DungeonService.test.ts` - test room generation, MST, corridors
- [ ] `TrapService.test.ts` - test all 5 trap types and effects
- [ ] Test door mechanics (6 door types)
- [ ] Test multi-level generation consistency

**Item Services** (Phase 5):
- [ ] `InventoryService.test.ts` - test equipment slots, stacking, cursed items
- [ ] `IdentificationService.test.ts` - test name generation, identification
- [ ] `ItemEffectService.test.ts` - test all 40+ item effects

**Progression Services** (Phase 6):
- [ ] `HungerService.test.ts` - test all 5 hunger states
- [ ] `LevelingService.test.ts` - test XP curves, level-ups, stat increases

**System Services** (Phase 7):
- [ ] `SaveService.test.ts` - test serialization, permadeath, auto-save

**Coverage Target**:
- [ ] Run `npm run test:coverage`
- [ ] Verify >80% statement coverage
- [ ] Verify >75% branch coverage
- [ ] Verify >80% function coverage
- [ ] Fix any gaps in coverage

### 8.2 Command Unit Test Coverage

Test all command implementations.

**Movement Commands**:
- [ ] `MoveCommand.test.ts` - test all 8 directions, collisions
- [ ] `AttackCommand.test.ts` - test combat, kills, XP
- [ ] `MoveStairsCommand.test.ts` - test level transitions

**Door Commands** (Phase 3):
- [ ] `OpenDoorCommand.test.ts` - test opening, locked doors
- [ ] `CloseDoorCommand.test.ts` - test closing, blocked tiles
- [ ] `SearchCommand.test.ts` - test finding secret doors and traps

**Item Commands** (Phase 5):
- [ ] `PickUpCommand.test.ts` - test pickup, full inventory
- [ ] `DropCommand.test.ts` - test dropping, equipped items
- [ ] `WieldCommand.test.ts` - test weapon equipping, cursed weapons
- [ ] `WearArmorCommand.test.ts` - test armor equipping
- [ ] `TakeOffArmorCommand.test.ts` - test removal, cursed armor
- [ ] `PutOnRingCommand.test.ts` - test ring slots (2 max)
- [ ] `RemoveRingCommand.test.ts` - test removal, cursed rings
- [ ] `QuaffPotionCommand.test.ts` - test all potion effects
- [ ] `ReadScrollCommand.test.ts` - test all scroll effects
- [ ] `ZapWandCommand.test.ts` - test all wand effects, charges
- [ ] `EatCommand.test.ts` - test food consumption, hunger reset

**System Commands** (Phase 7):
- [ ] `SaveCommand.test.ts` - test save and quit

**Command Coverage**:
- [ ] Verify all commands have >80% coverage
- [ ] Test error cases (invalid input, empty inventory, etc.)
- [ ] Test edge cases (full inventory, no targets, etc.)

### 8.3 UI Component Test Coverage

Test all UI rendering and input handling.

**Core UI**:
- [ ] `GameRenderer.test.ts` - test dungeon rendering, status display
- [ ] `InputHandler.test.ts` - test key mapping, command routing
- [ ] `InventoryScreen.test.ts` - test inventory display, selection

**Menu Screens** (Phase 7):
- [ ] `MainMenu.test.ts` - test menu navigation, save detection
- [ ] `VictoryScreen.test.ts` - test score calculation, stats display
- [ ] `DeathScreen.test.ts` - test death message, cause tracking
- [ ] `HelpScreen.test.ts` - test help display, all commands listed
- [ ] `MessageHistory.test.ts` - test message log, scrolling

**UI Testing Focus**:
- [ ] Test rendering does not crash
- [ ] Test input produces correct commands
- [ ] Test screen transitions
- [ ] Mock canvas/DOM for headless tests

### 8.4 Integration Test Suite

Test complete game flows and feature interactions.

**Core Game Loop** (`src/__tests__/integration/game-loop.test.ts`):
- [ ] Test player spawns correctly
- [ ] Test turn processing order (player → monsters → environment)
- [ ] Test FOV updates on movement
- [ ] Test message log updates
- [ ] Test game state consistency after each turn
- [ ] Test 100-turn simulation runs without errors

**Multi-Level Gameplay** (`src/__tests__/integration/multi-level.test.ts`):
- [ ] Test descending 26 levels
- [ ] Test ascending back to level 1
- [ ] Test monsters don't follow between levels
- [ ] Test items persist on levels
- [ ] Test stairs always accessible
- [ ] Test level memory (explored state)

**Combat Flow** (`src/__tests__/integration/combat.test.ts`):
- [ ] Test player kills monster → gains XP → levels up
- [ ] Test monster kills player → death screen
- [ ] Test special abilities trigger correctly
- [ ] Test fleeing behavior (COWARD AI)
- [ ] Test confusion effects
- [ ] Test paralysis effects

**Item Interaction** (`src/__tests__/integration/items.test.ts`):
- [ ] Test find → pick up → equip → use flow
- [ ] Test identification system (unknown → identified)
- [ ] Test cursed item cannot be removed
- [ ] Test remove curse scroll
- [ ] Test potion stacking
- [ ] Test wand charges deplete
- [ ] Test ring interactions (2 ring limit)

**Hunger & Survival** (`src/__tests__/integration/hunger.test.ts`):
- [ ] Test hunger progresses over turns
- [ ] Test eating resets hunger
- [ ] Test starvation damage
- [ ] Test death by starvation
- [ ] Test hunger affects combat

**Save/Load Persistence** (`src/__tests__/integration/save-load.test.ts`):
- [ ] Test save → load preserves player state
- [ ] Test save → load preserves dungeon state
- [ ] Test save → load preserves monster positions
- [ ] Test save → load preserves item identifications
- [ ] Test save → load preserves RNG state (same seed)
- [ ] Test death deletes save
- [ ] Test victory deletes save

**Victory Condition** (`src/__tests__/integration/victory.test.ts`):
- [ ] Test reach level 26
- [ ] Test find amulet
- [ ] Test return to level 1
- [ ] Test victory screen appears
- [ ] Test score calculated correctly

**Edge Cases** (`src/__tests__/integration/edge-cases.test.ts`):
- [ ] Test player surrounded by monsters
- [ ] Test empty floor (no monsters/items)
- [ ] Test fully blocked room (unreachable)
- [ ] Test teleport to wall (trap edge case)
- [ ] Test inventory overflow (>26 items)
- [ ] Test zero HP exactly (not negative)

### 8.5 Balance Tuning & Playtesting

Balance gameplay for fun and challenge.

**Monster Balance**:
- [ ] Test early levels (1-5) are survivable
- [ ] Test mid levels (10-15) are challenging
- [ ] Test deep levels (20-26) are hard but fair
- [ ] Adjust monster spawn rates per level
- [ ] Adjust monster HP/damage scaling
- [ ] Test monster density (not too crowded)
- [ ] Verify monster level progression:
  - Level 1-3: Bat, Kestrel, Emu, Hobgoblin
  - Level 4-8: Snake, Centaur, Orc, Zombie
  - Level 9-15: Rattlesnake, Troll, Wraith
  - Level 16-26: Griffin, Dragon, Vampire

**Item Balance**:
- [ ] Test item spawn rates (not too rare or common)
- [ ] Adjust potion drop rates (healing most common)
- [ ] Adjust scroll drop rates (identify common)
- [ ] Adjust weapon/armor spawn by depth
- [ ] Test cursed item percentage (~10%)
- [ ] Verify food scarcity (hunger pressure)
- [ ] Balance wand charge counts
- [ ] Balance ring power levels

**Combat Balance**:
- [ ] Test AC effectiveness (armor matters)
- [ ] Test weapon damage scaling
- [ ] Test to-hit formula (not too easy/hard)
- [ ] Test player damage vs monster HP
- [ ] Test monster damage vs player HP
- [ ] Verify combat feels fair (not too swingy)

**Progression Balance**:
- [ ] Test XP curve (level 10 by floor 15)
- [ ] Test stat increases feel impactful
- [ ] Test HP gain per level (average 5-6)
- [ ] Test strength increases (10% chance)
- [ ] Verify hunger timing (need food every ~1000 turns)

**Difficulty Curve**:
- [ ] Play through levels 1-10 multiple times
- [ ] Track win rate (should be ~10-20% for skilled players)
- [ ] Track average death level (around level 8-12)
- [ ] Identify difficulty spikes
- [ ] Smooth out difficulty curve
- [ ] Ensure level 26 is reachable but challenging

**Drop Rate Tuning**:
- [ ] Gold: Common (30%)
- [ ] Potion: Common (25%)
- [ ] Scroll: Common (20%)
- [ ] Weapon: Uncommon (10%)
- [ ] Armor: Uncommon (8%)
- [ ] Ring: Rare (5%)
- [ ] Wand: Rare (5%)
- [ ] Food: Uncommon (7%)
- [ ] Amulet: Unique (level 26 only)

### 8.6 Bug Fixing & Edge Cases

Identify and fix common bugs and edge cases.

**Movement Bugs**:
- [ ] Test diagonal movement blocked by corners
- [ ] Test movement onto items works
- [ ] Test movement onto stairs works
- [ ] Test cannot move off map
- [ ] Test cannot move into walls

**Combat Bugs**:
- [ ] Test damage cannot reduce HP below 0
- [ ] Test zero-damage attacks display correctly
- [ ] Test critical hits (if implemented)
- [ ] Test confused player cannot attack
- [ ] Test paralyzed player cannot move

**Inventory Bugs**:
- [ ] Test equipping item with full hands
- [ ] Test dropping equipped item unequips it
- [ ] Test cursed items cannot be unequipped
- [ ] Test inventory letter wrapping (a-z then A-Z)
- [ ] Test stacking identical items

**Door Bugs**:
- [ ] Test cannot open already-open door
- [ ] Test cannot close door with entity on it
- [ ] Test secret doors remain hidden until searched
- [ ] Test locked doors require key or force
- [ ] Test broken doors cannot be closed

**Trap Bugs**:
- [ ] Test traps trigger once then disappear
- [ ] Test search reveals nearby traps
- [ ] Test teleport trap doesn't teleport into walls
- [ ] Test pit trap handles multi-level descent

**AI Bugs**:
- [ ] Test monsters don't move when player not in FOV
- [ ] Test GREEDY monsters prioritize gold
- [ ] Test THIEF monsters flee after stealing
- [ ] Test COWARD monsters flee at low HP
- [ ] Test pathfinding handles blocked paths

**Save/Load Bugs**:
- [ ] Test save doesn't corrupt on browser close
- [ ] Test load handles missing data gracefully
- [ ] Test save size doesn't exceed localStorage limit
- [ ] Test version mismatch handled

**UI Bugs**:
- [ ] Test message log doesn't overflow
- [ ] Test very long messages wrap correctly
- [ ] Test colors render consistently
- [ ] Test special characters display (unicode)
- [ ] Test screen resize doesn't break layout

### 8.7 Performance Testing & Optimization

Ensure smooth gameplay at 60 FPS.

**FOV Performance**:
- [ ] Profile FOV calculation time
- [ ] Test FOV with radius 10+ doesn't lag
- [ ] Test FOV in large rooms (20x20+)
- [ ] Optimize shadowcasting if needed
- [ ] Cache FOV results if unchanged

**Pathfinding Performance**:
- [ ] Profile A* pathfinding time
- [ ] Test pathfinding across entire level
- [ ] Set max pathfinding distance (limit to 30 tiles)
- [ ] Cache paths if destination unchanged
- [ ] Test multiple monsters pathfinding simultaneously

**Dungeon Generation Performance**:
- [ ] Profile level generation time
- [ ] Test generation completes in <100ms
- [ ] Optimize MST algorithm if needed
- [ ] Optimize floodfill if needed

**Rendering Performance**:
- [ ] Profile render() call time
- [ ] Test full screen render at 60 FPS
- [ ] Optimize canvas drawing if needed
- [ ] Only redraw changed tiles (optional)

**Save/Load Performance**:
- [ ] Profile save serialization time
- [ ] Profile load deserialization time
- [ ] Test save/load with 26 full levels
- [ ] Optimize JSON serialization if needed
- [ ] Compress save data if too large (optional)

**Memory Usage**:
- [ ] Profile memory usage over long game
- [ ] Test no memory leaks after 1000+ turns
- [ ] Test localStorage usage stays under quota
- [ ] Optimize large data structures

### 8.8 Code Quality & Cleanup

Final code quality improvements.

**Code Cleanup**:
- [ ] Remove all console.log statements
- [ ] Remove commented-out code
- [ ] Remove unused imports
- [ ] Remove unused variables
- [ ] Fix all TypeScript warnings
- [ ] Fix all ESLint warnings

**Code Documentation**:
- [ ] Add JSDoc comments to all public methods
- [ ] Document complex algorithms (FOV, A*, MST)
- [ ] Document all interfaces
- [ ] Add examples to README
- [ ] Document development setup

**Type Safety**:
- [ ] Remove all `any` types
- [ ] Add strict null checks
- [ ] Use proper discriminated unions
- [ ] Validate all external data (JSON)

**Error Handling**:
- [ ] Add try-catch around localStorage calls
- [ ] Add try-catch around JSON parsing
- [ ] Handle canvas context creation failure
- [ ] Display user-friendly error messages
- [ ] Log errors to console for debugging

**Code Style**:
- [ ] Run Prettier on all files
- [ ] Consistent naming conventions
- [ ] Consistent file structure
- [ ] Consistent import ordering

### 8.9 Final Playtesting Checklist

Complete playthrough testing.

**Playthrough 1: Tutorial/Easy Path**:
- [ ] Start new game
- [ ] Complete first 5 levels
- [ ] Pick up and use each item type
- [ ] Test all commands work
- [ ] Verify UI is clear and intuitive
- [ ] Check for confusing messages
- [ ] Note any rough edges

**Playthrough 2: Full Game**:
- [ ] Attempt to reach level 26
- [ ] Find the Amulet
- [ ] Attempt to return to level 1
- [ ] Try to win the game
- [ ] Track time to completion
- [ ] Note difficulty spikes
- [ ] Verify victory screen

**Playthrough 3: Death Scenarios**:
- [ ] Die to monster
- [ ] Die to starvation
- [ ] Die to trap (if lethal)
- [ ] Verify death screen correct
- [ ] Verify save deleted
- [ ] Verify can start new game

**Playthrough 4: Edge Cases**:
- [ ] Test save/load multiple times
- [ ] Test all special monster abilities
- [ ] Test all item effects
- [ ] Test cursed items
- [ ] Test full inventory
- [ ] Test all trap types
- [ ] Test all door types

**User Experience Checks**:
- [ ] Game is fun to play
- [ ] Controls feel responsive
- [ ] Difficulty feels fair
- [ ] UI is readable
- [ ] Messages are clear
- [ ] Help screen is comprehensive
- [ ] No confusing mechanics

### 8.10 Testing Requirements Summary

**Minimum Requirements**:
- [ ] >80% code coverage across all modules
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] At least 3 complete playthroughs without crashes
- [ ] Win the game at least once
- [ ] Die in at least 3 different ways
- [ ] Performance: 60 FPS on modern browsers
- [ ] Performance: Level generation <100ms
- [ ] Performance: Save/load <50ms
- [ ] No memory leaks after 1000+ turns
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on desktop (1920x1080+)
- [ ] Mobile support (optional but nice to have)

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

### monsters.json (Complete Monster Roster)

All 26 monsters from original Rogue with full stats and AI behaviors:

```json
{
  "monsters": [
    {
      "symbol": "A",
      "name": "Aquator",
      "level": 5,
      "hp": "5d8",
      "ac": 2,
      "damage": "0d0/0d0",
      "xp": 20,
      "ai": "SIMPLE",
      "specialAbility": "RUST_ARMOR",
      "minDepth": 8,
      "maxDepth": 26,
      "description": "Rusts armor on contact"
    },
    {
      "symbol": "B",
      "name": "Bat",
      "level": 1,
      "hp": "1d8",
      "ac": 3,
      "damage": "1d2",
      "xp": 1,
      "ai": "ERRATIC",
      "specialAbility": "FLYING",
      "minDepth": 1,
      "maxDepth": 8,
      "description": "Fast, erratic flier"
    },
    {
      "symbol": "C",
      "name": "Centaur",
      "level": 4,
      "hp": "4d8",
      "ac": 4,
      "damage": "1d6/1d6",
      "xp": 17,
      "ai": "SMART",
      "specialAbility": "MULTIPLE_ATTACKS",
      "minDepth": 7,
      "maxDepth": 16,
      "description": "Dual-wielding archer"
    },
    {
      "symbol": "D",
      "name": "Dragon",
      "level": 10,
      "hp": "10d8",
      "ac": -1,
      "damage": "1d8/1d8/3d10",
      "xp": 6800,
      "ai": "SMART",
      "specialAbility": "BREATH_WEAPON,MULTIPLE_ATTACKS,REGENERATION",
      "minDepth": 21,
      "maxDepth": 26,
      "description": "Ancient fire-breather with regeneration"
    },
    {
      "symbol": "E",
      "name": "Emu",
      "level": 1,
      "hp": "1d8",
      "ac": 7,
      "damage": "1d2",
      "xp": 2,
      "ai": "SIMPLE",
      "specialAbility": null,
      "minDepth": 1,
      "maxDepth": 5,
      "description": "Large flightless bird"
    },
    {
      "symbol": "F",
      "name": "Venus Flytrap",
      "level": 8,
      "hp": "8d8",
      "ac": 3,
      "damage": "1d6",
      "xp": 80,
      "ai": "STATIONARY",
      "specialAbility": "HOLD_PLAYER",
      "minDepth": 14,
      "maxDepth": 26,
      "description": "Immobile but can hold player"
    },
    {
      "symbol": "G",
      "name": "Griffin",
      "level": 13,
      "hp": "13d8",
      "ac": 2,
      "damage": "4d3/3d5/4d3",
      "xp": 2000,
      "ai": "SMART",
      "specialAbility": "MULTIPLE_ATTACKS,FLYING,REGENERATION",
      "minDepth": 20,
      "maxDepth": 26,
      "description": "Legendary flying regenerator with 3 attacks"
    },
    {
      "symbol": "H",
      "name": "Hobgoblin",
      "level": 1,
      "hp": "1d8",
      "ac": 5,
      "damage": "1d8",
      "xp": 3,
      "ai": "SIMPLE",
      "specialAbility": null,
      "minDepth": 1,
      "maxDepth": 6,
      "description": "Common dungeon dweller"
    },
    {
      "symbol": "I",
      "name": "Ice Monster",
      "level": 1,
      "hp": "1d8",
      "ac": 9,
      "damage": "0d0",
      "xp": 5,
      "ai": "SIMPLE",
      "specialAbility": "FREEZE_PLAYER",
      "minDepth": 2,
      "maxDepth": 10,
      "description": "Freezes player in place (no damage)"
    },
    {
      "symbol": "J",
      "name": "Jabberwock",
      "level": 15,
      "hp": "15d8",
      "ac": 6,
      "damage": "2d12/2d4",
      "xp": 3000,
      "ai": "SMART",
      "specialAbility": "MULTIPLE_ATTACKS",
      "minDepth": 22,
      "maxDepth": 26,
      "description": "Fierce dual attacker"
    },
    {
      "symbol": "K",
      "name": "Kestrel",
      "level": 1,
      "hp": "1d8",
      "ac": 7,
      "damage": "1d4",
      "xp": 2,
      "ai": "ERRATIC",
      "specialAbility": "FLYING",
      "minDepth": 1,
      "maxDepth": 6,
      "description": "Small bird of prey"
    },
    {
      "symbol": "L",
      "name": "Leprechaun",
      "level": 3,
      "hp": "3d8",
      "ac": 8,
      "damage": "1d1",
      "xp": 10,
      "ai": "THIEF",
      "specialAbility": "STEAL_GOLD",
      "minDepth": 5,
      "maxDepth": 16,
      "description": "Steals gold and flees"
    },
    {
      "symbol": "M",
      "name": "Medusa",
      "level": 8,
      "hp": "8d8",
      "ac": 2,
      "damage": "3d4/3d4/2d5",
      "xp": 200,
      "ai": "SMART",
      "specialAbility": "CONFUSION,MULTIPLE_ATTACKS",
      "minDepth": 16,
      "maxDepth": 26,
      "description": "Confusing gaze + 3 attacks"
    },
    {
      "symbol": "N",
      "name": "Nymph",
      "level": 3,
      "hp": "3d8",
      "ac": 9,
      "damage": "0d0",
      "xp": 37,
      "ai": "THIEF",
      "specialAbility": "STEAL_ITEM",
      "minDepth": 6,
      "maxDepth": 16,
      "description": "Steals random item and teleports"
    },
    {
      "symbol": "O",
      "name": "Orc",
      "level": 1,
      "hp": "1d8",
      "ac": 6,
      "damage": "1d8",
      "xp": 5,
      "ai": "GREEDY",
      "specialAbility": null,
      "minDepth": 3,
      "maxDepth": 12,
      "description": "Greedy fighter, seeks gold"
    },
    {
      "symbol": "P",
      "name": "Phantom",
      "level": 8,
      "hp": "8d8",
      "ac": 3,
      "damage": "4d4",
      "xp": 120,
      "ai": "SMART",
      "specialAbility": "INVISIBLE",
      "minDepth": 15,
      "maxDepth": 26,
      "description": "Invisible until attacks"
    },
    {
      "symbol": "Q",
      "name": "Quagga",
      "level": 3,
      "hp": "3d8",
      "ac": 2,
      "damage": "1d5/1d5",
      "xp": 15,
      "ai": "SIMPLE",
      "specialAbility": "MULTIPLE_ATTACKS",
      "minDepth": 5,
      "maxDepth": 12,
      "description": "Zebra-like creature with kick"
    },
    {
      "symbol": "R",
      "name": "Rattlesnake",
      "level": 2,
      "hp": "2d8",
      "ac": 3,
      "damage": "1d6",
      "xp": 9,
      "ai": "SIMPLE",
      "specialAbility": "DRAIN_STRENGTH",
      "minDepth": 3,
      "maxDepth": 12,
      "description": "Venomous, drains strength"
    },
    {
      "symbol": "S",
      "name": "Snake",
      "level": 1,
      "hp": "1d8",
      "ac": 5,
      "damage": "1d3",
      "xp": 3,
      "ai": "SIMPLE",
      "specialAbility": null,
      "minDepth": 2,
      "maxDepth": 8,
      "description": "Common serpent"
    },
    {
      "symbol": "T",
      "name": "Troll",
      "level": 6,
      "hp": "6d8",
      "ac": 4,
      "damage": "1d8/1d8/2d6",
      "xp": 120,
      "ai": "SMART",
      "specialAbility": "REGENERATION,MULTIPLE_ATTACKS",
      "minDepth": 11,
      "maxDepth": 20,
      "description": "Regenerates HP, 3 attacks"
    },
    {
      "symbol": "U",
      "name": "Ur-Vile",
      "level": 7,
      "hp": "7d8",
      "ac": -2,
      "damage": "1d3/1d3/1d3/4d6",
      "xp": 190,
      "ai": "SMART",
      "specialAbility": "MULTIPLE_ATTACKS",
      "minDepth": 13,
      "maxDepth": 26,
      "description": "Four attacks, excellent AC"
    },
    {
      "symbol": "V",
      "name": "Vampire",
      "level": 8,
      "hp": "8d8",
      "ac": 1,
      "damage": "1d10",
      "xp": 350,
      "ai": "SMART",
      "specialAbility": "DRAIN_MAX_HP,REGENERATION,FLYING",
      "minDepth": 17,
      "maxDepth": 26,
      "description": "Drains max HP permanently, regenerates"
    },
    {
      "symbol": "W",
      "name": "Wraith",
      "level": 5,
      "hp": "5d8",
      "ac": 4,
      "damage": "1d6",
      "xp": 55,
      "ai": "SMART",
      "specialAbility": "DRAIN_XP",
      "minDepth": 9,
      "maxDepth": 18,
      "description": "Drains experience levels"
    },
    {
      "symbol": "X",
      "name": "Xeroc",
      "level": 7,
      "hp": "7d8",
      "ac": 7,
      "damage": "4d4",
      "xp": 100,
      "ai": "SMART",
      "specialAbility": "MIMIC",
      "minDepth": 13,
      "maxDepth": 26,
      "description": "Disguises as item until approached"
    },
    {
      "symbol": "Y",
      "name": "Yeti",
      "level": 4,
      "hp": "4d8",
      "ac": 6,
      "damage": "1d6/1d6",
      "xp": 50,
      "ai": "SIMPLE",
      "specialAbility": "MULTIPLE_ATTACKS",
      "minDepth": 7,
      "maxDepth": 15,
      "description": "Snow beast with dual claws"
    },
    {
      "symbol": "Z",
      "name": "Zombie",
      "level": 2,
      "hp": "2d8",
      "ac": 8,
      "damage": "1d8",
      "xp": 7,
      "ai": "SIMPLE",
      "specialAbility": null,
      "minDepth": 3,
      "maxDepth": 10,
      "description": "Shambling undead"
    }
  ]
}
```

**Monster Stats Explanation**:
- **symbol**: Display character (A-Z)
- **name**: Monster name
- **level**: Monster level (affects XP, to-hit, etc.)
- **hp**: Hit point dice (e.g., "5d8" = roll 5 eight-sided dice)
- **ac**: Armor class (lower is better, -2 is best, 9 is worst)
- **damage**: Damage dice per attack (multiple attacks separated by /)
- **xp**: Experience points awarded on kill
- **ai**: Behavior type (SIMPLE, SMART, ERRATIC, GREEDY, THIEF, STATIONARY, COWARD)
- **specialAbility**: Unique abilities (null if none)
- **minDepth/maxDepth**: Level range where monster spawns

**Special Abilities**:
- `RUST_ARMOR`: Damages armor on contact (Aquator)
- `FLYING`: Can move over difficult terrain (Bat, Kestrel, Griffin, Vampire)
- `MULTIPLE_ATTACKS`: Multiple damage rolls per turn (Centaur, Dragon, etc.)
- `BREATH_WEAPON`: Dragon's fire breath (3d10 damage, ranged)
- `HOLD_PLAYER`: Paralyzes player (Venus Flytrap)
- `REGENERATION`: Heals HP each turn (Dragon, Griffin, Troll, Vampire)
- `FREEZE_PLAYER`: Freezes player for 1-3 turns (Ice Monster)
- `STEAL_GOLD`: Steals gold and flees (Leprechaun)
- `STEAL_ITEM`: Steals random item and teleports (Nymph)
- `INVISIBLE`: Not visible until attacks (Phantom)
- `DRAIN_STRENGTH`: Reduces strength stat (Rattlesnake)
- `DRAIN_XP`: Reduces experience level (Wraith)
- `DRAIN_MAX_HP`: Permanently reduces max HP (Vampire)
- `CONFUSION`: Confuses player, random movement (Medusa)
- `MIMIC`: Appears as item on floor (Xeroc)

**AI Behaviors**:
- `SIMPLE`: Move toward player if in FOV
- `SMART`: Use A* pathfinding, intelligent positioning
- `ERRATIC`: 50% random movement, 50% toward player
- `GREEDY`: Prioritize moving to gold piles
- `THIEF`: Steal (gold/item) then flee
- `STATIONARY`: Never moves (Venus Flytrap)
- `COWARD`: Flee when HP < 30%

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

### Testing Philosophy

**Colocated Tests**: Tests live next to the code they test, organized by scenario/feature.

**File Naming Convention**:
- `ServiceName.ts` - The service implementation
- `ServiceName.scenario.test.ts` - Test file for specific scenario
- Examples:
  - `RandomService.seeded.test.ts` - Tests for seeded random behavior
  - `RandomService.mock.test.ts` - Tests for mock random behavior
  - `LightingService.fuel.test.ts` - Tests for fuel consumption
  - `LightingService.creation.test.ts` - Tests for creating light sources
  - `FOVService.shadowcasting.test.ts` - Tests for shadowcasting algorithm
  - `FOVService.blocking.test.ts` - Tests for vision blocking

**Benefits**:
- Easy to find tests for specific functionality
- Clear separation of test concerns
- Better organization as codebase grows
- Tests are close to implementation for easier refactoring

### Folder Structure Examples

```
src/services/
├── RandomService/
│   ├── RandomService.ts              # Implementation
│   ├── RandomService.seeded.test.ts  # Seeded RNG tests
│   └── RandomService.mock.test.ts    # Mock RNG tests
├── LightingService/
│   ├── LightingService.ts
│   ├── LightingService.fuel.test.ts      # Fuel tracking tests
│   ├── LightingService.creation.test.ts  # Light creation tests
│   └── LightingService.warnings.test.ts  # Warning message tests
└── FOVService/
    ├── FOVService.ts
    ├── FOVService.shadowcasting.test.ts  # Algorithm tests
    ├── FOVService.blocking.test.ts       # Vision blocking tests
    └── FOVService.radius.test.ts         # Radius calculation tests

src/commands/
└── MoveCommand/
    ├── MoveCommand.ts
    ├── MoveCommand.movement.test.ts   # Basic movement tests
    ├── MoveCommand.collision.test.ts  # Wall/monster collision tests
    └── MoveCommand.fov.test.ts        # FOV update tests
```

### Service Testing Pattern

**File**: `src/services/ServiceName/ServiceName.scenario.test.ts`

```typescript
describe('ServiceName - Scenario Description', () => {
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

  test('edge case is handled', () => {
    // Test edge cases
  })
})
```

### Command Testing Pattern

**File**: `src/commands/CommandName/CommandName.scenario.test.ts`

```typescript
describe('CommandName - Scenario Description', () => {
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

  test('handles error conditions', () => {
    // Test error handling
  })
})
```

### Import Path Updates

With this structure, imports change:
```typescript
// Old structure
import { RandomService } from '@services/RandomService'

// New structure (same! TypeScript resolves directory index)
import { RandomService } from '@services/RandomService'
// or explicitly:
import { RandomService } from '@services/RandomService/RandomService'
```

Configure in `tsconfig.json` and `jest.config.js` to support directory imports.

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

