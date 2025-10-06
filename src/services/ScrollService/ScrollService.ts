import {
  Player,
  Scroll,
  ScrollType,
  GameState,
  ItemType,
  Weapon,
  Armor,
  Level,
} from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { LevelService } from '@services/LevelService'
import { FOVService } from '@services/FOVService'
import { IRandomService } from '@services/RandomService'
import { DungeonService } from '@services/DungeonService'

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Result of applying a scroll effect
 *
 * @field player - Updated player (optional - only when scroll modifies player directly)
 * @field state - Updated game state (optional - only when scroll modifies level/world)
 * @field message - Effect description message to display
 * @field identified - Was scroll unidentified before use? (for auto-identification)
 * @field fizzled - Did scroll fail to work? (if true, no turn consumed, scroll not removed)
 * @field consumed - Should scroll be removed from inventory? (false for SCARE_MONSTER)
 */
export interface ScrollEffectResult {
  player?: Player
  state?: GameState
  message: string
  identified: boolean
  fizzled?: boolean
  consumed: boolean
}

// ============================================================================
// SCROLL SERVICE - All scroll effect logic
// ============================================================================

export class ScrollService {
  constructor(
    private identificationService: IdentificationService,
    private inventoryService: InventoryService,
    private levelService: LevelService,
    private fovService: FOVService,
    private randomService: IRandomService,
    private dungeonService: DungeonService
  ) {}

  /**
   * Apply scroll effect and return complete result
   * @param targetItemId - Optional item ID for targeted scrolls (identify, enchant)
   */
  applyScroll(
    player: Player,
    scroll: Scroll,
    state: GameState,
    targetItemId?: string
  ): ScrollEffectResult {
    // Identify scroll by use
    const identified = !this.identificationService.isIdentified(scroll, state)
    const displayName = this.identificationService.getDisplayName(scroll, state)

    let updatedPlayer = player
    let message = ''

    // Apply scroll effect based on type
    switch (scroll.scrollType) {
      case ScrollType.IDENTIFY:
        {
          const result = this.applyIdentify(player, targetItemId, state, displayName)
          updatedPlayer = result.player
          message = result.message
        }
        break

      case ScrollType.ENCHANT_WEAPON:
        {
          const result = this.applyEnchantWeapon(player, targetItemId, displayName)
          updatedPlayer = result.player
          message = result.message
        }
        break

      case ScrollType.ENCHANT_ARMOR:
        {
          const result = this.applyEnchantArmor(player, targetItemId, displayName)
          updatedPlayer = result.player
          message = result.message
        }
        break

      case ScrollType.TELEPORTATION:
        return this.applyTeleportation(player, state, displayName, identified)

      case ScrollType.CREATE_MONSTER:
        return this.applyCreateMonster(player, state, displayName, identified)

      case ScrollType.MAGIC_MAPPING:
        return this.applyMagicMapping(player, state, displayName, identified)

      default:
        message = `You read ${displayName}. (Effect not yet implemented)`
    }

    return { player: updatedPlayer, message, identified, consumed: true }
  }

  // ============================================================================
  // PRIVATE: Scroll effect implementations
  // ============================================================================

  private applyIdentify(
    player: Player,
    targetItemId: string | undefined,
    state: GameState,
    scrollName: string
  ): { player: Player; message: string } {
    if (!targetItemId) {
      return {
        player,
        message: `You read ${scrollName}, but nothing happens.`,
        fizzled: true,
        consumed: false
      }
    }

    // Find target item in inventory
    const targetItem = this.inventoryService.findItem(player, targetItemId)
    if (!targetItem) {
      return {
        player,
        message: `You read ${scrollName}, but the item is gone.`,
        fizzled: true,
        consumed: false
      }
    }

    // Get item type key and identify the target item type
    const typeKey = this.identificationService.getItemTypeKey(targetItem)
    if (!typeKey) {
      return {
        player,
        message: `You read ${scrollName}, but nothing happens.`,
        fizzled: true,
        consumed: false
      }
    }

    const newState = this.identificationService.identifyItem(typeKey, state)
    const targetName = this.identificationService.getDisplayName(targetItem, newState)

    return {
      player,
      message: `You read ${scrollName}. This is ${targetName}!`,
      consumed: true
    }
  }

