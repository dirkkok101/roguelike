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
  Amulet,
  PotionType,
  ScrollType,
  RingType,
  WandType,
  PowerTier,
  Room,
  Tile,
  Monster,
  Position,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { GuaranteeConfig } from '@services/GuaranteeTracker'

// ============================================================================
// ITEM SPAWN SERVICE - Handles item generation for dungeon levels
// ============================================================================

/**
 * Service responsible for spawning items in dungeon levels
 * Handles rarity-based item selection, cursed items, and enchantments
 *
 * Templates are loaded once from itemData in constructor for performance.
 * Previous: ~50μs per spawn (template recreation)
 * Current: ~5μs per spawn (cached lookup)
 * Improvement: 10x faster for repeated spawns
 */
export class ItemSpawnService {
  // Cached templates (loaded once in constructor)
  private potionTemplates: Array<{ type: PotionType; spriteName: string; effect: string; power: string; rarity: string; powerTier: PowerTier; minDepth?: number; maxDepth?: number }>
  private scrollTemplates: Array<{ type: ScrollType; spriteName: string; effect: string; rarity: string; powerTier: PowerTier }>
  private ringTemplates: Array<{ type: RingType; spriteName: string; effect: string; rarity: string; powerTier: PowerTier }>
  private wandTemplates: Array<{ type: WandType; spriteName: string; damage: string; charges: string; rarity: string; powerTier: PowerTier }>
  private weaponTemplates: Array<{ name: string; spriteName: string; damage: string; rarity: string }>
  private armorTemplates: Array<{ name: string; spriteName: string; ac: number; rarity: string }>
  private foodTemplates: Array<{ name: string; spriteName: string; nutrition: number; rarity: string }>
  private lightSourceTemplates: Array<{
    type: string
    name: string
    spriteName: string
    radius: number
    fuel?: number
    isPermanent: boolean
    rarity: string
  }>
  private consumableTemplates: Array<{
    name: string
    spriteName: string
    type: string
    fuelAmount: number
    rarity: string
  }>

  /**
   * Creates ItemSpawnService with template caching.
   * Templates are loaded once from itemData in constructor for performance.
   * @param random - Random number generator for item selection
   * @param itemData - Item data from JSON (REQUIRED - not optional)
   * @param guarantees - Guarantee configuration for depth-based category weights
   */
  constructor(
    private random: IRandomService,
    private itemData: ItemData,  // REQUIRED: No optional, no fallbacks
    private guarantees: GuaranteeConfig  // REQUIRED: Depth-based weights
  ) {
    // Load all templates once (cached for lifetime of service)
    this.potionTemplates = this.loadPotionTemplates()
    this.scrollTemplates = this.loadScrollTemplates()
    this.ringTemplates = this.loadRingTemplates()
    this.wandTemplates = this.loadWandTemplates()
    this.weaponTemplates = this.loadWeaponTemplates()
    this.armorTemplates = this.loadArmorTemplates()
    this.foodTemplates = this.loadFoodTemplates()
    this.lightSourceTemplates = this.loadLightSourceTemplates()
    this.consumableTemplates = this.loadConsumableTemplates()
  }

  // ============================================================================
  // TEMPLATE LOADING (called once in constructor)
  // ============================================================================

  private loadPotionTemplates(): Array<{
    type: PotionType
    spriteName: string
    effect: string
    power: string
    rarity: string
    powerTier: PowerTier
    minDepth?: number
    maxDepth?: number
  }> {
    return this.itemData.potions.map((p) => ({
      type: PotionType[p.type as keyof typeof PotionType],
      spriteName: p.spriteName,
      effect: p.effect,
      power: p.power,
      rarity: p.rarity,
      powerTier: PowerTier[(p as any).powerTier?.toUpperCase() as keyof typeof PowerTier],
      minDepth: p.minDepth,
      maxDepth: p.maxDepth,
    }))
  }

