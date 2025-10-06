# References & Glossary

**Version**: 2.0
**Last Updated**: 2025-10-05

---

## 1. Glossary

### Roguelike Terms

**Roguelike**: Genre of dungeon crawlers with permadeath, procedural generation, turn-based gameplay

**ASCII**: Text-based graphics using characters (A-Z, symbols)

**Permadeath**: Permanent death - no continues or respawns

**Procedural Generation**: Algorithmic creation of content (dungeons, monsters, items)

**FOV (Field of View)**: What the player/monster can currently see

**Fog of War**: Previously explored areas visible but dimmed (map memory)

**Turn-Based**: Gameplay proceeds in discrete turns (player acts, then monsters act)

---

### Game Mechanics

**AC (Armor Class)**: Defense stat (lower = better in classic Rogue)

**HP (Hit Points)**: Health/life total

**XP (Experience Points)**: Points toward leveling up

**Str (Strength)**: Physical power stat (affects damage and carry capacity)

**To-Hit**: Chance to successfully land an attack

**Enchantment**: Magical bonus on equipment (+1, +2, +3)

**Curse**: Negative enchantment that cannot be removed without special item

---

### Items & Equipment

**Wield**: Equip a weapon

**Wear**: Put on armor

**Quaff**: Drink a potion

**Zap**: Use a wand or staff

**Amulet of Yendor**: The legendary artifact and win condition

**Unidentified**: Items whose effects are unknown until tested

---

### Light Sources

**Torch**: Basic consumable light source (500 turns fuel, radius 2)

**Lantern**: Refillable light source (radius 2)

**Oil Flask**: Refill item for lanterns (500 turns per flask)

**Artifact Light**: Permanent light source (never runs out, radius 2-3)

**Fuel**: Resource consumed by torches and lanterns (1 per turn)

---

### Dungeon & Monsters

**Level**: Single floor of dungeon (10 total)

**Room**: Open area in dungeon

**Corridor**: Narrow passage connecting rooms

**Secret Door**: Hidden door (appears as wall until discovered)

**Trap**: Hidden danger (bear trap, dart, pit, teleport, alarm)

**AI**: Monster behavior pattern (SMART, SIMPLE, GREEDY, ERRATIC, THIEF, STATIONARY, COWARD)

**Regeneration**: Monster ability to heal HP over time (Troll, Griffin, Vampire)

---

### Algorithms

**A\* (A-star)**: Pathfinding algorithm for finding optimal paths

**Shadowcasting**: FOV algorithm that accurately simulates line of sight

**MST (Minimum Spanning Tree)**: Graph algorithm ensuring all rooms are connected

**BSP (Binary Space Partitioning)**: Dungeon generation technique for room placement

---

## 2. Original Rogue (1980)

### Documentation

**Epyx Rogue DOS Manual**:
https://britzl.github.io/roguearchive/files/misc/EpyxRogueDOSManual/manual.htm

**Rogue Wikipedia**:
https://en.wikipedia.org/wiki/Rogue_(video_game)

**Original Rogue Source Code** (BSD 4.3):
https://github.com/commercial-game-sources/rogue

---

### Key Mechanics Adopted

- 26 monsters (A-Z) with unique abilities
- Item identification system (random descriptive names)
- Permadeath (save deletion on death)
- Command key scheme (q, r, w, W, T, P, R, z, e, d)
- Combat formulas (1d20 rolls, AC system, strength tables)
- Healing potion overheal (+1 max HP)
- Room + corridor dungeon generation

---

## 3. NetHack

### Documentation

**NetHack Wiki**:
https://nethackwiki.com

---

### Key Mechanics Adopted

- Advanced AI behaviors (SMART, GREEDY, THIEF, COWARD)
- Ring hunger modifiers (+30 nutrition for Regeneration)
- Health regeneration formulas (turn-based rates)
- Enhanced identification system
- Diverse trap types

---

## 4. Angband

### Documentation

**Angband Live**:
http://angband.live

**Angband ReadTheDocs**:
https://angband.readthedocs.io

