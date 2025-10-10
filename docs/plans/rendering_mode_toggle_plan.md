# ASCII/Sprite Rendering Mode Toggle - Implementation Plan

**Status**: 📋 Planning
**Version**: 1.0
**Created**: 2025-10-10
**Owner**: Dirk Kok
**Related Docs**: [Architecture](../architecture.md) | [Sprite Rendering Plan](./sprite_rendering_plan.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Add a user preference toggle that allows switching between ASCII text rendering and sprite-based rendering at runtime, providing flexibility for different user preferences and accessibility needs.

### Design Philosophy
- **User Choice**: Let users pick their preferred rendering mode
- **Runtime Switching**: No page reload required
- **Persistence**: Save preference to localStorage
- **Accessibility**: ASCII mode can be useful for screen readers or low-performance devices
- **Backward Compatibility**: Maintain both rendering systems in parallel

### Success Criteria
- [ ] User can toggle between ASCII and sprite modes from settings menu
- [ ] Preference persists across browser sessions (localStorage)
- [ ] Switching modes updates renderer immediately (no reload)
- [ ] Both rendering modes produce identical gameplay
- [ ] ASCII renderer still works correctly (not broken by sprite work)
- [ ] All existing tests pass in both modes
- [ ] New toggle tests achieve >80% coverage
- [ ] Documentation updated with toggle instructions

---

## 2. Context & Related Documentation

### Current State
- **Sprite Rendering**: Fully implemented (Phase 1-6 complete)
  - CanvasGameRenderer with AngbandTK tileset
  - Hardware-accelerated, 500+ FPS
  - Scroll margin camera, dirty rectangle optimization
- **ASCII Rendering**: Original text-based renderer
  - Uses `<pre>` element with colored text
  - Still exists in codebase but not currently used
  - Located in GameRenderer.ts (old implementation)

### Related Systems
- **PreferencesService**: Manages user preferences (needs extension)
- **LocalStorageService**: Persists preferences to browser storage
- **GameRenderer**: Main UI coordinator (needs dual-mode support)
- **CanvasGameRenderer**: Sprite renderer (already implemented)
- **RenderingService**: Determines visibility states (unchanged)

### Accessibility Considerations
- **Screen Readers**: May work better with ASCII text
- **Low-End Devices**: ASCII may perform better on old hardware
- **Visual Preferences**: Some users prefer classic ASCII aesthetic
- **Contrast**: ASCII mode may offer better contrast for vision impairment

---

## 3. Phases & Tasks

### Phase 1: Preferences & State Management (Priority: HIGH)

**Objective**: Add rendering mode preference to user settings

#### Task 1.1: Extend PreferencesService Type Definitions

**Context**: Add `renderMode` field to user preferences

**Files to create/modify**:
- `src/services/PreferencesService/PreferencesService.ts` (modify)
- `src/services/PreferencesService/preferences.test.ts` (modify)

##### Subtasks:
- [ ] Add `renderMode: 'ascii' | 'sprites'` to `UserPreferences` interface:
  ```typescript
  export interface UserPreferences {
    // ... existing fields (showTutorial, difficulty, etc.)
    renderMode: 'ascii' | 'sprites'  // Default: 'sprites'
  }
  ```
- [ ] Add default value in `getDefaultPreferences()`:
  ```typescript
  renderMode: 'sprites'  // Default to new sprite rendering
  ```
- [ ] Update `savePreferences()` to persist render mode
- [ ] Update `loadPreferences()` to restore render mode
- [ ] Add validation for render mode (must be 'ascii' or 'sprites')
- [ ] Write tests:
  - Default preference is 'sprites'
  - Can save and load 'ascii' mode
  - Can save and load 'sprites' mode
  - Invalid render mode falls back to 'sprites'
- [ ] Git commit: "feat: add renderMode to user preferences (Phase 1.1)"

---

#### Task 1.2: Add Render Mode Change Event System

**Context**: Notify GameRenderer when render mode changes

**Files to create/modify**:
- `src/services/PreferencesService/PreferencesService.ts` (modify)

##### Subtasks:
- [ ] Add event emitter pattern to PreferencesService:
  ```typescript
  private listeners: Set<(prefs: UserPreferences) => void> = new Set()

  subscribe(listener: (prefs: UserPreferences) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)  // Unsubscribe
  }

  private notifyListeners(prefs: UserPreferences): void {
    this.listeners.forEach(listener => listener(prefs))
  }
  ```
- [ ] Call `notifyListeners()` in `savePreferences()` after persistence
- [ ] Add tests for subscription/notification system
- [ ] Git commit: "feat: add preference change event system (Phase 1.2)"

---

### Phase 2: ASCII Renderer Restoration (Priority: HIGH)

**Objective**: Ensure ASCII text renderer is functional and up-to-date

#### Task 2.1: Audit and Fix ASCII Rendering Code

**Context**: ASCII renderer may be outdated after sprite work

**Files to create/modify**:
- `src/ui/GameRenderer.ts` (audit and fix)
- `src/ui/AsciiDungeonRenderer.ts` (extract if needed)

##### Subtasks:
- [ ] Audit GameRenderer.ts for old ASCII rendering code
- [ ] Check if ASCII rendering still works with current GameState
- [ ] Fix any broken ASCII rendering logic (FOV, colors, entities)
- [ ] Extract ASCII rendering to separate class if appropriate:
  ```typescript
  export class AsciiDungeonRenderer {
    render(state: GameState): string {
      // Return ASCII grid as string
    }
  }
  ```
- [ ] Ensure ASCII renderer respects same visibility rules as sprites
- [ ] Test ASCII rendering manually in browser
- [ ] Git commit: "fix: restore and update ASCII rendering (Phase 2.1)"

---

#### Task 2.2: Create ASCII Renderer Tests

**Context**: Add test coverage for ASCII rendering mode

**Files to create/modify**:
- `src/ui/AsciiDungeonRenderer.test.ts` (new file)

##### Subtasks:
- [ ] Test suite for ASCII rendering:
  - Visible tiles rendered with color
  - Explored tiles rendered dimmed
  - Unexplored tiles not rendered
  - Monsters rendered in FOV only
  - Items rendered correctly
  - Player rendered at correct position
  - Color codes applied correctly
- [ ] Achieve >80% coverage for ASCII renderer
- [ ] Git commit: "test: add ASCII renderer test suite (Phase 2.2)"

---

### Phase 3: Dual-Mode GameRenderer (Priority: HIGH)

**Objective**: Update GameRenderer to support both ASCII and sprite modes

#### Task 3.1: Implement Renderer Switching Logic

**Context**: GameRenderer should use ASCII or Canvas renderer based on preference

**Files to create/modify**:
- `src/ui/GameRenderer.ts` (modify)

##### Subtasks:
- [ ] Add both renderers to GameRenderer constructor:
  ```typescript
  constructor(
    private renderingService: RenderingService,
    private assetLoader: AssetLoaderService,
    private preferencesService: PreferencesService,
    private asciiRenderer: AsciiDungeonRenderer,
    private canvasRenderer: CanvasGameRenderer
  ) {
    // Subscribe to preference changes
    this.preferencesService.subscribe(this.handlePreferenceChange.bind(this))
  }
  ```
- [ ] Store current render mode in GameRenderer state
- [ ] Implement `handlePreferenceChange()` to update render mode
- [ ] Update `renderDungeon()` to delegate to correct renderer:
  ```typescript
  private renderDungeon(state: GameState): void {
    const prefs = this.preferencesService.getPreferences()

    if (prefs.renderMode === 'ascii') {
      // Use ASCII renderer
      const asciiGrid = this.asciiRenderer.render(state)
      this.updateAsciiView(asciiGrid)
    } else {
      // Use Canvas renderer
      this.canvasRenderer.render(state)
    }
  }
  ```
- [ ] Handle DOM swapping between `<pre>` and `<canvas>` elements
- [ ] Ensure smooth transition (no flicker)
- [ ] Git commit: "feat: implement dual-mode renderer switching (Phase 3.1)"

---

#### Task 3.2: Handle DOM Element Swapping

**Context**: Need to swap between `<pre>` (ASCII) and `<canvas>` (sprites) elements

**Files to create/modify**:
- `src/ui/GameRenderer.ts` (modify)

##### Subtasks:
- [ ] Create both DOM elements on initialization:
  ```typescript
  private createDungeonView(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'dungeon-container'

    // ASCII view
    this.asciiElement = document.createElement('pre')
    this.asciiElement.className = 'dungeon-grid'

    // Canvas view
    this.canvasElement = document.createElement('canvas')
    this.canvasElement.className = 'dungeon-canvas'
    this.canvasElement.width = 2560
    this.canvasElement.height = 704

    // Start with preferred mode
    const prefs = this.preferencesService.getPreferences()
    if (prefs.renderMode === 'ascii') {
      container.appendChild(this.asciiElement)
    } else {
      container.appendChild(this.canvasElement)
    }

    return container
  }
  ```
- [ ] Implement `switchRenderMode()` method:
  ```typescript
  private switchRenderMode(mode: 'ascii' | 'sprites'): void {
    const container = this.dungeonContainer

    // Remove current element
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Add new element
    if (mode === 'ascii') {
      container.appendChild(this.asciiElement)
    } else {
      container.appendChild(this.canvasElement)
    }

    // Force re-render with current game state
    this.render(this.currentGameState)
  }
  ```
- [ ] Handle edge case: switching during gameplay (no state loss)
- [ ] Git commit: "feat: implement DOM element swapping for render modes (Phase 3.2)"

---

### Phase 4: Settings UI Integration (Priority: MEDIUM)

**Objective**: Add toggle control to settings menu

#### Task 4.1: Create Render Mode Toggle UI Component

**Context**: Add toggle button/radio to settings screen

**Files to create/modify**:
- `src/ui/SettingsModal.ts` (modify or create)
- `src/states/SettingsState.ts` (modify or create)

##### Subtasks:
- [ ] Check if SettingsModal/SettingsState exists:
  ```bash
  ls src/ui/Settings* src/states/Settings*
  ```
- [ ] If not exists, create basic settings modal:
  ```typescript
  export class SettingsModal {
    constructor(
      private preferencesService: PreferencesService,
      private onClose: () => void
    ) {}

    render(): HTMLElement {
      const modal = document.createElement('div')
      modal.className = 'settings-modal'

      // Render mode section
      const renderSection = this.createRenderModeSection()
      modal.appendChild(renderSection)

      // Close button
      const closeButton = this.createCloseButton()
      modal.appendChild(closeButton)

      return modal
    }
  }
  ```
- [ ] Add render mode toggle:
  ```typescript
  private createRenderModeSection(): HTMLElement {
    const section = document.createElement('div')
    const prefs = this.preferencesService.getPreferences()

    const label = document.createElement('label')
    label.textContent = 'Rendering Mode:'

    const select = document.createElement('select')
    select.innerHTML = `
      <option value="sprites" ${prefs.renderMode === 'sprites' ? 'selected' : ''}>
        Sprites (Hardware Accelerated)
      </option>
      <option value="ascii" ${prefs.renderMode === 'ascii' ? 'selected' : ''}>
        ASCII Text (Classic)
      </option>
    `

    select.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as 'ascii' | 'sprites'
      this.preferencesService.savePreferences({
        ...prefs,
        renderMode: mode
      })
    })

    section.appendChild(label)
    section.appendChild(select)
    return section
  }
  ```
- [ ] Add keyboard shortcut (optional): `R` key to toggle render mode
- [ ] Git commit: "feat: add render mode toggle to settings UI (Phase 4.1)"

---

#### Task 4.2: Style Settings Modal

**Context**: Add CSS for settings modal and toggle

**Files to create/modify**:
- `public/styles.css` (modify)

##### Subtasks:
- [ ] Add settings modal styles:
  ```css
  .settings-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    border: 2px solid #444;
    padding: 2rem;
    z-index: 1000;
    min-width: 400px;
  }

  .settings-modal label {
    display: block;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .settings-modal select {
    width: 100%;
    padding: 0.5rem;
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    margin-bottom: 1rem;
  }
  ```
- [ ] Ensure settings modal is accessible (keyboard navigation, ARIA labels)
- [ ] Test on different screen sizes
- [ ] Git commit: "style: add settings modal CSS (Phase 4.2)"

---

### Phase 5: Testing & Integration (Priority: HIGH)

**Objective**: Comprehensive testing of render mode toggle

#### Task 5.1: Write Integration Tests

**Context**: Test full toggle workflow end-to-end

**Files to create/modify**:
- `src/ui/GameRenderer.toggle.test.ts` (new file)

##### Subtasks:
- [ ] Test suite for render mode toggle:
  - Default mode is 'sprites'
  - Can switch from sprites to ASCII
  - Can switch from ASCII to sprites
  - Preference persists to localStorage
  - Preference restored on page reload
  - Both renderers produce same gameplay (FOV, visibility)
  - DOM elements swapped correctly
  - No memory leaks when switching modes
- [ ] Test edge cases:
  - Switching during combat (state preserved)
  - Switching with modals open (state preserved)
  - Rapid toggling (no crashes)
- [ ] Achieve >80% coverage
- [ ] Git commit: "test: add render mode toggle integration tests (Phase 5.1)"

---

#### Task 5.2: Manual Testing & Bug Fixing

**Context**: Play-test toggle feature, identify issues

##### Subtasks:
- [ ] Manual test cases:
  - Open settings, toggle to ASCII, verify ASCII rendering
  - Toggle back to sprites, verify sprite rendering
  - Reload page, verify preference persisted
  - Play game in ASCII mode (movement, combat, items)
  - Play game in sprite mode (movement, combat, items)
  - Switch modes during active gameplay (no state loss)
  - Check performance in both modes
- [ ] Fix any discovered bugs
- [ ] Document known limitations (if any)
- [ ] Git commit: "fix: render mode toggle bug fixes (Phase 5.2)"

---

### Phase 6: Documentation & Finalization (Priority: MEDIUM)

**Objective**: Update documentation with toggle feature

#### Task 6.1: Update User Documentation

**Context**: Document how to use render mode toggle

**Files to create/modify**:
- `docs/user-guide.md` (create or modify)
- `README.md` (modify)

##### Subtasks:
- [ ] Add "Render Mode Toggle" section to user docs:
  ```markdown
  ## Rendering Modes

  The game supports two rendering modes:

  ### Sprite Mode (Default)
  - Modern graphical tiles (AngbandTK tileset)
  - Hardware-accelerated (GPU rendering)
  - Smooth animations and effects
  - Best performance on modern devices

  ### ASCII Mode (Classic)
  - Traditional text-based rendering
  - Better for screen readers
  - Lower resource usage
  - Classic roguelike aesthetic

  **How to Switch**:
  1. Press ESC to open main menu
  2. Select "Settings"
  3. Change "Rendering Mode" dropdown
  4. Preference saves automatically
  ```
- [ ] Update README.md with feature mention
- [ ] Add screenshots of both modes (optional)
- [ ] Git commit: "docs: add render mode toggle user guide (Phase 6.1)"

---

#### Task 6.2: Update Technical Documentation

**Context**: Document architecture of dual-mode rendering

**Files to create/modify**:
- `docs/architecture.md` (modify)
- `docs/ui/GameRenderer.md` (create or modify)

##### Subtasks:
- [ ] Add "Dual-Mode Rendering" section to architecture docs:
  - Explain preference system
  - Explain renderer switching mechanism
  - Document DOM element swapping
  - Show class diagram of renderer hierarchy
- [ ] Update GameRenderer documentation:
  - Document both renderers (ASCII + Canvas)
  - Explain preference subscription pattern
  - Show code examples
- [ ] Git commit: "docs: document dual-mode rendering architecture (Phase 6.2)"

---

## 4. Technical Design

### Architecture Diagram

```
PreferencesService
  ├─ renderMode: 'ascii' | 'sprites'
  └─ listeners: Set<(prefs) => void>
       ↓ (notifies on change)
GameRenderer
  ├─ asciiRenderer: AsciiDungeonRenderer
  ├─ canvasRenderer: CanvasGameRenderer
  ├─ asciiElement: HTMLPreElement
  ├─ canvasElement: HTMLCanvasElement
  └─ render(state: GameState)
       ↓ (delegates to)
       ├─ ASCII Mode → AsciiDungeonRenderer.render()
       └─ Sprite Mode → CanvasGameRenderer.render()
```

### Data Flow

```
User clicks "Settings" → SettingsModal opens
User selects render mode → PreferencesService.savePreferences()
PreferencesService persists to localStorage
PreferencesService.notifyListeners() called
GameRenderer.handlePreferenceChange() invoked
GameRenderer.switchRenderMode() swaps DOM elements
GameRenderer.render() uses new renderer
```

### State Persistence

**LocalStorage Schema**:
```json
{
  "preferences": {
    "renderMode": "sprites",  // or "ascii"
    "showTutorial": true,
    "difficulty": "normal"
    // ... other preferences
  }
}
```

### Renderer Interface

Both renderers must implement consistent behavior:

```typescript
interface IDungeonRenderer {
  render(state: GameState): void
}

class AsciiDungeonRenderer implements IDungeonRenderer {
  render(state: GameState): void {
    // Render to <pre> element
  }
}

class CanvasGameRenderer implements IDungeonRenderer {
  render(state: GameState): void {
    // Render to <canvas> element
  }
}
```

---

## 5. Testing Strategy

### Unit Tests

**Files to test**:
- `PreferencesService` - Render mode preference CRUD
- `AsciiDungeonRenderer` - ASCII rendering logic
- `GameRenderer` - Renderer switching logic
- `SettingsModal` - UI toggle control

**Coverage Goals**:
- PreferencesService: >90%
- AsciiDungeonRenderer: >80%
- GameRenderer: >80%
- SettingsModal: >70%

### Integration Tests

**Scenarios**:
1. **Toggle Flow**: Settings → Toggle → Render → Persist → Reload → Verify
2. **Gameplay Consistency**: Same FOV/visibility in both modes
3. **State Preservation**: No state loss when switching modes
4. **Performance**: Both modes maintain 60 FPS minimum

### Manual Testing Checklist

- [ ] Toggle to ASCII mode - ASCII grid appears
- [ ] Toggle to sprite mode - Canvas appears
- [ ] Reload page - Preference restored
- [ ] Play full game in ASCII mode
- [ ] Play full game in sprite mode
- [ ] Switch modes during combat (state intact)
- [ ] Switch modes with inventory open (state intact)
- [ ] Check localStorage (preference saved)
- [ ] Test with screen reader (ASCII mode accessibility)

---

## 6. Risk & Considerations

### Potential Issues

**Issue 1: ASCII Renderer Outdated**
- **Problem**: ASCII renderer may not work with current GameState structure
- **Mitigation**: Audit and update ASCII renderer in Phase 2
- **Fallback**: Use minimal ASCII renderer (just render visible tiles)

**Issue 2: DOM Swapping Flicker**
- **Problem**: Switching elements may cause visual flicker
- **Mitigation**: Use CSS transitions, prepare element before swap
- **Fallback**: Brief black screen during transition (acceptable)

**Issue 3: Performance Disparity**
- **Problem**: ASCII mode may be slower than expected (DOM reflows)
- **Mitigation**: Optimize ASCII rendering (use DocumentFragment, minimize reflows)
- **Fallback**: Document that sprite mode is recommended for performance

**Issue 4: State Synchronization**
- **Problem**: Renderers may get out of sync during switch
- **Mitigation**: Force full re-render after mode change
- **Fallback**: Clear both renderers, re-render from scratch

**Issue 5: Accessibility Regression**
- **Problem**: Sprite mode may break screen reader support added for ASCII
- **Mitigation**: Keep both modes, let users choose
- **Fallback**: ASCII mode is always available

### Breaking Changes

- **None**: This is an additive feature
- Both rendering modes coexist peacefully
- Default is sprite mode (current behavior)

### Performance Considerations

**ASCII Mode**:
- DOM manipulation overhead (reflows/repaints)
- Text rendering (browser font engine)
- Expected: 100-200 FPS

**Sprite Mode**:
- Canvas rendering (GPU-accelerated)
- Dirty rectangle optimization
- Expected: 500+ FPS

---

## 7. Timeline & Dependencies

### Dependencies

- **Blocked by**: None (sprite rendering complete)
- **Blocks**: None (optional feature)

### Estimated Timeline

**Phase 1: Preferences & State Management**
- Task 1.1: Extend PreferencesService - 1 hour
- Task 1.2: Add event system - 1 hour
- **Phase 1 Total**: 2 hours

**Phase 2: ASCII Renderer Restoration**
- Task 2.1: Audit and fix ASCII renderer - 2 hours
- Task 2.2: Create ASCII tests - 1 hour
- **Phase 2 Total**: 3 hours

**Phase 3: Dual-Mode GameRenderer**
- Task 3.1: Renderer switching logic - 2 hours
- Task 3.2: DOM element swapping - 1 hour
- **Phase 3 Total**: 3 hours

**Phase 4: Settings UI Integration**
- Task 4.1: Create toggle UI - 2 hours
- Task 4.2: Style settings modal - 1 hour
- **Phase 4 Total**: 3 hours

**Phase 5: Testing & Integration**
- Task 5.1: Write integration tests - 2 hours
- Task 5.2: Manual testing & bug fixing - 2 hours
- **Phase 5 Total**: 4 hours

**Phase 6: Documentation**
- Task 6.1: Update user docs - 1 hour
- Task 6.2: Update technical docs - 1 hour
- **Phase 6 Total**: 2 hours

**Grand Total**: 17 hours (~2-3 working days)

---

## 8. Post-Implementation

### Verification Checklist

- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% for new code
- [ ] Both render modes work correctly
- [ ] Preference persists across sessions
- [ ] No performance regression in either mode
- [ ] Documentation updated (user guide + technical docs)
- [ ] Accessibility tested (screen reader with ASCII mode)

### Future Enhancements

1. **Hot-Key Toggle**: Press `R` to quickly switch modes
2. **Performance Stats**: Show FPS for each mode in debug overlay
3. **Hybrid Mode**: Sprites for terrain, ASCII for entities (experimental)
4. **Custom Tilesets**: Allow users to load different sprite tilesets
5. **ASCII Themes**: Multiple color schemes for ASCII mode

---

**Last Updated**: 2025-10-10
**Status**: 📋 Planning Complete - Ready to Implement