  private applyEnchantWeapon(
    player: Player,
    targetItemId: string | undefined,
    scrollName: string
  ): { player: Player; message: string } {
    if (!targetItemId) {
      return {
        player,
        message: `You read ${scrollName}, but nothing happens.`,
        fizzled: true,
        consumed: false
      }
    }

    // Find target weapon in inventory
    const targetItem = this.inventoryService.findItem(player, targetItemId)
    if (!targetItem || targetItem.type !== ItemType.WEAPON) {
      return {
        player,
        message: `You read ${scrollName}, but the item is not a weapon.`,
        fizzled: true,
        consumed: false
      }
    }

    const weapon = targetItem as Weapon

    // Check max enchantment (+3)
    if (weapon.bonus >= 3) {
      return {
        player,
        message: `You read ${scrollName}. ${weapon.name} is already at maximum enchantment!`,
        fizzled: true,
        consumed: false
      }
    }

    // Enchant weapon (increase bonus by 1)
    const enchantedWeapon: Weapon = { ...weapon, bonus: weapon.bonus + 1 }

    // Update inventory (remove old, add enchanted)
    let updatedPlayer = this.inventoryService.removeItem(player, weapon.id)
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedWeapon)

    // If weapon was equipped, update equipment too
    if (updatedPlayer.equipment.weapon?.id === weapon.id) {
      updatedPlayer = {
        ...updatedPlayer,
        equipment: { ...updatedPlayer.equipment, weapon: enchantedWeapon },
      }
    }

