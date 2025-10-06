# Scroll UI Enhancement Requirements

**Version**: 1.0
**Last Updated**: 2025-10-06
**Status**: Planning - Requirements Documented
**Related**: [Scroll Implementation Plan](./scroll_implementation_plan.md) | [ScrollService](../services/ScrollService.md)

---

## Overview

This document outlines UI enhancements needed to complete the scroll system implementation (Phase 6, Task 15). While the backend scroll logic is complete (1885 tests passing), several UI improvements are needed for better player experience.

---

## 1. Direction Prompts for HOLD_MONSTER

### Current State
- `HOLD_MONSTER` requires adjacent monster target
- No UI for selecting direction/monster
- Players must know monster ID (not intuitive)

### Required Enhancement

**Feature**: Direction-based monster targeting

**Implementation**:
1. After player reads `HOLD_MONSTER` scroll:
   - Display prompt: `"Hold which monster? (direction or ESC to cancel)"`
   - Show valid directions with monsters: `"[N][NE][E][SE][S][SW][W][NW]"`

2. Player presses direction key (arrow keys or numpad):
   - `↑` or `8` = North
   - `↗` or `9` = Northeast
   - `→` or `6` = East
   - `↘` or `3` = Southeast
   - `↓` or `2` = South
   - `↙` or `1` = Southwest
   - `←` or `4` = West
   - `↖` or `7` = Northwest

3. Validate selection:
   - If monster at that position → apply HOLD effect
   - If no monster → show "No monster in that direction" and re-prompt
   - If player presses ESC → cancel scroll read, no turn consumed

**UI Components**:
- `DirectionPrompt` component
- Direction-to-position mapper utility
- Monster position validator

**Files to Modify**:
- `src/ui/components/DirectionPrompt.ts` (new file)
- `src/ui/GameUI.ts` (integrate direction prompt)
- `src/commands/ReadCommand/ReadCommand.ts` (handle direction input)

**Example Flow**:
```
Player: 'r' (read scroll)
UI: "Read which scroll? [a-z]"
Player: 'a' (HOLD_MONSTER scroll)
UI: "Hold which monster? [↑←→↓] or ESC to cancel"
Player: '↑' (north direction)
System: Check (x, y-1) for monster
  - If monster found → Hold monster, consume scroll, take turn
  - If no monster → "No monster there", re-prompt
Player: ESC (cancel)
System: Return to game, no turn consumed
```

**Benefits**:
- More intuitive than typing monster IDs
- Consistent with other directional commands (attack, move)
- Clear visual feedback of available targets

---

## 2. Item Selection UI for Targeted Scrolls

### Current State
✅ **Already Implemented** - Inventory selection UI exists for:
- `IDENTIFY` scroll → Select item to identify
- `ENCHANT_WEAPON` scroll → Select weapon
- `ENCHANT_ARMOR` scroll → Select armor

### Verification Needed
- [ ] Test item selection UI with all targeted scrolls
- [ ] Ensure clear prompts: "Identify which item?", "Enchant which weapon?"
- [ ] Verify ESC cancels without consuming scroll or turn

**No additional work needed** if existing UI already handles these cases properly.

---

## 3. Visual Indicator for Scare Scroll on Ground

### Current State
- `SCARE_MONSTER` scrolls can be dropped on ground
- No visual distinction from other scrolls on floor
- Players can't easily identify protective zones

### Required Enhancement

**Feature**: Special rendering for active scare scrolls

**Implementation Options**:

#### Option A: Special Character (Simple)
- Render scare scrolls with special character: `Ω` or `☠` instead of `?`
- Use distinct color: `#FF6600` (orange/red warning)
- Easy to implement, minimal changes

#### Option B: Tile Highlighting (Medium)
- Highlight tile containing scare scroll
- Border effect: `█` characters around tile
- Color: Pulsing orange/red (`#FF6600` ↔ `#FF9933`)

#### Option C: Area Effect Indicator (Complex)
- Show "aura" around scare scroll tile
- Adjacent tiles have dimmed highlight
- Visual representation of monster avoidance zone

**Recommended**: **Option A** (simple, effective)

**UI Components**:
- Modify `RenderService.renderItem()` or similar
- Check if item is `SCARE_MONSTER` scroll with `droppedAtTurn` property
- Apply special rendering

