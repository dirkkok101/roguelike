import { EntryDetailsModal } from './EntryDetailsModal'
import { LeaderboardEntry } from '@game/core/core'

describe('EntryDetailsModal', () => {
  let modal: EntryDetailsModal

  beforeEach(() => {
    modal = new EntryDetailsModal()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    modal.hide()
    document.body.innerHTML = ''
  })

  function createTestEntry(overrides?: Partial<LeaderboardEntry>): LeaderboardEntry {
    return {
      id: 'test-entry-1',
      gameId: 'game-123',
      timestamp: Date.now(),
      seed: 'seed-12345',
      isVictory: true,
      score: 5000,
      deathCause: null,
      epitaph: null,
      finalLevel: 5,
      totalXP: 1000,
      totalGold: 250,
      deepestLevel: 5,
      levelsExplored: 5,
      totalTurns: 500,
      monstersKilled: 20,
      itemsFound: 15,
      itemsUsed: 8,
      achievements: [],
      finalEquipment: undefined,
      scorePerTurn: 10,
      killsPerLevel: 4,
      ...overrides,
    }
  }

  describe('rendering', () => {
    test('displays modal with entry-details-modal class', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      const modalElement = document.querySelector('.entry-details-modal')
      expect(modalElement).not.toBeNull()
    })

    test('displays victory outcome with green border', () => {
      const entry = createTestEntry({ isVictory: true })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('VICTORY')
      const modalContent = document.querySelector('.entry-details-content') as HTMLElement
      // Browser converts hex to rgb
      expect(modalContent.style.border).toMatch(/rgb\(0,\s*255,\s*0\)|#00FF00/i)
    })

    test('displays death outcome with red border', () => {
      const entry = createTestEntry({ isVictory: false, deathCause: 'Killed by Orc' })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('DEATH')
      const modalContent = document.querySelector('.entry-details-content') as HTMLElement
      // Browser converts hex to rgb
      expect(modalContent.style.border).toMatch(/rgb\(255,\s*102,\s*102\)|#FF6666/i)
    })

    test('displays score prominently', () => {
      const entry = createTestEntry({ score: 12345 })
      modal.show(entry, jest.fn())

      // Accept both comma and space as thousands separator
      expect(document.body.textContent).toMatch(/12[, ]345/)
    })

    test('displays timestamp as formatted date', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      // Just check that a date is displayed (format includes time)
      const dateRegex = /\d{4}\/\d{1,2}\/\d{1,2}/
      expect(document.body.textContent).toMatch(dateRegex)
    })
  })

  describe('death information', () => {
    test('displays death cause when present', () => {
      const entry = createTestEntry({
        isVictory: false,
        deathCause: 'Killed by Orc',
        epitaph: 'They fought bravely',
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Killed by Orc')
    })

    test('displays epitaph when present', () => {
      const entry = createTestEntry({
        isVictory: false,
        deathCause: 'Starved to death',
        epitaph: 'Forgotten and alone',
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Forgotten and alone')
    })

    test('does not display death section for victories', () => {
      const entry = createTestEntry({ isVictory: true })
      modal.show(entry, jest.fn())

      const deathSection = document.querySelector('.death-info')
      expect(deathSection).toBeNull()
    })
  })

  describe('statistics sections', () => {
    test('displays character progression stats', () => {
      const entry = createTestEntry({
        finalLevel: 8,
        totalXP: 5000,
        totalGold: 1200,
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Character Progression')
      expect(document.body.textContent).toContain('Level 8')
      // Accept both comma and space as thousands separator
      expect(document.body.textContent).toMatch(/5[, ]000/)
      expect(document.body.textContent).toMatch(/1[, ]200/)
    })

    test('displays exploration stats', () => {
      const entry = createTestEntry({
        deepestLevel: 10,
        levelsExplored: 7,
        totalTurns: 1500,
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Exploration')
      expect(document.body.textContent).toContain('Level 10')
      // Accept both comma and space as thousands separator
      expect(document.body.textContent).toMatch(/1[, ]500/)
    })

    test('displays combat stats', () => {
      const entry = createTestEntry({
        monstersKilled: 50,
        killsPerLevel: 5.5,
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Combat')
      expect(document.body.textContent).toContain('50')
      expect(document.body.textContent).toContain('5.50')
    })

    test('displays item stats', () => {
      const entry = createTestEntry({
        itemsFound: 25,
        itemsUsed: 12,
        scorePerTurn: 8.75,
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Items')
      expect(document.body.textContent).toContain('25')
      expect(document.body.textContent).toContain('12')
      expect(document.body.textContent).toContain('8.75')
    })
  })

  describe('equipment display', () => {
    test('displays equipment when present', () => {
      const entry = createTestEntry({
        finalEquipment: {
          weapon: 'Long Sword +2',
          armor: 'Chain Mail +1',
          lightSource: 'Phial of Galadriel',
          rings: ['Ring of Regeneration', 'Ring of Slow Digestion'],
        },
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Final Equipment')
      expect(document.body.textContent).toContain('Long Sword +2')
      expect(document.body.textContent).toContain('Chain Mail +1')
      expect(document.body.textContent).toContain('Phial of Galadriel')
      expect(document.body.textContent).toContain('Ring of Regeneration')
      expect(document.body.textContent).toContain('Ring of Slow Digestion')
    })

    test('does not display equipment section when no equipment', () => {
      const entry = createTestEntry({ finalEquipment: undefined })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).not.toContain('Final Equipment')
    })

    test('does not display equipment section when equipment is empty', () => {
      const entry = createTestEntry({
        finalEquipment: {
          weapon: undefined,
          armor: undefined,
          lightSource: undefined,
          rings: [],
        },
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).not.toContain('Final Equipment')
    })
  })

  describe('achievements display', () => {
    test('displays achievements when present', () => {
      const entry = createTestEntry({
        achievements: [
          'First Blood (killed first monster)',
          'Dungeon Delver (explored 5 levels)',
          'Treasure Hunter (collected 500 gold)',
        ],
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('Achievements')
      expect(document.body.textContent).toContain('First Blood')
      expect(document.body.textContent).toContain('Dungeon Delver')
      expect(document.body.textContent).toContain('Treasure Hunter')
    })

    test('displays medal emojis for achievements', () => {
      const entry = createTestEntry({
        achievements: ['Achievement 1', 'Achievement 2', 'Achievement 3'],
      })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('🥇')
      expect(document.body.textContent).toContain('🥈')
      expect(document.body.textContent).toContain('🥉')
    })

    test('does not display achievements section when empty', () => {
      const entry = createTestEntry({ achievements: [] })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).not.toContain('Achievements')
    })
  })

  describe('seed section', () => {
    test('displays seed prominently', () => {
      const entry = createTestEntry({ seed: 'seed-test-123' })
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('seed-test-123')
    })

    test('displays copy seed button', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      const copyButton = document.querySelector('.copy-seed-button')
      expect(copyButton).not.toBeNull()
      expect(copyButton?.textContent).toContain('Copy Seed')
    })

    test('copies seed to clipboard when button clicked', async () => {
      const entry = createTestEntry({ seed: 'seed-to-copy' })
      modal.show(entry, jest.fn())

      // Mock clipboard API
      const writeTextMock = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      })

      const copyButton = document.querySelector('.copy-seed-button') as HTMLButtonElement
      copyButton.click()

      expect(writeTextMock).toHaveBeenCalledWith('seed-to-copy')
    })

    test('shows success feedback after copying', async () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      })

      const copyButton = document.querySelector('.copy-seed-button') as HTMLButtonElement
      copyButton.click()

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(copyButton.textContent).toContain('Copied!')
    })
  })

  describe('keyboard controls', () => {
    test('closes modal with ESC key', () => {
      const entry = createTestEntry()
      const callback = jest.fn()
      modal.show(entry, callback)

      expect(modal.isVisible()).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(modal.isVisible()).toBe(false)
      expect(callback).toHaveBeenCalled()
    })

    test('closes modal with Q key', () => {
      const entry = createTestEntry()
      const callback = jest.fn()
      modal.show(entry, callback)

      const event = new KeyboardEvent('keydown', { key: 'q' })
      document.dispatchEvent(event)

      expect(modal.isVisible()).toBe(false)
      expect(callback).toHaveBeenCalled()
    })

    test('copies seed with C key', () => {
      const entry = createTestEntry({ seed: 'seed-keyboard-copy' })
      modal.show(entry, jest.fn())

      // Mock clipboard API
      const writeTextMock = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      })

      const event = new KeyboardEvent('keydown', { key: 'c' })
      document.dispatchEvent(event)

      expect(writeTextMock).toHaveBeenCalledWith('seed-keyboard-copy')
    })

    test('displays keyboard shortcuts in footer', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      expect(document.body.textContent).toContain('[C]')
      expect(document.body.textContent).toContain('Copy Seed')
      expect(document.body.textContent).toContain('[ESC]')
      expect(document.body.textContent).toContain('Close')
    })
  })

  describe('visibility', () => {
    test('isVisible returns true when shown', () => {
      const entry = createTestEntry()
      expect(modal.isVisible()).toBe(false)

      modal.show(entry, jest.fn())

      expect(modal.isVisible()).toBe(true)
    })

    test('isVisible returns false after hide', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())
      expect(modal.isVisible()).toBe(true)

      modal.hide()

      expect(modal.isVisible()).toBe(false)
    })

    test('removes modal from DOM when hidden', () => {
      const entry = createTestEntry()
      modal.show(entry, jest.fn())

      const modalBefore = document.querySelector('.entry-details-modal')
      expect(modalBefore).not.toBeNull()

      modal.hide()

      const modalAfter = document.querySelector('.entry-details-modal')
      expect(modalAfter).toBeNull()
    })
  })
})
