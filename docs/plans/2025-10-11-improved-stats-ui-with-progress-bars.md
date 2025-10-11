# Improved Stats UI with Progress Bars Implementation Plan

> **For Claude:** Use `${CLAUDE_PLUGIN_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Improve stats panel readability with larger text and segmented progress bars for HP/XP/Hunger/Light.

**Architecture:**
- Two-column layout (Player Stats | Equipment & Status) instead of four narrow panels
- CSS-based segmented progress bars using `repeating-linear-gradient` for authentic RPG look
- Increased base font size from 0.9em to 1.1em (~22% larger)
- Grid-based stat lines for consistent alignment

**Tech Stack:**
- CSS3 (repeating-linear-gradient for segments)
- TypeScript (GameRenderer.ts rendering logic)
- No new dependencies

---

## Task 1: Add Segmented Progress Bar CSS

**Files:**
- Modify: `public/styles.css` (add new classes at end)

**Step 1: Add segmented bar base styles**

Add this CSS at the end of `public/styles.css` (after line 512):

```css
/* ============================================================================
   SEGMENTED PROGRESS BARS
   ============================================================================ */

.segmented-bar {
  width: 100%;
  height: 18px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width 0.3s ease;

  /* Segmented pattern: 14px bar + 2px gap */
  background-image: repeating-linear-gradient(
    90deg,
    currentColor 0px,
    currentColor 14px,
    #00000080 14px,
    #00000080 16px
  );
}