**Files to Modify**:
- `src/services/RenderService/RenderService.ts` (item rendering)
- Add constants for scare scroll character/color
- Check `item.type === ItemType.SCROLL && item.scrollType === ScrollType.SCARE_MONSTER && item.droppedAtTurn !== undefined`

**Example Rendering**:
```
Normal scroll on floor:     ?  (white)
Scare scroll on floor:      Ω  (orange #FF6600)
                        or  ☠  (red #FF3300)
```

**Benefits**:
- Players can see protected zones at a glance
- Strategic placement becomes more visible
- Clearer feedback on scroll deterioration (when it disappears)

**Deterioration Feedback**:
- When scroll reaches 100 turns → flash red briefly before removal
- Message: "The scare scroll crumbles to dust!"

---

## 4. Status Effect Icons in Player Stats

### Current State
- Status effects stored in `player.statusEffects[]`
- No visual indication in UI
- Players must rely on messages ("You fall asleep!")

### Required Enhancement

**Feature**: Status effect icons/indicators in player stats display

**Status Effects to Display**:

| Effect | Icon | Color | Duration Display |
|--------|------|-------|------------------|
| **SLEEPING** | `💤` or `Zzz` | `#6699FF` (blue) | Show turns remaining |
| **CONFUSED** | `?` or `⁇` | `#FF66FF` (magenta) | Show turns remaining |
| **BLIND** | `👁️` or `⊗` | `#333333` (dark gray) | Show turns remaining |
| **HASTED** | `⚡` or `»»` | `#FFFF00` (yellow) | Show turns remaining |
| **LEVITATING** | `☁️` or `∽` | `#99CCFF` (light blue) | Show turns remaining |
| **HELD** | `❄️` or `∥` | `#00CCFF` (cyan) | Show turns remaining |
| **POISONED** | `☠️` or `⚠` | `#00FF00` (green) | Show turns remaining |

**UI Layout**:

```
┌─────────────────────────────────┐
│ HP: 28/30  Str: 16/16  AC: 4    │
│ Level: 3   XP: 100   Gold: 50   │
│ Hunger: ████████░░ (800/1500)   │
│ Status: 💤 Sleep (3) ⚡ Haste (5) │  ← NEW
└─────────────────────────────────┘
```

**Implementation**:

1. **Status Line Component**:
   ```typescript
   renderStatusEffects(player: Player): string {
     if (player.statusEffects.length === 0) return ''

     const icons = player.statusEffects.map(effect => {
       const icon = STATUS_EFFECT_ICONS[effect.type]
       const color = STATUS_EFFECT_COLORS[effect.type]
       const turns = effect.duration
       return `<span style="color: ${color}">${icon} ${turns}</span>`
     })

     return `Status: ${icons.join(' ')}`
   }
   ```

2. **Constants File**:
   ```typescript
   // src/constants/statusEffects.ts
   export const STATUS_EFFECT_ICONS: Record<StatusEffectType, string> = {
     [StatusEffectType.SLEEPING]: '💤',
     [StatusEffectType.CONFUSED]: '⁇',
     [StatusEffectType.BLIND]: '⊗',
     [StatusEffectType.HASTED]: '⚡',
     [StatusEffectType.LEVITATING]: '☁️',
     [StatusEffectType.HELD]: '❄️',
     [StatusEffectType.POISONED]: '☠️',
   }

   export const STATUS_EFFECT_COLORS: Record<StatusEffectType, string> = {
     [StatusEffectType.SLEEPING]: '#6699FF',
     [StatusEffectType.CONFUSED]: '#FF66FF',
     [StatusEffectType.BLIND]: '#333333',
     [StatusEffectType.HASTED]: '#FFFF00',
     [StatusEffectType.LEVITATING]: '#99CCFF',
     [StatusEffectType.HELD]: '#00CCFF',
     [StatusEffectType.POISONED]: '#00FF00',
   }
   ```

**Files to Modify**:
- `src/ui/components/PlayerStats.ts` (or equivalent)
- `src/constants/statusEffects.ts` (new file)
- `src/ui/GameUI.ts` (integrate status display)

**Tooltip Enhancement** (Optional):
- Hover over status icon → show full description
- Example: Hover `💤` → "Sleeping (3 turns remaining): Cannot act"

**Benefits**:
- Immediate visual feedback on active effects
- Players can plan actions based on duration
- Consistent with roguelike tradition (e.g., NetHack status line)

---

## Implementation Priority

