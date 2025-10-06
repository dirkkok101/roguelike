import { MainMenu } from './MainMenu'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { PreferencesService } from '@services/PreferencesService'

describe('MainMenu', () => {
  let menu: MainMenu
  let leaderboardService: LeaderboardService
  let leaderboardStorageService: LeaderboardStorageService
  let preferencesService: PreferencesService

  beforeEach(() => {
    leaderboardService = new LeaderboardService()
    leaderboardStorageService = new LeaderboardStorageService()
    preferencesService = new PreferencesService()
    menu = new MainMenu(leaderboardService, leaderboardStorageService, preferencesService)
    document.body.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    menu.hide()
    document.body.innerHTML = ''
  })

  test('shows main menu title', () => {
    menu.show(false, jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('ROGUE')
    expect(document.body.textContent).toContain('AMULET OF YENDOR')
  })

  test('shows New Game option', () => {
    menu.show(false, jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('[N] New Game')
  })

  test('shows Continue option when save exists', () => {
    menu.show(true, jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('[C] Continue')
  })

  test('hides Continue option when no save', () => {
    menu.show(false, jest.fn(), jest.fn())

    expect(document.body.textContent).not.toContain('[C] Continue')
  })

  test('shows Help option', () => {
    menu.show(false, jest.fn(), jest.fn())

    expect(document.body.textContent).toContain('[?] Help')
  })

  test('shows character name modal when N pressed', () => {
    const callback = jest.fn()
    menu.show(false, callback, jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    // Character name modal should be shown
    expect(document.querySelector('.character-name-modal')).toBeTruthy()
  })

  test('shows character name modal when uppercase N pressed', () => {
    const callback = jest.fn()
    menu.show(false, callback, jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'N' })
    document.dispatchEvent(event)

    // Character name modal should be shown
    expect(document.querySelector('.character-name-modal')).toBeTruthy()
  })

  test('calls onNewGame with character name when modal submitted', () => {
    const callback = jest.fn()
    menu.show(false, callback, jest.fn())

    // Press N to show character name modal
    const nEvent = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(nEvent)

    // Find the input field and change its value
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    expect(input).toBeTruthy()

    input.value = 'TestHero'

    // Press Enter on document (modal listens to document-level events)
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
    document.dispatchEvent(enterEvent)

    // onNewGame should be called with the character name
    expect(callback).toHaveBeenCalledWith('TestHero')
  })

  test('calls onContinue when C pressed with save', () => {
    const callback = jest.fn()
    menu.show(true, jest.fn(), callback)

    const event = new KeyboardEvent('keydown', { key: 'c' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('does not call onContinue when C pressed without save', () => {
    const callback = jest.fn()
    menu.show(false, jest.fn(), callback)

    const event = new KeyboardEvent('keydown', { key: 'c' })
    document.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  test('hides menu after N key pressed', () => {
    menu.show(false, jest.fn(), jest.fn())
    expect(menu.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(menu.isVisible()).toBe(false)
  })

  test('hides menu after C key pressed', () => {
    menu.show(true, jest.fn(), jest.fn())
    expect(menu.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'c' })
    document.dispatchEvent(event)

    expect(menu.isVisible()).toBe(false)
  })

  test('isVisible returns true when shown', () => {
    expect(menu.isVisible()).toBe(false)

    menu.show(false, jest.fn(), jest.fn())

    expect(menu.isVisible()).toBe(true)
  })

  test('isVisible returns false when hidden', () => {
    menu.show(false, jest.fn(), jest.fn())
    expect(menu.isVisible()).toBe(true)

    menu.hide()

    expect(menu.isVisible()).toBe(false)
  })

  test('removes from DOM when hidden', () => {
    menu.show(false, jest.fn(), jest.fn())
    expect(document.querySelector('.main-menu')).toBeTruthy()

    menu.hide()

    expect(document.querySelector('.main-menu')).toBeNull()
  })

  test('removes event listener when hidden', () => {
    const callback = jest.fn()
    menu.show(false, callback, jest.fn())

    menu.hide()

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    // Callback should not be called after hide
    expect(callback).not.toHaveBeenCalled()
  })

  test('can show menu multiple times', () => {
    menu.show(false, jest.fn(), jest.fn())
    menu.hide()

    menu.show(true, jest.fn(), jest.fn())

    expect(menu.isVisible()).toBe(true)
    expect(document.body.textContent).toContain('[C] Continue')
  })

  test('prevents default on N key', () => {
    menu.show(false, jest.fn(), jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'n' })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('prevents default on C key when save exists', () => {
    menu.show(true, jest.fn(), jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'c' })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('does not prevent default on C key when no save', () => {
    menu.show(false, jest.fn(), jest.fn())

    const event = new KeyboardEvent('keydown', { key: 'c' })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    // Since there's no save, C key should not be handled
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })
})
