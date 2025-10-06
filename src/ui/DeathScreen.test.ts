import { DeathScreen } from './DeathScreen'
import { ComprehensiveDeathStats } from '@services/DeathService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { ScoreCalculationService } from '@services/ScoreCalculationService'
import { GameState } from '@game/core/core'

describe('DeathScreen', () => {
  let screen: DeathScreen
  let leaderboardService: LeaderboardService
  let leaderboardStorageService: LeaderboardStorageService
  let scoreCalculationService: ScoreCalculationService

  beforeEach(() => {
    leaderboardService = new LeaderboardService()
    leaderboardStorageService = new LeaderboardStorageService()
    scoreCalculationService = new ScoreCalculationService()
    screen = new DeathScreen(leaderboardService, leaderboardStorageService, scoreCalculationService)
    // Clean up any existing modals
    document.body.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    screen.hide()
    document.body.innerHTML = ''
    localStorage.clear()
  })

  function createDeathStats(overrides: Partial<ComprehensiveDeathStats> = {}): ComprehensiveDeathStats {
    return {
      cause: 'Killed by Orc',
      finalLevel: 5,
      totalGold: 250,
      totalXP: 1000,
      totalTurns: 500,
      deepestLevel: 5,
      levelsExplored: 5,
      monstersKilled: 10,
      itemsFound: 15,
      itemsUsed: 8,
      achievements: [],
      seed: 'test-seed',
      gameId: 'test-game',
      timestamp: Date.now(),
      ...overrides,
    }
  }

  function createTestState(overrides?: Partial<GameState>): GameState {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 0,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 5,
        xp: 1000,
        gold: 250,
        hunger: 0,
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
      currentLevel: 5,
      levels: new Map(),
      visibleCells: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      messages: [],
      turnCount: 500,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: true,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      monstersKilled: 10,
      itemsFound: 15,
      itemsUsed: 8,
      levelsExplored: 5,
      ...overrides,
    } as GameState
  }

  test('displays death title', () => {
    const stats = createDeathStats()
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    const title = document.querySelector('.death-title')
    expect(title?.textContent).toContain('GAME OVER')
  })

  test('displays "You have died" message', () => {
    const stats = createDeathStats()
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    const title = document.querySelector('.death-title')
    expect(title?.textContent).toContain('You have died')
  })

  test('displays death cause', () => {
    const stats = createDeathStats({ cause: 'Killed by Orc' })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    const cause = document.querySelector('.death-cause')
    expect(cause?.textContent).toContain('Killed by Orc')
  })

  test('displays starvation death cause', () => {
    const stats = createDeathStats({ cause: 'Died of starvation' })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Died of starvation')
  })

  test('displays character level', () => {
    const stats = createDeathStats({ finalLevel: 8 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Level: 8')
  })

  test('displays total gold', () => {
    const stats = createDeathStats({ totalGold: 567 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Gold: 567')
  })

  test('displays experience points', () => {
    const stats = createDeathStats({ totalXP: 2500 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('XP: 2,500')
  })

  test('displays deepest level reached', () => {
    const stats = createDeathStats({ deepestLevel: 7 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Deepest: 7')
  })

  test('displays total turns', () => {
    const stats = createDeathStats({ totalTurns: 1500 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Turns: 1,500')
  })

  test('displays seed', () => {
    const stats = createDeathStats({ seed: 'death-seed-123' })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Seed: death-seed-123')
  })

  test('displays permadeath message', () => {
    const stats = createDeathStats()
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Permadeath')
    expect(document.body.textContent).toContain('save has been deleted')
  })

  test('displays "Press [N] for New Game" instruction', () => {
    const stats = createDeathStats()
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('[N] New Game')
  })

  test('calls onNewGame when N key pressed', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), createTestState(), callback, jest.fn(), jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('calls onNewGame when uppercase N pressed', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), createTestState(), callback, jest.fn(), jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'N' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('hides screen when N key pressed', () => {
    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(screen.isVisible()).toBe(false)
  })

  test('isVisible returns true when shown', () => {
    expect(screen.isVisible()).toBe(false)

    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(screen.isVisible()).toBe(true)
  })

  test('isVisible returns false after hide', () => {
    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    screen.hide()

    expect(screen.isVisible()).toBe(false)
  })

  test('does not call callback for other keys', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), createTestState(), callback, jest.fn(), jest.fn())

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(callback).not.toHaveBeenCalled()
  })

  test('creates modal with death-modal class', () => {
    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())

    const modal = document.querySelector('.death-modal')
    expect(modal).not.toBeNull()
  })

  test('creates overlay with modal-overlay class', () => {
    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())

    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
  })

  test('removes modal from DOM when hidden', () => {
    screen.show(createDeathStats(), createTestState(), jest.fn(), jest.fn(), jest.fn())
    const modalBefore = document.querySelector('.death-modal')
    expect(modalBefore).not.toBeNull()

    screen.hide()

    const modalAfter = document.querySelector('.death-modal')
    expect(modalAfter).toBeNull()
  })

  test('displays unknown cause as fallback', () => {
    const stats = createDeathStats({ cause: 'Unknown cause' })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Unknown cause')
  })

  test('creates and stores leaderboard entry on death', () => {
    const stats = createDeathStats({ totalGold: 250, finalLevel: 5, totalXP: 1000, totalTurns: 500 })
    const state = createTestState()

    screen.show(stats, state, jest.fn(), jest.fn(), jest.fn())

    const entries = leaderboardStorageService.getAllEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].isVictory).toBe(false)
    expect(entries[0].deathCause).toBe('Killed by Orc')
  })

  test('displays rank with skull badge for deaths below top 3', () => {
    // Add three higher-scoring entries
    for (let i = 1; i <= 3; i++) {
      const state = createTestState({ gameId: `game-${i}`, player: { ...createTestState().player, gold: 1000 * (4 - i) } })
      const entry = leaderboardService.createEntry(state, false, 10000 * (4 - i), createDeathStats({ totalGold: 1000 * (4 - i) }))
      leaderboardStorageService.addEntry(entry)
    }

    // Show death with 4th place score
    const stats = createDeathStats({ totalGold: 100 })
    screen.show(stats, createTestState({ gameId: 'game-4' }), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('💀')
    expect(document.body.textContent).toContain('Rank #4')
  })

  test('displays rank with gold medal badge for highest-scoring death', () => {
    const stats = createDeathStats({ totalGold: 500, finalLevel: 8, totalXP: 3000 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('🥇')
    expect(document.body.textContent).toContain('Rank #1')
  })

  test('displays rank with silver medal badge for 2nd place death', () => {
    // Add a higher-scoring entry first
    const higherState = createTestState({ gameId: 'game-1', player: { ...createTestState().player, gold: 1000 } })
    const higherEntry = leaderboardService.createEntry(higherState, false, 15000, createDeathStats({ totalGold: 1000 }))
    leaderboardStorageService.addEntry(higherEntry)

    // Now show death with lower score
    const stats = createDeathStats({ totalGold: 250, finalLevel: 5 })
    screen.show(stats, createTestState({ gameId: 'game-2' }), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('🥈')
    expect(document.body.textContent).toContain('Rank #2')
  })

  test('displays rank with bronze medal badge for 3rd place death', () => {
    // Add two higher-scoring entries first
    const state1 = createTestState({ gameId: 'game-1', player: { ...createTestState().player, gold: 1000 } })
    const entry1 = leaderboardService.createEntry(state1, false, 20000, createDeathStats({ totalGold: 1000 }))
    leaderboardStorageService.addEntry(entry1)

    const state2 = createTestState({ gameId: 'game-2', player: { ...createTestState().player, gold: 500 } })
    const entry2 = leaderboardService.createEntry(state2, false, 10000, createDeathStats({ totalGold: 500 }))
    leaderboardStorageService.addEntry(entry2)

    // Now show death with lower score
    const stats = createDeathStats({ totalGold: 250, finalLevel: 5 })
    screen.show(stats, createTestState({ gameId: 'game-3' }), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('🥉')
    expect(document.body.textContent).toContain('Rank #3')
  })

  test('displays percentile information', () => {
    const stats = createDeathStats({ totalGold: 250 })
    screen.show(stats, createTestState(), jest.fn(), jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('Top')
    expect(document.body.textContent).toContain('%')
  })

  test('calculates correct score for death entry', () => {
    const stats = createDeathStats({ totalGold: 100, finalLevel: 5, totalXP: 500, totalTurns: 200 })
    const state = createTestState()

    screen.show(stats, state, jest.fn(), jest.fn(), jest.fn())

    const entries = leaderboardStorageService.getAllEntries()
    // Score = (100 * 10) + (5 * 100) + (500 * 5) - (200 / 10) = 1000 + 500 + 2500 - 20 = 3980
    expect(entries[0].score).toBe(3980)
  })
})