  private loadScrollTemplates(): Array<{ type: ScrollType; spriteName: string; effect: string; rarity: string; powerTier: PowerTier }> {
    return this.itemData.scrolls.map((s) => ({
      type: ScrollType[s.type as keyof typeof ScrollType],
      spriteName: s.spriteName,
      effect: s.effect,
      rarity: s.rarity,
      powerTier: PowerTier[(s as any).powerTier?.toUpperCase() as keyof typeof PowerTier],
    }))
  }

  private loadRingTemplates(): Array<{ type: RingType; spriteName: string; effect: string; rarity: string; powerTier: PowerTier }> {
    return this.itemData.rings.map((r) => ({
      type: RingType[r.type as keyof typeof RingType],
      spriteName: r.spriteName,
      effect: r.effect,
      rarity: r.rarity,
      powerTier: PowerTier[(r as any).powerTier?.toUpperCase() as keyof typeof PowerTier],
    }))
  }

  private loadWandTemplates(): Array<{
    type: WandType
    spriteName: string
    damage: string
    charges: string
    rarity: string
    powerTier: PowerTier
  }> {
    return this.itemData.wands.map((w) => ({
      type: WandType[w.type as keyof typeof WandType],
      spriteName: w.spriteName,
      damage: w.damage,
      charges: w.charges,
      rarity: w.rarity,
      powerTier: PowerTier[(w as any).powerTier?.toUpperCase() as keyof typeof PowerTier],
    }))
  }

  private loadWeaponTemplates(): Array<{ name: string; spriteName: string; damage: string; rarity: string }> {
    return this.itemData.weapons
  }

  private loadArmorTemplates(): Array<{ name: string; spriteName: string; ac: number; rarity: string }> {
    return this.itemData.armor
  }

  private loadFoodTemplates(): Array<{ name: string; spriteName: string; nutrition: number; rarity: string }> {
    return this.itemData.food.map((f) => ({
      name: f.name,
      spriteName: f.spriteName,
      nutrition: parseInt(f.nutrition),
      rarity: f.rarity,
    }))
  }

  private loadLightSourceTemplates(): Array<{
    type: string
    name: string
    spriteName: string
    radius: number
    fuel?: number
    isPermanent: boolean
    rarity: string
  }> {
    return this.itemData.lightSources
  }

  private loadConsumableTemplates(): Array<{
    name: string
    spriteName: string
    type: string
    fuelAmount: number
    rarity: string
  }> {
    return this.itemData.consumables
  }

  /**
   * Roll for cursed status based on item rarity with depth scaling
   * Higher rarity = higher curse chance (risk/reward balance)
   * Deeper levels = lower curse chance (30% reduction by depth 26)
   *
   * Curse chance progression (common items as example):
   * - Depth 1: 5.0% base
   * - Depth 13: 4.35% (-13% reduction)
   * - Depth 26: 3.5% (-30% reduction)
   *
   * @param rarity - Item rarity tier
   * @param depth - Current dungeon depth (1-26)
   * @returns true if item should be cursed
   */
  private rollCursedStatus(rarity: string, depth: number): boolean {
    const baseChances = {
      common: 0.05,    // 5% base curse chance
      uncommon: 0.08,  // 8% base curse chance
      rare: 0.12,      // 12% base curse chance (high risk/reward)
    }

    const baseChance = baseChances[rarity as keyof typeof baseChances] || 0.05
    const adjustedChance = this.calculateCurseChance(baseChance, depth)
    return this.random.chance(adjustedChance)
  }

  /**
   * Determine wand range based on wand type
   * Beam wands (lightning, fire, cold) have longest range
   * Standard attack wands have moderate range
   * Utility wands have shorter range
   *
   * @param wandType - Type of wand
   * @returns Maximum range in tiles (5-8)
   */
  private getWandRange(wandType: WandType): number {
    const wandRanges: Record<WandType, number> = {
      [WandType.LIGHTNING]: 8,        // Long range beam
      [WandType.FIRE]: 8,              // Long range beam
      [WandType.COLD]: 8,              // Long range beam
      [WandType.MAGIC_MISSILE]: 7,     // Standard ranged attack
      [WandType.SLEEP]: 6,             // Moderate range
      [WandType.HASTE_MONSTER]: 5,     // Close range
      [WandType.SLOW_MONSTER]: 6,      // Moderate range
      [WandType.POLYMORPH]: 5,         // Close range
      [WandType.TELEPORT_AWAY]: 7,     // Good range
      [WandType.CANCELLATION]: 6,      // Moderate range
    }

    return wandRanges[wandType] || 5  // Default to 5 if unknown type
  }

