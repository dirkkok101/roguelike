import { VictoryStats } from '@services/VictoryService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { GameState } from '@game/core/core'

// ============================================================================
// VICTORY SCREEN - Display victory modal with final stats
// ============================================================================

export class VictoryScreen {
  private container: HTMLDivElement | null = null
  private leaderboardService: LeaderboardService
  private leaderboardStorageService: LeaderboardStorageService

  constructor(
    leaderboardService: LeaderboardService,
    leaderboardStorageService: LeaderboardStorageService
  ) {
    this.leaderboardService = leaderboardService
    this.leaderboardStorageService = leaderboardStorageService
  }

  /**
   * Display victory screen with final stats
   * Also creates and stores leaderboard entry
   */
  show(stats: VictoryStats, state: GameState, onNewGame: (characterName: string) => void): void {
    // Create and store leaderboard entry
    const leaderboardEntry = this.leaderboardService.createEntry(
      state,
      true, // isVictory
      stats.finalScore
    )
    this.leaderboardStorageService.addEntry(leaderboardEntry)

    // Calculate rank
    const allEntries = this.leaderboardStorageService.getAllEntries()
    const rankInfo = this.leaderboardService.calculateRank(
      stats.finalScore,
      allEntries
    )

    this.container = this.createVictoryModal(stats, state, rankInfo, onNewGame)
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

  private createVictoryModal(
    stats: VictoryStats,
    state: GameState,
    rankInfo: { rank: number; percentile: number },
    onNewGame: (characterName: string) => void
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease-in;
    `

    // Add keyframes for fade-in animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    document.head.appendChild(style)

    const modal = document.createElement('div')
    modal.className = 'modal-content victory-modal'
    modal.style.cssText = `
      background: #1a1a1a;
      border: 3px solid #FFD700;
      padding: 30px;
      min-width: 500px;
      text-align: center;
      font-family: 'Courier New', monospace;
      color: #FFFFFF;
    `

    // Format rank message
    const rankMessage = this.formatRankMessage(rankInfo)

    modal.innerHTML = `
      <div class="victory-title" style="margin-bottom: 20px;">
        <div style="font-size: 32px; color: #FFD700; font-weight: bold; margin-bottom: 5px; letter-spacing: 3px;">VICTORY IS YOURS!</div>
        <div style="font-size: 20px; color: #FFA500; margin-top: 10px;">You escaped with the Amulet</div>
      </div>

      <div class="victory-stats" style="margin: 20px 0; text-align: left;">
        <div style="color: #00FF00; font-weight: bold; margin-bottom: 10px;">
          Final Score: ${stats.finalScore.toLocaleString()}
        </div>
        ${rankMessage}
        <div style="margin: 5px 0;">Character Level: ${stats.finalLevel}</div>
        <div style="margin: 5px 0;">Total Gold: ${stats.totalGold}</div>
        <div style="margin: 5px 0;">Experience: ${stats.totalXP}</div>
        <div style="margin: 5px 0;">Deepest Level: ${stats.deepestLevel}</div>
        <div style="margin: 5px 0;">Total Turns: ${stats.totalTurns}</div>
        <div style="margin: 5px 0; color: #888;">Seed: ${stats.seed}</div>
      </div>

      <div class="victory-footer" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 20px;">
        <div style="color: #FFD700; margin-bottom: 10px;">
          Press [N] to Continue
        </div>
      </div>
    `

    // Handle keyboard input
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        document.removeEventListener('keydown', handleKeyPress)
        this.hide()
        // Use same character name for new game after victory
        onNewGame(state.characterName)
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    overlay.appendChild(modal)
    return overlay
  }

  isVisible(): boolean {
    return this.container !== null
  }

  /**
   * Format rank message for display
   */
  private formatRankMessage(rankInfo: { rank: number; percentile: number }): string {
    const rankBadge = this.getRankBadge(rankInfo.rank)
    const percentileText = `Top ${Math.round(rankInfo.percentile)}%`

    return `
      <div style="color: #FFD700; font-weight: bold; margin: 10px 0; padding: 8px; background: rgba(255, 215, 0, 0.1); border-left: 3px solid #FFD700;">
        ${rankBadge} Rank #${rankInfo.rank} - ${percentileText}
      </div>
    `
  }

  /**
   * Get badge emoji for top 3 ranks
   */
  private getRankBadge(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return '🏆'
    }
  }
}