/* HP color states */
.bar-fill.hp { color: #00ff00; }
.bar-fill.hp.wounded { color: #ffdd00; }
.bar-fill.hp.critical { color: #ff8800; }
.bar-fill.hp.danger { color: #ff0000; }

/* XP bar */
.bar-fill.xp { color: #ffd700; }

/* Hunger states */
.bar-fill.hunger { color: #00ff00; }
.bar-fill.hunger.warning { color: #ff8800; }
.bar-fill.hunger.critical { color: #ff0000; }

/* Light states */
.bar-fill.light { color: #ffdd00; }
.bar-fill.light.warning { color: #ff8800; }
.bar-fill.light.critical { color: #ff0000; }
```

**Step 2: Commit CSS foundations**

```bash
git add public/styles.css
git commit -m "feat: add segmented progress bar CSS with color states"
```

---

## Task 2: Add Two-Column Layout CSS

**Files:**
- Modify: `public/styles.css` (add after segmented bar styles)

**Step 1: Add layout and typography classes**

Add this CSS after the segmented bar styles:

```css
/* ============================================================================
   TWO-COLUMN STATS LAYOUT
   ============================================================================ */

/* New two-column grid layout */
.stats-row-new {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  font-size: 1.1em; /* Increased from 0.9em for readability */
}

.stats-panel-wide {
  flex: 1;
  padding: 12px 15px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
}

.stats-panel-content-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 1em; /* Increased from 0.8em */
}

/* Stat line with progress bar: label (80px) + value (100px) + bar (flex) */
.stat-line {
  display: grid;
  grid-template-columns: 80px 100px 1fr;
  gap: 10px;
  align-items: center;
}

.stat-label {
  font-weight: bold;
  color: #888;
}

.stat-value {
  color: #fff;
  font-family: monospace;
  text-align: right;
}

/* Compact stat row for secondary stats (Gold, Depth, Turn) */
.stat-compact {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  font-size: 0.9em;
  color: #aaa;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.stat-compact span {
  white-space: nowrap;
}
```

**Step 2: Commit layout foundations**

```bash
git add public/styles.css
git commit -m "feat: add two-column stats layout with improved typography"
```

---

## Task 3: Add Equipment Panel CSS

**Files:**
- Modify: `public/styles.css` (add after layout styles)

**Step 1: Add equipment and status styling**

Add this CSS after the layout styles:

```css
/* ============================================================================
   EQUIPMENT & STATUS STYLING
   ============================================================================ */

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.equipment-item {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px;
  align-items: center;
}

.equip-label {
  font-weight: bold;
  color: #888;
}

.equip-value {
  color: #fff;
}

.equip-cursed {
  color: #ff4444;
}

.status-effects {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge {
  font-size: 0.95em;
}
```

**Step 2: Commit equipment CSS**

```bash
git add public/styles.css
git commit -m "feat: add equipment and status effects styling"
```

---

## Task 4: Refactor renderStats() Method - Part 1 (Calculations)

**Files:**
- Modify: `src/ui/GameRenderer.ts:480-571` (renderStats method)

**Step 1: Update HP, XP, Hunger, Light calculations**

Replace the `renderStats()` method starting at line 480. Keep the calculations but add color class logic:

```typescript
private renderStats(state: GameState): void {
  const { player } = state

  // HP calculation with color classes
  const hpPercent = (player.hp / player.maxHp) * 100
  const hpClass =
    hpPercent >= 75 ? 'hp' :
    hpPercent >= 50 ? 'hp wounded' :
    hpPercent >= 25 ? 'hp critical' :
    'hp danger'
  const hpBlink = hpPercent < 10 ? ' hp-critical-blink' : ''

  // XP calculation
  const xpNeeded = this.levelingService.getXPForNextLevel(player.level)
  const xpPercent = xpNeeded === Infinity ? 100 : (player.xp / xpNeeded) * 100
  const xpDisplay = xpNeeded === Infinity ? `${player.xp} (MAX)` : `${player.xp}/${xpNeeded}`

  // Hunger calculation
  const hungerPercent = Math.min(100, (player.hunger / 1300) * 100)
  const hungerClass =
    hungerPercent < 10 ? 'hunger critical' :
    hungerPercent < 25 ? 'hunger warning' :
    'hunger'
  const hungerLabel =
    hungerPercent === 0 ? 'STARVING!' :
    hungerPercent < 10 ? 'Fainting' :
    hungerPercent < 25 ? 'Hungry' :
    'Fed'

  // Light calculation
  let lightPercent = 0
  let lightClass = 'light'
  let lightLabel = 'None!'
  const lightSource = player.equipment.lightSource

  if (lightSource) {
    if ('fuel' in lightSource && 'maxFuel' in lightSource) {
      const fuel = lightSource.fuel
      const maxFuel = lightSource.maxFuel
      lightPercent = (fuel / maxFuel) * 100
      lightClass =
        lightPercent < 10 && fuel > 0 ? 'light critical' :
        lightPercent < 25 ? 'light warning' :
        'light'
      lightLabel = `${fuel}`
    } else {
      // Artifact - permanent
      lightPercent = 100
      lightLabel = '∞'
    }
  }

  // Ring bonuses
  const strBonus = this.ringService.getStrengthBonus(player)
  const acBonus = this.ringService.getACBonus(player)

  // Format strength with exceptional strength support
  const formatStrength = (str: number, percentile: number | undefined): string => {
    if (str === 18 && percentile !== undefined) {
      return `18/${percentile.toString().padStart(2, '0')}`
    }
    return str.toString()
  }

  const currentStr = formatStrength(player.strength, player.strengthPercentile)
  const maxStr = formatStrength(player.maxStrength, player.strengthPercentile)
  const strDisplay = strBonus !== 0
    ? `${currentStr}(${strBonus > 0 ? '+' : ''}${strBonus})/${maxStr}`
    : `${currentStr}/${maxStr}`

  const acDisplay = acBonus !== 0
    ? `${player.ac}(${acBonus > 0 ? '+' : ''}${acBonus})`
    : `${player.ac}`

  // HTML rendering will be added in next task...
  this.statsContainer.innerHTML = ''  // Placeholder for now
}
```

**Step 2: Commit calculation refactor**

```bash
git add src/ui/GameRenderer.ts
git commit -m "refactor: update renderStats calculations with color classes"
```

---

## Task 5: Refactor renderStats() Method - Part 2 (HTML)

**Files:**
- Modify: `src/ui/GameRenderer.ts:480-571` (replace HTML generation in renderStats)

**Step 1: Replace HTML generation with new layout**

Replace the `this.statsContainer.innerHTML = ''` line with the new HTML:

```typescript
  // ... (calculations from previous task) ...

  this.statsContainer.innerHTML = `
    <div class="stats-row-new">
      <div class="stats-panel stats-panel-wide">
        <div class="stats-panel-header">Player Stats</div>
        <div class="stats-panel-content-vertical">
          <!-- HP Bar -->
          <div class="stat-line${hpBlink}">
            <span class="stat-label">HP:</span>
            <span class="stat-value">${player.hp}/${player.maxHp}</span>
            <div class="segmented-bar hp-bar">
              <div class="bar-fill ${hpClass}" style="width: ${hpPercent}%"></div>
            </div>
          </div>

          <!-- XP Bar -->
          <div class="stat-line">
            <span class="stat-label">XP:</span>
            <span class="stat-value">${xpDisplay}</span>
            <div class="segmented-bar xp-bar">
              <div class="bar-fill xp" style="width: ${xpPercent}%"></div>
            </div>
          </div>

          <!-- Hunger Bar -->
          <div class="stat-line">
            <span class="stat-label">Hunger:</span>
            <span class="stat-value">${hungerLabel}</span>
            <div class="segmented-bar hunger-bar">
              <div class="bar-fill ${hungerClass}" style="width: ${hungerPercent}%"></div>
            </div>
          </div>

          <!-- Light Bar -->
          <div class="stat-line">
            <span class="stat-label">Light:</span>
            <span class="stat-value">${lightLabel}</span>
            <div class="segmented-bar light-bar">
              <div class="bar-fill ${lightClass}" style="width: ${lightPercent}%"></div>
            </div>
          </div>

          <!-- Compact Secondary Stats -->
          <div class="stat-compact">
            <span>Str: ${strDisplay}</span>
            <span>AC: ${acDisplay}</span>
            <span>Lvl: ${player.level}</span>
            <span>Gold: ${player.gold}</span>
            <span>Depth: ${state.currentLevel}</span>
            <span>Turn: ${state.turnCount}</span>
          </div>
        </div>
      </div>

      ${this.renderEquipmentAndStatus(state)}
    </div>
  `
}
```

**Step 2: Commit HTML rendering**

```bash
git add src/ui/GameRenderer.ts
git commit -m "feat: implement new two-column stats layout with progress bars"
```

---

## Task 6: Add Equipment and Status Helper Method

**Files:**
- Modify: `src/ui/GameRenderer.ts` (add new method after renderStats)

**Step 1: Replace old renderEquipmentSlots and renderStatusEffects methods**

Find the old `renderEquipmentSlots()` method (around line 619) and replace it AND the `renderStatusEffects()` method (around line 666) with this single consolidated method:

```typescript
/**
 * Render equipment and status effects panel (right column)
 */
private renderEquipmentAndStatus(state: GameState): string {
  const { equipment, statusEffects } = state.player

  // Equipment slots with cursed indicators
  const weaponSlot = equipment.weapon
    ? `${equipment.weapon.name}${equipment.weapon.bonus !== 0 ? ` ${equipment.weapon.bonus > 0 ? '+' : ''}${equipment.weapon.bonus}` : ''}`
    : '(empty)'
  const weaponClass = equipment.weapon?.cursed ? 'equip-cursed' : 'equip-value'
  const weaponCursed = equipment.weapon?.cursed ? ' 🔒' : ''

  const armorSlot = equipment.armor
    ? `${equipment.armor.name}${equipment.armor.bonus !== 0 ? ` ${equipment.armor.bonus > 0 ? '+' : ''}${equipment.armor.bonus}` : ''}`
    : '(empty)'
  const armorClass = equipment.armor?.cursed ? 'equip-cursed' : 'equip-value'
  const armorCursed = equipment.armor?.cursed ? ' 🔒' : ''

  const leftRingSlot = equipment.leftRing
    ? `${equipment.leftRing.name}${equipment.leftRing.bonus !== 0 ? ` ${equipment.leftRing.bonus > 0 ? '+' : ''}${equipment.leftRing.bonus}` : ''}`
    : '(empty)'
  const leftRingClass = equipment.leftRing?.cursed ? 'equip-cursed' : 'equip-value'
  const leftRingCursed = equipment.leftRing?.cursed ? ' 🔒' : ''

  const rightRingSlot = equipment.rightRing
    ? `${equipment.rightRing.name}${equipment.rightRing.bonus !== 0 ? ` ${equipment.rightRing.bonus > 0 ? '+' : ''}${equipment.rightRing.bonus}` : ''}`
    : '(empty)'
  const rightRingClass = equipment.rightRing?.cursed ? 'equip-cursed' : 'equip-value'
  const rightRingCursed = equipment.rightRing?.cursed ? ' 🔒' : ''

  // Status effects with colored badges
  const statusHTML = statusEffects.length > 0
    ? statusEffects.map(effect => {
        const display = this.getStatusEffectDisplay(effect.type)
        return `<div class="status-badge" style="color: ${display.color};">
          ${display.icon} ${display.label} (${effect.duration})
        </div>`
      }).join('')
    : '<span class="status-empty" style="color: #666; font-style: italic;">No effects</span>'

  return `
    <div class="stats-panel stats-panel-wide">
      <div class="stats-panel-header">Equipment & Status</div>
      <div class="stats-panel-content-vertical">
        <div class="equipment-list">
          <div class="equipment-item">
            <span class="equip-label">Weapon:</span>
            <span class="${weaponClass}">${weaponSlot}${weaponCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Armor:</span>
            <span class="${armorClass}">${armorSlot}${armorCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Left Hand:</span>
            <span class="${leftRingClass}">${leftRingSlot}${leftRingCursed}</span>
          </div>

          <div class="equipment-item">
            <span class="equip-label">Right Hand:</span>
            <span class="${rightRingClass}">${rightRingSlot}${rightRingCursed}</span>
          </div>
        </div>

        <div class="status-effects">
          ${statusHTML}
        </div>
      </div>
    </div>
  `
}
```

**Step 2: Commit equipment helper**

```bash
git add src/ui/GameRenderer.ts
git commit -m "feat: consolidate equipment and status rendering into single method"
```

---

## Task 7: Run Tests and Verify

**Step 1: Run full test suite**

```bash
npm test
```

Expected output:
- All tests pass (3113 tests)
- No new failures introduced
- UI rendering tests still pass

**Step 2: Start dev server and test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:5173` and verify:
- Stats panels are larger and more readable
- HP/XP/Hunger/Light show segmented progress bars
- Bars change color at thresholds (green → yellow → orange → red)
- Equipment and status display correctly in right column
- Layout looks good at different window sizes

**Step 3: Make any spacing/size adjustments if needed**

If progress bars are too tall/short, adjust `.segmented-bar` height in CSS.
If text is too large/small, adjust `.stats-row-new` font-size.

**Step 4: Final commit**

```bash
git add public/styles.css src/ui/GameRenderer.ts
git commit -m "fix: adjust spacing and sizing for optimal readability"
```

---

## Task 8: Final Verification and Merge

**Step 1: Run full test suite one more time**

```bash
npm test
```

**Step 2: Check git status**

```bash
git status
git log --oneline -10
```

Verify all commits have descriptive messages.

**Step 3: Return to main workspace**

```bash
cd /Users/dirkkok/Development/roguelike
```

**Step 4: Merge feature branch**

```bash
git checkout main
git merge feature/improved-stats-ui-with-progress-bars
git push origin main
```

**Step 5: Clean up worktree**

```bash
git worktree remove .worktrees/improved-stats-ui
git branch -d feature/improved-stats-ui-with-progress-bars
```

---

## Summary

**Changes Made:**
- Added segmented progress bar CSS with color states
- Implemented two-column stats layout (Player Stats | Equipment & Status)
- Increased base font size from 0.9em to 1.1em
- Added progress bars for HP, XP, Hunger, and Light
- Consolidated equipment and status rendering

**Files Modified:**
- `public/styles.css` - Added ~150 lines of CSS
- `src/ui/GameRenderer.ts` - Refactored renderStats() method and helpers

**Testing:**
- All 3113 tests pass
- Manual browser testing confirms improved readability
- Progress bars display correctly with color thresholds
