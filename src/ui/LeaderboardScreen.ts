import { LeaderboardEntry, LeaderboardFilters, DEFAULT_LEADERBOARD_FILTERS } from '@game/core/core'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { EntryDetailsModal } from './EntryDetailsModal'

// ============================================================================
// LEADERBOARD SCREEN - Display leaderboard modal with sorting and filtering
// ============================================================================

type TabType = 'all' | 'victories' | 'deaths'
type SortColumn = 'rank' | 'score' | 'level' | 'turns' | 'date'

export class LeaderboardScreen {
  private container: HTMLDivElement | null = null
  private leaderboardService: LeaderboardService
  private leaderboardStorageService: LeaderboardStorageService
  private entryDetailsModal: EntryDetailsModal
  private currentTab: TabType = 'all'
  private currentPage = 0
  private sortColumn: SortColumn = 'rank'
  private sortAscending = false
  private entriesPerPage = 25

  constructor(
    leaderboardService: LeaderboardService,
    leaderboardStorageService: LeaderboardStorageService
  ) {
    this.leaderboardService = leaderboardService
    this.leaderboardStorageService = leaderboardStorageService
    this.entryDetailsModal = new EntryDetailsModal()
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

    // Handle keyboard input
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Close modal
      if (key === 'escape' || key === 'q') {
        document.removeEventListener('keydown', handleKeyPress)
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
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  private renderModalContent(modal: HTMLDivElement, onClose: () => void): void {
    // Get filtered entries based on current tab
    const allEntries = this.leaderboardStorageService.getAllEntries()
    const filteredEntries = this.filterEntriesByTab(allEntries)
    const sortedEntries = this.sortEntries(filteredEntries)

    // Pagination
    const totalPages = Math.ceil(sortedEntries.length / this.entriesPerPage)
    const startIndex = this.currentPage * this.entriesPerPage
    const endIndex = startIndex + this.entriesPerPage
    const pageEntries = sortedEntries.slice(startIndex, endIndex)

    modal.innerHTML = `
      <div class="leaderboard-title" style="margin-bottom: 20px;">
        <div style="font-size: 32px; color: #FFD700; font-weight: bold; letter-spacing: 3px;">
          🏆 LEADERBOARD 🏆
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 5px;">
          ${allEntries.length} total runs
        </div>
      </div>

      ${this.renderTabs()}
      ${this.renderTable(pageEntries)}
      ${this.renderPagination(this.currentPage, totalPages, sortedEntries.length)}

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
      <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
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

  private filterEntriesByTab(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    switch (this.currentTab) {
      case 'victories':
        return entries.filter(e => e.isVictory)
      case 'deaths':
        return entries.filter(e => !e.isVictory)
      default:
        return entries
    }
  }

  private sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const sorted = [...entries]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (this.sortColumn) {
        case 'rank':
        case 'score':
          comparison = b.score - a.score // Higher score = better rank
          break
        case 'level':
          comparison = b.finalLevel - a.finalLevel
          break
        case 'turns':
          comparison = b.totalTurns - a.totalTurns
          break
        case 'date':
          comparison = b.timestamp - a.timestamp
          break
      }

      return this.sortAscending ? -comparison : comparison
    })

    return sorted
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
    const filteredEntries = this.filterEntriesByTab(allEntries)
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
