# Manual Playtest Checklist - 26 Levels Implementation

**Date:** 2025-10-11
**Branch:** feature/26-levels-authentic-rogue
**Purpose:** Verify all features work correctly in the 26-level implementation

---

## Pre-Test Setup

- [ ] Run `npm run dev` to start dev server
- [ ] Open browser to `http://localhost:5173` (or displayed URL)
- [ ] Start a new game
- [ ] Verify game loads without errors

---

## Part 1: Descent Journey (Levels 1 → 26)

### Level 1-4: Early Game (Vorpal Range 0-7)

- [ ] **Monster Spawning**: Only weak monsters spawn (Bat, Snake, Emu, Hobgoblin, Kestrel)
- [ ] **No Bosses**: Verify NO Dragon/Griffin/Jabberwock spawn
- [ ] **Resource Availability**: Find torches and food
- [ ] **Light Fuel**: Starting torch should last ~650 turns
- [ ] **Stairs**: Down stairs visible and functional

### Level 5-9: Mid Game (Vorpal Range 0-12)

- [ ] **Monster Diversity**: See mid-level monsters (Zombie, Orc, Quagga, Rattlesnake)
- [ ] **Still No Bosses**: Verify NO late-game monsters
- [ ] **Lantern Spawns**: Lanterns should start appearing
- [ ] **Oil Flasks**: Oil flasks available (600 turns refill)
- [ ] **Food Frequency**: Notice food spawning more frequently (~11%)

### Level 10-14: Mid-Deep (Vorpal Range 4-17)

- [ ] **Stronger Monsters**: Centaur, Yeti, Aquator, Leprechaun appear
- [ ] **Challenge Increase**: Combat should feel harder
- [ ] **Resource Management**: Test light and food consumption
- [ ] **Level Persistence**: Go down stairs, come back up - verify level unchanged

### Level 15-19: Deep Dungeon (Vorpal Range 9-22)

- [ ] **Dangerous Monsters**: Venus Flytrap, Troll, Nymph spawn
- [ ] **Some Late-Game Monsters**: Wraith, Medusa, Phantom may appear
- [ ] **Food Scaling**: Food spawn rate should be ~13%
- [ ] **Light Management**: Multiple torches/lanterns in inventory

### Level 20-25: Near Bottom (Vorpal Range 14-25)

- [ ] **Boss-Tier Monsters**: See Wraith, Vampire, Ice Monster, Ur-vile
- [ ] **High Difficulty**: Combat is very challenging
- [ ] **Dragons Possible**: Dragon/Griffin may spawn (vorpal 24)
- [ ] **Resource Scarcity**: Light and food management critical

### Level 26: The Deepest Level (Vorpal Range 20-25)

- [ ] **Boss Monsters Only**: Wraith, Medusa, Vampire, Ice Monster, Ur-vile, Dragon, Griffin, Jabberwock
- [ ] **Amulet Spawns**: Find the Amulet of Yendor on the level
- [ ] **No Down Stairs**: Verify no down stairs exist on level 26
- [ ] **Amulet Pickup**: Pick up the Amulet of Yendor
- [ ] **Success Message**: "You have retrieved the Amulet of Yendor! Return to Level 1 to win!"
- [ ] **hasAmulet Flag**: Verify game state shows you have the amulet

---

## Part 2: Ascent Journey (Levels 26 → 1 with Amulet)

### First Ascent to Level 25

- [ ] **Monster Respawn**: Monsters should respawn (different from before)
- [ ] **Full Vorpal Pool**: See BOTH weak and strong monsters (vorpal 0-25)
- [ ] **Increased Difficulty**: Mixed monster pool makes ascent harder
- [ ] **Level State**: Level layout unchanged, only monsters respawned

### Ascent to Level 20

- [ ] **Continued Respawn**: Monsters respawn on first visit with Amulet
- [ ] **No Re-Respawn**: Go down to 21, back up to 20 - monsters unchanged
- [ ] **levelsVisitedWithAmulet**: Each level respawns only once

### Ascent to Level 10

- [ ] **Mid-Journey Verification**: Monsters respawned
- [ ] **Resource Consumption**: Monitor light and food usage
- [ ] **Inventory Management**: Test light source stacking

### Ascent to Level 5

- [ ] **Nearly Home**: Continue verifying monster respawn
- [ ] **Return Messages**: Contextual messages about climbing toward surface

### Reach Level 1

- [ ] **Victory Check**: Verify victory is NOT triggered until on level 1
- [ ] **Stairs Up Present**: Up stairs should exist but lead nowhere
- [ ] **Use Stairs Up**: Attempt to use up stairs on level 1

### Victory!

- [ ] **Victory Trigger**: Standing on level 1 with Amulet triggers win
- [ ] **Victory Message**: "You have escaped the dungeon with the Amulet of Yendor! YOU WIN!"
- [ ] **Victory Screen**: Victory screen displays with stats
- [ ] **Final Stats**: Turn count, monsters killed, gold collected, XP level displayed

---

## Part 3: Resource Balance Testing