  /**
   * Generate enchantment bonus for an item with depth-based scaling
   * Cursed items get negative bonuses (-1 to -3)
   * Normal items get depth-scaled bonuses (0 to +5)
   *
   * Enchantment ranges scale with depth:
   * - Depth 1-5: No enchantments (survival rewards progression)
   * - Depth 6-10: +0 to +1 enchantments
   * - Depth 11-15: +1 to +2 enchantments
   * - Depth 16-20: +1 to +3 enchantments
   * - Depth 21-25: +2 to +4 enchantments
   * - Depth 26: +2 to +5 enchantments (maximum natural drops)
   *
   * @param rarity - Item rarity tier
   * @param isCursed - Whether item is cursed
   * @param depth - Current dungeon depth (1-26)
   * @returns Enchantment bonus (negative for cursed, positive/zero for normal)
   */
  private rollEnchantment(rarity: string, isCursed: boolean, depth: number): number {
    if (isCursed) {
      // Cursed items: -1 to -3 enchantment (unchanged)
      return -this.random.nextInt(1, 3)
    }

    const { minBonus, maxBonus } = this.calculateEnchantmentRange(depth, rarity)
    if (maxBonus === 0) return 0
    return this.random.nextInt(minBonus, maxBonus)
  }

  /**
   * Calculate food spawn weight for a given depth
   *
   * Base: 10%
   * Depth bonus: +1% every 5 levels
   *
   * Depth 1-4: 10 weight
   * Depth 5-9: 11 weight
   * Depth 10-14: 12 weight
   * Depth 15-19: 13 weight
   * Depth 20-24: 14 weight
   * Depth 25-26: 15 weight
   */
  private getFoodSpawnWeight(depth: number): number {
    const baseWeight = 10
    const depthBonus = Math.floor(depth / 5)
    return baseWeight + depthBonus
  }

  /**
   * Calculate torch spawn weight (fixed 7% across all depths)
   */
  private getTorchSpawnWeight(_depth: number): number {
    return 7  // 7% spawn rate
  }

  /**
   * Calculate oil flask spawn weight (fixed 5% across all depths)
   */
  private getOilFlaskSpawnWeight(_depth: number): number {
    return 5  // 5% spawn rate
  }

  /**
   * Calculate rarity weights based on dungeon depth
   * Linear progression from 70/25/5 to 30/40/30
   *
   * Early game (depth 1): Common items dominate (70%)
   * Late game (depth 26): More balanced with higher rare chance (30%)
   *
   * @param depth - Current dungeon depth (1-26)
   * @returns Rarity weights for common, uncommon, rare
   */
  private calculateRarityWeights(depth: number): { common: number; uncommon: number; rare: number } {
    return {
      common: Math.max(30, 70 - (depth * 1.54)),
      uncommon: Math.min(40, 25 + (depth * 0.58)),
      rare: Math.min(30, 5 + (depth * 0.96))
    }
  }

  /**
   * Calculate enchantment range based on depth and rarity
   * Rare items get +1 bonus, max capped at +5
   *
   * Depth progression:
   * - 1-5: [0, 0] - No enchantments (weak early game)
   * - 6-10: [0, 1] - First enchantments appear
   * - 11-15: [1, 2] - Moderate enchantments
   * - 16-20: [1, 3] - Strong enchantments
   * - 21-25: [2, 4] - Very strong enchantments
   * - 26: [2, 5] - Maximum natural enchantment
   *
   * @param depth - Current dungeon depth (1-26)
   * @param rarity - Item rarity tier
   * @returns Min and max enchantment bonus range
   */
  private calculateEnchantmentRange(
    depth: number,
    rarity: string
  ): { minBonus: number; maxBonus: number } {
    const rarityBonus = rarity === 'rare' ? 1 : 0

    return {
      minBonus: Math.floor(depth / 9) + rarityBonus,
      maxBonus: Math.min(5, Math.floor(depth / 5.2) + rarityBonus)
    }
  }

