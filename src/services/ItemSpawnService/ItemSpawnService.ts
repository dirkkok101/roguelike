import {
  Item,
  ItemType,
  Weapon,
  Armor,
  Potion,
  Scroll,
  Ring,
  Wand,
  Food,
  Torch,
  Lantern,
  Artifact,
  OilFlask,
  PotionType,
  ScrollType,
  RingType,
  WandType,
  Room,
  Tile,
  Monster,
  TileType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'

// ============================================================================
// ITEM SPAWN SERVICE - Handles item generation for dungeon levels
// ============================================================================

/**
 * Service responsible for spawning items in dungeon levels
 * Handles rarity-based item selection, cursed items, and enchantments
 */
export class ItemSpawnService {
  constructor(
    private random: IRandomService,
    private itemData?: ItemData
  ) {}

  /**
   * Roll for cursed status based on item rarity
   * Higher rarity = higher curse chance (risk/reward balance)
   *
   * @param rarity - Item rarity tier
   * @returns true if item should be cursed
   */
  private rollCursedStatus(rarity: string): boolean {
    const curseChances = {
      common: 0.05,    // 5% curse chance
      uncommon: 0.08,  // 8% curse chance
      rare: 0.12,      // 12% curse chance (high risk/reward)
    }

    const chance = curseChances[rarity as keyof typeof curseChances] || 0.05
    return this.random.chance(chance)
  }

  /**
   * Generate enchantment bonus for an item
   * Cursed items get negative bonuses (-1 to -3)
   * Rare items get positive bonuses (+1 to +2)
   * Common items are unenchanted (0)
   *
   * @param rarity - Item rarity tier
   * @param isCursed - Whether item is cursed
   * @returns Enchantment bonus (negative for cursed, positive/zero for normal)
   */
  private rollEnchantment(rarity: string, isCursed: boolean): number {
    if (isCursed) {
      // Cursed items: -1 to -3 enchantment
      return -this.random.nextInt(1, 3)
    }

    if (rarity === 'rare') {
      // Rare items: +1 to +2 enchantment
      return this.random.nextInt(1, 2)
    }

    // Common/uncommon items: no enchantment
    return 0
  }

  /**
   * Spawn items in dungeon rooms with rarity-based selection
   */
  spawnItems(
    rooms: Room[],
    count: number,
    tiles: Tile[][],
    monsters: Monster[],
    depth: number
  ): Item[] {
    const items: Item[] = []
    const itemPositions = new Set<string>()

    // Build occupied positions set (monsters + items)
    monsters.forEach((m) => itemPositions.add(`${m.position.x},${m.position.y}`))

    // Rarity weights (common: 60%, uncommon: 30%, rare: 10%)
    const rarityWeights = { common: 0.6, uncommon: 0.3, rare: 0.1 }

    // Item templates - use loaded data if available, otherwise fall back to hardcoded
    const weaponTemplates =
      this.itemData?.weapons ||
      [
        { name: 'Dagger', damage: '1d6', rarity: 'common' },
        { name: 'Short Sword', damage: '1d8', rarity: 'common' },
        { name: 'Mace', damage: '2d4', rarity: 'common' },
        { name: 'Spear', damage: '2d3', rarity: 'common' },
        { name: 'Long Sword', damage: '1d12', rarity: 'uncommon' },
        { name: 'Battle Axe', damage: '2d8', rarity: 'uncommon' },
        { name: 'Flail', damage: '2d5', rarity: 'uncommon' },
        { name: 'Two-Handed Sword', damage: '3d6', rarity: 'rare' },
      ]

    const armorTemplates =
      this.itemData?.armor ||
      [
        { name: 'Leather Armor', ac: 8, rarity: 'common' },
        { name: 'Studded Leather', ac: 7, rarity: 'common' },
        { name: 'Ring Mail', ac: 7, rarity: 'uncommon' },
        { name: 'Scale Mail', ac: 6, rarity: 'uncommon' },
        { name: 'Chain Mail', ac: 5, rarity: 'uncommon' },
        { name: 'Splint Mail', ac: 4, rarity: 'rare' },
        { name: 'Plate Mail', ac: 3, rarity: 'rare' },
      ]

    const potionTemplates =
      this.itemData?.potions.map((p) => ({
        type: PotionType[p.type as keyof typeof PotionType],
        effect: p.effect,
        power: p.power,
        rarity: p.rarity,
      })) ||
      [
        { type: PotionType.HEAL, effect: 'restore_hp', power: '1d8', rarity: 'common' },
        { type: PotionType.EXTRA_HEAL, effect: 'restore_hp', power: '3d8', rarity: 'uncommon' },
        { type: PotionType.GAIN_STRENGTH, effect: 'increase_strength', power: '1', rarity: 'uncommon' },
        {
          type: PotionType.RESTORE_STRENGTH,
          effect: 'restore_strength',
          power: '1',
          rarity: 'common',
        },
        { type: PotionType.POISON, effect: 'damage', power: '1d6', rarity: 'common' },
        { type: PotionType.HASTE_SELF, effect: 'haste', power: '1d10', rarity: 'uncommon' },
        { type: PotionType.RAISE_LEVEL, effect: 'level_up', power: '1', rarity: 'rare' },
      ]

    const scrollTemplates =
      this.itemData?.scrolls.map((s) => ({
        type: ScrollType[s.type as keyof typeof ScrollType],
        effect: s.effect,
        rarity: s.rarity,
      })) ||
      [
        { type: ScrollType.IDENTIFY, effect: 'identify_item', rarity: 'common' },
        { type: ScrollType.ENCHANT_WEAPON, effect: 'enchant_weapon', rarity: 'uncommon' },
        { type: ScrollType.ENCHANT_ARMOR, effect: 'enchant_armor', rarity: 'uncommon' },
        { type: ScrollType.MAGIC_MAPPING, effect: 'reveal_map', rarity: 'uncommon' },
        { type: ScrollType.TELEPORTATION, effect: 'teleport', rarity: 'common' },
        { type: ScrollType.REMOVE_CURSE, effect: 'remove_curse', rarity: 'uncommon' },
        { type: ScrollType.SCARE_MONSTER, effect: 'scare', rarity: 'rare' },
        { type: ScrollType.HOLD_MONSTER, effect: 'hold', rarity: 'rare' },
      ]

    const ringTemplates =
      this.itemData?.rings.map((r) => ({
        type: RingType[r.type as keyof typeof RingType],
        effect: r.effect,
        rarity: r.rarity,
      })) ||
      [
        { type: RingType.PROTECTION, effect: 'ac_bonus', rarity: 'uncommon' },
        { type: RingType.REGENERATION, effect: 'regen', rarity: 'uncommon' },
        { type: RingType.ADD_STRENGTH, effect: 'strength_bonus', rarity: 'uncommon' },
        { type: RingType.SLOW_DIGESTION, effect: 'slow_hunger', rarity: 'uncommon' },
        { type: RingType.SEE_INVISIBLE, effect: 'see_invisible', rarity: 'rare' },
        { type: RingType.STEALTH, effect: 'stealth', rarity: 'rare' },
      ]

    const wandTemplates =
      this.itemData?.wands.map((w) => ({
        type: WandType[w.type as keyof typeof WandType],
        damage: w.damage,
        charges: w.charges,
        rarity: w.rarity,
      })) ||
      [
        { type: WandType.LIGHTNING, damage: '6d6', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.FIRE, damage: '6d6', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.COLD, damage: '6d6', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.MAGIC_MISSILE, damage: '2d6', charges: '4d4', rarity: 'common' },
        { type: WandType.SLEEP, damage: '0', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.HASTE_MONSTER, damage: '0', charges: '3d3', rarity: 'rare' },
        { type: WandType.SLOW_MONSTER, damage: '0', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.POLYMORPH, damage: '0', charges: '3d3', rarity: 'rare' },
        { type: WandType.TELEPORT_AWAY, damage: '0', charges: '3d3', rarity: 'uncommon' },
        { type: WandType.CANCELLATION, damage: '0', charges: '3d3', rarity: 'rare' },
      ]

    const foodTemplates =
      this.itemData?.food.map((f) => ({
        name: f.name,
        nutrition: parseInt(f.nutrition),
        rarity: f.rarity,
      })) || [{ name: 'Food Ration', nutrition: 900, rarity: 'common' }]

    const lightSourceTemplates =
      this.itemData?.lightSources ||
      [
        { type: 'torch', name: 'Torch', radius: 2, fuel: 500, isPermanent: false, rarity: 'common' },
        { type: 'lantern', name: 'Lantern', radius: 2, fuel: 500, isPermanent: false, rarity: 'uncommon' },
        { type: 'artifact', name: 'Phial of Galadriel', radius: 3, isPermanent: true, rarity: 'legendary' },
      ]

    const consumableTemplates =
      this.itemData?.consumables ||
      [{ name: 'Oil Flask', type: 'lantern_fuel', fuelAmount: 500, rarity: 'uncommon' }]

    // Spawn items
    for (let i = 0; i < count; i++) {
      if (rooms.length === 0) break

      // Pick random room
      const room = rooms[this.random.nextInt(0, rooms.length - 1)]

      // Pick random position in room
      const x = this.random.nextInt(room.x + 1, room.x + room.width - 2)
      const y = this.random.nextInt(room.y + 1, room.y + room.height - 2)
      const key = `${x},${y}`

      // Check if position is valid
      if (!itemPositions.has(key) && tiles[y] && tiles[y][x] && tiles[y][x].walkable) {
        itemPositions.add(key)

        // Roll for rarity
        const rarityRoll = this.random.chance(rarityWeights.common)
          ? 'common'
          : this.random.chance(rarityWeights.uncommon / (1 - rarityWeights.common))
            ? 'uncommon'
            : 'rare'

        // Pick item category with depth-based weights
        // Early game (1-3): More torches, no lanterns
        // Mid game (4-7): Normal torch/lantern/oil mix
        // Late game (8-10): Fewer torches, more lanterns/oil, rare artifacts
        const categories: string[] = []

        // Base categories (12 each, 8 for wand)
        for (let j = 0; j < 12; j++) {
          categories.push('weapon', 'armor', 'potion', 'scroll', 'ring', 'food')
        }
        for (let j = 0; j < 8; j++) {
          categories.push('wand')
        }

        // Extra food weight (total food weight: 18)
        for (let j = 0; j < 6; j++) {
          categories.push('food')
        }

        // Torches (depth-based)
        const torchWeight = depth <= 3 ? 20 : depth <= 7 ? 15 : 10
        for (let j = 0; j < torchWeight; j++) {
          categories.push('torch')
        }

        // Lanterns (depth-based, not in early game)
        const lanternWeight = depth <= 3 ? 0 : depth <= 7 ? 8 : 12
        for (let j = 0; j < lanternWeight; j++) {
          categories.push('lantern')
        }

        // Oil flasks (depth-based)
        const oilWeight = depth <= 3 ? 3 : depth <= 7 ? 10 : 12
        for (let j = 0; j < oilWeight; j++) {
          categories.push('oil_flask')
        }

        const category = this.random.pickRandom(categories)

        // Create item based on category and rarity
        let item: Item | null = null
        const itemId = `item-${items.length}-${this.random.nextInt(1000, 9999)}`

        switch (category) {
          case 'weapon': {
            const templates = weaponTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const isCursed = this.rollCursedStatus(rarityRoll)
              const bonus = this.rollEnchantment(rarityRoll, isCursed)

              // Format name with bonus (e.g., "Long Sword +2")
              // Cursed items (negative bonus) don't show enchantment until identified
              let name = template.name
              if (bonus > 0) {
                name = `${template.name} +${bonus}`
              }
              // Note: negative bonuses hidden until curse is discovered on equip

              item = {
                id: itemId,
                name,
                type: ItemType.WEAPON,
                identified: false,
                position: { x, y },
                damage: template.damage,
                bonus,
                cursed: isCursed,
              } as Weapon
            }
            break
          }

          case 'armor': {
            const templates = armorTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const isCursed = this.rollCursedStatus(rarityRoll)
              const bonus = this.rollEnchantment(rarityRoll, isCursed)

              // Format name with bonus (e.g., "Plate Mail +2")
              // Cursed items (negative bonus) don't show enchantment until identified
              let name = template.name
              if (bonus > 0) {
                name = `${template.name} +${bonus}`
              }
              // Note: negative bonuses hidden until curse is discovered on equip

              item = {
                id: itemId,
                name,
                type: ItemType.ARMOR,
                identified: false,
                position: { x, y },
                ac: template.ac,
                bonus,
                cursed: isCursed,
              } as Armor
            }
            break
          }

          case 'potion': {
            const templates = potionTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Potion of ${template.type}`,
                type: ItemType.POTION,
                identified: false,
                position: { x, y },
                potionType: template.type,
                effect: template.effect,
                power: template.power,
                descriptorName: 'unknown', // Set by IdentificationService
              } as Potion
            }
            break
          }

          case 'scroll': {
            const templates = scrollTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Scroll of ${template.type}`,
                type: ItemType.SCROLL,
                identified: false,
                position: { x, y },
                scrollType: template.type,
                effect: template.effect,
                labelName: 'unknown', // Set by IdentificationService
              } as Scroll
            }
            break
          }

          case 'ring': {
            const templates = ringTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)

              // Ring of Teleportation is ALWAYS cursed (Rogue tradition)
              const isCursed = template.type === RingType.TELEPORTATION || this.rollCursedStatus(rarityRoll)
              const bonus = this.rollEnchantment(rarityRoll, isCursed)

              // Format name with bonus (e.g., "Ring of Protection +2")
              // Cursed items (negative bonus) don't show enchantment until identified
              let name = `Ring of ${template.type}`
              if (bonus > 0) {
                name = `${name} +${bonus}`
              }
              // Note: negative bonuses hidden until curse is discovered on equip

              item = {
                id: itemId,
                name,
                type: ItemType.RING,
                identified: false,
                position: { x, y },
                ringType: template.type,
                effect: template.effect,
                bonus,
                materialName: 'unknown', // Set by IdentificationService
                hungerModifier: 1.5,
                cursed: isCursed,
              } as Ring
            }
            break
          }

          case 'wand': {
            const templates = wandTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)

              // Roll for charges (e.g., "3d3" = 3-9 charges)
              const maxCharges = this.random.roll(template.charges)
              const currentCharges = maxCharges

              item = {
                id: itemId,
                name: `Wand of ${template.type}`,
                type: ItemType.WAND,
                identified: false,
                position: { x, y },
                wandType: template.type,
                damage: template.damage,
                charges: maxCharges,
                currentCharges,
                woodName: 'unknown', // Set by IdentificationService
              } as Wand
            }
            break
          }

          case 'food': {
            const template = this.random.pickRandom(foodTemplates)
            item = {
              id: itemId,
              name: template.name,
              type: ItemType.FOOD,
              identified: false,
              position: { x, y },
              nutrition: template.nutrition,
            } as Food
            break
          }

          case 'torch': {
            // Check for artifact spawning on deep levels (8-10)
            const isArtifactLevel = depth >= 8
            const shouldSpawnArtifact = isArtifactLevel && this.random.chance(0.005) // 0.5% chance

            if (shouldSpawnArtifact) {
              // Spawn artifact light source
              const artifacts = lightSourceTemplates.filter((t) => t.rarity === 'legendary')
              if (artifacts.length > 0) {
                const artifact = this.random.pickRandom(artifacts)
                item = {
                  id: itemId,
                  name: artifact.name,
                  type: ItemType.TORCH, // Artifacts use TORCH type
                  identified: true, // Artifacts are always identified
                  position: { x, y },
                  radius: artifact.radius,
                  isPermanent: true,
                } as Artifact
              }
            } else {
              // Spawn regular torch
              const torch = lightSourceTemplates.find((t) => t.type === 'torch')
              if (torch) {
                item = {
                  id: itemId,
                  name: torch.name,
                  type: ItemType.TORCH,
                  identified: true, // Torches are always identified
                  position: { x, y },
                  fuel: torch.fuel ?? 500,
                  maxFuel: torch.fuel ?? 500,
                  radius: torch.radius,
                  isPermanent: false,
                } as Torch
              }
            }
            break
          }

          case 'lantern': {
            const lantern = lightSourceTemplates.find((t) => t.type === 'lantern')
            if (lantern) {
              item = {
                id: itemId,
                name: lantern.name,
                type: ItemType.LANTERN,
                identified: true, // Lanterns are always identified
                position: { x, y },
                fuel: lantern.fuel ?? 500,
                maxFuel: 1000, // Lanterns can hold more fuel
                radius: lantern.radius,
                isPermanent: false,
              } as Lantern
            }
            break
          }

          case 'oil_flask': {
            const oilFlask = consumableTemplates.find((t) => t.type === 'lantern_fuel')
            if (oilFlask) {
              item = {
                id: itemId,
                name: oilFlask.name,
                type: ItemType.OIL_FLASK,
                identified: true, // Oil flasks are always identified
                position: { x, y },
                fuelAmount: oilFlask.fuelAmount,
              } as OilFlask
            }
            break
          }
        }

        if (item) {
          items.push(item)
        }
      }
    }

    return items
  }
}
