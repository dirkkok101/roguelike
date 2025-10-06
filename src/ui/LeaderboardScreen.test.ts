import { LeaderboardScreen } from './LeaderboardScreen'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { GameState } from '@game/core/core'

describe('LeaderboardScreen', () => {
  let screen: LeaderboardScreen
  let leaderboardService: LeaderboardService
  let leaderboardStorageService: LeaderboardStorageService

  beforeEach(() => {
    leaderboardService = new LeaderboardService()
    leaderboardStorageService = new LeaderboardStorageService()
    screen = new LeaderboardScreen(leaderboardService, leaderboardStorageService)
    document.body.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    screen.hide()
    document.body.innerHTML = ''
    localStorage.clear()
  })

  function createTestState(overrides?: Partial<GameState>): GameState {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
        level: 5,
        xp: 1000,
        gold: 250,
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
      currentLevel: 5,
      levels: new Map(),
      visibleCells: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      messages: [],
      turnCount: 500,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
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

  describe('rendering', () => {
    test('displays leaderboard title', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('LEADERBOARD')
    })

    test('creates modal with leaderboard-modal class', () => {
      screen.show(jest.fn())

      const modal = document.querySelector('.leaderboard-modal')
      expect(modal).not.toBeNull()
    })

    test('creates overlay with modal-overlay class', () => {
      screen.show(jest.fn())

      const overlay = document.querySelector('.modal-overlay')
      expect(overlay).not.toBeNull()
    })

    test('displays empty state when no entries', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('No entries found')
    })

    test('displays entry count in title', () => {
      // Add some entries
      for (let i = 0; i < 5; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      expect(document.body.textContent).toContain('5 total runs')
    })
  })

  describe('tab switching', () => {
    beforeEach(() => {
      // Add mixed entries
      for (let i = 0; i < 3; i++) {
        const victoryState = createTestState({ gameId: `victory-${i}` })
        const victoryEntry = leaderboardService.createEntry(victoryState, true, 5000 + i * 1000)
        leaderboardStorageService.addEntry(victoryEntry)
      }

      for (let i = 0; i < 4; i++) {
        const deathState = createTestState({ gameId: `death-${i}` })
        const deathEntry = leaderboardService.createEntry(deathState, false, 1000 + i * 500)
        leaderboardStorageService.addEntry(deathEntry)
      }
    })

    test('displays all entries in "All" tab by default', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('All (7)')
    })

    test('switches to victories tab with keyboard shortcut', () => {
      screen.show(jest.fn())

      const event = new KeyboardEvent('keydown', { key: '2' })
      document.dispatchEvent(event)

      expect(document.body.textContent).toContain('Victories (3)')
    })

    test('switches to deaths tab with keyboard shortcut', () => {
      screen.show(jest.fn())

      const event = new KeyboardEvent('keydown', { key: '3' })
      document.dispatchEvent(event)

      expect(document.body.textContent).toContain('Deaths (4)')
    })

    test('filters entries by victories tab', () => {
      screen.show(jest.fn())

      const event = new KeyboardEvent('keydown', { key: '2' })
      document.dispatchEvent(event)

      const victoryCount = (document.body.textContent?.match(/✓ Victory/g) || []).length
      expect(victoryCount).toBe(3)
    })

    test('filters entries by deaths tab', () => {
      screen.show(jest.fn())

      const event = new KeyboardEvent('keydown', { key: '3' })
      document.dispatchEvent(event)

      const deathCount = (document.body.textContent?.match(/✗ Death/g) || []).length
      expect(deathCount).toBe(4)
    })
  })

  describe('sorting', () => {
    beforeEach(() => {
      // Add entries with different values
      const entries = [
        { gameId: 'game-1', score: 5000, level: 8, turns: 1000 },
        { gameId: 'game-2', score: 3000, level: 10, turns: 500 },
        { gameId: 'game-3', score: 7000, level: 6, turns: 1500 },
      ]

      entries.forEach(({ gameId, score, level, turns }) => {
        const state = createTestState({
          gameId,
          player: { ...createTestState().player, level },
          turnCount: turns,
        })
        const entry = leaderboardService.createEntry(state, true, score)
        leaderboardStorageService.addEntry(entry)
      })
    })

    test('sorts by score descending by default', () => {
      screen.show(jest.fn())

      const text = document.body.textContent || ''

      // Highest score (7,000) should appear before lowest score (3,000) in text
      const index7000 = text.indexOf('7,000')
      const index3000 = text.indexOf('3,000')

      expect(index7000).toBeGreaterThan(0)
      expect(index3000).toBeGreaterThan(0)
      expect(index7000).toBeLessThan(index3000)
    })

    test('displays sort indicator on active column', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('▼')
    })
  })

  describe('pagination', () => {
    test('paginates entries when more than 25', () => {
      // Add 30 entries
      for (let i = 0; i < 30; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      expect(document.body.textContent).toContain('Page 1 of 2')
      expect(document.body.textContent).toContain('1-25 of 30')
    })

    test('navigates to next page with arrow key', () => {
      // Add 30 entries
      for (let i = 0; i < 30; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      document.dispatchEvent(event)

      expect(document.body.textContent).toContain('Page 2 of 2')
      expect(document.body.textContent).toContain('26-30 of 30')
    })

    test('navigates to previous page with arrow key', () => {
      // Add 30 entries
      for (let i = 0; i < 30; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      // Go to page 2
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(document.body.textContent).toContain('Page 2 of 2')

      // Go back to page 1
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(document.body.textContent).toContain('Page 1 of 2')
    })

    test('does not show pagination for single page', () => {
      // Add only 10 entries
      for (let i = 0; i < 10; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      // Check specifically for pagination text "Page X of Y" (not the filter control "Per Page")
      expect(document.body.textContent).not.toMatch(/Page \d+ of \d+/)
    })
  })

  describe('keyboard controls', () => {
    test('closes modal with ESC key', () => {
      const callback = jest.fn()
      screen.show(callback)
      expect(screen.isVisible()).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(screen.isVisible()).toBe(false)
      expect(callback).toHaveBeenCalled()
    })

    test('closes modal with Q key', () => {
      const callback = jest.fn()
      screen.show(callback)
      expect(screen.isVisible()).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'q' })
      document.dispatchEvent(event)

      expect(screen.isVisible()).toBe(false)
      expect(callback).toHaveBeenCalled()
    })

    test('displays keyboard shortcuts in footer', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('[1] All')
      expect(document.body.textContent).toContain('[2] Victories')
      expect(document.body.textContent).toContain('[3] Deaths')
      expect(document.body.textContent).toContain('[ESC] Close')
    })
  })

  describe('visual elements', () => {
    test('displays medal badges for top 3 ranks', () => {
      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (5 - i))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      expect(document.body.textContent).toContain('🥇')
      expect(document.body.textContent).toContain('🥈')
      expect(document.body.textContent).toContain('🥉')
    })

    test('displays trophy emoji in title', () => {
      screen.show(jest.fn())

      expect(document.body.textContent).toContain('🏆')
    })

    test('shows ASCII borders around table', () => {
      // Add an entry so table renders
      const state = createTestState()
      const entry = leaderboardService.createEntry(state, true, 5000)
      leaderboardStorageService.addEntry(entry)

      screen.show(jest.fn())

      expect(document.body.textContent).toContain('┌')
      expect(document.body.textContent).toContain('└')
    })
  })

  describe('empty states', () => {
    test('shows empty message for victories tab when no victories', () => {
      // Add only deaths
      const state = createTestState()
      const entry = leaderboardService.createEntry(state, false, 1000)
      leaderboardStorageService.addEntry(entry)

      screen.show(jest.fn())

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))

      expect(document.body.textContent).toContain('Win your first game!')
    })

    test('shows empty message for deaths tab when no deaths', () => {
      // Add only victories
      const state = createTestState()
      const entry = leaderboardService.createEntry(state, true, 5000)
      leaderboardStorageService.addEntry(entry)

      screen.show(jest.fn())

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))

      expect(document.body.textContent).toContain('No deaths yet...')
    })
  })

  describe('visibility', () => {
    test('isVisible returns true when shown', () => {
      expect(screen.isVisible()).toBe(false)

      screen.show(jest.fn())

      expect(screen.isVisible()).toBe(true)
    })

    test('isVisible returns false after hide', () => {
      screen.show(jest.fn())
      expect(screen.isVisible()).toBe(true)

      screen.hide()

      expect(screen.isVisible()).toBe(false)
    })

    test('removes modal from DOM when hidden', () => {
      screen.show(jest.fn())
      const modalBefore = document.querySelector('.leaderboard-modal')
      expect(modalBefore).not.toBeNull()

      screen.hide()

      const modalAfter = document.querySelector('.leaderboard-modal')
      expect(modalAfter).toBeNull()
    })
  })

  describe('filter controls', () => {
    test('displays date range filter dropdown', () => {
      screen.show(jest.fn())

      const dateRangeFilter = document.querySelector('.date-range-filter')
      expect(dateRangeFilter).not.toBeNull()
      expect(document.body.textContent).toContain('Time Period')
    })

    test('displays entries per page filter dropdown', () => {
      screen.show(jest.fn())

      const entriesPerPageFilter = document.querySelector('.entries-per-page-filter')
      expect(entriesPerPageFilter).not.toBeNull()
      expect(document.body.textContent).toContain('Per Page')
    })

    test('filters entries by date range (7 days)', () => {
      const now = Date.now()
      const sixDaysAgo = now - (6 * 24 * 60 * 60 * 1000)
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

      // Add recent entry
      const recentState = createTestState({ gameId: 'recent' })
      const recentEntry = leaderboardService.createEntry(recentState, true, 5000)
      recentEntry.timestamp = sixDaysAgo
      leaderboardStorageService.addEntry(recentEntry)

      // Add old entry
      const oldState = createTestState({ gameId: 'old' })
      const oldEntry = leaderboardService.createEntry(oldState, true, 3000)
      oldEntry.timestamp = eightDaysAgo
      leaderboardStorageService.addEntry(oldEntry)

      screen.show(jest.fn())

      // Change filter to 7 days
      const dateRangeFilter = document.querySelector('.date-range-filter') as HTMLSelectElement
      dateRangeFilter.value = '7days'
      dateRangeFilter.dispatchEvent(new Event('change'))

      // Should only show 1 entry (recent one)
      expect(document.body.textContent).toContain('1 total runs')
    })

    test('changes entries per page when filter changed', () => {
      // Add 30 entries
      for (let i = 0; i < 30; i++) {
        const state = createTestState({ gameId: `game-${i}` })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      }

      screen.show(jest.fn())

      // Initially 25 per page (showing Page 1 of 2)
      expect(document.body.textContent).toContain('Page 1 of 2')
      expect(document.body.textContent).toContain('1-25 of 30')

      // Change to 50 per page
      const entriesPerPageFilter = document.querySelector('.entries-per-page-filter') as HTMLSelectElement
      entriesPerPageFilter.value = '50'
      entriesPerPageFilter.dispatchEvent(new Event('change'))

      // Should now show all on one page
      expect(document.body.textContent).not.toMatch(/Page \d+ of \d+/)
    })

    test('persists preferences to localStorage', () => {
      screen.show(jest.fn())

      // Change date range
      const dateRangeFilter = document.querySelector('.date-range-filter') as HTMLSelectElement
      dateRangeFilter.value = '30days'
      dateRangeFilter.dispatchEvent(new Event('change'))

      // Change entries per page
      const entriesPerPageFilter = document.querySelector('.entries-per-page-filter') as HTMLSelectElement
      entriesPerPageFilter.value = '50'
      entriesPerPageFilter.dispatchEvent(new Event('change'))

      // Check localStorage
      const saved = localStorage.getItem('leaderboard_preferences')
      expect(saved).not.toBeNull()

      const preferences = JSON.parse(saved!)
      expect(preferences.dateRange).toBe('30days')
      expect(preferences.entriesPerPage).toBe(50)
    })

    test('loads preferences from localStorage on initialization', () => {
      // Set preferences in localStorage
      localStorage.setItem(
        'leaderboard_preferences',
        JSON.stringify({ dateRange: '90days', entriesPerPage: 100 })
      )

      // Create new screen instance
      const newScreen = new LeaderboardScreen(leaderboardService, leaderboardStorageService)
      newScreen.show(jest.fn())

      // Check that preferences were loaded
      const dateRangeFilter = document.querySelector('.date-range-filter') as HTMLSelectElement
      const entriesPerPageFilter = document.querySelector('.entries-per-page-filter') as HTMLSelectElement

      expect(dateRangeFilter.value).toBe('90days')
      expect(entriesPerPageFilter.value).toBe('100')

      newScreen.hide()
    })
  })

  describe('seed-based view', () => {
    test('displays view mode toggle buttons', () => {
      screen.show(jest.fn())

      const allRunsButton = document.querySelector('[data-mode="entries"]')
      const bySeedButton = document.querySelector('[data-mode="seeds"]')

      expect(allRunsButton).not.toBeNull()
      expect(bySeedButton).not.toBeNull()
      expect(allRunsButton?.textContent).toContain('All Runs')
      expect(bySeedButton?.textContent).toContain('By Seed')
    })

    test('switches to seed-based view when toggle clicked', () => {
      // Add entries with different seeds
      const seeds = ['seed-1', 'seed-1', 'seed-2', 'seed-2', 'seed-3']
      seeds.forEach((seed, i) => {
        const state = createTestState({ gameId: `game-${i}`, seed })
        const entry = leaderboardService.createEntry(state, true, 1000 * (i + 1))
        leaderboardStorageService.addEntry(entry)
      })

      screen.show(jest.fn())

      const bySeedButton = document.querySelector('[data-mode="seeds"]') as HTMLButtonElement
      bySeedButton.click()

      // Should show 3 unique seeds
      expect(document.body.textContent).toContain('3 unique seeds')
    })

    test('groups entries by seed correctly', () => {
      // Add multiple entries for same seeds
      const entries = [
        { seed: 'seed-alpha', score: 5000 },
        { seed: 'seed-alpha', score: 3000 },
        { seed: 'seed-beta', score: 4000 },
      ]

      entries.forEach((data, i) => {
        const state = createTestState({ gameId: `game-${i}`, seed: data.seed })
        const entry = leaderboardService.createEntry(state, true, data.score)
        leaderboardStorageService.addEntry(entry)
      })

      screen.show(jest.fn())

      const bySeedButton = document.querySelector('[data-mode="seeds"]') as HTMLButtonElement
      bySeedButton.click()

      // Should show seed-alpha with best score 5,000 (2 runs)
      // Should show seed-beta with best score 4,000 (1 run)
      expect(document.body.textContent).toContain('5,000')
      expect(document.body.textContent).toContain('4,000')
      expect(document.body.textContent).toContain('seed-alpha')
      expect(document.body.textContent).toContain('seed-beta')
    })

    test('displays seed statistics (runs, victories, defeats)', () => {
      // Add mixed results for same seed
      const victoryState = createTestState({ gameId: 'game-1', seed: 'test-seed' })
      const victoryEntry = leaderboardService.createEntry(victoryState, true, 5000)
      leaderboardStorageService.addEntry(victoryEntry)

      const deathState = createTestState({ gameId: 'game-2', seed: 'test-seed' })
      const deathEntry = leaderboardService.createEntry(deathState, false, 3000)
      leaderboardStorageService.addEntry(deathEntry)

      screen.show(jest.fn())

      const bySeedButton = document.querySelector('[data-mode="seeds"]') as HTMLButtonElement
      bySeedButton.click()

      // Should show 2 runs, 1 victory (50%), 1 in defeats column
      expect(document.body.textContent).toMatch(/2/i) // 2 runs
      expect(document.body.textContent).toMatch(/1.*\(50%\)/i) // 1 victory at 50%
      expect(document.body.textContent).toContain('Defeats') // Defeats column header
    })

    test('saves view mode preference to localStorage', () => {
      screen.show(jest.fn())

      const bySeedButton = document.querySelector('[data-mode="seeds"]') as HTMLButtonElement
      bySeedButton.click()

      const saved = localStorage.getItem('leaderboard_preferences')
      const preferences = JSON.parse(saved!)

      expect(preferences.viewMode).toBe('seeds')
    })

    test('loads view mode preference from localStorage', () => {
      localStorage.setItem(
        'leaderboard_preferences',
        JSON.stringify({ dateRange: 'all', entriesPerPage: 25, viewMode: 'seeds' })
      )

      const newScreen = new LeaderboardScreen(leaderboardService, leaderboardStorageService)

      // Add some entries
      const state = createTestState({ gameId: 'game-1', seed: 'test-seed' })
      const entry = leaderboardService.createEntry(state, true, 5000)
      leaderboardStorageService.addEntry(entry)

      newScreen.show(jest.fn())

      // Should load in seed view mode
      expect(document.body.textContent).toContain('unique seeds')

      newScreen.hide()
    })
  })
})