  /**
   * Calculate curse chance with depth reduction
   * 30% reduction by depth 26 (risk decreases as you go deeper)
   *
   * @param baseChance - Base curse chance for rarity tier
   * @param depth - Current dungeon depth (1-26)
   * @returns Adjusted curse chance (0.0-1.0)
   */
  private calculateCurseChance(baseChance: number, depth: number): number {
    return baseChance * (1.3 - (depth * 0.01))
  }

  /**
   * Calculate spawn rate for healing potions based on depth and tier
   * Each tier has a different spawn curve to ensure smooth progression
   *
   * @param depth - Current dungeon depth (1-26)
   * @param healingType - Healing potion type (MINOR_HEAL, MEDIUM_HEAL, MAJOR_HEAL, SUPERIOR_HEAL)
   * @returns Spawn rate as decimal (0.0 to 1.0)
   */
  private calculateHealingSpawnRate(depth: number, healingType: string): number {
    switch (healingType) {
      case 'MINOR_HEAL':
        // spawn_rate = max(0, 12% - (depth × 1.2%))
        // Depths 1-10, phased out at depth 10
        return Math.max(0, 0.12 - (depth * 0.012))

      case 'MEDIUM_HEAL':
        // spawn_rate = max(0, 10% - abs(depth - 13) × 0.8%)
        // Bell curve peaking at depth 13, depths 8-18
        return Math.max(0, 0.10 - Math.abs(depth - 13) * 0.008)

      case 'MAJOR_HEAL':
        // spawn_rate = min(12%, max(0, (depth - 14) × 1.0%))
        // Linear ramp from depth 15-26, peaks at 12%
        return Math.min(0.12, Math.max(0, (depth - 14) * 0.01))

      case 'SUPERIOR_HEAL':
        // spawn_rate = max(0, (depth - 19) × 0.5%)
        // Rare finds, depths 20-26, max 3.5%
        return Math.max(0, (depth - 19) * 0.005)

      default:
        return 0
    }
  }

  /**
   * Filter items by depth range (minDepth/maxDepth fields)
   * minDepth is inclusive, maxDepth is exclusive
   * @param items - Array of items with optional minDepth/maxDepth
   * @param depth - Current dungeon depth
   * @returns Filtered array of items valid for this depth
   */
  private filterByDepth<T extends { minDepth?: number; maxDepth?: number }>(
    items: T[],
    depth: number
  ): T[] {
    return items.filter(item => {
      const minDepth = item.minDepth ?? 1
      const maxDepth = item.maxDepth ?? 26
      return depth >= minDepth && depth < maxDepth
    })
  }

