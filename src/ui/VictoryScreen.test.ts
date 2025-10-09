import { VictoryScreen } from './VictoryScreen'
import { VictoryStats } from '@services/VictoryService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { GameState } from '@game/core/core'

describe('VictoryScreen', () => {
  let screen: VictoryScreen
  let leaderboardService: LeaderboardService
  let leaderboardStorageService: LeaderboardStorageService

  beforeEach(() => {
    leaderboardService = new LeaderboardService()
    leaderboardStorageService = new LeaderboardStorageService()
    screen = new VictoryScreen(leaderboardService, leaderboardStorageService)
    // Clean up any existing modals
    document.body.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    screen.hide()
    document.body.innerHTML = ''
    localStorage.clear()
  })

  function createVictoryStats(overrides: Partial<VictoryStats> = {}): VictoryStats {
    return {
      finalLevel: 10,
      totalGold: 1000,
      totalXP: 5000,
      totalTurns: 2000,
      deepestLevel: 10,
      finalScore: 50000,
      seed: 'test-seed',
      gameId: 'test-game',
      ...overrides,
    }
  }

  function createTestState(overrides?: Partial<GameState>): GameState {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 10,
        xp: 5000,
        gold: 1000,
        hunger: 500,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
      },
      currentLevel: 10,
      levels: new Map(),
      visibleCells: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      messages: [],
      turnCount: 2000,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: true,
      hasAmulet: true,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      monstersKilled: 45,
      itemsFound: 38,
      itemsUsed: 22,
      levelsExplored: 10,
      ...overrides,
    } as GameState
  }

  test('displays victory title', () => {
    const stats = createVictoryStats()
    screen.show(stats, createTestState(), jest.fn())

    const title = document.querySelector('.victory-title')
    expect(title?.textContent).toContain('VICTORY IS YOURS')
  })

  test('displays "You escaped with the Amulet" message', () => {
    const stats = createVictoryStats()
    screen.show(stats, createTestState(), jest.fn())

    const title = document.querySelector('.victory-title')
    expect(title?.textContent).toContain('You escaped with the Amulet')
  })

  test('displays final score with formatting', () => {
    const stats = createVictoryStats({ finalScore: 50000 })
    screen.show(stats, createTestState(), jest.fn())

    // Accept both comma and space as thousands separator
    expect(document.body.textContent).toMatch(/Final Score: 50[, ]000/)
  })

  test('displays character level', () => {
    const stats = createVictoryStats({ finalLevel: 15 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Character Level: 15')
  })

  test('displays total gold', () => {
    const stats = createVictoryStats({ totalGold: 1234 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Total Gold: 1234')
  })

  test('displays experience points', () => {
    const stats = createVictoryStats({ totalXP: 5678 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Experience: 5678')
  })

  test('displays deepest level reached', () => {
    const stats = createVictoryStats({ deepestLevel: 12 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Deepest Level: 12')
  })

  test('displays total turns', () => {
    const stats = createVictoryStats({ totalTurns: 9000 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Total Turns: 9000')
  })

  test('displays seed', () => {
    const stats = createVictoryStats({ seed: 'custom-seed-123' })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Seed: custom-seed-123')
  })

  test('displays "Press [N] for New Game" instruction', () => {
    const stats = createVictoryStats()
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Press [N] to Continue')
  })

  test('calls onNewGame when N key pressed', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), createTestState(), callback)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('calls onNewGame when uppercase N pressed', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), createTestState(), callback)

    const event = new KeyboardEvent('keydown', { key: 'N' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('hides screen when N key pressed', () => {
    screen.show(createVictoryStats(), createTestState(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(screen.isVisible()).toBe(false)
  })

  test('isVisible returns true when shown', () => {
    expect(screen.isVisible()).toBe(false)

    screen.show(createVictoryStats(), createTestState(), jest.fn())

    expect(screen.isVisible()).toBe(true)
  })

  test('isVisible returns false after hide', () => {
    screen.show(createVictoryStats(), createTestState(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    screen.hide()

    expect(screen.isVisible()).toBe(false)
  })

  test('does not call callback for other keys', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), createTestState(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(callback).not.toHaveBeenCalled()
  })

  test('creates modal with victory-modal class', () => {
    screen.show(createVictoryStats(), createTestState(), jest.fn())

    const modal = document.querySelector('.victory-modal')
    expect(modal).not.toBeNull()
  })

  test('creates overlay with modal-overlay class', () => {
    screen.show(createVictoryStats(), createTestState(), jest.fn())

    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
  })

  test('removes modal from DOM when hidden', () => {
    screen.show(createVictoryStats(), createTestState(), jest.fn())
    const modalBefore = document.querySelector('.victory-modal')
    expect(modalBefore).not.toBeNull()

    screen.hide()

    const modalAfter = document.querySelector('.victory-modal')
    expect(modalAfter).toBeNull()
  })

  test('creates and stores leaderboard entry on victory', () => {
    const stats = createVictoryStats({ finalScore: 75000 })
    const state = createTestState()

    screen.show(stats, state, jest.fn())

    const entries = leaderboardStorageService.getAllEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].isVictory).toBe(true)
    expect(entries[0].score).toBe(75000)
  })

  test('displays rank with gold medal badge for 1st place', () => {
    const stats = createVictoryStats({ finalScore: 100000 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('🥇')
    expect(document.body.textContent).toContain('Rank #1')
  })

  test('displays rank with silver medal badge for 2nd place', () => {
    // Add a higher-scoring entry first
    const higherState = createTestState({ gameId: 'game-1' })
    const higherEntry = leaderboardService.createEntry(higherState, true, 200000)
    leaderboardStorageService.addEntry(higherEntry)

    // Now show victory with lower score
    const stats = createVictoryStats({ finalScore: 100000 })
    screen.show(stats, createTestState({ gameId: 'game-2' }), jest.fn())

    expect(document.body.textContent).toContain('🥈')
    expect(document.body.textContent).toContain('Rank #2')
  })

  test('displays rank with bronze medal badge for 3rd place', () => {
    // Add two higher-scoring entries first
    const state1 = createTestState({ gameId: 'game-1' })
    const entry1 = leaderboardService.createEntry(state1, true, 300000)
    leaderboardStorageService.addEntry(entry1)

    const state2 = createTestState({ gameId: 'game-2' })
    const entry2 = leaderboardService.createEntry(state2, true, 200000)
    leaderboardStorageService.addEntry(entry2)

    // Now show victory with lower score
    const stats = createVictoryStats({ finalScore: 100000 })
    screen.show(stats, createTestState({ gameId: 'game-3' }), jest.fn())

    expect(document.body.textContent).toContain('🥉')
    expect(document.body.textContent).toContain('Rank #3')
  })

  test('displays trophy badge for ranks below 3rd', () => {
    // Add three higher-scoring entries
    for (let i = 1; i <= 3; i++) {
      const state = createTestState({ gameId: `game-${i}` })
      const entry = leaderboardService.createEntry(state, true, 100000 * (4 - i))
      leaderboardStorageService.addEntry(entry)
    }

    // Show victory with 4th place score
    const stats = createVictoryStats({ finalScore: 50000 })
    screen.show(stats, createTestState({ gameId: 'game-4' }), jest.fn())

    expect(document.body.textContent).toContain('🏆')
    expect(document.body.textContent).toContain('Rank #4')
  })

  test('displays percentile information', () => {
    const stats = createVictoryStats({ finalScore: 100000 })
    screen.show(stats, createTestState(), jest.fn())

    expect(document.body.textContent).toContain('Top')
    expect(document.body.textContent).toContain('%')
  })
})