### Phase 1: Critical (Required for v1.0)
1. ✅ **Item Selection UI** - Already complete
2. 🔴 **Direction Prompts for HOLD_MONSTER** - Required for playability
3. 🟠 **Scare Scroll Visual Indicator** - Important for strategy

### Phase 2: Nice-to-Have (Post v1.0)
4. 🟡 **Status Effect Icons** - QoL improvement, not critical

---

## Testing Requirements

### Manual Testing Checklist

#### Direction Prompts
- [ ] Read HOLD_MONSTER scroll
- [ ] Verify direction prompt appears
- [ ] Test all 8 directions (N, NE, E, SE, S, SW, W, NW)
- [ ] Test with monster at target position (should apply hold)
- [ ] Test with no monster at target position (should show error)
- [ ] Test ESC cancel (should not consume scroll or turn)

#### Scare Scroll Indicator
- [ ] Drop SCARE_MONSTER scroll on ground
- [ ] Verify special rendering (character/color)
- [ ] Wait 100+ turns
- [ ] Verify scroll disappears with message

#### Status Effect Icons
- [ ] Trigger each status effect (Sleep, Confusion, Blindness, Haste, Levitation)
- [ ] Verify icon appears in status line
- [ ] Verify duration countdown matches actual turns
- [ ] Verify icon disappears when effect expires
- [ ] Test multiple simultaneous effects

### Automated Testing

**UI Tests Needed**:
- `DirectionPrompt.test.ts` - Direction selection logic
- `StatusEffectDisplay.test.ts` - Icon rendering for each effect
- `ScareScrollRenderer.test.ts` - Special rendering logic

**Integration Tests Needed**:
- `HoldMonsterUI.test.ts` - Full flow from scroll read to monster hold
- `StatusLineIntegration.test.ts` - Status effects appear correctly

---

## Dependencies

### Required Services (Already Implemented)
- ✅ `ScrollService` - Scroll effect logic
- ✅ `StatusEffectService` - Status effect management
- ✅ `LevelService` - Scare scroll tracking
- ✅ `InventoryService` - Item selection

### New Components Needed
- `DirectionPrompt` component
- `StatusEffectDisplay` component
- Status effect constants file

### Files to Create
- `src/ui/components/DirectionPrompt.ts`
- `src/constants/statusEffects.ts`

### Files to Modify
- `src/ui/GameUI.ts`
- `src/ui/components/PlayerStats.ts`
- `src/services/RenderService/RenderService.ts`
- `src/commands/ReadCommand/ReadCommand.ts`

---

## Design Rationale

### Why Direction-Based Targeting?
**Alternative**: Monster ID selection (current)
**Problem**: Not intuitive, requires memorizing IDs
**Solution**: Direction keys match movement controls (consistent UX)

### Why Special Scare Scroll Rendering?
**Alternative**: No visual distinction
**Problem**: Players can't identify protected zones
**Solution**: Clear visual feedback enables strategic play

### Why Status Icons?
**Alternative**: Message log only
**Problem**: Messages scroll away, no persistent indicator
**Solution**: Always-visible status line matches roguelike tradition

---

## Future Enhancements (Post v1.0)

### Advanced UI Features
1. **Scare Scroll Aura**: Animated pulsing effect around scare scroll tiles
2. **Status Effect Tooltips**: Hover for detailed effect descriptions
3. **Scroll Hotkeys**: Quick-select scrolls by effect type (e.g., `Shift+T` for teleport)
4. **Visual Range Indicators**: Show HOLD_MONSTER range (adjacent tiles highlighted)
5. **Scroll Usage History**: Track which scrolls used this game (for learning)

### Accessibility
1. **Colorblind Mode**: Alternative color schemes for status effects
2. **ASCII Fallback**: Non-emoji icons for terminal compatibility
3. **Screen Reader Support**: Announce status effects and prompts

---

## Related Documentation

- **[Scroll Implementation Plan](./scroll_implementation_plan.md)** - Backend implementation complete
- **[ScrollService](../services/ScrollService.md)** - Service layer algorithms
- **[Game Design: Items](../game-design/05-items.md)** - Item system design
- **[Scroll Reference](../game-design/scroll-reference.md)** - Quick lookup table

---

## Version History

- **1.0** (2025-10-06) - Initial requirements documented
  - Direction prompts for HOLD_MONSTER
  - Scare scroll visual indicator
  - Status effect icons
  - Implementation priority and testing checklist