    return {
      player: updatedPlayer,
      message: `You read ${scrollName}. ${enchantedWeapon.name} glows brightly! (+${enchantedWeapon.bonus})`,
      consumed: true
    }
  }

  private applyEnchantArmor(
    player: Player,
    targetItemId: string | undefined,
    scrollName: string
  ): { player: Player; message: string } {
    if (!targetItemId) {
      return {
        player,
        message: `You read ${scrollName}, but nothing happens.`,
        fizzled: true,
        consumed: false
      }
    }

    const targetItem = this.inventoryService.findItem(player, targetItemId)
    if (!targetItem || targetItem.type !== ItemType.ARMOR) {
      return {
        player,
        message: `You read ${scrollName}, but the item is not armor.`,
        fizzled: true,
        consumed: false
      }
    }

    const armor = targetItem as Armor

    // Check max enchantment (+3)
    if (armor.bonus >= 3) {
      return {
        player,
        message: `You read ${scrollName}. ${armor.name} is already at maximum enchantment!`,
        fizzled: true,
        consumed: false
      }
    }

    // Enchant armor (increase bonus by 1, which LOWERS effective AC - better protection)
    const enchantedArmor: Armor = { ...armor, bonus: armor.bonus + 1 }

    // Update inventory
    let updatedPlayer = this.inventoryService.removeItem(player, armor.id)
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedArmor)

    // If armor was equipped, update equipment
    if (updatedPlayer.equipment.armor?.id === armor.id) {
      updatedPlayer = {
        ...updatedPlayer,
        equipment: { ...updatedPlayer.equipment, armor: enchantedArmor },
      }
    }

    const effectiveAC = enchantedArmor.ac - enchantedArmor.bonus

    return {
      player: updatedPlayer,
      message: `You read ${scrollName}. ${enchantedArmor.name} glows with protection! [AC ${effectiveAC}]`,
      consumed: true
    }
  }

  // ============================================================================
  // TELEPORTATION SCROLL
  // ============================================================================

  private applyTeleportation(
    player: Player,
    state: GameState,
    scrollName: string,
    identified: boolean
  ): ScrollEffectResult {
    // 1. Get current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        message: `You read ${scrollName}, but nothing happens.`,
        identified,
        fizzled: true,
        consumed: false,
      }
    }

    // 2. Get all walkable tiles (no monsters)
    const walkableTiles = this.levelService.getAllWalkableTiles(level)

    if (walkableTiles.length === 0) {
      return {
        message: `You read ${scrollName}, but nothing happens.`,
        identified,
        fizzled: true,
        consumed: false,
      }
    }

    // 3. Random select teleport destination
    const targetPos = this.randomService.pickRandom(walkableTiles)

    // 4. Update player position
    const updatedPlayer = {
      ...player,
      position: targetPos,
    }

    // 5. Recompute FOV at new location
    const lightRadius = this.getLightRadius(updatedPlayer)
    const fovResult = this.fovService.updateFOVAndExploration(
      targetPos,
      lightRadius,
      level
    )

    // 6. Update level in levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, fovResult.level)

    // 7. Create updated state
    const updatedState: GameState = {
      ...state,
      levels: updatedLevels,
      visibleCells: fovResult.visibleCells,
    }

    return {
      player: updatedPlayer,
      state: updatedState,
      message: `You read ${scrollName}. You feel a wrenching sensation!`,
      identified,
      consumed: true,
    }
  }

  /**
   * Get light radius from player's equipped light source
   */
  private getLightRadius(player: Player): number {
    const lightSource = player.equipment.lightSource
    if (!lightSource) return 0

    // Check if light source has fuel (torches/lanterns)
    if ('fuel' in lightSource && lightSource.fuel !== undefined) {
      return lightSource.fuel > 0 ? lightSource.radius : 0
    }

    // Artifacts are permanent
    if ('isPermanent' in lightSource && lightSource.isPermanent) {
      return lightSource.radius
    }

    return 0
  }

  // ============================================================================
  // CREATE_MONSTER SCROLL
  // ============================================================================

  private applyCreateMonster(
    player: Player,
    state: GameState,
    scrollName: string,
    identified: boolean
  ): ScrollEffectResult {
    // 1. Get current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        message: `You read ${scrollName}, but nothing happens.`,
        identified,
        fizzled: true,
        consumed: false,
      }
    }

    // 2. Get empty adjacent tiles
    const adjacentTiles = this.levelService.getEmptyAdjacentTiles(player.position, level)

    if (adjacentTiles.length === 0) {
      return {
        message: `You read ${scrollName}, but nothing happens.`,
        identified,
        fizzled: true,
        consumed: false,
      }
    }

    // 3. Random select spawn position
    const spawnPos = this.randomService.pickRandom(adjacentTiles)

    // 4. Spawn monster appropriate for level depth
    const newMonster = this.dungeonService.spawnSingleMonster(spawnPos, level.depth)

    // 5. Add monster to level
    const updatedLevel: Level = {
      ...level,
      monsters: [...level.monsters, newMonster],
    }

    // 6. Update level in levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 7. Create updated state
    const updatedState: GameState = {
      ...state,
      levels: updatedLevels,
    }

    return {
      state: updatedState,
      message: `You read ${scrollName}. You hear a faint cry of anguish!`,
      identified,
      consumed: true,
    }
  }

  // ============================================================================
  // MAGIC_MAPPING SCROLL
  // ============================================================================

  private applyMagicMapping(
    player: Player,
    state: GameState,
    scrollName: string,
    identified: boolean
  ): ScrollEffectResult {
    // 1. Get current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        message: `You read ${scrollName}, but nothing happens.`,
        identified,
        fizzled: true,
        consumed: false,
      }
    }

    // 2. Get all tiles on level
    const allTiles = this.levelService.getAllTiles(level)

    // 3. Create new explored tiles set - mark ALL tiles as explored
    // (This includes walls, floors, doors, corridors, stairs)
    const newExplored = Array(level.height)
      .fill(null)
      .map(() => Array(level.width).fill(false))

    // Mark all tiles as explored
    for (const pos of allTiles) {
      newExplored[pos.y][pos.x] = true
    }

    // 4. Update level with new explored state
    const updatedLevel: Level = {
      ...level,
      explored: newExplored,
    }

    // 5. Update level in levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 6. Create updated state
    const updatedState: GameState = {
      ...state,
      levels: updatedLevels,
    }

    return {
      state: updatedState,
      message: `You read ${scrollName}. The dungeon layout is revealed!`,
      identified,
      consumed: true,
    }
  }
}