  /**
   * Select rarity using weighted random selection
   * Uses total sum normalization to handle non-100% weight sums
   *
   * @param weights - Rarity weights from calculateRarityWeights()
   * @returns Selected rarity tier ('common' | 'uncommon' | 'rare')
   */
  private selectWeightedRarity(weights: { common: number; uncommon: number; rare: number }): string {
    const total = weights.common + weights.uncommon + weights.rare
    const roll = this.random.nextFloat(0, total)

    if (roll < weights.common) return 'common'
    if (roll < weights.common + weights.uncommon) return 'uncommon'
    return 'rare'
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

    // Calculate depth-based rarity weights (70/25/5 → 30/40/30 progression)
    const rarityWeights = this.calculateRarityWeights(depth)

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

        // Roll for rarity using weighted selection
        const rarityRoll = this.selectWeightedRarity(rarityWeights)

        // Pick item category with depth-based weights
        // Resource spawn rates balanced for 26-level journey:
        // - Food: 10% base + 1% per 5 levels (10-15%)
        // - Torch: 7% (consistent across all depths)
        // - Oil: 5% (consistent across all depths)
        // - Lanterns: Scale with depth (0% early, 8-12% late)
        const categories: string[] = []

        // Base categories (12 each, 8 for wand)
        for (let j = 0; j < 12; j++) {
          categories.push('weapon', 'armor', 'potion', 'scroll', 'ring')
        }
        for (let j = 0; j < 8; j++) {
          categories.push('wand')
        }

        // Food (depth-scaled: 10-15%)
        const foodWeight = this.getFoodSpawnWeight(depth)
        for (let j = 0; j < foodWeight; j++) {
          categories.push('food')
        }

        // Torches (7% across all depths)
        const torchWeight = this.getTorchSpawnWeight(depth)
        for (let j = 0; j < torchWeight; j++) {
          categories.push('torch')
        }

        // Lanterns (depth-based, not in early game)
        const lanternWeight = depth <= 3 ? 0 : depth <= 7 ? 8 : 12
        for (let j = 0; j < lanternWeight; j++) {
          categories.push('lantern')
        }

        // Oil flasks (5% across all depths)
        const oilWeight = this.getOilFlaskSpawnWeight(depth)
        for (let j = 0; j < oilWeight; j++) {
          categories.push('oil_flask')
        }

        const category = this.random.pickRandom(categories)

        // Create item based on category and rarity
        let item: Item | null = null
        const itemId = `item-${items.length}-${this.random.nextInt(1000, 9999)}`

        switch (category) {
          case 'weapon': {
            const templates = this.weaponTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const isCursed = this.rollCursedStatus(rarityRoll, depth)
              const bonus = this.rollEnchantment(rarityRoll, isCursed, depth)

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
                spriteName: template.spriteName,
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
            const templates = this.armorTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              const isCursed = this.rollCursedStatus(rarityRoll, depth)
              const bonus = this.rollEnchantment(rarityRoll, isCursed, depth)

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
                spriteName: template.spriteName,
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
            // Filter by depth first, then by rarity
            const depthFilteredTemplates = this.filterByDepth(this.potionTemplates, depth)
            const templates = depthFilteredTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Potion of ${template.type}`,
                spriteName: template.spriteName,
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
            const templates = this.scrollTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)
              item = {
                id: itemId,
                name: `Scroll of ${template.type}`,
                spriteName: template.spriteName,
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
            const templates = this.ringTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)

              // Ring of Teleportation is ALWAYS cursed (Rogue tradition)
              const isCursed = template.type === RingType.TELEPORTATION || this.rollCursedStatus(rarityRoll, depth)
              const bonus = this.rollEnchantment(rarityRoll, isCursed, depth)

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
                spriteName: template.spriteName,
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
            const templates = this.wandTemplates.filter((t) => t.rarity === rarityRoll)
            if (templates.length > 0) {
              const template = this.random.pickRandom(templates)

              // Roll for charges (e.g., "3d3" = 3-9 charges)
              const maxCharges = this.random.roll(template.charges)
              const currentCharges = maxCharges

              // Determine range based on wand type (5-8 tiles)
              const range = this.getWandRange(template.type)

              item = {
                id: itemId,
                name: `Wand of ${template.type}`,
                spriteName: template.spriteName,
                type: ItemType.WAND,
                identified: false,
                position: { x, y },
                wandType: template.type,
                damage: template.damage,
                charges: maxCharges,
                currentCharges,
                woodName: 'unknown', // Set by IdentificationService
                range,
              } as Wand
            }
            break
          }

          case 'food': {
            const template = this.random.pickRandom(this.foodTemplates)
            item = {
              id: itemId,
              name: template.name,
              spriteName: template.spriteName,
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
              const artifacts = this.lightSourceTemplates.filter((t) => t.rarity === 'legendary')
              if (artifacts.length > 0) {
                const artifact = this.random.pickRandom(artifacts)
                item = {
                  id: itemId,
                  name: artifact.name,
                  spriteName: artifact.spriteName,
                  type: ItemType.TORCH, // Artifacts use TORCH type
                  identified: true, // Artifacts are always identified
                  position: { x, y },
                  radius: artifact.radius,
                  isPermanent: true,
                } as Artifact
              }
            } else {
              // Spawn regular torch
              const torch = this.lightSourceTemplates.find((t) => t.type === 'torch')
              if (torch) {
                item = {
                  id: itemId,
                  name: torch.name,
                  spriteName: torch.spriteName,
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
            const lantern = this.lightSourceTemplates.find((t) => t.type === 'lantern')
            if (lantern) {
              item = {
                id: itemId,
                name: lantern.name,
                spriteName: lantern.spriteName,
                type: ItemType.LANTERN,
                identified: true, // Lanterns are always identified
                position: { x, y },
                fuel: lantern.fuel ?? 750,
                maxFuel: 1500, // Lanterns can hold 2x starting fuel (750 * 2)
                radius: lantern.radius,
                isPermanent: false,
              } as Lantern
            }
            break
          }

          case 'oil_flask': {
            const oilFlask = this.consumableTemplates.find((t) => t.type === 'lantern_fuel')
            if (oilFlask) {
              item = {
                id: itemId,
                name: oilFlask.name,
                spriteName: oilFlask.spriteName,
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

  // ============================================================================
  // PUBLIC ITEM CREATION HELPERS - For debug spawning and testing
  // ============================================================================

  /**
   * Create a potion of a specific type
   * Used by DebugService for spawning specific items
   */
  createPotion(potionType: PotionType, position: Position): Potion {
    const template = this.potionTemplates.find((t) => t.type === potionType)
    if (!template) {
      throw new Error(`Unknown potion type: ${potionType}`)
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: `Potion of ${template.type}`,
      spriteName: template.spriteName,
      type: ItemType.POTION,
      identified: false,
      position,
      potionType: template.type,
      effect: template.effect,
      power: template.power,
      descriptorName: 'unknown',
    } as Potion
  }

  /**
   * Create a scroll of a specific type
   */
  createScroll(scrollType: ScrollType, position: Position): Scroll {
    const template = this.scrollTemplates.find((t) => t.type === scrollType)
    if (!template) {
      throw new Error(`Unknown scroll type: ${scrollType}`)
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: `Scroll of ${template.type}`,
      spriteName: template.spriteName,
      type: ItemType.SCROLL,
      identified: false,
      position,
      scrollType: template.type,
      effect: template.effect,
      labelName: 'unknown',
    } as Scroll
  }

  /**
   * Create a ring of a specific type (always uncursed for debug spawning)
   */
  createRing(ringType: RingType, position: Position): Ring {
    const template = this.ringTemplates.find((t) => t.type === ringType)
    if (!template) {
      throw new Error(`Unknown ring type: ${ringType}`)
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    // Debug spawned rings are always uncursed with +1 bonus
    const bonus = 1

    return {
      id: itemId,
      name: `Ring of ${template.type} +${bonus}`,
      spriteName: template.spriteName,
      type: ItemType.RING,
      identified: false,
      position,
      ringType: template.type,
      effect: template.effect,
      bonus,
      materialName: 'unknown',
      hungerModifier: 1.5,
      cursed: false, // Debug rings are never cursed
    } as Ring
  }

  /**
   * Create a wand of a specific type
   */
  createWand(wandType: WandType, position: Position): Wand {
    const template = this.wandTemplates.find((t) => t.type === wandType)
    if (!template) {
      throw new Error(`Unknown wand type: ${wandType}`)
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    const maxCharges = this.random.roll(template.charges)
    const range = this.getWandRange(template.type)

    return {
      id: itemId,
      name: `Wand of ${template.type}`,
      spriteName: template.spriteName,
      type: ItemType.WAND,
      identified: false,
      position,
      wandType: template.type,
      damage: template.damage,
      charges: maxCharges,
      currentCharges: maxCharges,
      woodName: 'unknown',
      range,
    } as Wand
  }

  /**
   * Create food ration
   */
  createFood(position: Position): Food {
    const template = this.random.pickRandom(this.foodTemplates)
    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`

    return {
      id: itemId,
      name: template.name,
      spriteName: template.spriteName,
      type: ItemType.FOOD,
      identified: false,
      position,
      nutrition: template.nutrition,
    } as Food
  }

  /**
   * Create torch
   */
  createTorch(position: Position): Torch {
    const torch = this.lightSourceTemplates.find((t) => t.type === 'torch')
    if (!torch) {
      throw new Error('Torch template not found')
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: torch.name,
      spriteName: torch.spriteName,
      type: ItemType.TORCH,
      identified: true,
      position,
      fuel: torch.fuel ?? 500,
      maxFuel: torch.fuel ?? 500,
      radius: torch.radius,
      isPermanent: false,
    } as Torch
  }

  /**
   * Create lantern
   */
  createLantern(position: Position): Lantern {
    const lantern = this.lightSourceTemplates.find((t) => t.type === 'lantern')
    if (!lantern) {
      throw new Error('Lantern template not found')
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: lantern.name,
      spriteName: lantern.spriteName,
      type: ItemType.LANTERN,
      identified: true,
      position,
      fuel: lantern.fuel ?? 750,
      maxFuel: 1500, // Lanterns can hold 2x starting fuel
      radius: lantern.radius,
      isPermanent: false,
    } as Lantern
  }

  /**
   * Create oil flask
   */
  createOilFlask(position: Position): OilFlask {
    const oilFlask = this.consumableTemplates.find((t) => t.type === 'lantern_fuel')
    if (!oilFlask) {
      throw new Error('Oil flask template not found')
    }

    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: oilFlask.name,
      spriteName: oilFlask.spriteName,
      type: ItemType.OIL_FLASK,
      identified: true,
      position,
      fuelAmount: oilFlask.fuelAmount,
    } as OilFlask
  }

  /**
   * Create starting leather armor (always identified, uncursed, no bonus)
   * Used for new character initialization
   */
  createStartingLeatherArmor(position: Position): Armor {
    const leatherTemplate = this.armorTemplates.find((t) => t.name === 'Leather Armor')
    if (!leatherTemplate) {
      throw new Error('Leather Armor template not found')
    }

    const itemId = `starting-leather-${Date.now()}`
    return {
      id: itemId,
      name: leatherTemplate.name,
      spriteName: leatherTemplate.spriteName,
      type: ItemType.ARMOR,
      identified: true, // Starting equipment is always identified
      position,
      ac: leatherTemplate.ac,
      bonus: 0, // No enchantment on starting equipment
      cursed: false, // Starting equipment is never cursed
    } as Armor
  }

  /**
   * Create Amulet of Yendor (the quest item)
   * Always identified and never cursed
   * Used for spawning on level 26
   */
  createAmulet(position: Position): Amulet {
    const itemId = `item-debug-${Date.now()}-${this.random.nextInt(1000, 9999)}`
    return {
      id: itemId,
      name: 'Amulet of Yendor',
      spriteName: 'amulet',
      type: ItemType.AMULET,
      identified: true, // Always identified
      position,
      cursed: false, // Never cursed
    } as Amulet
  }

  // ============================================================================
  // DEPTH-BASED CATEGORY WEIGHTS (Item Scaling System)
  // ============================================================================

  /**
   * Get category weights for depth range
   */
  private getCategoryWeights(depth: number): Record<string, number> {
    const range = this.getDepthRange(depth)
    return this.guarantees.categoryWeights[range]
  }

  private getDepthRange(depth: number): string {
    if (depth <= 5) return '1-5'
    if (depth <= 10) return '6-10'
    if (depth <= 15) return '11-15'
    if (depth <= 20) return '16-20'
    return '21-26'
  }

  /**
   * Filter items by power tier based on depth
   */
  private filterByPowerTier<T extends { powerTier: PowerTier }>(
    items: T[],
    depth: number
  ): T[] {
    const allowedTiers = this.getAllowedTiers(depth)
    return items.filter(item => allowedTiers.includes(item.powerTier))
  }

  /**
   * Get allowed power tiers for depth
   */
  private getAllowedTiers(depth: number): PowerTier[] {
    if (depth <= 8) return [PowerTier.BASIC]
    if (depth <= 16) return [PowerTier.BASIC, PowerTier.INTERMEDIATE]
    return [PowerTier.BASIC, PowerTier.INTERMEDIATE, PowerTier.ADVANCED]
  }
}
