import { LeaderboardEntry, LeaderboardFilters, DEFAULT_LEADERBOARD_FILTERS } from '@game/core/core'
import { LeaderboardService, SeedGroup } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { PreferencesService } from '@services/PreferencesService'
import { EntryDetailsModal } from './EntryDetailsModal'

// ============================================================================
// LEADERBOARD SCREEN - Display leaderboard modal with sorting and filtering
// ============================================================================

type TabType = 'all' | 'victories' | 'deaths'
type SortColumn = 'rank' | 'score' | 'level' | 'turns' | 'date'
type DateRange = 'all' | '7days' | '30days' | '90days'
type ViewMode = 'entries' | 'seeds'

interface LeaderboardPreferences {
  entriesPerPage: number
  dateRange: DateRange
  viewMode: ViewMode
}

const DEFAULT_PREFERENCES: LeaderboardPreferences = {
  entriesPerPage: 25,
  dateRange: 'all',
  viewMode: 'entries',
}

const PREFERENCES_KEY = 'leaderboard_preferences'

export class LeaderboardScreen {
  private container: HTMLDivElement | null = null
  private leaderboardService: LeaderboardService
  private leaderboardStorageService: LeaderboardStorageService
  private preferencesService: PreferencesService
  private entryDetailsModal: EntryDetailsModal
  private currentTab: TabType = 'all'
  private currentPage = 0
  private sortColumn: SortColumn = 'rank'
  private sortAscending = false
  private entriesPerPage = 25
  private dateRange: DateRange = 'all'
  private viewMode: ViewMode = 'entries'
  private expandedSeed: string | null = null
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(
    leaderboardService: LeaderboardService,
    leaderboardStorageService: LeaderboardStorageService,
    preferencesService: PreferencesService
  ) {
    this.leaderboardService = leaderboardService
    this.leaderboardStorageService = leaderboardStorageService
    this.preferencesService = preferencesService
    this.entryDetailsModal = new EntryDetailsModal()

    // Load preferences from PreferencesService
    this.loadPreferences()
  }

  private loadPreferences(): void {
    const saved = this.preferencesService.load<LeaderboardPreferences>(PREFERENCES_KEY)
    if (saved) {
      this.entriesPerPage = saved.entriesPerPage || DEFAULT_PREFERENCES.entriesPerPage
      this.dateRange = saved.dateRange || DEFAULT_PREFERENCES.dateRange
      this.viewMode = saved.viewMode || DEFAULT_PREFERENCES.viewMode
    }
  }

  private savePreferences(): void {
    const preferences: LeaderboardPreferences = {
      entriesPerPage: this.entriesPerPage,
      dateRange: this.dateRange,
      viewMode: this.viewMode,
    }
    this.preferencesService.save(PREFERENCES_KEY, preferences)
  }

  /**
   * Display leaderboard screen
   */
  show(onClose: () => void): void {
    this.currentTab = 'all'
    this.currentPage = 0
    this.sortColumn = 'rank'
    this.sortAscending = false

    this.container = this.createLeaderboardModal(onClose)
    document.body.appendChild(this.container)
  }

  /**
   * Hide and cleanup
   */
  hide(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }

    // Clean up event listener to prevent memory leak
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }
  }

  private createLeaderboardModal(onClose: () => void): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease-in;
    `

    const modal = document.createElement('div')
    modal.className = 'modal-content leaderboard-modal'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #FFD700;
      padding: 30px;
      min-width: 900px;
      max-width: 1200px;
      max-height: 90vh;
      overflow-y: auto;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    // Render initial content
    this.renderModalContent(modal, onClose)

    // Handle keyboard input - store handler for cleanup
    this.keydownHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Close modal
      if (key === 'escape' || key === 'q') {
        if (this.keydownHandler) {
          document.removeEventListener('keydown', this.keydownHandler)
          this.keydownHandler = null
        }
        this.hide()
        onClose()
        return
      }

      // Tab switching
      if (key === '1') {
        this.switchTab('all', modal, onClose)
      } else if (key === '2') {
        this.switchTab('victories', modal, onClose)
      } else if (key === '3') {
        this.switchTab('deaths', modal, onClose)
      }

      // Pagination
      if (key === 'arrowleft' || key === 'pageup') {
        this.previousPage(modal, onClose)
      } else if (key === 'arrowright' || key === 'pagedown') {
        this.nextPage(modal, onClose)
      }
    }
    document.addEventListener('keydown', this.keydownHandler)

    overlay.appendChild(modal)
    return overlay
  }

  private renderModalContent(modal: HTMLDivElement, onClose: () => void): void {
    // Get all entries and apply filtering using service
    const allEntries = this.leaderboardStorageService.getAllEntries()

    // Filter by outcome (tab)
    const outcomeFiltered = this.leaderboardService.filterByOutcome(
      allEntries,
      this.currentTab
    )

    // Filter by date range
    const dateRangeDays = this.getDateRangeDays()
    const filteredEntries = this.leaderboardService.filterByDateRange(
      outcomeFiltered,
      dateRangeDays
    )

    let content: string
    let totalPages: number
    let itemCount: number

    if (this.viewMode === 'seeds') {
      // Seed-based view - use service to group entries
      const seedGroups = this.leaderboardService.groupEntriesBySeed(filteredEntries)
      totalPages = Math.ceil(seedGroups.length / this.entriesPerPage)
      const startIndex = this.currentPage * this.entriesPerPage
      const endIndex = startIndex + this.entriesPerPage
      const pageSeedGroups = seedGroups.slice(startIndex, endIndex)
      content = this.renderSeedGroupsTable(pageSeedGroups)
      itemCount = seedGroups.length
    } else {
      // Normal entries view - use service to sort entries
      const sortedEntries = this.leaderboardService.sortEntriesByColumn(
        filteredEntries,
        this.sortColumn,
        this.sortAscending
      )
      totalPages = Math.ceil(sortedEntries.length / this.entriesPerPage)
      const startIndex = this.currentPage * this.entriesPerPage
      const endIndex = startIndex + this.entriesPerPage
      const pageEntries = sortedEntries.slice(startIndex, endIndex)
      content = this.renderTable(pageEntries)
      itemCount = sortedEntries.length
    }

    modal.innerHTML = `
      <div class="leaderboard-title" style="margin-bottom: 20px;">
        <div style="font-size: 32px; color: #FFD700; font-weight: bold; letter-spacing: 3px;">
          🏆 LEADERBOARD 🏆
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 5px;">
          ${itemCount} ${this.viewMode === 'seeds' ? 'unique seeds' : 'total runs'}${itemCount !== allEntries.length ? ` (${allEntries.length} all-time runs)` : ''}
        </div>
      </div>

      ${this.renderTabs()}
      ${this.renderFilterControls()}
      ${content}
      ${this.renderPagination(this.currentPage, totalPages, itemCount)}

      <div class="leaderboard-footer" style="margin-top: 20px; border-top: 1px solid #444; padding-top: 15px;">
        <div style="color: #888; font-size: 14px; margin-bottom: 10px;">
          <span style="color: #FFD700;">[1]</span> All |
          <span style="color: #00FF00;">[2]</span> Victories |
          <span style="color: #FF4444;">[3]</span> Deaths
        </div>
        <div style="color: #888; font-size: 14px; margin-bottom: 10px;">
          ${totalPages > 1 ? '<span style="color: #88FF88;">[←][→]</span> Page | ' : ''}
          <span style="color: #00FFFF;">[Click]</span> View Details |
          <span style="color: #FF6666;">[ESC]</span> Close
        </div>
      </div>
    `

    // Add click handlers for column headers (sorting) and entry rows
    this.attachHandlers(modal, onClose)
  }

  private renderTabs(): string {
    const allEntries = this.leaderboardStorageService.getAllEntries()
    const victoryCount = allEntries.filter(e => e.isVictory).length
    const deathCount = allEntries.filter(e => !e.isVictory).length

    const tabs = [
      { id: 'all', label: 'All', count: allEntries.length, color: '#FFD700' },
      { id: 'victories', label: 'Victories', count: victoryCount, color: '#00FF00' },
      { id: 'deaths', label: 'Deaths', count: deathCount, color: '#FF4444' },
    ]

    return `
      <div style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;">
        ${tabs.map(tab => {
          const isActive = this.currentTab === tab.id
          return `
            <div
              class="tab-${tab.id}"
              style="
                padding: 10px 20px;
                background: ${isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
                border: 2px solid ${isActive ? tab.color : '#444'};
                color: ${isActive ? tab.color : '#888'};
                cursor: pointer;
                font-weight: ${isActive ? 'bold' : 'normal'};
                border-radius: 4px;
                transition: all 0.2s;
              "
            >
              ${tab.label} (${tab.count})
            </div>
          `
        }).join('')}
      </div>
    `
  }

  private renderFilterControls(): string {
    return `
      <div style="display: flex; gap: 20px; margin-bottom: 20px; justify-content: center; align-items: center; padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px solid #333; border-radius: 4px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="color: #888; font-size: 13px;">View:</label>
          <button class="view-mode-toggle" style="
            background: ${this.viewMode === 'entries' ? '#FFD700' : '#2a2a2a'};
            color: ${this.viewMode === 'entries' ? '#000000' : '#FFFFFF'};
            border: 1px solid ${this.viewMode === 'entries' ? '#FFD700' : '#555'};
            padding: 6px 16px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            cursor: pointer;
            border-radius: 3px;
            font-weight: bold;
            transition: all 0.2s;
          " data-mode="entries">All Runs</button>
          <button class="view-mode-toggle" style="
            background: ${this.viewMode === 'seeds' ? '#FFD700' : '#2a2a2a'};
            color: ${this.viewMode === 'seeds' ? '#000000' : '#FFFFFF'};
            border: 1px solid ${this.viewMode === 'seeds' ? '#FFD700' : '#555'};
            padding: 6px 16px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            cursor: pointer;
            border-radius: 3px;
            font-weight: bold;
            transition: all 0.2s;
          " data-mode="seeds">By Seed</button>
        </div>

        <div style="width: 1px; height: 30px; background: #444;"></div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="color: #888; font-size: 13px;">Time Period:</label>
          <select class="date-range-filter" style="
            background: #2a2a2a;
            color: #FFFFFF;
            border: 1px solid #555;
            padding: 6px 12px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            cursor: pointer;
            border-radius: 3px;
          ">
            <option value="all" ${this.dateRange === 'all' ? 'selected' : ''}>All Time</option>
            <option value="7days" ${this.dateRange === '7days' ? 'selected' : ''}>Last 7 Days</option>
            <option value="30days" ${this.dateRange === '30days' ? 'selected' : ''}>Last 30 Days</option>
            <option value="90days" ${this.dateRange === '90days' ? 'selected' : ''}>Last 90 Days</option>
          </select>
        </div>

        <div style="width: 1px; height: 30px; background: #444;"></div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="color: #888; font-size: 13px;">Per Page:</label>
          <select class="entries-per-page-filter" style="
            background: #2a2a2a;
            color: #FFFFFF;
            border: 1px solid #555;
            padding: 6px 12px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            cursor: pointer;
            border-radius: 3px;
          ">
            <option value="25" ${this.entriesPerPage === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${this.entriesPerPage === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${this.entriesPerPage === 100 ? 'selected' : ''}>100</option>
          </select>
        </div>
      </div>
    `
  }

  private renderSeedGroupsTable(seedGroups: SeedGroup[]): string {
    if (seedGroups.length === 0) {
      return `
        <div style="padding: 60px; color: #888; font-size: 18px;">
          <div style="font-size: 48px; margin-bottom: 20px;">🎲</div>
          <div>No seeds found</div>
          <div style="font-size: 14px; margin-top: 10px;">Play some games to see seed statistics!</div>
        </div>
      `
    }

    return `
      <pre style="color: #CCCCCC; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">┌─────┬──────────┬───────┬─────────┬─────────┬──────────────────┐</pre>
      <div style="display: grid; grid-template-columns: 60px 140px 80px 120px 120px 240px; gap: 5px; margin: 0 10px; font-size: 13px; font-weight: bold; color: #FFD700; padding: 5px 0; border-bottom: 1px solid #444;">
        <div style="text-align: center;">Rank</div>
        <div style="text-align: right;">Best Score</div>
        <div style="text-align: center;">Runs</div>
        <div style="text-align: center;">Victories</div>
        <div style="text-align: center;">Defeats</div>
        <div style="text-align: left;">Seed</div>
      </div>
      ${seedGroups.map((group, index) => this.renderSeedGroupRow(group, index)).join('')}
      <pre style="color: #CCCCCC; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">└─────┴──────────┴───────┴─────────┴─────────┴──────────────────┘</pre>
    `
  }

  private renderSeedGroupRow(group: SeedGroup, index: number): string {
    const rank = (this.currentPage * this.entriesPerPage) + index + 1
    const rankBadge = this.getRankBadge(rank)
    const rowBg = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
    const winRate = ((group.victories / group.totalRuns) * 100).toFixed(0)

    return `
      <div
        class="seed-row"
        data-seed="${group.seed}"
        style="display: grid; grid-template-columns: 60px 140px 80px 120px 120px 240px; gap: 5px; margin: 0 10px; padding: 8px 0; background: ${rowBg}; font-size: 13px; border-bottom: 1px solid #222; cursor: pointer; transition: background 0.2s;"
        onmouseover="this.style.background='rgba(255, 215, 0, 0.1)'"
        onmouseout="this.style.background='${rowBg}'"
      >
        <div style="text-align: center;">${rankBadge} ${rank}</div>
        <div style="text-align: right; color: #FFD700; font-weight: bold;">${group.bestScore.toLocaleString()}</div>
        <div style="text-align: center; color: #00FFFF;">${group.totalRuns}</div>
        <div style="text-align: center; color: #00FF00;">${group.victories} (${winRate}%)</div>
        <div style="text-align: center; color: #FF6666;">${group.defeats}</div>
        <div style="text-align: left; color: #FFAA00; font-size: 11px;">${group.seed}</div>
      </div>
    `
  }

  private renderTable(entries: LeaderboardEntry[]): string {
    if (entries.length === 0) {
      return `
        <div style="padding: 60px; color: #888; font-size: 18px;">
          <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
          <div>No entries found</div>
          <div style="font-size: 14px; margin-top: 10px;">
            ${this.currentTab === 'victories' ? 'Win your first game!' :
              this.currentTab === 'deaths' ? 'No deaths yet...' :
              'Start playing to see your stats!'}
          </div>
        </div>
      `
    }

    const getSortIndicator = (column: SortColumn) => {
      if (this.sortColumn !== column) return ''
      return this.sortAscending ? ' ▲' : ' ▼'
    }

    return `
      <pre style="color: #CCCCCC; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">┌─────┬──────────┬───────┬────────┬─────────┬──────────────┐</pre>
      <div style="display: grid; grid-template-columns: 60px 140px 80px 100px 120px 180px; gap: 5px; margin: 0 10px; font-size: 13px; font-weight: bold; color: #FFD700; padding: 5px 0; border-bottom: 1px solid #444;">
        <div class="sort-rank" style="cursor: pointer; text-align: center;">Rank${getSortIndicator('rank')}</div>
        <div class="sort-score" style="cursor: pointer; text-align: right;">Score${getSortIndicator('score')}</div>
        <div class="sort-level" style="cursor: pointer; text-align: center;">Level${getSortIndicator('level')}</div>
        <div class="sort-turns" style="cursor: pointer; text-align: right;">Turns${getSortIndicator('turns')}</div>
        <div style="text-align: center;">Outcome</div>
        <div class="sort-date" style="cursor: pointer; text-align: left;">Date${getSortIndicator('date')}</div>
      </div>
      ${entries.map((entry, index) => this.renderTableRow(entry, index)).join('')}
      <pre style="color: #CCCCCC; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">└─────┴──────────┴───────┴────────┴─────────┴──────────────┘</pre>
    `
  }

  private renderTableRow(entry: LeaderboardEntry, index: number): string {
    const rank = (this.currentPage * this.entriesPerPage) + index + 1
    const rankBadge = this.getRankBadge(rank)
    const outcomeColor = entry.isVictory ? '#00FF00' : '#FF6666'
    const outcomeText = entry.isVictory ? '✓ Victory' : '✗ Death'
    const date = new Date(entry.timestamp).toLocaleDateString()

    const rowBg = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'

    return `
      <div
        class="entry-row"
        data-entry-id="${entry.id}"
        style="display: grid; grid-template-columns: 60px 140px 80px 100px 120px 180px; gap: 5px; margin: 0 10px; padding: 8px 0; background: ${rowBg}; font-size: 13px; border-bottom: 1px solid #222; cursor: pointer; transition: background 0.2s;"
        onmouseover="this.style.background='rgba(255, 215, 0, 0.1)'"
        onmouseout="this.style.background='${rowBg}'"
      >
        <div style="text-align: center;">${rankBadge} ${rank}</div>
        <div style="text-align: right; color: #FFD700; font-weight: bold;">${entry.score.toLocaleString()}</div>
        <div style="text-align: center; color: #00FFFF;">${entry.finalLevel}</div>
        <div style="text-align: right; color: #888;">${entry.totalTurns.toLocaleString()}</div>
        <div style="text-align: center; color: ${outcomeColor};">${outcomeText}</div>
        <div style="text-align: left; color: #888; font-size: 12px;">${date}</div>
      </div>
    `
  }

  private renderPagination(currentPage: number, totalPages: number, totalEntries: number): string {
    if (totalPages <= 1) return ''

    const startEntry = (currentPage * this.entriesPerPage) + 1
    const endEntry = Math.min((currentPage + 1) * this.entriesPerPage, totalEntries)

    return `
      <div style="margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 20px; color: #888; font-size: 14px;">
        <div style="color: ${currentPage > 0 ? '#00FF00' : '#444'}; cursor: ${currentPage > 0 ? 'pointer' : 'default'};">
          ${currentPage > 0 ? '← Previous' : ''}
        </div>
        <div>
          Page ${currentPage + 1} of ${totalPages}
          <span style="color: #666; margin-left: 10px;">(${startEntry}-${endEntry} of ${totalEntries})</span>
        </div>
        <div style="color: ${currentPage < totalPages - 1 ? '#00FF00' : '#444'}; cursor: ${currentPage < totalPages - 1 ? 'pointer' : 'default'};">
          ${currentPage < totalPages - 1 ? 'Next →' : ''}
        </div>
      </div>
    `
  }

  private getRankBadge(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return ''
    }
  }

  /**
   * Convert DateRange to number of days for service filtering
   * Returns 0 for 'all' (no date filtering)
   */
  private getDateRangeDays(): number {
    const ranges: { [key in DateRange]: number } = {
      'all': 0,
      '7days': 7,
      '30days': 30,
      '90days': 90,
    }
    return ranges[this.dateRange]
  }

  private switchTab(tab: TabType, modal: HTMLDivElement, onClose: () => void): void {
    this.currentTab = tab
    this.currentPage = 0
    this.renderModalContent(modal, onClose)
  }

  private previousPage(modal: HTMLDivElement, onClose: () => void): void {
    if (this.currentPage > 0) {
      this.currentPage--
      this.renderModalContent(modal, onClose)
    }
  }

  private nextPage(modal: HTMLDivElement, onClose: () => void): void {
    const allEntries = this.leaderboardStorageService.getAllEntries()
    const outcomeFiltered = this.leaderboardService.filterByOutcome(allEntries, this.currentTab)
    const dateRangeDays = this.getDateRangeDays()
    const filteredEntries = this.leaderboardService.filterByDateRange(outcomeFiltered, dateRangeDays)
    const totalPages = Math.ceil(filteredEntries.length / this.entriesPerPage)

    if (this.currentPage < totalPages - 1) {
      this.currentPage++
      this.renderModalContent(modal, onClose)
    }
  }

  private attachHandlers(modal: HTMLDivElement, onClose: () => void): void {
    // Sort handlers for column headers
    const sortHandlers: { [key: string]: SortColumn } = {
      'sort-rank': 'rank',
      'sort-score': 'score',
      'sort-level': 'level',
      'sort-turns': 'turns',
      'sort-date': 'date',
    }

    Object.entries(sortHandlers).forEach(([className, column]) => {
      const element = modal.querySelector(`.${className}`)
      if (element) {
        element.addEventListener('click', () => {
          if (this.sortColumn === column) {
            this.sortAscending = !this.sortAscending
          } else {
            this.sortColumn = column
            this.sortAscending = false
          }
          this.renderModalContent(modal, onClose)
        })
      }
    })

    // Tab click handlers
    const tabHandlers: { [key: string]: TabType } = {
      'tab-all': 'all',
      'tab-victories': 'victories',
      'tab-deaths': 'deaths',
    }

    Object.entries(tabHandlers).forEach(([className, tab]) => {
      const element = modal.querySelector(`.${className}`)
      if (element) {
        element.addEventListener('click', () => {
          this.switchTab(tab, modal, onClose)
        })
      }
    })

    // View mode toggle handlers
    const viewModeToggles = modal.querySelectorAll('.view-mode-toggle')
    viewModeToggles.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode') as ViewMode
        if (mode && mode !== this.viewMode) {
          this.viewMode = mode
          this.currentPage = 0 // Reset to first page
          this.savePreferences()
          this.renderModalContent(modal, onClose)
        }
      })
    })

    // Filter control handlers
    const dateRangeFilter = modal.querySelector('.date-range-filter') as HTMLSelectElement
    if (dateRangeFilter) {
      dateRangeFilter.addEventListener('change', () => {
        this.dateRange = dateRangeFilter.value as DateRange
        this.currentPage = 0 // Reset to first page
        this.savePreferences()
        this.renderModalContent(modal, onClose)
      })
    }

    const entriesPerPageFilter = modal.querySelector('.entries-per-page-filter') as HTMLSelectElement
    if (entriesPerPageFilter) {
      entriesPerPageFilter.addEventListener('change', () => {
        this.entriesPerPage = parseInt(entriesPerPageFilter.value, 10)
        this.currentPage = 0 // Reset to first page
        this.savePreferences()
        this.renderModalContent(modal, onClose)
      })
    }

    // Seed row click handlers - show best run for that seed
    const seedRows = modal.querySelectorAll('.seed-row')
    seedRows.forEach(row => {
      row.addEventListener('click', () => {
        const seed = row.getAttribute('data-seed')
        if (seed) {
          // Get all entries for this seed
          const allEntries = this.leaderboardStorageService.getAllEntries()
          const seedEntries = allEntries.filter(e => e.seed === seed)

          // Find best entry (highest score)
          const bestEntry = seedEntries.reduce((best, current) =>
            current.score > best.score ? current : best
          )

          // Show details of best run
          this.showEntryDetails(bestEntry, modal, onClose)
        }
      })
    })

    // Entry row click handlers - open details modal
    const entryRows = modal.querySelectorAll('.entry-row')
    entryRows.forEach(row => {
      row.addEventListener('click', () => {
        const entryId = row.getAttribute('data-entry-id')
        if (entryId) {
          const entry = this.leaderboardStorageService.getEntry(entryId)
          if (entry) {
            this.showEntryDetails(entry, modal, onClose)
          }
        }
      })
    })
  }

  private showEntryDetails(entry: LeaderboardEntry, modal: HTMLDivElement, onClose: () => void): void {
    // Hide leaderboard temporarily
    if (this.container) {
      this.container.style.display = 'none'
    }

    // Show entry details modal
    this.entryDetailsModal.show(entry, () => {
      // When details modal closes, show leaderboard again
      if (this.container) {
        this.container.style.display = 'flex'
      }
    })
  }

  isVisible(): boolean {
    return this.container !== null
  }
}