### Light Management

- [ ] **Torch Lifespan**: Torches last ~650 turns (verify with debug console)
- [ ] **Lantern Lifespan**: Lanterns start with 750, hold max 1500
- [ ] **Oil Refill**: Oil flasks provide 600 turns of fuel
- [ ] **Spawn Rates**: Find enough torches/oil to survive 52-level journey
- [ ] **Light Source Stacking**: Inventory shows "Torch (×3, 1950 turns)" format

### Food Management

- [ ] **Hunger Rate**: Monitor hunger consumption over ~50 turns
- [ ] **Food Spawning**: Food should appear frequently enough
- [ ] **Depth Scaling**: Notice more food on deeper levels (10% → 15%)
- [ ] **Survival**: Verify you can survive the full journey without starving

### Inventory Stacking

- [ ] **Torch Stacking**: Multiple torches with same fuel stack together
- [ ] **Torch Separation**: Torches with different fuel amounts stay separate
- [ ] **Oil Stacking**: Multiple oil flasks stack together
- [ ] **Display Format**: Verify "Item (×quantity, total turns)" format
- [ ] **Mixed Inventory**: Non-stackable items remain individual

---

## Part 4: Level Persistence Testing

### Descent Without Amulet

- [ ] **Drop Item**: Drop an item on level 10
- [ ] **Descend**: Go down to level 11
- [ ] **Return**: Go back up to level 10
- [ ] **Item Present**: Dropped item still there
- [ ] **Monsters Unchanged**: Same monsters in same state

### Ascent With Amulet

- [ ] **Mark Level**: Note monster positions on level 15
- [ ] **Ascend With Amulet**: Go up to level 14
- [ ] **Descend Back**: Return to level 15
- [ ] **No Re-Respawn**: Monsters should NOT respawn again
- [ ] **Same Monsters**: Same monsters as after first respawn

### Items and Gold

- [ ] **Gold Persistence**: Gold piles remain on levels
- [ ] **Item Persistence**: Items on ground remain where dropped
- [ ] **Equipment Persistence**: Equipped items travel with player

---

## Part 5: Edge Cases and Bugs

### Stairs Navigation

- [ ] **Level 1 Up Stairs**: Cannot ascend from level 1 (surface)
- [ ] **Level 26 Down Stairs**: Cannot descend from level 26 (bottom)
- [ ] **Warning Messages**: Proper error messages for invalid stairs use
- [ ] **FOV Recalculation**: FOV updates correctly after stairs

### Amulet Handling

- [ ] **Cannot Drop**: Verify cannot drop Amulet of Yendor
- [ ] **Inventory Display**: Amulet shows in inventory
- [ ] **Identified Always**: Amulet is always identified
- [ ] **Never Cursed**: Amulet is never cursed

### Monster Spawning

- [ ] **Vorpal Boundaries**: Verify correct monster pools at boundary levels (1, 7, 14, 20, 26)
- [ ] **No Invalid Spawns**: Never see Jabberwock on level 1
- [ ] **Wandering Monsters**: Wandering spawns use correct vorpal range
- [ ] **Respawn Behavior**: Respawned monsters follow cumulative pool [0, depth+3]

---

## Part 6: Performance and Stability

### Performance

- [ ] **Frame Rate**: Game maintains 60+ FPS (check debug overlay)
- [ ] **Load Time**: Game starts in <5 seconds
- [ ] **Stairs Transition**: Level transitions are smooth
- [ ] **No Lag**: No noticeable lag during gameplay

### Stability

- [ ] **No Crashes**: Play for 100+ turns without crashes
- [ ] **No Console Errors**: Check browser console for errors
- [ ] **Memory Leaks**: No memory issues during extended play
- [ ] **Save/Load**: Verify save game works (if implemented)

---

## Part 7: UI and Display

### Rendering Modes

- [ ] **Sprite Mode**: Default rendering works correctly
- [ ] **ASCII Mode**: Press 'T' to toggle, ASCII renders correctly
- [ ] **Mode Persistence**: Preference saves to localStorage
- [ ] **Toggle Feedback**: Visual confirmation when toggling

### Display Elements

- [ ] **Current Depth**: Depth indicator shows correct level (1-26)
- [ ] **Amulet Indicator**: Shows when you have the Amulet
- [ ] **Message Log**: All important events logged
- [ ] **Inventory Display**: Uses stacking for light sources
- [ ] **HP/Hunger Bars**: Update correctly

### Debug Tools (Dev Mode)

- [ ] **Debug Console (~)**: Opens and shows game state
- [ ] **God Mode (g)**: Toggles invincibility
- [ ] **Reveal Map (v)**: Shows entire level
- [ ] **Level Counter**: Debug shows current depth correctly

---

## Sign-Off

**Tester:** _________________
**Date:** _________________
**Build/Commit:** _________________

**Overall Assessment:**
- [ ] All critical features working
- [ ] No game-breaking bugs found
- [ ] Ready for merge to main

**Issues Found:**

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

**Notes:**

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
