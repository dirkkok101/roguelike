# Death Screen UX Refactor Plan

**Status**: 🚧 Planned
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok

---

## Objectives

1. **Enhance Player Agency** - Provide meaningful choices after death (new game, replay, return to menu)
2. **Improve Data Presentation** - Better visual hierarchy and stats grouping with ASCII aesthetics
3. **Enable Seed Replay** - Allow players to retry the same dungeon layout
4. **Add Run Context** - Show meaningful statistics and achievements for player reflection
5. **Maintain Roguelike Tradition** - Keep permadeath messaging and appropriate emotional tone

---

## Context & Related Documentation

**Related Systems**:
- [UI Layer Documentation](../../docs/architecture.md#ui-layer) - Rendering and input handling patterns
- [Game Design - Core Mechanics](../../docs/game-design/01-core-mechanics.md) - Permadeath philosophy
- [VictoryScreen.ts](../../src/ui/VictoryScreen.ts) - Similar end-game screen for reference
- [InputHandler.ts](../../src/ui/InputHandler.ts) - Keyboard input patterns

**Current Implementation**:
- File: `src/ui/DeathScreen.ts` (122 lines)
- Interface: `DeathStats` (lines 5-13)
- Single action: Press [N] to continue to new game
- Stats: cause, finalLevel, totalGold, totalXP, totalTurns, deepestLevel, seed

**UX Issues Identified**:
1. ❌ **No player choice** - Only one action available (new game)
2. ❌ **Seed not copyable** - Displayed but can't easily replay
3. ❌ **Missing context** - No monsters killed, items used, or run achievements
4. ❌ **Poor stats grouping** - Flat list without visual hierarchy
5. ❌ **No emotional resonance** - Clinical presentation lacks roguelike flavor
6. ❌ **Limited utility** - Can't return to menu or view help

---

## Analysis Summary

### Current State

#### Strengths ✅
- Clean modal overlay with fade-in animation
- ASCII border aesthetic matches roguelike theme
- Good color coding (red=death, orange=cause, green=action)
- Permadeath messaging is clear
- Seed is displayed for potential manual replay
- All essential stats present

#### Critical Issues ❌

1. **Limited Player Agency (UX)**
   - Only "Press [N] to Continue" → forced to new game
   - No way to return to main menu
   - No way to replay same seed
   - No way to view final game state before dismissing

2. **Missing Run Statistics (Engagement)**
   - No monsters killed count (not tracked in GameState)
   - No items used/found statistics
   - No "deepest level reached" context (is level 5 good?)
   - No achievements or milestones
   - No death details (final blow damage, HP remaining)

3. **Poor Data Architecture (Technical)**
   - `DeathStats` interface incomplete
   - Stats calculated ad-hoc in QuitCommand
   - No DeathService to centralize death logic
   - No historical run tracking

4. **Seed Management Gap (Functionality)**
   - Seed displayed as small gray text
   - Not selectable/copyable
   - No "Replay This Seed" button
   - Main menu has no seed input field

5. **Visual Presentation (Polish)**
   - Stats presented as flat list
   - No grouping (progression vs exploration vs meta)
   - No visual distinction between stat types
   - Could use ASCII table formatting

---

## Proposed Architecture

### New Service: DeathService

**Purpose**: Centralize death-related logic (follows SRP)

**Responsibilities**:
- Calculate comprehensive death statistics
- Format death cause messages
- Track run achievements/milestones
- Generate epitaphs (flavor text)

**Location**: `src/services/DeathService/`

**Interface**:
```typescript
interface ComprehensiveDeathStats {
  // Death info
  cause: string                  // "Killed by Orc"
  finalBlow?: {                  // NEW: Death details
    damage: number
    attacker: string
    playerHPRemaining: number
  }

  // Progression stats
  finalLevel: number
  totalXP: number

  // Exploration stats
  deepestLevel: number
  totalTurns: number
  levelsExplored: number         // NEW

  // Combat stats
  monstersKilled: number         // NEW - requires GameState update
  damageDealt: number            // FUTURE
  damageTaken: number            // FUTURE

  // Loot stats
  totalGold: number
  itemsFound: number             // NEW
  itemsUsed: number              // NEW

  // Achievements
  achievements: string[]         // NEW: ["First Death", "Reached Level 3"]

  // Meta
  seed: string
  gameId: string
  timestamp: number              // NEW

  // Flavor
  epitaph?: string              // NEW: Random flavor text
}
```

### Updated GameState

**Add tracking fields**:
```typescript
interface GameState {
  // ... existing fields

  // NEW: Run statistics
  monstersKilled: number         // Increment in CombatService
  itemsFound: number             // Increment in PickUpCommand
  itemsUsed: number              // Increment in potion/scroll/wand commands
  levelsExplored: number         // Count of unique levels visited

  // NEW: Death details (populated on death)
  deathDetails?: {
    finalBlow: {
      damage: number
      attacker: string
      playerHPRemaining: number
    }
  }
}
```

### Updated DeathScreen UI

**Enhanced modal with 3-section layout**:

```
╔═══════════════════════════════════════════════════════╗
║                    GAME OVER                          ║
║                 You have died...                      ║
╚═══════════════════════════════════════════════════════╝

                Killed by Orc (12 damage)

┌─────────────────── Final Statistics ───────────────────┐
│                                                         │
│  Progression          Exploration        Combat         │
│  ────────────        ─────────────       ──────────    │
│  Level:    5         Deepest:  7         Kills:  23    │
│  XP:    2,450        Levels:   7         Gold: 1,230   │
│                      Turns: 1,547        Items:  12    │
│                                                         │
└─────────────────────────────────────────────────────────┘

Achievement: "Deeper Delver" - Reached level 7 for first time!

╔═══════════════════════════════════════════════════════╗
║  Permadeath - Your save has been deleted              ║
╚═══════════════════════════════════════════════════════╝

Seed: seed-1234567890  [Click to copy]

[N] New Game (Random)    [R] Replay Seed    [Q] Quit to Menu
```

### MainMenu Updates

**Add seed input capability**:
- New option: "Play Custom Seed"
- Text input for seed entry
- Validate and start game with specific seed

---

## Phases & Tasks

## Phase 1: Data Layer - Enhanced Statistics Tracking (Priority: HIGH)

**Objective**: Add necessary tracking to GameState and create DeathService

### Task 1.1: Update GameState Interface

**Context**: [src/types/core/core.ts](../../src/types/core/core.ts) - Add run statistics

#### Subtasks:
- [ ] Add `monstersKilled: number` field to GameState interface
  - Initialize to 0 in main.ts
  - Document purpose: "Total monsters killed this run"

- [ ] Add `itemsFound: number` field to GameState interface
  - Initialize to 0 in main.ts
  - Document purpose: "Total items picked up this run"

- [ ] Add `itemsUsed: number` field to GameState interface
  - Initialize to 0 in main.ts
  - Document purpose: "Total consumable items used this run"

- [ ] Add `levelsExplored: number` field to GameState interface
  - Initialize to 1 in main.ts (starting level)
  - Document purpose: "Count of unique dungeon levels visited"

- [ ] Add `deathDetails` optional field to GameState interface
  - Structure: `{ finalBlow: { damage: number, attacker: string, playerHPRemaining: number } }`
  - Populated only on death

- [ ] Update LocalStorageService to serialize new fields
  - Test save/load with new statistics

**Commit**: `feat: add run statistics tracking to GameState`

---

### Task 1.2: Update Stat Tracking in Existing Services

**Context**: Increment counters in appropriate locations

#### Subtasks:
- [ ] Update CombatService to increment monstersKilled
  - Location: When monster HP reaches 0 in `dealDamageToMonster()`
  - Return updated state with incremented counter

- [ ] Update PickUpCommand to increment itemsFound
  - Location: When item successfully added to inventory
  - Return updated state with incremented counter

- [ ] Update UseCommand/DrinkCommand/ReadCommand to increment itemsUsed
  - Track potion consumption
  - Track scroll reading
  - Track wand usage

- [ ] Update MoveStairsCommand to track levelsExplored
  - Use Set to track unique levels visited
  - Convert Set size to number for storage

**Commit**: `feat: implement run statistics tracking across services`

---

### Task 1.3: Create DeathService

**Context**: New service to centralize death logic (follows SRP)

#### Subtasks:
- [ ] Create `src/services/DeathService/` folder

- [ ] Create `DeathService.ts` with comprehensive death stats interface
  ```typescript
  export interface ComprehensiveDeathStats {
    // Death info
    cause: string
    finalBlow?: { damage: number, attacker: string, playerHPRemaining: number }

    // Progression
    finalLevel: number
    totalXP: number

    // Exploration
    deepestLevel: number
    totalTurns: number
    levelsExplored: number

    // Combat
    monstersKilled: number

    // Loot
    totalGold: number
    itemsFound: number
    itemsUsed: number

    // Achievements
    achievements: string[]

    // Meta
    seed: string
    gameId: string
    timestamp: number

    // Flavor
    epitaph?: string
  }
  ```

- [ ] Implement `calculateDeathStats(state: GameState): ComprehensiveDeathStats`
  - Extract all statistics from GameState
  - Calculate achievements based on milestones
  - Generate random epitaph based on death cause

- [ ] Implement `generateEpitaph(cause: string): string`
  - 5-10 flavor text options per death type
  - Classic roguelike style ("Here lies Player, killed by hubris")

- [ ] Implement `determineAchievements(state: GameState): string[]`
  - Check milestones: "First Death", "Deeper Delver (Level 5+)", "Monster Hunter (25+ kills)"
  - Return array of achievement strings

- [ ] Create `DeathService.test.ts` with scenario-based tests
  - Test stat calculation
  - Test achievement logic
  - Test epitaph generation

- [ ] Create `index.ts` barrel export

**Commit**: `feat: implement DeathService for comprehensive death statistics`

---

### Task 1.4: Update QuitCommand to Use DeathService

**Context**: QuitCommand currently calculates death stats inline - refactor to use service

#### Subtasks:
- [ ] Inject DeathService into QuitCommand constructor

- [ ] Replace inline stat calculation with `deathService.calculateDeathStats(state)`

- [ ] Update to use ComprehensiveDeathStats interface

- [ ] Pass comprehensive stats to DeathScreen.show()

- [ ] Remove old DeathStats interface (deprecated)

**Commit**: `refactor: migrate QuitCommand to use DeathService`

---

## Phase 2: UI Layer - Enhanced Death Screen (Priority: HIGH)

**Objective**: Redesign DeathScreen with better layout and multiple options

### Task 2.1: Redesign DeathScreen Layout

**Context**: [src/ui/DeathScreen.ts](../../src/ui/DeathScreen.ts) - Update visual presentation

#### Subtasks:
- [ ] Update DeathStats interface to ComprehensiveDeathStats
  - Import from DeathService
  - Update all type references

- [ ] Redesign modal HTML with three-column stats layout
  - **Column 1**: Progression (Level, XP)
  - **Column 2**: Exploration (Deepest, Levels, Turns)
  - **Column 3**: Combat (Kills, Gold, Items)
  - Use ASCII box drawing for visual separation

- [ ] Add final blow details display
  - Show attacker and damage if available
  - Format: "Killed by Orc (12 damage, 3 HP remaining)"

- [ ] Add achievement display section
  - Show 1-3 achievements if earned
  - Golden color for achievement text
  - Icon/badge before achievement text

- [ ] Add epitaph display (if present)
  - Italic gray text
  - Positioned above permadeath message

- [ ] Make seed text selectable/copyable
  - Change from div to input (readonly)
  - Add "Click to copy" indicator
  - Implement copy to clipboard on click

**Commit**: `feat: redesign death screen layout with enhanced statistics`

---

### Task 2.2: Implement Multi-Option Menu

**Context**: Replace single action with three choices

#### Subtasks:
- [ ] Update DeathScreen.show() signature
  - Change from `onNewGame: () => void`
  - To: `onNewGame: () => void, onReplaySeed: () => void, onQuitToMenu: () => void`

- [ ] Update modal footer HTML
  - Remove single "Press [N]" instruction
  - Add three-option menu:
    ```
    [N] New Game (Random)    [R] Replay Seed    [Q] Quit to Menu
    ```
  - Color code: Green for new, Yellow for replay, Red for quit

- [ ] Update keyboard event handler
  - Handle 'n' key → call onNewGame()
  - Handle 'r' key → call onReplaySeed(seed)
  - Handle 'q' key → call onQuitToMenu()
  - Remove event listener on any choice

- [ ] Add visual hover/focus states
  - Highlight selected option on keypress
  - Optional: Show which key is pressed

**Commit**: `feat: add multi-option menu to death screen`

---

### Task 2.3: Implement Seed Copy to Clipboard

**Context**: Enable easy seed copying for sharing/replay

#### Subtasks:
- [ ] Convert seed display to readonly input element
  - Style to look like regular text
  - Make text selectable

- [ ] Implement click-to-copy functionality
  - Add click event listener to seed input
  - Use navigator.clipboard.writeText() API
  - Show brief "Copied!" message on success

- [ ] Add visual copy indicator
  - Icon or text: "📋 Click to copy"
  - Change to "✓ Copied!" on successful copy
  - Fallback for browsers without clipboard API

- [ ] Test clipboard functionality
  - Test in different browsers
  - Test fallback for unsupported browsers

**Commit**: `feat: implement seed copy-to-clipboard functionality`

---

### Task 2.4: Wire Up Death Screen Actions in InputHandler

**Context**: [src/ui/InputHandler.ts](../../src/ui/InputHandler.ts) - Connect new callbacks

#### Subtasks:
- [ ] Update death screen invocation in InputHandler
  - Pass three callbacks instead of one
  - onNewGame: existing logic (generate new seed, start game)
  - onReplaySeed: new logic (reuse current seed, start game)
  - onQuitToMenu: new logic (return to main menu)

- [ ] Implement onReplaySeed callback
  - Extract current seed from state
  - Reinitialize services with same seed
  - Generate same dungeon layout
  - Start fresh game with identical world

- [ ] Implement onQuitToMenu callback
  - Hide death screen
  - Show main menu
  - Clear current game state

- [ ] Test all three paths
  - Verify new game starts with different seed
  - Verify replay starts with same seed (same dungeon)
  - Verify quit returns to menu properly

**Commit**: `feat: wire up death screen multi-option callbacks`

---

## Phase 3: Main Menu - Seed Input Support (Priority: MEDIUM)

**Objective**: Allow players to start game with custom seed from main menu

### Task 3.1: Add Seed Input to MainMenu

**Context**: [src/ui/MainMenu.ts](../../src/ui/MainMenu.ts) - Add custom seed option

#### Subtasks:
- [ ] Add "Play Custom Seed" menu option
  - Position after "Continue Game"
  - Show only when no save exists (clean state)

- [ ] Create seed input modal
  - Text input field for seed entry
  - Validation: non-empty, alphanumeric + hyphens
  - Preview: "Starting new game with seed: {input}"

- [ ] Add keyboard navigation
  - Arrow keys to navigate options
  - Enter to select
  - Escape to cancel seed input

- [ ] Style seed input modal
  - Consistent with existing modals
  - ASCII border styling
  - Clear instructions

**Commit**: `feat: add custom seed input to main menu`

---

### Task 3.2: Wire Seed Input to Game Initialization

**Context**: [src/main.ts](../../src/main.ts) - Support custom seed parameter

#### Subtasks:
- [ ] Update initializeGame() to accept optional seed parameter
  - Signature: `initializeGame(customSeed?: string)`
  - Use customSeed if provided, else generate timestamp seed

- [ ] Update MainMenu to pass seed from input
  - On "Play Custom Seed" selection
  - Validate seed before passing
  - Show error if invalid

- [ ] Update DeathScreen replay to use same pattern
  - Pass seed to initializeGame()
  - Ensure identical dungeon generation

- [ ] Test seed consistency
  - Same seed → same dungeon layout
  - Same seed → same item/monster placement
  - Different seed → different world

**Commit**: `feat: support custom seed in game initialization`

---

### Task 3.3: Add Seed Display to Main Menu

**Context**: Show current/last played seed in main menu

#### Subtasks:
- [ ] Display seed in "Continue Game" option
  - Show seed below option: "Seed: seed-1234567890"
  - Gray color, small font

- [ ] Add "Last Played Seed" to menu footer
  - Store last seed in localStorage
  - Display even after death/quit
  - Allow quick replay of previous run

- [ ] Implement "Replay Last Seed" quick action
  - Hotkey: [L] to replay last seed
  - Bypass seed input modal
  - Start new game immediately

**Commit**: `feat: display and replay last played seed in main menu`

---

## Phase 4: Polish & Achievements (Priority: LOW)

**Objective**: Add engagement features and visual polish

### Task 4.1: Implement Achievement System

**Context**: Milestone tracking for player engagement

#### Subtasks:
- [ ] Define achievement list
  - "First Steps" - Complete first turn
  - "Deeper Delver" - Reach level 5
  - "Monster Hunter" - Kill 25 monsters
  - "Treasure Seeker" - Collect 1000 gold
  - "Well Equipped" - Find 20 items
  - "Survivor" - Survive 500 turns

- [ ] Create achievement checking logic in DeathService
  - Check each achievement against stats
  - Return array of earned achievements
  - Max 3 displayed on death screen

- [ ] Add visual achievement display
  - Icon/badge before text
  - Golden color (#FFD700)
  - Animation on reveal

- [ ] Store achievement history (optional)
  - Track all-time achievements in localStorage
  - Show total unlocked in main menu

**Commit**: `feat: implement achievement system for death screen`

---

### Task 4.2: Add Epitaph Flavor Text

**Context**: Classic roguelike tradition of death messages

#### Subtasks:
- [ ] Write epitaph variations (5-10 per category)
  - **Combat deaths**: "Here lies Player, who bit off more than they could chew"
  - **Starvation**: "Here lies Player, who forgot to pack lunch"
  - **Trap deaths**: "Here lies Player, who failed to look before leaping"
  - **Generic**: "Here lies Player, another victim of the dungeon"

- [ ] Implement epitaph selection in DeathService
  - Map death cause to epitaph category
  - Random selection within category
  - Format with player details

- [ ] Add epitaph to death screen
  - Display above permadeath message
  - Italic style, gray color
  - Tone: humorous but respectful

**Commit**: `feat: add epitaph flavor text to death messages`

---

### Task 4.3: Visual Polish Pass

**Context**: Final UI refinements

#### Subtasks:
- [ ] Improve ASCII table formatting
  - Align columns properly
  - Add box drawing characters
  - Ensure consistent spacing

- [ ] Add color hierarchy
  - Death title: Bright red (#FF4444)
  - Death cause: Orange (#FF8800)
  - Stats headers: White (#FFFFFF)
  - Stats values: Light gray (#CCCCCC)
  - Achievements: Gold (#FFD700)
  - Actions: Green (#00FF00), Yellow (#FFFF00), Red (#FF4444)

- [ ] Add animations
  - Stats fade in sequentially (stagger)
  - Achievement badge pulse
  - Option hover effect

- [ ] Test responsive layout
  - Ensure modal fits on smaller screens
  - Test with long seed strings
  - Test with long achievement text

**Commit**: `polish: refine death screen visual presentation`

---

### Task 4.4: Add Run History (Optional - Future Enhancement)

**Context**: Track past runs for comparison

#### Subtasks:
- [ ] Create run history data structure
  - Store last 10 runs in localStorage
  - Fields: seed, stats, achievements, timestamp

- [ ] Add "View Past Runs" option in main menu
  - Display table of previous attempts
  - Show key stats: level reached, turns survived, gold
  - Allow seed replay from history

- [ ] Implement run comparison
  - Highlight personal bests
  - Show improvement over time
  - "This was your best run!" messages

**Commit**: `feat: add run history tracking and display`

---

## Testing Strategy

### Unit Tests (Jest)

**DeathService Tests** (`DeathService.test.ts`):
- ✅ Calculates all statistics correctly from GameState
- ✅ Determines achievements based on milestones
- ✅ Generates appropriate epitaphs for death types
- ✅ Handles missing optional fields gracefully
- ✅ Formats numbers with thousands separators

**Updated Service Tests**:
- ✅ CombatService increments monstersKilled on kill
- ✅ PickUpCommand increments itemsFound on pickup
- ✅ UseCommand increments itemsUsed on consumption
- ✅ MoveStairsCommand tracks unique levels

### Integration Tests

**Death Flow Test**:
- ✅ Player death → comprehensive stats calculated
- ✅ Death screen displays all statistics
- ✅ All three menu options functional
- ✅ Seed replay generates identical dungeon
- ✅ New game generates different seed

**Seed Replay Test**:
- ✅ Same seed → identical dungeon layout
- ✅ Same seed → identical monster placement
- ✅ Same seed → identical item spawns
- ✅ Seed from death screen matches game seed

### Manual Testing Checklist

- [ ] Death screen displays correctly with all stats
- [ ] Final blow details accurate (damage, attacker, HP)
- [ ] Achievements display for appropriate milestones
- [ ] Epitaph matches death cause
- [ ] Seed is selectable and copyable
- [ ] [N] starts new game with random seed
- [ ] [R] replays current seed (same dungeon)
- [ ] [Q] returns to main menu
- [ ] Main menu seed input works correctly
- [ ] Custom seed generates expected dungeon
- [ ] Visual layout responsive and aligned
- [ ] Colors and styling match design

---

## Success Criteria

**UX Improvements**:
- ✅ Players have 3 meaningful choices after death
- ✅ Seed replay generates identical dungeons
- ✅ Statistics provide run context and reflection
- ✅ Achievements provide goals beyond victory

**Technical Quality**:
- ✅ DeathService centralizes death logic (SRP)
- ✅ No logic in UI layer (separation of concerns)
- ✅ All statistics tracked immutably
- ✅ 80%+ test coverage on new code

**Visual Polish**:
- ✅ Clean three-column stats layout
- ✅ Proper ASCII table formatting
- ✅ Color hierarchy enhances readability
- ✅ Responsive on various screen sizes

**Engagement**:
- ✅ Players can compare runs via statistics
- ✅ Achievements encourage varied playstyles
- ✅ Epitaphs add flavor without being preachy
- ✅ Seed replay enables practice/sharing

---

## Timeline Estimate

- **Phase 1** (Data Layer): 2-3 hours
  - Task 1.1: 30 min (GameState updates)
  - Task 1.2: 45 min (stat tracking)
  - Task 1.3: 60 min (DeathService creation)
  - Task 1.4: 30 min (QuitCommand refactor)

- **Phase 2** (UI Layer): 2-3 hours
  - Task 2.1: 60 min (layout redesign)
  - Task 2.2: 45 min (multi-option menu)
  - Task 2.3: 30 min (clipboard functionality)
  - Task 2.4: 45 min (callback wiring)

- **Phase 3** (Main Menu): 1-2 hours
  - Task 3.1: 45 min (seed input UI)
  - Task 3.2: 45 min (initialization wiring)
  - Task 3.3: 30 min (seed display)

- **Phase 4** (Polish): 1-2 hours
  - Task 4.1: 45 min (achievements)
  - Task 4.2: 30 min (epitaphs)
  - Task 4.3: 45 min (visual polish)
  - Task 4.4: Optional future work

**Total Estimated Time**: 6-10 hours (spread across phases)

---

## Future Enhancements (Not in Scope)

- **Run History Dashboard** - Track and compare past 100 runs
- **Leaderboards** - Share scores with other players
- **Death Replays** - Watch final moments before death
- **Morgue Files** - Generate shareable death summaries
- **Steam Achievements** - If ported to Steam
- **Death Statistics Analytics** - What kills players most?

---

## References

- [CLAUDE.md - UI Layer](../../CLAUDE.md#architecture-patterns) - Zero logic in UI rule
- [architecture.md - Service Layer](../../docs/architecture.md#service-layer) - Service patterns
- [VictoryScreen.ts](../../src/ui/VictoryScreen.ts) - End screen reference
- [VictoryService.ts](../../src/services/VictoryService/VictoryService.ts) - Stats calculation pattern
- [DeathScreen.ts](../../src/ui/DeathScreen.ts) - Current implementation

---

**Last Updated**: 2025-10-06