---

### Key Mechanics Adopted

- **Light radius system** (vision = light source radius)
- **Artifact light sources**:
  - Phial of Galadriel
  - Star of Elendil
  - Arkenstone of Thrain
- Torches and lanterns (consumable fuel)
- Oil flasks (lantern refills)
- Light progression (torches → lanterns → artifacts)
- Regeneration food costs
- Constitution-based recovery (adapted to level-based)

---

## 5. Algorithm References

### Field of View

**FOV using Recursive Shadowcasting - RogueBasin**:
https://www.roguebasin.com/index.php/FOV_using_recursive_shadowcasting

**What the Hero Sees: Field-of-View for Roguelikes - Bob Nystrom**:
https://journal.stuffwithstuff.com/2015/09/07/what-the-hero-sees/

---

### Pathfinding

**Introduction to A\* - Red Blob Games**:
https://www.redblobgames.com/pathfinding/a-star/introduction.html

**Pathfinding in Roguelikes - RogueBasin**:
https://www.roguebasin.com/index.php/Pathfinding

---

### Dungeon Generation

**Dungeon Generation Algorithms - RogueBasin**:
https://www.roguebasin.com/index.php/Articles

**Rooms and Mazes - Bob Nystrom**:
https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/

---

## 6. RogueBasin

**Main Site**:
https://www.roguebasin.com/

**Key Articles**:
- Roguelike Development Wiki
- Algorithm implementations
- Monster AI patterns
- Dungeon generation techniques
- FOV algorithms
- Lighting systems

---

## 7. StrategyWiki

**Rogue Monster List**:
https://strategywiki.org/wiki/Rogue/Monsters

**Complete monster stats and abilities from Original Rogue**

---

## 8. Development Stack

### Technologies

**TypeScript**: Strongly-typed JavaScript superset

**Vite**: Fast build tool and dev server

**Jest**: JavaScript testing framework

**ESLint**: Code linting and quality

**LocalStorage**: Browser storage API (save system)

---

### Libraries

**No Framework**: Vanilla TypeScript + DOM manipulation

**No External Dependencies**: Self-contained roguelike implementation

---

## 9. Project Documentation

### Internal Docs

**CLAUDE.md**: Developer workflow, SOLID principles, architecture patterns

**architecture.md**: Technical architecture, services, data structures

**systems-core.md**: Lighting, FOV, rendering implementation details

**systems-advanced.md**: AI, pathfinding, dungeon generation algorithms

**testing-strategy.md**: Test organization, coverage goals, AAA pattern

**game_design_document_refactor_plan.md**: This documentation refactor plan

---

## 10. Contact & Feedback

**Developer**: Dirk Kok

**Email**: dirkkok@gmail.com

**Repository**: https://github.com/dirkkok101/roguelike

**Issues/Bugs**: https://github.com/dirkkok101/roguelike/issues

**Contributions**: Pull requests welcome (follow CLAUDE.md guidelines)

---

## 11. Acknowledgments

### Classic Roguelikes

**Original Rogue (1980)** - Michael Toy, Glenn Wichman, Ken Arnold
- Established genre conventions
- Core mechanics inspiration

**NetHack** - NetHack DevTeam
- Advanced AI and identification systems

**Angband** - Angband Development Team
- Light radius system
- Artifact inspiration

---

### Modern Resources

**RogueBasin Community** - Algorithm documentation and tutorials

**Bob Nystrom** - Excellent FOV and dungeon generation articles

**Red Blob Games** - Interactive pathfinding tutorials

---

## 12. License

**Code License**: MIT License (or specify your license)

**Content License**: Creative Commons (or specify)

**See**: LICENSE file in repository root

---

## 13. Version History

**v1.0** (Target): Core roguelike complete (10 levels, 26 monsters, all systems)

**v2.0** (Future): Character classes, more content, mobile support

**See**: [Future Enhancements](./14-future.md) for roadmap

---

**Last Updated**: 2025-10-05
**Documentation Version**: 2.0
